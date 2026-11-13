import type { OrgSession } from '@/types/orgAdmin'
import { ApiError } from '@/lib/apiError'
import { callFunction, clearAuth, establishSession } from '@/lib/backend'

export type { OrgSession } from '@/types/orgAdmin'
export { ApiError } from '@/lib/apiError'

const PROFILE = 'cdg.session.org'

interface LoginResponse {
  accessToken: string
  refreshToken: string
  adminId: string
  account: string
  orgId: string
  orgNo: string
  orgName: string
  status: OrgSession['status']
  readOnly: boolean
  seatQuota: number
  usedSeats: number
  trialExpireAt: string | null
  serviceEndAt: string | null
}

function readProfile(): OrgSession | null {
  try {
    const raw = localStorage.getItem(PROFILE)
    return raw ? (JSON.parse(raw) as OrgSession) : null
  } catch {
    return null
  }
}

/** 只提交账号密码。orgId 由服务端按 org_admin 行回填。 */
export async function loginOrgAdmin(account: string, password: string): Promise<OrgSession> {
  const result = await callFunction<LoginResponse>('org-login', { account, password })
  await establishSession('org', result.accessToken, result.refreshToken)
  const session: OrgSession = {
    adminId: result.adminId,
    account: result.account,
    orgId: result.orgId,
    orgNo: result.orgNo,
    orgName: result.orgName,
    status: result.status,
    readOnly: result.readOnly,
    seatQuota: result.seatQuota,
    usedSeats: result.usedSeats,
    trialExpireAt: result.trialExpireAt,
    serviceEndAt: result.serviceEndAt,
  }
  localStorage.setItem(PROFILE, JSON.stringify(session))
  return session
}

export function getOrgSession(): OrgSession | null {
  return readProfile()
}

export function logoutOrgAdmin(): void {
  localStorage.removeItem(PROFILE)
  void clearAuth('org')
}
