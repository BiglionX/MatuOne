const UNIT_ID = /^L[1-8]_U\d{2}$/

const STAGE_SUBTITLE = ['基础入门', '海龟绘图', '循环魔法', '条件判断', '数据进阶', '逻辑进阶', '综合项目', '算法初探']

export type CourseLevelKind = 'new' | 'practice' | 'project' | 'typing'
export type CoursePreviewKind = 'text' | 'turtle'
export type CourseExerciseKind = 'normal' | 'fill_blank' | 'debug'

export interface CourseTreeSourceRow {
  stage_level: number | string
  unit_id: string
  unit_title: string
  unit_sort: number | string
  level_id: string | null
  sort_order: number | string | null
  title: string | null
  goal: string | null
  level_type: string | null
  knowledge_tags: unknown
  milestone_badge: string | null
  published: boolean | string | null
  preview_frozen?: boolean | string | null
  teaching_intent: string | null
  parent_brief: string | null
  teacher_guide: string | null
  preview_kind?: string | null
  exercise?: string | null
  estimated_minutes?: unknown
  keywords?: unknown
  body?: unknown
}

export interface CourseTreeLevelNode {
  levelId: string
  catalogId: string
  sortOrder: number
  title: string
  goal: string
  levelType: CourseLevelKind
  knowledgeTags: string[]
  milestoneBadge: string | null
  published: boolean
  previewFrozen: boolean
  teachingIntent: string | null
  parentBrief: string | null
  teacherGuide: string | null
  keywords: string[]
  estimatedMinutes: number | null
  previewKind: CoursePreviewKind | null
  exercise: CourseExerciseKind | null
}

export interface CourseTreeUnitNode {
  unitId: string
  title: string
  label: string
  sortOrder: number
  levels: CourseTreeLevelNode[]
}

export interface CourseTreeStageNode {
  stageLevel: number
  title: string
  subtitle: string
  units: CourseTreeUnitNode[]
}

export interface CourseTreeTableUnit {
  unit_id: string
  title: string
  sort_order: number
  stage_level: number
}

export interface CourseTreeTableLevel {
  level_id: string
  sort_order: number
  title: string
  goal: string
  level_type: string
  knowledge_tags: unknown
  milestone_badge: string | null
  published: boolean
  preview_frozen?: boolean | null
  teaching_intent: string | null
  parent_brief: string | null
  teacher_guide: string | null
  unit_id: string
  body: unknown
}

export const COURSE_TREE_SQL = `
select
  u.stage_level,
  u.unit_id,
  u.title as unit_title,
  u.sort_order as unit_sort,
  cl.level_id,
  cl.sort_order,
  cl.title,
  cl.goal,
  cl.level_type,
  cl.knowledge_tags::text as knowledge_tags,
  cl.milestone_badge,
  cl.published,
  cl.preview_frozen,
  cl.teaching_intent,
  cl.parent_brief,
  cl.teacher_guide,
  cl.body->>'preview_kind' as preview_kind,
  cl.body->>'level_type' as exercise,
  cl.body->>'estimated_minutes' as estimated_minutes,
  cl.body->'keywords' as keywords
from public.curriculum_unit u
left join public.course_level cl on cl.unit_id = u.unit_id
where u.unit_id ~ '^L[1-8]_U[0-9]{2}$'
  and u.stage_level between 1 and 8
order by u.stage_level, u.sort_order, cl.sort_order nulls last
`

export function catalogLevelId(sortOrder: number): string {
  return `L${String(sortOrder).padStart(4, '0')}`
}

export function sourceRowsFromTables(units: CourseTreeTableUnit[], levels: CourseTreeTableLevel[]): CourseTreeSourceRow[] {
  const kept = units.filter((unit) => UNIT_ID.test(unit.unit_id) && unit.stage_level >= 1 && unit.stage_level <= 8)
  const byUnit = new Map<string, CourseTreeTableLevel[]>()
  for (const level of levels) {
    if (!UNIT_ID.test(level.unit_id)) continue
    const list = byUnit.get(level.unit_id)
    if (list) list.push(level)
    else byUnit.set(level.unit_id, [level])
  }
  const rows: CourseTreeSourceRow[] = []
  for (const unit of kept) {
    const list = byUnit.get(unit.unit_id) ?? []
    if (!list.length) {
      rows.push(emptyUnitRow(unit))
      continue
    }
    for (const level of list) {
      rows.push({
        stage_level: unit.stage_level,
        unit_id: unit.unit_id,
        unit_title: unit.title,
        unit_sort: unit.sort_order,
        level_id: level.level_id,
        sort_order: level.sort_order,
        title: level.title,
        goal: level.goal,
        level_type: level.level_type,
        knowledge_tags: level.knowledge_tags,
        milestone_badge: level.milestone_badge,
        published: level.published,
        preview_frozen: level.preview_frozen ?? false,
        teaching_intent: level.teaching_intent,
        parent_brief: level.parent_brief,
        teacher_guide: level.teacher_guide,
        body: level.body,
      })
    }
  }
  return rows
}

