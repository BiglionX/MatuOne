// 进关卡的唯一数据库判定。student-enter-level 与 student-learning 都调这里。
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import {
  decideEnterLevel as judgeEnterLevel,
  isLevelEntitled,
  levelOrderOf,
  openMaxLevel,
  readStageLevel,
  stageLevelOfOrder,
  type EnterLevelResult,
  type OrgStatus,
} from './orgStatus.ts'

export interface EnterLevelDecision {
  httpStatus: number
  levelId: string
  result: EnterLevelResult
}

/** 纯数字关卡号写成 L04，与 course_level.level_id 对齐。已是 L04 的原样保留。 */
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

export async function decideEnterLevel(
  svcDb: SupabaseClient,
  studentId: string,
  levelId: string,
): Promise<EnterLevelDecision> {
  const canonical = canonicalLevelId(levelId)
  const { data: student } = await svcDb
    .from('student')
    .select('id, org_id, group_id, status')
    .eq('id', studentId)
    .maybeSingle()
  if (!student || student.status !== 'active') {
    return { httpStatus: 401, levelId: canonical, result: { allowed: false, reason: 'unauthenticated' } }
  }

  const { data: org } = await svcDb
    .from('org')
    .select('id, status, trial_expire_at, service_end_at')
    .eq('id', student.org_id)
    .maybeSingle()
  if (!org) return { httpStatus: 200, levelId: canonical, result: { allowed: false, reason: 'org_disabled' } }

  const order = levelOrderOf(canonical)
  const [{ data: entitlements }, { data: status, error: statusError }, { data: grant, error: grantError }, { data: levelById, error: levelError }, { data: levelByOrder, error: orderError }] =
    await Promise.all([
      svcDb
        .from('level_entitlement')
        .select('org_id, subject_type, subject_id, level_order_min, level_order_max, expires_at')
        .eq('org_id', student.org_id),
      svcDb.rpc('effective_org_status', {
        p_status: org.status,
        p_trial_expire_at: org.trial_expire_at,
        p_service_end_at: org.service_end_at,
      }),
      svcDb.from('org_entitlement').select('max_level, valid_until').eq('org_id', student.org_id).maybeSingle(),
      svcDb.from('course_level').select('stage_level').eq('level_id', canonical).maybeSingle(),
      order == null
        ? Promise.resolve({ data: null, error: null })
        : svcDb.from('course_level').select('stage_level').eq('sort_order', order).maybeSingle(),
    ])
  if (statusError || grantError || levelError || orderError || !isOrgStatus(status)) {
    return { httpStatus: 500, levelId: canonical, result: { allowed: false, reason: 'not_found' } }
  }

  const openEntitlements = (entitlements ?? []).filter(
    (row) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now(),
  )
  const entitled =
    order != null &&
    isLevelEntitled(
      openEntitlements.map((row) => ({
        orgId: row.org_id,
        subjectType: row.subject_type,
        subjectId: row.subject_id,
        levelOrderMin: row.level_order_min,
        levelOrderMax: row.level_order_max,
      })),
      org.id,
      student.group_id,
      student.id,
      order,
    )

  const stageLevel = readStageLevel(levelById?.stage_level) ?? readStageLevel(levelByOrder?.stage_level) ?? (order == null ? null : stageLevelOfOrder(order))
  const maxLevel = openMaxLevel(
    grant ? { maxLevel: Number(grant.max_level), validUntil: grant.valid_until } : null,
  )

  return {
    httpStatus: 200,
    levelId: canonical,
    result: judgeEnterLevel({ status, levelOrder: order, entitled, stageLevel, maxLevel }),
  }
}
