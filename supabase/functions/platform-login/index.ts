// 平台登录。操作人从 platform_staff 行取出，不接受请求体里的 operator。
import { ensureAuthUser, issueSession, loginEmail } from '../_shared/authUser.ts'
import { empty, json } from '../_shared/http.ts'
import { hashPassword, verifyPassword } from '../_shared/password.ts'
import { serviceDb } from '../_shared/staff.ts'

interface LookupRow {
  staff_id: string
  account: string
  display_name: string
  role: 'ops' | 'finance'
  password_hash: string | null
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
  if (!account || !password) return json(401, { message: '账号或密码不正确' })

  const { data, error } = await db.rpc('platform_login_lookup', { p_account: account })
  if (error) return json(500, { message: '登录失败' })
  const row = (Array.isArray(data) ? data[0] : data) as LookupRow | undefined
  if (!row?.password_hash) {
    await hashPassword('timing-pad')
    return json(401, { message: '账号或密码不正确' })
  }
  const matched = await verifyPassword(password, row.password_hash)
  if (!matched) return json(401, { message: '账号或密码不正确' })
  if (row.role !== 'ops' && row.role !== 'finance') return json(403, { message: '需要平台权限' })

  try {
    const email = loginEmail('staff', account)
    const authUserId = await ensureAuthUser(db, email, password)
    const { error: attachError } = await db.rpc('attach_staff_auth', {
      p_staff_id: row.staff_id,
      p_auth_user_id: authUserId,
    })
    if (attachError) return json(500, { message: '登录失败' })
    const session = await issueSession(email, password)
    return json(200, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      account: row.account,
      displayName: row.display_name,
      role: row.role,
    })
  } catch (err) {
    console.error('platform session failed', err instanceof Error ? err.message : err)
    return json(500, { message: '登录失败' })
  }
})
