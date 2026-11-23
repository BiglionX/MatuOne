// 启动器开通列表。orgId 从 student 或 org session 解析，不信任请求体。
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { empty, json } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })

  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anon || !serviceKey) return json(500, { message: '服务未配置' })

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData } = await userClient.auth.getUser()
  if (!userData.user) return json(401, { message: '未登录' })

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  let orgId: string | null = null

  const { data: student } = await db
    .from('student')
    .select('org_id, status')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()
  if (student?.status === 'active') {
    orgId = student.org_id as string
  } else {
    const { data: admin } = await db
      .from('org_admin')
      .select('org_id, status')
      .eq('auth_user_id', userData.user.id)
      .maybeSingle()
    if (!admin || admin.status !== 'active') return json(401, { message: '未登录' })
    orgId = admin.org_id as string
  }

  const { data: org } = await db
    .from('org')
    .select('status, trial_expire_at, service_end_at')
    .eq('id', orgId)
    .maybeSingle()
  if (!org) return json(401, { message: '未登录' })

  const { data: status } = await db.rpc('effective_org_status', {
    p_status: org.status,
    p_trial_expire_at: org.trial_expire_at,
    p_service_end_at: org.service_end_at,
  })
  if (status === 'disabled') return json(403, { message: '机构已停用' })

  const { data: rows, error } = await db
    .from('org_entitlement')
    .select('module_id, max_level, valid_until')
    .eq('org_id', orgId)
    .is('revoked_at', null)
    .or('valid_until.is.null,valid_until.gt.now()')
  if (error) return json(500, { message: '读取失败' })

  const modules = (rows ?? [])
    .filter((row) => row.module_id === 'python' || row.module_id === 'matupix')
    .map((row) => ({
      moduleId: row.module_id as 'python' | 'matupix',
      maxLevel: row.max_level == null ? null : Number(row.max_level),
      validUntil: (row.valid_until as string | null) ?? null,
    }))

  return json(200, { modules })
})
