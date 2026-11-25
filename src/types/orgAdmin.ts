import type { OrgMemberRole } from '@/types/orgFinance'
import type { ModuleId } from '@/modules/types'

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
  action: '开户' | '续费' | '停用' | '恢复' | '模块调整' | '模块开关'
  operator: string
  summary: string
  createdAt: string
}

/** 平台侧模块视图行：候选集来自注册表，含已软关的行。 */
export interface OrgModuleAdminRow {
  moduleId: ModuleId
  /** 课程阶段上限；该模块不按阶段授权时为 null */
  maxLevel: number | null
  validUntil: string | null
  revokedAt: string | null
  /** 当前是否算已开通（未软关且未过期） */
  enabled: boolean
  /** 该模块是否有阶段上限（可调） */
  hasLevelLimit: boolean
}

export interface OrgDetailPayload {
  org: OrgDetail
  modules: OrgModuleAdminRow[]
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
  /** 缺省按管理员处理，兼容还没带角色的旧会话。老师登录后一定是 teacher。 */
  role?: OrgMemberRole
}
