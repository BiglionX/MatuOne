/**
 * ModuleProgressSummary → 现网可见文案。
 * 机构列表/看板优先「尚未开通」，不用底座 not_entitled →「机构未开通」。
 */
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
