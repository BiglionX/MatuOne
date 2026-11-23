/**
 * Python 授权进度事实（纯计算）。
 * 调用方负责读表；本文件只复用现有 lessonIsAuthorized 计数逻辑，禁止引入 DB 查询。
 */
// @ts-expect-error 边缘函数要带 .ts 后缀，应用这边的 tsconfig 不允许。
import { lessonIsAuthorized, type OrgStatus } from './orgStatus.ts'

export type PublishedLevelRow = {
  sort_order: number
  /** = course_level.stage_level */
  stage_sort: number
}

export type CompletedLessonRow = {
  student_id: string
  sort_order: number
  stage_sort: number
  completed: boolean
}

export type PythonAuthorizedFacts = {
  authorizedLevels: number
  /** studentId → 授权内完成数（机构 completed_count / completedCount） */
  completed: Map<string, number>
}

/** 与现 filter(...lessonIsAuthorized).length 逐步一致 */
export function countAuthorizedLevels(
  access: OrgStatus,
  maxStage: number,
  published: PublishedLevelRow[],
): number {
  return published.filter((row) => lessonIsAuthorized(access, maxStage, row.sort_order, row.stage_sort)).length
}

/** 与现「completed && lessonIsAuthorized → Map++」逐步一致 */
export function countAuthorizedCompletedByStudent(
  access: OrgStatus,
  maxStage: number,
  lessons: CompletedLessonRow[],
): Map<string, number> {
  const completed = new Map<string, number>()
  for (const lesson of lessons) {
    if (lesson.completed !== true || !lessonIsAuthorized(access, maxStage, lesson.sort_order, lesson.stage_sort)) continue
    completed.set(lesson.student_id, (completed.get(lesson.student_id) ?? 0) + 1)
  }
  return completed
}

export function buildPythonAuthorizedFacts(
  access: OrgStatus,
  maxStage: number,
  published: PublishedLevelRow[],
  lessons: CompletedLessonRow[],
): PythonAuthorizedFacts {
  return {
    authorizedLevels: countAuthorizedLevels(access, maxStage, published),
    completed: countAuthorizedCompletedByStudent(access, maxStage, lessons),
  }
}
