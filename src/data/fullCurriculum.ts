import type { CurriculumLevelKind } from '../types/curriculum'
import raw from './generated/curriculum.json'

export interface CatalogStage {
  stageLevel: number
  stageId: string
  title: string
  subtitle: string
  heading: string
}

export interface CatalogUnit {
  unitId: string
  stageLevel: number
  title: string
  sortOrder: number
  knowledgeTags: string[]
}

export interface CatalogLevel {
  levelId: string
  order: number
  stageLevel: number
  unitId: string
  levelType: CurriculumLevelKind
  title: string
  goal: string
  knowledgeTags: string[]
  milestoneBadge: string | null
  placeholder: boolean
  is_placeholder: boolean
  legacyLevelId: string | null
}

interface CatalogFile {
  stages: CatalogStage[]
  units: CatalogUnit[]
  levels: CatalogLevel[]
  badges: Record<string, string>
}

const catalog = raw as CatalogFile

export const CURRICULUM_STAGES: CatalogStage[] = catalog.stages
export const CURRICULUM_UNITS: CatalogUnit[] = catalog.units
export const CURRICULUM_LEVELS: CatalogLevel[] = catalog.levels
export const CURRICULUM_BADGES: Record<string, string> = catalog.badges
export const LEVEL_TOTAL = catalog.levels.length

const byId = new Map(catalog.levels.map((level) => [level.levelId, level]))
const byOrder = new Map(catalog.levels.map((level) => [level.order, level]))
const unitById = new Map(catalog.units.map((unit) => [unit.unitId, unit]))
const stageByLevel = new Map(catalog.stages.map((stage) => [stage.stageLevel, stage]))
const levelsByUnit = new Map<string, CatalogLevel[]>()
for (const level of catalog.levels) {
  const list = levelsByUnit.get(level.unitId)
  if (list) list.push(level)
  else levelsByUnit.set(level.unitId, [level])
}

export function curriculumLevelById(levelId: string): CatalogLevel | undefined {
  return byId.get(levelId)
}

export function curriculumLevelByOrder(order: number): CatalogLevel | undefined {
  return byOrder.get(order)
}

export function curriculumUnitById(unitId: string): CatalogUnit | undefined {
  return unitById.get(unitId)
}

export function curriculumStageByLevel(stageLevel: number): CatalogStage | undefined {
  return stageByLevel.get(stageLevel)
}

export function levelsOfUnit(unitId: string): CatalogLevel[] {
  return levelsByUnit.get(unitId) ?? []
}

export function unitsOfStage(stageLevel: number): CatalogUnit[] {
  return catalog.units.filter((unit) => unit.stageLevel === stageLevel).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function stageOfOrder(order: number): CatalogStage | undefined {
  const level = byOrder.get(order)
  return level ? stageByLevel.get(level.stageLevel) : catalog.stages[0]
}

export function stagesThrough(stageLevel: number): CatalogStage[] {
  return catalog.stages.filter((stage) => stage.stageLevel <= stageLevel)
}

export function nextLevelId(order: number): string | null {
  return byOrder.get(order + 1)?.levelId ?? null
}

export function badgeTitleOf(id: string): string {
  return catalog.badges[id] ?? id
}

/** 占位课：生成时打了标，或标题还是「待补充 / 占位 / Level N · 单元 M · 第 K 关」。 */
export function isPlaceholderLevel(level: { title: string; placeholder?: boolean; is_placeholder?: boolean }): boolean {
  if (level.is_placeholder === true || level.placeholder === true) return true
  if (level.is_placeholder === false || level.placeholder === false) return false
  return level.title.includes('占位') || level.title.includes('待补充') || /^Level \d+ · 单元 \d+ · 第 \d+ 关$/.test(level.title)
}
