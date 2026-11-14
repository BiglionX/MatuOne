import type {
  BlankLine,
  CourseActivation,
  ImportIssue,
  ImportReport,
  ImportRowResult,
  Level,
  LevelProgress,
  LevelType,
  ParentChildView,
  PracticeType,
  Student,
  TypingRecord,
} from '@/types'
import type { StudentStanding } from '@/types/curriculum'
import { LEVELS, getLevelById } from '@/mock/levels'
import { LINE_NOTES } from '@/mock/lineNotes'
import { ACTIVATION_SEED, GROUPS, ORG, PARENT_SEED, STUDENTS, TYPING_SEED, WEEKLY_SEED } from '@/mock/org'
import { readOrgStudentById, readStudentSession } from './orgStore'
import { presentParentProgress } from './parentProgress'
import { resolveStudentStanding } from './standing'
import { readJSON, writeJSON } from './storage'

export type { StudentStanding } from '@/types/curriculum'

/**
 * 页面使用的数据访问层。页面只从这里取数据，不直接 import src/mock/*，
 * 后续接 BaaS 时替换本文件的实现即可。
 */

export const getLevels = (): Level[] => LEVELS
export const levelById = (id: string) => getLevelById(id)

/** 每关逐行的“这一行在做什么”；课程包自带说明时优先用课程包里的 */
export const getLineNotes = (level: Level): string[] =>
  level.line_notes && level.line_notes.length >= level.teach_code_lines.length
    ? level.line_notes
    : LINE_NOTES[level.level_id] ?? []
export const getOrg = () => ORG
export const getGroups = () => GROUPS
export const getParentAccount = () => PARENT_SEED

/* ----------------------------- 学生登录 ----------------------------- */

const SESSION_KEY = 'session.student'

export function loginStudent(account: string, password: string): Student | null {
  const student = listStudents().find(
    (s) => s.account === account.trim() && s.password === password && s.status === 'active',
  )
  if (student) writeJSON(SESSION_KEY, student.id)
  return student ?? null
}

export function getCurrentStudent(): Student {
  const session = readStudentSession()
  if (session?.source === 'org') {
    const row = readOrgStudentById(session.studentId)
    if (row) {
      return {
        id: row.id,
        orgId: row.orgId,
        groupId: row.groupId,
        name: row.name,
        account: row.account,
        status: row.status,
        currentLevelOrder: row.currentLevelOrder,
        lastActiveAt: row.lastActiveAt,
        bindCode: row.bindCode,
        password: '',
      }
    }
  }
  const id = session?.studentId || readJSON<string>(SESSION_KEY, 'S001')
  return listStudents().find((s) => s.id === id) ?? STUDENTS[0]
}

export function logoutStudent(): void {
  writeJSON(SESSION_KEY, 'S001')
}

/* ----------------------------- 学习进度 ----------------------------- */

type ProgressMap = Record<string, LevelProgress>

const progressKey = (studentId: string) => `progress.${studentId}`

export function getProgressMap(studentId: string): ProgressMap {
  return readJSON<ProgressMap>(progressKey(studentId), {})
}

export function getLevelProgress(studentId: string, levelId: string): LevelProgress {
  const map = getProgressMap(studentId)
  return (
    map[levelId] ?? {
      levelId,
      completed: false,
      stars: 0,
      changeDone: false,
      errorTaps: 0,
      runs: 0,
      updatedAt: '',
    }
  )
}

export function patchLevelProgress(
  studentId: string,
  levelId: string,
  patch: Partial<LevelProgress>,
): LevelProgress {
  const map = getProgressMap(studentId)
  const current = map[levelId] ?? {
    levelId,
    completed: false,
    stars: 0,
    changeDone: false,
    errorTaps: 0,
    runs: 0,
    updatedAt: new Date().toISOString(),
  }
  const next: LevelProgress = { ...current, ...patch, updatedAt: new Date().toISOString() }
  map[levelId] = next
  writeJSON(progressKey(studentId), map)
  return next
}

export function completeLevel(studentId: string, levelId: string, stars: 0 | 1 | 2 | 3): void {
  patchLevelProgress(studentId, levelId, { completed: true, stars, changeDone: true })
}

export interface MapEntry {
  level: Level
  completed: boolean
  stars: number
  unlocked: boolean
  current: boolean
}

