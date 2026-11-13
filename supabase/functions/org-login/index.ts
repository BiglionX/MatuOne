// 机构端最小登录：只校验 org_admin 的账号和密码哈希。
// orgId 从 org_admin 行取出，忽略请求体里的 orgId。停用机构拒绝登录。
import { ensureAuthUser, issueSession, loginEmail } from '../_shared/authUser.ts'
import { hashPassword, verifyPassword } from '../_shared/password.ts'
import { empty, json } from '../_shared/http.ts'
import { serviceDb } from '../_shared/staff.ts'

interface LookupRow {
  admin_id: string
  password_hash: string
  org_id: string
  org_no: string
  org_name: string
  org_status: string
  trial_expire_at: string | null
  service_end_at: string | null
  seat_quota: number
  used_seats: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })

  const dbOrError = serviceDb()
  if (dbOrError instanceof Response) return dbOrError
  const db = dbOrError

  let body: Record<string, unknown>
  try {
    const parsed = await req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return json(400, { message: '请求格式不正确' })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return json(400, { message: '请求格式不正确' })
  }

  const account = typeof body.account === 'string' ? body.account.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!account || !password) return json(401, { message: '账号或密码不正确' })

  const { data, error } = await db.rpc('org_admin_login_lookup', { p_account: account })
  if (error) {
    console.error('org_admin_login_lookup failed', error.message)
    return json(500, { message: '登录失败' })
  }

  const row = (Array.isArray(data) ? data[0] : data) as LookupRow | undefined
  if (!row) {
    await hashPassword('timing-pad')
    return json(401, { message: '账号或密码不正确' })
  }

  const matched = await verifyPassword(password, row.password_hash)
  if (!matched) return json(401, { message: '账号或密码不正确' })

  const { data: status, error: statusError } = await db.rpc('effective_org_status', {
    p_status: row.org_status,
    p_trial_expire_at: row.trial_expire_at,
    p_service_end_at: row.service_end_at,
  })
  if (statusError || typeof status !== 'string') return json(500, { message: '登录失败' })
  if (status === 'disabled') return json(403, { message: '机构已停用，无法登录' })

  const email = loginEmail('org', account)
  let session: { accessToken: string; refreshToken: string }
  try {
    const authUserId = await ensureAuthUser(db, email, password)
    const { error: attachError } = await db.rpc('attach_org_admin_auth', {
      p_admin_id: row.admin_id,
      p_auth_user_id: authUserId,
    })
    if (attachError) {
      console.error('attach_org_admin_auth failed', attachError.message)
      return json(500, { message: '登录失败' })
    }
    session = await issueSession(email, password)
  } catch (error) {
    console.error('org session failed', error instanceof Error ? error.message : error)
    return json(500, { message: '登录失败' })
  }

  const { error: markError } = await db.rpc('mark_org_admin_login', { p_admin_id: row.admin_id })
  if (markError) {
    console.error('mark_org_admin_login failed', markError.message)
    return json(500, { message: '登录失败' })
  }

  return json(200, {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    adminId: row.admin_id,
    account,
    orgId: row.org_id,
    orgNo: row.org_no,
    orgName: row.org_name,
    status,
    readOnly: status === 'expired',
    seatQuota: row.seat_quota,
    usedSeats: row.used_seats,
    trialExpireAt: row.trial_expire_at,
    serviceEndAt: row.service_end_at,
  })
})
