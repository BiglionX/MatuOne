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

export interface AdminDashboard {
  revenue: number
  activeStudents: number
  activeParentsToday: number
  conversionRate: number
  expiringOrgs: ExpiringOrg[]
  seatAlerts: SeatAlert[]
}
