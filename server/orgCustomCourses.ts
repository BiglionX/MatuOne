import { dbMessage, one, q } from './db'
import { isUuid } from '../supabase/functions/_shared/orgMaterialFile'

interface HandlerResult {
  status: number
  body: unknown
}

const ok = (body: unknown, status = 200): HandlerResult => ({ status, body })
const fail = (status: number, message: string): HandlerResult => ({ status, body: { message } })

interface CourseRow extends Record<string, unknown> {
  id: string
  title: string
  created_at: string
  section_count: number
}

interface SectionRow extends Record<string, unknown> {
  id: string
  course_id: string
  section_order: number
  type: string
  platform_level_id: string | null
  material_id: string | null
  title: string
}

interface LevelRow extends Record<string, unknown> {
  level_id: string
  sort_order: number
  title: string
  stage_level: number
  unit_id: string
  unit_title: string
  unit_sort: number
}

interface AssignmentRow extends Record<string, unknown> {
  id: string
  course_id: string
  subject_type: string
  subject_id: string
  label: string | null
}

const KNOWN_400 = [
  '课程名称需要',
  '一门课程最多',
  '课程环节格式不正确',
  '关卡不存在',
  '试用机构只能使用 Level 1',
  '试用机构只能使用前 3 关',
  '这关尚未授权',
  '素材不属于本机构',
  '学生不属于本机构',
  '分组不属于本机构',
  '环节类型不正确',
]

function courseFailure(message: string, fallback: string): { status: number; message: string } {
  const line = message.split('\n')[0]?.replace(/^ERROR:\s*/, '') ?? ''
  if (line.includes('课程不存在')) return { status: 404, message: '课程不存在' }
  if (line.includes('没有这份分配')) return { status: 404, message: '没有这份分配' }
  if (line.includes('服务已到期')) return { status: 403, message: '服务已到期，仅可查看' }
  if (line.includes('机构已停用')) return { status: 403, message: '机构已停用' }
  if (KNOWN_400.some((item) => line.includes(item))) return { status: 400, message: line }
  if (line.includes('does not exist')) return { status: 500, message: '课程组装还没有准备好' }
  return { status: 500, message: fallback }
}

function presentSection(row: SectionRow) {
  return {
    id: row.id,
    courseId: row.course_id,
    order: Number(row.section_order),
    type: row.type,
    platformLevelId: row.platform_level_id,
    materialId: row.material_id,
    title: row.title,
  }
}

function presentLevel(row: LevelRow) {
  return {
    levelId: row.level_id,
    order: Number(row.sort_order),
    title: row.title,
    stageLevel: Number(row.stage_level),
    unitId: row.unit_id,
    unitTitle: row.unit_title,
    unitSort: Number(row.unit_sort),
  }
}

function presentAssignment(row: AssignmentRow) {
  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    label: row.label || '未命名',
  }
}

/** orgId 只来自机构会话。courseId 用来点名本机构的一门课。 */
export async function handleOrgCustomCourses(body: Record<string, unknown>, orgId: string, action: string): Promise<HandlerResult> {
  try {
    if (action === 'list') return await listCourses(orgId)
    if (action === 'create') return await createCourse(body, orgId)
    if (action === 'read') return await readCourse(body, orgId)
    if (action === 'save') return await saveCourse(body, orgId)
    if (action === 'assign') return await assignCourse(body, orgId)
    if (action === 'unassign') return await unassignCourse(body, orgId)
    if (action === 'remove') return await removeCourse(body, orgId)
    return fail(400, '没有这个操作')
  } catch (error) {
    const mapped = courseFailure(dbMessage(error), '请求失败')
    return fail(mapped.status, mapped.message)
  }
}

async function listCourses(orgId: string): Promise<HandlerResult> {
  const [courses, assignments] = await Promise.all([
    q<CourseRow>(
      `select c.id, c.title, c.created_at,
              (select count(*)::int from public.org_custom_section s
                where s.course_id = c.id and s.removed_at is null) as section_count
       from public.org_custom_course c
       where c.org_id = $1 and c.removed_at is null
       order by c.created_at desc`,
      [orgId],
    ),
    q<AssignmentRow>(
      `select a.id, a.course_id, a.subject_type, a.subject_id,
              case when a.subject_type = 'group' then g.name else st.name end as label
       from public.org_custom_course_assignment a
       join public.org_custom_course c on c.id = a.course_id
       left join public.student_group g on a.subject_type = 'group' and g.id = a.subject_id
       left join public.student st on a.subject_type = 'student' and st.id = a.subject_id
       where c.org_id = $1 and c.removed_at is null and a.removed_at is null
       order by a.created_at asc`,
      [orgId],
    ),
  ])
  return ok(
    courses.map((course) => ({
      id: course.id,
      title: course.title,
      createdAt: String(course.created_at),
      sectionCount: Number(course.section_count),
      assignments: assignments.filter((item) => item.course_id === course.id).map(presentAssignment),
    })),
  )
}

