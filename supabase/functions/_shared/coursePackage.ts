export interface ImportIssue {
  levelId: string
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ImportReport {
  ok: boolean
  imported: number
  skipped: number
  issues: ImportIssue[]
}

export interface PackageBlank {
  line: number
  blanks: { start: number; end: number; answer: string }[]
}

export interface PackageLevel {
  level_id: string
  order: number
  title: string
  goal: string
  demo_code: string
  expected_output: string
  preview_kind: 'text' | 'turtle'
  /** 回合形态，给学生端用。课型在 pedagogy。 */
  level_type: 'normal' | 'fill_blank' | 'debug'
  teach_code_lines: string[]
  blank_lines?: PackageBlank[]
  unfolded_lines?: string[]
  line_notes?: string[]
  keywords: string[]
  challenge_params: unknown[]
  error_mappings: unknown[]
  quiz: unknown
  estimated_minutes: number
  is_review?: boolean
  /** 课型。只有课程包写了 new / practice / project / typing 才带上。 */
  pedagogy?: PedagogyKind
  knowledge_tags?: string[]
  /** null 表示不颁发。字段缺省表示这次导入不改徽章。 */
  milestone_badge?: string | null
  unit_id?: string
}

export type PedagogyKind = 'new' | 'practice' | 'project' | 'typing'

const LEGACY_STAGE_ROW = ['G3-fall', 'G3-spring', 'G4-fall', 'G4-spring', 'G5-fall', 'G5-spring', 'G2-fall', 'G2-spring']

export interface CurriculumPlacement {
  stageLevel: number
  stage: { stage_id: string; title: string; sort_order: number }
  unit: { unit_id: string; title: string; sort_order: number }
  /** 单元表仍引用旧行，导入时按 stage_level 对上，页面不展示这串编号。 */
  legacySemesterId: string
}

function readBlankLines(value: unknown): PackageBlank[] | undefined {
  if (!Array.isArray(value)) return undefined
  const groups: PackageBlank[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as { line?: unknown; blanks?: unknown }
    if (typeof row.line !== 'number' || !Array.isArray(row.blanks)) continue
    const blanks = row.blanks.flatMap((blank) => {
      if (!blank || typeof blank !== 'object') return []
      const span = blank as { start?: unknown; end?: unknown; answer?: unknown }
      if (typeof span.start !== 'number' || typeof span.end !== 'number' || typeof span.answer !== 'string') return []
      return [{ start: span.start, end: span.end, answer: span.answer }]
    })
    if (blanks.length) groups.push({ line: row.line, blanks })
  }
  return groups
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function readId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const id = value.trim()
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,40}$/.test(id) ? id : null
}

function readPedagogy(value: unknown): PedagogyKind | null {
  return value === 'new' || value === 'practice' || value === 'project' || value === 'typing' ? value : null
}

function readExercise(explicit: unknown, legacy: unknown): 'normal' | 'fill_blank' | 'debug' {
  if (explicit === 'fill_blank' || explicit === 'debug' || explicit === 'normal') return explicit
  if (legacy === 'fill_blank' || legacy === 'debug') return legacy
  return 'normal'
}

function readTags(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((tag) => typeof tag !== 'string' || !tag.trim())) return null
  return value.map((tag) => tag.trim())
}