/** 课程地图：默认逐节解锁 */
export function getCourseMap(studentId: string): { entries: MapEntry[]; completedCount: number; currentOrder: number } {
  const map = getProgressMap(studentId)
  const completedCount = LEVELS.filter((l) => map[l.level_id]?.completed).length
  const firstUnfinished = LEVELS.find((l) => !map[l.level_id]?.completed)
  const currentOrder = firstUnfinished?.order ?? LEVELS.length
  const entries = LEVELS.map((level) => ({
    level,
    completed: !!map[level.level_id]?.completed,
    stars: map[level.level_id]?.stars ?? 0,
    unlocked: level.order <= currentOrder,
    current: level.order === currentOrder,
  }))
  return { entries, completedCount, currentOrder }
}

/* ----------------------------- 机构 / 家长共用的进度口径 ----------------------------- */

/**
 * 机构端、家长端的位置要和学生端地图一致。
 * 学习记录只按 studentId 取，不看 orgId：换机构或在家登录，同一学生的地图照原样回来。
 * 只要本机有该生的学习记录，就以记录为准；完全没有记录时才回落到 currentLevelOrder。
 * 返回的是 Level、单元和当前课时，currentOrder 只是这条链上的线性序号。
 */
export function getStudentStanding(studentId: string, student?: Student): StudentStanding {
  const s = student ?? listStudents().find((x) => x.id === studentId) ?? STUDENTS[0]
  const map = getProgressMap(studentId)
  return resolveStudentStanding({
    records: Object.values(map).map((row) => ({ levelId: row.levelId, completed: row.completed })),
    fallbackOrder: s.currentLevelOrder,
  })
}

/* ----------------------------- 打字 ----------------------------- */

const typingKey = (studentId: string) => `typing.${studentId}`

export function getTypingRecords(studentId: string): TypingRecord[] {
  const seed = TYPING_SEED.filter((r) => r.studentId === studentId)
  const local = readJSON<TypingRecord[]>(typingKey(studentId), [])
  return [...seed, ...local].sort((a, b) => a.date.localeCompare(b.date))
}

export function addTypingRecord(input: {
  studentId: string
  practiceType: PracticeType
  wpm: number
  accuracy: number
}): TypingRecord {
  const record: TypingRecord = {
    id: `T-${Math.random().toString(36).slice(2, 8)}`,
    studentId: input.studentId,
    date: new Date().toISOString(),
    practiceType: input.practiceType,
    wpm: Math.round(input.wpm * 10) / 10,
    accuracy: Math.round(input.accuracy * 10) / 10,
  }
  const local = readJSON<TypingRecord[]>(typingKey(input.studentId), [])
  writeJSON(typingKey(input.studentId), [...local, record])
  return record
}

export interface WeeklyTypingPoint {
  weekStart: string
  label: string
  wpm: number | null
  accuracy: number | null
}

