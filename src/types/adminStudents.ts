export type AdminStudentStatus = 'active' | 'disabled'

export interface AdminStudentQuery {
  page?: number
  pageSize?: number
  keyword?: string
  orgId?: string
  status?: AdminStudentStatus
}

export interface AdminStudentRow {
  id: string
  name: string
  account: string
  status: AdminStudentStatus
  orgId: string
  orgName: string
  groupName: string
  currentLevelOrder: number
  boundParentCount: number
  lastActiveAt: string | null
}

export interface AdminStudentList {
  page: number
  pageSize: number
  total: number
  totalLevels: number
  students: AdminStudentRow[]
}

export interface AdminStudentParent {
  account: string
  boundAt: string
}

export interface AdminStudentDetail {
  totalLevels: number
  student: AdminStudentRow & { bindCode: string }
  parents: AdminStudentParent[]
}
