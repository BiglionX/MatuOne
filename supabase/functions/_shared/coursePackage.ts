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

export interface PackageLevel {
  level_id: string
  order: number
  title: string
  goal: string
  grade_range: string
  demo_code: string
  expected_output: string
  preview_kind: 'text' | 'turtle'
  teach_code_lines: string[]
  line_notes?: string[]
  keywords: string[]
  challenge_params: unknown[]
  error_mappings: unknown[]
  quiz: unknown
  estimated_minutes: number
  is_review?: boolean
}

function asArray(pkg: unknown): Record<string, unknown>[] {
  if (Array.isArray(pkg)) return pkg.filter((item) => item && typeof item === 'object') as Record<string, unknown>[]
  if (pkg && typeof pkg === 'object' && Array.isArray((pkg as { levels?: unknown }).levels)) {
    return ((pkg as { levels: unknown[] }).levels).filter((item) => item && typeof item === 'object') as Record<string, unknown>[]
  }
  return []
}

export function validateCoursePackage(text: string): { report: ImportReport; levels: PackageLevel[] } {
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
    }
  }

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

    if (Array.isArray(raw.teach_code_lines) && raw.teach_code_lines.length > 15) {
      issues.push({
        levelId: label,
        field: 'teach_code_lines',
        message: '代码行数超过 15 行，超出 1.0 年级上限，建议拆节。',
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
        grade_range: typeof raw.grade_range === 'string' ? raw.grade_range : '2-5',
        demo_code: String(raw.demo_code),
        expected_output: typeof raw.expected_output === 'string' ? raw.expected_output : '',
        preview_kind: raw.preview_kind === 'text' ? 'text' : 'turtle',
        teach_code_lines: raw.teach_code_lines as string[],
        line_notes: Array.isArray(raw.line_notes) ? (raw.line_notes as string[]) : undefined,
        keywords: raw.keywords as string[],
        challenge_params: (raw.challenge_params as unknown[]) ?? [],
        error_mappings: (raw.error_mappings as unknown[]) ?? [],
        quiz,
        estimated_minutes: raw.estimated_minutes as number,
        is_review: Boolean(raw.is_review),
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
  }
}
