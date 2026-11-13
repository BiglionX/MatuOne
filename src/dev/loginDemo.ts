import { loginPlatform } from '@/api/adminOrgs'
import { loginOrgAdmin } from '@/api/orgAuth'
import { loginParent } from '@/api/parent'
import { loginStudentAccount } from '@/api/studentAuth'
import { ApiError } from '@/lib/apiError'
import { DEMO_ACCOUNTS, type DemoRole } from './demoAccounts'

/** 用种子里的演示账号走正式登录接口，会话仍由服务端签发。 */
export async function loginDemo(role: DemoRole): Promise<string> {
  const demo = DEMO_ACCOUNTS[role]
  if (role === 'student') {
    const result = await loginStudentAccount(demo.account, demo.password)
    if (!result.ok) throw new ApiError(401, result.message)
    return '/student'
  }
  if (role === 'org') {
    await loginOrgAdmin(demo.account, demo.password)
    return '/org/dashboard'
  }
  if (role === 'parent') {
    await loginParent(demo.account, demo.password)
    return '/parent'
  }
  await loginPlatform(demo.account, demo.password)
  return '/admin/orgs'
}
