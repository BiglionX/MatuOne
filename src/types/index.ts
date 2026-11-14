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
  /** 匹配模式的标识（由 runner 生成：paren / cjk / indent / name，或诊断原文） */
  pattern: string
  /**
   * 对诊断原文做正则匹配。命中后优先用本条人话，
   * 例如 IndentationError、expected ':'、= vs ==。
   */
  match?: string
  /** 命中后展示的人话提示 */
  friendlyMessage: string
}

/** 关卡怎么练：全抄、挖空、或找茬。缺省按全抄。 */
export type LevelType = 'normal' | 'fill_blank' | 'debug'

/** 某一行里要学生自己填的片段 */
export interface LineBlank {
  /** 在该行字符串中的起始下标（含） */
  start: number
  /** 结束下标（不含） */
  end: number
  /** 填对后的文本，例如变量名或数字 */
  answer: string
}

/** 哪些行被挖空，以及空出的是哪几个词 */
export interface BlankLine {
  /** 0 起的行号，对应 teach_code_lines */
  line: number
  blanks: LineBlank[]
}

export interface LevelQuiz {
  question: string
  options: string[]
  answerIndex: number
  explain: string
}

/** 课后巩固。缺省表示这节没有副本，学生做完三回合就可以走。 */
export type BonusChallengeType = 'param_edit' | 'code_fill' | 'typing'

export interface BonusChallenge {
  type: BonusChallengeType
  /** 给学生看的那一句任务 */
  instruction: string
  /** param_edit：对应 challenge_params.name，用课内闲着的那个参数 */
  target_param_name?: string
  /** param_edit：要改成的值。code_fill：空里要填的词。 */
  target_value?: string
  /** code_fill：带空的那一行，空位写成 ____ */
  prompt_line?: string
  /**
   * 做完后告诉学生「这是什么」。
   * 不拿它和 print 的原文逐字比对。
   */
  expected_output: string
  /** 做完后记下的奖励，例如「皇冠」。不做不扣。 */
  bonus_reward: string
}

export interface Level {
  level_id: string
  order: number
  title: string
  goal: string
  demo_code: string
  expected_output: string
  preview_kind: 'text' | 'turtle'
  /** 缺省 normal：B 回合逐行全抄 */
  level_type?: LevelType
  teach_code_lines: string[]
  /** fill_blank 时，哪些行的变量名或数值留空 */
  blank_lines?: BlankLine[]
  /**
   * 折叠前的重复写法。第 6 关用它展示「8 行如何收成 for」，
   * B 回合不要求学生从零把循环敲出来。
   */
  unfolded_lines?: string[]
  /** 与 teach_code_lines 一一对应的“这一行在做什么”，给第一次见代码的孩子看 */
  line_notes?: string[]
  keywords: string[]
  /** 这一节要反复打的短组块。没有这个字段时，C 回合仍打关键词。 */
  drill_chunk?: string
  challenge_params: ChallengeParam[]
  error_mappings: ErrorMapping[]
  quiz: LevelQuiz
  /** 学完三回合之后的可选副本。没有这个字段，结束页不出现「巩固一下」。 */
  bonus_challenge?: BonusChallenge
  estimated_minutes: number
  is_review?: boolean
  /** 课文还在制作。地图和课时页用它提示「内容制作中」。 */
  is_placeholder?: boolean
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

/** 自定义海龟交回的一条线段。前端用 Canvas 2D 把它画出来。 */
export interface CanvasCommand {
  action: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  pensize: number
}

/**
 * 页面只看 ok / output，或失败时的行号和人话。
 * loading 为 true 时 Pyodide 还在下载，不是代码写错了。
 * 海龟关卡的 output.text 是同时 print 出来的字，没有就是空串。
 */
export type RunResult =
  | {
      ok: true
      output: { kind: 'text'; text: string } | { kind: 'canvas'; commands: CanvasCommand[]; text: string }
    }
  | {
      ok: false
      line: number
      message: string
      loading?: boolean
    }

/** 海龟此刻的位置。分步执行时画在画布上，转弯才看得见。 */
export interface RunCursor {
  x: number
  y: number
  heading: number
}

/** 分步执行的一帧：走到某一行之后，画面和打印停在这一步。 */
export interface RunStep {
  /** 源码行号，从 1 开始 */
  line: number
  /** 给孩子看的这一步说明 */
  note: string
  text: string
  commands: CanvasCommand[]
  cursor: RunCursor
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

/** 家长登录后只在浏览器留账号名。家长 id 由服务端按会话解析。 */
export interface ParentSession {
  account: string
}

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

export interface ParentCurriculumProgress {
  stageLabel: string
  unitLabel: string
  unitCompleted: number
  unitTotal: number
  badges: { id: string; title: string }[]
  /** 当前进度已经走过全部已写好的课，后面都是占位。 */
  beyondAuthored: boolean
}

/** 家长展开某一关时看到的通俗解读。不含教学话术。 */
export interface ParentLessonBrief {
  levelId: string
  order: number
  title: string
  parentBrief: string | null
}

export interface ParentChildView {
  student: Student
  groupName: string
  orgName: string
  currentLevelTitle: string
  currentLevelOrder: number
  totalLevels: number
  completedCount: number
  /** 家长看到的是当前 Level 里的单元进度，不是全课程总关数。 */
  curriculum: ParentCurriculumProgress
  weekly: WeeklySummary
  /** 本周碰到过的课时，供「本周学习」展开。 */
  weeklyLessons: ParentLessonBrief[]
  /** 已完成的课时，供「已学关卡」展开。 */
  learnedLessons: ParentLessonBrief[]
  typingSeries: { weekStart: string; label: string; wpm: number | null; accuracy: number | null }[]
}

/** 机构已停用且过了宽限。只有姓名和固定提示，没有学习记录。 */
export interface ParentStoppedChild {
  name: string
  message: '机构服务已停止'
}

export interface ParentHomeData {
  children: ParentChildView[]
  stopped: ParentStoppedChild[]
}

/* ---------------------------- 导入（机构批量建号） ---------------------------- */

export interface ImportRowResult {
  row: number
  name: string
  account: string
  ok: boolean
  reason?: string
  /** 导入成功时随当次响应返回，不入库。 */
  initialPassword?: string
}
