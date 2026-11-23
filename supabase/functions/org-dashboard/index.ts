// 机构进度看板。完成率只拿已授权关卡做分母，名单只留需要跟进的学生。
import { empty, json } from '../_shared/http.ts'
import { calendarWeekStart, openMaxLevel, orgAttention, type OrgStatus } from '../_shared/orgStatus.ts'
import { buildPythonAuthorizedFacts } from '../_shared/pythonProgressFacts.ts'
import { withOrgScope } from '../_shared/orgScope.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })

  return withOrgScope(req, {}, async (ctx) => {
    const [{ data: students, error }, { data: groups }, { data: org }, { data: grant }] = await Promise.all([
      ctx.db
        .from('student')
        .select('id, name, account, group_id, status, bind_code, current_level_order, last_active_at')
        .eq('org_id', ctx.orgId),
      ctx.db.from('student_group').select('id, name').eq('org_id', ctx.orgId),
      ctx.db.from('org').select('status').eq('id', ctx.orgId).maybeSingle(),
      ctx.db
        .from('org_entitlement')
        .select('max_level, valid_until')
        .eq('org_id', ctx.orgId)
        .eq('module_id', 'python')
        .is('revoked_at', null)
        .maybeSingle(),
    ])
    if (error) return json(500, { message: '读取失败' })

    const ids = (students ?? []).map((student) => student.id as string)
    const access: OrgStatus = org?.status === 'trial' || ctx.status === 'trial' ? 'trial' : ctx.status
    const maxStage = openMaxLevel(
      grant ? { maxLevel: Number(grant.max_level), validUntil: grant.valid_until as string | null } : null,
    )
    const [{ data: published }, { data: progress }, { data: typing }, { data: levelRows }] = await Promise.all([
      ctx.db.from('course_level').select('sort_order, stage_level').eq('published', true),
      ids.length
        ? ctx.db.from('learning_record').select('student_id, level_id, completed, updated_at').in('student_id', ids)
        : Promise.resolve({ data: [] as { student_id: string; level_id: string; completed: boolean; updated_at: string }[] }),
      ids.length
        ? ctx.db.from('typing_record').select('student_id, wpm, accuracy, created_at').in('student_id', ids)
        : Promise.resolve({ data: [] as { student_id: string; wpm: number; accuracy: number; created_at: string }[] }),
      ctx.db.from('course_level').select('level_id, sort_order, stage_level'),
    ])
    const levelById = new Map(
      (levelRows ?? []).map((row) => [
        row.level_id as string,
        { sortOrder: row.sort_order as number, stageSort: Number(row.stage_level) },
      ]),
    )
    const publishedRows = (published ?? []).map((row) => ({
      sort_order: row.sort_order as number,
      stage_sort: Number(row.stage_level),
    }))
    const currentTouch = new Map<string, { completed: boolean; updatedAt: string; sortOrder: number }>()
    const lessons = [] as { student_id: string; sort_order: number; stage_sort: number; completed: boolean }[]
    for (const row of progress ?? []) {
      const level = levelById.get(row.level_id as string)
      if (!level) continue
      lessons.push({
        student_id: row.student_id as string,
        sort_order: level.sortOrder,
        stage_sort: level.stageSort,
        completed: row.completed === true,
      })
      currentTouch.set(`${row.student_id}:${level.sortOrder}`, {
        completed: row.completed === true,
        updatedAt: String(row.updated_at ?? ''),
        sortOrder: level.sortOrder,
      })
    }
    const facts = buildPythonAuthorizedFacts(access, maxStage, publishedRows, lessons)
    const authorizedLevels = facts.authorizedLevels
    const completed = facts.completed
    const latestTyping = new Map<string, { wpm: number; accuracy: number; at: string }>()
    for (const row of typing ?? []) {
      const prev = latestTyping.get(row.student_id as string)
      if (!prev || String(row.created_at) > prev.at) {
        latestTyping.set(row.student_id as string, {
          wpm: Number(row.wpm),
          accuracy: Number(row.accuracy),
          at: String(row.created_at),
        })
      }
    }

    const weekStart = calendarWeekStart()
    const activeStudents = (students ?? []).filter((student) => student.status === 'active')
    const avg =
      activeStudents.reduce((sum, student) => sum + (completed.get(student.id as string) ?? 0), 0) /
      Math.max(1, activeStudents.length)
    const groupName = new Map((groups ?? []).map((group) => [group.id as string, group.name as string]))

    return json(200, {
      reading: activeStudents.length,
      weeklyActive: activeStudents.filter((student) => student.last_active_at && new Date(student.last_active_at as string).getTime() >= weekStart).length,
      avgCompleted: Math.round(avg * 10) / 10,
      authorizedLevels,
      groupRows: (groups ?? []).map((group) => {
        const inGroup = activeStudents.filter((student) => student.group_id === group.id)
        const done = inGroup.reduce((sum, student) => sum + (completed.get(student.id as string) ?? 0), 0)
        const denom = authorizedLevels * inGroup.length
        return {
          groupId: group.id,
          name: group.name,
          rate: inGroup.length && denom ? Math.round((done / denom) * 100) : null,
          students: inGroup.length,
        }
      }),
      attentionRows: (students ?? []).flatMap((student) => {
        const touch = currentTouch.get(`${student.id}:${student.current_level_order}`)
        const reason = orgAttention({
          status: String(student.status),
          lastActiveAt: (student.last_active_at as string | null) ?? null,
          currentLevelUpdatedAt: touch?.updatedAt ?? null,
          currentLevelCompleted: touch?.completed === true,
        })
        if (!reason) return []
        const typingRow = latestTyping.get(student.id as string)
        return [{
          reason,
          student: {
            id: student.id,
            orgId: ctx.orgId,
            groupId: student.group_id,
            name: student.name,
            account: student.account,
            status: student.status,
            currentLevelOrder: student.current_level_order,
            lastActiveAt: student.last_active_at ?? '',
            bindCode: student.bind_code ?? '',
          },
          groupName: groupName.get(student.group_id as string) ?? '未分组',
          completedCount: completed.get(student.id as string) ?? 0,
          authorizedCompletedCount: completed.get(student.id as string) ?? 0,
          currentOrder: student.current_level_order,
          typing: typingRow ? { wpm: typingRow.wpm, accuracy: typingRow.accuracy } : null,
          lastActiveAt: student.last_active_at ?? '',
        }]
      }),
    })
  })
})
