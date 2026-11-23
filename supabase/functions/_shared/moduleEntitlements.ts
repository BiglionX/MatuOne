/**
 * 机构模块开通的唯一判定。
 * 所有端只读 org_entitlement 的同一份行，再由这里派生 enabledModules；
 * 不再为单个模块各自计算 xxxEnabled。
 */
export const PROGRESS_MODULE_IDS = ['python', 'matupix'] as const
export type ProgressModuleId = (typeof PROGRESS_MODULE_IDS)[number]

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

/** 有效开通模块列表：新增模块只改这里的 PROGRESS_MODULE_IDS。 */
export function enabledModuleIds(rows: ModuleEntitlementRow[], now = new Date()): ProgressModuleId[] {
  return PROGRESS_MODULE_IDS.filter((id) =>
    rows.some((row) => row.module_id === id && isEnabledModuleEntitlement(row, now)),
  )
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
