// 家长读孩子之前的唯一机构门禁。宽限期内只读仍可看；停用（含宽限结束、手动停用）不给学习记录。
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { json } from './http.ts'

export type ParentOrgAccess = 'open' | 'readonly' | 'stopped'

export async function parentOrgAccess(db: SupabaseClient, orgId: string): Promise<ParentOrgAccess | Response> {
  const { data: org, error } = await db
    .from('org')
    .select('status, trial_expire_at, service_end_at')
    .eq('id', orgId)
    .maybeSingle()
  if (error) return json(500, { message: '读取失败' })
  if (!org) return 'stopped'
  const { data: status, error: statusError } = await db.rpc('effective_org_status', {
    p_status: org.status,
    p_trial_expire_at: org.trial_expire_at,
    p_service_end_at: org.service_end_at,
  })
  if (statusError || typeof status !== 'string') return json(500, { message: '读取失败' })
  if (status === 'disabled') return 'stopped'
  if (status === 'expired') return 'readonly'
  return 'open'
}
