import type { AdminDashboard } from '@/types/adminDashboard'
import { callFunction } from '@/lib/backend'

export type { AdminDashboard, ExpiringOrg, SeatAlert } from '@/types/adminDashboard'
export { ApiError } from '@/lib/apiError'

export function loadAdminDashboard(): Promise<AdminDashboard> {
  return callFunction('admin-dashboard', { action: 'overview' }, { role: 'platform' })
}
