import { ApiError } from './apiError'
import { pushNotice } from './notices'

const REQUEST_LIMIT_MS = 150_000

function requestSignal(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), ms)
  return {
    signal: controller.signal,
    cancel: () => window.clearTimeout(timer),
  }
}

function failRequest(status: number, message: string, toast: string): never {
  if (typeof navigator === 'undefined' || navigator.onLine !== false) pushNotice(toast)
  throw new ApiError(status, message)
}

export type AuthRole = 'org' | 'student' | 'platform' | 'parent' | 'agent'

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
  const timed = requestSignal(REQUEST_LIMIT_MS)
  try {
    const response = await fetch(`/api/${name}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      body: JSON.stringify(body ?? {}),
      signal: timed.signal,
    })
    timed.cancel()
    if (response.status === 204) return {} as T
    const raw = await response.text()
    let payload: { message?: string } = {}
    if (raw) {
      try {
        payload = JSON.parse(raw) as { message?: string }
      } catch {
        payload = { message: raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140) }
      }
    }
    if (response.status >= 500) {
      failRequest(response.status, payload.message || '服务暂时没有连上，请稍后再试。', '服务暂时没有连上，请稍后再试。')
    }
    if (!response.ok) throw new ApiError(response.status, payload.message || '请求失败')
    if (!raw.startsWith('{') && !raw.startsWith('[')) throw new ApiError(response.status, payload.message || '请求失败')
    return payload as T
  } catch (err) {
    timed.cancel()
    if (err instanceof ApiError) throw err
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new ApiError(0, '网络已断开，请检查连接')
    }
    const reason = err instanceof Error ? err.name : ''
    if (reason === 'AbortError' || reason === 'TimeoutError') {
      failRequest(0, '请求超时', '网络有点慢，请求超时了。请稍后再试。')
    }
    failRequest(0, '网络没有连上', '网络没有连上，请检查连接后再试。')
  }
}
