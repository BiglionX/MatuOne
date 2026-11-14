// 区域服务商只读看板。身份从登录会话对应的 agent_admin 取出，忽略请求体里的 agentId。
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
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  if (!userData.user) return json(401, { message: '未登录' })

  const { data: admin } = await db.from('agent_admin').select('id, status').eq('auth_user_id', userData.user.id).maybeSingle()
  if (!admin || admin.status !== 'active') return json(401, { message: '未登录' })

  const { data, error } = await db.rpc('agent_home', { p_admin_id: admin.id })
  if (error) {
    const line = error.message ?? ''
    if (line.includes('已停用')) return json(403, { message: '区域服务商已停用，无法登录' })
    if (line.includes('未登录')) return json(401, { message: '未登录' })
    return json(500, { message: '读取失败' })
  }
  return json(200, data ?? {})
})
