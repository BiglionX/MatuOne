/**
 * 机构模块开通的唯一判定。
 * 所有端只读 org_entitlement 的同一份行，再由这里派生 enabledModules；
 * 不再为单个模块各自计算 xxxEnabled。
 *
 * 本文件是关卡授权唯一对外入口，外部禁止直接 import lessonIsAuthorized / isFreeLevel1。
 */
// @ts-expect-error 边缘函数要带 .ts 后缀，应用这边的 tsconfig 不允许。
import { isToggleableModule, PROGRESS_MODULE_IDS, TOGGLEABLE_MODULE_IDS, type ProgressModuleId, type ToggleableModuleId } from './moduleRegistry.ts'
// @ts-expect-error 边缘函数要带 .ts 后缀，应用这边的 tsconfig 不允许。
import { lessonIsAuthorized, type EnterLevelReason, type OrgStatus } from './orgStatus.ts'

export type { ProgressModuleId, ToggleableModuleId }
export { isToggleableModule, PROGRESS_MODULE_IDS, TOGGLEABLE_MODULE_IDS }

export interface ModuleEntitlementRow {
  [key: string]: unknown
  module_id: string
  revoked_at?: string | null
  valid_until?: string | null
  max_level?: number | null
}

export function isEnabledModuleEntitlement(row: ModuleEntitlementRow, now = new Date()): boolean {
  if (row.revoked_at != null) return false
  if (!row.valid_until) return true
  const end = Date.parse(row.valid_until)
  return Number.isFinite(end) && end > now.getTime()
}

/** 有效开通模块列表：候选集来自共享注册表，不在本文件手写。 */
export function enabledModuleIds(rows: ModuleEntitlementRow[], now = new Date()): ProgressModuleId[] {
  return PROGRESS_MODULE_IDS.filter((id) =>
    rows.some((row) => row.module_id === id && isEnabledModuleEntitlement(row, now)),
  )
}

/**
 * 关卡授权唯一对外入口：先判模块开通，再委托 lessonIsAuthorized 做关卡/阶段判定。
 * 模块未开通时返回 reason='module_not_entitled'，不会进入 Level 1 免费放行。
 */
export function moduleLessonIsAuthorized(
  moduleId: ProgressModuleId,
  enabledModules: readonly ProgressModuleId[],
  status: OrgStatus,
  maxStage: number,
  sortOrder: number,
  stageSort: number,
): { authorized: boolean; reason?: EnterLevelReason } {
  if (!enabledModules.includes(moduleId)) return { authorized: false, reason: 'module_not_entitled' }
  return { authorized: lessonIsAuthorized(status, maxStage, sortOrder, stageSort) }
}

/** 从同一份行取模块的阶段上限来源；阶段数仍由 openMaxLevel 计算。 */
export function activeGrantOf(
  rows: ModuleEntitlementRow[],
  moduleId: ProgressModuleId,
  enabled: readonly ProgressModuleId[],
): ModuleEntitlementRow | null {
  if (!enabled.includes(moduleId)) return null
  return rows.find((row) => row.module_id === moduleId && isEnabledModuleEntitlement(row)) ?? null
}
