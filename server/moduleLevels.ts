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
     where module_id = $1 and level_id = $2 and published = true
     limit 1`,
    [moduleId, requested],
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