function readPlacement(parsed: unknown, issues: ImportIssue[]): CurriculumPlacement | null {
  if (!isRecord(parsed) || (!('stage_level' in parsed) && !('stage' in parsed) && !('unit' in parsed))) return null
  const stage = isRecord(parsed.stage) ? parsed.stage : null
  const unit = isRecord(parsed.unit) ? parsed.unit : null
  const push = (field: string, message: string) => issues.push({ levelId: '-', field, message, severity: 'error' })
  const stageLevel = typeof parsed.stage_level === 'number' ? parsed.stage_level : stage && typeof stage.sort_order === 'number' ? stage.sort_order : null
  if (stageLevel == null || !Number.isInteger(stageLevel) || stageLevel < 1 || stageLevel > 8) push('stage_level', 'stage_level 取 1 到 8')
  if (!unit) push('unit', '课程包需要 unit')
  const unitId = unit ? readId(unit.unit_id) : null
  if (unit && !unitId) push('unit.unit_id', 'unit_id 用字母、数字、短横线或下划线')
  if (unit && (typeof unit.title !== 'string' || !unit.title.trim())) push('unit.title', '缺少单元名称')
  if (unit && (typeof unit.sort_order !== 'number' || unit.sort_order < 1)) push('unit.sort_order', '单元 sort_order 从 1 开始')
  if (stageLevel == null || stageLevel < 1 || stageLevel > 8 || !unit || !unitId) return null
  if (typeof unit.title !== 'string' || typeof unit.sort_order !== 'number') return null
  const legacySemesterId = LEGACY_STAGE_ROW[stageLevel - 1]
  if (!legacySemesterId) return null
  const title = stage && typeof stage.title === 'string' && stage.title.trim() ? stage.title.trim() : `Level ${stageLevel}`
  return {
    stageLevel,
    stage: { stage_id: `L${stageLevel}`, title, sort_order: stageLevel },
    unit: { unit_id: unitId, title: unit.title.trim(), sort_order: unit.sort_order },
    legacySemesterId,
  }
}

function asArray(pkg: unknown): Record<string, unknown>[] {
  if (Array.isArray(pkg)) return pkg.filter((item) => item && typeof item === 'object') as Record<string, unknown>[]
  if (pkg && typeof pkg === 'object' && Array.isArray((pkg as { levels?: unknown }).levels)) {
    return ((pkg as { levels: unknown[] }).levels).filter((item) => item && typeof item === 'object') as Record<string, unknown>[]
  }
  return []
}

