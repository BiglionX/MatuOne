// student.enterLevel
// 只读 levelId。学生与机构都从登录用户解析，忽略 body 里的 studentId / orgId。
import { empty, json } from '../_shared/http.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { decideEnterLevel } from '../_shared/enterLevel.ts'

function levelIdFrom(raw: unknown): string {
  if (typeof raw === 'number' && Number.isInteger(raw)) return String(raw)
  if (typeof raw === 'string') return raw
  return ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })

  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anon || !serviceKey) return json(500, { allowed: false, reason: 'not_found' })

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData } = await userClient.auth.getUser()
  if (!userData.user) return json(401, { allowed: false, reason: 'unauthenticated' })

  let levelId = ''
  try {
    const body = await req.json()
    if (body && typeof body === 'object') levelId = levelIdFrom((body as { levelId?: unknown }).levelId)
  } catch {
    levelId = ''
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: student } = await db
    .from('student')
    .select('id, status')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()
  if (!student || student.status !== 'active') return json(401, { allowed: false, reason: 'unauthenticated' })

  const decision = await decideEnterLevel(db, student.id, levelId)
  return json(decision.httpStatus, decision.result)
})
