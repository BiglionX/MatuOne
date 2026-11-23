/**
 * 模块进度查询入口：按 moduleId 分发。
 * 本步（S1）仅实现 python；arduino → coming_soon；matupix → local_only 占位。
 */
import { getModule } from '@/modules/registry'
import type {
  GetProgressSummary,
  ModuleId,
  ModuleProgressSummary,
  StudentModulesProgressView,
} from '@/types/moduleProgress'
import { listOrgPythonModuleProgress, listParentPythonModuleProgress } from './python'

export {
  mapOrgStudentRowToPythonSummary,
  mapParentChildToPythonSummary,
  mapParentStoppedToPythonSummary,
  listOrgPythonModuleProgress,
  listParentPythonModuleProgress,
  getOrgStudentPythonProgress,
} from './python'
export type { OrgPythonProgressSource, ParentPythonProgressSource } from './python'
export {
  isProgressDualReadEnabled,
  dualReadOrgStudents,
  dualReadParentHome,
  diffOrgStudentProgress,
  diffParentChildProgress,
} from './dualRead'
export { formatOrgPythonProgressLine, asPythonDetail } from './present'

function moduleMeta(moduleId: ModuleId): { displayName: string; gradeRange?: string } {
  const mod = getModule(moduleId)
  return {
    displayName: mod?.display_name ?? moduleId,
    gradeRange: mod?.grade_range,
  }
}

function comingSoonSummary(moduleId: ModuleId): ModuleProgressSummary {
  const meta = moduleMeta(moduleId)
  return {
    moduleId,
    displayName: meta.displayName,
    gradeRange: meta.gradeRange,
    availability: 'coming_soon',
    completed: null,
    total: null,
    lastStudiedAt: null,
    detail: { kind: 'empty', reason: 'coming_soon' },
  }
}

function matupixLocalSummary(): ModuleProgressSummary {
  const meta = moduleMeta('matupix')
  return {
    moduleId: 'matupix',
    displayName: meta.displayName,
    gradeRange: meta.gradeRange,
    availability: 'local_only',
    completed: null,
    total: null,
    lastStudiedAt: null,
    detail: {
      kind: 'matupix',
      storage: 'local',
      hasCloudProgress: false,
      hint: '作品只保存在这台设备',
      workCount: null,
      lastSavedAt: null,
    },
  }
}

/**
 * 按 moduleId 取进度摘要。
 * python：本步无「当前学生 session」单点数据源含授权字段，请改用
 * listOrgPythonModuleProgress / listParentPythonModuleProgress / getOrgStudentPythonProgress。
 */
export const getProgressSummary: GetProgressSummary = async (moduleId) => {
  if (moduleId === 'arduino') return comingSoonSummary('arduino')
  if (moduleId === 'matupix') return matupixLocalSummary()
  if (moduleId === 'python') {
    throw new Error(
      'getProgressSummary(python)：请使用 listOrgPythonModuleProgress / listParentPythonModuleProgress / getOrgStudentPythonProgress',
    )
  }
  const _exhaustive: never = moduleId
  return _exhaustive
}

/** 机构端：当前机构全部学生的模块进度（本步仅含 python） */
export async function listOrgStudentModuleProgress(): Promise<StudentModulesProgressView[]> {
  return listOrgPythonModuleProgress()
}

/** 家长端：绑定孩子的模块进度（本步仅含 python；含 stopped 占位） */
export async function listParentStudentModuleProgress(): Promise<StudentModulesProgressView[]> {
  return listParentPythonModuleProgress()
}