export function validateCoursePackage(text: string): { report: ImportReport; levels: PackageLevel[]; placement: CurriculumPlacement | null } {
  const issues: ImportIssue[] = []
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return {
      report: {
        ok: false,
        imported: 0,
        skipped: 0,
        issues: [{ levelId: '-', field: '文件', message: '不是合法的 JSON，检查一下逗号和引号。', severity: 'error' }],
      },
      levels: [],
      placement: null,
    }
  }

  const placement = readPlacement(parsed, issues)
  const rawLevels = asArray(parsed)
  if (!rawLevels.length) {
    return {
      report: {
        ok: false,
        imported: 0,
        skipped: 0,
        issues: [{ levelId: '-', field: '根节点', message: '需要是一个数组，或包含 levels 数组的对象。', severity: 'error' }],
      },
      levels: [],
      placement: null,
    }
  }

  const seenIds = new Set<string>()
  const seenOrders = new Set<number>()
  const valid: PackageLevel[] = []

  rawLevels.forEach((raw, index) => {
    const label = typeof raw.level_id === 'string' ? raw.level_id : `第 ${index + 1} 条`
    const before = issues.length
    const push = (field: string, message: string) => issues.push({ levelId: label, field, message, severity: 'error' })

    if (typeof raw.level_id !== 'string' || !raw.level_id) push('level_id', '缺少 level_id（字符串）')
    else if (seenIds.has(raw.level_id)) push('level_id', 'level_id 重复')
    if (typeof raw.order !== 'number' || Number.isNaN(raw.order)) push('order', '缺少 order（数字）')
    else if (seenOrders.has(raw.order)) push('order', 'order 与其他关卡重复')
    if (!raw.title || typeof raw.title !== 'string') push('title', '缺少 title')
    if (!raw.goal || typeof raw.goal !== 'string') push('goal', '缺少 goal')
    if (!raw.demo_code || typeof raw.demo_code !== 'string') push('demo_code', '缺少 demo_code')
    if (!Array.isArray(raw.teach_code_lines) || raw.teach_code_lines.length === 0) {
      push('teach_code_lines', 'teach_code_lines 需要是非空数组')
    }
    if (!Array.isArray(raw.keywords) || raw.keywords.length < 3 || raw.keywords.length > 5) {
      push('keywords', 'keywords 需要 3—5 个关键词')
    }
    if (raw.challenge_params !== undefined && !Array.isArray(raw.challenge_params)) {
      push('challenge_params', 'challenge_params 需要是数组')
    }
    if (raw.error_mappings !== undefined && !Array.isArray(raw.error_mappings)) {
      push('error_mappings', 'error_mappings 需要是数组')
    }
    if (typeof raw.estimated_minutes !== 'number') push('estimated_minutes', '缺少 estimated_minutes（数字）')
    const pedagogy = readPedagogy(raw.level_type)
    const levelType = readExercise(raw.exercise, raw.level_type)
    const tags = raw.knowledge_tags === undefined ? undefined : readTags(raw.knowledge_tags)
    if (raw.knowledge_tags !== undefined && !tags) push('knowledge_tags', 'knowledge_tags 需要是非空字符串数组，没有标签就写 []')
    if (placement && raw.knowledge_tags === undefined) push('knowledge_tags', '层级课程包里每节课都要写 knowledge_tags，没有标签就写 []')
    if (placement && !pedagogy) push('level_type', '层级课程包里 level_type 只能是 new、practice、project、typing')
    if (placement && raw.milestone_badge !== null && typeof raw.milestone_badge !== 'string') {
      push('milestone_badge', 'milestone_badge 不颁发就写 null，颁发就写徽章标识')
    }
    if (typeof raw.milestone_badge === 'string' && !raw.milestone_badge.trim()) push('milestone_badge', '徽章标识不能是空字符串')
    const blankLines = readBlankLines(raw.blank_lines)
    if (levelType === 'fill_blank' && (!blankLines || blankLines.length === 0)) {
      push('blank_lines', 'fill_blank 关卡需要 blank_lines，写明哪几行要填空')
    }

    if (Array.isArray(raw.teach_code_lines) && raw.teach_code_lines.length > 15) {
      issues.push({
        levelId: label,
        field: 'teach_code_lines',
        message: '代码行数超过 15 行，超出 1.0 的行数上限，建议拆节。',
        severity: 'warning',
      })
    }

    const hasError = issues.slice(before).some((issue) => issue.severity === 'error')
    if (!hasError && typeof raw.level_id === 'string' && typeof raw.order === 'number') {
      seenIds.add(raw.level_id)
      seenOrders.add(raw.order)
      const quiz = raw.quiz && typeof raw.quiz === 'object'
        ? raw.quiz
        : {
            question: '这一关会画出什么？',
            options: ['一个图形', '一行文字', '什么都没有'],
            answerIndex: 0,
            explain: '运行一次就能看到结果。',
          }
      valid.push({
        level_id: raw.level_id,
        order: raw.order,
        title: String(raw.title),
        goal: String(raw.goal),
        demo_code: String(raw.demo_code),
        expected_output: typeof raw.expected_output === 'string' ? raw.expected_output : '',
        preview_kind: raw.preview_kind === 'text' ? 'text' : 'turtle',
        level_type: levelType,
        teach_code_lines: raw.teach_code_lines as string[],
        blank_lines: blankLines,
        unfolded_lines: Array.isArray(raw.unfolded_lines)
          ? (raw.unfolded_lines as unknown[]).filter((line): line is string => typeof line === 'string')
          : undefined,
        line_notes: Array.isArray(raw.line_notes) ? (raw.line_notes as string[]) : undefined,
        keywords: raw.keywords as string[],
        challenge_params: (raw.challenge_params as unknown[]) ?? [],
        error_mappings: (raw.error_mappings as unknown[]) ?? [],
        quiz,
        estimated_minutes: raw.estimated_minutes as number,
        is_review: Boolean(raw.is_review),
        pedagogy: pedagogy ?? undefined,
        knowledge_tags: tags ?? undefined,
        milestone_badge: raw.milestone_badge === null ? null : typeof raw.milestone_badge === 'string' ? raw.milestone_badge.trim() : undefined,
        unit_id: placement?.unit.unit_id,
      })
    }
  })

  return {
    report: {
      ok: !issues.some((issue) => issue.severity === 'error'),
      imported: valid.length,
      skipped: rawLevels.length - valid.length,
      issues,
    },
    levels: valid,
    placement,
  }
}
