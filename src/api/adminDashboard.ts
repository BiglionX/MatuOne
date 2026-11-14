import type { AdminDashboard } from '@/types/adminDashboard'
import type { IssuedAgentAccount } from '@/types/agentPortal'
import { callFunction } from '@/lib/backend'

export type { AdminDashboard, AgentCommission, ExpiringOrg, SeatAlert } from '@/types/adminDashboard'
export { ApiError } from '@/lib/apiError'

export function loadAdminDashboard(): Promise<AdminDashboard> {
  return callFunction('admin-dashboard', { action: 'overview' }, { role: 'platform' })
}

export function issueAgentAccount(agentId: string): Promise<IssuedAgentAccount> {
  return callFunction('admin-ops', { action: 'issue-agent-account', agentId }, { role: 'platform' })
}
