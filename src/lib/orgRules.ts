import type { ProvisionOrgInput } from '@/types/orgAdmin'
import { GRACE_DAYS, TRIAL_SEAT_CAP, effectiveStatus, type OrgClock } from '../../supabase/functions/_shared/orgStatus'

export { GRACE_DAYS, TRIAL_SEAT_CAP, effectiveStatus, seatLimit } from '../../supabase/functions/_shared/orgStatus'
export type { OrgClock } from '../../supabase/functions/_shared/orgStatus'

/** 与 supabase/migrations 里的 provision_org、effective_org_status 保持一致。 */
export const ADMIN_ACCOUNT_DOMAIN = 'daima-chuangguan.local'
export const TRIAL_DAYS_DEFAULT = 14

const DAY_MS = 24 * 60 * 60 * 1000

/** 排序和到期筛选用的那一个到期时刻。 */
export function expiryAnchor(org: OrgClock): string | null {
  if (org.status === 'trial') return org.trialExpireAt
  return org.serviceEndAt ?? org.trialExpireAt
}

export function isExpiringSoon(org: OrgClock, now = new Date()): boolean {
  const status = effectiveStatus(org, now)
  if (status !== 'trial' && status !== 'active') return false
  const anchor = expiryAnchor(org)
  if (!anchor) return false
  const delta = new Date(anchor).getTime() - now.getTime()
  return delta >= 0 && delta <= GRACE_DAYS * DAY_MS
}

export function adminAccountFor(orgNo: string): string {
  return `admin${orgNo.replace(/-/g, '').toLowerCase()}@${ADMIN_ACCOUNT_DOMAIN}`
}

export function nextOrgNo(existing: string[]): string {
  let max = 0
  for (const no of existing) {
    const matched = /^ORG-(\d+)$/.exec(no)
    if (matched) max = Math.max(max, Number(matched[1]))
  }
  return `ORG-${String(max + 1).padStart(4, '0')}`
}

export function localDay(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export interface NormalizedProvision {
  name: string
  contactName: string
  contactPhone: string
  campus: string
  seatQuota: number
  trialDays: number
  leadId?: string
}

/** 返回错误文案；通过时给出裁剪后的入参。席位上限在这里拦截，不靠页面。 */
export function normalizeProvision(input: ProvisionOrgInput): NormalizedProvision | string {
  const name = input.name.trim()
  const contactName = input.contactName.trim()
  const contactPhone = input.contactPhone.trim()
  const campus = input.campus.trim()
  const trialDays = input.trialDays == null ? TRIAL_DAYS_DEFAULT : input.trialDays

  if (name.length < 2 || name.length > 50) return '机构名称需要 2–50 个字'
  if (contactName.length < 2 || contactName.length > 20) return '联系人需要 2–20 个字'
  if (!/^1\d{10}$/.test(contactPhone)) return '请填写 11 位手机号'
  if (campus.length < 1 || campus.length > 50) return '请填写校区'
  if (!Number.isInteger(trialDays) || trialDays < 1 || trialDays > 90) return '试用天数需要在 1–90 之间'
  if (!Number.isInteger(input.seatQuota) || input.seatQuota < 1) return '席位额度至少为 1'
  if (input.seatQuota > TRIAL_SEAT_CAP) return '试用机构最多 10 个席位'

  const leadId = input.leadId?.trim()
  return {
    name,
    contactName,
    contactPhone,
    campus,
    seatQuota: input.seatQuota,
    trialDays,
    leadId: leadId ? leadId : undefined,
  }
}
