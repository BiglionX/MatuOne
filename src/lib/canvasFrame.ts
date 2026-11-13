import type { ChallengeParam, Level } from '@/types'
import { simulate } from '@/lib/python-sim'
import { applyParam } from '@/lib/runner'

export interface CanvasFrame {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function extremes(param: ChallengeParam): Array<string | number> {
  if (param.type === 'select') {
    return (param.options ?? []).map((option) => option.value).filter((value) => String(value) !== String(param.default))
  }
  const current = Number(param.default)
  const values: number[] = []
  if (param.min != null && param.min !== current) values.push(param.min)
  if (param.max != null && param.max !== current) values.push(param.max)
  return values
}

/**
 * 画布框按「这一关参数能画出的最大范围」锁死。
 * 只改边长时图形不再被自动缩放铺满，变大变小都看得见。
 */
export function frameForLevel(level: Level): CanvasFrame | null {
  if (level.preview_kind !== 'turtle') return null
  const base = level.teach_code_lines.join('\n')
  const samples = [base]
  for (const param of level.challenge_params) {
    for (const value of extremes(param)) {
      let code = base
      for (const item of level.challenge_params) {
        code = applyParam(code, item, item.name === param.name ? value : item.default)
      }
      samples.push(code)
    }
  }

  let minX = 0
  let minY = 0
  let maxX = 0
  let maxY = 0
  let seen = false
  for (const code of samples) {
    try {
      const art = simulate(code)
      seen = true
      minX = Math.min(minX, art.bounds.minX)
      minY = Math.min(minY, art.bounds.minY)
      maxX = Math.max(maxX, art.bounds.maxX)
      maxY = Math.max(maxY, art.bounds.maxY)
    } catch {
      continue
    }
  }
  if (!seen) return null
  const span = Math.max(maxX - minX, maxY - minY, 80)
  const pad = span * 0.08
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad }
}
