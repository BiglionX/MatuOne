import { isLevelEntitled, TRIAL_LEVEL_MAX, type EntitlementSpan, type OrgStatus } from '../../supabase/functions/_shared/orgStatus'
import {
  CURRICULUM_LEVELS,
  curriculumLevelByOrder,
  curriculumUnitById,
  isPlaceholderLevel,
  levelsOfUnit,
  stageOfOrder,
  stagesThrough,
  unitsOfStage,
  type CatalogLevel,
} from '../data/fullCurriculum'

export interface ProgressMark {
  order: number
  completed: boolean
  stars: number
}

export interface AccessContext {
  status: OrgStatus
  spans: EntitlementSpan[]
  orgId: string
  groupId: string
  studentId: string
}

export interface UnitSummary {
  unitId: string
  title: string
  sortOrder: number
  stageLevel: number
  completedCount: number
  total: number
  state: 'past' | 'current' | 'future'
}

export interface UnitLevelView {
  levelId: string
  order: number
  title: string
  goal: string
  levelType: CatalogLevel['levelType']
  milestoneBadge: string | null
  placeholder: boolean
  is_placeholder: boolean
  completed: boolean
  unlocked: boolean
  current: boolean
  stars: 0 | 1 | 2 | 3
}

export interface SemesterHome {
  heading: string
  stageLevel: number
  stageTitle: string
  stageSubtitle: string
  units: UnitSummary[]
  currentUnitId: string
  currentOrder: number
  completedCount: number
  entries: UnitLevelView[]
}

/** 第一段还没完成的课。没有任何记录时从第 1 节开始，不看机构。 */
export function focusOrder(marks: ProgressMark[]): number {
  const completed = new Set(marks.filter((mark) => mark.completed).map((mark) => mark.order))
  let order = 1
  while (completed.has(order) && order <= CURRICULUM_LEVELS.length) order += 1
  return Math.min(order, CURRICULUM_LEVELS.length)
}

function serviceOpen(status: OrgStatus): boolean {
  return status === 'trial' || status === 'active'
}

function canOpen(order: number, completed: boolean, focus: number, access: AccessContext): boolean {
  const entitled = isLevelEntitled(access.spans, access.orgId, access.groupId, access.studentId, order)
  const trialOk = access.status !== 'trial' || order <= TRIAL_LEVEL_MAX
  return entitled && serviceOpen(access.status) && trialOk && (completed || order === focus)
}

function starOf(value: number): 0 | 1 | 2 | 3 {
  if (value === 1 || value === 2 || value === 3) return value
  return 0
}

export function presentLearningHome(marks: ProgressMark[], access: AccessContext): SemesterHome {
  const focus = focusOrder(marks)
  const stage = stageOfOrder(focus) ?? stageOfOrder(1)
  const completed = new Set(marks.filter((mark) => mark.completed).map((mark) => mark.order))
  const units = stagesThrough(stage?.stageLevel ?? 1).flatMap((item) =>
    unitsOfStage(item.stageLevel).map((unit) => {
      const levels = levelsOfUnit(unit.unitId)
      const first = levels[0]?.order ?? 0
      const last = levels[levels.length - 1]?.order ?? 0
      const state: UnitSummary['state'] = focus >= first && focus <= last ? 'current' : focus > last ? 'past' : 'future'
      return {
        unitId: unit.unitId,
        title: unit.title,
        sortOrder: unit.sortOrder,
        stageLevel: unit.stageLevel,
        completedCount: levels.filter((level) => completed.has(level.order)).length,
        total: levels.length,
        state,
      }
    }),
  )
  const current = curriculumLevelByOrder(focus)
  const currentUnitId = current?.unitId ?? units[0]?.unitId ?? ''
  return {
    heading: stage?.title ?? 'Level 1',
    stageLevel: stage?.stageLevel ?? 1,
    stageTitle: stage?.title ?? 'Level 1',
    stageSubtitle: stage?.subtitle ?? '基础入门',
    units,
    currentUnitId,
    currentOrder: focus,
    completedCount: completed.size,
    entries: projectUnit(currentUnitId, marks, access) ?? [],
  }
}

export function projectUnit(unitId: string, marks: ProgressMark[], access: AccessContext): UnitLevelView[] | null {
  const unit = curriculumUnitById(unitId)
  if (!unit) return null
  const focus = focusOrder(marks)
  const stars = new Map(marks.map((mark) => [mark.order, mark.stars]))
  const completed = new Set(marks.filter((mark) => mark.completed).map((mark) => mark.order))
  return levelsOfUnit(unitId).map((level) => {
    const done = completed.has(level.order)
    const unlocked = canOpen(level.order, done, focus, access)
    return {
      levelId: level.levelId,
      order: level.order,
      title: level.title,
      goal: level.goal,
      levelType: level.levelType,
      milestoneBadge: level.milestoneBadge,
      placeholder: isPlaceholderLevel(level),
      is_placeholder: isPlaceholderLevel(level),
      completed: done,
      unlocked,
      current: unlocked && !done && level.order === focus,
      stars: starOf(stars.get(level.order) ?? 0),
    }
  })
}
