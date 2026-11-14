import type { ImportReport, Level } from '@/types'
import type { CourseCopyField, CourseCopyHistory, CourseCopySave, CourseTree, StaffCoursePreview } from '@/types/courseAdmin'
import { ApiError } from '@/lib/apiError'
import { callFunction } from '@/lib/backend'
import { buildPlayableLevel } from '@/lib/lessonMaterial'
import { rememberHints, rememberLevels } from '@/lib/levelCatalog'

export interface PublishedLevel {
  level_id: string
  sort_order: number
  title: string
  goal?: string
}

/** 后台试课。只读课文，不走学生会话，也不写 learning_record / typing_record。 */
export async function loadPreviewLevel(levelId: string): Promise<Level> {
  const request: StaffCoursePreview = { levelId, sandbox: true }
  const result = await callFunction<{ level: Level; hints?: { pattern: string; friendly_message: string }[] }>(
    'course-catalog',
    { action: 'preview', levelId: request.levelId, sandbox: request.sandbox },
    { role: 'platform' },
  )
  const level = result.level?.quiz && result.level.teach_code_lines?.length ? result.level : buildPlayableLevel(levelId)
  if (!level) throw new ApiError(404, '没有找到这一关')
  rememberLevels([level])
  rememberHints((result.hints ?? []).map((row) => ({ pattern: row.pattern, friendlyMessage: row.friendly_message })))
  return level
}

/** 冻结后试课入口和预览接口都不再打开这一关。levelId 用库内编号。 */
export async function setPreviewFrozen(levelId: string, frozen: boolean): Promise<{ previewFrozen: boolean }> {
  return callFunction('course-catalog', { action: 'preview-lock', levelId, frozen }, { role: 'platform' })
}

/** 只改教学文案。身份由平台会话决定，不接收操作者 id。 */
export async function saveCourseCopy(levelId: string, field: CourseCopyField, text: string): Promise<CourseCopySave> {
  return callFunction('course-catalog', { action: 'copy-save', levelId, field, text }, { role: 'platform' })
}

export async function listCourseCopyHistory(levelId: string): Promise<CourseCopyHistory> {
  return callFunction('course-catalog', { action: 'copy-history', levelId }, { role: 'platform' })
}

export async function listCourseTree(): Promise<CourseTree> {
  return callFunction<CourseTree>('course-catalog', { action: 'tree' }, { role: 'platform' })
}

export async function listPublishedLevels(): Promise<PublishedLevel[]> {
  const result = await callFunction<{ levels: PublishedLevel[] }>('course-catalog', { action: 'list' }, { role: 'platform' })
  return result.levels
}

export async function validateCoursePackage(text: string): Promise<{ report: ImportReport; levels: Level[] }> {
  const result = await callFunction<{ report: ImportReport; levels: PublishedLevel[] }>(
    'course-catalog',
    { action: 'validate', text },
    { role: 'platform' },
  )
  return { report: result.report, levels: [] }
}

export async function importCoursePackage(text: string): Promise<ImportReport> {
  const result = await callFunction<{ report: ImportReport }>('course-catalog', { action: 'import', text }, { role: 'platform' })
  return result.report
}
