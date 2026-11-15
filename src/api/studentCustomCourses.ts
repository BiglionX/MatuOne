import type { EnterLevelResult } from '../../supabase/functions/_shared/orgStatus'
import { callFunction } from '@/lib/backend'
import type { StudentCustomOpen, StudentCustomOutline } from '@/types/studentCustomCourse'

/** 分给当前学生的机构专属课。学生身份由服务端会话决定。 */
export function listStudentCustomCourses(): Promise<StudentCustomOutline> {
  return callFunction<StudentCustomOutline>('student-custom-courses', { action: 'list' }, { role: 'student' })
}

/** 打开一节。平台关卡会先走 decideEnterLevel，不通过时返回原因，不带课文。 */
export function openStudentCustomSection(courseId: string, sectionIndex: number): Promise<StudentCustomOpen | EnterLevelResult> {
  return callFunction('student-custom-courses', { action: 'open', courseId, sectionIndex }, { role: 'student' })
}

/** 看完素材或通关关卡。服务端写入专属课记录，并给出下一节的序号。 */
export function completeStudentCustomSection(input: {
  courseId: string
  sectionIndex: number
  stars?: number
  errorTaps?: number
}): Promise<{ ok: true; nextIndex: number | null }> {
  return callFunction('student-custom-courses', { action: 'complete', ...input }, { role: 'student' })
}
