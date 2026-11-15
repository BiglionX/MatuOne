import { dbMessage, one, q } from './db'
import { decideStudentLevel } from './enter'
import { resolveStoredLevel } from './curriculum'
import { signMaterialUrl } from './materialStorage'
import { isUuid } from '../supabase/functions/_shared/orgMaterialFile'
import type { OrgCustomSectionType, OrgMaterialFileType } from '../src/types/orgMaterial'

interface HandlerResult {
  status: number
  body: unknown
}

const ok = (body: unknown, status = 200): HandlerResult => ({ status, body })
const fail = (status: number, message: string): HandlerResult => ({ status, body: { message } })

interface OutlineRow extends Record<string, unknown> {
  course_id: string
  course_title: string
  read_only: boolean
  section_index: number
  section_order: number
  section_type: string
  section_title: string
  completed: boolean
}

interface SectionAtRow extends Record<string, unknown> {
  course_title: string
  section_index: number
  next_index: number | null
  section_type: string
  section_title: string
  platform_level_id: string | null
  file_type: string | null
  file_url: string | null
  content: string | null
  material_name: string | null
  read_only: boolean
}

function failure(error: unknown, fallback: string): HandlerResult {
  const line = dbMessage(error).split('\n')[0]?.replace(/^ERROR:\s*/, '') ?? ''
  if (line.includes('请先登录')) return fail(401, '请先登录')
  if (line.includes('机构已停用')) return fail(403, '机构已停用，请联系老师')
  if (line.includes('本机构服务已到期')) return fail(403, '本机构服务已到期，请联系老师')
  if (line.includes('课程不存在')) return fail(404, '课程不存在')
  if (line.includes('这门课没有分给你')) return fail(403, '这门课没有分给你')
  if (line.includes('环节不存在')) return fail(404, '没有这一节')
  if (line.includes('前面的环节还没完成')) return fail(403, '前面的环节还没完成')
  if (line.includes('does not exist')) return fail(500, '机构专属课还没有准备好')
  return fail(500, fallback)
}

function flag(value: unknown): boolean {
  return value === true || value === 't' || value === 'true'
}

function asType(value: string): OrgCustomSectionType | null {
  return value === 'platform_level' || value === 'material' ? value : null
}

function asFileType(value: string | null): OrgMaterialFileType {
  if (value === 'image' || value === 'pdf' || value === 'ppt' || value === 'text') return value
  return 'text'
}

function presentOutline(rows: OutlineRow[]) {
  const courses: {
    id: string
    title: string
    sections: { index: number; order: number; type: OrgCustomSectionType; title: string; completed: boolean; unlocked: boolean }[]
  }[] = []
  let readOnly = false
  for (const row of rows) {
    const type = asType(row.section_type)
    if (!type) continue
    readOnly = flag(row.read_only)
    let course = courses.find((item) => item.id === row.course_id)
    if (!course) {
      course = { id: row.course_id, title: row.course_title, sections: [] }
      courses.push(course)
    }
    course.sections.push({
      index: Number(row.section_index),
      order: Number(row.section_order),
      type,
      title: row.section_title,
      completed: flag(row.completed),
      unlocked: false,
    })
  }
  for (const course of courses) {
    course.sections.sort((a, b) => a.index - b.index)
    let open = true
    for (const section of course.sections) {
      section.unlocked = open
      if (!section.completed) open = false
    }
  }
  return { readOnly, courses }
}

async function writePlatformPass(studentId: string, levelId: string, stars: number, taps: number): Promise<void> {
  await q(
    `insert into public.learning_record (student_id, level_id, completed, stars, change_done, error_taps, runs)
     values ($1, $2, true, $3, true, $4, 1)
     on conflict (student_id, level_id) do update set
       completed = true,
       stars = excluded.stars,
       change_done = true,
       error_taps = excluded.error_taps,
       runs = public.learning_record.runs + 1,
       updated_at = now()`,
    [studentId, levelId, stars, taps],
  )
}

function courseIdOf(body: Record<string, unknown>): string {
  return typeof body.courseId === 'string' ? body.courseId.trim() : ''
}

