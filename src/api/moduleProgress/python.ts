/**
 * Python 模块进度适配器：纯映射。
 * 授权分子/分母只读现有 API 已返回的 authorizedLevels / authorizedCompletedCount（S0），
 * lastStudiedAt 优先用 API 三链字段；不新写授权查询，不 import supabase/functions/_shared/。
 */
import { listOrgStudents, type OrgStudentListItem } from '@/api/orgPortal'
import { loadParentHome } from '@/api/parent'
import { curriculumLevelByOrder } from '@/data/fullCurriculum'
import { presentParentProgress } from '@/lib/parentProgress'
import { getModule } from '@/modules/registry'
import type {
  ModuleProgressSummary,
  PythonProgressDetail,
  StudentModulesProgressView,
} from '@/types/moduleProgress'
import type { ParentChildView, ParentStoppedChild } from '@/types'

const MODULE_ID = 'python' as const

function pythonMeta(): { displayName: string; gradeRange?: string } {
  const mod = getModule('python')
  return {
    displayName: mod?.display_name ?? 'Python 课外课',
    gradeRange: mod?.grade_range,
  }
}

function levelMeta(order: number): { currentLevelId: string | null; currentLevelTitle: string | null } {
  const level = curriculumLevelByOrder(order)
  return {
    currentLevelId: level?.levelId ?? null,
    currentLevelTitle: level?.title ?? null,
  }
}

function notEntitledEmpty(reason: 'org_disabled' | 'no_data'): ModuleProgressSummary {
  const meta = pythonMeta()
  return {
    moduleId: MODULE_ID,
    displayName: meta.displayName,
    gradeRange: meta.gradeRange,
    availability: 'not_entitled',
    completed: null,
    total: null,
    lastStudiedAt: null,
    detail: { kind: 'empty', reason },
  }
}

function cloudPythonSummary(input: {
  currentLevelOrder: number
  currentLevelId: string | null
  currentLevelTitle: string | null
  authorizedCompletedCount: number
  authorizedLevels: number
  stageLabel: string | null
  unitLabel: string | null
  unitCompleted: number | null
  unitTotal: number | null
  typing: PythonProgressDetail['typing']
  lastStudiedAt: string | null
}): ModuleProgressSummary {
  const meta = pythonMeta()
  const detail: PythonProgressDetail = {
    kind: 'python',
    currentLevelOrder: input.currentLevelOrder,
    currentLevelId: input.currentLevelId,
    currentLevelTitle: input.currentLevelTitle,
    completedLevels: input.authorizedCompletedCount,
    authorizedLevels: input.authorizedLevels,
    stageLabel: input.stageLabel,
    unitLabel: input.unitLabel,
    unitCompleted: input.unitCompleted,
    unitTotal: input.unitTotal,
    typing: input.typing,
  }
  return {
    moduleId: MODULE_ID,
    displayName: meta.displayName,
    gradeRange: meta.gradeRange,
    availability: 'cloud',
    completed: input.authorizedCompletedCount,
    total: input.authorizedLevels,
    lastStudiedAt: input.lastStudiedAt,
    detail,
  }
}

/** 机构列表行：字段已由 OrgStudentListItem 正式声明。 */
export type OrgPythonProgressSource = Pick<
  OrgStudentListItem,
  | 'id'
  | 'name'
  | 'status'
  | 'currentLevelOrder'
  | 'lastActiveAt'
  | 'lastStudiedAt'
  | 'authorizedLevels'
  | 'authorizedCompletedCount'
  | 'completedCount'
  | 'typing'
>

/** 家长孩子行：字段已由 ParentChildView 正式声明。 */
export type ParentPythonProgressSource = ParentChildView

function mapTypingSeries(
  series: ParentChildView['typingSeries'] | undefined,
): NonNullable<PythonProgressDetail['typing']>['series'] | undefined {
  if (!series?.length) return undefined
  return series.map((point) => ({
    at: point.weekStart,
    wpm: point.wpm,
    accuracy: point.accuracy,
  }))
}

function parentTyping(child: ParentPythonProgressSource): PythonProgressDetail['typing'] {
  const series = mapTypingSeries(child.typingSeries)
  const latest = [...(child.typingSeries ?? [])].reverse().find((p) => p.wpm != null && p.accuracy != null)
  if (!latest && !series?.some((p) => p.wpm != null)) return null
  return {
    wpm: latest?.wpm ?? 0,
    accuracy: latest?.accuracy ?? 0,
    ...(series ? { series } : {}),
  }
}

