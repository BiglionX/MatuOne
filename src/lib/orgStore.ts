/**
 * 本地事务层，行为对齐 migration 里的 provision_org / org-login。
 * 未配置 Supabase 时由 src/api 调用。明文密码不进入本存储。
 */
import type { OrgLedgerQuery, OrgLedgerRow, OrgSession, OrgStatus, ProvisionOrgInput, ProvisionOrgResult } from '@/types/orgAdmin'
import { ApiError } from './apiError'
import { generateInitialPassword, hashPassword, verifyPassword } from './password'
import {
  adminAccountFor,
  effectiveStatus,
  expiryAnchor,
  isExpiringSoon,
  localDay,
  nextOrgNo,
  normalizeProvision,
} from './orgRules'
import { readJSON, writeJSON } from './storage'

const DB_KEY = 'orgdb.v1'
const PLATFORM_SESSION_KEY = 'session.platform'
const ORG_SESSION_KEY = 'session.org'

interface StaffRow {
  id: string
  account: string
  displayName: string
  role: 'ops' | 'finance'
  status: 'active' | 'disabled'
}

interface OrgRow {
  id: string
  orgNo: string
  name: string
  contactName: string
  contactPhone: string
  campus: string
  seatQuota: number
  usedSeats: number
  status: OrgStatus
  trialExpireAt: string | null
  serviceStartAt: string | null
  serviceEndAt: string | null
  createdAt: string
}

interface AdminRow {
  id: string
  orgId: string
  account: string
  passwordHash: string
  status: 'active' | 'disabled'
  lastLoginAt: string | null
}

interface LogRow {
  id: string
  orgId: string
  action: '开户' | '续费' | '停用' | '恢复'
  operator: string
  operatorId: string
  detail: Record<string, string | number | null>
  createdAt: string
}

interface LeadRow {
  id: string
  status: '新' | '已联系' | '已开户' | '已关闭'
  orgId: string | null
}

export interface OrgStudentRow {
  id: string
  orgId: string
  groupId: string
  name: string
  account: string
  passwordHash: string
  status: 'active' | 'disabled'
  currentLevelOrder: number
  lastActiveAt: string
  bindCode: string
}

export interface EntitlementRow {
  id: string
  orgId: string
  subjectType: 'org' | 'group' | 'student'
  subjectId: string
  levelOrderMin: number
  levelOrderMax: number
}

export interface ActivationRow {
  orgId: string
  groupId: string
  seats: number
  expiresAt: string
  activatedAt: string
}

export interface OrgStore {
  version: number
  staff: StaffRow[]
  orgs: OrgRow[]
  admins: AdminRow[]
  logs: LogRow[]
  leads: LeadRow[]
  students: OrgStudentRow[]
  entitlements: EntitlementRow[]
  activations: ActivationRow[]
}

export type { OrgRow }

let cache: OrgStore | null = null
let loading: Promise<OrgStore> | null = null
let queue: Promise<unknown> = Promise.resolve()

function assertPersistable(store: OrgStore): void {
  for (const admin of store.admins) {
    if (!admin.passwordHash.startsWith('pbkdf2-sha256$')) {
      throw new ApiError(500, '拒绝写入非哈希密码')
    }
  }
  for (const student of store.students ?? []) {
    if (!student.passwordHash?.startsWith('pbkdf2-sha256$')) {
      throw new ApiError(500, '拒绝写入非哈希密码')
    }
  }
  const raw = JSON.stringify(store)
  if (raw.includes('"password"') || raw.includes('"initialPassword"') || raw.includes('"password_hash_plain"')) {
    throw new ApiError(500, '拒绝写入明文密码')
  }
}

function persist(store: OrgStore): void {
  assertPersistable(store)
  cache = store
  writeJSON(DB_KEY, store)
}

function daysFrom(base: Date, days: number): string {
  const next = new Date(base.getTime())
  next.setDate(next.getDate() + days)
  return next.toISOString()
}

