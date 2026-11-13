import type { ParentChildView, Student } from '@/types'
import { callFunction } from '@/lib/backend'

const TOKEN = 'cdg.session.parent'

export function parentToken(): string {
  return localStorage.getItem(TOKEN) ?? ''
}

function headers(): Record<string, string> {
  const token = parentToken()
  return token ? { 'x-parent-token': token } : {}
}

export async function lookupChild(code: string): Promise<{ id: string; name: string; orgName: string; groupName: string }> {
  const result = await callFunction<{ student: { id: string; name: string; orgName: string; groupName: string } }>(
    'parent-portal',
    { action: 'lookup', code },
    { headers: headers() },
  )
  return result.student
}

export async function bindChild(code: string): Promise<{ id: string; name: string; orgName: string; groupName: string }> {
  const result = await callFunction<{ token: string; student: { id: string; name: string; orgName: string; groupName: string } }>(
    'parent-portal',
    { action: 'bind', code },
    { headers: headers() },
  )
  localStorage.setItem(TOKEN, result.token)
  return result.student
}

export async function loadParentHome(): Promise<ParentChildView[]> {
  const result = await callFunction<{ children: ParentChildView[] }>('parent-portal', { action: 'home' }, { headers: headers() })
  return result.children.map((child) => ({
    ...child,
    student: { ...(child.student as Omit<Student, 'password'>), password: '' },
  }))
}
