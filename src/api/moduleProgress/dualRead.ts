/**
 * S5 进度双读校验（仅开发态）：用现网 row/child 跑 Python 适配器，对比关键字段。
 * 不切换渲染真源；不一致 console.warn，一致 debug 汇总。
 */
import type { ModuleProgressSummary, PythonProgressDetail } from '@/types/moduleProgress'
import {
  mapOrgStudentRowToPythonSummary,
  mapParentChildToPythonSummary,
  type OrgPythonProgressSource,
  type ParentPythonProgressSource,
} from './python'

const LOG_PREFIX = '[progress dual-read]'

export function isProgressDualReadEnabled(): boolean {
  return import.meta.env.DEV === true || import.meta.env.VITE_PROGRESS_DUAL_READ === '1'
}

type FieldDiff = { field: string; legacy: unknown; mapped: unknown }

function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a === null || b === null || a === undefined || b === undefined) return a === b
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

function pushDiff(diffs: FieldDiff[], field: string, legacy: unknown, mapped: unknown): void {
  if (!sameValue(legacy, mapped)) diffs.push({ field, legacy, mapped })
}

function asPythonDetail(summary: ModuleProgressSummary): PythonProgressDetail | null {
  return summary.detail.kind === 'python' ? summary.detail : null
}

/** 机构列表行 ↔ ModuleProgressSummary */
export function diffOrgStudentProgress(
  row: OrgPythonProgressSource,
  summary: ModuleProgressSummary,
): FieldDiff[] {
  const diffs: FieldDiff[] = []

  if (row.authorizedLevels === 0) {
    pushDiff(diffs, 'availability', 'not_entitled', summary.availability)
    pushDiff(diffs, 'completed', null, summary.completed)
    pushDiff(diffs, 'total', null, summary.total)
    pushDiff(diffs, 'lastStudiedAt', row.lastStudiedAt ?? null, summary.lastStudiedAt)
    return diffs
  }

  pushDiff(diffs, 'completed≡authorizedCompletedCount', row.authorizedCompletedCount, summary.completed)
  pushDiff(diffs, 'total≡authorizedLevels', row.authorizedLevels, summary.total)
  pushDiff(diffs, 'lastStudiedAt', row.lastStudiedAt ?? null, summary.lastStudiedAt)

  const detail = asPythonDetail(summary)
  if (!detail) {
    diffs.push({ field: 'detail.kind', legacy: 'python', mapped: summary.detail.kind })
    return diffs
  }
  pushDiff(diffs, 'currentLevelOrder', row.currentLevelOrder, detail.currentLevelOrder)
  return diffs
}

function expectedTypingSeries(child: ParentPythonProgressSource): Array<{
  at: string
  wpm: number | null
  accuracy: number | null
}> | undefined {
  const series = child.typingSeries
  if (!series?.length) return undefined
  return series.map((point) => ({
    at: point.weekStart,
    wpm: point.wpm,
    accuracy: point.accuracy,
  }))
}

/** 家长孩子行 ↔ ModuleProgressSummary（含 unit / typing.series） */
export function diffParentChildProgress(
  child: ParentPythonProgressSource,
  summary: ModuleProgressSummary,
): FieldDiff[] {
  const diffs: FieldDiff[] = []
  const legacyOrder = child.currentLevelOrder || child.student.currentLevelOrder || 1

  if (child.authorizedLevels === 0) {
    pushDiff(diffs, 'availability', 'not_entitled', summary.availability)
    pushDiff(diffs, 'completed', null, summary.completed)
    pushDiff(diffs, 'total', null, summary.total)
    pushDiff(diffs, 'lastStudiedAt', child.lastStudiedAt ?? null, summary.lastStudiedAt)
    return diffs
  }

  pushDiff(diffs, 'completed≡authorizedCompletedCount', child.authorizedCompletedCount, summary.completed)
  pushDiff(diffs, 'total≡authorizedLevels', child.authorizedLevels, summary.total)
  pushDiff(diffs, 'lastStudiedAt', child.lastStudiedAt ?? null, summary.lastStudiedAt)

  const detail = asPythonDetail(summary)
  if (!detail) {
    diffs.push({ field: 'detail.kind', legacy: 'python', mapped: summary.detail.kind })
    return diffs
  }

  pushDiff(diffs, 'currentLevelOrder', legacyOrder, detail.currentLevelOrder)
  pushDiff(diffs, 'unitCompleted', child.curriculum.unitCompleted, detail.unitCompleted)
  pushDiff(diffs, 'unitTotal', child.curriculum.unitTotal, detail.unitTotal)

  const legacySeries = expectedTypingSeries(child)
  if (legacySeries) {
    const hasSignal = legacySeries.some((p) => p.wpm != null)
    const mappedSeries = detail.typing?.series
    if (hasSignal || mappedSeries) {
      pushDiff(diffs, 'typing.series', legacySeries, mappedSeries ?? null)
    }
  }

  return diffs
}

function warnMismatch(
  scope: 'org' | 'parent',
  id: string,
  name: string,
  diffs: FieldDiff[],
): void {
  console.warn(`${LOG_PREFIX} ${scope} mismatch`, { id, name, diffs })
}

/** 机构学生列表加载后调用（同批数据映射，不另发请求） */
export function dualReadOrgStudents(rows: OrgPythonProgressSource[]): void {
  if (!isProgressDualReadEnabled()) return

  let mismatchCount = 0
  for (const row of rows) {
    const summary = mapOrgStudentRowToPythonSummary(row)
    const diffs = diffOrgStudentProgress(row, summary)
    if (diffs.length > 0) {
      mismatchCount += 1
      warnMismatch('org', row.id, row.name, diffs)
    }
  }

  if (mismatchCount === 0) {
    console.debug(`${LOG_PREFIX} org ok`, { students: rows.length })
  } else {
    console.warn(`${LOG_PREFIX} org summary`, { students: rows.length, mismatches: mismatchCount })
  }
}

/** 家长 home 加载后调用（同批 children 映射） */
export function dualReadParentHome(children: ParentPythonProgressSource[]): void {
  if (!isProgressDualReadEnabled()) return

  let mismatchCount = 0
  for (const child of children) {
    const summary = mapParentChildToPythonSummary(child)
    const diffs = diffParentChildProgress(child, summary)
    if (diffs.length > 0) {
      mismatchCount += 1
      warnMismatch('parent', child.student.id, child.student.name, diffs)
    }
  }

  if (mismatchCount === 0) {
    console.debug(`${LOG_PREFIX} parent ok`, { children: children.length })
  } else {
    console.warn(`${LOG_PREFIX} parent summary`, { children: children.length, mismatches: mismatchCount })
  }
}
