// 课程包：学生读已发布关卡，平台运营校验并导入。不做可视化编辑。
import { validateCoursePackage } from '../_shared/coursePackage.ts'
import { empty, json } from '../_shared/http.ts'
import { requireOps } from '../_shared/staff.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })

  let body: Record<string, unknown> = {}
  try {
    const parsed = await req.json()
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>
  } catch {
    body = {}
  }
  const action = typeof body.action === 'string' ? body.action : 'list'

  const auth = await requireOps(req)
  if ('error' in auth) return auth.error

  if (action === 'validate' || action === 'import') {
    const text = typeof body.text === 'string' ? body.text : ''
    const { report, levels, placement } = validateCoursePackage(text)
    if (action === 'import' && report.ok) {
      if (placement) {
        const unit = await auth.db.from('curriculum_unit').upsert({
          unit_id: placement.unit.unit_id,
          semester_id: placement.legacySemesterId,
          title: placement.unit.title,
          sort_order: placement.unit.sort_order,
          stage_level: placement.stageLevel,
        })
        if (unit.error) return json(500, { message: '导入失败' })
      }
      for (const level of levels) {
        const row: Record<string, unknown> = {
          level_id: level.level_id,
          sort_order: level.order,
          title: level.title,
          goal: level.goal,
          body: level,
          published: true,
          updated_at: new Date().toISOString(),
        }
        if (level.unit_id) row.unit_id = level.unit_id
        if (level.pedagogy) row.level_type = level.pedagogy
        if (level.knowledge_tags) row.knowledge_tags = level.knowledge_tags
        if (level.milestone_badge !== undefined) row.milestone_badge = level.milestone_badge
        const { error } = await auth.db.from('course_level').upsert(row)
        if (error) return json(500, { message: '导入失败' })
      }
    }
    const { data } = await auth.db.from('course_level').select('level_id, sort_order, title').eq('published', true).order('sort_order')
    return json(200, { report, levels: data ?? [] })
  }

  const { data, error } = await auth.db
    .from('course_level')
    .select('level_id, sort_order, title, goal')
    .eq('published', true)
    .order('sort_order')
  if (error) return json(500, { message: '读取失败' })
  return json(200, { levels: data ?? [] })
})
