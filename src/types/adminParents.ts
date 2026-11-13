export interface AdminParentQuery {
  page?: number
  pageSize?: number
  keyword?: string
}

export interface AdminParentRow {
  id: string
  account: string
  childCount: number
  createdAt: string
  lastLoginAt: string | null
}

export interface AdminParentList {
  page: number
  pageSize: number
  total: number
  parents: AdminParentRow[]
}

export interface AdminParentChild {
  studentId: string
  name: string
  orgName: string
  boundAt: string
}

export interface AdminParentDetail {
  parent: AdminParentRow
  children: AdminParentChild[]
}
