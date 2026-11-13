/**
 * 机构端唯一入口。机构状态、席位、跨机构访问都在这里判定，页面不复写。
 */
import type { OrgStatus } from '@/types/orgAdmin'
import { ApiError } from './apiError'
import { effectiveStatus, seatLimit } from './orgRules'
import {
  commitOrgStore,
  readOrgSession,
  readStudentSession,
  withOrgStore,
  type OrgRow,
  type OrgStore,
} from './orgStore'

export interface OrgScopeContext {
  orgId: string
  org: OrgRow
  status: OrgStatus
  seatLimit: number
  store: OrgStore
}

export interface OrgScopeRequest {
  write?: boolean
  importStudents?: boolean
  /** 调用方若传入，且与会话机构不同，直接拒绝，不读取对方数据。 */
  orgId?: string | null
}

export async function withOrgScope<T>(
  request: OrgScopeRequest,
  handler: (ctx: OrgScopeContext) => Promise<T>,
): Promise<T> {
  return withOrgStore(async (store) => {
    const session = readOrgSession()
    if (!session) {
      if (readStudentSession()) throw new ApiError(401, '非机构角色')
      throw new ApiError(401, '未登录')
    }

    const requested = request.orgId?.trim()
    if (requested && requested !== session.orgId) {
      throw new ApiError(403, '无权访问该机构')
    }

    const org = store.orgs.find((item) => item.id === session.orgId)
    if (!org) throw new ApiError(401, '未登录')

    const status = effectiveStatus(org)
    if (status === 'disabled') throw new ApiError(403, '机构已停用')
    if (status === 'expired' && (request.write || request.importStudents)) {
      throw new ApiError(403, '服务已到期，仅可查看')
    }

    const limit = seatLimit(org, status)
    if (request.importStudents && org.usedSeats >= limit) {
      throw new ApiError(409, '席位已满')
    }

    const result = await handler({ orgId: org.id, org, status, seatLimit: limit, store })
    commitOrgStore(store)
    return result
  })
}