function indexOf(body: Record<string, unknown>): number | null {
  const value = body.sectionIndex
  const index = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  if (!Number.isInteger(index) || index < 0 || index > 500) return null
  return index
}

export async function handleStudentCustomCourses(
  body: Record<string, unknown>,
  studentId: string,
  action: string,
): Promise<HandlerResult> {
  if (action === 'list') {
    try {
      const rows = await q<OutlineRow>('select * from public.student_custom_course_outline($1::uuid)', [studentId])
      return ok(presentOutline(rows))
    } catch (error) {
      return failure(error, '专属课读取失败')
    }
  }

  const courseId = courseIdOf(body)
  const sectionIndex = indexOf(body)
  if (!isUuid(courseId)) return fail(400, '课程不存在')
  if (sectionIndex == null) return fail(400, '没有这一节')

  if (action === 'open') {
    try {
      const row = await one<SectionAtRow>(
        'select * from public.student_custom_section_at($1::uuid, $2::uuid, $3::int)',
        [studentId, courseId, sectionIndex],
      )
      if (!row) return fail(404, '没有这一节')
      const type = asType(row.section_type)
      if (!type) return fail(500, '专属课读取失败')
      const nextIndex = row.next_index == null ? null : Number(row.next_index)
      const shared = {
        courseId,
        courseTitle: row.course_title,
        index: Number(row.section_index),
        title: row.section_title,
        nextIndex,
        readOnly: flag(row.read_only),
      }
      if (type === 'platform_level') {
        if (!row.platform_level_id) return fail(404, '没有找到这一关')
        const decision = await decideStudentLevel(studentId, row.platform_level_id)
        if (!decision.result.allowed) return { status: decision.httpStatus, body: decision.result }
        return ok({ ...shared, kind: 'platform_level', levelId: decision.levelId })
      }
      const fileType = asFileType(row.file_type)
      const path = row.file_url ?? ''
      const fileUrl = fileType === 'image' || fileType === 'pdf' ? await signMaterialUrl(path) : null
      return ok({
        ...shared,
        kind: 'material',
        fileType,
        fileUrl,
        content: row.content,
      })
    } catch (error) {
      return failure(error, '这一节打开失败')
    }
  }

  if (action === 'complete') {
    try {
      const row = await one<SectionAtRow>(
        'select * from public.student_custom_section_at($1::uuid, $2::uuid, $3::int)',
        [studentId, courseId, sectionIndex],
      )
      if (!row) return fail(404, '没有这一节')
      if (row.section_type === 'platform_level') {
        if (!row.platform_level_id) return fail(404, '没有找到这一关')
        const decision = await decideStudentLevel(studentId, row.platform_level_id)
        if (!decision.result.allowed) return { status: decision.httpStatus, body: decision.result }
        const stars = Number(body.stars)
        const errorTaps = Number(body.errorTaps ?? 0)
        if (!Number.isInteger(stars) || stars < 0 || stars > 3) return fail(400, '完成记录不完整')
        const stored = await resolveStoredLevel(decision.levelId)
        if (!stored) return fail(400, '没有找到这一关')
        const taps = Number.isFinite(errorTaps) ? errorTaps : 0
        await writePlatformPass(studentId, stored.levelId, stars, taps)
        const student = await one<{ current_level_order: number }>(
          'select current_level_order from public.student where id = $1',
          [studentId],
        )
        if (student && stored.order + 1 > Number(student.current_level_order)) {
          await q('update public.student set current_level_order = $2, last_active_at = now() where id = $1', [
            studentId,
            stored.order + 1,
          ])
        } else {
          await q('update public.student set last_active_at = now() where id = $1', [studentId])
        }
      }
      const saved = await one<{ next_index: number | null }>(
        'select public.complete_org_custom_section($1::uuid, $2::uuid, $3::int) as next_index',
        [studentId, courseId, sectionIndex],
      )
      const nextIndex = saved?.next_index == null ? null : Number(saved.next_index)
      return ok({ ok: true, nextIndex })
    } catch (error) {
      return failure(error, '这一节没有记下来')
    }
  }

  return fail(400, '没有这个操作')
}