/** API 未返回 lastStudiedAt 时的最后兜底（正常路径应始终带字段）。 */
function fallbackLastStudiedAt(lastActiveAt: string | null | undefined): string | null {
  const raw = (lastActiveAt ?? '').trim()
  return raw || null
}

function resolveLastStudiedAt(
  apiValue: string | null | undefined,
  lastActiveAt: string | null | undefined,
): string | null {
  if (apiValue !== undefined) return apiValue
  return fallbackLastStudiedAt(lastActiveAt)
}

/** 机构学生行 → ModuleProgressSummary（纯函数，易测） */
export function mapOrgStudentRowToPythonSummary(row: OrgPythonProgressSource): ModuleProgressSummary {
  const authorizedLevels = row.authorizedLevels
  if (authorizedLevels === 0) return notEntitledEmpty('no_data')

  const authorizedCompletedCount = row.authorizedCompletedCount
  const currentLevelOrder = row.currentLevelOrder
  const meta = levelMeta(currentLevelOrder)

  return cloudPythonSummary({
    currentLevelOrder,
    currentLevelId: meta.currentLevelId,
    currentLevelTitle: meta.currentLevelTitle,
    authorizedCompletedCount,
    authorizedLevels,
    stageLabel: null,
    unitLabel: null,
    unitCompleted: null,
    unitTotal: null,
    typing: row.typing,
    lastStudiedAt: resolveLastStudiedAt(row.lastStudiedAt, row.lastActiveAt),
  })
}

/** 家长孩子行 → ModuleProgressSummary（纯函数） */
export function mapParentChildToPythonSummary(child: ParentPythonProgressSource): ModuleProgressSummary {
  const authorizedLevels = child.authorizedLevels
  if (authorizedLevels === 0) return notEntitledEmpty('no_data')

  const currentLevelOrder = child.currentLevelOrder || child.student.currentLevelOrder || 1
  const unit = presentParentProgress(currentLevelOrder)
  const catalog = levelMeta(currentLevelOrder)

  return cloudPythonSummary({
    currentLevelOrder,
    currentLevelId: catalog.currentLevelId,
    currentLevelTitle: child.currentLevelTitle ?? catalog.currentLevelTitle,
    authorizedCompletedCount: child.authorizedCompletedCount,
    authorizedLevels,
    stageLabel: unit.stageLabel,
    unitLabel: unit.unitLabel,
    unitCompleted: unit.unitCompleted,
    unitTotal: unit.unitTotal,
    typing: parentTyping(child),
    lastStudiedAt: resolveLastStudiedAt(child.lastStudiedAt, child.student.lastActiveAt),
  })
}

/** 家长 stopped（机构停用）→ not_entitled + org_disabled */
export function mapParentStoppedToPythonSummary(_stopped: ParentStoppedChild): ModuleProgressSummary {
  return notEntitledEmpty('org_disabled')
}

/** 机构：listOrgStudents → 每名学生一份 Python 进度摘要 */
export async function listOrgPythonModuleProgress(): Promise<StudentModulesProgressView[]> {
  const students = await listOrgStudents()
  return students.map((row) => ({
    studentId: row.id,
    studentName: row.name,
    modules: [mapOrgStudentRowToPythonSummary(row)],
  }))
}

/** 机构本机构点名一名学生（内部仍走 listOrgStudents，不信任前端 orgId） */
export async function getOrgStudentPythonProgress(studentId: string): Promise<ModuleProgressSummary | null> {
  const students = await listOrgStudents()
  const row = students.find((s) => s.id === studentId)
  if (!row) return null
  return mapOrgStudentRowToPythonSummary(row)
}

/** 家长：loadParentHome → 每个非 stopped 孩子 + stopped 占位 */
export async function listParentPythonModuleProgress(): Promise<StudentModulesProgressView[]> {
  const home = await loadParentHome()
  const active = home.children.map((child) => ({
    studentId: child.student.id,
    studentName: child.student.name,
    modules: [mapParentChildToPythonSummary(child)],
  }))
  const stopped = home.stopped.map((item, index) => ({
    studentId: `stopped:${index}`,
    studentName: item.name,
    modules: [mapParentStoppedToPythonSummary(item)],
  }))
  return [...active, ...stopped]
}
