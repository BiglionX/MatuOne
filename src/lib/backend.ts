import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from './apiError'

export type AuthRole = 'org' | 'student' | 'platform' | 'parent'

function env(): { url: string; anon: string } {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) throw new ApiError(500, '服务未配置')
  return { url, anon }
}

const clients = new Map<AuthRole, SupabaseClient>()

export function authClient(role: AuthRole): SupabaseClient {
  const existing = clients.get(role)
  if (existing) return existing
  const { url, anon } = env()
  const client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: `cdg.auth.${role}`,
    },
  })
  clients.set(role, client)
  return client
}

export async function establishSession(role: AuthRole, accessToken: string, refreshToken: string): Promise<void> {
  const { error } = await authClient(role).auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  if (error) throw new ApiError(401, '登录失败')
}

export async function clearAuth(role: AuthRole): Promise<void> {
  const { url, anon } = env()
  if (!clients.has(role) && !localStorage.getItem(`cdg.auth.${role}`)) {
    const client = createClient(url, anon, {
      auth: { persistSession: true, autoRefreshToken: false, storageKey: `cdg.auth.${role}` },
    })
    await client.auth.signOut()
    return
  }
  await authClient(role).auth.signOut()
}

export async function callFunction<T>(
  name: string,
  body: unknown,
  options?: { role?: AuthRole; headers?: Record<string, string> },
): Promise<T> {
  const { url, anon } = env()
  let token = ''
  if (options?.role) {
    const { data } = await authClient(options.role).auth.getSession()
    token = data.session?.access_token ?? ''
    if (!token) throw new ApiError(401, '未登录')
  }
  const response = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: anon,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    body: JSON.stringify(body ?? {}),
  })
  const payload = (await response.json().catch(() => ({}))) as { message?: string }
  if (!response.ok) throw new ApiError(response.status, payload.message || '请求失败')
  return payload as T
}
