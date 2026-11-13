// 机构学生列表、分组与导入。orgId 只来自 withOrgScope，请求体里的 orgId 不一致会直接 403。
import { ensureAuthUser, loginEmail } from '../_shared/authUser.ts'
import { empty, json } from '../_shared/http.ts'
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
  const writing = action === 'import' || action === 'create-group'
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
      return json(200, {
        students: (data ?? []).map((row) => ({ ...row, bound_parent_count: counts.get(row.id as string) ?? 0 })),
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
