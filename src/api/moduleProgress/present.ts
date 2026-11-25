/**
 * ModuleProgressSummary → 现网可见文案。
 * 机构列表/看板优先「尚未开通」，不用底座 not_entitled →「机构未开通」。
 *
 * 本文件是「摘要 → 文案」的唯一出口：页面按 availability 渲染，不按模块名分支。
 */
import { getModule } from '@/modules/registry'
import type { ModuleProgressSummary } from '@/types/moduleProgress'

/** 机构学生进度一行（通用模块口径）：第 N 关 · completed/total | 尚未开通 */
export function formatOrgProgressLine(summary: ModuleProgressSummary): string {
  const completed = summary.completed
  const total = summary.total
  if (summary.availability !== 'cloud' || completed == null || total == null || total === 0) {
    return '尚未开通'
  }
  const order = summary.detail.kind === 'python' ? summary.detail.currentLevelOrder : completed + 1
  return `第 ${order} 关 · ${completed}/${total}`
}

/** 取唯一带云进度的模块摘要（当前是 Python 课程）。页面不按模块名分支。 */
export function findCloudModule(modules: readonly ModuleProgressSummary[]): ModuleProgressSummary | null {
  return modules.find((m) => m.availability === 'cloud') ?? null
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

/** 模块卡的一句话说明：按 availability 统一生成，页面不按模块名分支。 */
export function formatModuleHint(summary: ModuleProgressSummary): string {
  switch (summary.availability) {
    case 'not_entitled':
      return summary.detail.kind === 'empty' && summary.detail.reason === 'org_disabled'
        ? '机构已停用'
        : '机构还没有开通这个模块，可以联系老师确认。'
    case 'coming_soon':
      return '这个模块还在准备中，先用已经开通的模块继续学。'
    case 'local_only':
      return summary.detail.kind === 'matupix' ? summary.detail.hint : '作品只保存在这台设备'
    case 'cloud':
      return ''
    default: {
      const _exhaustive: never = summary.availability
      return _exhaustive
    }
  }
}

/** MatuPix 最小摘要：开通 → local_only；未开通 → not_entitled */
export function matupixSummary(entitled: boolean): ModuleProgressSummary {
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

