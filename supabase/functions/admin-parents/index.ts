// 平台家长管理。身份只从 requireOps 读取，查询覆盖全部家长。
// 解除绑定只写 revoked_at。明文密码只出现在本次响应里。
import { ensureAuthUser, loginEmail } from '../_shared/authUser.ts'
import { empty, json } from '../_shared/http.ts'
import { generateInitialPassword, hashPassword } from '../_shared/password.ts'
import { requireOps } from '../_shared/staff.ts'
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

function asIso(value: unknown): string | null {
  if (value == null || value === '') return null
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function likeTerm(keyword: string): string | null {
  const cleaned = keyword.trim().slice(0, 40).replace(/[%_\\]/g, '')
  return cleaned ? `%${cleaned}%` : null
}

function present(row: ParentRecord, childCount: number) {
  return {
    id: row.id,
    account: row.account,
    childCount,
    createdAt: asIso(row.created_at) ?? String(row.created_at ?? ''),
    lastLoginAt: asIso(row.last_login_at),
  }
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
    if (action === 'list') return await listParents(auth.db, body)
    if (action === 'detail') return await parentDetail(auth.db, body)
    if (action === 'unbind') return await unbindChild(auth.db, body)
    if (action === 'reset-password') return await resetPassword(auth.db, body)
    return json(400, { message: '不认识的操作' })
  } catch (error) {
    console.error('admin-parents failed', action, action === 'reset-password' ? 'reset' : error instanceof Error ? error.message : error)
    return json(500, { message: action === 'reset-password' ? '重置失败' : action === 'unbind' ? '解除失败' : '读取失败' })
  }
})

async function listParents(db: SupabaseClient, body: Record<string, unknown>): Promise<Response> {
  const page = positiveInt(body.page, 1, 10_000)
  const pageSize = positiveInt(body.pageSize, 20, 50)
  const matched = await matchingParentIds(db, typeof body.keyword === 'string' ? body.keyword : '')
  if (matched && matched.length === 0) {
    return json(200, { page, pageSize, total: 0, parents: [] })
  }

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
    parents: rows.map((row) => present(row, counts.get(row.id) ?? 0)),
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
  return json(200, {
    parent: present(data as ParentRecord, children.length),
    children,
  })
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

async function unbindChild(db: SupabaseClient, body: Record<string, unknown>): Promise<Response> {
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
  const parentId = typeof body.parentId === 'string' ? body.parentId.trim() : ''
  if (!parentId) return json(400, { message: '请指定家长' })
  if (!UUID.test(parentId)) return json(400, { message: '没有这位家长' })

  const { data: existing, error: readError } = await db
    .from('parent_account')
    .select('id, account, auth_user_id')
    .eq('id', parentId)
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
