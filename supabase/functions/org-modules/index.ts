// 机构模块开通：list 供启动器；manage / revoke / restore 供机构端。
// orgId 从 session 解析，不信任请求体。revoke 仅软关 revoked_at，不物理删除。
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { empty, json } from '../_shared/http.ts'
import { withOrgScope } from '../_shared/orgScope.ts'
import {
  enabledModuleIds,
  type ModuleEntitlementRow,
  type ProgressModuleId,
} from '../_shared/moduleEntitlements.ts'

type ModuleId = 'python' | 'matupix'

function mapManaged(rows: ModuleEntitlementRow[]) {
  const enabledIds = new Set(enabledModuleIds(rows))
  return rows
    .filter((row) => row.module_id === 'python' || row.module_id === 'matupix')
    .map((row) => {
      return {
        moduleId: row.module_id as ModuleId,
        maxLevel: row.max_level == null ? null : Number(row.max_level),
        validUntil: (row.valid_until as string | null) ?? null,
        revokedAt: (row.revoked_at as string | null) ?? null,
        enabled: enabledIds.has(row.module_id as ProgressModuleId),
        canToggle: row.module_id === 'matupix',
      }
    })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })

  let body: Record<string, unknown> = {}
  try {
    const parsed = await req.json()
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>
  } catch {
    body = {}
  }

  const action = typeof body.action === 'string' ? body.action.trim() : 'list'

  if (action === 'manage' || action === 'revoke' || action === 'restore') {
    const writing = action === 'revoke' || action === 'restore'
    // withOrgScope 会再读 body；这里把已解析的 body 塞回 Request 不可行，改为 clone 一份。
    const headers = new Headers(req.headers)
    headers.set('content-type', 'application/json')
    const scopedReq = new Request(req.url, {
      method: req.method,
      headers,
      body: JSON.stringify(body),
    })
    return withOrgScope(scopedReq, { write: writing, admin: writing }, async (ctx) => {
      if (writing) {
        const moduleId = typeof ctx.body.moduleId === 'string' ? ctx.body.moduleId.trim() : ''
        if (moduleId !== 'matupix') return json(400, { message: '本刀仅可开关 matupix' })

        if (action === 'revoke') {
          const { data, error } = await ctx.db
            .from('org_entitlement')
            .update({ revoked_at: new Date().toISOString() })
            .eq('org_id', ctx.orgId)
            .eq('module_id', 'matupix')
            .is('revoked_at', null)
            .select('id')
            .maybeSingle()
          if (error) return json(500, { message: '关闭失败' })
          if (!data) return json(404, { message: '未找到 matupix 开通行，或已关闭' })
        } else {
          const { data, error } = await ctx.db
            .from('org_entitlement')
            .update({ revoked_at: null })
            .eq('org_id', ctx.orgId)
            .eq('module_id', 'matupix')
            .not('revoked_at', 'is', null)
            .select('id')
            .maybeSingle()
          if (error) return json(500, { message: '重开失败' })
          if (!data) return json(404, { message: '未找到已关闭的 matupix，或已开通' })
        }
      }

      const { data: rows, error } = await ctx.db
        .from('org_entitlement')
        .select('module_id, max_level, valid_until, revoked_at')
        .eq('org_id', ctx.orgId)
        .in('module_id', ['python', 'matupix'])
        .order('module_id')
      if (error) return json(500, { message: '读取失败' })
      return json(200, { modules: mapManaged(rows ?? []) })
    })
  }

  if (action !== 'list') return json(400, { message: '不支持的操作' })

  // —— 以下为启动器 list：student / org session ——
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
    .select('module_id, max_level, valid_until, revoked_at')
    .eq('org_id', orgId)
  if (error) return json(500, { message: '读取失败' })

  const enabledIds = new Set(enabledModuleIds((rows ?? []) as ModuleEntitlementRow[]))
  const modules = (rows ?? [])
    .filter((row) => enabledIds.has(row.module_id as ProgressModuleId))
    .map((row) => ({
      moduleId: row.module_id as ModuleId,
      maxLevel: row.max_level == null ? null : Number(row.max_level),
      validUntil: (row.valid_until as string | null) ?? null,
    }))

  return json(200, { modules })
})
