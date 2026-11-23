// 机构学生列表、分组与导入。orgId 只来自 withOrgScope，请求体里的 orgId 不一致会直接 403。
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { ensureAuthUser, loginEmail } from '../_shared/authUser.ts'
import { empty, json } from '../_shared/http.ts'
import { lessonIsAuthorized, openMaxLevel, type OrgStatus } from '../_shared/orgStatus.ts'
import { buildPythonAuthorizedFacts } from '../_shared/pythonProgressFacts.ts'
import { withOrgScope } from '../_shared/orgScope.ts'
import { generateBindCode } from '../_shared/bindCode.ts'
import { generateInitialPassword, hashPassword } from '../_shared/password.ts'
import { planStudentImport } from '../_shared/studentImport.ts'

function csvIdentity(csv: string): { accounts: string[]; names: string[] } {
  const lines = csv.replace(/\r\n/g, '\n').split('\n').map((line) => line.trim()).filter(Boolean)
  const accounts: string[] = []
  const names: string[] = []
  lines.forEach((line, index) => {
    if (index === 0 && /姓名/.test(line)) return
    const [name = '', account = ''] = line.split(',').map((cell) => cell.trim())
    if (name) names.push(name)
    if (account) accounts.push(account)
  })
  return { accounts: [...new Set(accounts)], names: [...new Set(names)] }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })

  const action = req.headers.get('x-action') ?? 'list'
  // 代解除不算机构写入：宽限期内机构端只读，仍要能切断家长可见范围。
  const writing =
    action === 'import' || action === 'create-group' || action === 'reset-password' || action === 'set-status' || action === 'set-group'
  return withOrgScope(req, { write: writing, importStudents: action === 'import' }, async (ctx) => {
    if (action === 'groups' || action === 'create-group') {
      if (action === 'create-group') {
        const name = typeof ctx.body.name === 'string' ? ctx.body.name.trim() : ''
        if (name.length < 1 || name.length > 30) return json(400, { message: '分组名需要 1–30 个字' })
        const { error } = await ctx.db.from('student_group').insert({ org_id: ctx.orgId, name })
        if (error) {
          if (error.code === '23505') return json(400, { message: '分组已存在' })
          return json(500, { message: '创建分组失败' })
        }
      }
      const { data, error } = await ctx.db
        .from('student_group')
        .select('id, name')
        .eq('org_id', ctx.orgId)
        .order('created_at', { ascending: true })
      if (error) return json(500, { message: '读取失败' })
      return json(200, { groups: data ?? [] })
    }

    if (action === 'progress') {
      const studentId = typeof ctx.body.studentId === 'string' ? ctx.body.studentId.trim() : ''
      const { data: student, error: studentError } = await ctx.db
        .from('student')
        .select('id, name, current_level_order')
        .eq('id', studentId)
        .eq('org_id', ctx.orgId)
        .maybeSingle()
      if (studentError) return json(500, { message: '读取失败' })
      if (!student) return json(404, { message: '没有这名学生' })
      const { data: records, error: recordError } = await ctx.db
        .from('learning_record')
        .select('level_id, completed')
        .eq('student_id', student.id)
      if (recordError) return json(500, { message: '读取失败' })
      const ids = new Set((records ?? []).map((row) => row.level_id as string))
      const { data: currentLevel } = await ctx.db
        .from('course_level')
        .select('level_id')
        .eq('sort_order', student.current_level_order)
        .maybeSingle()
      if (currentLevel?.level_id) ids.add(currentLevel.level_id as string)
      const idList = [...ids]
      if (!idList.length) return json(200, { name: student.name, lessons: [] })
      const [{ data: levels, error: levelError }, { data: org }, { data: grant }] =
        await Promise.all([
          ctx.db
            .from('course_level')
            .select('level_id, sort_order, title, teaching_intent, teacher_guide, stage_level')
            .in('level_id', idList)
            .order('sort_order', { ascending: true }),
          ctx.db.from('org').select('status').eq('id', ctx.orgId).maybeSingle(),
          ctx.db
            .from('org_entitlement')
            .select('max_level, valid_until')
            .eq('org_id', ctx.orgId)
            .eq('module_id', 'python')
            .is('revoked_at', null)
            .maybeSingle(),
        ])
      if (levelError) return json(500, { message: '读取失败' })
      const access: OrgStatus = org?.status === 'trial' || ctx.status === 'trial' ? 'trial' : ctx.status
      const maxStage = openMaxLevel(grant ? { maxLevel: Number(grant.max_level), validUntil: grant.valid_until as string | null } : null)
      const completed = new Map((records ?? []).map((row) => [row.level_id as string, row.completed === true]))
      return json(200, {
        name: student.name,
        lessons: (levels ?? []).map((row) => ({
          levelId: row.level_id,
          order: row.sort_order,
          title: row.title,
          completed: completed.get(row.level_id as string) === true,
          current: row.sort_order === student.current_level_order,
          authorized: lessonIsAuthorized(access, maxStage, Number(row.sort_order), Number(row.stage_level)),
          teachingIntent: row.teaching_intent,
          teacherGuide: row.teacher_guide,
        })),
      })
    }

    if (action === 'unbind-parent') {
      const studentId = typeof ctx.body.studentId === 'string' ? ctx.body.studentId.trim() : ''
      const { data: student, error: studentError } = await ctx.db
        .from('student')
        .select('id')
        .eq('id', studentId)
        .eq('org_id', ctx.orgId)
        .maybeSingle()
      if (studentError) return json(500, { message: '解除失败' })
      if (!student) return json(404, { message: '没有这名学生' })
      const { error: updateError } = await ctx.db
        .from('parent_binding')
        .update({ revoked_at: new Date().toISOString() })
        .eq('student_id', student.id)
        .is('revoked_at', null)
      if (updateError) return json(500, { message: '解除失败' })
      return json(200, { ok: true, boundParentCount: 0 })
    }

    if (action === 'reset-password') {
      const studentId = typeof ctx.body.studentId === 'string' ? ctx.body.studentId.trim() : ''
      const { data: existing, error: readError } = await ctx.db
        .from('student')
        .select('id, account, auth_user_id')
        .eq('id', studentId)
        .eq('org_id', ctx.orgId)
        .maybeSingle()
      if (readError) return json(500, { message: '重置失败' })
      if (!existing) return json(404, { message: '没有这名学生' })
      const plain = generateInitialPassword(8)
      const passwordHash = await hashPassword(plain)
      const { error: updateError } = await ctx.db
        .from('student')
        .update({ password_hash: passwordHash })
        .eq('id', existing.id)
        .eq('org_id', ctx.orgId)
      if (updateError) return json(500, { message: '重置失败' })
      try {
        await ensureAuthUser(ctx.db, loginEmail('student', String(existing.account)), plain)
      } catch (error) {
        console.error('sync student auth failed', error instanceof Error ? error.message : error)
      }
      return json(200, { password: plain })
    }

    if (action === 'set-status') {
      const studentId = typeof ctx.body.studentId === 'string' ? ctx.body.studentId.trim() : ''
      const status = ctx.body.status === 'active' || ctx.body.status === 'disabled' ? ctx.body.status : ''
      if (!status) return json(400, { message: '学生状态不正确' })
      const { data: updated, error: updateError } = await ctx.db
        .from('student')
        .update({ status })
        .eq('id', studentId)
        .eq('org_id', ctx.orgId)
        .select('id')
        .maybeSingle()
      if (updateError) return json(500, { message: '更新状态失败' })
      if (!updated) return json(404, { message: '没有这名学生' })
      return json(200, { ok: true, status })
    }

    if (action === 'set-group') {
      const studentId = typeof ctx.body.studentId === 'string' ? ctx.body.studentId.trim() : ''
      const groupId = typeof ctx.body.groupId === 'string' ? ctx.body.groupId.trim() : ''
      if (!studentId || !groupId) return json(400, { message: '请指定学生和分组' })
      const { data: group, error: groupError } = await ctx.db
        .from('student_group')
        .select('id')
        .eq('id', groupId)
        .eq('org_id', ctx.orgId)
        .maybeSingle()
      if (groupError) return json(500, { message: '调整分组失败' })
      if (!group) return json(400, { message: '分组不存在' })
      const { data: updated, error: updateError } = await ctx.db
        .from('student')
        .update({ group_id: groupId })
        .eq('id', studentId)
        .eq('org_id', ctx.orgId)
        .select('id')
        .maybeSingle()
      if (updateError) return json(500, { message: '调整分组失败' })
      if (!updated) return json(404, { message: '没有这名学生' })
      return json(200, { ok: true, groupId })
    }

    if (action !== 'import') {
      const { data, error } = await ctx.db
        .from('student')
        .select('id, name, account, group_id, status, bind_code, current_level_order, last_active_at')
        .eq('org_id', ctx.orgId)
      if (error) return json(500, { message: '读取失败' })
      const ids = (data ?? []).map((row) => row.id as string)
      const counts = new Map<string, number>()
      if (ids.length) {
        const { data: bindings, error: bindingError } = await ctx.db
          .from('parent_binding')
          .select('student_id')
          .in('student_id', ids)
          .is('revoked_at', null)
        if (bindingError) return json(500, { message: '读取失败' })
        for (const row of bindings ?? []) {
          const id = row.student_id as string
          counts.set(id, (counts.get(id) ?? 0) + 1)
        }
      }
      const extras = await studentListExtras(ctx.db, ctx.orgId, ctx.status, data ?? [])
      return json(200, {
        authorizedLevels: extras.authorizedLevels,
        students: (data ?? []).map((row) => {
          const id = row.id as string
          const typing = extras.typing.get(id)
          const authorizedCompletedCount = extras.completed.get(id) ?? 0
          return {
            ...row,
            bound_parent_count: counts.get(id) ?? 0,
            completed_count: authorizedCompletedCount,
            authorizedCompletedCount,
            typing_wpm: typing?.wpm ?? null,
            typing_accuracy: typing?.accuracy ?? null,
          }
        }),
      })
    }

    const { data: groups, error: groupError } = await ctx.db
      .from('student_group')
      .select('id, name')
      .eq('org_id', ctx.orgId)
    if (groupError) return json(500, { message: '读取失败' })
    const groupByName = new Map((groups ?? []).map((group) => [group.name, group.id as string]))

    const csv = typeof ctx.body.csv === 'string' ? ctx.body.csv : ''
    const { accounts, names } = csvIdentity(csv)
    const accountLookups = await Promise.all(
      accounts.map((account) => ctx.db.from('student').select('account').eq('account', account).maybeSingle()),
    )
    const accountError = accountLookups.find((item) => item.error)?.error
    const { data: nameRows, error: nameError } = names.length
      ? await ctx.db.from('student').select('name').eq('org_id', ctx.orgId)
      : { data: [] as { name: string }[], error: null }
    if (accountError || nameError) return json(500, { message: '读取失败' })
    const plan = planStudentImport({
      csv,
      groupNames: [...groupByName.keys()],
      usedSeats: ctx.usedSeats,
      seatLimit: ctx.seatLimit,
      takenAccounts: new Set(
        accountLookups.flatMap((item) => (item.data?.account ? [String(item.data.account).toLowerCase()] : [])),
      ),
      takenNames: new Set((nameRows ?? []).map((row) => String(row.name))),
    })

    let added = 0
    const rows = []
    const issued = new Set<string>()
    for (const row of plan) {
      if (!row.ok) {
        rows.push({ row: row.row, name: row.name, account: row.account, ok: false, reason: row.reason })
        continue
      }
      const groupId = groupByName.get(row.groupName)
      if (!groupId) {
        rows.push({ row: row.row, name: row.name, account: row.account, ok: false, reason: '分组不存在（需与已有分组名一致）' })
        continue
      }
      try {
        let plain = generateInitialPassword(8)
        while (issued.has(plain)) plain = generateInitialPassword(8)
        const passwordHash = await hashPassword(plain)
        const authUserId = await ensureAuthUser(ctx.db, loginEmail('student', row.account), plain)
        let inserted = false
        let lastReason = '导入失败'
        for (let attempt = 0; attempt < 5 && !inserted; attempt += 1) {
          const { error: insertError } = await ctx.db.from('student').insert({
            org_id: ctx.orgId,
            auth_user_id: authUserId,
            group_id: groupId,
            name: row.name,
            account: row.account,
            password_hash: passwordHash,
            status: 'active',
            bind_code: generateBindCode(),
            current_level_order: 1,
          })
          if (!insertError) {
            inserted = true
            break
          }
          if (insertError.code === '23505' && String(insertError.message).includes('bind_code')) continue
          lastReason = '导入失败'
          break
        }
        if (!inserted) {
          rows.push({ row: row.row, name: row.name, account: row.account, ok: false, reason: lastReason })
          continue
        }
        added += 1
        issued.add(plain)
        rows.push({ row: row.row, name: row.name, account: row.account, ok: true, initialPassword: plain })
      } catch (error) {
        console.error('import student failed', error instanceof Error ? error.message : error)
        rows.push({ row: row.row, name: row.name, account: row.account, ok: false, reason: '导入失败' })
      }
    }
    if (added > 0) {
      await ctx.db.from('org').update({ used_seats: ctx.usedSeats + added }).eq('id', ctx.orgId)
    }
    return json(200, { added, rows })
  })
})

