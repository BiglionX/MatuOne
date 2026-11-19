/**
 * 机构有效状态与进关卡判定。Edge Function 与本地 api 共用。
 * 不把结果当主字段落库；展示用的 status 回写只在每日任务里做。
 */
export const GRACE_DAYS = 30
export const TRIAL_SEAT_CAP = 10
/** 与课程目录一致：每个 Level 120 节。库里没有 stage_level 时用关卡序号推。 */
export const LESSONS_PER_STAGE = 120
/** 试用开放完整 Level 1。Level 2 起需要正式服务。 */
export const TRIAL_LEVEL_MAX = LESSONS_PER_STAGE

export type OrgStatus = 'trial' | 'active' | 'expired' | 'disabled'

export interface OrgClock {
  status: OrgStatus
  trialExpireAt: string | null
  serviceEndAt: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 与 public.effective_org_status 同一套规则。
 * 请求拦截以数据库函数为准；这里留给还没打到数据库的纯计算。
 * 手动停用优先。试用/正式到期先进入已到期，再过 30 天宽限变为停用。
 */
export function effectiveStatus(org: OrgClock, now = new Date()): OrgStatus {
  const t = now.getTime()
  const grace = GRACE_DAYS * DAY_MS
  if (org.status === 'disabled') return 'disabled'

  if (org.status === 'trial' && org.trialExpireAt) {
    const end = new Date(org.trialExpireAt).getTime()
    if (Number.isFinite(end) && t > end + grace) return 'disabled'
    if (Number.isFinite(end) && t > end) return 'expired'
  }

  if (org.status === 'active' && org.serviceEndAt) {
    const end = new Date(org.serviceEndAt).getTime()
    if (Number.isFinite(end) && t > end + grace) return 'disabled'
    if (Number.isFinite(end) && t > end) return 'expired'
  }

  if (org.status === 'expired') {
    const mark = org.serviceEndAt ?? org.trialExpireAt
    if (mark) {
      const end = new Date(mark).getTime()
      if (Number.isFinite(end) && t > end + grace) return 'disabled'
    }
  }

  return org.status
}

/** 试用期席位上限是 min(额度, 10)；正式机构用自己的额度。 */
export function seatLimit(org: { status: OrgStatus; seatQuota: number }, effective: OrgStatus): number {
  if (org.status === 'trial' || effective === 'trial') return Math.min(org.seatQuota, TRIAL_SEAT_CAP)
  return org.seatQuota
}

export type EnterLevelReason =
  | 'ok'
  | 'unauthenticated'
  | 'org_expired'
  | 'org_disabled'
  | 'trial_locked'
  | 'not_entitled'
  | 'course_locked'
  | 'not_found'

/** Level 1（第 1–120 节）对试用和正式机构免费，不看课程包和购买范围。 */
export function isFreeLevel1(order: number, stageLevel: number): boolean {
  return stageLevel === 1 && Number.isInteger(order) && order >= 1 && order <= LESSONS_PER_STAGE
}

/** 看板用：已停用、本周没学、当前关超过 3 天没有新进度。本周从北京时间周一开始。 */
export type OrgAttention = 'disabled' | 'inactive' | 'stuck'

/** 对不上课程阶段时不要当成第 0 阶段放行。阶段序号从 1 起。Level 1 免费，不要求课程包。 */
export function lessonIsAuthorized(status: OrgStatus, maxStage: number, sortOrder: number, stageSort: number): boolean {
  if (!Number.isInteger(sortOrder) || sortOrder < 1) return false
  if (!Number.isInteger(stageSort) || stageSort < 1) return false
  if ((status === 'trial' || status === 'active') && isFreeLevel1(sortOrder, stageSort)) return true
  if (!Number.isInteger(maxStage) || maxStage < 1) return false
  if (stageSort > maxStage) return false
  if (status === 'trial') return false
  return true
}

/** 本周周一 00:00（北京时间）的时间戳。 */
export function calendarWeekStart(now = Date.now()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(now))
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  const daysFromMonday = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[value('weekday')] ?? 0
  const midnight = Date.UTC(Number(value('year')), Number(value('month')) - 1, Number(value('day'))) - 8 * 60 * 60 * 1000
  return midnight - daysFromMonday * DAY_MS
}

