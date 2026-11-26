/**
 * 模块身份注册表（无 React 依赖，后端与前端共用）。
 * 模块清单、has_progress 标志、机构可开关策略只在这里声明一次；
 * PROGRESS_MODULE_IDS / TOGGLEABLE_MODULE_IDS 从它派生，
 * 前端 TEACHING_MODULES 也按它取清单和顺序。
 */
export const MODULE_REGISTRY = [
  { module_id: 'matupix', has_progress: true, status: 'active', org_toggleable: true },
  { module_id: 'python', has_progress: true, status: 'active', org_toggleable: false },
  { module_id: 'arduino', has_progress: false, status: 'coming_soon', org_toggleable: false },
  // 新模块：整模块开关由平台开通，不交给机构自行开关（与 python 一致）。
  { module_id: 'blockly', has_progress: true, status: 'active', org_toggleable: false },
  { module_id: 'easy-robot', has_progress: true, status: 'active', org_toggleable: false },
] as const

export type ModuleId = (typeof MODULE_REGISTRY)[number]['module_id']

type RegistryEntry<K extends ModuleId> = Extract<(typeof MODULE_REGISTRY)[number], { module_id: K }>

type ProgressFlag<K extends ModuleId> = RegistryEntry<K>['has_progress']

export type ProgressModuleId = {
  [K in ModuleId]: ProgressFlag<K> extends true ? K : never
}[ModuleId]

type ToggleFlag<K extends ModuleId> = RegistryEntry<K>['org_toggleable']

/** 机构端可自行开关的模块（其余由平台统一开通）。 */
export type ToggleableModuleId = {
  [K in ModuleId]: ToggleFlag<K> extends true ? K : never
}[ModuleId]

type ModuleIdOf<K extends ModuleId> = RegistryEntry<K>['module_id']

/** 模块 ID 常量：值与类型都按注册表推导，改清单只改注册表。 */
export const MODULE_IDS = Object.fromEntries(
  MODULE_REGISTRY.map((module) => [module.module_id, module.module_id]),
) as { [K in ModuleId]: ModuleIdOf<K> }

/** 有云/本地进度且走机构开通的模块；新增模块只改 MODULE_REGISTRY。 */
export const PROGRESS_MODULE_IDS = MODULE_REGISTRY.filter((module) => module.has_progress).map(
  (module) => module.module_id as ProgressModuleId,
)

/** 机构端可自行开关的模块；新增模块只改 MODULE_REGISTRY。 */
export const TOGGLEABLE_MODULE_IDS = MODULE_REGISTRY.filter((module) => module.org_toggleable).map(
  (module) => module.module_id as ToggleableModuleId,
)

/** 该模块是否允许机构自行开关；策略来自注册表，不在调用处硬编码模块名。 */
export function isToggleableModule(moduleId: string): moduleId is ToggleableModuleId {
  return (TOGGLEABLE_MODULE_IDS as readonly string[]).includes(moduleId)
}
