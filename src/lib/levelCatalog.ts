import type { Level } from '@/types'
import { getLevelById } from '@/mock/levels'

let extra: Level[] = []
const hints = new Map<string, string>()

export function rememberLevels(levels: Level[]): void {
  const ids = new Set(levels.map((level) => level.level_id))
  extra = [...extra.filter((level) => !ids.has(level.level_id)), ...levels]
}

export function rememberHints(rows: { pattern: string; friendlyMessage: string }[]): void {
  for (const row of rows) hints.set(row.pattern, row.friendlyMessage)
}

/** 页面先写入已发布关卡。冒烟测试没有目录时仍用夹具。 */
export function resolveLevel(id: string): Level | undefined {
  return extra.find((level) => level.level_id === id) ?? getLevelById(id)
}

export function hintFor(pattern: string): string | undefined {
  return hints.get(pattern)
}
