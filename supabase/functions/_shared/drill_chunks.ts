// @ts-expect-error 边缘函数要带 .ts 后缀，应用这边的 tsconfig 不允许。
import { LEVEL1_DRILLS } from './level1Drills.ts'

/** 1–20 关的旧组块。Level 1 新课文优先用 level1Drills，这里只作更早课文的兜底。 */
const DRILL: Record<number, string> = {
  1: 'print("',
  2: 't.forward(',
  3: 't.forward(',
  4: 't.forward(',
  5: 't.right(',
  6: 'for i in range(',
  7: 'for i in range(',
  8: 'if',
  9: 'for i in range(',
  10: 'step = step +',
  11: 'length = length +',
  12: 'for i in range(',
  13: 'print("',
  14: 't.forward(',
  15: 'for i in range(',
  16: 'for i in range(',
  17: 'print("',
  18: 't.forward(',
  19: 't.forward(',
  20: 'for i in range(',
}

export function drillForOrder(order: number): string | undefined {
  return LEVEL1_DRILLS[order] ?? DRILL[order]
}

/** 课文 body 上的 drill_chunk。空着或不是一行短字符串时返回 null。 */
export function readStoredDrill(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const value = (body as { drill_chunk?: unknown }).drill_chunk
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text || text.length > 40 || /[\r\n]/.test(value)) return null
  return text
}

/** 课文里写了就用课文，没写才用静态表。这一关没有就返回 null，不拿别的关来顶。 */
export function drillForLevel(body: unknown, order: number): string | null {
  return readStoredDrill(body) ?? drillForOrder(order) ?? null
}

/**
 * 只有当前关自己有组块时，才复习紧挨着的上一关。
 * 当前关没有组块，或者上一关也没有，都返回 null。
 */
export function reviewChunkOf(currentDrill: string | null, order: number, previousBody: unknown): string | null {
  if (!currentDrill || !Number.isInteger(order) || order <= 1) return null
  return readStoredDrill(previousBody) ?? drillForOrder(order - 1) ?? null
}
