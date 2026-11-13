import type { ParentChildView, ParentHomeData, ParentSession, ParentStoppedChild, Student } from '@/types'
import { presentParentProgress } from '@/lib/parentProgress'
import { callFunction, clearAuth, establishSession } from '@/lib/backend'

const PROFILE = 'cdg.session.parent'

interface AuthResponse {
  accessToken: string
  refreshToken: string
  account: string
}

function readProfile(): ParentSession | null {
  try {
    const raw = localStorage.getItem(PROFILE)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ParentSession>
    if (!parsed || typeof parsed.account !== 'string' || !parsed.account) {
      localStorage.removeItem(PROFILE)
      return null
    }
    return { account: parsed.account }
  } catch {
    localStorage.removeItem(PROFILE)
    return null
  }
}

export function getParentSession(): ParentSession | null {
  return readProfile()
}

export function logoutParent(): void {
  localStorage.removeItem(PROFILE)
  void clearAuth('parent')
}

async function establish(result: AuthResponse): Promise<ParentSession> {
  await establishSession('parent', result.accessToken, result.refreshToken)
  const session: ParentSession = { account: result.account }
  localStorage.setItem(PROFILE, JSON.stringify(session))
  return session
}

/** 只提交用户名和密码。家长 id 由服务端按账号行回填。 */
export async function loginParent(account: string, password: string): Promise<ParentSession> {
  const result = await callFunction<AuthResponse>('parent-login', { action: 'login', account: account.trim(), password })
  return establish(result)
}

/** 第一次使用时自己注册。绑定码不能代替账号。 */
export async function registerParent(account: string, password: string): Promise<ParentSession> {
  const result = await callFunction<AuthResponse>('parent-login', { action: 'register', account: account.trim(), password })
  return establish(result)
}

/** 查询只确认绑定码还能用，不带回孩子姓名、机构或分组。 */
export async function lookupChild(code: string): Promise<void> {
  await callFunction<{ ok: true }>('parent-portal', { action: 'lookup', code }, { role: 'parent' })
}

/** 绑定成功后由首页再取学习记录。 */
export async function bindChild(code: string): Promise<void> {
  await callFunction<{ ok: true }>('parent-portal', { action: 'bind', code }, { role: 'parent' })
}

/** studentId 只用来在当前家长自己的绑定里选一个，服务端会再核对归属。 */
export async function unbindChild(studentId: string): Promise<void> {
  await callFunction<{ ok: true }>('parent-portal', { action: 'unbind', studentId }, { role: 'parent' })
}

export async function loadParentHome(): Promise<ParentHomeData> {
  const result = await callFunction<{ children: ParentChildView[]; stopped?: ParentStoppedChild[] }>(
    'parent-portal',
    { action: 'home' },
    { role: 'parent' },
  )
  return {
    children: result.children.map((child) => ({
      ...child,
      curriculum: child.curriculum ?? presentParentProgress(child.currentLevelOrder),
      student: {
        ...(child.student as Omit<Student, 'password' | 'account' | 'bindCode'>),
        account: '',
        bindCode: '',
        password: '',
      },
    })),
    stopped: result.stopped ?? [],
  }
}
