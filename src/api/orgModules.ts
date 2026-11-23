import { getOrgSession } from '@/api/orgAuth'
import { getCurrentStudent } from '@/api/studentAuth'
import { callFunction } from '@/lib/backend'
import type { ModuleId } from '@/modules/types'

export interface OrgModuleGrant {
  moduleId: Extract<ModuleId, 'python' | 'matupix'>
  maxLevel: number | null
  validUntil: string | null
}

/**
 * 解析启动器「当前机构」：学生 session 优先，否则机构 session，否则游客。
 * 仅用于判断是否调用开通 API；真正的 orgId 由服务端 session 决定。
 */
export function resolveLauncherOrg(): 'student' | 'org' | null {
  if (getCurrentStudent()) return 'student'
  if (getOrgSession()) return 'org'
  return null
}

/**
 * 列出当前 session 所属机构已开通且未过期的模块。
 * 不接收 orgId：由服务端从 student / org token 解析。
 * 游客不应调用本函数。
 */
export async function listOrgEnabledModules(): Promise<OrgModuleGrant[]> {
  const role = resolveLauncherOrg()
  if (!role) return []
  const result = await callFunction<{ modules: OrgModuleGrant[] }>('org-modules', {}, { role })
  return result.modules ?? []
}