/** 最近四周的 WPM / 准确率（无数据的周为 null） */
export function getTypingSeries(studentId: string, weeks = 4): WeeklyTypingPoint[] {
  const records = getTypingRecords(studentId)
  const now = new Date()
  const monday = new Date(now)
  const day = (now.getDay() + 6) % 7
  monday.setDate(now.getDate() - day)
  monday.setHours(0, 0, 0, 0)

  const points: WeeklyTypingPoint[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(monday)
    start.setDate(monday.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    const inWeek = records.filter((r) => {
      const d = new Date(r.date)
      return d >= start && d < end
    })
    const label = i === 0 ? '本周' : `${start.getMonth() + 1}/${start.getDate()} 周`
    points.push({
      weekStart: start.toISOString().slice(0, 10),
      label,
      wpm: inWeek.length
        ? Math.round((inWeek.reduce((sum, r) => sum + r.wpm, 0) / inWeek.length) * 10) / 10
        : null,
      accuracy: inWeek.length
        ? Math.round((inWeek.reduce((sum, r) => sum + r.accuracy, 0) / inWeek.length) * 10) / 10
        : null,
    })
  }
  return points
}

export function getLatestTyping(studentId: string): { wpm: number; accuracy: number } | null {
  const records = getTypingRecords(studentId)
  if (!records.length) return null
  const last = records[records.length - 1]
  return { wpm: last.wpm, accuracy: last.accuracy }
}

/* ----------------------------- 机构端 ----------------------------- */

const IMPORTED_KEY = 'students.imported'

export function listStudents(): Student[] {
  const imported = readJSON<Student[]>(IMPORTED_KEY, [])
  return [...STUDENTS, ...imported]
}

export function listGroups() {
  return GROUPS
}

export function groupName(groupId: string): string {
  return GROUPS.find((g) => g.id === groupId)?.name ?? '未分组'
}

const CSV_TEMPLATE = '姓名,账号,分组\n张小明,zhangxiaoming,萌芽班\n李小红,lixiaohong,探索班\n'

export function getImportTemplate(): string {
  return CSV_TEMPLATE
}

/** 解析并校验批量导入的 CSV（姓名/账号/分组） */
export function importStudentsCSV(text: string): { rows: ImportRowResult[]; added: number } {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const results: ImportRowResult[] = []
  const existing = listStudents()
  const accounts = new Set(existing.map((s) => s.account.toLowerCase()))
  const names = new Set(existing.map((s) => s.name))
  const imported = readJSON<Student[]>(IMPORTED_KEY, [])
  let added = 0

  lines.forEach((line, idx) => {
    if (idx === 0 && /姓名/.test(line)) return
    const cells = line.split(',').map((c) => c.trim())
    const [name = '', account = '', groupText = ''] = cells
    const group = GROUPS.find((g) => g.name === groupText)

    let reason: string | undefined
    if (!name) reason = '姓名缺失'
    else if (!account) reason = '账号缺失'
    else if (accounts.has(account.toLowerCase())) reason = '账号重复'
    else if (names.has(name)) reason = '姓名重复'
    else if (!group) reason = '分组不存在（需与已有分组名一致）'

    if (reason) {
      results.push({ row: idx + 1, name, account, ok: false, reason })
      return
    }

    accounts.add(account.toLowerCase())
    names.add(name)
    imported.push({
      id: `S${String(900 + imported.length + 1)}`,
      orgId: ORG.id,
      groupId: group!.id,
      name,
      account,
      status: 'active',
      currentLevelOrder: 1,
      lastActiveAt: '',
      bindCode: String(204823 + imported.length),
      password: '123456',
    })
    added++
    results.push({ row: idx + 1, name, account, ok: true })
  })

  writeJSON(IMPORTED_KEY, imported)
  return { rows: results, added }
}

const ACTIVATION_KEY = 'activation'

export function getActivation(): CourseActivation {
  return readJSON<CourseActivation>(ACTIVATION_KEY, ACTIVATION_SEED[0])
}

export function activateCourse(input: {
  seats: number
  expiresAt: string
  groupId?: string
}): CourseActivation {
  const prev = getActivation()
  const activation: CourseActivation = {
    ...prev,
    seats: input.seats,
    expiresAt: input.expiresAt,
    groupId: input.groupId ?? prev.groupId,
    activatedAt: new Date().toISOString(),
  }
  writeJSON(ACTIVATION_KEY, activation)
  return activation
}

export interface OrgDashboard {
  reading: number
  weeklyActive: number
  avgCompleted: number
  groupRows: { groupId: string; name: string; rate: number; students: number }[]
  studentRows: {
    student: Student
    groupName: string
    completedCount: number
    currentOrder: number
    typing: { wpm: number; accuracy: number } | null
    lastActiveAt: string
  }[]
}

export function getOrgDashboard(): OrgDashboard {
  const students = listStudents()
  const now = Date.now()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  const weeklyActive = students.filter(
    (s) => s.status === 'active' && s.lastActiveAt && now - new Date(s.lastActiveAt).getTime() <= sevenDays,
  ).length
  const standings = new Map(students.map((s) => [s.id, getStudentStanding(s.id, s)]))
  const avgCompleted =
    students.reduce((sum, s) => sum + standings.get(s.id)!.completedCount, 0) / Math.max(1, students.length)

  const groupRows = GROUPS.map((group) => {
    const inGroup = students.filter((s) => s.groupId === group.id)
    const totalLevels = LEVELS.length * Math.max(1, inGroup.length)
    const done = inGroup.reduce((sum, s) => sum + standings.get(s.id)!.completedCount, 0)
    return {
      groupId: group.id,
      name: group.name,
      rate: totalLevels ? Math.round((done / totalLevels) * 100) : 0,
      students: inGroup.length,
    }
  })

  const studentRows = students.map((student) => {
    const standing = standings.get(student.id)!
    return {
      student,
      groupName: groupName(student.groupId),
      completedCount: standing.completedCount,
      currentOrder: standing.currentOrder,
      typing: getLatestTyping(student.id),
      lastActiveAt: student.lastActiveAt,
    }
  })

  return {
    reading: students.filter((s) => s.status === 'active').length,
    weeklyActive,
    avgCompleted: Math.round(avgCompleted * 10) / 10,
    groupRows,
    studentRows,
  }
}

/* ----------------------------- 家长端 ----------------------------- */

export interface Binding {
  id: string
  parentId: string
  studentId: string
  boundAt: string
}

const BINDING_KEY = 'parent.bindings'

export function getBindings(parentId = PARENT_SEED.id): Binding[] {
  return readJSON<Binding[]>(BINDING_KEY, [
    { id: 'B1', parentId, studentId: 'S001', boundAt: '2026-09-18T10:00:00.000Z' },
    { id: 'B2', parentId, studentId: 'S002', boundAt: '2026-10-02T10:00:00.000Z' },
  ])
}

export function findStudentByBindCode(code: string): Student | undefined {
  return listStudents().find((s) => s.bindCode === code.trim())
}

export function bindChildByCode(code: string, parentId = PARENT_SEED.id): { ok: boolean; student?: Student; message: string } {
  const student = findStudentByBindCode(code)
  if (!student) return { ok: false, message: '没有找到这个绑定码，和机构老师核对一下。' }
  const bindings = getBindings(parentId)
  if (bindings.some((b) => b.studentId === student.id)) {
    return { ok: false, message: `已经绑定过${student.name}了。` }
  }
  writeJSON(BINDING_KEY, [
    ...bindings,
    { id: `B-${Math.random().toString(36).slice(2, 7)}`, parentId, studentId: student.id, boundAt: new Date().toISOString() },
  ])
  return { ok: true, student, message: `绑定成功：${student.name}` }
}

export function getBoundChildren(parentId = PARENT_SEED.id): Student[] {
  const bindings = getBindings(parentId)
  const students = listStudents()
  return bindings
    .map((b) => students.find((s) => s.id === b.studentId))
    .filter((s): s is Student => !!s)
}

export function getChildView(studentId: string): ParentChildView {
  const student = listStudents().find((s) => s.id === studentId) ?? STUDENTS[0]
  const standing = getStudentStanding(student.id, student)
  const completedCount = standing.completedCount
  const currentOrder = standing.currentOrder
  const weekly = WEEKLY_SEED[student.id] ?? {
    sessions: 0,
    totalMinutes: 0,
    lastStudyDate: null,
  }
  return {
    student,
    groupName: groupName(student.groupId),
    orgName: ORG.name,
    currentLevelTitle: LEVELS[currentOrder - 1]?.title ?? '已全部完成',
    currentLevelOrder: currentOrder,
    totalLevels: LEVELS.length,
    completedCount,
    curriculum: presentParentProgress(currentOrder),
    weekly: {
      weekStart: new Date().toISOString().slice(0, 10),
      sessions: weekly.sessions,
      totalMinutes: weekly.totalMinutes,
      lastStudyDate: weekly.lastStudyDate,
    },
    weeklyLessons: [],
    learnedLessons: [],
    typingSeries: getTypingSeries(student.id).map((p) => ({
      weekStart: p.weekStart,
      label: p.label,
      wpm: p.wpm,
      accuracy: p.accuracy,
    })),
  }
}

/* ----------------------------- 平台后台：课程包导入 ----------------------------- */

const LEVEL_IMPORT_KEY = 'levels.imported'

interface PackageLevel extends Partial<Level> {}

function asArray(pkg: unknown): PackageLevel[] {
  if (Array.isArray(pkg)) return pkg as PackageLevel[]
  if (pkg && typeof pkg === 'object' && Array.isArray((pkg as { levels?: unknown }).levels)) {
    return (pkg as { levels: PackageLevel[] }).levels
  }
  return []
}

function readBlankLines(value: unknown): BlankLine[] {
  if (!Array.isArray(value)) return []
  const groups: BlankLine[] = []
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

/** 校验课程 JSON 包，返回逐字段问题清单 */
export function validateCoursePackage(text: string): { report: ImportReport; levels: Level[] } {
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
        issues: [
          { levelId: '-', field: '根节点', message: '需要是一个数组，或包含 levels 数组的对象。', severity: 'error' },
        ],
      },
      levels: [],
    }
  }

  const seenIds = new Set<string>()
  const seenOrders = new Set<number>()
  const valid: Level[] = []

  rawLevels.forEach((raw, index) => {
    const label = String(raw.level_id ?? `第 ${index + 1} 条`)
    const push = (field: string, message: string) =>
      issues.push({ levelId: label, field, message, severity: 'error' })

    if (!raw.level_id || typeof raw.level_id !== 'string') push('level_id', '缺少 level_id（字符串）')
    else if (seenIds.has(raw.level_id)) push('level_id', 'level_id 重复')
    if (typeof raw.order !== 'number' || Number.isNaN(raw.order)) push('order', '缺少 order（数字）')
    else if (seenOrders.has(raw.order)) push('order', 'order 与其他关卡重复')
    if (!raw.title) push('title', '缺少 title')
    if (!raw.goal) push('goal', '缺少 goal')
    if (!raw.demo_code) push('demo_code', '缺少 demo_code')
    if (!Array.isArray(raw.teach_code_lines) || raw.teach_code_lines.length === 0)
      push('teach_code_lines', 'teach_code_lines 需要是非空数组')
    if (!Array.isArray(raw.keywords) || raw.keywords.length < 3 || raw.keywords.length > 5)
      push('keywords', 'keywords 需要 3—5 个关键词')
    if (raw.challenge_params !== undefined && !Array.isArray(raw.challenge_params))
      push('challenge_params', 'challenge_params 需要是数组')
    if (raw.error_mappings !== undefined && !Array.isArray(raw.error_mappings))
      push('error_mappings', 'error_mappings 需要是数组')
    if (typeof raw.estimated_minutes !== 'number') push('estimated_minutes', '缺少 estimated_minutes（数字）')
    const levelType: LevelType =
      raw.level_type === 'fill_blank' || raw.level_type === 'debug' ? raw.level_type : 'normal'
    const blankLines = readBlankLines(raw.blank_lines)
    if (levelType === 'fill_blank' && blankLines.length === 0) {
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

    const hasError = issues.some((i) => i.levelId === label && i.severity === 'error')
    if (!hasError) {
      if (raw.level_id) seenIds.add(raw.level_id)
      if (typeof raw.order === 'number') seenOrders.add(raw.order)
      valid.push({
        level_id: raw.level_id!,
        order: raw.order!,
        title: raw.title!,
        goal: raw.goal!,
        demo_code: raw.demo_code!,
        expected_output: raw.expected_output ?? '',
        preview_kind: raw.preview_kind === 'text' ? 'text' : 'turtle',
        level_type: levelType,
        teach_code_lines: raw.teach_code_lines!,
        blank_lines: blankLines.length ? blankLines : undefined,
        unfolded_lines: Array.isArray(raw.unfolded_lines)
          ? raw.unfolded_lines.filter((line): line is string => typeof line === 'string')
          : undefined,
        line_notes: Array.isArray(raw.line_notes) ? (raw.line_notes as string[]) : undefined,
        keywords: raw.keywords!,
        challenge_params: (raw.challenge_params as Level['challenge_params']) ?? [],
        error_mappings: (raw.error_mappings as Level['error_mappings']) ?? [],
        quiz:
          raw.quiz ?? {
            question: '这一关会画出什么？',
            options: ['一个图形', '一行文字', '什么都没有'],
            answerIndex: 0,
            explain: '运行一次就能看到结果。',
          },
        estimated_minutes: raw.estimated_minutes!,
        is_review: Boolean(raw.is_review),
      })
    }
  })

  const report: ImportReport = {
    ok: !issues.some((i) => i.severity === 'error'),
    imported: valid.length,
    skipped: rawLevels.length - valid.length,
    issues,
  }
  return { report, levels: valid }
}

export function importCoursePackage(text: string): ImportReport {
  const { report, levels } = validateCoursePackage(text)
  if (report.ok) {
    const existing = readJSON<Level[]>(LEVEL_IMPORT_KEY, [])
    writeJSON(LEVEL_IMPORT_KEY, [...existing.filter((e) => !levels.some((l) => l.level_id === e.level_id)), ...levels])
  }
  return report
}

export function getImportedLevels(): Level[] {
  return readJSON<Level[]>(LEVEL_IMPORT_KEY, [])
}
