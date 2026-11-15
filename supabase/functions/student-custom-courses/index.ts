// 学生的机构专属课。studentId 从登录用户解析，请求体里的 studentId 忽略。
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { decideEnterLevel } from '../_shared/enterLevel.ts'
import { empty, json } from '../_shared/http.ts'
import { signedMaterialUrl } from '../_shared/orgMaterialFile.ts'

interface OutlineRow {
  course_id: string
  course_title: string
  read_only: boolean
  section_index: number
  section_order: number
  section_type: string
  section_title: string
  completed: boolean
}

interface SectionRow {
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

function failure(message: string) {
  if (message.includes('请先登录')) return json(401, { message: '请先登录' })
  if (message.includes('机构已停用')) return json(403, { message: '机构已停用，请联系老师' })
  if (message.includes('本机构服务已到期')) return json(403, { message: '本机构服务已到期，请联系老师' })
  if (message.includes('课程不存在')) return json(404, { message: '课程不存在' })
  if (message.includes('这门课没有分给你')) return json(403, { message: '这门课没有分给你' })
  if (message.includes('环节不存在')) return json(404, { message: '没有这一节' })
  if (message.includes('前面的环节还没完成')) return json(403, { message: '前面的环节还没完成' })
  return json(500, { message: '专属课读取失败' })
}

function presentOutline(rows: OutlineRow[]) {
  const courses: {
    id: string
    title: string
    sections: { index: number; order: number; type: string; title: string; completed: boolean; unlocked: boolean }[]
  }[] = []
  let readOnly = false
  for (const row of rows) {
    if (row.section_type !== 'platform_level' && row.section_type !== 'material') continue
    readOnly = row.read_only === true
    let course = courses.find((item) => item.id === row.course_id)
    if (!course) {
      course = { id: row.course_id, title: row.course_title, sections: [] }
      courses.push(course)
    }
    course.sections.push({
      index: Number(row.section_index),
      order: Number(row.section_order),
      type: row.section_type,
      title: row.section_title,
      completed: row.completed === true,
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })

  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anon || !serviceKey) return json(500, { message: '服务未配置' })

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData } = await userClient.auth.getUser()
  if (!userData.user) return json(401, { message: '请先登录' })

  let body: Record<string, unknown> = {}
  try {
    const parsed = await req.json()
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>
  } catch {
    body = {}
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: student } = await db
    .from('student')
    .select('id, status, current_level_order')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()
  if (!student || student.status !== 'active') return json(401, { message: '请先登录' })

  const action = typeof body.action === 'string' ? body.action : 'list'
  if (action === 'list') {
    const { data, error } = await db.rpc('student_custom_course_outline', { p_student_id: student.id })
    if (error) return failure(error.message)
    return json(200, presentOutline((data ?? []) as OutlineRow[]))
  }

  const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : ''
  const rawIndex = body.sectionIndex
  const sectionIndex = typeof rawIndex === 'number' ? rawIndex : typeof rawIndex === 'string' ? Number(rawIndex) : NaN
  if (!courseId || !Number.isInteger(sectionIndex) || sectionIndex < 0) return json(400, { message: '没有这一节' })

  const opened = await db.rpc('student_custom_section_at', {
    p_student_id: student.id,
    p_course_id: courseId,
    p_index: sectionIndex,
  })
  if (opened.error) return failure(opened.error.message)
  const row = ((opened.data ?? []) as SectionRow[])[0]
  if (!row) return json(404, { message: '没有这一节' })

  if (action === 'open') {
    const shared = {
      courseId,
      courseTitle: row.course_title,
      index: Number(row.section_index),
      title: row.section_title,
      nextIndex: row.next_index == null ? null : Number(row.next_index),
      readOnly: row.read_only === true,
    }
    if (row.section_type === 'platform_level') {
      if (!row.platform_level_id) return json(404, { message: '没有找到这一关' })
      const decision = await decideEnterLevel(db, student.id, row.platform_level_id)
      if (!decision.result.allowed) return json(decision.httpStatus, decision.result)
      return json(200, { ...shared, kind: 'platform_level', levelId: decision.levelId })
    }
    const fileType = row.file_type === 'image' || row.file_type === 'pdf' || row.file_type === 'ppt' || row.file_type === 'text' ? row.file_type : 'text'
    const fileUrl = (fileType === 'image' || fileType === 'pdf') && row.file_url ? await signedMaterialUrl(db.storage, row.file_url) : null
    return json(200, {
      ...shared,
      kind: 'material',
      fileType,
      fileUrl,
      content: row.content,
    })
  }

  if (action === 'complete') {
    if (row.section_type === 'platform_level') {
      if (!row.platform_level_id) return json(404, { message: '没有找到这一关' })
      const decision = await decideEnterLevel(db, student.id, row.platform_level_id)
      if (!decision.result.allowed) return json(decision.httpStatus, decision.result)
      const stars = Number(body.stars)
      const errorTaps = Number(body.errorTaps ?? 0)
      if (!Number.isInteger(stars) || stars < 0 || stars > 3) return json(400, { message: '完成记录不完整' })
      const { data: level } = await db.from('course_level').select('sort_order').eq('level_id', decision.levelId).maybeSingle()
      const { data: existing } = await db
        .from('learning_record')
        .select('runs')
        .eq('student_id', student.id)
        .eq('level_id', decision.levelId)
        .maybeSingle()
      const { error: writeError } = await db.from('learning_record').upsert(
        {
          student_id: student.id,
          level_id: decision.levelId,
          completed: true,
          stars,
          change_done: true,
          error_taps: Number.isFinite(errorTaps) ? errorTaps : 0,
          runs: Number(existing?.runs ?? 0) + 1,
        },
        { onConflict: 'student_id,level_id' },
      )
      if (writeError) return json(500, { message: '这一节没有记下来' })
      const order = Number(level?.sort_order ?? 0)
      if (order + 1 > Number(student.current_level_order)) {
        await db.from('student').update({ current_level_order: order + 1, last_active_at: new Date().toISOString() }).eq('id', student.id)
      }
    }
    const saved = await db.rpc('complete_org_custom_section', {
      p_student_id: student.id,
      p_course_id: courseId,
      p_index: sectionIndex,
    })
    if (saved.error) return failure(saved.error.message)
    const nextIndex = saved.data == null ? null : Number(saved.data)
    return json(200, { ok: true, nextIndex: Number.isInteger(nextIndex) ? nextIndex : null })
  }

  return json(400, { message: '没有这个操作' })
})
