import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { json } from './http.ts'

export interface OpsStaff {
  id: string
  display_name: string
  role: 'ops' | 'finance'
}

/**
 * 平台运营身份只从 JWT 对应的 platform_staff 行读取。
 * 不读取请求体里的 operator / orgId / studentId。
 */
export async function requireOps(
  req: Request,
): Promise<{ db: SupabaseClient; staff: OpsStaff } | { error: Response }> {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anon || !serviceKey) return { error: json(500, { message: '服务未配置' }) }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return { error: json(401, { message: '需要平台运营权限' }) }

  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: staff, error: staffError } = await db
    .from('platform_staff')
    .select('id, role, status, display_name')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()

  if (staffError || !staff || staff.role !== 'ops' || staff.status !== 'active') {
    return { error: json(403, { message: '需要平台运营权限' }) }
  }
  return { db, staff: { id: staff.id, display_name: staff.display_name, role: 'ops' } }
}

/** 平台身份从 JWT 对应的 platform_staff 读取。role 用来区分运营和财务。 */
export async function requireStaff(
  req: Request,
  roles: Array<'ops' | 'finance'>,
): Promise<{ db: SupabaseClient; staff: OpsStaff } | { error: Response }> {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anon || !serviceKey) return { error: json(500, { message: '服务未配置' }) }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return { error: json(401, { message: '需要平台权限' }) }

  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: staff, error: staffError } = await db
    .from('platform_staff')
    .select('id, role, status, display_name')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()

  if (staffError || !staff || staff.status !== 'active' || !roles.includes(staff.role)) {
    return { error: json(403, { message: '需要平台权限' }) }
  }
  return { db, staff: { id: staff.id, display_name: staff.display_name, role: staff.role } }
}

export function serviceDb(): SupabaseClient | Response {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return json(500, { message: '服务未配置' })
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
