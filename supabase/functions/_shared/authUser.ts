import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export function loginEmail(kind: 'org' | 'student' | 'staff' | 'parent' | 'agent', account: string): string {
  const local = account.trim().toLowerCase().replace(/[^a-z0-9._+-]/g, '.')
  return `${kind}.${local}@users.daima-chuangguan.com`
}

/** 密码已由调用方核对。Auth 用户只用来签发会话，邮箱是内部占位，不开放自助注册。 */
export async function ensureAuthUser(db: SupabaseClient, email: string, password: string): Promise<string> {
  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (created.data.user) return created.data.user.id

  const message = created.error?.message ?? ''
  if (!/already|registered|exists/i.test(message)) {
    console.error('createUser failed', message)
    throw new Error('创建登录用户失败')
  }

  const { data: existing, error: lookupError } = await db.rpc('auth_user_id_by_email', { p_email: email })
  if (lookupError || !existing) {
    console.error('auth_user_id_by_email failed', lookupError?.message)
    throw new Error('创建登录用户失败')
  }
  const { error: updateError } = await db.auth.admin.updateUserById(String(existing), {
    password,
    email_confirm: true,
  })
  if (updateError) {
    console.error('updateUser failed', updateError.message)
    throw new Error('创建登录用户失败')
  }
  return String(existing)
}

export async function issueSession(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anon) throw new Error('服务未配置')
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    console.error('signInWithPassword failed', error?.message)
    throw new Error('登录失败')
  }
  return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token }
}