async function createCourse(body: Record<string, unknown>, orgId: string): Promise<HandlerResult> {
  const requested = typeof body.title === 'string' ? body.title.trim() : ''
  const title = requested || '未命名课程'
  if (title.length > 80) return fail(400, '课程名称需要 1–80 个字')
  const row = await one<{ id: string; title: string; created_at: string } & Record<string, unknown>>(
    `insert into public.org_custom_course (org_id, title)
     values ($1, $2)
     returning id, title, created_at`,
    [orgId, title],
  )
  if (!row) return fail(500, '创建失败')
  return ok({ id: row.id, title: row.title, createdAt: String(row.created_at), sections: [], levels: [] })
}

async function readCourse(body: Record<string, unknown>, orgId: string): Promise<HandlerResult> {
  const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : ''
  if (!isUuid(courseId)) return fail(404, '课程不存在')
  const course = await one<{ id: string; title: string; created_at: string } & Record<string, unknown>>(
    `select id, title, created_at
     from public.org_custom_course
     where id = $1 and org_id = $2 and removed_at is null`,
    [courseId, orgId],
  )
  if (!course) return fail(404, '课程不存在')
  const [sections, levels] = await Promise.all([
    q<SectionRow>(
      `select id, course_id, "order" as section_order, type, platform_level_id, material_id, title
       from public.org_custom_section
       where course_id = $1 and removed_at is null
       order by "order"`,
      [courseId],
    ),
    q<LevelRow>(`select * from public.org_platform_levels_for_org($1::uuid)`, [orgId]),
  ])
  return ok({
    id: course.id,
    title: course.title,
    createdAt: String(course.created_at),
    sections: sections.map(presentSection),
    levels: levels.map(presentLevel),
  })
}

async function saveCourse(body: Record<string, unknown>, orgId: string): Promise<HandlerResult> {
  const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : ''
  const title = typeof body.title === 'string' ? body.title : ''
  if (!isUuid(courseId)) return fail(404, '课程不存在')
  if (!Array.isArray(body.sections)) return fail(400, '课程环节格式不正确')
  const sections = body.sections.map((item) => {
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    return {
      type: row.type === 'material' ? 'material' : row.type === 'platform_level' ? 'platform_level' : '',
      platformLevelId: typeof row.platformLevelId === 'string' ? row.platformLevelId : '',
      materialId: typeof row.materialId === 'string' ? row.materialId : '',
    }
  })
  const saved = await one<{ course: unknown } & Record<string, unknown>>(
    `select public.save_org_custom_course($1::uuid, $2::uuid, $3, $4::jsonb) as course`,
    [orgId, courseId, title, JSON.stringify(sections)],
  )
  const course = typeof saved?.course === 'string' ? JSON.parse(saved.course) : saved?.course
  if (!course || typeof course !== 'object') return fail(500, '保存失败')
  return ok(course)
}

async function assignCourse(body: Record<string, unknown>, orgId: string): Promise<HandlerResult> {
  const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : ''
  const subjectType = body.subjectType === 'group' || body.subjectType === 'student' ? body.subjectType : ''
  const subjectId = typeof body.subjectId === 'string' ? body.subjectId.trim() : ''
  if (!isUuid(courseId)) return fail(404, '课程不存在')
  if (!subjectType || !isUuid(subjectId)) return fail(400, subjectType === 'group' ? '分组不属于本机构' : '学生不属于本机构')
  const course = await one('select id from public.org_custom_course where id = $1 and org_id = $2 and removed_at is null', [courseId, orgId])
  if (!course) return fail(404, '课程不存在')
  await q(
    `insert into public.org_custom_course_assignment (course_id, subject_type, subject_id)
     values ($1, $2, $3)
     on conflict (course_id, subject_type, subject_id) where removed_at is null do nothing`,
    [courseId, subjectType, subjectId],
  )
  return listCourses(orgId)
}

async function removeCourse(body: Record<string, unknown>, orgId: string): Promise<HandlerResult> {
  const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : ''
  if (!isUuid(courseId)) return fail(404, '课程不存在')
  const row = await one(
    `update public.org_custom_course
     set removed_at = now()
     where id = $1 and org_id = $2 and removed_at is null
     returning id`,
    [courseId, orgId],
  )
  if (!row) return fail(404, '课程不存在')
  await q(
    `update public.org_custom_course_assignment
     set removed_at = now()
     where course_id = $1 and removed_at is null`,
    [courseId],
  )
  return listCourses(orgId)
}

async function unassignCourse(body: Record<string, unknown>, orgId: string): Promise<HandlerResult> {
  const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId.trim() : ''
  if (!isUuid(assignmentId)) return fail(404, '没有这份分配')
  const row = await one(
    `update public.org_custom_course_assignment a
     set removed_at = now()
     from public.org_custom_course c
     where a.id = $1 and a.course_id = c.id and c.org_id = $2 and a.removed_at is null
     returning a.id`,
    [assignmentId, orgId],
  )
  if (!row) return fail(404, '没有这份分配')
  return listCourses(orgId)
}
