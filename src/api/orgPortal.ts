import type { OrgFinanceView } from '@/types/orgFinance'
import type { Group, ImportRowResult, Student } from '@/types'
import type { OrgStudentProgress } from '@/types/orgProgress'
import { callFunction } from '@/lib/backend'
import type { ProgressModuleId } from '@/modules/ids'

export { ApiError } from '@/lib/apiError'

export interface OrgCourseSettings {
  groupId: string
  seats: number
  expiresAt: string
  activatedAt: string
  levelCount: number
  /** org_entitlement(module_id=python).max_level。0 表示还没有课程包。 */
  maxLevel: number
  studentMonthlyPrice: number
  /** 平台底价，元/席/月。来自运营配置。 */
  baseSeatPrice: number
}

export function saveOrgStudentPrice(studentMonthlyPrice: number): Promise<OrgCourseSettings> {
  return callFunction('org-course', { studentMonthlyPrice }, { role: 'org', headers: { 'x-action': 'save-price' } })
}

export function getOrgFinance(): Promise<OrgFinanceView> {
  return callFunction('org-finance', {}, { role: 'org', headers: { 'x-action': 'read' } })
}

export function saveOrgFinancePrice(studentMonthlyPrice: number): Promise<OrgFinanceView> {
  return callFunction('org-finance', { studentMonthlyPrice }, { role: 'org', headers: { 'x-action': 'save-price' } })
}

export function requestOrgInvoice(recordId: string, title: string, taxNo: string): Promise<OrgFinanceView> {
  return callFunction('org-finance', { recordId, title, taxNo }, { role: 'org', headers: { 'x-action': 'invoice' } })
}

export type OrgAttention = 'disabled' | 'inactive' | 'stuck'

export interface OrgDashboardStudent {
  student: Omit<Student, 'password'>
  groupName: string
  completedCount: number
  authorizedCompletedCount: number
  currentOrder: number
  typing: { wpm: number; accuracy: number } | null
  lastActiveAt: string
  lastStudiedAt: string | null
  /** 机构有效开通模块，与家长端/启动器同源 */
  enabledModules: ProgressModuleId[]
}

export interface OrgDashboardView {
  reading: number
  weeklyActive: number
  avgCompleted: number
  authorizedLevels: number
  groupRows: { groupId: string; name: string; rate: number | null; students: number }[]
  attentionRows: (OrgDashboardStudent & { reason: OrgAttention })[]
}

function asStudent(row: Omit<Student, 'password'>): Student {
  return { ...row, password: '' }
}

export async function listOrgGroups(): Promise<Group[]> {
  const result = await callFunction<{ groups: { id: string; name: string }[] }>(
    'org-students',
    {},
    { role: 'org', headers: { 'x-action': 'groups' } },
  )
  return result.groups
}

export async function createOrgGroup(name: string): Promise<Group[]> {
  const result = await callFunction<{ groups: { id: string; name: string }[] }>(
    'org-students',
    { name },
    { role: 'org', headers: { 'x-action': 'create-group' } },
  )
  return result.groups
}

export interface OrgStudentListItem extends Student {
  boundParentCount: number
  /** 与 authorizedCompletedCount 同义（S0 后列表 completed_count 即授权内完成数） */
  completedCount: number
  authorizedLevels: number
  authorizedCompletedCount: number
  /** 机构有效开通模块；各模块进度只从这里派生，不再各自算 xxxEnabled */
  enabledModules: ProgressModuleId[]
  /** 三链最近学习时间；API 始终返回（无记录为 null） */
  lastStudiedAt: string | null
  typing: { wpm: number; accuracy: number } | null
}

export async function listOrgStudents(): Promise<OrgStudentListItem[]> {
  const result = await callFunction<{
    authorizedLevels?: number
    students: {
      id: string
      name: string
      account: string
      group_id: string
      status: 'active' | 'disabled'
      bind_code: string | null
      current_level_order: number
      last_active_at: string | null
      bound_parent_count?: number
      completed_count?: number
      authorizedCompletedCount?: number
      enabledModules?: ProgressModuleId[]
      lastStudiedAt?: string | null
      typing_wpm?: number | null
      typing_accuracy?: number | null
    }[]
  }>('org-students', {}, { role: 'org', headers: { 'x-action': 'list' } })
  const authorizedLevels = result.authorizedLevels ?? 0
  return result.students.map((row) => {
    const authorizedCompletedCount = row.authorizedCompletedCount ?? row.completed_count ?? 0
    return {
      ...asStudent({
        id: row.id,
        orgId: '',
        groupId: row.group_id,
        name: row.name,
        account: row.account,
        status: row.status,
        currentLevelOrder: row.current_level_order,
        lastActiveAt: row.last_active_at ?? '',
        bindCode: row.bind_code ?? '',
      }),
      boundParentCount: row.bound_parent_count ?? 0,
      completedCount: authorizedCompletedCount,
      authorizedLevels,
      authorizedCompletedCount,
      enabledModules: row.enabledModules ?? [],
      lastStudiedAt: row.lastStudiedAt ?? null,
      typing: row.typing_wpm == null ? null : { wpm: row.typing_wpm, accuracy: row.typing_accuracy ?? 0 },
    }
  })
}

/** studentId 只用来点名本机构的一名学生，机构身份仍由服务端会话决定。 */
export async function loadOrgStudentProgress(studentId: string): Promise<OrgStudentProgress> {
  return callFunction('org-students', { studentId }, { role: 'org', headers: { 'x-action': 'progress' } })
}

export async function unbindOrgStudent(studentId: string): Promise<void> {
  await callFunction('org-students', { studentId }, { role: 'org', headers: { 'x-action': 'unbind-parent' } })
}

/** studentId 只用来点名本机构的一名学生。新密码只返回这一次。 */
export function resetOrgStudentPassword(studentId: string): Promise<{ password: string }> {
  return callFunction('org-students', { studentId }, { role: 'org', headers: { 'x-action': 'reset-password' } })
}

/** 停用只改状态，不删除学生、学习记录和席位占用。 */
export function setOrgStudentStatus(
  studentId: string,
  status: 'active' | 'disabled',
): Promise<{ ok: true; status: 'active' | 'disabled' }> {
  return callFunction('org-students', { studentId, status }, { role: 'org', headers: { 'x-action': 'set-status' } })
}

/** groupId 只用来点名本机构已有分组。 */
export function setOrgStudentGroup(studentId: string, groupId: string): Promise<{ ok: true; groupId: string }> {
  return callFunction('org-students', { studentId, groupId }, { role: 'org', headers: { 'x-action': 'set-group' } })
}

export async function importOrgStudents(csv: string): Promise<{ rows: ImportRowResult[]; added: number }> {
  return callFunction('org-students', { csv }, { role: 'org', headers: { 'x-action': 'import' } })
}

export function importTemplate(groups: Group[]): string {
  const name = groups[0]?.name ?? '萌芽班'
  return `姓名,账号,分组\n示例学生,student01,${name}\n`
}

export function getOrgCourse(): Promise<OrgCourseSettings> {
  return callFunction('org-course', {}, { role: 'org', headers: { 'x-action': 'read' } })
}

export function loadOrgDashboard(): Promise<OrgDashboardView> {
  return callFunction('org-dashboard', {}, { role: 'org' })
}
