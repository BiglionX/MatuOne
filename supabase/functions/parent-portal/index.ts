// 家长端。家长身份从登录会话解析，忽略请求体里的家长 id。绑定码只用来确认孩子。
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { isAcceptableBindCode, normalizeBindCode } from '../_shared/bindCode.ts'
import { toCurriculumPosition, type CurriculumPositionRow } from '../_shared/curriculumPosition.ts'
import { empty, json } from '../_shared/http.ts'
import { parentOrgAccess } from '../_shared/parentOrgAccess.ts'
import { serviceDb } from '../_shared/staff.ts'

const INVALID_CODE = '绑定码无效或已失效'
const HOUR_MS = 60 * 60 * 1000
const FAIL_LIMIT = 10

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') ?? ''
  const first = forwarded.split(',')[0]?.trim()
  if (first) return first.slice(0, 64)
  const cf = req.headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf.slice(0, 64)
  return 'unknown'
}

async function recentFailures(db: SupabaseClient, ip: string): Promise<number | Response> {
  const since = new Date(Date.now() - HOUR_MS).toISOString()
  const { count, error } = await db
    .from('bind_attempt')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('success', false)
    .gte('created_at', since)
  if (error) return json(500, { message: '读取失败' })
  return count ?? 0
}

async function recordAttempt(db: SupabaseClient, ip: string, code: string, success: boolean): Promise<Response | null> {
  const { error } = await db.from('bind_attempt').insert({
    ip,
    code_prefix: code.slice(0, 4),
    success,
  })
  if (error) return json(500, { message: '读取失败' })
  return null
}

async function resolveBindTarget(
  db: SupabaseClient,
  code: string,
): Promise<{ studentId: string } | { invalid: true } | Response> {
  if (!isAcceptableBindCode(code)) return { invalid: true }
  const { data: student, error } = await db
    .from('student')
    .select('id, org_id, status')
    .eq('bind_code', code)
    .maybeSingle()
  if (error) return json(500, { message: '读取失败' })
  if (!student || student.status !== 'active') return { invalid: true }
  const access = await parentOrgAccess(db, student.org_id as string)
  if (access instanceof Response) return access
  if (access === 'stopped') return { invalid: true }
  return { studentId: student.id as string }
}

async function saveBinding(db: SupabaseClient, parentId: string, studentId: string): Promise<Response | null> {
  const { data: existing, error } = await db
    .from('parent_binding')
    .select('id, revoked_at')
    .eq('parent_account_id', parentId)
    .eq('student_id', studentId)
    .maybeSingle()
  if (error) return json(500, { message: '绑定失败' })
  if (existing && !existing.revoked_at) return null
  if (existing) {
    const { error: updateError } = await db
      .from('parent_binding')
      .update({ revoked_at: null })
      .eq('id', existing.id)
      .eq('parent_account_id', parentId)
    if (updateError) return json(500, { message: '绑定失败' })
    return null
  }
  const { error: insertError } = await db
    .from('parent_binding')
    .insert({ parent_account_id: parentId, student_id: studentId })
  if (insertError) return json(500, { message: '绑定失败' })
  return null
}

async function requireParent(req: Request, db: SupabaseClient): Promise<{ id: string } | Response> {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anon) return json(500, { message: '服务未配置' })
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData } = await userClient.auth.getUser()
  if (!userData.user) return json(401, { message: '请先登录' })
  const { data: parent } = await db
    .from('parent_account')
    .select('id, anonymized_at')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()
  if (!parent || parent.anonymized_at) return json(401, { message: '请先登录' })
  return { id: parent.id as string }
}

