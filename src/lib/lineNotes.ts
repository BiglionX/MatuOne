import type { Level } from '@/types'

/** 逐行说明只来自关卡自己的 line_notes。 */
export function getLineNotes(level: Level): string[] {
  if (level.line_notes && level.line_notes.length >= level.teach_code_lines.length) return level.line_notes
  return []
}
