import { MODULE_REGISTRY, type ModuleId } from '../../supabase/functions/_shared/moduleRegistry'
import { arduinoModule } from './arduino'
import { matupixModule } from './matupix'
import { pythonModule } from './python'
import type { TeachingModuleDef } from './types'

const DEFINITIONS: Record<ModuleId, TeachingModuleDef> = {
  matupix: matupixModule,
  python: pythonModule,
  arduino: arduinoModule,
}

/** React 侧注册表：清单与顺序取自共享 MODULE_REGISTRY，不在此另写一份。 */
export const TEACHING_MODULES: TeachingModuleDef[] = MODULE_REGISTRY.map((module) => DEFINITIONS[module.module_id])

export function listModules(): TeachingModuleDef[] {
  return TEACHING_MODULES
}

export function getModule(moduleId: ModuleId): TeachingModuleDef | undefined {
  return TEACHING_MODULES.find((m) => m.module_id === moduleId)
}

/** 可挂载路由的模块（有 routes 节点）。 */
export function listRoutableModules(): TeachingModuleDef[] {
  return TEACHING_MODULES.filter((m) => m.routes != null)
}

/** 启动器 / 开屏可见的注册模块：active 与 coming_soon。 */
export function listLauncherRegistryModules(): TeachingModuleDef[] {
  return TEACHING_MODULES.filter((m) => m.status === 'active' || m.status === 'coming_soon')
}
