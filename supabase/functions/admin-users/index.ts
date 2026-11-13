// 平台用户中心。身份只从 requireOps 读取，查询覆盖全部机构。
// 解除绑定只写 revoked_at。注销家长只匿名化，不物理删除。明文密码只出现在本次响应里。
import { ensureAuthUser, loginEmail } from '../_shared/authUser.ts'
import { empty, json } from '../_shared/http.ts'
import { generateInitialPassword, hashPassword } from '../_shared/password.ts'
import { requireOps } from '../_shared/staff.ts'
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface StudentRecord {
  id: string
  name: string
  account: string
  status: string
  org_id: string
  group_id: string
  current_level_order: number
  last_active_at: string | null
  bind_code?: string | null
  auth_user_id?: string | null
}

interface ParentRecord {
  id: string
  account: string
  created_at: string
  last_login_at: string | null
  auth_user_id?: string | null
}

function positiveInt(value: unknown, fallback: number, max: number): number {
  const n = typeof value === 'number' ? value : Number.NaN
  if (!Number.isInteger(n) || n < 1) return fallback
  return Math.min(n, max)
}

function studentStatus(value: unknown): 'active' | 'disabled' {
  return value === 'disabled' ? 'disabled' : 'active'
}

function asIso(value: unknown): string | null {
  if (value == null || value === '') return null
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function keywordOr(keyword: string): string | null {
  const cleaned = keyword.trim().slice(0, 40).replace(/[%_\\",().]/g, '')
  if (!cleaned) return null
  const value = `"%${cleaned}%"`
  return `name.ilike.${value},account.ilike.${value}`
}

function likeTerm(keyword: string): string | null {
  const cleaned = keyword.trim().slice(0, 40).replace(/[%_\\]/g, '')
  return cleaned ? `%${cleaned}%` : null
}

function maskAccount(account: string): string {
  const value = account.trim()
  if (!value) return '****'
  return `${value.slice(0, 3)}****`
}

function presentStudent(row: StudentRecord, orgName: string, groupName: string, boundParentCount: number) {
  return {
    id: row.id,
    name: row.name,
    account: row.account,
    status: studentStatus(row.status),
    orgId: row.org_id,
    orgName: orgName || '—',
    groupName: groupName || '未分组',
    currentLevelOrder: Number(row.current_level_order) || 1,
    boundParentCount,
    lastActiveAt: asIso(row.last_active_at),
  }
}

function presentParent(row: ParentRecord, childCount: number, mask: boolean) {
  return {
    id: row.id,
    account: mask ? maskAccount(row.account) : row.account,
    childCount,
    createdAt: asIso(row.created_at) ?? String(row.created_at ?? ''),
    lastLoginAt: asIso(row.last_login_at),
  }
}

async function nameMap(db: SupabaseClient, table: 'org' | 'student_group', ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id) => UUID.test(id)))]
  const map = new Map<string, string>()
  if (!unique.length) return map
  const { data, error } = await db.from(table).select('id, name').in('id', unique)
  if (error) throw new Error('读取失败')
  for (const row of data ?? []) map.set(String(row.id), String(row.name))
  return map
}

async function parentCounts(db: SupabaseClient, ids: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (!ids.length) return map
  const { data, error } = await db.from('parent_binding').select('student_id').in('student_id', ids).is('revoked_at', null)
  if (error) throw new Error('读取失败')
  for (const row of data ?? []) {
    const id = String(row.student_id)
    map.set(id, (map.get(id) ?? 0) + 1)
  }
  return map
}

async function childCounts(db: SupabaseClient, ids: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (!ids.length) return map
  const { data, error } = await db
    .from('parent_binding')
    .select('parent_account_id')
    .in('parent_account_id', ids)
    .is('revoked_at', null)
  if (error) throw new Error('读取失败')
  for (const row of data ?? []) {
    const id = String(row.parent_account_id ?? '')
    if (!id) continue
    map.set(id, (map.get(id) ?? 0) + 1)
  }
  return map
}

