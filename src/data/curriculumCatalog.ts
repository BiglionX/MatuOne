import type { CurriculumLevelKind } from '@/types/curriculum'
import { CURRICULUM_LEVELS, CURRICULUM_STAGES, CURRICULUM_UNITS } from '@/data/fullCurriculum'

/**
 * 8 个 Level，每个 Level 6 个单元、120 节，合计 960 节。
 * 前 20 节是现有课文，第 21 节起是占位。
 */

export interface CatalogStage {
  stageId: string
  title: string
  sortOrder: number
  stageLevel: number
}

export interface CatalogUnit {
  unitId: string
  stageLevel: number
  title: string
  sortOrder: number
}

export interface CatalogPlacement {
  levelId: string
  unitId: string
  levelType: CurriculumLevelKind
  knowledgeTags: string[]
  milestoneBadge: string | null
}

export const STAGE_LEVEL_CAP = 120

export const STAGES: CatalogStage[] = CURRICULUM_STAGES.map((stage) => ({
  stageId: stage.stageId,
  title: stage.title,
  sortOrder: stage.stageLevel,
  stageLevel: stage.stageLevel,
}))

export const UNITS: CatalogUnit[] = CURRICULUM_UNITS.map((unit) => ({
  unitId: unit.unitId,
  stageLevel: unit.stageLevel,
  title: unit.title,
  sortOrder: unit.sortOrder,
}))

export const INBOX_UNIT_ID = 'L1_U01'

export const LEVEL_PLACEMENTS: CatalogPlacement[] = CURRICULUM_LEVELS.flatMap((lesson) => {
  const placement = {
    unitId: lesson.unitId,
    levelType: lesson.levelType as CurriculumLevelKind,
    knowledgeTags: lesson.knowledgeTags,
    milestoneBadge: lesson.milestoneBadge,
  }
  const rows = [{ levelId: lesson.levelId, ...placement }]
  if (lesson.legacyLevelId) rows.push({ levelId: lesson.legacyLevelId, ...placement })
  return rows
})
