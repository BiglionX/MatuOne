import { arduinoModule } from './arduino'
import { matupixModule } from './matupix'
import { pythonModule } from './python'
import type { ModuleId, TeachingModuleDef } from './types'

/** 教学模块唯一注册源。启动器、开屏、App 路由均从此读取。 */
export const TEACHING_MODULES: TeachingModuleDef[] = [matupixModule, pythonModule, arduinoModule]

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
