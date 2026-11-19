export type OrgMemberRole = 'admin' | 'teacher'

export type OrgBillType = '新购' | '续费' | '扩容'

export type OrgBillPayStatus = '已支付' | '待支付'

export type OrgInvoiceStatus = '未开票' | '已申请' | '已开票' | '已寄出'

export interface OrgBill {
  id: string
  month: string
  type: OrgBillType
  seats: number
  amount: number
  payStatus: OrgBillPayStatus
  invoiceStatus: OrgInvoiceStatus
}

export interface OrgFinanceView {
  trial: boolean
  studentCount: number
  seatQuota: number
  studentMonthlyPrice: number
  baseSeatPrice: number
  bills: OrgBill[]
}
