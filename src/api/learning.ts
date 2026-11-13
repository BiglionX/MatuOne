import type { Level, MapEntry, PracticeType } from '@/types'
import type { CurriculumLevelKind } from '@/types/curriculum'
import { ApiError } from '@/lib/apiError'
import { callFunction } from '@/lib/backend'
import { buildPlayableLevel } from '@/lib/lessonMaterial'
import { rememberHints, rememberLevels } from '@/lib/levelCatalog'
import { normalizeTypingScore } from '@/lib/typingStats'

export interface UnitSummary {
  unitId: string
  title: string
  sortOrder: number
  stageLevel: number
  completedCount: number
  total: number
  state: 'past' | 'current' | 'future'
}

export interface UnitLevel {
  levelId: string
  order: number
  title: string
  goal: string
  levelType: CurriculumLevelKind
  milestoneBadge: string | null
  placeholder: boolean
  is_placeholder: boolean
  completed: boolean
  unlocked: boolean
  current: boolean
  stars: 0 | 1 | 2 | 3
}

export interface LearningHome {
  orgName: string
  groupName: string
  heading: string
  stageLevel: number
  stageTitle: string
  stageSubtitle: string
  units: UnitSummary[]
  currentUnitId: string
  /** 只含当前单元，地图展开其他单元时改走 getLevelsByUnit。 */
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

export async function getLevelsByUnit(unitId: string): Promise<{ unitId: string; title: string; levels: UnitLevel[] }> {
  return callFunction('student-learning', { action: 'unit', unitId }, { role: 'student' })
}

export async function loadLevel(levelId: string): Promise<Level> {
  try {
    const result = await callFunction<{ level: Level; hints: { pattern: string; friendly_message: string }[] }>(
      'student-learning',
      { action: 'level', levelId },
      { role: 'student' },
    )
    const level = result.level?.quiz ? result.level : buildPlayableLevel(levelId)
    if (!level) throw new ApiError(404, '没有找到这一关')
    rememberLevels([level])
    rememberHints(result.hints.map((row) => ({ pattern: row.pattern, friendlyMessage: row.friendly_message })))
    return level
  } catch (error) {
    const level = buildPlayableLevel(levelId)
    if (!level) throw error
    rememberLevels([level])
    return level
  }
}

export function touchLevel(levelId: string): Promise<{ ok: true }> {
  return callFunction('student-learning', { action: 'touch', levelId }, { role: 'student' })
}

export function completeLevel(levelId: string, stars: 0 | 1 | 2 | 3, errorTaps: number): Promise<{ ok: true }> {
  return callFunction('student-learning', { action: 'complete', levelId, stars, errorTaps }, { role: 'student' })
}

export function addTypingRecord(input: { practiceType: PracticeType; wpm: number; accuracy: number }): Promise<{ ok: true }> {
  const score = normalizeTypingScore(input.wpm, input.accuracy)
  if (!score) return Promise.reject(new ApiError(400, '打字记录无效'))
  return callFunction('student-learning', { action: 'typing', practiceType: input.practiceType, ...score }, { role: 'student' })
}

export function loadTypingSeries(): Promise<{ weekStart: string; label: string; wpm: number | null; accuracy: number | null }[]> {
  return callFunction<{ series: { weekStart: string; label: string; wpm: number | null; accuracy: number | null }[] }>(
    'student-learning',
    { action: 'series' },
    { role: 'student' },
  ).then((result) => result.series)
}
