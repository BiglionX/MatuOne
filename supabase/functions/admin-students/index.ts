// 平台学生管理。身份只从 requireOps 读取，学生查询默认覆盖全部机构。
// orgId 只作为列表筛选项。明文密码只出现在本次响应里。
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

function present(
  row: StudentRecord,
  orgName: string,
  groupName: string,
  boundParentCount: number,
) {
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
  const action = typeof body.action === 'string' ? body.action : 'list'

  try {
    if (action === 'list') return await listStudents(auth.db, body)
    if (action === 'detail') return await studentDetail(auth.db, body)
    if (action === 'reset-password') return await resetPassword(auth.db, body)
    return json(400, { message: '不认识的操作' })
  } catch (error) {
    console.error('admin-students failed', action, error instanceof Error ? error.message : error)
    return json(500, { message: action === 'reset-password' ? '重置失败' : '读取失败' })
  }
})

async function listStudents(db: SupabaseClient, body: Record<string, unknown>): Promise<Response> {
  const page = positiveInt(body.page, 1, 10_000)
  const pageSize = positiveInt(body.pageSize, 20, 50)
  const status = typeof body.status === 'string' ? body.status : ''
  if (status && status !== 'active' && status !== 'disabled') return json(400, { message: '学生状态不正确' })
  const orgFilter = typeof body.orgId === 'string' ? body.orgId.trim() : ''
  if (orgFilter && !UUID.test(orgFilter)) return json(400, { message: '机构筛选无效' })

  let query = db
    .from('student')
    .select('id, name, account, status, org_id, group_id, current_level_order, last_active_at', { count: 'exact' })
  if (orgFilter) query = query.eq('org_id', orgFilter)
  if (status) query = query.eq('status', status)
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
    students: rows.map((row) => present(row, orgs.get(row.org_id) ?? '', groups.get(row.group_id) ?? '', counts.get(row.id) ?? 0)),
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
      ...present(row, orgs.get(row.org_id) ?? '', groups.get(row.group_id) ?? '', parents.length),
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
  const { data: accounts, error: accountError } = await db.from('parent_account').select('id, account').in('id', accountIds)
  if (accountError) throw new Error('读取失败')
  const byId = new Map((accounts ?? []).map((row) => [String(row.id), String(row.account)]))
  return (data ?? []).flatMap((row) => {
    const account = byId.get(String(row.parent_account_id ?? ''))
    if (!account) return []
    return [{ account, boundAt: asIso(row.created_at) ?? String(row.created_at ?? '') }]
  })
}

async function resetPassword(db: SupabaseClient, body: Record<string, unknown>): Promise<Response> {
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : ''
  if (!studentId) return json(400, { message: '请指定学生' })
  if (!UUID.test(studentId)) return json(400, { message: '没有这名学生' })

  const { data: existing, error: readError } = await db
    .from('student')
    .select('id, account, auth_user_id')
    .eq('id', studentId)
    .maybeSingle()
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
