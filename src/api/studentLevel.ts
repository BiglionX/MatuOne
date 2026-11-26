import type { EnterLevelResult } from '../../supabase/functions/_shared/orgStatus'
import type { ProgressModuleId } from '@/modules/types'
import { ApiError } from '@/lib/apiError'
import { callFunction } from '@/lib/backend'

export type { EnterLevelReason, EnterLevelResult } from '../../supabase/functions/_shared/orgStatus'

export interface ModuleLevelLesson {
  title: string
  goal: string
  body: unknown
  sort_order: number
}

/** 身份只看学生会话；未传模块时保持 Python 的原有行为。 */
export async function enterLevel(levelId: string, moduleId: ProgressModuleId = 'python'): Promise<EnterLevelResult> {
  try {
    return await callFunction<EnterLevelResult>('student-enter-level', { levelId, moduleId }, { role: 'student' })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return { allowed: false, reason: 'unauthenticated' }
    throw error
  }
}
