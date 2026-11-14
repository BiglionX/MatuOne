/** 运营后台机构开户。页面与 api 共用，不含密码字段。 */

export type OrgStatus = 'trial' | 'active' | 'expired' | 'disabled'

export interface ProvisionOrgInput {
  name: string
  contactName: string
  contactPhone: string
  campus: string
  seatQuota: number
  /** 缺省 14。不接受 operator / orgId。 */
  trialDays?: number
  leadId?: string
}

/** 初始密码只出现在这次返回值里，调用方不得落库。 */
export interface ProvisionOrgResult {
  orgNo: string
  adminAccount: string
  initialPassword: string
}

export interface OrgLedgerQuery {
  status?: OrgStatus | 'all'
  /** YYYY-MM-DD，含边界 */
  expireFrom?: string
  expireTo?: string
  keyword?: string
}

export interface OrgDetail {
  id: string
  orgNo: string
  name: string
  contactName: string
  contactPhone: string
  campus: string
  seatQuota: number
  usedSeats: number
  activeStudents: number
  boundParents: number
  trialExpireAt: string | null
  serviceEndAt: string | null
  status: OrgStatus
}

export interface ProvisionLog {
  id: string
  action: '开户' | '续费' | '停用' | '恢复'
  operator: string
  summary: string
  createdAt: string
}

export interface OrgDetailPayload {
  org: OrgDetail
  logs: ProvisionLog[]
}

export interface OrgLedgerRow {
  id: string
  orgNo: string
  name: string
  contactPhone: string
  campus: string
  seatQuota: number
  usedSeats: number
  createdAt: string
  trialExpireAt: string | null
  serviceEndAt: string | null
  status: OrgStatus
  /** 试用中/正常且 30 天内到期，台账标黄 */
  expiringSoon: boolean
  /** 没有归属时代账显示为空 */
  agentName: string | null
}

export interface OrgSession {
  adminId: string
  account: string
  orgId: string
  orgNo: string
  orgName: string
  status: OrgStatus
  readOnly: boolean
  seatQuota: number
  usedSeats: number
  trialExpireAt: string | null
  serviceEndAt: string | null
}