async function levelTotal(db: SupabaseClient): Promise<number> {
  const { count, error } = await db.from('course_level').select('level_id', { count: 'exact', head: true }).eq('published', true)
  if (error) throw new Error('读取失败')
  return count ?? 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })

  let body: Record<string, unknown> = {}
  try {
    const parsed = await req.json()
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>
  } catch {
    body = {}
  }

  const auth = await requireOps(req)
  if ('error' in auth) return auth.error
  const action = typeof body.action === 'string' ? body.action : ''

  try {
    if (action === 'list_students') return await listStudents(auth.db, body)
    if (action === 'student_detail') return await studentDetail(auth.db, body)
    if (action === 'list_parents') return await listParents(auth.db, body)
    if (action === 'parent_detail') return await parentDetail(auth.db, body)
    if (action === 'unbind_parent') return await unbindParent(auth.db, body)
    if (action === 'reset_password') return await resetPassword(auth.db, body)
    if (action === 'delete_parent') return await deleteParent(auth.db, body)
    return json(400, { message: '不认识的操作' })
  } catch (error) {
    console.error('admin-users failed', action, action === 'reset_password' ? 'reset' : error instanceof Error ? error.message : error)
    const message = action === 'reset_password' ? '重置失败' : action === 'unbind_parent' ? '解除失败' : action === 'delete_parent' ? '注销失败' : '读取失败'
    return json(500, { message })
  }
})

async function listStudents(db: SupabaseClient, body: Record<string, unknown>): Promise<Response> {
  const page = positiveInt(body.page, 1, 10_000)
  const pageSize = positiveInt(body.pageSize, 20, 50)
  const orgFilter = typeof body.orgId === 'string' ? body.orgId.trim() : ''
  if (orgFilter && !UUID.test(orgFilter)) return json(400, { message: '机构筛选无效' })

  let query = db
    .from('student')
    .select('id, name, account, status, org_id, group_id, current_level_order, last_active_at', { count: 'exact' })
  if (orgFilter) query = query.eq('org_id', orgFilter)
  const orFilter = keywordOr(typeof body.keyword === 'string' ? body.keyword : '')
  if (orFilter) query = query.or(orFilter)

  const from = (page - 1) * pageSize
  const [{ data, error, count }, totalLevels] = await Promise.all([
    query.order('created_at', { ascending: false }).order('id', { ascending: true }).range(from, from + pageSize - 1),
    levelTotal(db),
  ])
  if (error) return json(500, { message: '读取失败' })
  const rows = (data ?? []) as StudentRecord[]
  const [orgs, groups, counts] = await Promise.all([
    nameMap(db, 'org', rows.map((row) => row.org_id)),
    nameMap(db, 'student_group', rows.map((row) => row.group_id)),
    parentCounts(db, rows.map((row) => row.id)),
  ])
  return json(200, {
    page,
    pageSize,
    total: count ?? 0,
    totalLevels,
    students: rows.map((row) => presentStudent(row, orgs.get(row.org_id) ?? '', groups.get(row.group_id) ?? '', counts.get(row.id) ?? 0)),
  })
}

async function studentDetail(db: SupabaseClient, body: Record<string, unknown>): Promise<Response> {
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : ''
  if (!studentId) return json(400, { message: '请指定学生' })
  if (!UUID.test(studentId)) return json(400, { message: '没有这名学生' })

  const [{ data, error }, totalLevels] = await Promise.all([
    db
      .from('student')
      .select('id, name, account, status, org_id, group_id, current_level_order, last_active_at, bind_code')
      .eq('id', studentId)
      .maybeSingle(),
    levelTotal(db),
  ])
  if (error) return json(500, { message: '读取失败' })
  if (!data) return json(404, { message: '没有这名学生' })
  const row = data as StudentRecord
  const [orgs, groups, parents] = await Promise.all([
    nameMap(db, 'org', [row.org_id]),
    nameMap(db, 'student_group', [row.group_id]),
    boundParents(db, row.id),
  ])
  return json(200, {
    totalLevels,
    student: {
      ...presentStudent(row, orgs.get(row.org_id) ?? '', groups.get(row.group_id) ?? '', parents.length),
      bindCode: row.bind_code ?? '',
    },
    parents,
  })
}

