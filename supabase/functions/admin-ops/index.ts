// 平台台账、线索、收费、看板。身份从 platform_staff 读取。
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { empty, json } from '../_shared/http.ts'
import { requireStaff } from '../_shared/staff.ts'

function fail(error: { message: string }): Response {
  const line = error.message.split('\n')[0]?.replace(/^ERROR:\s*/, '') ?? ''
  if (line.includes('forbidden') || line.includes('42501')) return json(403, { message: '需要平台权限' })
  const known = ['记录类型', '席位数', '机构不存在', '试用记录', '手工改价', '金额', '请填写服务期', '开票状态', '收费记录', '只能停用', '线索不存在', '这个状态', '最低席位', '平台底价', '试用天数', '分成比例', '缺少平台底价', '缺少代理分成']
  if (known.some((item) => line.includes(item))) return json(400, { message: line })
  return json(500, { message: '操作失败' })
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const STATUS_LABEL: Record<string, string> = {
  trial: '试用中',
  active: '正常',
  expired: '已到期',
  disabled: '停用',
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  return {}
}

function logSummary(action: string, detail: Record<string, unknown>): string {
  if (action === '开户') return `试用 ${detail.trialDays ?? '—'} 天，席位 ${detail.seatQuota ?? '—'}`
  if (action === '续费') return `${detail.type ?? '续费'} · ${detail.seats ?? '—'} 席 · ¥${detail.amount ?? '—'}`
  if (action === '停用') return `停用前为${STATUS_LABEL[String(detail.previousStatus)] ?? '原状态'}`
  if (action === '恢复') return `恢复为${STATUS_LABEL[String(detail.status)] ?? '可登录'}`
  return ''
}

async function orgDetail(db: SupabaseClient, orgIdValue: unknown): Promise<Response> {
  const orgId = typeof orgIdValue === 'string' ? orgIdValue.trim() : ''
  if (!UUID.test(orgId)) return json(404, { message: '机构不存在' })
  const { data: org, error } = await db
    .from('org')
    .select('id, org_no, name, contact_name, contact_phone, campus, seat_quota, used_seats, status, trial_expire_at, service_end_at')
    .eq('id', orgId)
    .maybeSingle()
  if (error) return json(500, { message: '读取失败' })
  if (!org) return json(404, { message: '机构不存在' })

  const { data: status, error: statusError } = await db.rpc('effective_org_status', {
    p_status: org.status,
    p_trial_expire_at: org.trial_expire_at,
    p_service_end_at: org.service_end_at,
  })
  if (statusError) return json(500, { message: '读取失败' })

  const [{ count: activeStudents, error: studentError }, { data: students, error: idError }, { data: logs, error: logError }] = await Promise.all([
    db.from('student').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'active'),
    db.from('student').select('id').eq('org_id', orgId),
    db.from('provision_log').select('id, action, operator, detail, created_at').eq('org_id', orgId).order('created_at', { ascending: false }),
  ])
  if (studentError || idError || logError) return json(500, { message: '读取失败' })

  const studentIds = (students ?? []).map((row) => String(row.id))
  let boundParents = 0
  if (studentIds.length) {
    const { data: bindings, error: bindingError } = await db
      .from('parent_binding')
      .select('parent_account_id')
      .in('student_id', studentIds)
      .is('revoked_at', null)
    if (bindingError) return json(500, { message: '读取失败' })
    const parentIds = [...new Set((bindings ?? []).map((row) => String(row.parent_account_id ?? '')).filter((id) => UUID.test(id)))]
    if (parentIds.length) {
      const { data: accounts, error: accountError } = await db.from('parent_account').select('id').in('id', parentIds).is('anonymized_at', null)
      if (accountError) return json(500, { message: '读取失败' })
      boundParents = accounts?.length ?? 0
    }
  }

  return json(200, {
    org: {
      id: org.id,
      orgNo: org.org_no,
      name: org.name,
      contactName: org.contact_name,
      contactPhone: org.contact_phone,
      campus: org.campus,
      seatQuota: org.seat_quota,
      usedSeats: org.used_seats,
      activeStudents: activeStudents ?? 0,
      boundParents,
      trialExpireAt: org.trial_expire_at,
      serviceEndAt: org.service_end_at,
      status: typeof status === 'string' ? status : org.status,
    },
    logs: (logs ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      operator: row.operator,
      summary: logSummary(String(row.action), asObject(row.detail)),
      createdAt: row.created_at,
    })),
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })

  let body: Record<string, unknown> = {}
  try {
    const parsed = await req.json()
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>
  } catch {
    body = {}
  }
  const action = typeof body.action === 'string' ? body.action : 'ledger'

  const financeOk = action === 'ledger' || action === 'overview' || action === 'billing' || action === 'invoice' || action === 'quote' || action === 'detail' || action === 'settings'
  const auth = await requireStaff(req, financeOk ? ['ops', 'finance'] : ['ops'])
  if ('error' in auth) return auth.error

  if (action === 'settings' || action === 'save-settings') {
    if (action === 'save-settings') {
      const { error } = await auth.db.rpc('save_platform_configs', {
        p_staff_id: auth.staff.id,
        p_min_seat_count: Number(body.minSeatCount),
        p_base_seat_price: Number(body.baseSeatPrice),
        p_trial_days: Number(body.trialDays),
        p_agent_commission_rate: Number(body.agentCommissionRate),
      })
      if (error) return fail(error)
    }
    const { data, error } = await auth.db.rpc('list_platform_configs')
    if (error) return json(500, { message: '读取失败' })
    return json(200, { configs: data ?? [] })
  }

  if (action === 'quote') {
    const seats = Number(body.seats)
    const { data, error } = await auth.db.rpc('quote_seat_price', { p_seats: seats })
    if (error) return fail(error)
    const row = Array.isArray(data) ? data[0] : data
    return json(200, { unitPrice: row.unit_price, amount: row.amount, plan: row.plan_label })
  }

  if (action === 'detail') return await orgDetail(auth.db, body.orgId)

  if (action === 'billing') {
    const orgId = typeof body.orgId === 'string' ? body.orgId : ''
    if (body.record) {
      const record = body.record as Record<string, unknown>
      const { data, error } = await auth.db.rpc('record_billing', {
        p_org_id: orgId,
        p_type: record.type,
        p_seats: Number(record.seats),
        p_amount: Number(record.amount),
        p_overridden: Boolean(record.overridden),
        p_note: typeof record.note === 'string' ? record.note : '',
        p_service_start: record.serviceStart || null,
        p_service_end: record.serviceEnd || null,
        p_staff_id: auth.staff.id,
      })
      if (error) return fail(error)
      return json(200, { id: data })
    }
    const { data, error } = await auth.db
      .from('billing_record')
      .select('id, type, plan, seats, amount, amount_overridden, note, pay_method, service_start, service_end, invoice_status, renew_remind_at, operator, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    if (error) return json(500, { message: '读取失败' })
    return json(200, { records: data ?? [] })
  }

  if (action === 'invoice') {
    const { error } = await auth.db.rpc('set_invoice_status', {
      p_record_id: body.recordId,
      p_status: body.invoiceStatus,
      p_staff_id: auth.staff.id,
    })
    if (error) return fail(error)
    return json(200, { ok: true })
  }

  if (action === 'status') {
    const { error } = await auth.db.rpc('set_org_manual_status', {
      p_org_id: body.orgId,
      p_action: body.manualAction,
      p_staff_id: auth.staff.id,
    })
    if (error) return fail(error)
    return json(200, { ok: true })
  }

  if (action === 'leads') {
    if (typeof body.leadId === 'string' && typeof body.status === 'string') {
      const { error } = await auth.db.rpc('set_lead_status', {
        p_lead_id: body.leadId,
        p_status: body.status,
        p_staff_id: auth.staff.id,
      })
      if (error) return fail(error)
    }
    const { data, error } = await auth.db
      .from('lead')
      .select('id, org_name, contact, phone, city, est_students, note, status, org_id, created_at')
      .order('created_at', { ascending: false })
    if (error) return json(500, { message: '读取失败' })
    return json(200, { leads: data ?? [] })
  }

  if (action === 'overview') {
    const [{ data: orgs }, { data: bills }] = await Promise.all([
      auth.db.rpc('list_org_ledger'),
      auth.db.from('billing_record').select('amount, type, created_at, org_id'),
    ])
    const rows = (orgs ?? []) as { status: string; expiring_soon: boolean; created_at: string }[]
    const month = new Date().toISOString().slice(0, 7)
    const collected = (bills ?? [])
      .filter((row) => String(row.created_at).slice(0, 7) === month && row.type !== '试用')
      .reduce((sum, row) => sum + Number(row.amount), 0)
    const converted = new Set((bills ?? []).filter((row) => row.type === '新购').map((row) => row.org_id)).size
    return json(200, {
      renewing: rows.filter((row) => row.expiring_soon).length,
      conversion: rows.length ? Math.round((converted / rows.length) * 100) : 0,
      newOrgs: rows.filter((row) => String(row.created_at).slice(0, 7) === month).length,
      collected,
    })
  }

  await auth.db.rpc('rewrite_org_status_for_display')
  const [{ data, error }, { data: links, error: linkError }, { data: agents, error: agentError }] = await Promise.all([
    auth.db.rpc('list_org_ledger'),
    auth.db.from('agent_org').select('org_id, agent_id'),
    auth.db.from('agent').select('id, name'),
  ])
  if (error || linkError || agentError) return json(500, { message: '读取失败' })
  const agentName = new Map((agents ?? []).map((row) => [String(row.id), String(row.name ?? '')]))
  const agentByOrg = new Map((links ?? []).map((row) => [String(row.org_id), agentName.get(String(row.agent_id)) || null]))
  const status = typeof body.status === 'string' ? body.status : 'all'
  const keyword = typeof body.keyword === 'string' ? body.keyword.trim().toLowerCase() : ''
  const expireFrom = typeof body.expireFrom === 'string' ? body.expireFrom : ''
  const expireTo = typeof body.expireTo === 'string' ? body.expireTo : ''
  const rows = ((data ?? []) as Record<string, unknown>[]).filter((row) => {
    if (status !== 'all' && row.status !== status) return false
    if (keyword) {
      const hay = `${row.name} ${row.org_no} ${row.contact_phone}`.toLowerCase()
      if (!hay.includes(keyword)) return false
    }
    const end = String(row.service_end_at ?? row.trial_expire_at ?? '').slice(0, 10)
    if (expireFrom && end && end < expireFrom) return false
    if (expireTo && end && end > expireTo) return false
    return true
  })
  return json(200, {
    operator: auth.staff.display_name,
    role: auth.staff.role,
    orgs: rows.map((row) => ({
      id: row.id,
      orgNo: row.org_no,
      name: row.name,
      contactPhone: row.contact_phone,
      campus: row.campus,
      seatQuota: row.seat_quota,
      usedSeats: row.used_seats,
      createdAt: row.created_at,
      trialExpireAt: row.trial_expire_at,
      serviceEndAt: row.service_end_at,
      status: row.status,
      expiringSoon: row.expiring_soon,
      agentName: agentByOrg.get(String(row.id)) ?? null,
    })),
  })
})
