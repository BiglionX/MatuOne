export interface AgentSession {
  adminId: string
  account: string
  agentName: string
  region: string
}

export interface AgentOrgRow {
  orgNo: string
  name: string
  status: string
  seatQuota: number
}

export interface AgentCommissionRecord {
  orgName: string
  baseAmount: number | null
  commissionAmount: number
  status: string
  createdAt: string
}

export interface AgentHome {
  agentName: string
  region: string
  account: string
  orgCount: number
  seatFeeTotal: number
  commissionDue: number
  commissionSettled: number
  orgs: AgentOrgRow[]
  records: AgentCommissionRecord[]
}

export interface IssuedAgentAccount {
  account: string
  initialPassword: string
  reset: boolean
}
