// 区域服务商登录。只校验 agent_admin 的账号和密码，agent_id 从该行取出。
import { ensureAuthUser, issueSession, loginEmail } from '../_shared/authUser.ts'
import { empty, json } from '../_shared/http.ts'
import { hashPassword, verifyPassword } from '../_shared/password.ts'
import { serviceDb } from '../_shared/staff.ts'

interface LookupRow {
  admin_id: string
  password_hash: string
  agent_name: string
  region: string
  agent_status: string
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

  const { data, error } = await db.rpc('agent_login_lookup', { p_account: account })
  if (error) return json(500, { message: '登录失败' })
  const row = (Array.isArray(data) ? data[0] : data) as LookupRow | undefined
  if (!row) {
    await hashPassword('timing-pad')
    return json(401, { message: '账号或密码不正确' })
  }
  if (!(await verifyPassword(password, row.password_hash))) return json(401, { message: '账号或密码不正确' })
  if (row.agent_status !== 'active') return json(403, { message: '区域服务商已停用，无法登录' })

  try {
    const email = loginEmail('agent', account)
    const authUserId = await ensureAuthUser(db, email, password)
    const { error: attachError } = await db.rpc('attach_agent_admin_auth', {
      p_admin_id: row.admin_id,
      p_auth_user_id: authUserId,
    })
    if (attachError) return json(500, { message: '登录失败' })
    const session = await issueSession(email, password)
    const { error: markError } = await db.rpc('mark_agent_admin_login', { p_admin_id: row.admin_id })
    if (markError) return json(500, { message: '登录失败' })
    return json(200, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      adminId: row.admin_id,
      account,
      agentName: row.agent_name,
      region: row.region,
    })
  } catch (err) {
    console.error('agent session failed', err instanceof Error ? err.message : err)
    return json(500, { message: '登录失败' })
  }
})
