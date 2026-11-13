import type {
  AdminStudentDetail,
  AdminStudentList,
  AdminStudentQuery,
} from '@/types/adminStudents'
import { callFunction } from '@/lib/backend'

export type {
  AdminStudentDetail,
  AdminStudentList,
  AdminStudentParent,
  AdminStudentQuery,
  AdminStudentRow,
  AdminStudentStatus,
} from '@/types/adminStudents'
export { ApiError } from '@/lib/apiError'

export function listAdminStudents(query: AdminStudentQuery = {}): Promise<AdminStudentList> {
  return callFunction(
    'admin-users',
    {
      action: 'list_students',
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword,
      orgId: query.orgId,
      status: query.status,
    },
    { role: 'platform' },
  )
}

export function getAdminStudent(studentId: string): Promise<AdminStudentDetail> {
  return callFunction('admin-users', { action: 'student_detail', studentId }, { role: 'platform' })
}

export function resetAdminStudentPassword(studentId: string): Promise<{ password: string }> {
  return callFunction('admin-users', { action: 'reset_password', userId: studentId, role: 'student' }, { role: 'platform' })
}
