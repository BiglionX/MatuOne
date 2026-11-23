/**
 * ModuleProgressSummary → 现网可见文案。
 * 机构列表/看板优先「尚未开通」，不用底座 not_entitled →「机构未开通」。
 */
import { getModule } from '@/modules/registry'
import type { ModuleProgressSummary, PythonProgressDetail } from '@/types/moduleProgress'

/** 机构学生进度一行：第 N 关 · completed/total | 尚未开通 */
export function formatOrgPythonProgressLine(summary: ModuleProgressSummary): string {
  if (summary.availability !== 'cloud' || summary.completed == null || summary.total == null || summary.total === 0) {
    return '尚未开通'
  }
  const order = summary.detail.kind === 'python' ? summary.detail.currentLevelOrder : null
  if (order == null) return '尚未开通'
  return `第 ${order} 关 · ${summary.completed}/${summary.total}`
}

export function asPythonDetail(summary: ModuleProgressSummary): PythonProgressDetail | null {
  return summary.detail.kind === 'python' ? summary.detail : null
}

/**
 * 底座 statusLabel：按 availability（及 empty.reason）统一生成。
 * cloud 无通用默认文案，返回空串，由页面读 detail。
 */
export function formatModuleStatusLabel(summary: ModuleProgressSummary): string {
  if (summary.detail.kind === 'empty' && summary.detail.reason === 'org_disabled') {
    return '机构已停用'
  }
  switch (summary.availability) {
    case 'not_entitled':
      return '机构未开通'
    case 'coming_soon':
      return '筹备中'
    case 'local_only':
      return '已开通 · 进度仅本机'
    case 'cloud':
      return ''
    default: {
      const _exhaustive: never = summary.availability
      return _exhaustive
    }
  }
}

/** 家长端 MatuPix 最小摘要：开通 → local_only；未开通 → not_entitled */
export function matupixSummaryForParent(entitled: boolean): ModuleProgressSummary {
  const mod = getModule('matupix')
  const displayName = mod?.display_name ?? 'MatuPix'
  const gradeRange = mod?.grade_range
  if (!entitled) {
    return {
      moduleId: 'matupix',
      displayName,
      gradeRange,
      availability: 'not_entitled',
      completed: null,
      total: null,
      lastStudiedAt: null,
      detail: { kind: 'empty', reason: 'no_data' },
    }
  }
  return {
    moduleId: 'matupix',
    displayName,
    gradeRange,
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

