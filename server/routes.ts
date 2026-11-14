import { generateBindCode, isAcceptableBindCode, normalizeBindCode } from '../supabase/functions/_shared/bindCode'
import { normalizeTypingScore } from '../supabase/functions/_shared/typingScore'
import { validateCoursePackage } from '../supabase/functions/_shared/coursePackage'
import { COURSE_TREE_SQL, groupCourseTree, type CourseTreeSourceRow } from '../supabase/functions/_shared/courseTree'
import { toCurriculumPosition, type CurriculumPositionRow } from '../supabase/functions/_shared/curriculumPosition'
import { seatLimit, type OrgStatus } from '../supabase/functions/_shared/orgStatus'
import { generateInitialPassword, hashPassword, verifyPassword } from '../supabase/functions/_shared/password'
import { planStudentImport } from '../supabase/functions/_shared/studentImport'
import { dbMessage, one, q } from './db'
import { decideStudentLevel } from './enter'
import { readProgressMarks, resolveStoredLevel } from './curriculum'
import { buildPlayableLevel } from '../src/lib/lessonMaterial'
import { presentLearningHome, projectUnit, type AccessContext } from '../src/lib/curriculumState'
import { curriculumUnitById } from '../src/data/fullCurriculum'
import { issueSession, readSession, type SessionRole } from './session'

export interface ApiResult {
  status: number
  body: unknown
}

export interface ApiRequest {
  method: string
  name: string
  header(name: string): string | null
  body: Record<string, unknown>
}

const ok = (body: unknown, status = 200): ApiResult => ({ status, body })
const fail = (status: number, message: string): ApiResult => ({ status, body: { message } })

function missingRelation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('does not exist')
}

async function readLevelProgress(studentId: string): Promise<{ level_id: string; completed: boolean; stars: number }[]> {
  try {
    return await q('select level_id, completed, stars from public.learning_record where student_id = $1', [studentId])
  } catch (error) {
    if (!missingRelation(error)) throw error
    return await q('select level_id, completed, stars from public.level_progress where student_id = $1', [studentId])
  }
}

async function writeLevelProgress(studentId: string, levelId: string, stars: number, taps: number): Promise<void> {
  try {
    await q(
      `insert into public.learning_record (student_id, level_id, completed, stars, change_done, error_taps, runs)
       values ($1, $2, true, $3, true, $4, 1)
       on conflict (student_id, level_id) do update set
         completed = true,
         stars = excluded.stars,
         change_done = true,
         error_taps = excluded.error_taps,
         runs = public.learning_record.runs + 1,
         updated_at = now()`,
      [studentId, levelId, stars, taps],
    )
  } catch (error) {
    if (!missingRelation(error)) throw error
    const existing = await one<{ id: string; runs: number }>('select id, runs from public.level_progress where student_id = $1 and level_id = $2', [
      studentId,
      levelId,
    ])
    if (existing) {
      await q(
        'update public.level_progress set completed = true, stars = $2, change_done = true, error_taps = $3, runs = $4, updated_at = now() where id = $1',
        [existing.id, stars, taps, existing.runs + 1],
      )
    } else {
      await q(
        'insert into public.level_progress (student_id, level_id, completed, stars, change_done, error_taps, runs) values ($1, $2, true, $3, true, $4, 1)',
        [studentId, levelId, stars, taps],
      )
    }
  }
}

async function loadCurriculumPosition(studentId: string) {
  try {
    const row = await one<CurriculumPositionRow & Record<string, unknown>>('select * from public.student_curriculum_position($1)', [studentId])
    return row?.level_id ? toCurriculumPosition(row) : null
  } catch {
    return null
  }
}

function isOrgStatus(value: unknown): value is OrgStatus {
  return value === 'trial' || value === 'active' || value === 'expired' || value === 'disabled'
}

async function effectiveStatus(org: { status: string; trial_expire_at: string | null; service_end_at: string | null }): Promise<OrgStatus | null> {
  const row = await one<{ status: string }>('select effective_org_status($1, $2, $3) as status', [
    org.status,
    org.trial_expire_at,
    org.service_end_at,
  ])
  return isOrgStatus(row?.status) ? row.status : null
}

