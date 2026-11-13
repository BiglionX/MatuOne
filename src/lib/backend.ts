import { ApiError } from './apiError'

export type AuthRole = 'org' | 'student' | 'platform' | 'parent'

const tokenKey = (role: AuthRole) => `cdg.auth.${role}`

export async function establishSession(role: AuthRole, accessToken: string, _refreshToken: string): Promise<void> {
  localStorage.setItem(tokenKey(role), accessToken)
}

export async function clearAuth(role: AuthRole): Promise<void> {
  localStorage.removeItem(tokenKey(role))
}

export async function callFunction<T>(
  name: string,
  body: unknown,
  options?: { role?: AuthRole; headers?: Record<string, string> },
): Promise<T> {
  let token = ''
  if (options?.role) {
    token = localStorage.getItem(tokenKey(options.role)) ?? ''
    if (!token) throw new ApiError(401, '未登录')
  }
  const response = await fetch(`/api/${name}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    body: JSON.stringify(body ?? {}),
  })
  if (response.status === 204) return {} as T
  const payload = (await response.json().catch(() => ({}))) as { message?: string }
  if (!response.ok) throw new ApiError(response.status, payload.message || '请求失败')
  return payload as T
}
