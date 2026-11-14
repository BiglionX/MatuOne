import type { BonusChallenge, BonusChallengeType } from '@/types'

const TYPES: BonusChallengeType[] = ['param_edit', 'code_fill', 'typing']

function isType(value: unknown): value is BonusChallengeType {
  return typeof value === 'string' && TYPES.includes(value as BonusChallengeType)
}

/** 字段写了但结构不对时，返回给导入校验的那一句。缺省不算错。 */
export function bonusChallengeError(value: unknown): string | null {
  if (value == null) return null
  if (!readBonusChallenge(value)) return 'bonus_challenge 需要 type、instruction、expected_output、bonus_reward；改参数还要 target_param_name 和 target_value，填空还要 prompt_line'
  return null
}

/** 课程 JSON 里的 bonus_challenge。缺省返回 undefined，不报错。 */
export function readBonusChallenge(value: unknown): BonusChallenge | undefined {
  if (value == null) return undefined
  if (!value || typeof value !== 'object') return undefined
  const row = value as Record<string, unknown>
  if (!isType(row.type)) return undefined
  if (typeof row.instruction !== 'string' || !row.instruction.trim()) return undefined
  if (typeof row.expected_output !== 'string' || !row.expected_output.trim()) return undefined
  if (typeof row.bonus_reward !== 'string' || !row.bonus_reward.trim()) return undefined
  const targetValue = row.target_value == null ? '' : String(row.target_value).trim()
  if ((row.type === 'param_edit' || row.type === 'code_fill') && !targetValue) return undefined
  if (row.type === 'param_edit' && (typeof row.target_param_name !== 'string' || !row.target_param_name.trim())) return undefined
  if (row.type === 'code_fill' && (typeof row.prompt_line !== 'string' || !row.prompt_line.trim())) return undefined
  return {
    type: row.type,
    instruction: row.instruction.trim(),
    target_param_name: typeof row.target_param_name === 'string' ? row.target_param_name.trim() : undefined,
    target_value: targetValue || undefined,
    prompt_line: typeof row.prompt_line === 'string' ? row.prompt_line.trim() : undefined,
    expected_output: row.expected_output.trim(),
    bonus_reward: row.bonus_reward.trim(),
  }
}
