import type { Level, MapEntry, PracticeType } from '@/types'
import type { CurriculumLevelKind } from '@/types/curriculum'
import type { ProgressModuleId } from '@/modules/types'
import type { ModuleLevelLesson } from '@/api/studentLevel'
import { ApiError } from '@/lib/apiError'
import { callFunction } from '@/lib/backend'
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
  bonusCompleted?: boolean
}

export interface LearningHome {
  orgName: string
  groupName: string
  heading: string
  stageLevel: number
  stageTitle: string
  stageSubtitle: string
  /** 机构已开通的模块（服务端从 session 解析，不信任前端） */
  enabledModules: ProgressModuleId[]
  /** 本模块（Python）是否已开通；false 时前端直接提示联系机构 */
  moduleEntitled: boolean
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

export async function loadLevel(levelId: string): Promise<{ level: Level; reviewChunk: string | null }> {
  const result = await callFunction<{
    level: Level
    reviewChunk?: string | null
    hints: { pattern: string; friendly_message: string }[]
  }>('student-learning', { action: 'level', levelId }, { role: 'student' })
  const level = result.level
  if (!level?.teach_code_lines?.length || !level.quiz) throw new ApiError(404, '没有找到这一关')
  rememberLevels([level])
  rememberHints(result.hints.map((row) => ({ pattern: row.pattern, friendlyMessage: row.friendly_message })))
  const reviewChunk = typeof result.reviewChunk === 'string' && result.reviewChunk.trim() ? result.reviewChunk : null
  return { level, reviewChunk }
}

export function loadModuleLevel(moduleId: ProgressModuleId, levelId: string): Promise<{ level: ModuleLevelLesson }> {
  return callFunction('student-learning', { action: 'level', moduleId, levelId }, { role: 'student' })
}

export function touchLevel(levelId: string): Promise<{ ok: true }> {
  return callFunction('student-learning', { action: 'touch', levelId }, { role: 'student' })
}

export function completeLevel(
  levelId: string,
  stars: 0 | 1 | 2 | 3,
  errorTaps: number,
  moduleId: ProgressModuleId = 'python',
): Promise<{ ok: true }> {
  return callFunction('student-learning', { action: 'complete', levelId, stars, errorTaps, moduleId }, { role: 'student' })
}

/** 巩固副本完成。学生身份由服务端会话决定，奖励文案也由课文决定。 */
export function claimBonus(levelId: string): Promise<{ ok: true; reward: string }> {
  return callFunction('student-learning', { action: 'bonus', levelId }, { role: 'student' })
}

export interface RecentKeywordItem {
  order: number
  keywords: string[]
  drillChunk: string | null
}

/** 最近学完的几关。学生身份由服务端会话决定，不读本地缓存的关卡序号。 */
export function getRecentKeywords(): Promise<RecentKeywordItem[]> {
  return callFunction<{ items: RecentKeywordItem[] }>('student-learning', { action: 'recent-keywords' }, { role: 'student' }).then(
    (result) => result.items ?? [],
  )
}

/** 四次组块打完。组块文本由服务端从课文读取，请求里不带。 */
export function recordDrill(levelId: string): Promise<{ ok: true }> {
  return callFunction('student-learning', { action: 'drill', levelId }, { role: 'student' })
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
