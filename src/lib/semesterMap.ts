import {
  GRADE3_FALL_LESSONS,
  GRADE3_FALL_SEMESTER,
  GRADE3_FALL_UNITS,
  type Grade3Lesson,
} from '@/data/grade3Fall'
import type { CurriculumLevelKind } from '@/types/curriculum'
import type { MapEntry } from '@/types'

export interface SemesterLevelView {
  levelId: string
  order: number
  title: string
  goal: string
  levelType: CurriculumLevelKind
  milestoneBadge: string | null
  placeholder: boolean
  completed: boolean
  unlocked: boolean
  current: boolean
  stars: 0 | 1 | 2 | 3
  /** 已发布、已解锁、并且不是占位课，才能进课时页。 */
  enterable: boolean
}

export interface SemesterUnitView {
  unitId: string
  title: string
  sortOrder: number
  levels: SemesterLevelView[]
  completedCount: number
  state: 'past' | 'current' | 'future'
}

export interface SemesterMap {
  heading: string
  semesterTitle: string
  units: SemesterUnitView[]
  currentUnitId: string
  focus: SemesterLevelView
}

export function presentSemesterMap(entries: MapEntry[]): SemesterMap {
  const byId = new Map(entries.map((entry) => [entry.levelId, entry]))
  const completed = new Set(entries.filter((entry) => entry.completed).map((entry) => entry.levelId))
  const apiCurrent = entries.find((entry) => entry.current)?.levelId
  const focusId =
    apiCurrent ??
    GRADE3_FALL_LESSONS.find((lesson) => !completed.has(lesson.levelId))?.levelId ??
    GRADE3_FALL_LESSONS[GRADE3_FALL_LESSONS.length - 1].levelId

  const levels = GRADE3_FALL_LESSONS.map((lesson) => toView(lesson, byId.get(lesson.levelId), lesson.levelId === focusId))
  const focus = levels.find((level) => level.levelId === focusId) ?? levels[0]
  const units = GRADE3_FALL_UNITS.map((unit) => {
    const unitLevels = levels.filter((level) => unit.unitId === lessonUnit(level.levelId))
    const completedCount = unitLevels.filter((level) => level.completed).length
    const state: SemesterUnitView['state'] =
      unit.unitId === lessonUnit(focus.levelId) ? 'current' : focus.order > unitLevels[unitLevels.length - 1].order ? 'past' : 'future'
    return {
      unitId: unit.unitId,
      title: unit.title,
      sortOrder: unit.sortOrder,
      levels: unitLevels,
      completedCount,
      state,
    }
  })

  return {
    heading: GRADE3_FALL_SEMESTER.heading,
    semesterTitle: GRADE3_FALL_SEMESTER.semesterTitle,
    units,
    currentUnitId: lessonUnit(focus.levelId),
    focus,
  }
}

function lessonUnit(levelId: string): string {
  return GRADE3_FALL_LESSONS.find((lesson) => lesson.levelId === levelId)?.unitId ?? GRADE3_FALL_UNITS[0].unitId
}

function toView(lesson: Grade3Lesson, entry: MapEntry | undefined, current: boolean): SemesterLevelView {
  const completed = Boolean(entry?.completed)
  const unlocked = entry ? entry.unlocked : false
  return {
    levelId: lesson.levelId,
    order: lesson.order,
    title: lesson.title,
    goal: lesson.goal,
    levelType: lesson.levelType,
    milestoneBadge: lesson.milestoneBadge,
    placeholder: lesson.placeholder,
    completed,
    unlocked,
    current,
    stars: entry?.stars ?? 0,
    enterable: Boolean(entry) && unlocked && !lesson.placeholder,
  }
}
