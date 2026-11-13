// 平台台账、线索、收费、看板。身份从 platform_staff 读取。
import { empty, json } from '../_shared/http.ts'
import { requireStaff } from '../_shared/staff.ts'

function fail(error: { message: string }): Response {
  const line = error.message.split('\n')[0]?.replace(/^ERROR:\s*/, '') ?? ''
  if (line.includes('forbidden') || line.includes('42501')) return json(403, { message: '需要平台权限' })
  const known = ['记录类型', '席位数', '机构不存在', '试用记录', '手工改价', '金额', '请填写服务期', '开票状态', '收费记录', '只能停用', '线索不存在', '这个状态']
  if (known.some((item) => line.includes(item))) return json(400, { message: line })
  return json(500, { message: '操作失败' })
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

  const financeOk = action === 'ledger' || action === 'overview' || action === 'billing' || action === 'invoice' || action === 'quote'
  const auth = await requireStaff(req, financeOk ? ['ops', 'finance'] : ['ops'])
  if ('error' in auth) return auth.error

  if (action === 'quote') {
    const seats = Number(body.seats)
    const { data, error } = await auth.db.rpc('quote_seat_price', { p_seats: seats })
    if (error) return fail(error)
    const row = Array.isArray(data) ? data[0] : data
    return json(200, { unitPrice: row.unit_price, amount: row.amount, plan: row.plan_label })
  }

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
  const { data, error } = await auth.db.rpc('list_org_ledger')
  if (error) return json(500, { message: '读取失败' })
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
    })),
  })
})
