import type { Group, ImportRowResult, Student } from '@/types'
import { callFunction } from '@/lib/backend'

export { ApiError } from '@/lib/apiError'

export interface OrgCourseSettings {
  groupId: string
  seats: number
  expiresAt: string
  activatedAt: string
  levelCount: number
}

export interface OrgDashboardView {
  reading: number
  weeklyActive: number
  avgCompleted: number
  totalLevels: number
  groupRows: { groupId: string; name: string; rate: number; students: number }[]
  studentRows: {
    student: Omit<Student, 'password'>
    groupName: string
    completedCount: number
    currentOrder: number
    typing: { wpm: number; accuracy: number } | null
    lastActiveAt: string
  }[]
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
}

export async function listOrgStudents(): Promise<OrgStudentListItem[]> {
  const result = await callFunction<{
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
    }[]
  }>('org-students', {}, { role: 'org', headers: { 'x-action': 'list' } })
  return result.students.map((row) => ({
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
  }))
}

export async function unbindOrgStudent(studentId: string): Promise<void> {
  await callFunction('org-students', { studentId }, { role: 'org', headers: { 'x-action': 'unbind-parent' } })
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

export function saveOrgCourse(input: { groupId: string; seats: number; expiresAt: string }): Promise<OrgCourseSettings> {
  return callFunction('org-course', input, { role: 'org', headers: { 'x-action': 'save' } })
}

export function loadOrgDashboard(): Promise<OrgDashboardView> {
  return callFunction('org-dashboard', {}, { role: 'org' })
}
