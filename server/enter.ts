import { one, q } from './db'
import {
  decideEnterLevel,
  isLevelEntitled,
  openMaxLevel,
  readStageLevel,
  stageLevelOfOrder,
  type EnterLevelResult,
  type OrgStatus,
} from '../supabase/functions/_shared/orgStatus'

export interface EnterDecision {
  httpStatus: number
  levelId: string
  result: EnterLevelResult
}

function canonicalLevelId(levelId: string): string {
  const trimmed = levelId.trim()
  if (/^\d+$/.test(trimmed)) {
    const order = Number(trimmed)
    if (order >= 1) return `L${String(order).padStart(2, '0')}`
  }
  return trimmed
}

function isOrgStatus(value: unknown): value is OrgStatus {
  return value === 'trial' || value === 'active' || value === 'expired' || value === 'disabled'
}

export async function decideStudentLevel(studentId: string, levelId: string): Promise<EnterDecision> {
  const canonical = canonicalLevelId(levelId)
  const student = await one<{ id: string; org_id: string; group_id: string; status: string }>(
    'select id, org_id, group_id, status from public.student where id = $1',
    [studentId],
  )
  if (!student || student.status !== 'active') {
    return { httpStatus: 401, levelId: canonical, result: { allowed: false, reason: 'unauthenticated' } }
  }
  const org = await one<{ id: string; status: string; trial_expire_at: string | null; service_end_at: string | null }>(
    'select id, status, trial_expire_at, service_end_at from public.org where id = $1',
    [student.org_id],
  )
  if (!org) return { httpStatus: 200, levelId: canonical, result: { allowed: false, reason: 'org_disabled' } }
  const statusRow = await one<{ status: string }>('select effective_org_status($1, $2, $3) as status', [
    org.status,
    org.trial_expire_at,
    org.service_end_at,
  ])
  if (!isOrgStatus(statusRow?.status)) {
    return { httpStatus: 500, levelId: canonical, result: { allowed: false, reason: 'not_found' } }
  }
  const orderMatch = /^L(\d+)$/i.exec(canonical)
  const levelOrder = orderMatch ? Number(orderMatch[1]) : null
  const [entitlements, grant, levelRow] = await Promise.all([
    q<{
      org_id: string
      subject_type: 'org' | 'group' | 'student'
      subject_id: string
      level_order_min: number
      level_order_max: number
      expires_at: string | null
    }>('select org_id, subject_type, subject_id, level_order_min, level_order_max, expires_at from public.level_entitlement where org_id = $1', [
      student.org_id,
    ]),
    one<{ max_level: number; valid_until: string | null }>(
      'select max_level, valid_until from public.org_entitlement where org_id = $1',
      [student.org_id],
    ),
    one<{ stage_level: number | null }>(
      `select stage_level
       from public.course_level
       where level_id = $1 or ($2::int is not null and sort_order = $2)
       order by case when level_id = $1 then 0 else 1 end
       limit 1`,
      [canonical, levelOrder],
    ),
  ])
  const open = entitlements.filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now())
  const entitled =
    levelOrder != null &&
    isLevelEntitled(
      open.map((row) => ({
        orgId: row.org_id,
        subjectType: row.subject_type,
        subjectId: row.subject_id,
        levelOrderMin: row.level_order_min,
        levelOrderMax: row.level_order_max,
      })),
      org.id,
      student.group_id,
      student.id,
      levelOrder,
    )
  const stageLevel = readStageLevel(levelRow?.stage_level) ?? (levelOrder == null ? null : stageLevelOfOrder(levelOrder))
  const maxLevel = openMaxLevel(grant ? { maxLevel: Number(grant.max_level), validUntil: grant.valid_until } : null)
  return {
    httpStatus: 200,
    levelId: canonical,
    result: decideEnterLevel({ status: statusRow.status, levelOrder, entitled, stageLevel, maxLevel }),
  }
}
