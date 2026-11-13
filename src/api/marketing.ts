import type { LeadInput, PriceExample, PriceTier } from '@/types/ops'
import { callFunction } from '@/lib/backend'

export async function loadPricing(seats = 40): Promise<{ tiers: PriceTier[]; example: PriceExample | null }> {
  const result = await callFunction<{
    tiers: { min_seats: number; max_seats: number | null; unit_price: number }[]
    example: { seats: number; unitPrice: number; amount: number; plan: string } | null
  }>('public-site', { action: 'pricing', seats })
  return {
    tiers: result.tiers.map((tier) => ({ minSeats: tier.min_seats, maxSeats: tier.max_seats, unitPrice: tier.unit_price })),
    example: result.example,
  }
}

export function submitLead(input: LeadInput): Promise<{ id: string }> {
  return callFunction('public-site', { action: 'apply', ...input })
}
