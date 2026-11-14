/**
 * 机构有效状态与进关卡判定。Edge Function 与本地 api 共用。
 * 不把结果当主字段落库；展示用的 status 回写只在每日任务里做。
 */
export const GRACE_DAYS = 30
export const TRIAL_SEAT_CAP = 10
export const TRIAL_LEVEL_MAX = 3

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

/** 与课程目录一致：每个 Level 120 节。库里没有 stage_level 时用关卡序号推。 */
export const LESSONS_PER_STAGE = 120

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
 * 顺序固定：机构状态 → 试用关卡范围 → 开通记录 → 课程包阶段。
 * stageLevel 取 course_level.stage_level。大于 org_entitlement 的有效 max_level 时 course_locked。
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
  if (input.status === 'trial' && input.levelOrder > TRIAL_LEVEL_MAX) return { allowed: false, reason: 'trial_locked' }
  if (!input.entitled) return { allowed: false, reason: 'not_entitled' }
  if (input.stageLevel == null) return { allowed: false, reason: 'not_found' }
  if (input.stageLevel > input.maxLevel) return { allowed: false, reason: 'course_locked' }
  return { allowed: true, reason: 'ok' }
}
