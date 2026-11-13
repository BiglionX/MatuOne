import { buildPlayableLevel } from '../src/lib/lessonMaterial'
import { curriculumLevelByOrder, curriculumUnitById } from '../src/data/fullCurriculum'
import type { ProgressMark } from '../src/lib/curriculumState'
import { one, q } from './db'

function orderOf(levelId: string): number | null {
  const matched = /^L(\d+)$/i.exec(levelId.trim())
  if (!matched) return null
  const order = Number(matched[1])
  return Number.isInteger(order) && order >= 1 ? order : null
}

function missingRelation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('does not exist')
}

/** 进度只按 student_id 取，不带 org_id。序号用来和目录对齐。 */
export async function readProgressMarks(studentId: string): Promise<ProgressMark[]> {
  const sql = (table: 'learning_record' | 'level_progress') =>
    `select cl.sort_order, src.completed, src.stars
     from public.${table} src
     join public.course_level cl on cl.level_id = src.level_id
     where src.student_id = $1`
  try {
    const rows = await q<{ sort_order: number; completed: boolean; stars: number }>(sql('learning_record'), [studentId])
    return rows.map((row) => ({ order: Number(row.sort_order), completed: Boolean(row.completed), stars: Number(row.stars) || 0 }))
  } catch (error) {
    if (!missingRelation(error)) throw error
    const rows = await q<{ sort_order: number; completed: boolean; stars: number }>(sql('level_progress'), [studentId])
    return rows.map((row) => ({ order: Number(row.sort_order), completed: Boolean(row.completed), stars: Number(row.stars) || 0 }))
  }
}

/**
 * 目录编号是 L0001，已经入库的旧行仍是 L01。
 * 先按 level_id，再按序号找到那一行；没有就补一行，好让学习记录的外键能写上。
 */
export async function resolveStoredLevel(requested: string): Promise<{ levelId: string; order: number } | null> {
  const direct = await one<{ level_id: string; sort_order: number }>(
    'select level_id, sort_order from public.course_level where level_id = $1',
    [requested],
  )
  if (direct) return { levelId: direct.level_id, order: Number(direct.sort_order) }
  const order = orderOf(requested)
  if (!order) return null
  const byOrder = await one<{ level_id: string; sort_order: number }>(
    'select level_id, sort_order from public.course_level where sort_order = $1',
    [order],
  )
  if (byOrder) return { levelId: byOrder.level_id, order: Number(byOrder.sort_order) }
  const meta = curriculumLevelByOrder(order)
  const unit = meta ? curriculumUnitById(meta.unitId) : undefined
  const playable = meta ? buildPlayableLevel(meta.levelId) : undefined
  if (!meta || !unit || !playable) return null
  await q(
    `insert into public.course_level
      (level_id, sort_order, title, goal, body, published, unit_id, knowledge_tags, level_type, milestone_badge)
     values ($1, $2, $3, $4, $5::jsonb, true, $6, string_to_array($7, ','), $8, $9)
     on conflict (level_id) do nothing`,
    [
      meta.levelId,
      meta.order,
      meta.title,
      meta.goal,
      JSON.stringify(playable),
      meta.unitId,
      meta.knowledgeTags.join(','),
      meta.levelType,
      meta.milestoneBadge,
    ],
  )
  const created = await one<{ level_id: string; sort_order: number }>(
    'select level_id, sort_order from public.course_level where level_id = $1 or sort_order = $2',
    [meta.levelId, meta.order],
  )
  return created ? { levelId: created.level_id, order: Number(created.sort_order) } : null
}
