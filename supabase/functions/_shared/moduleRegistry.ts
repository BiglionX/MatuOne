/**
 * 模块身份注册表（无 React 依赖，后端与前端共用）。
 * 模块清单、has_progress 标志只在这里声明一次；
 * PROGRESS_MODULE_IDS 从它派生，前端 TEACHING_MODULES 也按它取清单和顺序。
 */
export const MODULE_REGISTRY = [
  { module_id: 'matupix', has_progress: true, status: 'active' },
  { module_id: 'python', has_progress: true, status: 'active' },
  { module_id: 'arduino', has_progress: false, status: 'coming_soon' },
] as const

export type ModuleId = (typeof MODULE_REGISTRY)[number]['module_id']

type ProgressFlag<K extends ModuleId> = Extract<
  (typeof MODULE_REGISTRY)[number],
  { module_id: K }
>['has_progress']

export type ProgressModuleId = {
  [K in ModuleId]: ProgressFlag<K> extends true ? K : never
}[ModuleId]

export const MODULE_IDS = Object.fromEntries(
  MODULE_REGISTRY.map((module) => [module.module_id, module.module_id]),
) as Record<ModuleId, ModuleId>

/** 有云/本地进度且走机构开通的模块；新增模块只改 MODULE_REGISTRY。 */
export const PROGRESS_MODULE_IDS = MODULE_REGISTRY.filter((module) => module.has_progress).map(
  (module) => module.module_id as ProgressModuleId,
)
