import type { AdminParentDetail, AdminParentList, AdminParentQuery } from '@/types/adminParents'
import { callFunction } from '@/lib/backend'

export type {
  AdminParentChild,
  AdminParentDetail,
  AdminParentList,
  AdminParentQuery,
  AdminParentRow,
} from '@/types/adminParents'
export { ApiError } from '@/lib/apiError'

export function listAdminParents(query: AdminParentQuery = {}): Promise<AdminParentList> {
  return callFunction(
    'admin-users',
    { action: 'list_parents', page: query.page, pageSize: query.pageSize, keyword: query.keyword },
    { role: 'platform' },
  )
}

export function getAdminParent(parentId: string): Promise<AdminParentDetail> {
  return callFunction('admin-users', { action: 'parent_detail', parentId }, { role: 'platform' })
}

export function unbindAdminParent(parentId: string, studentId: string): Promise<{ ok: true }> {
  return callFunction('admin-users', { action: 'unbind_parent', parentId, studentId }, { role: 'platform' })
}

export function resetAdminParentPassword(parentId: string): Promise<{ password: string }> {
  return callFunction('admin-users', { action: 'reset_password', userId: parentId, role: 'parent' }, { role: 'platform' })
}

export function deleteAdminParent(parentId: string): Promise<{ ok: true }> {
  return callFunction('admin-users', { action: 'delete_parent', parentId }, { role: 'platform' })
}
