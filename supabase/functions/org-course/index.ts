// 课程开通。orgId 来自会话。试用机构的关卡上限仍由进关卡函数卡在前 3 关。
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { empty, json } from '../_shared/http.ts'
import { withOrgScope } from '../_shared/orgScope.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })
  const action = req.headers.get('x-action') ?? 'read'
  return withOrgScope(req, { write: action === 'save' || action === 'save-price' }, async (ctx) => {
    const { count } = await ctx.db.from('course_level').select('level_id', { count: 'exact', head: true }).eq('published', true)

    if (action === 'save-price') {
      const studentMonthlyPrice = Number(ctx.body.studentMonthlyPrice)
      if (!Number.isInteger(studentMonthlyPrice) || studentMonthlyPrice < 150 || studentMonthlyPrice > 500) {
        return json(400, { message: '家长定价需要在 150 到 500 元之间' })
      }
      const { error } = await ctx.db.from('org').update({ student_monthly_price: studentMonthlyPrice }).eq('id', ctx.orgId)
      if (error) return json(500, { message: '保存失败' })
    }

    if (action === 'save') {
      const groupId = typeof ctx.body.groupId === 'string' && ctx.body.groupId ? ctx.body.groupId : 'all'
      const seats = Number(ctx.body.seats)
      const expiresAt = typeof ctx.body.expiresAt === 'string' ? ctx.body.expiresAt : ''
      if (!Number.isInteger(seats) || seats < 1) return json(400, { message: '名额至少为 1' })
      if (seats > ctx.seatLimit) return json(409, { message: '席位已满' })
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) return json(400, { message: '请填写有效期' })
      if (groupId !== 'all') {
        const { data: group } = await ctx.db
          .from('student_group')
          .select('id')
          .eq('org_id', ctx.orgId)
          .eq('id', groupId)
          .maybeSingle()
        if (!group) return json(400, { message: '分组不存在' })
      }

      const activatedAt = new Date().toISOString()
      const { error } = await ctx.db.from('course_activation').upsert({
        org_id: ctx.orgId,
        group_id: groupId,
        seats,
        expires_at: expiresAt,
        activated_at: activatedAt,
      })
      if (error) return json(500, { message: '保存失败' })

      const expires = new Date(`${expiresAt}T23:59:59`)
      await ctx.db
        .from('level_entitlement')
        .update({ expires_at: expires.toISOString() })
        .eq('org_id', ctx.orgId)
        .eq('subject_type', 'org')

      if (groupId !== 'all') {
        const { data: existing } = await ctx.db
          .from('level_entitlement')
          .select('id')
          .eq('org_id', ctx.orgId)
          .eq('subject_type', 'group')
          .eq('subject_id', groupId)
          .maybeSingle()
        const span = { level_order_min: 1, level_order_max: ctx.status === 'trial' ? 3 : 999, expires_at: expires.toISOString() }
        if (existing) {
          await ctx.db.from('level_entitlement').update(span).eq('id', existing.id)
        } else {
          await ctx.db.from('level_entitlement').insert({
            org_id: ctx.orgId,
            subject_type: 'group',
            subject_id: groupId,
            ...span,
          })
        }
      }

      const maxLevel = await packageLevel(ctx.db, ctx.orgId)
      if (maxLevel instanceof Response) return maxLevel
      const pricing = await orgPricing(ctx.db, ctx.orgId)
      if (pricing instanceof Response) return pricing
      return json(200, { groupId, seats, expiresAt, activatedAt, levelCount: count ?? 0, maxLevel, ...pricing })
    }

    const { data } = await ctx.db.from('course_activation').select('group_id, seats, expires_at, activated_at').eq('org_id', ctx.orgId).maybeSingle()
    const { data: org } = await ctx.db
      .from('org')
      .select('seat_quota, trial_expire_at, service_end_at, created_at')
      .eq('id', ctx.orgId)
      .maybeSingle()
    const fallbackEnd = (org?.service_end_at ?? org?.trial_expire_at ?? '').slice(0, 10)
    const maxLevel = await packageLevel(ctx.db, ctx.orgId)
    if (maxLevel instanceof Response) return maxLevel
    const pricing = await orgPricing(ctx.db, ctx.orgId)
    if (pricing instanceof Response) return pricing
    return json(200, {
      groupId: data?.group_id ?? 'all',
      seats: data?.seats ?? org?.seat_quota ?? ctx.seatLimit,
      expiresAt: data?.expires_at ?? fallbackEnd,
      activatedAt: data?.activated_at ?? org?.created_at ?? new Date().toISOString(),
      levelCount: count ?? 0,
      maxLevel,
      ...pricing,
    })
  })
})

async function orgPricing(db: SupabaseClient, orgId: string): Promise<{ studentMonthlyPrice: number; baseSeatPrice: number } | Response> {
  const [{ data: org, error: orgError }, { data: config, error: configError }] = await Promise.all([
    db.from('org').select('student_monthly_price').eq('id', orgId).maybeSingle(),
    db.from('platform_configs').select('value').eq('key', 'base_seat_price').maybeSingle(),
  ])
  if (orgError || configError) return json(500, { message: '读取失败' })
  const baseSeatPrice = Number(config?.value)
  if (!Number.isInteger(baseSeatPrice) || baseSeatPrice < 1) return json(500, { message: '缺少平台底价配置' })
  return { studentMonthlyPrice: Number(org?.student_monthly_price), baseSeatPrice }
}

async function packageLevel(db: SupabaseClient, orgId: string): Promise<number | Response> {
  const { data, error } = await db.from('org_entitlement').select('max_level').eq('org_id', orgId).maybeSingle()
  if (error) return json(500, { message: '读取失败' })
  const level = Number(data?.max_level)
  return Number.isInteger(level) && level > 0 ? level : 0
}
