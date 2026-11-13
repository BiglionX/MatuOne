// 机构学生列表、分组与导入。orgId 只来自 withOrgScope，请求体里的 orgId 不一致会直接 403。
import { ensureAuthUser, loginEmail } from '../_shared/authUser.ts'
import { empty, json } from '../_shared/http.ts'
import { withOrgScope } from '../_shared/orgScope.ts'
import { hashPassword } from '../_shared/password.ts'
import { planStudentImport } from '../_shared/studentImport.ts'

const INITIAL_PASSWORD = '123456'

function bindCode(): string {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return String(100000 + (buf[0] % 900000))
}

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

    if (action !== 'import') {
      const { data, error } = await ctx.db
        .from('student')
        .select('id, name, account, group_id, status, bind_code, current_level_order, last_active_at')
        .eq('org_id', ctx.orgId)
      if (error) return json(500, { message: '读取失败' })
      return json(200, { students: data ?? [] })
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
        const passwordHash = await hashPassword(INITIAL_PASSWORD)
        const authUserId = await ensureAuthUser(ctx.db, loginEmail('student', row.account), INITIAL_PASSWORD)
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
            bind_code: bindCode(),
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
        rows.push({ row: row.row, name: row.name, account: row.account, ok: true })
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
