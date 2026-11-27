import { one } from './db'

export type ModuleLevelRow = {
  module_id: string
  level_id: string
  sort_order: number
  title: string
  goal: string
  body: Record<string, unknown>
}

export type ModuleLevelLesson = {
  title: string
  goal: string
  body: Record<string, unknown>
  sort_order: number
}

/** 新模块关卡只按模块内的 level_id 精确查找，不套用 Python 的 L数字 序号规则。 */
export async function findModuleLevel(moduleId: string, levelId: string): Promise<ModuleLevelRow | null> {
  const requested = levelId.trim()
  if (!requested) return null
  return one<ModuleLevelRow>(
    `select module_id, level_id, sort_order, title, goal, body
     from public.module_level
     where module_id = $1 and level_id = $2 and published = true and is_placeholder = false
     limit 1`,
    [moduleId, requested],
  )
}

/** 找当前关卡之前最近的一关真实正文，并带上当前学生的通关状态。 */
export async function findPreviousModuleLevelProgress(
  moduleId: string,
  sortOrder: number,
  studentId: string,
): Promise<{ level_id: string; completed: boolean } | null> {
  return one<{ level_id: string; completed: boolean }>(
    `select previous.level_id, coalesce(progress.completed, false) as completed
     from public.module_level previous
     left join public.learning_record progress
       on progress.student_id = $3
      and progress.module_id = previous.module_id
      and progress.level_id = previous.level_id
     where previous.module_id = $1
       and previous.published = true
       and previous.is_placeholder = false
       and previous.sort_order < $2
     order by previous.sort_order desc
     limit 1`,
    [moduleId, sortOrder, studentId],
  )
}

/** 新模块正文原样透传，不解析 Python 的 teach_code_lines / challenge_params 等字段。 */
export function lessonFromModuleLevel(row: ModuleLevelRow): ModuleLevelLesson {
  return {
    title: row.title,
    goal: row.goal,
    body: row.body,
    sort_order: Number(row.sort_order),
  }
}
