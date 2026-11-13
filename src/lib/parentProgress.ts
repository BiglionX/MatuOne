import {
  CURRICULUM_LEVELS,
  badgeTitleOf,
  curriculumLevelByOrder,
  curriculumStageByLevel,
  curriculumUnitById,
  isPlaceholderLevel,
  LEVEL_TOTAL,
  levelsOfUnit,
} from '@/data/fullCurriculum'

export interface EarnedBadge {
  id: string
  title: string
}

export interface ParentCurriculumProgress {
  stageLabel: string
  unitLabel: string
  unitCompleted: number
  unitTotal: number
  badges: EarnedBadge[]
  beyondAuthored: boolean
}

/** 用当前课时序号还原这一单元的进度。不把全课程 960 节暴露给家长。 */
export function presentParentProgress(currentOrder: number): ParentCurriculumProgress {
  const order = Math.min(LEVEL_TOTAL, Math.max(1, currentOrder || 1))
  const current = curriculumLevelByOrder(order) ?? curriculumLevelByOrder(1)
  const unit = current ? curriculumUnitById(current.unitId) : undefined
  const stage = unit ? curriculumStageByLevel(unit.stageLevel) : curriculumStageByLevel(1)
  const unitLessons = unit ? levelsOfUnit(unit.unitId) : []
  const realLessons = unitLessons.filter((lesson) => !isPlaceholderLevel(lesson))
  const beyondAuthored = !CURRICULUM_LEVELS.some((lesson) => lesson.order >= order && !isPlaceholderLevel(lesson))
  const badges = CURRICULUM_LEVELS.filter((lesson) => lesson.milestoneBadge && lesson.order < order && !isPlaceholderLevel(lesson)).map((lesson) => ({
    id: lesson.milestoneBadge as string,
    title: badgeTitleOf(lesson.milestoneBadge as string),
  }))
  return {
    stageLabel: stage ? `${stage.title}（${stage.subtitle}）` : 'Level 1（基础入门）',
    unitLabel: unit?.title ?? 'Level 1 · 单元 1',
    unitCompleted: realLessons.filter((lesson) => lesson.order < order).length,
    unitTotal: unitLessons.length || 20,
    beyondAuthored,
    badges,
  }
}
