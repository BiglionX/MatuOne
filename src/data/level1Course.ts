import type { BonusChallenge, ChallengeParam, ErrorMapping, Level, LevelQuiz } from '../types'
import unit1 from '../../content/courses/level1/L1_U01.json'
import unit2 from '../../content/courses/level1/L1_U02.json'
import unit3 from '../../content/courses/level1/L1_U03.json'
import unit4 from '../../content/courses/level1/L1_U04.json'
import unit5 from '../../content/courses/level1/L1_U05.json'
import unit6 from '../../content/courses/level1/L1_U06.json'

interface CourseLevelJson {
  level_id: string
  order: number
  title: string
  goal: string
  demo_code: string
  expected_output: string
  preview_kind?: string
  teach_code_lines: string[]
  line_notes?: string[]
  keywords: string[]
  drill_chunk?: string
  challenge_params?: ChallengeParam[]
  error_mappings?: ErrorMapping[]
  quiz?: LevelQuiz
  bonus_challenge?: BonusChallenge
  estimated_minutes: number
  is_review?: boolean
}

interface CoursePackJson {
  levels: CourseLevelJson[]
}

const packs = [unit1, unit2, unit3, unit4, unit5, unit6] as CoursePackJson[]

function toLevel(raw: CourseLevelJson): Level {
  return {
    level_id: raw.level_id,
    order: raw.order,
    title: raw.title,
    goal: raw.goal,
    demo_code: raw.demo_code,
    expected_output: raw.expected_output,
    preview_kind: raw.preview_kind === 'text' ? 'text' : 'turtle',
    level_type: 'normal',
    teach_code_lines: raw.teach_code_lines,
    line_notes: raw.line_notes,
    keywords: raw.keywords,
    drill_chunk: raw.drill_chunk,
    challenge_params: raw.challenge_params ?? [],
    error_mappings: raw.error_mappings ?? [],
    quiz: raw.quiz ?? {
      question: '这一关会画出什么？',
      options: ['一个图形', '一行文字', '什么都没有'],
      answerIndex: 0,
      explain: '运行一次就能看到结果。',
    },
    bonus_challenge: raw.bonus_challenge,
    estimated_minutes: raw.estimated_minutes,
    is_review: raw.is_review,
    is_placeholder: false,
  }
}

const byOrder = new Map<number, Level>()
for (const pack of packs) {
  for (const raw of pack.levels) byOrder.set(raw.order, toLevel(raw))
}

/** Level 1 第 1–120 关。返回副本，避免页面改到这份课文。 */
export function level1Lesson(order: number): Level | undefined {
  const found = byOrder.get(order)
  return found ? { ...found, teach_code_lines: [...found.teach_code_lines], keywords: [...found.keywords] } : undefined
}
