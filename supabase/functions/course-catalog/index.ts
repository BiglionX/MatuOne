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
    const { report, levels } = validateCoursePackage(text)
    if (action === 'import' && report.ok) {
      for (const level of levels) {
        const { error } = await auth.db.from('course_level').upsert({
          level_id: level.level_id,
          sort_order: level.order,
          title: level.title,
          goal: level.goal,
          body: level,
          published: true,
          updated_at: new Date().toISOString(),
        })
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
