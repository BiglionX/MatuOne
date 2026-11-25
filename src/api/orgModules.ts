import { getOrgSession } from '@/api/orgAuth'
import { getCurrentStudent } from '@/api/studentAuth'
import { callFunction } from '@/lib/backend'
import { launcherGateRole } from '@/modules/launcherRole'
import type { ProgressModuleId, ToggleableModuleId } from '@/modules/ids'

export interface OrgModuleGrant {
  moduleId: ProgressModuleId
  maxLevel: number | null
  validUntil: string | null
}

/** 机构端管理列表行：含已软关；canToggle 只对注册表里 org_toggleable 的模块为真。 */
export interface OrgModuleManaged {
  moduleId: ProgressModuleId
  maxLevel: number | null
  validUntil: string | null
  revokedAt: string | null
  enabled: boolean
  canToggle: boolean
}

/**
 * 解析启动器「当前机构」：学生 session 优先，否则机构 session，否则游客。
 * 仅用于判断是否调用开通 API；真正的 orgId 由服务端 session 决定。
 *
 * 口径（写死，别再当 bug）：家长不隶属机构，也不隶属任何机构的学员，
 * 因此这里返回 null —— 与游客同口径。MatuPix 这类本机模块对家长直接可用，
 * 不做机构开通校验；只有学生 / 机构两类业务会话受模块门禁约束。
 */
export function resolveLauncherOrg(): 'student' | 'org' | null {
  const role = launcherGateRole({ student: Boolean(getCurrentStudent()), org: Boolean(getOrgSession()) })
  return role === 'guest' ? null : role
}

/**
 * 列出当前 session 所属机构已开通且未过期的模块。
 * 不接收 orgId：由服务端从 student / org token 解析。
 * 游客不应调用本函数。
 */
export async function listOrgEnabledModules(): Promise<OrgModuleGrant[]> {
  const role = resolveLauncherOrg()
  if (!role) return []
  const result = await callFunction<{ modules: OrgModuleGrant[] }>('org-modules', { action: 'list' }, { role })
  return result.modules ?? []
}

/** 机构端管理列表（含已软关）。orgId 由服务端 session 决定。 */
export async function listOrgManagedModules(): Promise<OrgModuleManaged[]> {
  const result = await callFunction<{ modules: OrgModuleManaged[] }>(
    'org-modules',
    { action: 'manage' },
    { role: 'org' },
  )
  return result.modules ?? []
}

/** 软关机构可开关的模块（设 revoked_at）。仅 org admin；不物理删除。 */
export async function revokeModule(moduleId: ToggleableModuleId): Promise<OrgModuleManaged[]> {
  const result = await callFunction<{ modules: OrgModuleManaged[] }>(
    'org-modules',
    { action: 'revoke', moduleId },
    { role: 'org' },
  )
  return result.modules ?? []
}

/** 重开机构可开关的模块（清除 revoked_at）。仅 org admin。 */
export async function restoreModule(moduleId: ToggleableModuleId): Promise<OrgModuleManaged[]> {
  const result = await callFunction<{ modules: OrgModuleManaged[] }>(
    'org-modules',
    { action: 'restore', moduleId },
    { role: 'org' },
  )
  return result.modules ?? []
}
