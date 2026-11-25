/**
 * 模块 ID 与清单常量（来自共享注册表）。
 * 前端统一从这里取：别处不再硬编码模块名清单或模块联合类型。
 */
export {
  isToggleableModule,
  MODULE_IDS,
  PROGRESS_MODULE_IDS,
  TOGGLEABLE_MODULE_IDS,
} from '../../supabase/functions/_shared/moduleRegistry'
export type {
  ModuleId,
  ProgressModuleId,
  ToggleableModuleId,
} from '../../supabase/functions/_shared/moduleRegistry'