function publicError(error: unknown): string {
  const line = dbMessage(error).split('\n')[0]?.replace(/^ERROR:\s*/, '') ?? ''
  if (line.includes('missing DATABASE_URL')) return '服务未配置'
  const redacted = line.replace(/postgres(?:ql)?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim()
  if (!redacted) return '请求失败'
  return redacted.length > 160 ? `${redacted.slice(0, 160)}…` : redacted
}

function friendly(error: unknown, known: string[], fallback: string): ApiResult {
  const line = dbMessage(error).split('\n')[0]?.replace(/^ERROR:\s*/, '') ?? ''
  if (known.some((item) => line.includes(item))) return fail(400, line)
  return fail(500, fallback)
}

async function requireRole(req: ApiRequest, role: SessionRole): Promise<{ subjectId: string } | ApiResult> {
  const session = await readSession(req.header('authorization'))
  if (!session || session.role !== role) return fail(401, '未登录')
  return { subjectId: session.subjectId }
}

export async function dispatch(req: ApiRequest): Promise<ApiResult> {
  if (req.method === 'OPTIONS') return { status: 204, body: {} }
  if (req.method !== 'POST') return fail(405, '只接受 POST')
  try {
    switch (req.name) {
      case 'org-login':
        return await orgLogin(req)
      case 'student-login':
        return await studentLogin(req)
      case 'platform-login':
        return await platformLogin(req)
      case 'parent-login':
        return await parentLogin(req)
      case 'parent-portal':
        return await parentPortal(req)
      case 'org-students':
        return await orgStudents(req)
      case 'org-course':
        return await orgCourse(req)
      case 'org-dashboard':
        return await orgDashboard(req)
      case 'student-learning':
        return await studentLearning(req)
      case 'student-enter-level':
        return await studentEnter(req)
      case 'public-site':
        return await publicSite(req)
      case 'admin-ops':
        return await adminOps(req)
      case 'admin-students':
        return await adminStudents(req)
      case 'admin-parents':
        return await adminParents(req)
      case 'admin-users':
        return await adminUsers(req)
      case 'admin-dashboard':
        return await adminDashboard(req)
      case 'admin-provision-org':
        return await provisionOrg(req)
      case 'course-catalog':
        return await courseCatalog(req)
      default:
        return fail(404, '没有这个接口')
    }
  } catch (error) {
    const message = publicError(error)
    console.error('api failed', req.name, dbMessage(error))
    return fail(500, message)
  }
}

async function orgLogin(req: ApiRequest): Promise<ApiResult> {
  const account = typeof req.body.account === 'string' ? req.body.account.trim() : ''
  const password = typeof req.body.password === 'string' ? req.body.password : ''
  if (!account || !password) return fail(401, '账号或密码不正确')
  const row = await one<{
    admin_id: string
    password_hash: string
    org_id: string
    org_no: string
    org_name: string
    org_status: string
    trial_expire_at: string | null
    service_end_at: string | null
    seat_quota: number
    used_seats: number
  }>('select * from public.org_admin_login_lookup($1)', [account])
  if (!row) {
    await hashPassword('timing-pad')
    return fail(401, '账号或密码不正确')
  }
  if (!(await verifyPassword(password, row.password_hash))) return fail(401, '账号或密码不正确')
  const status = await effectiveStatus({ status: row.org_status, trial_expire_at: row.trial_expire_at, service_end_at: row.service_end_at })
  if (!status) return fail(500, '登录失败')
  if (status === 'disabled') return fail(403, '机构已停用，无法登录')
  await q('select public.mark_org_admin_login($1)', [row.admin_id])
  const session = await issueSession('org', row.admin_id)
  return ok({
    ...session,
    adminId: row.admin_id,
    account,
    orgId: row.org_id,
    orgNo: row.org_no,
    orgName: row.org_name,
    status,
    readOnly: status === 'expired',
    seatQuota: row.seat_quota,
    usedSeats: row.used_seats,
    trialExpireAt: row.trial_expire_at,
    serviceEndAt: row.service_end_at,
  })
}

async function studentLogin(req: ApiRequest): Promise<ApiResult> {
  const account = typeof req.body.account === 'string' ? req.body.account.trim() : ''
  const password = typeof req.body.password === 'string' ? req.body.password : ''
  if (!account || !password) return fail(401, '账号或密码不对，问问老师。')
  const row = await one<{
    student_id: string
    password_hash: string
    name: string
    account: string
    group_id: string
    bind_code: string | null
    current_level_order: number
    last_active_at: string | null
    org_id: string
    org_name: string
    org_status: string
    trial_expire_at: string | null
    service_end_at: string | null
  }>('select * from public.student_login_lookup($1)', [account])
  if (!row) {
    await hashPassword('timing-pad')
    return fail(401, '账号或密码不对，问问老师。')
  }
  if (!(await verifyPassword(password, row.password_hash))) return fail(401, '账号或密码不对，问问老师。')
  const status = await effectiveStatus({ status: row.org_status, trial_expire_at: row.trial_expire_at, service_end_at: row.service_end_at })
  if (!status) return fail(500, '登录失败')
  if (status === 'disabled') return fail(403, '机构已停用，无法登录')
  const session = await issueSession('student', row.student_id)
  return ok({
    ...session,
    student: {
      id: row.student_id,
      orgId: row.org_id,
      orgName: row.org_name,
      groupId: row.group_id,
      name: row.name,
      account: row.account,
      status: 'active',
      currentLevelOrder: row.current_level_order,
      lastActiveAt: row.last_active_at ?? '',
      bindCode: row.bind_code ?? '',
    },
  })
}

async function platformLogin(req: ApiRequest): Promise<ApiResult> {
  const account = typeof req.body.account === 'string' ? req.body.account.trim() : ''
  const password = typeof req.body.password === 'string' ? req.body.password : ''
  if (!account || !password) return fail(401, '账号或密码不正确')
  const row = await one<{ staff_id: string; account: string; display_name: string; role: string; password_hash: string | null }>(
    'select * from public.platform_login_lookup($1)',
    [account],
  )
  if (!row?.password_hash) {
    await hashPassword('timing-pad')
    return fail(401, '账号或密码不正确')
  }
  if (!(await verifyPassword(password, row.password_hash))) return fail(401, '账号或密码不正确')
  if (row.role !== 'ops' && row.role !== 'finance') return fail(403, '需要平台权限')
  const session = await issueSession('platform', row.staff_id)
  return ok({ ...session, account: row.account, displayName: row.display_name, role: row.role })
}

const PARENT_ACCOUNT = /^[a-z0-9][a-z0-9._]{2,31}$/

async function parentLogin(req: ApiRequest): Promise<ApiResult> {
  const account = typeof req.body.account === 'string' ? req.body.account.trim().toLowerCase() : ''
  const password = typeof req.body.password === 'string' ? req.body.password : ''
  if (!PARENT_ACCOUNT.test(account)) return fail(400, '用户名需要 3–32 位，以字母或数字开头，只能包含字母、数字、点和下划线')
  if (password.length < 8 || password.length > 72) return fail(400, '密码需要 8–72 位')
  if (req.body.action === 'register') {
    try {
      const created = await one<{ id: string }>(
        'insert into public.parent_account (account, password_hash) values ($1, $2) returning id',
        [account, await hashPassword(password)],
      )
      if (!created) return fail(500, '注册失败')
      await q('update public.parent_account set last_login_at = now() where id = $1', [created.id])
      return ok({ ...(await issueSession('parent', created.id)), account })
    } catch (error) {
      if (dbMessage(error).includes('duplicate') || dbMessage(error).includes('unique')) {
        return fail(409, '这个用户名已经注册过了，直接登录即可')
      }
      return fail(500, '注册失败')
    }
  }
  const row = await one<{ parent_id: string; password_hash: string }>('select * from public.parent_login_lookup($1)', [account])
  if (!row) {
    await hashPassword('timing-pad')
    return fail(401, '用户名或密码不正确')
  }
  if (!(await verifyPassword(password, row.password_hash))) return fail(401, '用户名或密码不正确')
  await q('update public.parent_account set last_login_at = now() where id = $1', [row.parent_id])
  return ok({ ...(await issueSession('parent', row.parent_id)), account })
}

async function orgContext(req: ApiRequest, options: { write?: boolean; importStudents?: boolean }) {
  const auth = await requireRole(req, 'org')
  if ('status' in auth) return auth
  const admin = await one<{ org_id: string; status: string }>('select org_id, status from public.org_admin where id = $1', [auth.subjectId])
  if (!admin || admin.status !== 'active') return fail(401, '未登录')
  const requested = typeof req.body.orgId === 'string' ? req.body.orgId.trim() : ''
  if (requested && requested !== admin.org_id) return fail(403, '无权访问该机构')
  const org = await one<{
    id: string
    status: string
    seat_quota: number
    used_seats: number
    trial_expire_at: string | null
    service_end_at: string | null
  }>('select id, status, seat_quota, used_seats, trial_expire_at, service_end_at from public.org where id = $1', [admin.org_id])
  if (!org) return fail(401, '未登录')
  const status = await effectiveStatus(org)
  if (!status) return fail(500, '读取机构状态失败')
  if (status === 'disabled') return fail(403, '机构已停用')
  if (status === 'expired' && (options.write || options.importStudents)) return fail(403, '服务已到期，仅可查看')
  const limit = seatLimit({ status: org.status as OrgStatus, seatQuota: org.seat_quota }, status)
  if (options.importStudents && org.used_seats >= limit) return fail(409, '席位已满')
  return { orgId: org.id, status, seatLimit: limit, usedSeats: org.used_seats }
}

async function orgStudents(req: ApiRequest): Promise<ApiResult> {
  const action = req.header('x-action') ?? 'list'
  const writing = action === 'import' || action === 'create-group'
  const ctx = await orgContext(req, { write: writing, importStudents: action === 'import' })
  if (!('orgId' in ctx)) return ctx
  if (action === 'groups' || action === 'create-group') {
    if (action === 'create-group') {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
      if (name.length < 1 || name.length > 30) return fail(400, '分组名需要 1–30 个字')
      try {
        await q('insert into public.student_group (org_id, name) values ($1, $2)', [ctx.orgId, name])
      } catch (error) {
        if (dbMessage(error).includes('duplicate') || dbMessage(error).includes('unique')) return fail(400, '分组已存在')
        return fail(500, '创建分组失败')
      }
    }
    const groups = await q('select id, name from public.student_group where org_id = $1 order by created_at asc', [ctx.orgId])
    return ok({ groups })
  }
  if (action === 'progress') {
    const studentId = typeof req.body.studentId === 'string' ? req.body.studentId.trim() : ''
    const student = await one<{ name: string; current_level_order: number }>(
      'select name, current_level_order from public.student where id = $1 and org_id = $2',
      [studentId, ctx.orgId],
    )
    if (!student) return fail(404, '没有这名学生')
    const lessons = await q<{
      level_id: string
      sort_order: number
      title: string
      teaching_intent: string | null
      teacher_guide: string | null
      completed: boolean
    }>(
      `select cl.level_id, cl.sort_order, cl.title, cl.teaching_intent, cl.teacher_guide,
              coalesce(lr.completed, false) as completed
       from public.course_level cl
       left join public.learning_record lr
         on lr.level_id = cl.level_id and lr.student_id = $1
       where lr.student_id is not null or cl.sort_order = $2
       order by cl.sort_order`,
      [studentId, student.current_level_order],
    )
    return ok({
      name: student.name,
      lessons: lessons.map((row) => ({
        levelId: row.level_id,
        order: row.sort_order,
        title: row.title,
        completed: row.completed === true,
        current: row.sort_order === student.current_level_order,
        teachingIntent: row.teaching_intent,
        teacherGuide: row.teacher_guide,
      })),
    })
  }
  if (action === 'unbind-parent') {
    const studentId = typeof req.body.studentId === 'string' ? req.body.studentId.trim() : ''
    const student = await one('select id from public.student where id = $1 and org_id = $2', [studentId, ctx.orgId])
    if (!student) return fail(404, '没有这名学生')
    await q('update public.parent_binding set revoked_at = now() where student_id = $1 and revoked_at is null', [studentId])
    return ok({ ok: true, boundParentCount: 0 })
  }
  if (action !== 'import') {
    const students = await q(
      `select s.id, s.name, s.account, s.group_id, s.status, s.bind_code, s.current_level_order, s.last_active_at,
        (select count(*)::int from public.parent_binding b where b.student_id = s.id and b.revoked_at is null) as bound_parent_count
       from public.student s where s.org_id = $1`,
      [ctx.orgId],
    )
    return ok({ students })
  }
  const groups = await q<{ id: string; name: string }>('select id, name from public.student_group where org_id = $1', [ctx.orgId])
  const groupByName = new Map(groups.map((group) => [group.name, group.id]))
  const csv = typeof req.body.csv === 'string' ? req.body.csv : ''
  const lines = csv.replace(/\r\n/g, '\n').split('\n').map((line) => line.trim()).filter(Boolean)
  const accounts = new Set<string>()
  const names = new Set<string>()
  lines.forEach((line, index) => {
    if (index === 0 && /姓名/.test(line)) return
    const [name = '', account = ''] = line.split(',').map((cell) => cell.trim())
    if (name) names.add(name)
    if (account) accounts.add(account)
  })
  const takenAccounts = new Set<string>()
  for (const account of accounts) {
    const found = await one<{ account: string }>('select account from public.student where lower(account) = lower($1)', [account])
    if (found) takenAccounts.add(found.account.toLowerCase())
  }
  const nameRows = names.size
    ? await q<{ name: string }>('select name from public.student where org_id = $1', [ctx.orgId])
    : []
  const plan = planStudentImport({
    csv,
    groupNames: [...groupByName.keys()],
    usedSeats: ctx.usedSeats,
    seatLimit: ctx.seatLimit,
    takenAccounts,
    takenNames: new Set(nameRows.map((row) => row.name)),
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
    let plain = generateInitialPassword(8)
    while (issued.has(plain)) plain = generateInitialPassword(8)
    const passwordHash = await hashPassword(plain)
    let inserted = false
    for (let attempt = 0; attempt < 5 && !inserted; attempt += 1) {
      try {
        await q(
          `insert into public.student (org_id, group_id, name, account, password_hash, status, bind_code, current_level_order)
           values ($1, $2, $3, $4, $5, 'active', $6, 1)`,
          [ctx.orgId, groupId, row.name, row.account, passwordHash, generateBindCode()],
        )
        inserted = true
      } catch (error) {
        if (dbMessage(error).includes('bind_code')) continue
        break
      }
    }
    if (!inserted) {
      rows.push({ row: row.row, name: row.name, account: row.account, ok: false, reason: '导入失败' })
      continue
    }
    added += 1
    issued.add(plain)
    rows.push({ row: row.row, name: row.name, account: row.account, ok: true, initialPassword: plain })
  }
  if (added > 0) await q('update public.org set used_seats = used_seats + $2 where id = $1', [ctx.orgId, added])
  return ok({ added, rows })
}

async function orgPackageLevel(orgId: string): Promise<number> {
  const grant = await one<{ max_level: number }>('select max_level from public.org_entitlement where org_id = $1', [orgId])
  const level = Number(grant?.max_level)
  return Number.isInteger(level) && level > 0 ? level : 0
}

async function orgPricing(orgId: string): Promise<{ studentMonthlyPrice: number; baseSeatPrice: number }> {
  const row = await one<{ student_monthly_price: number; base_seat_price: string }>(
    `select o.student_monthly_price, c.value as base_seat_price
     from public.org o
     join public.platform_configs c on c.key = 'base_seat_price'
     where o.id = $1`,
    [orgId],
  )
  const baseSeatPrice = Number(row?.base_seat_price)
  const studentMonthlyPrice = Number(row?.student_monthly_price)
  if (!Number.isInteger(baseSeatPrice) || baseSeatPrice < 1) throw new Error('缺少平台底价配置')
  return { studentMonthlyPrice, baseSeatPrice }
}

async function orgCourse(req: ApiRequest): Promise<ApiResult> {
  const action = req.header('x-action') ?? 'read'
  const ctx = await orgContext(req, { write: action === 'save' || action === 'save-price' })
  if (!('orgId' in ctx)) return ctx
  const countRow = await one<{ n: number }>("select count(*)::int as n from public.course_level where published = true")
  const levelCount = countRow?.n ?? 0
  if (action === 'save-price') {
    const studentMonthlyPrice = Number(req.body.studentMonthlyPrice)
    if (!Number.isInteger(studentMonthlyPrice) || studentMonthlyPrice < 150 || studentMonthlyPrice > 500) {
      return fail(400, '家长定价需要在 150 到 500 元之间')
    }
    await q('update public.org set student_monthly_price = $2 where id = $1', [ctx.orgId, studentMonthlyPrice])
  }
  if (action === 'save') {
    const groupId = typeof req.body.groupId === 'string' && req.body.groupId ? req.body.groupId : 'all'
    const seats = Number(req.body.seats)
    const expiresAt = typeof req.body.expiresAt === 'string' ? req.body.expiresAt : ''
    if (!Number.isInteger(seats) || seats < 1) return fail(400, '名额至少为 1')
    if (seats > ctx.seatLimit) return fail(409, '席位已满')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) return fail(400, '请填写有效期')
    if (groupId !== 'all') {
      const group = await one('select id from public.student_group where org_id = $1 and id = $2', [ctx.orgId, groupId])
      if (!group) return fail(400, '分组不存在')
    }
    const activatedAt = new Date().toISOString()
    await q(
      `insert into public.course_activation (org_id, group_id, seats, expires_at, activated_at)
       values ($1, $2, $3, $4, $5)
       on conflict (org_id) do update set group_id = excluded.group_id, seats = excluded.seats, expires_at = excluded.expires_at, activated_at = excluded.activated_at`,
      [ctx.orgId, groupId, seats, expiresAt, activatedAt],
    )
    const expires = new Date(`${expiresAt}T23:59:59`).toISOString()
    await q("update public.level_entitlement set expires_at = $2 where org_id = $1 and subject_type = 'org'", [ctx.orgId, expires])
    if (groupId !== 'all') {
      const existing = await one<{ id: string }>(
        "select id from public.level_entitlement where org_id = $1 and subject_type = 'group' and subject_id = $2",
        [ctx.orgId, groupId],
      )
      const max = ctx.status === 'trial' ? 3 : 999
      if (existing) {
        await q('update public.level_entitlement set level_order_min = 1, level_order_max = $2, expires_at = $3 where id = $1', [
          existing.id,
          max,
          expires,
        ])
      } else {
        await q(
          `insert into public.level_entitlement (org_id, subject_type, subject_id, level_order_min, level_order_max, expires_at)
           values ($1, 'group', $2, 1, $3, $4)`,
          [ctx.orgId, groupId, max, expires],
        )
      }
    }
    const pricing = await orgPricing(ctx.orgId)
    return ok({ groupId, seats, expiresAt, activatedAt, levelCount, maxLevel: await orgPackageLevel(ctx.orgId), ...pricing })
  }
  const data = await one<{ group_id: string; seats: number; expires_at: string; activated_at: string }>(
    'select group_id, seats, expires_at, activated_at from public.course_activation where org_id = $1',
    [ctx.orgId],
  )
  const org = await one<{ seat_quota: number; trial_expire_at: string | null; service_end_at: string | null; created_at: string }>(
    'select seat_quota, trial_expire_at, service_end_at, created_at from public.org where id = $1',
    [ctx.orgId],
  )
  const fallbackEnd = (org?.service_end_at ?? org?.trial_expire_at ?? '').slice(0, 10)
  const pricing = await orgPricing(ctx.orgId)
  return ok({
    groupId: data?.group_id ?? 'all',
    seats: data?.seats ?? org?.seat_quota ?? ctx.seatLimit,
    expiresAt: data?.expires_at ?? fallbackEnd,
    activatedAt: data?.activated_at ?? org?.created_at ?? new Date().toISOString(),
    levelCount,
    maxLevel: await orgPackageLevel(ctx.orgId),
    ...pricing,
  })
}

async function orgDashboard(req: ApiRequest): Promise<ApiResult> {
  const ctx = await orgContext(req, {})
  if (!('orgId' in ctx)) return ctx
  const students = await q<{
    id: string
    name: string
    account: string
    group_id: string
    status: string
    bind_code: string | null
    current_level_order: number
    last_active_at: string | null
  }>('select id, name, account, group_id, status, bind_code, current_level_order, last_active_at from public.student where org_id = $1', [
    ctx.orgId,
  ])
  const groups = await q<{ id: string; name: string }>('select id, name from public.student_group where org_id = $1', [ctx.orgId])
  const countRow = await one<{ n: number }>('select count(*)::int as n from public.course_level where published = true')
  const ids = students.map((student) => student.id)
  const progress = ids.length
    ? await q<{ student_id: string }>('select student_id from public.learning_record where completed = true and student_id = any($1::uuid[])', [ids]).catch(async (error: unknown) => {
        if (!missingRelation(error)) throw error
        return q<{ student_id: string }>('select student_id from public.level_progress where completed = true and student_id = any($1::uuid[])', [ids])
      })
    : []
  const typing = ids.length
    ? await q<{ student_id: string; wpm: number; accuracy: number; created_at: string }>(
        'select student_id, wpm, accuracy, created_at from public.typing_record where student_id = any($1::uuid[])',
        [ids],
      )
    : []
  const completed = new Map<string, number>()
  for (const row of progress) completed.set(row.student_id, (completed.get(row.student_id) ?? 0) + 1)
  const latestTyping = new Map<string, { wpm: number; accuracy: number; at: string }>()
  for (const row of typing) {
    const prev = latestTyping.get(row.student_id)
    if (!prev || row.created_at > prev.at) latestTyping.set(row.student_id, { wpm: Number(row.wpm), accuracy: Number(row.accuracy), at: row.created_at })
  }
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const activeStudents = students.filter((student) => student.status === 'active')
  const totalLevels = countRow?.n ?? 0
  const avg = activeStudents.reduce((sum, student) => sum + (completed.get(student.id) ?? 0), 0) / Math.max(1, activeStudents.length)
  const groupName = new Map(groups.map((group) => [group.id, group.name]))
  return ok({
    reading: activeStudents.length,
    weeklyActive: activeStudents.filter((student) => student.last_active_at && new Date(student.last_active_at).getTime() >= weekAgo).length,
    avgCompleted: Math.round(avg * 10) / 10,
    totalLevels,
    groupRows: groups.map((group) => {
      const inGroup = activeStudents.filter((student) => student.group_id === group.id)
      const done = inGroup.reduce((sum, student) => sum + (completed.get(student.id) ?? 0), 0)
      const denom = totalLevels * Math.max(1, inGroup.length)
      return { groupId: group.id, name: group.name, rate: inGroup.length && totalLevels ? Math.round((done / denom) * 100) : 0, students: inGroup.length }
    }),
    studentRows: students.map((student) => {
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
}

function weekStart(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7))
  return copy
}

function asDay(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function bucketTyping(rows: { practiced_on: string | Date; wpm: number; accuracy: number }[]) {
  const thisWeek = weekStart(new Date())
  return [3, 2, 1, 0].map((ago) => {
    const start = new Date(thisWeek)
    start.setDate(start.getDate() - ago * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const matched = rows.filter((row) => {
      const day = new Date(`${asDay(row.practiced_on)}T00:00:00`)
      return day >= start && day < end
    })
    const label = `${start.getMonth() + 1}/${start.getDate()}`
    if (!matched.length) return { weekStart: start.toISOString().slice(0, 10), label, wpm: null, accuracy: null }
    const wpm = matched.reduce((sum, row) => sum + Number(row.wpm), 0) / matched.length
    const accuracy = matched.reduce((sum, row) => sum + Number(row.accuracy), 0) / matched.length
    return { weekStart: start.toISOString().slice(0, 10), label, wpm: Math.round(wpm * 10) / 10, accuracy: Math.round(accuracy * 10) / 10 }
  })
}

/** 试课请求即使打到学生接口，也不写学习记录、打字记录和上课会话。 */
function previewBlocksProgress(body: Record<string, unknown>): boolean {
  return body.preview === true || body.preview === 'true' || body.sandbox === true
}

async function studentLearning(req: ApiRequest): Promise<ApiResult> {
  const auth = await requireRole(req, 'student')
  if ('status' in auth) return { status: auth.status, body: auth.status === 401 ? { message: '请先登录' } : auth.body }
  const student = await one<{
    id: string
    org_id: string
    group_id: string
    name: string
    account: string
    status: string
    bind_code: string | null
    current_level_order: number
    last_active_at: string | null
  }>('select id, org_id, group_id, name, account, status, bind_code, current_level_order, last_active_at from public.student where id = $1', [
    auth.subjectId,
  ])
  if (!student || student.status !== 'active') return fail(401, '请先登录')
  const action = typeof req.body.action === 'string' ? req.body.action : 'map'
  if (previewBlocksProgress(req.body) && (action === 'typing' || action === 'touch' || action === 'complete')) {
    return fail(403, '预览模式不会记录学习进度')
  }
  const levelRaw = req.body.levelId
  const requestedLevelId = typeof levelRaw === 'number' && Number.isInteger(levelRaw) ? String(levelRaw) : typeof levelRaw === 'string' ? levelRaw.trim() : ''

  if (action === 'typing') {
    const decision = await decideStudentLevel(student.id, requestedLevelId || 'L01')
    if (!decision.result.allowed) return { status: decision.httpStatus, body: decision.result }
    const raw = req.body.practiceType === 'baseline_keys' ? 'home_row' : req.body.practiceType
    if (raw !== 'home_row' && raw !== 'keywords' && raw !== 'lesson_embedded') return fail(400, '练习类型不正确')
    const score = normalizeTypingScore(req.body.wpm, req.body.accuracy)
    if (!score) return fail(400, '打字记录无效')
    await q('insert into public.typing_record (student_id, practiced_on, practice_type, wpm, accuracy) values ($1, current_date, $2, $3, $4)', [
      student.id,
      raw,
      score.wpm,
      score.accuracy,
    ])
    return ok({ ok: true })
  }
  if (action === 'series') {
    const rows = await q<{ practiced_on: string; wpm: number; accuracy: number }>(
      'select practiced_on, wpm, accuracy from public.typing_record where student_id = $1',
      [student.id],
    )
    return ok({ series: bucketTyping(rows) })
  }
  if (action === 'touch') {
    const decision = await decideStudentLevel(student.id, requestedLevelId)
    if (!decision.result.allowed) return { status: decision.httpStatus, body: decision.result }
    await q('update public.study_session set ended_at = now() where student_id = $1 and ended_at is null', [student.id])
    await q('insert into public.study_session (student_id, level_id) values ($1, $2)', [student.id, decision.levelId])
    await q('update public.student set last_active_at = now() where id = $1', [student.id])
    return ok({ ok: true })
  }
  if (action === 'complete') {
    const decision = await decideStudentLevel(student.id, requestedLevelId)
    if (!decision.result.allowed) return { status: decision.httpStatus, body: decision.result }
    const stored = await resolveStoredLevel(decision.levelId)
    const stars = Number(req.body.stars)
    const errorTaps = Number(req.body.errorTaps ?? 0)
    if (!stored || !Number.isInteger(stars) || stars < 0 || stars > 3) return fail(400, '完成记录不完整')
    await q('update public.study_session set ended_at = now() where student_id = $1 and ended_at is null', [student.id])
    const taps = Number.isFinite(errorTaps) ? errorTaps : 0
    await writeLevelProgress(student.id, stored.levelId, stars, taps)
    if (stored.order + 1 > student.current_level_order) {
      await q('update public.student set current_level_order = $2, last_active_at = now() where id = $1', [student.id, stored.order + 1])
    } else {
      await q('update public.student set last_active_at = now() where id = $1', [student.id])
    }
    return ok({ ok: true })
  }
  if (action === 'level') {
    const decision = await decideStudentLevel(student.id, requestedLevelId)
    if (!decision.result.allowed) return { status: decision.httpStatus, body: decision.result }
    const playable = buildPlayableLevel(decision.levelId)
    if (!playable) return fail(404, '没有找到这一关')
    const storedCopy = await findCourseLevel(decision.levelId)
    const hints = await q('select pattern, friendly_message from public.error_hint')
    return ok({ level: withStoredGoal(playable, storedCopy?.goal), hints })
  }

  const access = await loadStudentAccess(student)
  const marks = await readProgressMarks(student.id)
  if (action === 'unit') {
    const unitId = typeof req.body.unitId === 'string' ? req.body.unitId.trim() : ''
    const unit = curriculumUnitById(unitId)
    const levels = unit ? projectUnit(unitId, marks, access) : null
    if (!unit || !levels) return fail(404, '没有这个单元')
    return ok({ unitId: unit.unitId, title: unit.title, levels })
  }

  const home = presentLearningHome(marks, access)
  const hints = await q('select pattern, friendly_message from public.error_hint')
  const group = await one<{ name: string }>('select name from public.student_group where id = $1', [student.group_id])
  const entries = home.entries.map((level) => ({
    levelId: level.levelId,
    order: level.order,
    title: level.title,
    goal: level.goal,
    isReview: false,
    completed: level.completed,
    stars: level.stars,
    unlocked: level.unlocked,
    current: level.current,
  }))
  const typingRows = await q<{ practiced_on: string; wpm: number; accuracy: number; created_at: string }>(
    'select practiced_on, wpm, accuracy, created_at from public.typing_record where student_id = $1',
    [student.id],
  )
  const latest = [...typingRows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]
  return ok({
    orgName: access.orgName,
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
    heading: home.heading,
    stageLevel: home.stageLevel,
    stageTitle: home.stageTitle,
    stageSubtitle: home.stageSubtitle,
    units: home.units,
    currentUnitId: home.currentUnitId,
    entries,
    completedCount: home.completedCount,
    currentOrder: home.currentOrder,
    position: await loadCurriculumPosition(student.id),
    hints,
    typingSeries: bucketTyping(typingRows),
    latestTyping: latest ? { wpm: Number(latest.wpm), accuracy: Number(latest.accuracy) } : null,
  })
}

async function loadStudentAccess(student: { id: string; org_id: string; group_id: string }): Promise<AccessContext & { orgName: string }> {
  const org = await one<{ id: string; status: string; trial_expire_at: string | null; service_end_at: string | null; name: string }>(
    'select id, status, trial_expire_at, service_end_at, name from public.org where id = $1',
    [student.org_id],
  )
  const status = org ? await effectiveStatus(org) : 'disabled'
  const entitlements = await q<{
    org_id: string
    subject_type: 'org' | 'group' | 'student'
    subject_id: string
    level_order_min: number
    level_order_max: number
    expires_at: string | null
  }>('select org_id, subject_type, subject_id, level_order_min, level_order_max, expires_at from public.level_entitlement where org_id = $1', [
    student.org_id,
  ])
  const open = entitlements.filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now())
  return {
    status: status ?? 'disabled',
    orgId: student.org_id,
    groupId: student.group_id,
    studentId: student.id,
    orgName: org?.name ?? '',
    spans: open.map((row) => ({
      orgId: row.org_id,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      levelOrderMin: row.level_order_min,
      levelOrderMax: row.level_order_max,
    })),
  }
}

async function studentEnter(req: ApiRequest): Promise<ApiResult> {
  const auth = await requireRole(req, 'student')
  if ('status' in auth) return { status: 401, body: { allowed: false, reason: 'unauthenticated' } }
  const student = await one<{ status: string }>('select status from public.student where id = $1', [auth.subjectId])
  if (!student || student.status !== 'active') return { status: 401, body: { allowed: false, reason: 'unauthenticated' } }
  const levelRaw = req.body.levelId
  const levelId = typeof levelRaw === 'number' && Number.isInteger(levelRaw) ? String(levelRaw) : typeof levelRaw === 'string' ? levelRaw : ''
  const decision = await decideStudentLevel(auth.subjectId, levelId)
  return { status: decision.httpStatus, body: decision.result }
}

const INVALID_CODE = '绑定码无效或已失效'

function clientIp(req: ApiRequest): string {
  const forwarded = req.header('x-forwarded-for') ?? ''
  const first = forwarded.split(',')[0]?.trim()
  if (first) return first.slice(0, 64)
  return (req.header('x-real-ip') ?? 'unknown').slice(0, 64)
}

async function parentPortal(req: ApiRequest): Promise<ApiResult> {
  const auth = await requireRole(req, 'parent')
  if ('status' in auth) return auth
  const parent = await one<{ anonymized_at: string | null }>('select anonymized_at from public.parent_account where id = $1', [auth.subjectId])
  if (!parent || parent.anonymized_at) return fail(401, '请先登录')
  const action = typeof req.body.action === 'string' ? req.body.action : 'home'
  if (action === 'unbind') {
    const studentId = typeof req.body.studentId === 'string' ? req.body.studentId.trim() : ''
    const binding = await one<{ id: string }>(
      'select id from public.parent_binding where parent_account_id = $1 and student_id = $2 and revoked_at is null',
      [auth.subjectId, studentId],
    )
    if (!binding) return fail(404, '没有这项绑定')
    await q('update public.parent_binding set revoked_at = now() where id = $1 and parent_account_id = $2', [binding.id, auth.subjectId])
    return ok({ ok: true })
  }
  if (action === 'lookup' || action === 'bind') {
    const ip = clientIp(req)
    const code = normalizeBindCode(req.body.code)
    const recent = await one<{ n: number }>(
      `select count(*)::int as n from public.bind_attempt where ip = $1 and success = false and created_at >= now() - interval '1 hour'`,
      [ip],
    )
    if ((recent?.n ?? 0) >= 10) {
      await q('insert into public.bind_attempt (ip, code_prefix, success) values ($1, $2, false)', [ip, code.slice(0, 4)])
      return fail(429, '尝试次数过多，请一小时后再试')
    }
    const target = await resolveBind(code)
    if (!target) {
      await q('insert into public.bind_attempt (ip, code_prefix, success) values ($1, $2, false)', [ip, code.slice(0, 4)])
      return fail(404, INVALID_CODE)
    }
    if (action === 'bind') {
      const existing = await one<{ id: string; revoked_at: string | null }>(
        'select id, revoked_at from public.parent_binding where parent_account_id = $1 and student_id = $2',
        [auth.subjectId, target],
      )
      if (existing?.revoked_at) {
        await q('update public.parent_binding set revoked_at = null where id = $1 and parent_account_id = $2', [existing.id, auth.subjectId])
      } else if (!existing) {
        await q('insert into public.parent_binding (parent_account_id, student_id) values ($1, $2)', [auth.subjectId, target])
      }
    }
    await q('insert into public.bind_attempt (ip, code_prefix, success) values ($1, $2, true)', [ip, code.slice(0, 4)])
    return ok({ ok: true })
  }
  const bindings = await q<{ student_id: string }>(
    'select student_id from public.parent_binding where parent_account_id = $1 and revoked_at is null',
    [auth.subjectId],
  )
  if (!bindings.length) return ok({ children: [], stopped: [] })
  const students = await q<{
    id: string
    name: string
    org_id: string
    group_id: string
    status: string
    current_level_order: number
    last_active_at: string | null
  }>('select id, name, org_id, group_id, status, current_level_order, last_active_at from public.student where id = any($1::uuid[])', [
    bindings.map((row) => row.student_id),
  ])
  const children = []
  const stopped: { name: string; message: '机构服务已停止' }[] = []
  for (const student of students) {
    const org = await one<{ status: string; trial_expire_at: string | null; service_end_at: string | null; name: string }>(
      'select status, trial_expire_at, service_end_at, name from public.org where id = $1',
      [student.org_id],
    )
    const access = org ? await effectiveStatus(org) : 'disabled'
    if (!access || access === 'disabled') {
      stopped.push({ name: student.name, message: '机构服务已停止' })
      continue
    }
    const group = await one<{ name: string }>('select name from public.student_group where id = $1', [student.group_id])
    const progress = await readLevelProgress(student.id).then((rows) => rows.filter((row) => row.completed))
    const countRow = await one<{ n: number }>('select count(*)::int as n from public.course_level where published = true')
    const sessions = await q<{ started_at: string; ended_at: string | null }>('select started_at, ended_at from public.study_session where student_id = $1', [
      student.id,
    ])
    const typing = await q<{ practiced_on: string; wpm: number; accuracy: number }>(
      'select practiced_on, wpm, accuracy from public.typing_record where student_id = $1',
      [student.id],
    )
    const totalLevels = countRow?.n ?? 0
    const order = Math.min(totalLevels || 1, Math.max(1, student.current_level_order))
    const currentLevel = await one<{ title: string }>('select title from public.course_level where sort_order = $1', [order])
    const start = weekStart(new Date())
    const weeklySessions = sessions.filter((row) => new Date(row.started_at).getTime() >= start.getTime())
    const minutes = weeklySessions.reduce((sum, row) => {
      if (!row.ended_at) return sum
      const span = (new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()) / 60000
      return sum + Math.min(45, Math.max(0, span))
    }, 0)
    const last = [...sessions].sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)))[0]
    const learned = await q<{ level_id: string; sort_order: number; title: string; parent_brief: string | null }>(
      `select cl.level_id, cl.sort_order, cl.title, cl.parent_brief
       from public.learning_record lr
       join public.course_level cl on cl.level_id = lr.level_id
       where lr.student_id = $1 and lr.completed = true
       order by cl.sort_order`,
      [student.id],
    )
    const weeklyLevels = await q<{ level_id: string; sort_order: number; title: string; parent_brief: string | null }>(
      `select cl.level_id, cl.sort_order, cl.title, cl.parent_brief
       from public.learning_record lr
       join public.course_level cl on cl.level_id = lr.level_id
       where lr.student_id = $1 and lr.completed = true and lr.updated_at >= $2
       order by cl.sort_order`,
      [student.id, start.toISOString()],
    )
    const toBrief = (row: { level_id: string; sort_order: number; title: string; parent_brief: string | null }) => ({
      levelId: row.level_id,
      order: row.sort_order,
      title: row.title,
      parentBrief: row.parent_brief,
    })
    children.push({
      student: {
        id: student.id,
        orgId: student.org_id,
        groupId: student.group_id,
        name: student.name,
        status: student.status,
        currentLevelOrder: student.current_level_order,
        lastActiveAt: student.last_active_at ?? '',
      },
      groupName: group?.name ?? '未分组',
      orgName: org?.name ?? '',
      currentLevelTitle: currentLevel?.title ?? `第 ${order} 关`,
      currentLevelOrder: order,
      totalLevels: totalLevels || 12,
      completedCount: progress.length,
      position: await loadCurriculumPosition(student.id),
      weekly: {
        weekStart: start.toISOString().slice(0, 10),
        sessions: weeklySessions.length,
        totalMinutes: Math.round(minutes),
        lastStudyDate: last ? asDay(last.started_at) : null,
      },
      typingSeries: bucketTyping(typing),
      learnedLessons: learned.map(toBrief),
      weeklyLessons: weeklyLevels.map(toBrief),
    })
  }
  if (!children.length && stopped.length) return fail(403, '机构服务已停止')
  return ok({ children, stopped })
}

async function resolveBind(code: string): Promise<string | null> {
  if (!isAcceptableBindCode(code)) return null
  const student = await one<{ id: string; org_id: string; status: string }>('select id, org_id, status from public.student where bind_code = $1', [code])
  if (!student || student.status !== 'active') return null
  const org = await one<{ status: string; trial_expire_at: string | null; service_end_at: string | null }>(
    'select status, trial_expire_at, service_end_at from public.org where id = $1',
    [student.org_id],
  )
  if (!org) return null
  const status = await effectiveStatus(org)
  if (status === 'disabled') return null
  return student.id
}

async function publicSite(req: ApiRequest): Promise<ApiResult> {
  const action = typeof req.body.action === 'string' ? req.body.action : 'pricing'
  if (action === 'apply') {
    try {
      const created = await one<{ id: string }>(
        'select public.submit_lead($1, $2, $3, $4, $5, $6) as id',
        [
          typeof req.body.orgName === 'string' ? req.body.orgName : '',
          typeof req.body.contact === 'string' ? req.body.contact : '',
          typeof req.body.phone === 'string' ? req.body.phone : '',
          typeof req.body.city === 'string' ? req.body.city : '',
          Number(req.body.estStudents),
          typeof req.body.note === 'string' ? req.body.note : '',
        ],
      )
      return ok({ id: created?.id })
    } catch (error) {
      return friendly(error, ['机构名称需要', '联系人需要', '请填写 11 位手机号', '请填写所在城市', '预计学生数需要', '备注不超过'], '提交失败')
    }
  }
  const seats = Number(req.body.seats ?? 40)
  const safeSeats = Number.isInteger(seats) && seats > 0 ? seats : 40
  const quoted = await one<{ unit_price: number; amount: number; plan_label: string }>('select * from public.quote_seat_price($1)', [safeSeats])
  const trial = await one<{ value: string }>("select value from public.platform_configs where key = 'trial_days'")
  return ok({
    tiers: quoted ? [{ min_seats: 1, max_seats: null, unit_price: quoted.unit_price }] : [],
    example: quoted ? { seats: safeSeats, unitPrice: quoted.unit_price, amount: quoted.amount, plan: quoted.plan_label } : null,
    trialDays: Number(trial?.value) || null,
  })
}

const STUDENT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function studentPage(value: unknown, fallback: number, max: number): number {
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

function keywordLike(keyword: string): string {
  const cleaned = keyword.trim().slice(0, 40).replace(/[\\%_]/g, '')
  return cleaned ? `%${cleaned}%` : ''
}

/** 平台运营。机构会话返回 403，不把学生查询收窄到某个机构。 */
async function requireOpsSession(req: ApiRequest): Promise<{ id: string } | ApiResult> {
  const session = await readSession(req.header('authorization'))
  if (!session) return fail(401, '需要平台运营权限')
  if (session.role !== 'platform') return fail(403, '需要平台运营权限')
  const staff = await one<{ id: string; role: string; status: string }>(
    'select id, role, status from public.platform_staff where id = $1',
    [session.subjectId],
  )
  if (!staff || staff.status !== 'active' || staff.role !== 'ops') return fail(403, '需要平台运营权限')
  return { id: staff.id }
}

async function publishedLevelTotal(): Promise<number> {
  const row = await one<{ total: number }>('select count(*)::int as total from public.course_level where published = true')
  return Number(row?.total ?? 0)
}

function presentAdminStudent(row: {
  id: string
  name: string
  account: string
  status: string
  org_id: string
  org_name: string
  group_name: string
  current_level_order: number
  bound_parent_count: number
  last_active_at: string | null
}) {
  return {
    id: row.id,
    name: row.name,
    account: row.account,
    status: studentStatus(row.status),
    orgId: row.org_id,
    orgName: row.org_name || '—',
    groupName: row.group_name || '未分组',
    currentLevelOrder: Number(row.current_level_order) || 1,
    boundParentCount: Number(row.bound_parent_count) || 0,
    lastActiveAt: asIso(row.last_active_at),
  }
}

async function adminStudents(req: ApiRequest): Promise<ApiResult> {
  const staff = await requireOpsSession(req)
  if ('status' in staff) return staff
  const action = typeof req.body.action === 'string' ? req.body.action : 'list'
  try {
    if (action === 'list') return await listPlatformStudents(req)
    if (action === 'detail') return await platformStudentDetail(req)
    if (action === 'reset-password') return await resetPlatformStudentPassword(req)
    return fail(400, '不认识的操作')
  } catch (error) {
    console.error('admin-students failed', action, action === 'reset-password' ? 'reset' : dbMessage(error))
    return fail(500, action === 'reset-password' ? '重置失败' : '读取失败')
  }
}

async function listPlatformStudents(req: ApiRequest): Promise<ApiResult> {
  const page = studentPage(req.body.page, 1, 10_000)
  const pageSize = studentPage(req.body.pageSize, 20, 50)
  const status = typeof req.body.status === 'string' ? req.body.status : ''
  if (status && status !== 'active' && status !== 'disabled') return fail(400, '学生状态不正确')
  const orgFilter = typeof req.body.orgId === 'string' ? req.body.orgId.trim() : ''
  if (orgFilter && !STUDENT_UUID.test(orgFilter)) return fail(400, '机构筛选无效')
  const params: unknown[] = [keywordLike(typeof req.body.keyword === 'string' ? req.body.keyword : ''), orgFilter || null, status]
  const where = `
    where ($1::text = '' or s.name ilike $1 or s.account ilike $1)
      and ($2::uuid is null or s.org_id = $2)
      and ($3::text = '' or s.status = $3)`
  const [totalRow, rows, totalLevels] = await Promise.all([
    one<{ total: number }>(`select count(*)::int as total from public.student s ${where}`, params),
    q<{
      id: string
      name: string
      account: string
      status: string
      org_id: string
      org_name: string
      group_name: string
      current_level_order: number
      bound_parent_count: number
      last_active_at: string | null
    }>(
      `select
         s.id, s.name, s.account, s.status, s.org_id, o.name as org_name,
         coalesce(g.name, '') as group_name, s.current_level_order, s.last_active_at,
         (
           select count(*)::int from public.parent_binding b
           where b.student_id = s.id and b.revoked_at is null
         ) as bound_parent_count
       from public.student s
       join public.org o on o.id = s.org_id
       left join public.student_group g on g.id::text = s.group_id
       ${where}
       order by s.created_at desc, s.id asc
       limit $4 offset $5`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
    publishedLevelTotal(),
  ])
  return ok({
    page,
    pageSize,
    total: Number(totalRow?.total ?? 0),
    totalLevels,
    students: rows.map(presentAdminStudent),
  })
}

async function platformStudentDetail(req: ApiRequest): Promise<ApiResult> {
  const studentId = typeof req.body.studentId === 'string' ? req.body.studentId.trim() : ''
  if (!studentId) return fail(400, '请指定学生')
  if (!STUDENT_UUID.test(studentId)) return fail(400, '没有这名学生')
  const [row, totalLevels, parents] = await Promise.all([
    one<{
      id: string
      name: string
      account: string
      status: string
      org_id: string
      org_name: string
      group_name: string
      current_level_order: number
      last_active_at: string | null
      bind_code: string | null
      bound_parent_count: number
    }>(
      `select
         s.id, s.name, s.account, s.status, s.org_id, o.name as org_name,
         coalesce(g.name, '') as group_name, s.current_level_order, s.last_active_at, s.bind_code,
         (
           select count(*)::int from public.parent_binding b
           where b.student_id = s.id and b.revoked_at is null
         ) as bound_parent_count
       from public.student s
       join public.org o on o.id = s.org_id
       left join public.student_group g on g.id::text = s.group_id
       where s.id = $1`,
      [studentId],
    ),
    publishedLevelTotal(),
    q<{ account: string; bound_at: string }>(
      `select a.account, b.created_at as bound_at
       from public.parent_binding b
       join public.parent_account a on a.id = b.parent_account_id
       where b.student_id = $1 and b.revoked_at is null and a.anonymized_at is null
       order by b.created_at desc`,
      [studentId],
    ),
  ])
  if (!row) return fail(404, '没有这名学生')
  return ok({
    totalLevels,
    student: { ...presentAdminStudent(row), bindCode: row.bind_code ?? '' },
    parents: parents.map((parent) => ({ account: parent.account, boundAt: asIso(parent.bound_at) ?? String(parent.bound_at ?? '') })),
  })
}

async function resetPlatformStudentPassword(req: ApiRequest): Promise<ApiResult> {
  const studentId = typeof req.body.studentId === 'string' ? req.body.studentId.trim() : ''
  if (!studentId) return fail(400, '请指定学生')
  if (!STUDENT_UUID.test(studentId)) return fail(400, '没有这名学生')
  const plain = generateInitialPassword(8)
  const updated = await one<{ id: string }>(
    'update public.student set password_hash = $1 where id = $2 returning id',
    [await hashPassword(plain), studentId],
  )
  if (!updated) return fail(404, '没有这名学生')
  return ok({ password: plain })
}

async function adminParents(req: ApiRequest): Promise<ApiResult> {
  const staff = await requireOpsSession(req)
  if ('status' in staff) return staff
  const action = typeof req.body.action === 'string' ? req.body.action : 'list'
  try {
    if (action === 'list') return await listPlatformParents(req)
    if (action === 'detail') return await platformParentDetail(req)
    if (action === 'unbind') return await unbindPlatformParent(req)
    if (action === 'reset-password') return await resetPlatformParentPassword(req)
    return fail(400, '不认识的操作')
  } catch (error) {
    console.error('admin-parents failed', action, action === 'reset-password' ? 'reset' : dbMessage(error))
    return fail(500, action === 'reset-password' ? '重置失败' : action === 'unbind' ? '解除失败' : '读取失败')
  }
}

function presentAdminParent(
  row: {
    id: string
    account: string
    child_count: number
    created_at: string
    last_login_at: string | null
  },
  mask = false,
) {
  const account = row.account
  return {
    id: row.id,
    account: mask ? `${account.trim().slice(0, 3)}****` : account,
    childCount: Number(row.child_count) || 0,
    createdAt: asIso(row.created_at) ?? String(row.created_at ?? ''),
    lastLoginAt: asIso(row.last_login_at),
  }
}

async function listPlatformParents(req: ApiRequest, mask = false): Promise<ApiResult> {
  const page = studentPage(req.body.page, 1, 10_000)
  const pageSize = studentPage(req.body.pageSize, 20, 50)
  const params: unknown[] = [keywordLike(typeof req.body.keyword === 'string' ? req.body.keyword : '')]
  const where = `
    where p.anonymized_at is null
      and ($1::text = '' or p.account ilike $1 or exists (
      select 1 from public.parent_binding b
      join public.student s on s.id = b.student_id
      where b.parent_account_id = p.id
        and b.revoked_at is null
        and s.name ilike $1
    ))`
  const [totalRow, rows] = await Promise.all([
    one<{ total: number }>(`select count(*)::int as total from public.parent_account p ${where}`, params),
    q<{
      id: string
      account: string
      child_count: number
      created_at: string
      last_login_at: string | null
    }>(
      `select
         p.id, p.account, p.created_at, p.last_login_at,
         (
           select count(*)::int from public.parent_binding b
           where b.parent_account_id = p.id and b.revoked_at is null
         ) as child_count
       from public.parent_account p
       ${where}
       order by p.created_at desc, p.id asc
       limit $2 offset $3`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
  ])
  return ok({
    page,
    pageSize,
    total: Number(totalRow?.total ?? 0),
    parents: rows.map((row) => presentAdminParent(row, mask)),
  })
}

async function platformParentDetail(req: ApiRequest): Promise<ApiResult> {
  const parentId = typeof req.body.parentId === 'string' ? req.body.parentId.trim() : ''
  if (!parentId) return fail(400, '请指定家长')
  if (!STUDENT_UUID.test(parentId)) return fail(400, '没有这位家长')
  const [row, children] = await Promise.all([
    one<{
      id: string
      account: string
      child_count: number
      created_at: string
      last_login_at: string | null
    }>(
      `select
         p.id, p.account, p.created_at, p.last_login_at,
         (
           select count(*)::int from public.parent_binding b
           where b.parent_account_id = p.id and b.revoked_at is null
         ) as child_count
       from public.parent_account p
       where p.id = $1 and p.anonymized_at is null`,
      [parentId],
    ),
    q<{ student_id: string; name: string; org_name: string; bound_at: string }>(
      `select s.id as student_id, s.name, o.name as org_name, b.created_at as bound_at
       from public.parent_binding b
       join public.student s on s.id = b.student_id
       join public.org o on o.id = s.org_id
       where b.parent_account_id = $1 and b.revoked_at is null
       order by b.created_at desc`,
      [parentId],
    ),
  ])
  if (!row) return fail(404, '没有这位家长')
  return ok({
    parent: presentAdminParent(row),
    children: children.map((child) => ({
      studentId: child.student_id,
      name: child.name,
      orgName: child.org_name || '—',
      boundAt: asIso(child.bound_at) ?? String(child.bound_at ?? ''),
    })),
  })
}

async function unbindPlatformParent(req: ApiRequest): Promise<ApiResult> {
  const parentId = typeof req.body.parentId === 'string' ? req.body.parentId.trim() : ''
  const studentId = typeof req.body.studentId === 'string' ? req.body.studentId.trim() : ''
  if (!parentId || !studentId) return fail(400, '请指定要解除的绑定')
  if (!STUDENT_UUID.test(parentId) || !STUDENT_UUID.test(studentId)) return fail(400, '没有这项绑定')
  const updated = await one<{ id: string }>(
    `update public.parent_binding
     set revoked_at = now()
     where parent_account_id = $1 and student_id = $2 and revoked_at is null
     returning id`,
    [parentId, studentId],
  )
  if (!updated) return fail(404, '没有这项绑定')
  return ok({ ok: true })
}

async function resetPlatformParentPassword(req: ApiRequest): Promise<ApiResult> {
  const parentId = typeof req.body.parentId === 'string' ? req.body.parentId.trim() : ''
  if (!parentId) return fail(400, '请指定家长')
  if (!STUDENT_UUID.test(parentId)) return fail(400, '没有这位家长')
  const plain = generateInitialPassword(8)
  const updated = await one<{ id: string }>(
    'update public.parent_account set password_hash = $1 where id = $2 returning id',
    [await hashPassword(plain), parentId],
  )
  if (!updated) return fail(404, '没有这位家长')
  return ok({ password: plain })
}

async function adminUsers(req: ApiRequest): Promise<ApiResult> {
  const staff = await requireOpsSession(req)
  if ('status' in staff) return staff
  const action = typeof req.body.action === 'string' ? req.body.action : ''
  try {
    if (action === 'list_students') return await listPlatformStudents(req)
    if (action === 'student_detail') return await platformStudentDetail(req)
    if (action === 'list_parents') return await listPlatformParents(req, true)
    if (action === 'parent_detail') return await platformParentDetail(req)
    if (action === 'unbind_parent') return await unbindPlatformParent(req)
    if (action === 'reset_password') return await resetPlatformUserPassword(req)
    if (action === 'delete_parent') return await deletePlatformParent(req)
    return fail(400, '不认识的操作')
  } catch (error) {
    console.error('admin-users failed', action, action === 'reset_password' ? 'reset' : dbMessage(error))
    const message = action === 'reset_password' ? '重置失败' : action === 'unbind_parent' ? '解除失败' : action === 'delete_parent' ? '注销失败' : '读取失败'
    return fail(500, message)
  }
}

async function resetPlatformUserPassword(req: ApiRequest): Promise<ApiResult> {
  const role = req.body.role === 'student' || req.body.role === 'parent' ? req.body.role : ''
  const userId = typeof req.body.userId === 'string' ? req.body.userId.trim() : ''
  if (!role || !userId) return fail(400, '请指定要重置的账号')
  if (!STUDENT_UUID.test(userId)) return fail(400, role === 'student' ? '没有这名学生' : '没有这位家长')
  const plain = generateInitialPassword(8)
  const passwordHash = await hashPassword(plain)
  if (role === 'student') {
    const updated = await one<{ id: string }>('update public.student set password_hash = $1 where id = $2 returning id', [passwordHash, userId])
    if (!updated) return fail(404, '没有这名学生')
    return ok({ password: plain })
  }
  const updated = await one<{ id: string }>(
    'update public.parent_account set password_hash = $1 where id = $2 and anonymized_at is null returning id',
    [passwordHash, userId],
  )
  if (!updated) return fail(404, '没有这位家长')
  return ok({ password: plain })
}

async function deletePlatformParent(req: ApiRequest): Promise<ApiResult> {
  const parentId = typeof req.body.parentId === 'string' ? req.body.parentId.trim() : ''
  if (!parentId) return fail(400, '请指定家长')
  if (!STUDENT_UUID.test(parentId)) return fail(400, '没有这位家长')
  const existing = await one<{ id: string }>('select id from public.parent_account where id = $1 and anonymized_at is null', [parentId])
  if (!existing) return fail(404, '没有这位家长')
  const discarded = generateInitialPassword(24)
  const account = existing.id.replace(/-/g, '')
  await q('update public.parent_binding set revoked_at = now() where parent_account_id = $1 and revoked_at is null', [parentId])
  const updated = await one<{ id: string }>(
    `update public.parent_account
     set account = $2, password_hash = $3, anonymized_at = now()
     where id = $1 and anonymized_at is null
     returning id`,
    [parentId, account, await hashPassword(discarded)],
  )
  if (!updated) return fail(404, '没有这位家长')
  await q(`update public.app_session set expires_at = now() where role = 'parent' and subject_id = $1`, [parentId])
  return ok({ ok: true })
}

const DAY_MS = 24 * 60 * 60 * 1000

function shanghaiBounds(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  const nextMonth = month === '12' ? `${Number(year) + 1}-01-01` : `${year}-${String(Number(month) + 1).padStart(2, '0')}-01`
  return {
    monthStart: new Date(`${year}-${month}-01T00:00:00+08:00`).getTime(),
    nextMonth: new Date(`${nextMonth}T00:00:00+08:00`).getTime(),
    dayStart: new Date(`${year}-${month}-${day}T00:00:00+08:00`).toISOString(),
  }
}

function daysUntil(iso: string | null, now: number): number {
  if (!iso) return 0
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return 0
  return Math.max(0, Math.ceil((time - now) / DAY_MS))
}

async function adminDashboard(req: ApiRequest): Promise<ApiResult> {
  const staff = await requireStaff(req, ['ops', 'finance'])
  if ('status' in staff) return staff
  const bounds = shanghaiBounds()
  const now = Date.now()
  const [orgs, bills, students, parents] = await Promise.all([
    q<{
      id: string
      name: string
      contact_phone: string
      seat_quota: number
      used_seats: number
      trial_expire_at: string | null
      service_end_at: string | null
      status: string
      expiring_soon: boolean
    }>('select * from public.list_org_ledger()'),
    q<{ org_id: string; type: string; amount: number; created_at: string }>('select org_id, type, amount, created_at from public.billing_record'),
    one<{ total: number }>("select count(*)::int as total from public.student where status = 'active'"),
    one<{ total: number }>('select count(*)::int as total from public.parent_account where last_login_at >= $1::timestamptz', [bounds.dayStart]),
  ])
  const revenue = bills.reduce((sum, row) => {
    const at = new Date(row.created_at).getTime()
    if (row.type === '试用' || Number.isNaN(at) || at < bounds.monthStart || at >= bounds.nextMonth) return sum
    return sum + Number(row.amount)
  }, 0)
  const purchased = new Set(bills.filter((row) => row.type === '新购').map((row) => row.org_id))
  const trialed = new Set(bills.filter((row) => row.type === '试用').map((row) => row.org_id))
  for (const row of orgs) {
    if (row.trial_expire_at) trialed.add(row.id)
  }
  let converted = 0
  for (const id of trialed) {
    const row = orgs.find((item) => item.id === id)
    if (purchased.has(id) || row?.status === 'active') converted += 1
  }
  const expiringOrgs = orgs
    .filter((row) => row.expiring_soon)
    .map((row) => ({
      id: row.id,
      name: row.name,
      daysLeft: daysUntil(row.service_end_at ?? row.trial_expire_at, now),
      contactPhone: row.contact_phone,
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
  const seatAlerts = orgs
    .filter((row) => row.seat_quota > 0 && row.used_seats / row.seat_quota >= 0.9)
    .map((row) => ({
      id: row.id,
      name: row.name,
      usedSeats: row.used_seats,
      seatQuota: row.seat_quota,
    }))
    .sort((a, b) => b.usedSeats / b.seatQuota - a.usedSeats / a.seatQuota)
  const commissions = await q<{
    agent_id: string
    agent_name: string
    org_count: number
    seat_fee_total: number
    rebate_due: number
    platform_net: number
  }>('select * from public.list_agent_commissions()')
  return ok({
    revenue,
    activeStudents: Number(students?.total ?? 0),
    activeParentsToday: Number(parents?.total ?? 0),
    conversionRate: trialed.size ? Math.round((converted / trialed.size) * 100) : 0,
    expiringOrgs,
    seatAlerts,
    commissions: commissions.map((row) => ({
      agentId: row.agent_id,
      agentName: row.agent_name,
      orgCount: Number(row.org_count),
      seatFeeTotal: Number(row.seat_fee_total),
      rebateDue: Number(row.rebate_due),
      platformNet: Number(row.platform_net),
    })),
  })
}

async function requireStaff(req: ApiRequest, roles: string[]): Promise<{ id: string; displayName: string; role: string } | ApiResult> {
  const auth = await requireRole(req, 'platform')
  if ('status' in auth) return auth.status === 401 ? fail(401, '需要平台运营权限') : auth
  const staff = await one<{ id: string; display_name: string; role: string; status: string }>(
    'select id, display_name, role, status from public.platform_staff where id = $1',
    [auth.subjectId],
  )
  if (!staff || staff.status !== 'active' || !roles.includes(staff.role)) return fail(403, '需要平台运营权限')
  return { id: staff.id, displayName: staff.display_name, role: staff.role }
}

const ORG_STATUS_LABEL: Record<string, string> = {
  trial: '试用中',
  active: '正常',
  expired: '已到期',
  disabled: '停用',
}

function provisionSummary(action: string, detail: Record<string, unknown>): string {
  if (action === '开户') return `试用 ${detail.trialDays ?? '—'} 天，席位 ${detail.seatQuota ?? '—'}`
  if (action === '续费') return `${detail.type ?? '续费'} · ${detail.seats ?? '—'} 席 · ¥${detail.amount ?? '—'}`
  if (action === '停用') return `停用前为${ORG_STATUS_LABEL[String(detail.previousStatus)] ?? '原状态'}`
  if (action === '恢复') return `恢复为${ORG_STATUS_LABEL[String(detail.status)] ?? '可登录'}`
  return ''
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return {}
}

async function orgDetail(req: ApiRequest): Promise<ApiResult> {
  const orgId = typeof req.body.orgId === 'string' ? req.body.orgId.trim() : ''
  if (!STUDENT_UUID.test(orgId)) return fail(404, '机构不存在')
  const org = await one<{
    id: string
    org_no: string
    name: string
    contact_name: string
    contact_phone: string
    campus: string
    seat_quota: number
    used_seats: number
    status: string
    trial_expire_at: string | null
    service_end_at: string | null
  }>(
    `select id, org_no, name, contact_name, contact_phone, campus, seat_quota, used_seats, status, trial_expire_at, service_end_at
     from public.org where id = $1`,
    [orgId],
  )
  if (!org) return fail(404, '机构不存在')
  const [statusRow, students, parents, logs] = await Promise.all([
    one<{ status: string }>('select public.effective_org_status($1, $2, $3) as status', [org.status, org.trial_expire_at, org.service_end_at]),
    one<{ total: number }>("select count(*)::int as total from public.student where org_id = $1 and status = 'active'", [orgId]),
    one<{ total: number }>(
      `select count(distinct b.parent_account_id)::int as total
       from public.parent_binding b
       join public.student s on s.id = b.student_id
       join public.parent_account a on a.id = b.parent_account_id
       where s.org_id = $1 and b.revoked_at is null and a.anonymized_at is null`,
      [orgId],
    ),
    q<{ id: string; action: string; operator: string; detail: unknown; created_at: string }>(
      'select id, action, operator, detail, created_at from public.provision_log where org_id = $1 order by created_at desc',
      [orgId],
    ),
  ])
  return ok({
    org: {
      id: org.id,
      orgNo: org.org_no,
      name: org.name,
      contactName: org.contact_name,
      contactPhone: org.contact_phone,
      campus: org.campus,
      seatQuota: org.seat_quota,
      usedSeats: org.used_seats,
      activeStudents: Number(students?.total ?? 0),
      boundParents: Number(parents?.total ?? 0),
      trialExpireAt: org.trial_expire_at,
      serviceEndAt: org.service_end_at,
      status: statusRow?.status ?? org.status,
    },
    logs: logs.map((row) => ({
      id: row.id,
      action: row.action,
      operator: row.operator,
      summary: provisionSummary(row.action, jsonObject(row.detail)),
      createdAt: row.created_at,
    })),
  })
}

async function adminOps(req: ApiRequest): Promise<ApiResult> {
  const action = typeof req.body.action === 'string' ? req.body.action : 'ledger'
  const financeOk = action === 'ledger' || action === 'overview' || action === 'billing' || action === 'invoice' || action === 'quote' || action === 'detail' || action === 'settings'
  const staff = await requireStaff(req, financeOk ? ['ops', 'finance'] : ['ops'])
  if ('status' in staff) return staff
  const known = ['记录类型', '席位数', '机构不存在', '试用记录', '手工改价', '金额', '请填写服务期', '开票状态', '收费记录', '只能停用', '线索不存在', '这个状态', '最低席位', '平台底价', '试用天数', '分成比例', '缺少平台底价', '缺少代理分成']
  if (action === 'settings' || action === 'save-settings') {
    try {
      if (action === 'save-settings') {
        await q('select public.save_platform_configs($1, $2, $3, $4, $5)', [
          staff.id,
          Number(req.body.minSeatCount),
          Number(req.body.baseSeatPrice),
          Number(req.body.trialDays),
          Number(req.body.agentCommissionRate),
        ])
      }
      const configs = await q('select key, value, description, updated_at from public.list_platform_configs()')
      return ok({ configs })
    } catch (error) {
      return friendly(error, known, '配置保存失败')
    }
  }
  if (action === 'quote') {
    try {
      const row = await one<{ unit_price: number; amount: number; plan_label: string }>('select * from public.quote_seat_price($1)', [Number(req.body.seats)])
      return ok({ unitPrice: row?.unit_price, amount: row?.amount, plan: row?.plan_label })
    } catch (error) {
      return friendly(error, known, '操作失败')
    }
  }
  if (action === 'detail') return await orgDetail(req)
  if (action === 'billing') {
    const orgId = typeof req.body.orgId === 'string' ? req.body.orgId : ''
    if (req.body.record && typeof req.body.record === 'object') {
      const record = req.body.record as Record<string, unknown>
      try {
        const created = await one<{ id: string }>('select public.record_billing($1,$2,$3,$4,$5,$6,$7,$8,$9) as id', [
          orgId,
          record.type,
          Number(record.seats),
          Number(record.amount),
          Boolean(record.overridden),
          typeof record.note === 'string' ? record.note : '',
          record.serviceStart || null,
          record.serviceEnd || null,
          staff.id,
        ])
        return ok({ id: created?.id })
      } catch (error) {
        return friendly(error, known, '操作失败')
      }
    }
    const records = await q(
      'select id, type, plan, seats, amount, amount_overridden, note, pay_method, service_start, service_end, invoice_status, renew_remind_at, operator, created_at from public.billing_record where org_id = $1 order by created_at desc',
      [orgId],
    )
    return ok({ records })
  }
  if (action === 'invoice') {
    try {
      await q('select public.set_invoice_status($1, $2, $3)', [req.body.recordId, req.body.invoiceStatus, staff.id])
      return ok({ ok: true })
    } catch (error) {
      return friendly(error, known, '操作失败')
    }
  }
  if (action === 'status') {
    try {
      await q('select public.set_org_manual_status($1, $2, $3)', [req.body.orgId, req.body.manualAction, staff.id])
      return ok({ ok: true })
    } catch (error) {
      return friendly(error, known, '操作失败')
    }
  }
  if (action === 'leads') {
    if (typeof req.body.leadId === 'string' && typeof req.body.status === 'string') {
      try {
        await q('select public.set_lead_status($1, $2, $3)', [req.body.leadId, req.body.status, staff.id])
      } catch (error) {
        return friendly(error, known, '操作失败')
      }
    }
    const leads = await q('select id, org_name, contact, phone, city, est_students, note, status, org_id, created_at from public.lead order by created_at desc')
    return ok({ leads })
  }
  if (action === 'overview') {
    const orgs = await q<{ status: string; expiring_soon: boolean; created_at: string }>('select * from public.list_org_ledger()')
    const bills = await q<{ amount: number; type: string; created_at: string; org_id: string }>('select amount, type, created_at, org_id from public.billing_record')
    const month = new Date().toISOString().slice(0, 7)
    const collected = bills.filter((row) => String(row.created_at).slice(0, 7) === month && row.type !== '试用').reduce((sum, row) => sum + Number(row.amount), 0)
    const converted = new Set(bills.filter((row) => row.type === '新购').map((row) => row.org_id)).size
    return ok({
      renewing: orgs.filter((row) => row.expiring_soon).length,
      conversion: orgs.length ? Math.round((converted / orgs.length) * 100) : 0,
      newOrgs: orgs.filter((row) => String(row.created_at).slice(0, 7) === month).length,
      collected,
    })
  }
  await q('select public.rewrite_org_status_for_display()')
  const [data, agentLinks] = await Promise.all([
    q<Record<string, unknown>>('select * from public.list_org_ledger()'),
    q<{ org_id: string; agent_name: string }>(
      `select ao.org_id, a.name as agent_name
       from public.agent_org ao
       join public.agent a on a.id = ao.agent_id`,
    ),
  ])
  const agentByOrg = new Map(agentLinks.map((row) => [row.org_id, row.agent_name]))
  const status = typeof req.body.status === 'string' ? req.body.status : 'all'
  const keyword = typeof req.body.keyword === 'string' ? req.body.keyword.trim().toLowerCase() : ''
  const expireFrom = typeof req.body.expireFrom === 'string' ? req.body.expireFrom : ''
  const expireTo = typeof req.body.expireTo === 'string' ? req.body.expireTo : ''
  const rows = data.filter((row) => {
    if (status !== 'all' && row.status !== status) return false
    if (keyword && !`${row.name} ${row.org_no} ${row.contact_phone}`.toLowerCase().includes(keyword)) return false
    const end = String(row.service_end_at ?? row.trial_expire_at ?? '').slice(0, 10)
    if (expireFrom && end && end < expireFrom) return false
    if (expireTo && end && end > expireTo) return false
    return true
  })
  return ok({
    operator: staff.displayName,
    role: staff.role,
    orgs: rows.map((row) => ({
      id: row.id,
      orgNo: row.org_no,
      name: row.name,
      contactPhone: row.contact_phone,
      campus: row.campus,
      seatQuota: row.seat_quota,
      usedSeats: row.used_seats,
      createdAt: row.created_at,
      trialExpireAt: row.trial_expire_at,
      serviceEndAt: row.service_end_at,
      status: row.status,
      expiringSoon: row.expiring_soon,
      agentName: agentByOrg.get(String(row.id)) ?? null,
    })),
  })
}

async function provisionOrg(req: ApiRequest): Promise<ApiResult> {
  const staff = await requireStaff(req, ['ops'])
  if ('status' in staff) return staff
  const leadRaw = typeof req.body.leadId === 'string' ? req.body.leadId.trim() : ''
  const leadId = leadRaw.length > 0 ? leadRaw : null
  if (leadId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(leadId)) {
    return fail(400, '线索不存在')
  }
  const requestedDays = Number(req.body.trialDays)
  const trialDays = Number.isInteger(requestedDays) ? requestedDays : 0
  const plain = generateInitialPassword(12)
  try {
    const row = await one<{ org_no: string; admin_account: string }>('select * from public.provision_org($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
      typeof req.body.name === 'string' ? req.body.name : '',
      typeof req.body.contactName === 'string' ? req.body.contactName : '',
      typeof req.body.contactPhone === 'string' ? req.body.contactPhone : '',
      typeof req.body.campus === 'string' ? req.body.campus : '',
      Number(req.body.seatQuota),
      trialDays,
      await hashPassword(plain),
      leadId,
      staff.id,
    ])
    if (!row?.org_no || !row.admin_account) return fail(500, '开户失败')
    return ok({ orgNo: row.org_no, adminAccount: row.admin_account, initialPassword: plain })
  } catch (error) {
    return friendly(
      error,
      ['机构名称需要', '联系人需要', '请填写 11 位手机号', '请填写校区', '试用天数需要', '席位额度至少为', '试用机构最多', '线索不存在', '该线索已开户', '该线索不能开户', '密码哈希无效', '最低席位'],
      '开户失败',
    )
  }
}

const COPY_FIELDS = ['goal', 'teaching_intent', 'parent_brief', 'teacher_guide'] as const
type CopyField = (typeof COPY_FIELDS)[number]

async function findCourseLevel(levelId: string): Promise<{ level_id: string; preview_frozen: boolean; goal: string } | null> {
  if (!levelId) return null
  const matched = /^L(\d+)$/i.exec(levelId)
  const order = matched ? Number(matched[1]) : null
  return one<{ level_id: string; preview_frozen: boolean; goal: string }>(
    `select level_id, preview_frozen, goal
     from public.course_level
     where level_id = $1 or ($2::int is not null and sort_order = $2)
     order by case when level_id = $1 then 0 else 1 end
     limit 1`,
    [levelId, order],
  )
}

function withStoredGoal<T extends { goal: string }>(level: T, goal: string | null | undefined): T {
  const next = goal?.trim()
  if (!next) return level
  return { ...level, goal: next }
}

async function courseCatalog(req: ApiRequest): Promise<ApiResult> {
  const staff = await requireStaff(req, ['ops'])
  if ('status' in staff) return staff
  const action = typeof req.body.action === 'string' ? req.body.action : 'list'
  if (action === 'tree') {
    const rows = (await q(COURSE_TREE_SQL)) as unknown as CourseTreeSourceRow[]
    return ok({ stages: groupCourseTree(rows) })
  }
  if (action === 'preview' || action === 'preview-lock') {
    const raw = req.body.levelId
    const levelId = typeof raw === 'number' && Number.isInteger(raw) ? String(raw) : typeof raw === 'string' ? raw.trim() : ''
    const stored = await findCourseLevel(levelId)
    if (!stored) return fail(404, '没有找到这一关')
    if (action === 'preview-lock') {
      const frozen = req.body.frozen === true
      const saved = await one<{ preview_frozen: boolean }>(
        'update public.course_level set preview_frozen = $2, updated_at = now() where level_id = $1 returning preview_frozen',
        [stored.level_id, frozen],
      )
      return ok({ levelId: stored.level_id, previewFrozen: saved?.preview_frozen === true })
    }
    if (stored.preview_frozen === true) return fail(403, '这一关已冻结，不能试课预览')
    const playable = buildPlayableLevel(levelId) ?? buildPlayableLevel(stored.level_id)
    if (!playable) return fail(404, '没有找到这一关')
    const hints = await q('select pattern, friendly_message from public.error_hint')
    return ok({ level: withStoredGoal(playable, stored.goal), hints })
  }
  if (action === 'copy-save' || action === 'copy-history') {
    const raw = req.body.levelId
    const levelId = typeof raw === 'number' && Number.isInteger(raw) ? String(raw) : typeof raw === 'string' ? raw.trim() : ''
    const stored = await findCourseLevel(levelId)
    if (!stored) return fail(404, '没有找到这一关')
    if (action === 'copy-history') {
      const [revision, entries] = await Promise.all([
        one<{ revision_count: number }>('select revision_count from public.course_level where level_id = $1', [stored.level_id]),
        q<{
          field: CopyField
          previous_text: string | null
          next_text: string | null
          revision_count: number
          editor_name: string
          created_at: string
        }>(
          `select field, previous_text, next_text, revision_count, editor_name, created_at
           from public.content_history
           where level_id = $1
           order by created_at desc
           limit 20`,
          [stored.level_id],
        ),
      ])
      return ok({
        revisionCount: revision?.revision_count ?? 0,
        entries: entries.map((row) => ({
          field: row.field,
          previousText: row.previous_text,
          nextText: row.next_text,
          revisionCount: row.revision_count,
          editorName: row.editor_name,
          editedAt: row.created_at,
        })),
      })
    }
    const field = req.body.field
    if (typeof field !== 'string' || !COPY_FIELDS.includes(field as CopyField)) return fail(400, '文案字段不正确')
    if (typeof req.body.text !== 'string') return fail(400, '文案字段不正确')
    try {
      const saved = await one<{ changed: boolean; revision_count: number; stored_text: string | null }>(
        `select changed, revision_count, stored_text
         from public.save_course_copy($1, $2, $3, $4::uuid, $5)`,
        [stored.level_id, field, req.body.text, staff.id, staff.displayName],
      )
      if (!saved) return fail(500, '文案没有保存')
      return ok({
        field,
        text: saved.stored_text,
        revisionCount: saved.revision_count,
        changed: saved.changed === true,
      })
    } catch (error) {
      return friendly(error, ['文案字段不正确', '学习目标不能为空', '文案请控制在 2000', '没有找到这一关', '需要平台运营权限'], '文案没有保存')
    }
  }
  if (action === 'validate' || action === 'import') {
    const text = typeof req.body.text === 'string' ? req.body.text : ''
    const { report, levels, placement } = validateCoursePackage(text)
    if (action === 'import' && report.ok) {
      if (placement) {
        await q(
          `insert into public.curriculum_unit (unit_id, semester_id, title, sort_order, stage_level)
           values ($1, $2, $3, $4, $5)
           on conflict (unit_id) do update set
             semester_id = excluded.semester_id,
             title = excluded.title,
             sort_order = excluded.sort_order,
             stage_level = excluded.stage_level`,
          [placement.unit.unit_id, placement.legacySemesterId, placement.unit.title, placement.unit.sort_order, placement.stageLevel],
        )
      }
      for (const level of levels) {
        await q(
          `insert into public.course_level (
             level_id, sort_order, title, goal, body, published, updated_at,
             unit_id, knowledge_tags, level_type, milestone_badge,
             teaching_intent, parent_brief, teacher_guide
           ) values (
             $1, $2, $3, $4, $5::jsonb, true, now(),
             coalesce($6, 'G5-spring-inbox'),
             coalesce($7::text[], '{}'),
             coalesce($8, 'new'),
             $9, $10, $11, $12
           )
           on conflict (level_id) do update set
             sort_order = excluded.sort_order,
             title = excluded.title,
             goal = excluded.goal,
             body = excluded.body,
             published = true,
             updated_at = now(),
             unit_id = case when $13::boolean then excluded.unit_id else public.course_level.unit_id end,
             knowledge_tags = case when $14::boolean then excluded.knowledge_tags else public.course_level.knowledge_tags end,
             level_type = case when $15::boolean then excluded.level_type else public.course_level.level_type end,
             milestone_badge = case when $16::boolean then excluded.milestone_badge else public.course_level.milestone_badge end,
             teaching_intent = case when $17::boolean then excluded.teaching_intent else public.course_level.teaching_intent end,
             parent_brief = case when $18::boolean then excluded.parent_brief else public.course_level.parent_brief end,
             teacher_guide = case when $19::boolean then excluded.teacher_guide else public.course_level.teacher_guide end`,
          [
            level.level_id,
            level.order,
            level.title,
            level.goal,
            JSON.stringify(level),
            level.unit_id ?? null,
            level.knowledge_tags ?? null,
            level.pedagogy ?? null,
            level.milestone_badge ?? null,
            level.teaching_intent ?? null,
            level.parent_brief ?? null,
            level.teacher_guide ?? null,
            Boolean(level.unit_id),
            level.knowledge_tags !== undefined,
            Boolean(level.pedagogy),
            level.milestone_badge !== undefined,
            level.teaching_intent !== undefined,
            level.parent_brief !== undefined,
            level.teacher_guide !== undefined,
          ],
        )
      }
    }
    const listed = await q('select level_id, sort_order, title from public.course_level where published = true order by sort_order')
    return ok({ report, levels: listed })
  }
  const levels = await q('select level_id, sort_order, title, goal from public.course_level where published = true order by sort_order')
  return ok({ levels })
}
