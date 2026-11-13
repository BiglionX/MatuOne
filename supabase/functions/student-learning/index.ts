// 学生学习记录。studentId 从登录用户解析，请求体里的 studentId 忽略。
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { decideEnterLevel } from '../_shared/enterLevel.ts'
import { empty, json } from '../_shared/http.ts'
import { isLevelEntitled, levelOrderOf } from '../_shared/orgStatus.ts'

function weekStart(date: Date): Date {
  const copy = new Date(date)
  const day = (copy.getDay() + 6) % 7
  copy.setHours(0, 0, 0, 0)
  copy.setDate(copy.getDate() - day)
  return copy
}

function labelOf(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
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
  const action = typeof body.action === 'string' ? body.action : 'map'
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: student } = await db
    .from('student')
    .select('id, org_id, group_id, name, account, status, bind_code, current_level_order, last_active_at')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()
  if (!student || student.status !== 'active') return json(401, { message: '请先登录' })

  const levelRaw = body.levelId
  const requestedLevelId =
    typeof levelRaw === 'number' && Number.isInteger(levelRaw)
      ? String(levelRaw)
      : typeof levelRaw === 'string'
        ? levelRaw.trim()
        : ''

  if (action === 'typing') {
    // 热身打字没有关卡号。用 L01 走同一套判定：停用、到期、未开通会被拒绝；请求里若带了 levelId，按该关拒绝。
    const decision = await decideEnterLevel(db, student.id, requestedLevelId || 'L01')
    if (!decision.result.allowed) return json(decision.httpStatus, decision.result)
    const raw = body.practiceType === 'baseline_keys' ? 'home_row' : body.practiceType
    if (raw !== 'home_row' && raw !== 'keywords' && raw !== 'lesson_embedded') {
      return json(400, { message: '练习类型不正确' })
    }
    const wpm = Number(body.wpm)
    const accuracy = Number(body.accuracy)
    if (!Number.isFinite(wpm) || !Number.isFinite(accuracy)) return json(400, { message: '打字记录不完整' })
    const { error } = await db.from('typing_record').insert({
      student_id: student.id,
      practiced_on: new Date().toISOString().slice(0, 10),
      practice_type: raw,
      wpm,
      accuracy,
    })
    if (error) return json(500, { message: '保存失败' })
    return json(200, { ok: true })
  }

  if (action === 'series') {
    const { data } = await db
      .from('typing_record')
      .select('practiced_on, wpm, accuracy')
      .eq('student_id', student.id)
    return json(200, { series: bucketTyping(data ?? []) })
  }

  if (action === 'touch') {
    const decision = await decideEnterLevel(db, student.id, requestedLevelId)
    if (!decision.result.allowed) return json(decision.httpStatus, decision.result)
    await db.from('study_session').update({ ended_at: new Date().toISOString() }).eq('student_id', student.id).is('ended_at', null)
    await db.from('study_session').insert({ student_id: student.id, level_id: decision.levelId })
    await db.from('student').update({ last_active_at: new Date().toISOString() }).eq('id', student.id)
    return json(200, { ok: true })
  }

  if (action === 'complete') {
    const decision = await decideEnterLevel(db, student.id, requestedLevelId)
    if (!decision.result.allowed) return json(decision.httpStatus, decision.result)
    const levelId = decision.levelId
    const order = levelOrderOf(levelId)
    const stars = Number(body.stars)
    const errorTaps = Number(body.errorTaps ?? 0)
    if (!order || !Number.isInteger(stars) || stars < 0 || stars > 3) return json(400, { message: '完成记录不完整' })
    const now = new Date().toISOString()
    await db.from('study_session').update({ ended_at: now }).eq('student_id', student.id).is('ended_at', null)
    const { data: existing } = await db
      .from('level_progress')
      .select('id, runs')
      .eq('student_id', student.id)
      .eq('level_id', levelId)
      .maybeSingle()
    const patch = {
      completed: true,
      stars,
      change_done: true,
      error_taps: Number.isFinite(errorTaps) ? errorTaps : 0,
      runs: (existing?.runs ?? 0) + 1,
      updated_at: now,
    }
    if (existing) await db.from('level_progress').update(patch).eq('id', existing.id)
    else await db.from('level_progress').insert({ student_id: student.id, level_id: levelId, ...patch })
    if (order + 1 > student.current_level_order) {
      await db.from('student').update({ current_level_order: order + 1, last_active_at: now }).eq('id', student.id)
    } else {
      await db.from('student').update({ last_active_at: now }).eq('id', student.id)
    }
    return json(200, { ok: true })
  }

  if (action === 'level') {
    const decision = await decideEnterLevel(db, student.id, requestedLevelId)
    if (!decision.result.allowed) return json(decision.httpStatus, decision.result)
    const [{ data: found }, { data: levelHints }] = await Promise.all([
      db.from('course_level').select('body').eq('level_id', decision.levelId).eq('published', true).maybeSingle(),
      db.from('error_hint').select('pattern, friendly_message'),
    ])
    if (!found) return json(404, { message: '没有找到这一关' })
    return json(200, { level: found.body, hints: levelHints ?? [] })
  }

  const { data: levels } = await db
    .from('course_level')
    .select('level_id, sort_order, title, goal, body')
    .eq('published', true)
    .order('sort_order', { ascending: true })
  const { data: org } = await db.from('org').select('id, status, trial_expire_at, service_end_at, name').eq('id', student.org_id).maybeSingle()
  const { data: status } = await db.rpc('effective_org_status', {
    p_status: org?.status ?? 'disabled',
    p_trial_expire_at: org?.trial_expire_at ?? null,
    p_service_end_at: org?.service_end_at ?? null,
  })
  const { data: entitlements } = await db
    .from('level_entitlement')
    .select('org_id, subject_type, subject_id, level_order_min, level_order_max, expires_at')
    .eq('org_id', student.org_id)
  const { data: progressRows } = await db.from('level_progress').select('level_id, completed, stars').eq('student_id', student.id)
  const { data: hints } = await db.from('error_hint').select('pattern, friendly_message')
  const { data: group } = await db.from('student_group').select('name').eq('id', student.group_id).maybeSingle()

  const progress = new Map((progressRows ?? []).map((row) => [row.level_id as string, row]))
  const open = (entitlements ?? []).filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now())
  const spans = open.map((row) => ({
    orgId: row.org_id as string,
    subjectType: row.subject_type as 'org' | 'group' | 'student',
    subjectId: row.subject_id as string,
    levelOrderMin: row.level_order_min as number,
    levelOrderMax: row.level_order_max as number,
  }))

  const published = levels ?? []
  let seenIncomplete = false
  const entries = published.map((level) => {
    const order = level.sort_order as number
    const row = progress.get(level.level_id)
    const completed = Boolean(row?.completed)
    const entitled = isLevelEntitled(spans, student.org_id, student.group_id, student.id, order)
    const openStatus = status === 'trial' || status === 'active'
    const trialOk = status !== 'trial' || order <= 3
    const unlocked = entitled && openStatus && trialOk && (completed || !seenIncomplete)
    if (!completed) seenIncomplete = true
    const current = unlocked && !completed && !published.some((other) => {
      const otherOrder = other.sort_order as number
      return otherOrder < order && !progress.get(other.level_id)?.completed
    })
    return {
      levelId: level.level_id,
      order,
      title: level.title,
      goal: level.goal,
      isReview: Boolean((level.body as { is_review?: boolean } | null)?.is_review),
      completed,
      stars: (row?.stars ?? 0) as 0 | 1 | 2 | 3,
      unlocked,
      current,
    }
  })

  const { data: typingRows } = await db.from('typing_record').select('practiced_on, wpm, accuracy, created_at').eq('student_id', student.id)
  const latest = [...(typingRows ?? [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]

  return json(200, {
    orgName: org?.name ?? '',
    groupName: group?.name ?? '未分组',
    student: {
      id: student.id,
      orgId: student.org_id,
      groupId: student.group_id,
      name: student.name,
      account: student.account,
      status: 'active',
      currentLevelOrder: student.current_level_order,
      lastActiveAt: student.last_active_at ?? '',
      bindCode: student.bind_code ?? '',
    },
    entries,
    completedCount: entries.filter((entry) => entry.completed).length,
    currentOrder: entries.find((entry) => entry.current)?.order ?? entries.filter((entry) => entry.completed).length,
    hints: hints ?? [],
    typingSeries: bucketTyping(typingRows ?? []),
    latestTyping: latest ? { wpm: Number(latest.wpm), accuracy: Number(latest.accuracy) } : null,
  })
})

function bucketTyping(rows: { practiced_on: string; wpm: number; accuracy: number }[]) {
  const thisWeek = weekStart(new Date())
  const weeks = [3, 2, 1, 0].map((ago) => {
    const start = new Date(thisWeek)
    start.setDate(start.getDate() - ago * 7)
    return start
  })
  return weeks.map((start) => {
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const matched = rows.filter((row) => {
      const day = new Date(`${row.practiced_on}T00:00:00`)
      return day >= start && day < end
    })
    if (!matched.length) return { weekStart: start.toISOString().slice(0, 10), label: labelOf(start), wpm: null, accuracy: null }
    const wpm = matched.reduce((sum, row) => sum + Number(row.wpm), 0) / matched.length
    const accuracy = matched.reduce((sum, row) => sum + Number(row.accuracy), 0) / matched.length
    return { weekStart: start.toISOString().slice(0, 10), label: labelOf(start), wpm: Math.round(wpm * 10) / 10, accuracy: Math.round(accuracy * 10) / 10 }
  })
}
