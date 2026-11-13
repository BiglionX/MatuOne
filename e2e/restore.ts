import type { APIRequestContext } from '@playwright/test'

/** 把陈小满的密码哈希改回演示口令。只用于用例收尾，不代替页面上的登录断言。 */
export async function restoreStudentPassword(): Promise<void> {
  const { hashPassword } = await import('../supabase/functions/_shared/password.ts')
  const { q } = await import('../server/db.ts')
  const hash = await hashPassword('123456')
  const rows = await q<{ account: string }>(
    'update public.student set password_hash = $1 where account = $2 returning account',
    [hash, 'chenxiaoman'],
  )
  if (!rows.length) throw new Error('没有把 chenxiaoman 的密码改回演示口令')
}

/** 用家长自己的绑定接口把陈小满绑回去。解绑断言已经做过之后才调用。 */
export async function restoreParentBinding(request: APIRequestContext, baseURL: string): Promise<void> {
  const login = await request.post(`${baseURL}/api/parent-login`, {
    data: { account: 'parent.demo', password: 'ParentDemo1234' },
  })
  if (!login.ok()) throw new Error(`家长登录失败，绑定没有恢复：${login.status()}`)
  const body = (await login.json()) as { accessToken?: string }
  if (!body.accessToken) throw new Error('家长登录没有返回会话，绑定没有恢复')
  const bind = await request.post(`${baseURL}/api/parent-portal`, {
    headers: { authorization: `Bearer ${body.accessToken}` },
    data: { action: 'bind', code: '204815' },
  })
  if (!bind.ok()) throw new Error(`绑定没有恢复：${bind.status()}`)
}
