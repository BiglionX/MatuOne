// 课程包：学生读已发布关卡，平台运营校验并导入。不做可视化编辑。
import { validateCoursePackage } from '../_shared/coursePackage.ts'
import { groupCourseTree, sourceRowsFromTables, type CourseTreeTableLevel, type CourseTreeTableUnit } from '../_shared/courseTree.ts'
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

  if (action === 'preview' || action === 'preview-lock') {
    const levelId = typeof body.levelId === 'string' ? body.levelId.trim() : ''
    const orderMatch = /^L(\d+)$/i.exec(levelId)
    const order = orderMatch ? Number(orderMatch[1]) : null
    const direct = levelId
      ? await auth.db.from('course_level').select('level_id, body, goal, preview_frozen').eq('level_id', levelId).maybeSingle()
      : { data: null, error: null }
    const byOrder =
      !direct.data && order
        ? await auth.db.from('course_level').select('level_id, body, goal, preview_frozen').eq('sort_order', order).maybeSingle()
        : { data: null, error: null }
    if (direct.error || byOrder.error) return json(500, { message: '读取失败' })
    const row = direct.data ?? byOrder.data
    if (!row?.body || typeof row.body !== 'object') return json(404, { message: '没有找到这一关' })
    if (action === 'preview-lock') {
      const frozen = body.frozen === true
      const saved = await auth.db.from('course_level').update({ preview_frozen: frozen }).eq('level_id', row.level_id).select('preview_frozen').maybeSingle()
      if (saved.error) return json(500, { message: '保存失败' })
      return json(200, { levelId: row.level_id, previewFrozen: saved.data?.preview_frozen === true })
    }
    if (row.preview_frozen === true) return json(403, { message: '这一关已冻结，不能试课预览' })
    const hints = await auth.db.from('error_hint').select('pattern, friendly_message')
    const goal = typeof row.goal === 'string' && row.goal.trim() ? row.goal : (row.body as { goal?: string }).goal
    return json(200, { level: { ...(row.body as Record<string, unknown>), goal }, hints: hints.data ?? [] })
  }

  if (action === 'copy-save' || action === 'copy-history') {
    const levelId = typeof body.levelId === 'string' ? body.levelId.trim() : ''
    const orderMatch = /^L(\d+)$/i.exec(levelId)
    const order = orderMatch ? Number(orderMatch[1]) : null
    const direct = levelId
      ? await auth.db.from('course_level').select('level_id').eq('level_id', levelId).maybeSingle()
      : { data: null, error: null }
    const byOrder =
      !direct.data && order
        ? await auth.db.from('course_level').select('level_id').eq('sort_order', order).maybeSingle()
        : { data: null, error: null }
    if (direct.error || byOrder.error) return json(500, { message: '读取失败' })
    const storedId = direct.data?.level_id ?? byOrder.data?.level_id
    if (!storedId) return json(404, { message: '没有找到这一关' })
    if (action === 'copy-history') {
      const [revision, history] = await Promise.all([
        auth.db.from('course_level').select('revision_count').eq('level_id', storedId).maybeSingle(),
        auth.db
          .from('content_history')
          .select('field, previous_text, next_text, revision_count, editor_name, created_at')
          .eq('level_id', storedId)
          .order('created_at', { ascending: false })
          .limit(20),
      ])
      if (revision.error || history.error) return json(500, { message: '读取失败' })
      return json(200, {
        revisionCount: revision.data?.revision_count ?? 0,
        entries: (history.data ?? []).map((item) => ({
          field: item.field,
          previousText: item.previous_text,
          nextText: item.next_text,
          revisionCount: item.revision_count,
          editorName: item.editor_name,
          editedAt: item.created_at,
        })),
      })
    }
    const field = body.field
    const allowed = ['goal', 'teaching_intent', 'parent_brief', 'teacher_guide']
    if (typeof field !== 'string' || !allowed.includes(field) || typeof body.text !== 'string') {
      return json(400, { message: '文案字段不正确' })
    }
    const saved = await auth.db.rpc('save_course_copy', {
      p_level_id: storedId,
      p_field: field,
      p_text: body.text,
      p_editor_id: auth.staff.id,
      p_editor_name: auth.staff.display_name,
    })
    if (saved.error) {
      const message = saved.error.message ?? ''
      const known = ['文案字段不正确', '学习目标不能为空', '文案请控制在 2000', '没有找到这一关', '需要平台运营权限']
      return json(known.some((item) => message.includes(item)) ? 400 : 500, { message: known.find((item) => message.includes(item)) ?? '文案没有保存' })
    }
    const row = Array.isArray(saved.data) ? saved.data[0] : saved.data
    if (!row) return json(500, { message: '文案没有保存' })
    return json(200, {
      field,
      text: row.stored_text ?? null,
      revisionCount: row.revision_count ?? 0,
      changed: row.changed === true,
    })
  }

  if (action === 'tree') {
    const units = await auth.db.from('curriculum_unit').select('unit_id, title, sort_order, stage_level')
    const levels = await auth.db
      .from('course_level')
      .select('level_id, sort_order, title, goal, level_type, knowledge_tags, milestone_badge, published, preview_frozen, teaching_intent, parent_brief, teacher_guide, unit_id, body')
    if (units.error || levels.error) return json(500, { message: '读取失败' })
    const rows = sourceRowsFromTables((units.data ?? []) as CourseTreeTableUnit[], (levels.data ?? []) as CourseTreeTableLevel[])
    return json(200, { stages: groupCourseTree(rows) })
  }

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
        if (level.teaching_intent !== undefined) row.teaching_intent = level.teaching_intent
        if (level.parent_brief !== undefined) row.parent_brief = level.parent_brief
        if (level.teacher_guide !== undefined) row.teacher_guide = level.teacher_guide
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
