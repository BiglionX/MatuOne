import type { AgentHome, AgentSession } from '@/types/agentPortal'
import { callFunction, clearAuth, establishSession } from '@/lib/backend'

export type { AgentHome, AgentSession } from '@/types/agentPortal'
export { ApiError } from '@/lib/apiError'

const PROFILE = 'cdg.session.agent'

interface LoginResponse {
  accessToken: string
  refreshToken: string
  adminId: string
  account: string
  agentName: string
  region: string
}

function readProfile(): AgentSession | null {
  try {
    const raw = localStorage.getItem(PROFILE)
    return raw ? (JSON.parse(raw) as AgentSession) : null
  } catch {
    return null
  }
}

/** 只提交账号密码。区域服务商身份由服务端按 agent_admin 回填。 */
export async function loginAgent(account: string, password: string): Promise<AgentSession> {
  const result = await callFunction<LoginResponse>('agent-login', { account, password })
  await establishSession('agent', result.accessToken, result.refreshToken)
  const session: AgentSession = {
    adminId: result.adminId,
    account: result.account,
    agentName: result.agentName,
    region: result.region,
  }
  localStorage.setItem(PROFILE, JSON.stringify(session))
  return session
}

export function getAgentSession(): AgentSession | null {
  return readProfile()
}

export function logoutAgent(): void {
  localStorage.removeItem(PROFILE)
  void clearAuth('agent')
}

export function loadAgentHome(): Promise<AgentHome> {
  return callFunction('agent-portal', { action: 'home' }, { role: 'agent' })
}
