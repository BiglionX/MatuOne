import type { EnterLevelResult } from '../../supabase/functions/_shared/orgStatus'
import { ApiError } from '@/lib/apiError'
import { callFunction } from '@/lib/backend'

export type { EnterLevelReason, EnterLevelResult } from '../../supabase/functions/_shared/orgStatus'

/** 只接收 levelId。身份只看学生会话。 */
export async function enterLevel(levelId: string): Promise<EnterLevelResult> {
  try {
    return await callFunction<EnterLevelResult>('student-enter-level', { levelId }, { role: 'student' })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return { allowed: false, reason: 'unauthenticated' }
    throw error
  }
}
