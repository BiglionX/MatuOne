// 机构端接口的唯一门禁。各函数只写业务，不自己判断状态和席位。
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { json } from './http.ts'
import { seatLimit, type OrgStatus } from './orgStatus.ts'

export interface OrgScopeContext {
  db: SupabaseClient
  orgId: string
  status: OrgStatus
  seatLimit: number
  usedSeats: number
  body: Record<string, unknown>
}

export async function withOrgScope(
  req: Request,
  options: { write?: boolean; importStudents?: boolean },
  handler: (ctx: OrgScopeContext) => Promise<Response>,
): Promise<Response> {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anon || !serviceKey) return json(500, { message: '服务未配置' })

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData } = await userClient.auth.getUser()
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  if (!userData.user) return json(401, { message: '未登录' })

  const { data: admin } = await db
    .from('org_admin')
    .select('org_id, status')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()
  if (!admin || admin.status !== 'active') {
    const { data: student } = await db.from('student').select('id').eq('auth_user_id', userData.user.id).maybeSingle()
    if (student) return json(401, { message: '非机构角色' })
    return json(401, { message: '未登录' })
  }

  let body: Record<string, unknown> = {}
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      const parsed = await req.json()
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>
    } catch {
      body = {}
    }
  }

  const requested = typeof body.orgId === 'string' ? body.orgId.trim() : ''
  if (requested && requested !== admin.org_id) return json(403, { message: '无权访问该机构' })

  const { data: org } = await db
    .from('org')
    .select('id, status, seat_quota, used_seats, trial_expire_at, service_end_at')
    .eq('id', admin.org_id)
    .maybeSingle()
  if (!org) return json(401, { message: '未登录' })

  const { data: status, error: statusError } = await db.rpc('effective_org_status', {
    p_status: org.status,
    p_trial_expire_at: org.trial_expire_at,
    p_service_end_at: org.service_end_at,
  })
  if (
    statusError ||
    (status !== 'trial' && status !== 'active' && status !== 'expired' && status !== 'disabled')
  ) {
    return json(500, { message: '读取机构状态失败' })
  }
  if (status === 'disabled') return json(403, { message: '机构已停用' })
  if (status === 'expired' && (options.write || options.importStudents)) {
    return json(403, { message: '服务已到期，仅可查看' })
  }

  const limit = seatLimit({ status: org.status, seatQuota: org.seat_quota }, status)
  if (options.importStudents && org.used_seats >= limit) return json(409, { message: '席位已满' })

  return handler({
    db,
    orgId: org.id,
    status,
    seatLimit: limit,
    usedSeats: org.used_seats,
    body,
  })
}
