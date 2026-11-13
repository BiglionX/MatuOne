import type { ErrorMapping } from '@/types'

/**
 * 先用 match 正则对诊断原文，再按 pattern 从后往前找。
 * 关卡后加的专用提示因此盖过前面的通用句。
 */
export function resolveFriendly(
  mappings: ErrorMapping[],
  pattern: string,
  diagnostic: string,
): string | undefined {
  const haystack = `${diagnostic}\n${pattern}`
  for (const item of mappings) {
    if (!item.match) continue
    try {
      if (new RegExp(item.match).test(haystack)) return item.friendlyMessage
    } catch {
      continue
    }
  }
  for (let i = mappings.length - 1; i >= 0; i--) {
    if (mappings[i].pattern === pattern) return mappings[i].friendlyMessage
  }
  return undefined
}
