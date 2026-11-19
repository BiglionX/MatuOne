// 机构课程组装。orgId 只来自 withOrgScope。关卡范围在数据库函数里判断。
import { empty, json } from '../_shared/http.ts'
import { isUuid } from '../_shared/orgMaterialFile.ts'
import { withOrgScope } from '../_shared/orgScope.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })
  const action = req.headers.get('x-action') ?? 'list'
  const write = action === 'create' || action === 'save' || action === 'assign' || action === 'unassign' || action === 'remove'
  return withOrgScope(req, { write }, async (ctx) => {
    if (action === 'list') return listCourses(ctx.db, ctx.orgId)
    if (action === 'create') return createCourse(ctx.db, ctx.orgId, ctx.body)
    if (action === 'read') return readCourse(ctx.db, ctx.orgId, ctx.body)
    if (action === 'save') return saveCourse(ctx.db, ctx.orgId, ctx.body)
    if (action === 'assign') return assignCourse(ctx.db, ctx.orgId, ctx.body)
    if (action === 'unassign') return unassignCourse(ctx.db, ctx.orgId, ctx.body)
    if (action === 'remove') return removeCourse(ctx.db, ctx.orgId, ctx.body)
    return json(400, { message: '没有这个操作' })
  })
})

async function listCourses(db: Db, orgId: string): Promise<Response> {
  const [courses, assignments] = await Promise.all([
    db
      .from('org_custom_course')
      .select('id, title, created_at, org_custom_section(id, removed_at)')
      .eq('org_id', orgId)
      .is('removed_at', null)
      .order('created_at', { ascending: false }),
    db
      .from('org_custom_course_assignment')
      .select('id, course_id, subject_type, subject_id, org_custom_course!inner(org_id, removed_at)')
      .eq('org_custom_course.org_id', orgId)
      .is('org_custom_course.removed_at', null)
      .is('removed_at', null),
  ])
  if (courses.error || assignments.error) return json(500, { message: '读取失败' })
  const labels = await labelsOf(db, orgId, assignments.data ?? [])
  return json(
    200,
    (courses.data ?? []).map((course) => ({
      id: course.id,
      title: course.title,
      createdAt: course.created_at,
      sectionCount: (course.org_custom_section ?? []).filter((section) => !section.removed_at).length,
      assignments: (assignments.data ?? [])
        .filter((item) => item.course_id === course.id)
        .map((item) => ({
          id: item.id,
          subjectType: item.subject_type,
          subjectId: item.subject_id,
          label: labels.get(`${item.subject_type}:${item.subject_id}`) ?? '未命名',
        })),
    })),
  )
}

async function createCourse(db: Db, orgId: string, body: Record<string, unknown>): Promise<Response> {
  const requested = typeof body.title === 'string' ? body.title.trim() : ''
  const title = requested || '未命名课程'
  if (title.length > 80) return json(400, { message: '课程名称需要 1–80 个字' })
  const { data, error } = await db
    .from('org_custom_course')
    .insert({ org_id: orgId, title })
    .select('id, title, created_at')
    .single()
  if (error || !data) return json(500, { message: '创建失败' })
  return json(200, { id: data.id, title: data.title, createdAt: data.created_at, sections: [], levels: [] })
}

async function readCourse(db: Db, orgId: string, body: Record<string, unknown>): Promise<Response> {
  const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : ''
  if (!isUuid(courseId)) return json(404, { message: '课程不存在' })
  const [{ data: course, error }, { data: sections, error: sectionError }, { data: levels, error: levelError }] = await Promise.all([
    db.from('org_custom_course').select('id, title, created_at').eq('id', courseId).eq('org_id', orgId).is('removed_at', null).maybeSingle(),
    db
      .from('org_custom_section')
      .select('id, course_id, order, type, platform_level_id, material_id, title')
      .eq('course_id', courseId)
      .is('removed_at', null),
    db.rpc('org_platform_levels_for_org', { p_org_id: orgId }),
  ])
  if (error || sectionError || levelError) return json(500, { message: '读取失败' })
  if (!course) return json(404, { message: '课程不存在' })
  return json(200, {
    id: course.id,
    title: course.title,
    createdAt: course.created_at,
    sections: (sections ?? [])
      .map((row) => ({
        id: row.id,
        courseId: row.course_id,
        order: row.order,
        type: row.type,
        platformLevelId: row.platform_level_id,
        materialId: row.material_id,
        title: row.title,
      }))
      .sort((a, b) => a.order - b.order),
    levels: (levels ?? []).map((row) => ({
      levelId: row.level_id,
      order: row.sort_order,
      title: row.title,
      stageLevel: row.stage_level,
      unitId: row.unit_id,
      unitTitle: row.unit_title,
      unitSort: row.unit_sort,
    })),
  })
}

