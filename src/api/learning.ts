import type { Level, MapEntry, PracticeType } from '@/types'
import { callFunction } from '@/lib/backend'
import { rememberHints, rememberLevels } from '@/lib/levelCatalog'

export interface LearningHome {
  orgName: string
  groupName: string
  entries: MapEntry[]
  completedCount: number
  currentOrder: number
  typingSeries: { weekStart: string; label: string; wpm: number | null; accuracy: number | null }[]
  latestTyping: { wpm: number; accuracy: number } | null
}

export async function loadLearningHome(): Promise<LearningHome> {
  const result = await callFunction<
    LearningHome & { hints: { pattern: string; friendly_message: string }[] }
  >('student-learning', { action: 'map' }, { role: 'student' })
  rememberHints(result.hints.map((row) => ({ pattern: row.pattern, friendlyMessage: row.friendly_message })))
  return result
}

export async function loadLevel(levelId: string): Promise<Level> {
  const result = await callFunction<{ level: Level; hints: { pattern: string; friendly_message: string }[] }>(
    'student-learning',
    { action: 'level', levelId },
    { role: 'student' },
  )
  rememberLevels([result.level])
  rememberHints(result.hints.map((row) => ({ pattern: row.pattern, friendlyMessage: row.friendly_message })))
  return result.level
}

export function touchLevel(levelId: string): Promise<{ ok: true }> {
  return callFunction('student-learning', { action: 'touch', levelId }, { role: 'student' })
}

export function completeLevel(levelId: string, stars: 0 | 1 | 2 | 3, errorTaps: number): Promise<{ ok: true }> {
  return callFunction('student-learning', { action: 'complete', levelId, stars, errorTaps }, { role: 'student' })
}

export function addTypingRecord(input: { practiceType: PracticeType; wpm: number; accuracy: number }): Promise<{ ok: true }> {
  return callFunction('student-learning', { action: 'typing', ...input }, { role: 'student' })
}

export function loadTypingSeries(): Promise<{ weekStart: string; label: string; wpm: number | null; accuracy: number | null }[]> {
  return callFunction<{ series: { weekStart: string; label: string; wpm: number | null; accuracy: number | null }[] }>(
    'student-learning',
    { action: 'series' },
    { role: 'student' },
  ).then((result) => result.series)
}