async function boundParents(db: SupabaseClient, studentId: string): Promise<{ account: string; boundAt: string }[]> {
  const { data, error } = await db
    .from('parent_binding')
    .select('created_at, parent_account_id')
    .eq('student_id', studentId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error('读取失败')
  const accountIds = [...new Set((data ?? []).map((row) => row.parent_account_id).filter((id): id is string => typeof id === 'string' && UUID.test(id)))]
  if (!accountIds.length) return []
  const { data: accounts, error: accountError } = await db
    .from('parent_account')
    .select('id, account')
    .in('id', accountIds)
    .is('anonymized_at', null)
  if (accountError) throw new Error('读取失败')
  const byId = new Map((accounts ?? []).map((row) => [String(row.id), String(row.account)]))
  return (data ?? []).flatMap((row) => {
    const account = byId.get(String(row.parent_account_id ?? ''))
    if (!account) return []
    return [{ account, boundAt: asIso(row.created_at) ?? String(row.created_at ?? '') }]
  })
}

async function matchingParentIds(db: SupabaseClient, keyword: string): Promise<string[] | null> {
  const pattern = likeTerm(keyword)
  if (!pattern) return null
  const [{ data: accounts, error: accountError }, { data: students, error: studentError }] = await Promise.all([
    db.from('parent_account').select('id').ilike('account', pattern).is('anonymized_at', null),
    db.from('student').select('id').ilike('name', pattern),
  ])
  if (accountError || studentError) throw new Error('读取失败')
  const ids = new Set((accounts ?? []).map((row) => String(row.id)))
  const studentIds = (students ?? []).map((row) => String(row.id)).filter((id) => UUID.test(id))
  if (studentIds.length) {
    const { data: bindings, error } = await db
      .from('parent_binding')
      .select('parent_account_id')
      .in('student_id', studentIds)
      .is('revoked_at', null)
    if (error) throw new Error('读取失败')
    for (const row of bindings ?? []) {
      if (typeof row.parent_account_id === 'string') ids.add(row.parent_account_id)
    }
  }
  return [...ids]
}

async function listParents(db: SupabaseClient, body: Record<string, unknown>): Promise<Response> {
  const page = positiveInt(body.page, 1, 10_000)
  const pageSize = positiveInt(body.pageSize, 20, 50)
  const matched = await matchingParentIds(db, typeof body.keyword === 'string' ? body.keyword : '')
  if (matched && matched.length === 0) return json(200, { page, pageSize, total: 0, parents: [] })

  let query = db.from('parent_account').select('id, account, created_at, last_login_at', { count: 'exact' }).is('anonymized_at', null)
  if (matched) query = query.in('id', matched)
  const from = (page - 1) * pageSize
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, from + pageSize - 1)
  if (error) return json(500, { message: '读取失败' })
  const rows = (data ?? []) as ParentRecord[]
  const counts = await childCounts(db, rows.map((row) => row.id))
  return json(200, {
    page,
    pageSize,
    total: count ?? 0,
    parents: rows.map((row) => presentParent(row, counts.get(row.id) ?? 0, true)),
  })
}

async function parentDetail(db: SupabaseClient, body: Record<string, unknown>): Promise<Response> {
  const parentId = typeof body.parentId === 'string' ? body.parentId.trim() : ''
  if (!parentId) return json(400, { message: '请指定家长' })
  if (!UUID.test(parentId)) return json(400, { message: '没有这位家长' })

  const { data, error } = await db
    .from('parent_account')
    .select('id, account, created_at, last_login_at')
    .eq('id', parentId)
    .is('anonymized_at', null)
    .maybeSingle()
  if (error) return json(500, { message: '读取失败' })
  if (!data) return json(404, { message: '没有这位家长' })
  const children = await boundChildren(db, parentId)
  return json(200, { parent: presentParent(data as ParentRecord, children.length, false), children })
}

