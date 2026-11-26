/**
 * 单模块进度摘要入口（按 moduleId 取）。
 * 只有「本模块没有服务端进度源」时才由这里出占位摘要；
 * 有服务端进度源的模块走机构 / 家长 / 学生三条列表接口。
 */
import { getModule } from '@/modules/registry'
import type { GetProgressSummary, ModuleId, ModuleProgressSummary } from '@/types/moduleProgress'

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
 * - arduino：筹备中（注册表 status = coming_soon）
 * - blockly / easy-robot：模块已注册、机构可开通，但关卡与进度还没上线，同样按筹备中展示
 * - matupix：本机进度占位。此处不判断机构开通与否 —— 判断开通请用
 *   listStudentModuleSummaries / matupixSummary(entitled)
 * - python：本函数没有「当前学生 session」单点数据源，请改用
 *   listOrgPythonModuleProgress / listParentPythonModuleProgress / listStudentModuleSummaries
 */
export const getProgressSummary: GetProgressSummary = async (moduleId) => {
  if (moduleId === 'arduino') return comingSoonSummary('arduino')
  if (moduleId === 'blockly' || moduleId === 'easy-robot') return comingSoonSummary(moduleId)
  if (moduleId === 'matupix') return matupixLocalSummary()
  if (moduleId === 'python') {
    throw new Error(
      'getProgressSummary(python)：请使用 listOrgPythonModuleProgress / listParentPythonModuleProgress / listStudentModuleSummaries',
    )
  }
  const _exhaustive: never = moduleId
  return _exhaustive
}
