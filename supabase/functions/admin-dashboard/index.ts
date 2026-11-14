// 平台工作台。运营和财务都可以看，数字从机构、收费、学生和家长表现算。
import { empty, json } from '../_shared/http.ts'
import { requireStaff } from '../_shared/staff.ts'

const DAY_MS = 24 * 60 * 60 * 1000

interface LedgerRow {
  id: string
  name: string
  contact_phone: string
  seat_quota: number
  used_seats: number
  trial_expire_at: string | null
  service_end_at: string | null
  status: string
  expiring_soon: boolean
}

interface BillRow {
  org_id: string
  type: string
  amount: number
  created_at: string
}

function shanghaiBounds(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  const nextMonth = month === '12' ? `${Number(year) + 1}-01-01` : `${year}-${String(Number(month) + 1).padStart(2, '0')}-01`
  return {
    monthStart: new Date(`${year}-${month}-01T00:00:00+08:00`).getTime(),
    nextMonth: new Date(`${nextMonth}T00:00:00+08:00`).getTime(),
    dayStart: new Date(`${year}-${month}-${day}T00:00:00+08:00`).toISOString(),
  }
}

function endAt(row: LedgerRow): string | null {
  return row.service_end_at ?? row.trial_expire_at
}

function daysLeft(iso: string | null, now: number): number {
  if (!iso) return 0
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return 0
  return Math.max(0, Math.ceil((time - now) / DAY_MS))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })

  const auth = await requireStaff(req, ['ops', 'finance'])
  if ('error' in auth) return auth.error

  const bounds = shanghaiBounds()
  const now = Date.now()
  const [{ data: orgs, error: orgError }, { data: bills, error: billError }, students, parents, commissions] = await Promise.all([
    auth.db.rpc('list_org_ledger'),
    auth.db.from('billing_record').select('org_id, type, amount, created_at'),
    auth.db.from('student').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    auth.db.from('parent_account').select('id', { count: 'exact', head: true }).gte('last_login_at', bounds.dayStart),
    auth.db.rpc('list_agent_commissions'),
  ])
  if (orgError || billError || students.error || parents.error || commissions.error) return json(500, { message: '读取失败' })

  const ledger = (orgs ?? []) as LedgerRow[]
  const records = (bills ?? []) as BillRow[]
  const revenue = records.reduce((sum, row) => {
    const at = new Date(row.created_at).getTime()
    if (row.type === '试用' || Number.isNaN(at) || at < bounds.monthStart || at >= bounds.nextMonth) return sum
    return sum + Number(row.amount)
  }, 0)

  const purchased = new Set(records.filter((row) => row.type === '新购').map((row) => row.org_id))
  const trialed = new Set(records.filter((row) => row.type === '试用').map((row) => row.org_id))
  for (const row of ledger) {
    if (row.trial_expire_at) trialed.add(row.id)
  }
  let converted = 0
  for (const id of trialed) {
    const row = ledger.find((item) => item.id === id)
    if (purchased.has(id) || row?.status === 'active') converted += 1
  }

  const expiringOrgs = ledger
    .filter((row) => row.expiring_soon)
    .map((row) => ({
      id: row.id,
      name: row.name,
      daysLeft: daysLeft(endAt(row), now),
      contactPhone: row.contact_phone,
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)

  const seatAlerts = ledger
    .filter((row) => row.seat_quota > 0 && row.used_seats / row.seat_quota >= 0.9)
    .map((row) => ({
      id: row.id,
      name: row.name,
      usedSeats: row.used_seats,
      seatQuota: row.seat_quota,
    }))
    .sort((a, b) => b.usedSeats / b.seatQuota - a.usedSeats / a.seatQuota)

  return json(200, {
    revenue,
    activeStudents: students.count ?? 0,
    activeParentsToday: parents.count ?? 0,
    conversionRate: trialed.size ? Math.round((converted / trialed.size) * 100) : 0,
    expiringOrgs,
    seatAlerts,
    commissions: ((commissions.data ?? []) as {
      agent_id: string
      agent_name: string
      org_count: number
      seat_fee_total: number
      rebate_due: number
      platform_net: number
      account: string | null
    }[]).map((row) => ({
      agentId: row.agent_id,
      agentName: row.agent_name,
      orgCount: Number(row.org_count),
      seatFeeTotal: Number(row.seat_fee_total),
      rebateDue: Number(row.rebate_due),
      platformNet: Number(row.platform_net),
      account: row.account,
    })),
  })
})
