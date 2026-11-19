// 机构财务。orgId 从会话取。只有 admin 能读账单和改定价。
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { empty, json } from '../_shared/http.ts'
import { withOrgScope } from '../_shared/orgScope.ts'

const BILL_TYPES = new Set(['新购', '续费', '扩容'])
const INVOICE_STATES = new Set(['未开票', '已申请', '已开票', '已寄出'])
const TAX_NO = /^[0-9A-Z]{15,20}$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })
  const action = req.headers.get('x-action') ?? 'read'
  const writing = action === 'save-price' || action === 'invoice'
  return withOrgScope(req, { write: writing, admin: true }, async (ctx) => {
    if (action === 'save-price') {
      const studentMonthlyPrice = Number(ctx.body.studentMonthlyPrice)
      if (!Number.isInteger(studentMonthlyPrice) || studentMonthlyPrice < 150 || studentMonthlyPrice > 500) {
        return json(400, { message: '家长定价需要在 150 到 500 元之间' })
      }
      const { error } = await ctx.db.from('org').update({ student_monthly_price: studentMonthlyPrice }).eq('id', ctx.orgId)
      if (error) return json(500, { message: '保存失败' })
    }

    if (action === 'invoice') {
      if (ctx.status === 'trial') return json(403, { message: '试用期无需付费' })
      const recordId = typeof ctx.body.recordId === 'string' ? ctx.body.recordId.trim() : ''
      const title = typeof ctx.body.title === 'string' ? ctx.body.title.trim() : ''
      const taxNo = typeof ctx.body.taxNo === 'string' ? ctx.body.taxNo.trim().toUpperCase() : ''
      if (!recordId) return json(400, { message: '没有这张账单' })
      if (title.length < 2 || title.length > 80) return json(400, { message: '发票抬头需要 2–80 个字' })
      if (!TAX_NO.test(taxNo)) return json(400, { message: '纳税人识别号需要 15–20 位数字或大写字母' })
      const { data: updated, error } = await ctx.db
        .from('billing_record')
        .update({ invoice_status: '已申请', invoice_title: title, invoice_tax_no: taxNo })
        .eq('id', recordId)
        .eq('org_id', ctx.orgId)
        .eq('invoice_status', '未开票')
        .in('type', ['新购', '续费', '扩容'])
        .select('id')
      if (error) return json(500, { message: '申请失败' })
      if (!updated?.length) return json(400, { message: '这张账单不能申请开票' })
    }

    const view = await financeView(ctx.db, ctx.orgId, ctx.status)
    if (view instanceof Response) return view
    return json(200, view)
  })
})

async function financeView(db: SupabaseClient, orgId: string, status: string): Promise<Record<string, unknown> | Response> {
  const [{ data: org, error: orgError }, { data: config, error: configError }, { count, error: countError }] = await Promise.all([
    db.from('org').select('student_monthly_price, seat_quota').eq('id', orgId).maybeSingle(),
    db.from('platform_configs').select('value').eq('key', 'base_seat_price').maybeSingle(),
    db.from('student').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'active'),
  ])
  if (orgError || configError || countError) return json(500, { message: '读取失败' })
  const baseSeatPrice = Number(config?.value)
  if (!Number.isInteger(baseSeatPrice) || baseSeatPrice < 1) return json(500, { message: '缺少平台底价配置' })

  let bills: Record<string, unknown>[] = []
  if (status !== 'trial') {
    const { data, error } = await db
      .from('billing_record')
      .select('id, type, seats, amount, invoice_status, created_at, service_start')
      .eq('org_id', orgId)
      .in('type', ['新购', '续费', '扩容'])
      .order('created_at', { ascending: false })
    if (error) return json(500, { message: '读取失败' })
    bills = (data ?? [])
      .filter((row) => BILL_TYPES.has(row.type))
      .map((row) => ({
        id: row.id,
        month: billMonth(row.service_start ?? row.created_at),
        type: row.type,
        seats: row.seats,
        amount: Number(row.amount),
        payStatus: '已支付',
        invoiceStatus: INVOICE_STATES.has(row.invoice_status) ? row.invoice_status : '未开票',
      }))
  }

  return {
    trial: status === 'trial',
    studentCount: count ?? 0,
    seatQuota: org?.seat_quota ?? 0,
    studentMonthlyPrice: Number(org?.student_monthly_price),
    baseSeatPrice,
    bills,
  }
}

function billMonth(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit' }).format(date).slice(0, 7)
}
