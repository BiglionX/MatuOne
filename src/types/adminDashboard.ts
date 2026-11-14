export interface ExpiringOrg {
  id: string
  name: string
  daysLeft: number
  contactPhone: string
}

export interface SeatAlert {
  id: string
  name: string
  usedSeats: number
  seatQuota: number
}

export interface AgentCommission {
  agentId: string
  agentName: string
  orgCount: number
  seatFeeTotal: number
  rebateDue: number
  platformNet: number
}

export interface AdminDashboard {
  revenue: number
  activeStudents: number
  activeParentsToday: number
  conversionRate: number
  expiringOrgs: ExpiringOrg[]
  seatAlerts: SeatAlert[]
  commissions: AgentCommission[]
}