async function saveCourse(db: Db, orgId: string, body: Record<string, unknown>): Promise<Response> {
  const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : ''
  const title = typeof body.title === 'string' ? body.title : ''
  if (!isUuid(courseId)) return json(404, { message: '课程不存在' })
  if (!Array.isArray(body.sections)) return json(400, { message: '课程环节格式不正确' })
  const sections = body.sections.map((item) => {
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    return {
      type: row.type === 'material' ? 'material' : row.type === 'platform_level' ? 'platform_level' : '',
      platformLevelId: typeof row.platformLevelId === 'string' ? row.platformLevelId : '',
      materialId: typeof row.materialId === 'string' ? row.materialId : '',
    }
  })
  const { data, error } = await db.rpc('save_org_custom_course', {
    p_org_id: orgId,
    p_course_id: courseId,
    p_title: title,
    p_sections: sections,
  })
  if (error) return failed(error.message)
  return json(200, data)
}

async function assignCourse(db: Db, orgId: string, body: Record<string, unknown>): Promise<Response> {
  const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : ''
  const subjectType = body.subjectType === 'group' || body.subjectType === 'student' ? body.subjectType : ''
  const subjectId = typeof body.subjectId === 'string' ? body.subjectId.trim() : ''
  if (!isUuid(courseId)) return json(404, { message: '课程不存在' })
  if (!subjectType || !isUuid(subjectId)) return json(400, { message: subjectType === 'group' ? '分组不属于本机构' : '学生不属于本机构' })
  const { data: course } = await db.from('org_custom_course').select('id').eq('id', courseId).eq('org_id', orgId).is('removed_at', null).maybeSingle()
  if (!course) return json(404, { message: '课程不存在' })
  const { error } = await db.from('org_custom_course_assignment').insert({ course_id: courseId, subject_type: subjectType, subject_id: subjectId })
  if (error && !error.message.toLowerCase().includes('duplicate')) return failed(error.message)
  return listCourses(db, orgId)
}

async function removeCourse(db: Db, orgId: string, body: Record<string, unknown>): Promise<Response> {
  const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : ''
  if (!isUuid(courseId)) return json(404, { message: '课程不存在' })
  const { data, error } = await db
    .from('org_custom_course')
    .update({ removed_at: new Date().toISOString() })
    .eq('id', courseId)
    .eq('org_id', orgId)
    .is('removed_at', null)
    .select('id')
    .maybeSingle()
  if (error) return failed(error.message)
  if (!data) return json(404, { message: '课程不存在' })
  await db.from('org_custom_course_assignment').update({ removed_at: new Date().toISOString() }).eq('course_id', courseId).is('removed_at', null)
  return listCourses(db, orgId)
}

async function unassignCourse(db: Db, orgId: string, body: Record<string, unknown>): Promise<Response> {
  const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId.trim() : ''
  if (!isUuid(assignmentId)) return json(404, { message: '没有这份分配' })
  const { data: owned } = await db
    .from('org_custom_course_assignment')
    .select('id, org_custom_course!inner(org_id)')
    .eq('id', assignmentId)
    .eq('org_custom_course.org_id', orgId)
    .is('removed_at', null)
    .maybeSingle()
  if (!owned) return json(404, { message: '没有这份分配' })
  const { error } = await db.from('org_custom_course_assignment').update({ removed_at: new Date().toISOString() }).eq('id', assignmentId)
  if (error) return failed(error.message)
  return listCourses(db, orgId)
}

async function labelsOf(
  db: Db,
  orgId: string,
  rows: { subject_type: string; subject_id: string }[],
): Promise<Map<string, string>> {
  const labels = new Map<string, string>()
  const studentIds = rows.filter((row) => row.subject_type === 'student').map((row) => row.subject_id)
  const groupIds = rows.filter((row) => row.subject_type === 'group').map((row) => row.subject_id)
  const [students, groups] = await Promise.all([
    studentIds.length ? db.from('student').select('id, name').eq('org_id', orgId).in('id', studentIds) : Promise.resolve({ data: [] }),
    groupIds.length ? db.from('student_group').select('id, name').eq('org_id', orgId).in('id', groupIds) : Promise.resolve({ data: [] }),
  ])
  for (const student of students.data ?? []) labels.set(`student:${student.id}`, student.name)
  for (const group of groups.data ?? []) labels.set(`group:${group.id}`, group.name)
  return labels
}

function failed(message: string): Response {
  const line = message.split('\n')[0]?.replace(/^ERROR:\s*/, '') ?? ''
  if (line.includes('课程不存在')) return json(404, { message: '课程不存在' })
  if (line.includes('服务已到期')) return json(403, { message: '服务已到期，仅可查看' })
  if (line.includes('机构已停用')) return json(403, { message: '机构已停用' })
  if (
    line.includes('课程名称需要') ||
    line.includes('关卡不存在') ||
    line.includes('试用机构只能使用 Level 1') ||
    line.includes('试用机构只能使用前 3 关') ||
    line.includes('这关尚未授权') ||
    line.includes('素材不属于本机构') ||
    line.includes('学生不属于本机构') ||
    line.includes('分组不属于本机构') ||
    line.includes('环节类型不正确')
  ) {
    return json(400, { message: line })
  }
  return json(500, { message: '请求失败' })
}

interface Db {
  from(table: string): never
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: LevelRpc[] | null; error: { message: string } | null }>
}

interface LevelRpc {
  level_id: string
  sort_order: number
  title: string
  stage_level: number
  unit_id: string
  unit_title: string
  unit_sort: number
}
