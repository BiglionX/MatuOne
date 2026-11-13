import type { TypingStats } from '../types'
import { normalizeTypingScore } from '../../supabase/functions/_shared/typingScore'

export { normalizeTypingScore }

const MIN_ELAPSED_MS = 1000

export interface TypingSession {
  index: number
  typed: string
  startedAt: number | null
  totalKeys: number
  correctKeys: number
  done: boolean
  stats: TypingStats | null
}

export type TypingAction = { kind: 'input'; next: string; now: number } | { kind: 'enter'; now: number }

export function createTypingSession(): TypingSession {
  return {
    index: 0,
    typed: '',
    startedAt: null,
    totalKeys: 0,
    correctKeys: 0,
    done: false,
    stats: null,
  }
}

/** 不足 1 秒按 1 秒计，避免除以 0。 */
export function elapsedForWpm(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < MIN_ELAPSED_MS) return MIN_ELAPSED_MS
  return elapsedMs
}

/** WPM = (正确字符数 / 5) / 耗时分钟。 */
export function calcWpm(correctChars: number, elapsedMs: number): number {
  if (correctChars <= 0) return 0
  const ms = elapsedForWpm(elapsedMs)
  return Math.round((correctChars * 120_000) / ms) / 10
}

/** 准确率 = (正确按键数 / 总按键数) * 100，四舍五入到整数，和页面上的百分数一致。 */
export function calcAccuracy(correctKeys: number, totalKeys: number): number {
  if (totalKeys <= 0 || correctKeys <= 0) return 0
  return Math.min(100, Math.round((correctKeys * 100) / totalKeys))
}

export function typingFeedback(accuracy: number): string {
  if (accuracy >= 90) return '太棒了，又快又准！'
  if (accuracy >= 60) return '打得不错，继续加油！'
  return '再仔细一点，肯定能打对！'
}

/**
 * 输入长度必须大于 0。
 * 回车可以结算当前词；否则要打到目标末位，且这一位和目标最后一个字符相同。
 */
export function shouldSettle(typed: string, target: string, reason: 'enter' | 'input'): boolean {
  if (typed.length === 0) return false
  if (reason === 'enter') return true
  if (target.length === 0 || typed.length < target.length) return false
  return typed[target.length - 1] === target[target.length - 1]
}

export function diffKeystrokes(prev: string, next: string, target: string): { totalKeys: number; correctKeys: number } {
  if (next.startsWith(prev)) {
    let totalKeys = 0
    let correctKeys = 0
    for (let pos = prev.length; pos < next.length; pos++) {
      totalKeys += 1
      if (pos < target.length && next[pos] === target[pos]) correctKeys += 1
    }
    return { totalKeys, correctKeys }
  }
  if (prev.startsWith(next)) return { totalKeys: prev.length - next.length, correctKeys: 0 }

  let shared = 0
  while (shared < prev.length && shared < next.length && prev[shared] === next[shared]) shared++
  let totalKeys = prev.length - shared
  let correctKeys = 0
  for (let pos = shared; pos < next.length; pos++) {
    totalKeys += 1
    if (pos < target.length && next[pos] === target[pos]) correctKeys += 1
  }
  return { totalKeys, correctKeys }
}

function buildStats(session: TypingSession, now: number): TypingStats {
  const elapsedRaw = session.startedAt === null ? 0 : Math.max(0, now - session.startedAt)
  const elapsedMs = elapsedForWpm(elapsedRaw)
  return {
    wpm: calcWpm(session.correctKeys, elapsedRaw),
    accuracy: calcAccuracy(session.correctKeys, session.totalKeys),
    totalChars: session.totalKeys,
    correctChars: session.correctKeys,
    elapsedMs,
  }
}

function settleWord(session: TypingSession, targets: string[], now: number): TypingSession {
  if (session.done || session.typed.length === 0 || session.totalKeys <= 0) return session
  if (session.index + 1 >= targets.length) {
    return { ...session, done: true, stats: buildStats(session, now) }
  }
  return { ...session, index: session.index + 1, typed: '' }
}

export function reduceTyping(session: TypingSession, targets: string[], action: TypingAction): TypingSession {
  if (session.done) return session
  const target = targets[session.index] ?? ''
  if (action.kind === 'enter') {
    if (!shouldSettle(session.typed, target, 'enter')) return session
    return settleWord(session, targets, action.now)
  }

  const delta = diffKeystrokes(session.typed, action.next, target)
  const typed: TypingSession = {
    ...session,
    typed: action.next,
    startedAt: session.startedAt === null && delta.totalKeys > 0 ? action.now : session.startedAt,
    totalKeys: session.totalKeys + delta.totalKeys,
    correctKeys: session.correctKeys + delta.correctKeys,
  }
  if (!shouldSettle(action.next, target, 'input')) return typed
  return settleWord(typed, targets, action.now)
}
