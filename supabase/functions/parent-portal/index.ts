// 家长绑定。不建家长账号：绑定成功后发一个本机会话，换设备再输绑定码。
import { empty, json } from '../_shared/http.ts'
import { serviceDb } from '../_shared/staff.ts'

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function token(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
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
  const rawToken = req.headers.get('x-parent-token') ?? ''

  if (action === 'lookup' || action === 'bind') {
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    const { data: student } = await db
      .from('student')
      .select('id, name, org_id, group_id, status')
      .eq('bind_code', code)
      .eq('status', 'active')
      .maybeSingle()
    if (!student) return json(404, { message: '没有找到这个绑定码，和机构老师核对一下。' })
    const [{ data: org }, { data: group }] = await Promise.all([
      db.from('org').select('name').eq('id', student.org_id).maybeSingle(),
      db.from('student_group').select('name').eq('id', student.group_id).maybeSingle(),
    ])
    const preview = { id: student.id, name: student.name, orgName: org?.name ?? '', groupName: group?.name ?? '未分组' }
    if (action === 'lookup') return json(200, { student: preview })

    let sessionId: string | null = null
    let issued: string | null = null
    if (rawToken) {
      const { data: existing } = await db.from('parent_session').select('id').eq('token_hash', await sha256(rawToken)).maybeSingle()
      sessionId = existing?.id ?? null
    }
    if (!sessionId) {
      issued = token()
      const { data: created, error } = await db.from('parent_session').insert({ token_hash: await sha256(issued) }).select('id').single()
      if (error || !created) return json(500, { message: '绑定失败' })
      sessionId = created.id
    }
    const { data: already } = await db
      .from('parent_binding')
      .select('id')
      .eq('parent_session_id', sessionId)
      .eq('student_id', student.id)
      .maybeSingle()
    if (!already) {
      const { error } = await db.from('parent_binding').insert({ parent_session_id: sessionId, student_id: student.id })
      if (error) return json(500, { message: '绑定失败' })
    }
    return json(200, { token: issued ?? rawToken, student: preview })
  }

  if (!rawToken) return json(200, { children: [] })
  const { data: session } = await db.from('parent_session').select('id').eq('token_hash', await sha256(rawToken)).maybeSingle()
  if (!session) return json(200, { children: [] })
  const { data: bindings } = await db.from('parent_binding').select('student_id').eq('parent_session_id', session.id)
  const ids = (bindings ?? []).map((row) => row.student_id as string)
  if (!ids.length) return json(200, { children: [] })

  const { data: students } = await db
    .from('student')
    .select('id, name, org_id, group_id, account, status, bind_code, current_level_order, last_active_at')
    .in('id', ids)
  const children = []
  for (const student of students ?? []) {
    const [{ data: org }, { data: group }, { data: progress }, { count }, { data: sessions }, { data: typing }] = await Promise.all([
      db.from('org').select('name').eq('id', student.org_id).maybeSingle(),
      db.from('student_group').select('name').eq('id', student.group_id).maybeSingle(),
      db.from('level_progress').select('level_id, completed').eq('student_id', student.id).eq('completed', true),
      db.from('course_level').select('level_id', { count: 'exact', head: true }).eq('published', true),
      db.from('study_session').select('started_at, ended_at').eq('student_id', student.id),
      db.from('typing_record').select('practiced_on, wpm, accuracy').eq('student_id', student.id),
    ])
    const completedCount = progress?.length ?? 0
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
    children.push({
      student: {
        id: student.id,
        orgId: student.org_id,
        groupId: student.group_id,
        name: student.name,
        account: student.account,
        status: student.status,
        currentLevelOrder: student.current_level_order,
        lastActiveAt: student.last_active_at ?? '',
        bindCode: student.bind_code ?? '',
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
    })
  }
  return json(200, { children })
})

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
