// 学生登录。身份从账号行取出，忽略 body 里的 studentId / orgId。停用机构拒绝登录。
import { ensureAuthUser, issueSession, loginEmail } from '../_shared/authUser.ts'
import { empty, json } from '../_shared/http.ts'
import { hashPassword, verifyPassword } from '../_shared/password.ts'
import { serviceDb } from '../_shared/staff.ts'

interface LookupRow {
  student_id: string
  password_hash: string
  name: string
  account: string
  group_id: string
  bind_code: string | null
  current_level_order: number
  last_active_at: string | null
  org_id: string
  org_name: string
  org_status: string
  trial_expire_at: string | null
  service_end_at: string | null
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
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return json(400, { message: '请求格式不正确' })
    body = parsed as Record<string, unknown>
  } catch {
    return json(400, { message: '请求格式不正确' })
  }

  const account = typeof body.account === 'string' ? body.account.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!account || !password) return json(401, { message: '账号或密码不对，问问老师。' })

  const { data, error } = await db.rpc('student_login_lookup', { p_account: account })
  if (error) return json(500, { message: '登录失败' })
  const row = (Array.isArray(data) ? data[0] : data) as LookupRow | undefined
  if (!row) {
    await hashPassword('timing-pad')
    return json(401, { message: '账号或密码不对，问问老师。' })
  }
  const matched = await verifyPassword(password, row.password_hash)
  if (!matched) return json(401, { message: '账号或密码不对，问问老师。' })

  const { data: status, error: statusError } = await db.rpc('effective_org_status', {
    p_status: row.org_status,
    p_trial_expire_at: row.trial_expire_at,
    p_service_end_at: row.service_end_at,
  })
  if (statusError || typeof status !== 'string') return json(500, { message: '登录失败' })
  if (status === 'disabled') return json(403, { message: '机构已停用，无法登录' })

  const email = loginEmail('student', account)
  try {
    const authUserId = await ensureAuthUser(db, email, password)
    const { error: attachError } = await db.rpc('attach_student_auth', {
      p_student_id: row.student_id,
      p_auth_user_id: authUserId,
    })
    if (attachError) return json(500, { message: '登录失败' })
    const session = await issueSession(email, password)
    return json(200, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      student: {
        id: row.student_id,
        orgId: row.org_id,
        orgName: row.org_name,
        groupId: row.group_id,
        name: row.name,
        account: row.account,
        status: 'active',
        currentLevelOrder: row.current_level_order,
        lastActiveAt: row.last_active_at ?? '',
        bindCode: row.bind_code ?? '',
      },
    })
  } catch (err) {
    console.error('student session failed', err instanceof Error ? err.message : err)
    return json(500, { message: '登录失败' })
  }
})