export function orgAttention(input: {
  status: string
  lastActiveAt: string | null
  currentLevelUpdatedAt: string | null
  currentLevelCompleted: boolean
  now?: number
}): OrgAttention | null {
  if (input.status === 'disabled') return 'disabled'
  const now = input.now ?? Date.now()
  const last = input.lastActiveAt ? new Date(input.lastActiveAt).getTime() : NaN
  if (!Number.isFinite(last) || last < calendarWeekStart(now)) return 'inactive'
  if (!input.currentLevelCompleted && input.currentLevelUpdatedAt) {
    const touched = new Date(input.currentLevelUpdatedAt).getTime()
    if (Number.isFinite(touched) && now - touched >= 3 * DAY_MS) return 'stuck'
  }
  return null
}

export function stageLevelOfOrder(order: number): number | null {
  if (!Number.isInteger(order) || order < 1) return null
  return Math.floor((order - 1) / LESSONS_PER_STAGE) + 1
}

export function readStageLevel(value: unknown): number | null {
  const stage = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  if (!Number.isInteger(stage) || stage < 1) return null
  return stage
}

/**
 * 课程包还在有效期内时返回 max_level。
 * 没有授权，或 valid_until 已到，视为 0：任何阶段都会 course_locked。
 */
export function openMaxLevel(
  grant: { maxLevel: number; validUntil: string | null } | null,
  now = new Date(),
): number {
  if (!grant || !Number.isInteger(grant.maxLevel) || grant.maxLevel < 1) return 0
  if (grant.validUntil) {
    const end = new Date(grant.validUntil).getTime()
    if (!Number.isFinite(end) || now.getTime() >= end) return 0
  }
  return grant.maxLevel
}

export interface EnterLevelResult {
  allowed: boolean
  reason: EnterLevelReason
}

export function levelOrderOf(levelId: string): number | null {
  const matched = /^L(\d+)$/i.exec(levelId.trim())
  if (!matched) return null
  const order = Number(matched[1])
  if (!Number.isInteger(order) || order < 1) return null
  return order
}

export interface EntitlementSpan {
  orgId: string
  subjectType: 'org' | 'group' | 'student'
  subjectId: string
  levelOrderMin: number
  levelOrderMax: number
}

export function isLevelEntitled(
  rows: EntitlementSpan[],
  orgId: string,
  groupId: string,
  studentId: string,
  order: number,
): boolean {
  return rows.some(
    (row) =>
      row.orgId === orgId &&
      order >= row.levelOrderMin &&
      order <= row.levelOrderMax &&
      ((row.subjectType === 'org' && row.subjectId === orgId) ||
        (row.subjectType === 'group' && row.subjectId === groupId) ||
        (row.subjectType === 'student' && row.subjectId === studentId)),
  )
}

/**
 * 顺序固定：机构状态 → Level 1 免费 → 试用范围 → 开通记录 → 课程包阶段。
 * stageLevel 取 course_level.stage_level。Level 1 不看购买范围；更高阶段超过有效 max_level 时 course_locked。
 * 调用方不要在页面里重算。
 */
export function decideEnterLevel(input: {
  status: OrgStatus
  levelOrder: number | null
  entitled: boolean
  stageLevel: number | null
  maxLevel: number
}): EnterLevelResult {
  if (input.levelOrder == null) return { allowed: false, reason: 'not_found' }
  if (input.status === 'disabled') return { allowed: false, reason: 'org_disabled' }
  if (input.status !== 'trial' && input.status !== 'active') return { allowed: false, reason: 'org_expired' }
  if (input.stageLevel == null) return { allowed: false, reason: 'not_found' }
  const free = isFreeLevel1(input.levelOrder, input.stageLevel)
  if (input.status === 'trial' && !free) return { allowed: false, reason: 'trial_locked' }
  if (!free && !input.entitled) return { allowed: false, reason: 'not_entitled' }
  if (!free && input.stageLevel > input.maxLevel) return { allowed: false, reason: 'course_locked' }
  return { allowed: true, reason: 'ok' }
}
