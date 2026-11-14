import type { PlatformSettings } from '@/types/platformSettings'
import { callFunction } from '@/lib/backend'

export type { PlatformSettings } from '@/types/platformSettings'
export { ApiError } from '@/lib/apiError'

interface ConfigRow {
  key: string
  value: string
  description: string
  updated_at: string | null
}

function readSettings(rows: ConfigRow[]): PlatformSettings {
  const valueOf = (key: string) => rows.find((row) => row.key === key)?.value ?? ''
  const updatedAt = rows.reduce<string | null>((latest, row) => {
    if (!row.updated_at) return latest
    if (!latest || row.updated_at > latest) return row.updated_at
    return latest
  }, null)
  return {
    minSeatCount: Number(valueOf('min_seat_count')),
    baseSeatPrice: Number(valueOf('base_seat_price')),
    trialDays: Number(valueOf('trial_days')),
    agentCommissionRate: Number(valueOf('agent_commission_rate')),
    updatedAt,
  }
}

export async function loadPlatformSettings(): Promise<PlatformSettings> {
  const result = await callFunction<{ configs: ConfigRow[] }>('admin-ops', { action: 'settings' }, { role: 'platform' })
  return readSettings(result.configs)
}

export async function savePlatformSettings(input: PlatformSettings): Promise<PlatformSettings> {
  const result = await callFunction<{ configs: ConfigRow[] }>(
    'admin-ops',
    {
      action: 'save-settings',
      minSeatCount: input.minSeatCount,
      baseSeatPrice: input.baseSeatPrice,
      trialDays: input.trialDays,
      agentCommissionRate: input.agentCommissionRate,
    },
    { role: 'platform' },
  )
  return readSettings(result.configs)
}
