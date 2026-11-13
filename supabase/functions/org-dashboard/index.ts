// 机构进度看板。数字从学生、进度和打字记录现算，不回落到演示关卡。
import { empty, json } from '../_shared/http.ts'
import { withOrgScope } from '../_shared/orgScope.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })

  return withOrgScope(req, {}, async (ctx) => {
    const [{ data: students, error }, { data: groups }, { count }] = await Promise.all([
      ctx.db
        .from('student')
        .select('id, name, account, group_id, status, bind_code, current_level_order, last_active_at')
        .eq('org_id', ctx.orgId),
      ctx.db.from('student_group').select('id, name').eq('org_id', ctx.orgId),
      ctx.db.from('course_level').select('level_id', { count: 'exact', head: true }).eq('published', true),
    ])
    if (error) return json(500, { message: '读取失败' })

    const ids = (students ?? []).map((student) => student.id)
    const [{ data: progress }, { data: typing }] = await Promise.all([
      ids.length
        ? ctx.db.from('learning_record').select('student_id, completed').in('student_id', ids).eq('completed', true)
        : Promise.resolve({ data: [] as { student_id: string }[] }),
      ids.length
        ? ctx.db.from('typing_record').select('student_id, wpm, accuracy, created_at').in('student_id', ids)
        : Promise.resolve({ data: [] as { student_id: string; wpm: number; accuracy: number; created_at: string }[] }),
    ])

    const completed = new Map<string, number>()
    for (const row of progress ?? []) completed.set(row.student_id, (completed.get(row.student_id) ?? 0) + 1)
    const latestTyping = new Map<string, { wpm: number; accuracy: number; at: string }>()
    for (const row of typing ?? []) {
      const prev = latestTyping.get(row.student_id)
      if (!prev || row.created_at > prev.at) {
        latestTyping.set(row.student_id, { wpm: Number(row.wpm), accuracy: Number(row.accuracy), at: row.created_at })
      }
    }

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const activeStudents = (students ?? []).filter((student) => student.status === 'active')
    const weeklyActive = activeStudents.filter((student) => student.last_active_at && new Date(student.last_active_at).getTime() >= weekAgo).length
    const totalLevels = count ?? 0
    const avg =
      activeStudents.reduce((sum, student) => sum + (completed.get(student.id) ?? 0), 0) / Math.max(1, activeStudents.length)
    const groupName = new Map((groups ?? []).map((group) => [group.id as string, group.name as string]))

    return json(200, {
      reading: activeStudents.length,
      weeklyActive,
      avgCompleted: Math.round(avg * 10) / 10,
      totalLevels,
      groupRows: (groups ?? []).map((group) => {
        const inGroup = activeStudents.filter((student) => student.group_id === group.id)
        const done = inGroup.reduce((sum, student) => sum + (completed.get(student.id) ?? 0), 0)
        const denom = totalLevels * Math.max(1, inGroup.length)
        return {
          groupId: group.id,
          name: group.name,
          rate: inGroup.length && totalLevels ? Math.round((done / denom) * 100) : 0,
          students: inGroup.length,
        }
      }),
      studentRows: (students ?? []).map((student) => {
        const typingRow = latestTyping.get(student.id)
        return {
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
          groupName: groupName.get(student.group_id) ?? '未分组',
          completedCount: completed.get(student.id) ?? 0,
          currentOrder: student.current_level_order,
          typing: typingRow ? { wpm: typingRow.wpm, accuracy: typingRow.accuracy } : null,
          lastActiveAt: student.last_active_at ?? '',
        }
      }),
    })
  })
})
