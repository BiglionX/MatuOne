export interface CurriculumPositionRow {
  source: string
  completed_count: number
  current_order: number
  stage_id: string
  stage_title: string
  stage_sort: number
  semester_id: string
  semester_title: string
  semester_term: string
  semester_sort: number
  unit_id: string
  unit_title: string
  unit_sort: number
  level_id: string
  level_title: string
  level_sort: number
  level_type: string
  knowledge_tags: string[] | null
  milestone_badge: string | null
}

export interface CurriculumPosition {
  source: 'progress' | 'mock'
  completedCount: number
  currentOrder: number
  stage: { id: string; title: string; sortOrder: number }
  semester: { id: string; title: string; term: 'fall' | 'spring'; sortOrder: number }
  unit: { id: string; title: string; sortOrder: number }
  level: {
    levelId: string
    title: string
    sortOrder: number
    levelType: 'new' | 'practice' | 'project' | 'typing'
    knowledgeTags: string[]
    milestoneBadge: string | null
  }
}

function levelKind(value: string): CurriculumPosition['level']['levelType'] {
  if (value === 'practice' || value === 'project' || value === 'typing') return value
  return 'new'
}

export function toCurriculumPosition(row: CurriculumPositionRow): CurriculumPosition {
  const term = row.semester_term === 'spring' ? 'spring' : 'fall'
  return {
    source: row.source === 'progress' ? 'progress' : 'mock',
    completedCount: Number(row.completed_count) || 0,
    currentOrder: Number(row.current_order) || 1,
    stage: { id: row.stage_id, title: row.stage_title, sortOrder: Number(row.stage_sort) || 0 },
    semester: { id: row.semester_id, title: row.semester_title, term, sortOrder: Number(row.semester_sort) || 0 },
    unit: { id: row.unit_id, title: row.unit_title, sortOrder: Number(row.unit_sort) || 0 },
    level: {
      levelId: row.level_id,
      title: row.level_title,
      sortOrder: Number(row.level_sort) || 0,
      levelType: levelKind(row.level_type),
      knowledgeTags: row.knowledge_tags ?? [],
      milestoneBadge: row.milestone_badge,
    },
  }
}
