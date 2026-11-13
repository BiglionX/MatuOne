import type { Student } from '@/types'
import { callFunction, clearAuth, establishSession } from '@/lib/backend'

const PROFILE = 'cdg.session.student'

export interface StudentLoginOk {
  ok: true
  student: Student
}

export interface StudentLoginFail {
  ok: false
  message: string
}

interface LoginResponse {
  accessToken: string
  refreshToken: string
  student: Omit<Student, 'password'>
}

function readProfile(): Student | null {
  try {
    const raw = localStorage.getItem(PROFILE)
    return raw ? (JSON.parse(raw) as Student) : null
  } catch {
    return null
  }
}

export function getCurrentStudent(): Student | null {
  return readProfile()
}

export function logoutStudent(): void {
  localStorage.removeItem(PROFILE)
  void clearAuth('student')
}

/** 停用机构在服务端被拒绝。页面只展示 message。 */
export async function loginStudentAccount(account: string, password: string): Promise<StudentLoginOk | StudentLoginFail> {
  try {
    const result = await callFunction<LoginResponse>('student-login', { account: account.trim(), password })
    await establishSession('student', result.accessToken, result.refreshToken)
    const student: Student = { ...result.student, password: '' }
    localStorage.setItem(PROFILE, JSON.stringify(student))
    return { ok: true, student }
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败'
    return { ok: false, message }
  }
}
