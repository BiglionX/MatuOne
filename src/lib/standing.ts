import { INBOX_UNIT_ID, LEVEL_PLACEMENTS, STAGES, UNITS } from '@/data/curriculumCatalog'
import { LEVELS } from '@/mock/levels'
import type { CurriculumLevelKind, StudentStanding } from '@/types/curriculum'

export interface StandingRecord {
  levelId: string
  completed: boolean
}

const stageByLevel = new Map(STAGES.map((stage) => [stage.stageLevel, stage]))
const unitById = new Map(UNITS.map((unit) => [unit.unitId, unit]))
const placementByLevel = new Map(LEVEL_PLACEMENTS.map((placement) => [placement.levelId, placement]))

function clampOrder(order: number, total: number): number {
  if (total < 1) return 1
  return Math.min(total, Math.max(1, order))
}

/**
 * 有学习记录就按关卡顺序找第一段还没完成的课；完全没有记录才用 fallbackOrder。
 * 记录只按 levelId 归并，调用方不要把 orgId 传进来。
 */
export function resolveStudentStanding(input: { records: StandingRecord[]; fallbackOrder: number }): StudentStanding {
  const ordered = [...LEVELS].sort((a, b) => a.order - b.order)
  const total = ordered.length
  const hasRecord = input.records.length > 0
  const completed = new Set(input.records.filter((record) => record.completed).map((record) => record.levelId))

  let current = ordered[0]
  let completedCount = 0
  if (hasRecord) {
    completedCount = ordered.filter((level) => completed.has(level.level_id)).length
    current = ordered.find((level) => !completed.has(level.level_id)) ?? ordered[total - 1]
  } else if (current) {
    const target = clampOrder(input.fallbackOrder, total)
    completedCount = Math.max(0, target - 1)
    current = ordered.find((level) => level.order >= target) ?? ordered[total - 1]
  }

  const placement = current ? placementByLevel.get(current.level_id) : undefined
  const unit = unitById.get(placement?.unitId ?? INBOX_UNIT_ID) ?? UNITS[UNITS.length - 1]
  const stage = stageByLevel.get(unit.stageLevel) ?? STAGES[0]
  const levelType: CurriculumLevelKind = placement?.levelType ?? 'new'

  return {
    completedCount,
    currentOrder: current?.order ?? 1,
    source: hasRecord ? 'progress' : 'mock',
    stage: { id: stage.stageId, title: stage.title, sortOrder: stage.sortOrder },
    semester: { id: stage.stageId, title: stage.title, term: 'fall', sortOrder: stage.sortOrder },
    unit: { id: unit.unitId, title: unit.title, sortOrder: unit.sortOrder },
    level: {
      levelId: current?.level_id ?? '',
      title: current?.title ?? '',
      sortOrder: current?.order ?? 1,
      levelType,
      knowledgeTags: placement?.knowledgeTags ?? [],
      milestoneBadge: placement?.milestoneBadge ?? null,
    },
  }
}
