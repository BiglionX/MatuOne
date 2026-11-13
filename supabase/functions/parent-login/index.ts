// 家长注册与登录。家长 id 从 parent_account 行取出，忽略请求体里的家长 id。
import { ensureAuthUser, issueSession, loginEmail } from '../_shared/authUser.ts'
import { empty, json } from '../_shared/http.ts'
import { hashPassword, verifyPassword } from '../_shared/password.ts'
import { serviceDb } from '../_shared/staff.ts'

const ACCOUNT = /^[a-z0-9][a-z0-9._]{2,31}$/

function normalizeAccount(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
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

  const action = body.action === 'register' ? 'register' : 'login'
  const account = normalizeAccount(body.account)
  const password = typeof body.password === 'string' ? body.password : ''
  if (!ACCOUNT.test(account)) return json(400, { message: '用户名需要 3–32 位，以字母或数字开头，只能包含字母、数字、点和下划线' })
  if (password.length < 8 || password.length > 72) return json(400, { message: '密码需要 8–72 位' })

  if (action === 'register') {
    const passwordHash = await hashPassword(password)
    const { data: created, error } = await db
      .from('parent_account')
      .insert({ account, password_hash: passwordHash })
      .select('id')
      .single()
    if (error || !created) {
      if (error?.code === '23505') return json(409, { message: '这个用户名已经注册过了，直接登录即可' })
      console.error('parent register failed', error?.message)
      return json(500, { message: '注册失败' })
    }
    return issue(db, created.id as string, account, password)
  }

  const { data, error } = await db.rpc('parent_login_lookup', { p_account: account })
  if (error) return json(500, { message: '登录失败' })
  const row = (Array.isArray(data) ? data[0] : data) as
    | { parent_id: string; account: string; password_hash: string }
    | undefined
  if (!row) {
    await hashPassword('timing-pad')
    return json(401, { message: '用户名或密码不正确' })
  }
  const matched = await verifyPassword(password, row.password_hash)
  if (!matched) return json(401, { message: '用户名或密码不正确' })
  return issue(db, row.parent_id, row.account, password)
})

async function issue(
  db: Parameters<typeof ensureAuthUser>[0],
  parentId: string,
  account: string,
  password: string,
): Promise<Response> {
  const email = loginEmail('parent', account)
  try {
    const authUserId = await ensureAuthUser(db, email, password)
    const { error: attachError } = await db.rpc('attach_parent_auth', {
      p_parent_id: parentId,
      p_auth_user_id: authUserId,
    })
    if (attachError) return json(500, { message: '登录失败' })
    const session = await issueSession(email, password)
    const { error: stampError } = await db.from('parent_account').update({ last_login_at: new Date().toISOString() }).eq('id', parentId)
    if (stampError) {
      console.error('parent last login failed', stampError.message)
      return json(500, { message: '登录失败' })
    }
    return json(200, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      account,
    })
  } catch (err) {
    console.error('parent session failed', err instanceof Error ? err.message : err)
    return json(500, { message: '登录失败' })
  }
}
