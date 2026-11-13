// 学生学习记录。studentId 从登录用户解析，请求体里的 studentId 忽略。
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { toCurriculumPosition, type CurriculumPositionRow } from '../_shared/curriculumPosition.ts'
import { decideEnterLevel } from '../_shared/enterLevel.ts'
import { normalizeTypingScore } from '../_shared/typingScore.ts'
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
    const score = normalizeTypingScore(body.wpm, body.accuracy)
    if (!score) return json(400, { message: '打字记录无效' })
    const { error } = await db.from('typing_record').insert({
      student_id: student.id,
      practiced_on: new Date().toISOString().slice(0, 10),
      practice_type: raw,
      wpm: score.wpm,
      accuracy: score.accuracy,
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
    const stored = await findStoredLevel(db, decision.levelId)
    const levelId = stored?.level_id ?? ''
    const order = stored ? Number(stored.sort_order) : levelOrderOf(decision.levelId)
    const stars = Number(body.stars)
    const errorTaps = Number(body.errorTaps ?? 0)
    if (!levelId || !order || !Number.isInteger(stars) || stars < 0 || stars > 3) return json(400, { message: '完成记录不完整' })
    const now = new Date().toISOString()
    await db.from('study_session').update({ ended_at: now }).eq('student_id', student.id).is('ended_at', null)
    const { data: existing } = await db
      .from('learning_record')
      .select('runs')
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
    if (existing) {
      await db.from('learning_record').update(patch).eq('student_id', student.id).eq('level_id', levelId)
    } else {
      await db.from('learning_record').insert({ student_id: student.id, level_id: levelId, ...patch })
    }
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
    const [found, { data: levelHints }] = await Promise.all([
      findStoredLevel(db, decision.levelId),
      db.from('error_hint').select('pattern, friendly_message'),
    ])
    if (!found?.body) return json(404, { message: '没有找到这一关' })
    return json(200, { level: found.body, hints: levelHints ?? [] })
  }

  const position = await curriculumPosition(db, student.id)
  const stageLevel = Math.min(8, Math.max(1, Math.floor(((position?.level.sortOrder ?? 1) - 1) / 120) + 1))
  const { data: unitRows } = await db
    .from('curriculum_unit')
    .select('unit_id, title, sort_order, stage_level')
    .eq('stage_level', stageLevel)
    .lte('sort_order', 6)
    .order('sort_order', { ascending: true })
  const visibleUnits = (unitRows ?? []).filter((unit) => String(unit.unit_id).startsWith('L'))
  const unitIds = visibleUnits.map((unit) => unit.unit_id as string)
  const { data: levels } = unitIds.length
    ? await db
        .from('course_level')
        .select('level_id, sort_order, title, goal, unit_id, level_type')
        .in('unit_id', unitIds)
        .eq('published', true)
        .order('sort_order', { ascending: true })
    : { data: [] as LevelRow[] }
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
  const { data: progressRows } = await db.from('learning_record').select('level_id, completed, stars').eq('student_id', student.id)
  const { data: hints } = await db.from('error_hint').select('pattern, friendly_message')
  const { data: group } = await db.from('student_group').select('name').eq('id', student.group_id).maybeSingle()

  const progress = new Map((progressRows ?? []).map((row) => [row.level_id as string, row]))
  const { data: progressedLevels } = (progressRows ?? []).length
    ? await db.from('course_level').select('level_id, sort_order').in('level_id', (progressRows ?? []).map((row) => row.level_id as string))
    : { data: [] as { level_id: string; sort_order: number }[] }
  const orderByLevel = new Map((progressedLevels ?? []).map((row) => [row.level_id as string, Number(row.sort_order)]))
  const completedOrders = new Set(
    (progressRows ?? []).filter((row) => row.completed).map((row) => orderByLevel.get(row.level_id as string) ?? levelOrderOf(row.level_id as string) ?? 0),
  )
  let focus = 1
  while (completedOrders.has(focus) && focus <= 960) focus += 1
  const open = (entitlements ?? []).filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now())
  const spans = open.map((row) => ({
    orgId: row.org_id as string,
    subjectType: row.subject_type as 'org' | 'group' | 'student',
    subjectId: row.subject_id as string,
    levelOrderMin: row.level_order_min as number,
    levelOrderMax: row.level_order_max as number,
  }))

  const published = (levels ?? []) as LevelRow[]
  const toEntry = (level: LevelRow) => {
    const order = Number(level.sort_order)
    const row = progress.get(level.level_id)
    const completed = Boolean(row?.completed)
    const entitled = isLevelEntitled(spans, student.org_id, student.group_id, student.id, order)
    const openStatus = status === 'trial' || status === 'active'
    const trialOk = status !== 'trial' || order <= 3
    const unlocked = entitled && openStatus && trialOk && (completed || order === focus)
    const stars = Number(row?.stars ?? 0)
    return {
      levelId: level.level_id,
      order,
      title: level.title,
      goal: level.goal,
      levelType: level.level_type === 'practice' || level.level_type === 'project' || level.level_type === 'typing' ? level.level_type : 'new',
      milestoneBadge: null,
      placeholder: isPlaceholderTitle(level.title),
      is_placeholder: isPlaceholderTitle(level.title),
      isReview: false,
      completed,
      stars: stars === 1 || stars === 2 || stars === 3 ? stars : 0,
      unlocked,
      current: unlocked && !completed && order === focus,
    }
  }
  const entries = published.map(toEntry)
  const currentUnitId = published.find((level) => Number(level.sort_order) === focus)?.unit_id
    ?? visibleUnits[0]?.unit_id
    ?? ''
  const units = visibleUnits.map((unit) => {
    const unitLevels = entries.filter((entry) => published.find((level) => level.level_id === entry.levelId)?.unit_id === unit.unit_id)
    const orders = unitLevels.map((entry) => entry.order)
    const first = orders[0] ?? 0
    const last = orders[orders.length - 1] ?? 0
    const state = focus >= first && focus <= last ? 'current' : focus > last && last > 0 ? 'past' : 'future'
    return {
      unitId: unit.unit_id,
      title: unit.title,
      sortOrder: Number(unit.sort_order),
      completedCount: unitLevels.filter((entry) => entry.completed).length,
      total: unitLevels.length || 20,
      state,
    }
  })
  if (action === 'unit') {
    const unitId = typeof body.unitId === 'string' ? body.unitId.trim() : ''
    const unit = units.find((item) => item.unitId === unitId) ?? visibleUnits.find((item) => item.unit_id === unitId)
    if (!unit) return json(404, { message: '没有这个单元' })
    const title = 'title' in unit ? unit.title : unit.title
    return json(200, {
      unitId,
      title,
      levels: entries.filter((entry) => published.find((level) => level.level_id === entry.levelId)?.unit_id === unitId),
    })
  }

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
    heading: position?.stage.title ?? 'Level 1',
    stageLevel: position?.stage.sortOrder ?? 1,
    stageTitle: position?.stage.title ?? 'Level 1',
    stageSubtitle: '基础入门',
    units,
    currentUnitId,
    entries: entries.filter((entry) => published.find((level) => level.level_id === entry.levelId)?.unit_id === currentUnitId),
    completedCount: completedOrders.size,
    currentOrder: focus,
    position,
    hints: hints ?? [],
    typingSeries: bucketTyping(typingRows ?? []),
    latestTyping: latest ? { wpm: Number(latest.wpm), accuracy: Number(latest.accuracy) } : null,
  })
})

function isPlaceholderTitle(title: string): boolean {
  return title.includes('占位') || title.includes('待补充') || /^单元\d+·/.test(title)
}

interface LevelRow {
  level_id: string
  sort_order: number
  title: string
  goal: string
  unit_id: string
  level_type?: string
  body?: unknown
}

async function findStoredLevel(
  db: ReturnType<typeof createClient>,
  levelId: string,
): Promise<{ level_id: string; sort_order: number; body?: unknown } | null> {
  const direct = await db.from('course_level').select('level_id, sort_order, body').eq('level_id', levelId).maybeSingle()
  if (direct.data) return direct.data
  const order = levelOrderOf(levelId)
  if (!order) return null
  const byOrder = await db.from('course_level').select('level_id, sort_order, body').eq('sort_order', order).maybeSingle()
  return byOrder.data ?? null
}

async function curriculumPosition(db: ReturnType<typeof createClient>, studentId: string) {
  const { data } = await db.rpc('student_curriculum_position', { p_student_id: studentId })
  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') return null
  return toCurriculumPosition(row as CurriculumPositionRow)
}

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
