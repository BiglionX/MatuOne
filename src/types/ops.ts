export interface PriceTier {
  minSeats: number
  maxSeats: number | null
  unitPrice: number
}

export interface PriceExample {
  seats: number
  unitPrice: number
  amount: number
  plan: string
}

export interface LeadInput {
  orgName: string
  contact: string
  phone: string
  city: string
  estStudents: number
  note?: string
}

export interface LeadRow {
  id: string
  orgName: string
  contact: string
  phone: string
  city: string
  estStudents: number | null
  note: string | null
  status: '新' | '已联系' | '已开户' | '已关闭'
  orgId: string | null
  createdAt: string
}

export type BillingType = '试用' | '新购' | '续费' | '扩容'
export type InvoiceStatus = '未开票' | '已申请' | '已开票' | '已寄出'

export interface BillingRecord {
  id: string
  type: BillingType
  plan: string
  seats: number
  amount: number
  overridden: boolean
  note: string | null
  payMethod: string
  serviceStart: string | null
  serviceEnd: string | null
  invoiceStatus: InvoiceStatus
  renewRemindAt: string | null
  operator: string
  createdAt: string
}

export interface BillingInput {
  type: BillingType
  seats: number
  amount: number
  overridden: boolean
  note?: string
  serviceStart?: string
  serviceEnd?: string
}

export interface OpsOverview {
  renewing: number
  conversion: number
  newOrgs: number
  collected: number
}
