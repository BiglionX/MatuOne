/** 平台运营配置。开户和续费只认服务端读到的这组值。 */

export interface PlatformSettings {
  minSeatCount: number
  baseSeatPrice: number
  trialDays: number
  agentCommissionRate: number
  updatedAt: string | null
}
