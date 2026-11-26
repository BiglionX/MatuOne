/**
 * Blockly 课程地图。
 *
 * Python 的地图走 course_level + curriculum_stage 两层，Blockly 走
 * module_term → module_unit → module_level 三层，结构完全不同，
 * 所以这里独立实现一套，不复用 presentLearningHome。
 *
 * 解锁规则：按 sort_order 线性解锁。第一个关卡永远开放，
 * 后面的关卡要等前一个关卡通关才解锁。
 */
import { q } from './db'

export interface BlocklyMapLevel {
  levelId: string
  title: string
  sortOrder: number
  termId: string
  unitId: string
  levelType: string
  milestoneBadge: string | null
  /** 正文还没写好，只是占位骨架。 */
  isPlaceholder: boolean
  completed: boolean
  unlocked: boolean
}

export interface BlocklyMapUnit {
  unitId: string
  termId: string
  title: string
  summary: string
  sceneForm: string
  sortOrder: number
  levels: BlocklyMapLevel[]
}

export interface BlocklyMapTerm {
  termId: string
  title: string
  stageLabel: string
  summary: string
  sortOrder: number
  weeks: number
  units: BlocklyMapUnit[]
}

export interface BlocklyMap {
  terms: BlocklyMapTerm[]
  /** 第一个还有未通关关卡的学期；全部通关时指向最后一个学期。 */
  currentTermId: string
  completedCount: number
  totalCount: number
}

/** 解锁判定只需要排序和通关状态，抽出来做纯函数便于单测。 */
export interface BlocklyLevelSeed {
  levelId: string
  sortOrder: number
  completed: boolean
}

/**
 * 按 sort_order 线性解锁：第一个关卡永远开放，
 * 第 n 个关卡要等第 n-1 个关卡通关。
 */
export function applyLinearUnlock<T extends BlocklyLevelSeed>(seeds: readonly T[]): (T & { unlocked: boolean })[] {
  const ordered = [...seeds].sort((a, b) => a.sortOrder - b.sortOrder)
  let previousCompleted = true
  return ordered.map((seed) => {
    const unlocked = previousCompleted
    previousCompleted = seed.completed
    return { ...seed, unlocked }
  })
}

type TermRow = {
  term_id: string
  title: string
  stage_label: string
  summary: string
  sort_order: number
  weeks: number
}

type UnitRow = {
  unit_id: string
  term_id: string
  title: string
  summary: string
  scene_form: string
  sort_order: number
}

type LevelRow = {
  level_id: string
  title: string
  sort_order: number
  term_id: string | null
  unit_id: string | null
  level_type: string
  milestone_badge: string | null
  is_placeholder: boolean
}

type ProgressRow = {
  level_id: string
  completed: boolean
}

/**
 * 读出某个学生看到的 Blockly 地图。
 *
 * 进度只按 (student_id, module_id) 取，不带 org_id；机构开通与否由调用方先判。
 */
export async function buildBlocklyMap(studentId: string, moduleId = 'blockly'): Promise<BlocklyMap> {
  const [termRows, unitRows, levelRows, progressRows] = await Promise.all([
    q<TermRow>(
      `select term_id, title, stage_label, summary, sort_order, weeks
       from public.module_term
       where module_id = $1
       order by sort_order`,
      [moduleId],
    ),
    q<UnitRow>(
      `select unit_id, term_id, title, summary, scene_form, sort_order
       from public.module_unit
       where module_id = $1
       order by term_id, sort_order`,
      [moduleId],
    ),
    q<LevelRow>(
      `select level_id, title, sort_order, term_id, unit_id, level_type, milestone_badge, is_placeholder
       from public.module_level
       where module_id = $1 and published = true
       order by sort_order`,
      [moduleId],
    ),
    q<ProgressRow>(
      `select level_id, completed
       from public.learning_record
       where student_id = $1 and module_id = $2`,
      [studentId, moduleId],
    ),
  ])

  const completedIds = new Set(progressRows.filter((row) => row.completed).map((row) => row.level_id))

  const levels: BlocklyMapLevel[] = applyLinearUnlock(
    levelRows.map((row) => ({
      levelId: row.level_id,
      title: row.title,
      sortOrder: Number(row.sort_order),
      termId: row.term_id ?? '',
      unitId: row.unit_id ?? '',
      levelType: row.level_type,
      milestoneBadge: row.milestone_badge,
      isPlaceholder: Boolean(row.is_placeholder),
      completed: completedIds.has(row.level_id),
    })),
  )

  const levelsByUnit = new Map<string, BlocklyMapLevel[]>()
  for (const level of levels) {
    if (!level.unitId) continue
    const bucket = levelsByUnit.get(level.unitId)
    if (bucket) bucket.push(level)
    else levelsByUnit.set(level.unitId, [level])
  }

  const unitsByTerm = new Map<string, BlocklyMapUnit[]>()
  for (const row of unitRows) {
    const unit: BlocklyMapUnit = {
      unitId: row.unit_id,
      termId: row.term_id,
      title: row.title,
      summary: row.summary,
      sceneForm: row.scene_form,
      sortOrder: Number(row.sort_order),
      levels: levelsByUnit.get(row.unit_id) ?? [],
    }
    const bucket = unitsByTerm.get(unit.termId)
    if (bucket) bucket.push(unit)
    else unitsByTerm.set(unit.termId, [unit])
  }

  const terms: BlocklyMapTerm[] = termRows.map((row) => ({
    termId: row.term_id,
    title: row.title,
    stageLabel: row.stage_label,
    summary: row.summary,
    sortOrder: Number(row.sort_order),
    weeks: Number(row.weeks),
    units: unitsByTerm.get(row.term_id) ?? [],
  }))

  const completedCount = levels.filter((level) => level.completed).length
  const currentTerm =
    terms.find((term) => term.units.some((unit) => unit.levels.some((level) => !level.completed))) ??
    terms[terms.length - 1] ??
    null

  return {
    terms,
    currentTermId: currentTerm?.termId ?? '',
    completedCount,
    totalCount: levels.length,
  }
}