async function buildSeed(): Promise<OrgStore> {
  const now = new Date()
  const hashes = await Promise.all([hashPassword(generateInitialPassword()), hashPassword(generateInitialPassword()), hashPassword(generateInitialPassword()), hashPassword(generateInitialPassword())])
  const staff: StaffRow = {
    id: 'staff-ops',
    account: 'ops',
    displayName: '平台运营',
    role: 'ops',
    status: 'active',
  }
  const specs: Array<Omit<OrgRow, 'id' | 'orgNo'> & { key: string }> = [
    {
      key: '1',
      name: '阳光托辅中心',
      contactName: '林老师',
      contactPhone: '13800000001',
      campus: '三明徐碧校区',
      seatQuota: 10,
      usedSeats: 4,
      status: 'trial',
      trialExpireAt: daysFrom(now, 11),
      serviceStartAt: null,
      serviceEndAt: null,
      createdAt: daysFrom(now, -3),
    },
    {
      key: '2',
      name: '启明星托管',
      contactName: '周老师',
      contactPhone: '13800000002',
      campus: '福州东街校区',
      seatQuota: 40,
      usedSeats: 28,
      status: 'active',
      trialExpireAt: daysFrom(now, -66),
      serviceStartAt: daysFrom(now, -66),
      serviceEndAt: daysFrom(now, 20),
      createdAt: daysFrom(now, -80),
    },
    {
      key: '3',
      name: '小橡果学堂',
      contactName: '陈老师',
      contactPhone: '13800000003',
      campus: '厦门湖里校区',
      seatQuota: 20,
      usedSeats: 15,
      status: 'expired',
      trialExpireAt: daysFrom(now, -380),
      serviceStartAt: daysFrom(now, -370),
      serviceEndAt: daysFrom(now, -5),
      createdAt: daysFrom(now, -380),
    },
    {
      key: '4',
      name: '河畔课后营',
      contactName: '吴老师',
      contactPhone: '13800000004',
      campus: '泉州丰泽校区',
      seatQuota: 20,
      usedSeats: 6,
      status: 'disabled',
      trialExpireAt: daysFrom(now, -40),
      serviceStartAt: daysFrom(now, -20),
      serviceEndAt: daysFrom(now, 200),
      createdAt: daysFrom(now, -40),
    },
  ]

  const orgs: OrgRow[] = []
  const admins: AdminRow[] = []
  const logs: LogRow[] = []
  specs.forEach((spec, index) => {
    const orgNo = `ORG-${spec.key.padStart(4, '0')}`
    const id = `org-seed-${spec.key}`
    const { key: _key, ...rest } = spec
    orgs.push({ id, orgNo, ...rest })
    admins.push({
      id: `admin-seed-${spec.key}`,
      orgId: id,
      account: adminAccountFor(orgNo),
      passwordHash: hashes[index],
      status: 'active',
      lastLoginAt: null,
    })
    logs.push({
      id: `log-seed-${spec.key}`,
      orgId: id,
      action: '开户',
      operator: staff.displayName,
      operatorId: staff.id,
      detail: { seatQuota: spec.seatQuota, trialDays: 14, orgNo, adminAccount: adminAccountFor(orgNo), leadId: null },
      createdAt: spec.createdAt,
    })
  })

  return {
    version: 2,
    staff: [staff],
    orgs,
    admins,
    logs,
    leads: [],
    students: [],
    entitlements: [],
    activations: [],
  }
}

const STUDENT_DEMO_PASSWORD = '123456'

function grantEntitlement(store: OrgStore, org: OrgRow): void {
  const exists = store.entitlements.some((row) => row.orgId === org.id && row.subjectType === 'org')
  if (exists) return
  const trial = org.status === 'trial'
  store.entitlements.push({
    id: crypto.randomUUID(),
    orgId: org.id,
    subjectType: 'org',
    subjectId: org.id,
    levelOrderMin: 1,
    levelOrderMax: trial ? 3 : 999,
  })
}

async function ensureScopeRows(store: OrgStore): Promise<void> {
  store.students = store.students ?? []
  store.entitlements = store.entitlements ?? []
  store.activations = store.activations ?? []
  store.version = 2
  for (const org of store.orgs) grantEntitlement(store, org)
  const disabled = store.orgs.find((org) => org.id === 'org-seed-4')
  if (disabled && !store.students.some((student) => student.account === 'stop.stu')) {
    store.students.push({
      id: 'student-stop',
      orgId: disabled.id,
      groupId: 'G-A',
      name: '停用示例学生',
      account: 'stop.stu',
      passwordHash: await hashPassword(STUDENT_DEMO_PASSWORD),
      status: 'active',
      currentLevelOrder: 1,
      lastActiveAt: '',
      bindCode: '390001',
    })
  }
}

function ensurePlatformSession(store: OrgStore): void {
  const current = readJSON<{ staffId?: string } | null>(PLATFORM_SESSION_KEY, null)
  if (current?.staffId) return
  const ops = store.staff.find((item) => item.role === 'ops' && item.status === 'active')
  if (!ops) return
  writeJSON(PLATFORM_SESSION_KEY, { staffId: ops.id })
}