async function boundChildren(db: SupabaseClient, parentId: string) {
  const { data, error } = await db
    .from('parent_binding')
    .select('student_id, created_at')
    .eq('parent_account_id', parentId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error('读取失败')
  const studentIds = [...new Set((data ?? []).map((row) => String(row.student_id)).filter((id) => UUID.test(id)))]
  if (!studentIds.length) return []
  const { data: students, error: studentError } = await db.from('student').select('id, name, org_id').in('id', studentIds)
  if (studentError) throw new Error('读取失败')
  const orgIds = [...new Set((students ?? []).map((row) => String(row.org_id)).filter((id) => UUID.test(id)))]
  const { data: orgs, error: orgError } = orgIds.length
    ? await db.from('org').select('id, name').in('id', orgIds)
    : { data: [], error: null }
  if (orgError) throw new Error('读取失败')
  const studentById = new Map((students ?? []).map((row) => [String(row.id), row]))
  const orgById = new Map((orgs ?? []).map((row) => [String(row.id), String(row.name)]))
  return (data ?? []).flatMap((row) => {
    const student = studentById.get(String(row.student_id))
    if (!student) return []
    return [{
      studentId: String(student.id),
      name: String(student.name),
      orgName: orgById.get(String(student.org_id)) ?? '—',
      boundAt: asIso(row.created_at) ?? String(row.created_at ?? ''),
    }]
  })
}

async function unbindParent(db: SupabaseClient, body: Record<string, unknown>): Promise<Response> {
  const parentId = typeof body.parentId === 'string' ? body.parentId.trim() : ''
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : ''
  if (!parentId || !studentId) return json(400, { message: '请指定要解除的绑定' })
  if (!UUID.test(parentId) || !UUID.test(studentId)) return json(400, { message: '没有这项绑定' })

  const { data, error } = await db
    .from('parent_binding')
    .update({ revoked_at: new Date().toISOString() })
    .eq('parent_account_id', parentId)
    .eq('student_id', studentId)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle()
  if (error) return json(500, { message: '解除失败' })
  if (!data) return json(404, { message: '没有这项绑定' })
  return json(200, { ok: true })
}

async function resetPassword(db: SupabaseClient, body: Record<string, unknown>): Promise<Response> {
  const role = body.role === 'student' || body.role === 'parent' ? body.role : ''
  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  if (!role || !userId) return json(400, { message: '请指定要重置的账号' })
  if (!UUID.test(userId)) return json(400, { message: role === 'student' ? '没有这名学生' : '没有这位家长' })

  if (role === 'student') {
    const { data: existing, error: readError } = await db.from('student').select('id, account, auth_user_id').eq('id', userId).maybeSingle()
    if (readError) return json(500, { message: '重置失败' })
    if (!existing) return json(404, { message: '没有这名学生' })
    const plain = generateInitialPassword(8)
    const passwordHash = await hashPassword(plain)
    const { error } = await db.from('student').update({ password_hash: passwordHash }).eq('id', existing.id)
    if (error) return json(500, { message: '重置失败' })
    if (existing.auth_user_id) {
      try {
        await ensureAuthUser(db, loginEmail('student', String(existing.account)), plain)
      } catch (error) {
        console.error('sync student auth failed', error instanceof Error ? error.message : error)
      }
    }
    return json(200, { password: plain })
  }

  const { data: existing, error: readError } = await db
    .from('parent_account')
    .select('id, account, auth_user_id')
    .eq('id', userId)
    .is('anonymized_at', null)
    .maybeSingle()
  if (readError) return json(500, { message: '重置失败' })
  if (!existing) return json(404, { message: '没有这位家长' })
  const plain = generateInitialPassword(8)
  const passwordHash = await hashPassword(plain)
  const { error } = await db.from('parent_account').update({ password_hash: passwordHash }).eq('id', existing.id)
  if (error) return json(500, { message: '重置失败' })
  if (existing.auth_user_id) {
    try {
      await ensureAuthUser(db, loginEmail('parent', String(existing.account)), plain)
    } catch (error) {
      console.error('sync parent auth failed', error instanceof Error ? error.message : error)
    }
  }
  return json(200, { password: plain })
}

async function deleteParent(db: SupabaseClient, body: Record<string, unknown>): Promise<Response> {
  const parentId = typeof body.parentId === 'string' ? body.parentId.trim() : ''
  if (!parentId) return json(400, { message: '请指定家长' })
  if (!UUID.test(parentId)) return json(400, { message: '没有这位家长' })

  const { data: existing, error: readError } = await db
    .from('parent_account')
    .select('id, auth_user_id')
    .eq('id', parentId)
    .is('anonymized_at', null)
    .maybeSingle()
  if (readError) return json(500, { message: '注销失败' })
  if (!existing) return json(404, { message: '没有这位家长' })

  const { error: unbindError } = await db
    .from('parent_binding')
    .update({ revoked_at: new Date().toISOString() })
    .eq('parent_account_id', parentId)
    .is('revoked_at', null)
  if (unbindError) return json(500, { message: '注销失败' })

  const discarded = generateInitialPassword(24)
  const passwordHash = await hashPassword(discarded)
  const account = String(existing.id).replace(/-/g, '')
  const { error } = await db
    .from('parent_account')
    .update({ account, password_hash: passwordHash, anonymized_at: new Date().toISOString() })
    .eq('id', parentId)
    .is('anonymized_at', null)
  if (error) return json(500, { message: '注销失败' })

  if (existing.auth_user_id) {
    const { error: authError } = await db.auth.admin.updateUserById(String(existing.auth_user_id), { password: discarded })
    if (authError) console.error('disable parent auth failed', authError.message)
  }
  return json(200, { ok: true })
}
