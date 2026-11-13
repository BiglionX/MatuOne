/* ============================================================
   全站类型定义集中在此文件
   ============================================================ */

/** 角色 */
export type Role = 'student' | 'org' | 'parent' | 'admin'

/** 课程包导入状态 */
export type ImportSeverity = 'error' | 'warning'

export interface ImportIssue {
  levelId: string
  field: string
  message: string
  severity: ImportSeverity
}

export interface ImportReport {
  ok: boolean
  imported: number
  skipped: number
  issues: ImportIssue[]
}

/* ---------------------------- 课程 ---------------------------- */

/** 改动挑战参数如何作用到代码 */
export type ParamApply =
  | { kind: 'assign'; variable: string }
  | {
      kind: 'arg'
      func: string
      argIndex: number
      /** 改第几处调用，默认第 1 处；'all' 表示同名调用全部改（比如正方形四条边） */
      occurrence?: number | 'all'
    }
  | {
      /** 替换代码里出现过的某个字符、保留空格布局，比如三行星号一起换成星星 */
      kind: 'replaceChar'
      char: string
    }

export interface ChallengeParam {
  name: string
  label: string
  type: 'number' | 'select'
  min?: number
  max?: number
  step?: number
  default: number | string
  options?: { value: string; label: string }[]
  apply: ParamApply
  /** 喂给家长/机构端的一句话说明，可选 */
  hint?: string
}

export interface ErrorMapping {
  /** 匹配模式的标识（由 runner 生成：paren / cjk / indent / name） */
  pattern: string
  /** 命中后展示的人话提示 */
  friendlyMessage: string
}

export interface LevelQuiz {
  question: string
  options: string[]
  answerIndex: number
  explain: string
}

export interface Level {
  level_id: string
  order: number
  title: string
  goal: string
  grade_range: string
  demo_code: string
  expected_output: string
  preview_kind: 'text' | 'turtle'
  teach_code_lines: string[]
  /** 与 teach_code_lines 一一对应的“这一行在做什么”，给第一次见代码的孩子看 */
  line_notes?: string[]
  keywords: string[]
  challenge_params: ChallengeParam[]
  error_mappings: ErrorMapping[]
  quiz: LevelQuiz
  estimated_minutes: number
  is_review?: boolean
}

/* ---------------------------- 运行 ---------------------------- */

export interface Stroke {
  color: string
  points: [number, number][]
}

export interface TurtleArt {
  strokes: Stroke[]
  /** 原始坐标范围，供画布自适应 */
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

export interface RunError {
  line: number
  pattern: string
  message: string
}

export interface RunResult {
  ok: boolean
  kind: 'text' | 'turtle'
  /** print 输出（kind=text 或同时有文字） */
  text?: string
  art?: TurtleArt
  error?: RunError
  /** 实际执行的代码行数 */
  lineCount: number
  /** 抖动量，让"再跑一次"可感知 */
  runId: string
  elapsedMs: number
  source: 'mock'
}

/* ---------------------------- 学习记录 ---------------------------- */

export interface MapEntry {
  levelId: string
  order: number
  title: string
  goal: string
  isReview?: boolean
  completed: boolean
  stars: 0 | 1 | 2 | 3
  unlocked: boolean
  current: boolean
}

export interface LevelProgress {
  levelId: string
  /** 是否完成（运行成功 + 改动挑战完成） */
  completed: boolean
  stars: 0 | 1 | 2 | 3
  changeDone: boolean
  errorTaps: number
  runs: number
  updatedAt: string
}

export type PracticeType = 'baseline_keys' | 'keywords' | 'lesson_embedded'

export interface TypingRecord {
  id: string
  studentId: string
  date: string
  practiceType: PracticeType
  wpm: number
  accuracy: number
}

export interface TypingStats {
  wpm: number
  accuracy: number
  totalChars: number
  correctChars: number
  elapsedMs: number
}

/* ---------------------------- 机构 / 学生 ---------------------------- */

export interface Group {
  id: string
  name: string
}

export interface Student {
  id: string
  orgId: string
  groupId: string
  name: string
  account: string
  status: 'active' | 'disabled'
  currentLevelOrder: number
  lastActiveAt: string
  bindCode: string
  /** mock 用账号密码 */
  password: string
}

export interface Org {
  id: string
  name: string
  seatQuota: number
  expiresAt: string
  status: 'active' | 'expired'
}

export interface CourseActivation {
  id: string
  orgId: string
  groupId: string | 'all'
  activatedAt: string
  expiresAt: string
  seats: number
}

/* ---------------------------- 家长 ---------------------------- */

export interface ParentBinding {
  id: string
  parentId: string
  studentId: string
  boundAt: string
}

export interface WeeklySummary {
  weekStart: string
  sessions: number
  totalMinutes: number
  lastStudyDate: string | null
}

export interface ParentChildView {
  student: Student
  groupName: string
  orgName: string
  currentLevelTitle: string
  currentLevelOrder: number
  totalLevels: number
  completedCount: number
  weekly: WeeklySummary
  typingSeries: { weekStart: string; label: string; wpm: number | null; accuracy: number | null }[]
}

/* ---------------------------- 导入（机构批量建号） ---------------------------- */

export interface ImportRowResult {
  row: number
  name: string
  account: string
  ok: boolean
  reason?: string
}