function loadStore(): Promise<OrgStore> {
  if (cache) return Promise.resolve(cache)
  if (!loading) {
    loading = (async () => {
      const existing = readJSON<OrgStore | null>(DB_KEY, null)
      const store =
        existing && Array.isArray(existing.orgs) && (existing.version === 1 || existing.version === 2)
          ? existing
          : await buildSeed()
      await ensureScopeRows(store)
      persist(store)
      ensurePlatformSession(store)
      return store
    })().catch((error) => {
      loading = null
      throw error
    })
  }
  return loading
}

export function withOrgStore<T>(fn: (store: OrgStore) => Promise<T>): Promise<T> {
  const run = queue.then(() => loadStore()).then(fn)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function requireOps(store: OrgStore): StaffRow {
  const current = readJSON<{ staffId?: string } | null>(PLATFORM_SESSION_KEY, null)
  const staff = store.staff.find((item) => item.id === current?.staffId)
  if (!staff || staff.role !== 'ops' || staff.status !== 'active') {
    throw new ApiError(403, '需要平台运营权限')
  }
  return staff
}

function toLedgerRow(org: OrgRow, now: Date): OrgLedgerRow {
  const status = effectiveStatus(org, now)
  return {
    id: org.id,
    orgNo: org.orgNo,
    name: org.name,
    contactPhone: org.contactPhone,
    campus: org.campus,
    seatQuota: org.seatQuota,
    usedSeats: org.usedSeats,
    createdAt: org.createdAt,
    trialExpireAt: org.trialExpireAt,
    serviceEndAt: org.serviceEndAt,
    status,
    expiringSoon: isExpiringSoon(org, now),
  }
}

export function listLedger(query: OrgLedgerQuery = {}): Promise<OrgLedgerRow[]> {
  return withOrgStore(async (store) => {
    const now = new Date()
    const keyword = query.keyword?.trim().toLowerCase() ?? ''
    const rows = store.orgs
      .map((org) => toLedgerRow(org, now))
      .filter((row) => {
        if (query.status && query.status !== 'all' && row.status !== query.status) return false
        if (keyword) {
          const haystack = `${row.name} ${row.orgNo} ${row.contactPhone}`.toLowerCase()
          if (!haystack.includes(keyword)) return false
        }
        const stored = store.orgs.find((org) => org.id === row.id)
        const day = stored ? expiryAnchor(stored) : null
        if ((query.expireFrom || query.expireTo) && !day) return false
        if (day) {
          const stamp = localDay(day)
          if (query.expireFrom && stamp < query.expireFrom) return false
          if (query.expireTo && stamp > query.expireTo) return false
        }
        return true
      })
    rows.sort((a, b) => {
      const aOrg = store.orgs.find((org) => org.id === a.id)
      const bOrg = store.orgs.find((org) => org.id === b.id)
      const aTime = aOrg ? expiryAnchor(aOrg) : null
      const bTime = bOrg ? expiryAnchor(bOrg) : null
      if (aTime === bTime) return a.orgNo.localeCompare(b.orgNo)
      if (!aTime) return 1
      if (!bTime) return -1
      return aTime < bTime ? -1 : 1
    })
    return rows
  })
}

export function currentOperator(): Promise<string> {
  return withOrgStore(async (store) => requireOps(store).displayName)
}

export function commitOrgStore(store: OrgStore): void {
  persist(store)
}

/** 每日展示回写。请求路径不调用它，拦截始终用 effectiveStatus 现算。 */
export function rewriteOrgStatusForDisplay(): Promise<number> {
  return withOrgStore(async (store) => {
    let changed = 0
    for (const org of store.orgs) {
      const next = effectiveStatus(org)
      if (next !== org.status) {
        org.status = next
        changed += 1
      }
    }
    if (changed) persist(store)
    return changed
  })
}

export function provisionOrg(input: ProvisionOrgInput): Promise<ProvisionOrgResult> {
  return withOrgStore(async (store) => {
    const staff = requireOps(store)
    const normalized = normalizeProvision(input)
    if (typeof normalized === 'string') throw new ApiError(400, normalized)

    if (normalized.leadId) {
      const lead = store.leads.find((item) => item.id === normalized.leadId)
      if (!lead) throw new ApiError(400, '线索不存在')
      if (lead.status === '已开户') throw new ApiError(400, '该线索已开户')
      if (lead.status !== '新' && lead.status !== '已联系') throw new ApiError(400, '该线索不能开户')
    }

    const plain = generateInitialPassword(12)
    const passwordHash = await hashPassword(plain)
    const orgNo = nextOrgNo(store.orgs.map((org) => org.orgNo))
    const account = adminAccountFor(orgNo)
    const now = new Date()
    const orgId = crypto.randomUUID()
    const trialExpireAt = new Date(now.getTime())
    trialExpireAt.setDate(trialExpireAt.getDate() + normalized.trialDays)

    store.orgs.push({
      id: orgId,
      orgNo,
      name: normalized.name,
      contactName: normalized.contactName,
      contactPhone: normalized.contactPhone,
      campus: normalized.campus,
      seatQuota: normalized.seatQuota,
      usedSeats: 0,
      status: 'trial',
      trialExpireAt: trialExpireAt.toISOString(),
      serviceStartAt: null,
      serviceEndAt: null,
      createdAt: now.toISOString(),
    })
    store.admins.push({
      id: crypto.randomUUID(),
      orgId,
      account,
      passwordHash,
      status: 'active',
      lastLoginAt: null,
    })
    store.logs.push({
      id: crypto.randomUUID(),
      orgId,
      action: '开户',
      operator: staff.displayName,
      operatorId: staff.id,
      detail: {
        seatQuota: normalized.seatQuota,
        trialDays: normalized.trialDays,
        orgNo,
        adminAccount: account,
        leadId: normalized.leadId ?? null,
      },
      createdAt: now.toISOString(),
    })
    if (normalized.leadId) {
      const lead = store.leads.find((item) => item.id === normalized.leadId)
      if (lead) {
        lead.status = '已开户'
        lead.orgId = orgId
      }
    }
    grantEntitlement(store, store.orgs[store.orgs.length - 1])
    persist(store)
    return { orgNo, adminAccount: account, initialPassword: plain }
  })
}

export function loginOrgAdmin(account: string, password: string): Promise<OrgSession> {
  return withOrgStore(async (store) => {
    const admin = store.admins.find((item) => item.account === account.trim() && item.status === 'active')
    const matched = admin ? await verifyPassword(password, admin.passwordHash) : false
    if (!admin || !matched) {
      if (!admin) await hashPassword('timing-pad')
      throw new ApiError(401, '账号或密码不正确')
    }
    const org = store.orgs.find((item) => item.id === admin.orgId)
    if (!org) throw new ApiError(401, '账号或密码不正确')
    const status = effectiveStatus(org)
    if (status === 'disabled') throw new ApiError(403, '机构已停用，无法登录')

    admin.lastLoginAt = new Date().toISOString()
    persist(store)
    writeJSON(ORG_SESSION_KEY, { adminId: admin.id })
    const session = readOrgSession()
    if (!session) throw new ApiError(403, '机构已停用，无法登录')
    return session
  })
}

function peekStore(): OrgStore | null {
  return cache ?? readJSON<OrgStore | null>(DB_KEY, null)
}

export function readOrgSession(): OrgSession | null {
  const ref = readJSON<{ adminId?: string } | null>(ORG_SESSION_KEY, null)
  if (!ref?.adminId) return null
  const store = peekStore()
  if (!store) return null
  const admin = store.admins.find((item) => item.id === ref.adminId && item.status === 'active')
  if (!admin) return null
  const org = store.orgs.find((item) => item.id === admin.orgId)
  if (!org) return null
  const status = effectiveStatus(org)
  return {
    adminId: admin.id,
    account: admin.account,
    orgId: org.id,
    orgNo: org.orgNo,
    orgName: org.name,
    status,
    readOnly: status === 'expired',
    seatQuota: org.seatQuota,
    usedSeats: org.usedSeats,
    trialExpireAt: org.trialExpireAt,
    serviceEndAt: org.serviceEndAt,
  }
}

export function logoutOrgAdmin(): void {
  writeJSON(ORG_SESSION_KEY, null)
}

const STUDENT_SESSION_KEY = 'session.student'

export interface StudentSessionRef {
  studentId: string
  source: 'org' | 'mock'
}

export function readStudentSession(): StudentSessionRef | null {
  const raw = readJSON<unknown>(STUDENT_SESSION_KEY, null)
  if (!raw) return null
  if (typeof raw === 'string') return { studentId: raw, source: 'mock' }
  if (typeof raw === 'object' && raw && 'studentId' in raw) {
    const rec = raw as { studentId?: string; source?: string }
    if (!rec.studentId) return null
    return { studentId: rec.studentId, source: rec.source === 'org' ? 'org' : 'mock' }
  }
  return null
}

export function writeOrgStudentSession(studentId: string): void {
  writeJSON(STUDENT_SESSION_KEY, { studentId, source: 'org' })
}

export function readOrgStudentById(studentId: string): OrgStudentRow | null {
  const store = peekStore()
  return store?.students?.find((student) => student.id === studentId) ?? null
}
