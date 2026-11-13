import type { OrgDetailPayload, OrgLedgerQuery, OrgLedgerRow, ProvisionOrgInput, ProvisionOrgResult } from '@/types/orgAdmin'
import type { BillingInput, BillingRecord, InvoiceStatus, LeadRow, OpsOverview } from '@/types/ops'
import { callFunction, clearAuth, establishSession } from '@/lib/backend'

export type { OrgDetail, OrgDetailPayload, OrgLedgerQuery, OrgLedgerRow, ProvisionLog, ProvisionOrgInput, ProvisionOrgResult } from '@/types/orgAdmin'
export { ApiError } from '@/lib/apiError'

const PROFILE = 'cdg.session.platform'

export interface PlatformProfile {
  account: string
  displayName: string
  role: 'ops' | 'finance'
}

function readProfile(): PlatformProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE)
    return raw ? (JSON.parse(raw) as PlatformProfile) : null
  } catch {
    return null
  }
}

export function getPlatformProfile(): PlatformProfile | null {
  return readProfile()
}

export async function loginPlatform(account: string, password: string): Promise<PlatformProfile> {
  const result = await callFunction<{
    accessToken: string
    refreshToken: string
    account: string
    displayName: string
    role: 'ops' | 'finance'
  }>('platform-login', { account, password })
  await establishSession('platform', result.accessToken, result.refreshToken)
  const profile: PlatformProfile = { account: result.account, displayName: result.displayName, role: result.role }
  localStorage.setItem(PROFILE, JSON.stringify(profile))
  return profile
}

export function logoutPlatform(): void {
  localStorage.removeItem(PROFILE)
  void clearAuth('platform')
}

export async function getPlatformOperator(): Promise<string> {
  return readProfile()?.displayName ?? ''
}

export async function listOrgs(query: OrgLedgerQuery = {}): Promise<OrgLedgerRow[]> {
  const result = await callFunction<{ orgs: OrgLedgerRow[] }>('admin-ops', { action: 'ledger', ...query }, { role: 'platform' })
  return result.orgs
}

export function provisionOrg(input: ProvisionOrgInput): Promise<ProvisionOrgResult> {
  return callFunction('admin-provision-org', input, { role: 'platform' })
}

export function loadOrgDetail(orgId: string): Promise<OrgDetailPayload> {
  return callFunction('admin-ops', { action: 'detail', orgId }, { role: 'platform' })
}

export function loadOverview(): Promise<OpsOverview> {
  return callFunction('admin-ops', { action: 'overview' }, { role: 'platform' })
}

export async function listLeads(): Promise<LeadRow[]> {
  const result = await callFunction<{
    leads: {
      id: string
      org_name: string
      contact: string
      phone: string
      city: string
      est_students: number | null
      note: string | null
      status: LeadRow['status']
      org_id: string | null
      created_at: string
    }[]
  }>('admin-ops', { action: 'leads' }, { role: 'platform' })
  return result.leads.map((row) => ({
    id: row.id,
    orgName: row.org_name,
    contact: row.contact,
    phone: row.phone,
    city: row.city,
    estStudents: row.est_students,
    note: row.note,
    status: row.status,
    orgId: row.org_id,
    createdAt: row.created_at,
  }))
}

export async function setLeadStatus(leadId: string, status: LeadRow['status']): Promise<void> {
  await callFunction('admin-ops', { action: 'leads', leadId, status }, { role: 'platform' })
}

export function quoteSeats(seats: number): Promise<{ unitPrice: number; amount: number; plan: string }> {
  return callFunction('admin-ops', { action: 'quote', seats }, { role: 'platform' })
}

export async function listBilling(orgId: string): Promise<BillingRecord[]> {
  const result = await callFunction<{
    records: {
      id: string
      type: BillingRecord['type']
      plan: string
      seats: number
      amount: number
      amount_overridden: boolean
      note: string | null
      pay_method: string
      service_start: string | null
      service_end: string | null
      invoice_status: InvoiceStatus
      renew_remind_at: string | null
      operator: string
      created_at: string
    }[]
  }>('admin-ops', { action: 'billing', orgId }, { role: 'platform' })
  return result.records.map((row) => ({
    id: row.id,
    type: row.type,
    plan: row.plan,
    seats: row.seats,
    amount: row.amount,
    overridden: row.amount_overridden,
    note: row.note,
    payMethod: row.pay_method,
    serviceStart: row.service_start,
    serviceEnd: row.service_end,
    invoiceStatus: row.invoice_status,
    renewRemindAt: row.renew_remind_at,
    operator: row.operator,
    createdAt: row.created_at,
  }))
}

export function saveBilling(orgId: string, record: BillingInput): Promise<{ id: string }> {
  return callFunction('admin-ops', { action: 'billing', orgId, record }, { role: 'platform' })
}

export function setInvoiceStatus(recordId: string, invoiceStatus: InvoiceStatus): Promise<void> {
  return callFunction('admin-ops', { action: 'invoice', recordId, invoiceStatus }, { role: 'platform' })
}

export function setOrgManualStatus(orgId: string, manualAction: '停用' | '恢复'): Promise<void> {
  return callFunction('admin-ops', { action: 'status', orgId, manualAction }, { role: 'platform' })
}