export function groupCourseTree(rows: CourseTreeSourceRow[]): CourseTreeStageNode[] {
  const stages = new Map<number, CourseTreeStageNode>()
  for (const row of rows) {
    const stageLevel = asInt(row.stage_level)
    const unitSort = asInt(row.unit_sort)
    if (stageLevel == null || stageLevel < 1 || stageLevel > 8 || !UNIT_ID.test(row.unit_id) || unitSort == null) continue
    let stage = stages.get(stageLevel)
    if (!stage) {
      stage = {
        stageLevel,
        title: `Level ${stageLevel}`,
        subtitle: STAGE_SUBTITLE[stageLevel - 1] ?? '',
        units: [],
      }
      stages.set(stageLevel, stage)
    }
    let unit = stage.units.find((item) => item.unitId === row.unit_id)
    if (!unit) {
      unit = {
        unitId: row.unit_id,
        title: row.unit_title,
        label: `单元 ${unitSort}`,
        sortOrder: unitSort,
        levels: [],
      }
      stage.units.push(unit)
    }
    const level = toLevel(row)
    if (level) unit.levels.push(level)
  }
  return [...stages.values()]
    .sort((a, b) => a.stageLevel - b.stageLevel)
    .map((stage) => ({
      ...stage,
      units: stage.units
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((unit) => ({
          ...unit,
          levels: unit.levels.sort((a, b) => a.sortOrder - b.sortOrder),
        })),
    }))
}

function emptyUnitRow(unit: CourseTreeTableUnit): CourseTreeSourceRow {
  return {
    stage_level: unit.stage_level,
    unit_id: unit.unit_id,
    unit_title: unit.title,
    unit_sort: unit.sort_order,
    level_id: null,
    sort_order: null,
    title: null,
    goal: null,
    level_type: null,
    knowledge_tags: null,
    milestone_badge: null,
    published: null,
    preview_frozen: null,
    teaching_intent: null,
    parent_brief: null,
    teacher_guide: null,
  }
}

function toLevel(row: CourseTreeSourceRow): CourseTreeLevelNode | null {
  const sortOrder = asInt(row.sort_order)
  if (!row.level_id || sortOrder == null) return null
  const levelType = asLevelType(row.level_type)
  return {
    levelId: row.level_id,
    catalogId: catalogLevelId(sortOrder),
    sortOrder,
    title: row.title?.trim() || '未命名关卡',
    goal: row.goal?.trim() || '',
    levelType: levelType ?? 'new',
    knowledgeTags: readTextArray(row.knowledge_tags),
    milestoneBadge: asText(row.milestone_badge),
    published: row.published === true || row.published === 't' || row.published === 'true',
    previewFrozen: row.preview_frozen === true || row.preview_frozen === 't' || row.preview_frozen === 'true',
    teachingIntent: asText(row.teaching_intent),
    parentBrief: asText(row.parent_brief),
    teacherGuide: asText(row.teacher_guide),
    keywords: readKeywords(row),
    estimatedMinutes: asMinutes(row.estimated_minutes ?? readBody(row.body)?.estimated_minutes),
    previewKind: asPreview(row.preview_kind ?? readBody(row.body)?.preview_kind),
    exercise: asExercise(row.exercise ?? readBody(row.body)?.level_type),
  }
}

function readBody(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readKeywords(row: CourseTreeSourceRow): string[] {
  if (row.keywords !== undefined && row.keywords !== null) return readTextArray(row.keywords)
  const body = readBody(row.body)
  return body ? readTextArray(body.keywords) : []
}

function asInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim())
  return null
}

function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text.length ? text : null
}

function asMinutes(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(number) ? number : null
}

function asLevelType(value: string | null): CourseLevelKind | null {
  return value === 'new' || value === 'practice' || value === 'project' || value === 'typing' ? value : null
}

function asPreview(value: unknown): CoursePreviewKind | null {
  return value === 'text' || value === 'turtle' ? value : null
}

function asExercise(value: unknown): CourseExerciseKind | null {
  return value === 'normal' || value === 'fill_blank' || value === 'debug' ? value : null
}

export function readTextArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
  }
  if (typeof value !== 'string') return []
  const trimmed = value.trim()
  if (!trimmed || trimmed === '{}') return []
  if (trimmed.startsWith('[')) {
    try {
      return readTextArray(JSON.parse(trimmed) as unknown)
    } catch {
      return []
    }
  }
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return []
  const body = trimmed.slice(1, -1)
  const tags: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index]
    if (char === '"') {
      if (quoted && body[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }
    if (char === ',' && !quoted) {
      const tag = current.trim()
      if (tag) tags.push(tag)
      current = ''
      continue
    }
    current += char
  }
  const last = current.trim()
  if (last) tags.push(last)
  return tags
}