async function studentListExtras(
  db: SupabaseClient,
  orgId: string,
  effective: OrgStatus,
  students: { id: string }[],
) {
  const ids = students.map((student) => student.id)
  const [{ data: org }, { data: grant }, { data: published }] = await Promise.all([
    db.from('org').select('status').eq('id', orgId).maybeSingle(),
    db.from('org_entitlement')
      .select('max_level, valid_until')
      .eq('org_id', orgId)
      .eq('module_id', 'python')
      .is('revoked_at', null)
      .maybeSingle(),
    db.from('course_level').select('sort_order, stage_level').eq('published', true),
  ])
  const access: OrgStatus = org?.status === 'trial' || effective === 'trial' ? 'trial' : effective
  const maxStage = openMaxLevel(grant ? { maxLevel: Number(grant.max_level), validUntil: grant.valid_until as string | null } : null)
  const publishedRows = (published ?? []).map((row) => ({
    sort_order: row.sort_order as number,
    stage_sort: Number(row.stage_level),
  }))
  const typing = new Map<string, { wpm: number; accuracy: number }>()
  if (!ids.length) {
    const emptyFacts = buildPythonAuthorizedFacts(access, maxStage, publishedRows, [])
    return { authorizedLevels: emptyFacts.authorizedLevels, completed: emptyFacts.completed, typing }
  }
  const [{ data: progress }, { data: typingRows }, { data: levels }] = await Promise.all([
    db.from('learning_record').select('student_id, level_id, completed').in('student_id', ids).eq('completed', true),
    db.from('typing_record').select('student_id, wpm, accuracy, created_at').in('student_id', ids),
    db.from('course_level').select('level_id, sort_order, stage_level'),
  ])
  const levelById = new Map(
    (levels ?? []).map((row) => [row.level_id as string, { sortOrder: row.sort_order as number, stageSort: Number(row.stage_level) }]),
  )
  const lessons = (progress ?? []).flatMap((row) => {
    const level = levelById.get(row.level_id as string)
    if (!level) return []
    return [{
      student_id: row.student_id as string,
      sort_order: level.sortOrder,
      stage_sort: level.stageSort,
      completed: row.completed === true,
    }]
  })
  const facts = buildPythonAuthorizedFacts(access, maxStage, publishedRows, lessons)
  const latest = new Map<string, { wpm: number; accuracy: number; at: string }>()
  for (const row of typingRows ?? []) {
    const prev = latest.get(row.student_id as string)
    if (!prev || String(row.created_at) > prev.at) {
      latest.set(row.student_id as string, { wpm: Number(row.wpm), accuracy: Number(row.accuracy), at: String(row.created_at) })
    }
  }
  for (const [id, row] of latest) typing.set(id, { wpm: row.wpm, accuracy: row.accuracy })
  return { authorizedLevels: facts.authorizedLevels, completed: facts.completed, typing }
}