function weekStart(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7))
  return copy
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })

  const dbOrError = serviceDb()
  if (dbOrError instanceof Response) return dbOrError
  const db = dbOrError

  let body: Record<string, unknown> = {}
  try {
    const parsed = await req.json()
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>
  } catch {
    body = {}
  }
  const action = typeof body.action === 'string' ? body.action : 'home'
  const parentOrError = await requireParent(req, db)
  if (parentOrError instanceof Response) return parentOrError
  const parent = parentOrError

  if (action === 'unbind') {
    const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : ''
    const { data: binding, error } = await db
      .from('parent_binding')
      .select('id')
      .eq('parent_account_id', parent.id)
      .eq('student_id', studentId)
      .is('revoked_at', null)
      .maybeSingle()
    if (error) return json(500, { message: '解除失败' })
    if (!binding) return json(404, { message: '没有这项绑定' })
    const { error: updateError } = await db
      .from('parent_binding')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', binding.id)
      .eq('parent_account_id', parent.id)
    if (updateError) return json(500, { message: '解除失败' })
    return json(200, { ok: true })
  }

  if (action === 'lookup' || action === 'bind') {
    const ip = clientIp(req)
    const code = normalizeBindCode(body.code)
    const failures = await recentFailures(db, ip)
    if (failures instanceof Response) return failures
    if (failures >= FAIL_LIMIT) {
      const recorded = await recordAttempt(db, ip, code, false)
      if (recorded) return recorded
      return json(429, { message: '尝试次数过多，请一小时后再试' })
    }
    const target = await resolveBindTarget(db, code)
    if (target instanceof Response) return target
    if (!('studentId' in target)) {
      const recorded = await recordAttempt(db, ip, code, false)
      if (recorded) return recorded
      return json(404, { message: INVALID_CODE })
    }
    if (action === 'bind') {
      const saved = await saveBinding(db, parent.id, target.studentId)
      if (saved) return saved
    }
    const recorded = await recordAttempt(db, ip, code, true)
    if (recorded) return recorded
    return json(200, { ok: true })
  }

  const { data: bindings } = await db
    .from('parent_binding')
    .select('student_id')
    .eq('parent_account_id', parent.id)
    .is('revoked_at', null)
  const ids = (bindings ?? []).map((row) => row.student_id as string)
  if (!ids.length) return json(200, { children: [], stopped: [] })

  const { data: students } = await db
    .from('student')
    .select('id, name, org_id, group_id, status, current_level_order, last_active_at')
    .in('id', ids)
  const children = []
  const stopped: { name: string; message: '机构服务已停止' }[] = []
  for (const student of students ?? []) {
    const access = await parentOrgAccess(db, student.org_id as string)
    if (access instanceof Response) return access
    if (access === 'stopped') {
      stopped.push({ name: student.name as string, message: '机构服务已停止' })
      continue
    }
    const [{ data: org }, { data: group }, { data: progress }, { count }, { data: sessions }, { data: typing }] = await Promise.all([
      db.from('org').select('name').eq('id', student.org_id).maybeSingle(),
      db.from('student_group').select('name').eq('id', student.group_id).maybeSingle(),
      db.from('learning_record').select('level_id, completed, updated_at').eq('student_id', student.id),
      db.from('course_level').select('level_id', { count: 'exact', head: true }).eq('published', true),
      db.from('study_session').select('level_id, started_at, ended_at').eq('student_id', student.id),
      db.from('typing_record').select('practiced_on, wpm, accuracy').eq('student_id', student.id),
    ])
    const completedRows = (progress ?? []).filter((row) => row.completed === true)
    const completedCount = completedRows.length
    const totalLevels = count ?? 0
    const order = Math.min(totalLevels || 1, Math.max(1, student.current_level_order as number))
    const { data: currentLevel } = await db.from('course_level').select('title').eq('sort_order', order).maybeSingle()
    const start = weekStart(new Date())
    const weeklySessions = (sessions ?? []).filter((row) => new Date(row.started_at).getTime() >= start.getTime())
    const minutes = weeklySessions.reduce((sum, row) => {
      if (!row.ended_at) return sum
      const span = (new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()) / 60000
      return sum + Math.min(45, Math.max(0, span))
    }, 0)
    const last = [...(sessions ?? [])].sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)))[0]
    const weekStartMs = start.getTime()
    const weeklyIds = new Set<string>()
    for (const row of completedRows) {
      if (row.updated_at && new Date(row.updated_at as string).getTime() >= weekStartMs) weeklyIds.add(row.level_id as string)
    }
    const briefIds = completedRows.map((row) => row.level_id as string)
    const copies = briefIds.length
      ? await db.from('course_level').select('level_id, sort_order, title, parent_brief').in('level_id', briefIds)
      : { data: [] as { level_id: string; sort_order: number; title: string; parent_brief: string | null }[] }
    const briefs = (copies.data ?? [])
      .map((row) => ({
        levelId: row.level_id as string,
        order: row.sort_order as number,
        title: row.title as string,
        parentBrief: (row.parent_brief as string | null) ?? null,
      }))
      .sort((a, b) => a.order - b.order)
    const learnedIds = new Set(completedRows.map((row) => row.level_id as string))
    children.push({
      student: {
        id: student.id,
        orgId: student.org_id,
        groupId: student.group_id,
        name: student.name,
        status: student.status,
        currentLevelOrder: student.current_level_order,
        lastActiveAt: student.last_active_at ?? '',
      },
      groupName: group?.name ?? '未分组',
      orgName: org?.name ?? '',
      currentLevelTitle: currentLevel?.title ?? `第 ${order} 关`,
      currentLevelOrder: order,
      totalLevels: totalLevels || 12,
      completedCount,
      weekly: {
        weekStart: start.toISOString().slice(0, 10),
        sessions: weeklySessions.length,
        totalMinutes: Math.round(minutes),
        lastStudyDate: last ? String(last.started_at).slice(0, 10) : null,
      },
      typingSeries: bucket(typing ?? []),
      learnedLessons: briefs.filter((row) => learnedIds.has(row.levelId)),
      weeklyLessons: briefs.filter((row) => weeklyIds.has(row.levelId)),
      position: await curriculumPosition(db, student.id as string),
    })
  }
  if (!children.length && stopped.length) return json(403, { message: '机构服务已停止' })
  return json(200, { children, stopped })
})

async function curriculumPosition(db: SupabaseClient, studentId: string) {
  const { data } = await db.rpc('student_curriculum_position', { p_student_id: studentId })
  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') return null
  return toCurriculumPosition(row as CurriculumPositionRow)
}

function bucket(rows: { practiced_on: string; wpm: number; accuracy: number }[]) {
  const thisWeek = weekStart(new Date())
  return [3, 2, 1, 0].map((ago) => {
    const start = new Date(thisWeek)
    start.setDate(start.getDate() - ago * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const matched = rows.filter((row) => {
      const day = new Date(`${row.practiced_on}T00:00:00`)
      return day >= start && day < end
    })
    const label = `${start.getMonth() + 1}/${start.getDate()}`
    if (!matched.length) return { weekStart: start.toISOString().slice(0, 10), label, wpm: null, accuracy: null }
    const wpm = matched.reduce((sum, row) => sum + Number(row.wpm), 0) / matched.length
    const accuracy = matched.reduce((sum, row) => sum + Number(row.accuracy), 0) / matched.length
    return {
      weekStart: start.toISOString().slice(0, 10),
      label,
      wpm: Math.round(wpm * 10) / 10,
      accuracy: Math.round(accuracy * 10) / 10,
    }
  })
}
