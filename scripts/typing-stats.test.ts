import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeTypingScore } from '../supabase/functions/_shared/typingScore.ts'
import {
  calcAccuracy,
  calcWpm,
  createTypingSession,
  reduceTyping,
  typingFeedback,
  type TypingSession,
} from '../src/lib/typingStats.ts'

function typeTargets(targets: string[], stepMs: number, start = 10_000): TypingSession {
  let session = createTypingSession()
  let now = start
  for (const word of targets) {
    for (const ch of word) {
      now += stepMs
      session = reduceTyping(session, targets, { kind: 'input', next: session.typed + ch, now })
    }
  }
  return session
}

test('快速一次敲完目标词，WPM 和准确率都不是 0', () => {
  const started = createTypingSession()
  const done = reduceTyping(started, ['print'], { kind: 'input', next: 'print', now: 10_020 })
  assert.equal(done.done, true)
  assert.equal(done.stats?.accuracy, 100)
  assert.equal(done.stats?.wpm, 60)
  assert.equal(done.stats?.elapsedMs, 1000)
  assert.equal(typingFeedback(done.stats?.accuracy ?? 0), '太棒了，又快又准！')
})

test('C 回合关键词连续打完，耗时不足 1 秒也按 1 秒计', () => {
  const targets = ['print', 'print()', 'print("")']
  const done = typeTargets(targets, 1)
  assert.equal(done.done, true)
  assert.equal(done.stats?.correctChars, 21)
  assert.equal(done.stats?.accuracy, 100)
  assert.equal(done.stats?.wpm, 252)
  assert.equal(typingFeedback(done.stats?.accuracy ?? 0), '太棒了，又快又准！')
})

test('空输入按回车或点完成，不结算', () => {
  const session = reduceTyping(createTypingSession(), ['print'], { kind: 'enter', now: 5_000 })
  assert.equal(session.done, false)
  assert.equal(session.stats, null)
  assert.equal(session.totalKeys, 0)
})

test('最后一个字符不对，不自动结算；回车才结算', () => {
  let session = createTypingSession()
  let now = 2_000
  for (const ch of 'prinX') {
    now += 40
    session = reduceTyping(session, ['print'], { kind: 'input', next: session.typed + ch, now })
  }
  assert.equal(session.done, false)
  session = reduceTyping(session, ['print'], { kind: 'enter', now: now + 40 })
  assert.equal(session.done, true)
  assert.equal(session.stats?.accuracy, 80)
  assert.equal(typingFeedback(session.stats?.accuracy ?? 0), '打得不错，继续加油！')
})

test('准确率分档和退格都按按键计', () => {
  assert.equal(typingFeedback(59), '再仔细一点，肯定能打对！')
  assert.equal(typingFeedback(60), '打得不错，继续加油！')
  assert.equal(typingFeedback(89), '打得不错，继续加油！')
  assert.equal(typingFeedback(90), '太棒了，又快又准！')

  let session = createTypingSession()
  const target = 'print'
  const steps = ['p', 'px', 'p', 'pr', 'pri', 'prin', 'print']
  let now = 8_000
  for (const next of steps) {
    now += 50
    session = reduceTyping(session, [target], { kind: 'input', next, now })
  }
  assert.equal(session.done, true)
  assert.equal(session.stats?.correctChars, 5)
  assert.equal(session.stats?.totalChars, 7)
  assert.equal(session.stats?.accuracy, calcAccuracy(5, 7))
  assert.ok((session.stats?.wpm ?? 0) > 0)
})

test('末字打错但最后一位碰巧对上时，低准确率用对应文案', () => {
  let session = createTypingSession()
  let now = 4_000
  for (const ch of 'xxxtt') {
    now += 30
    session = reduceTyping(session, ['print'], { kind: 'input', next: session.typed + ch, now })
  }
  assert.equal(session.done, true)
  assert.equal(session.stats?.accuracy, 20)
  assert.equal(session.stats?.wpm, calcWpm(1, 120))
  assert.equal(typingFeedback(20), '再仔细一点，肯定能打对！')
})

test('数据库写入拒绝 0 和脏数据', () => {
  assert.deepEqual(normalizeTypingScore(60, 100), { wpm: 60, accuracy: 100 })
  assert.deepEqual(normalizeTypingScore(12.04, 79.6), { wpm: 12, accuracy: 80 })
  assert.equal(normalizeTypingScore(0, 100), null)
  assert.equal(normalizeTypingScore(12, 0), null)
  assert.equal(normalizeTypingScore(-1, 80), null)
  assert.equal(normalizeTypingScore(12, 101), null)
  assert.equal(normalizeTypingScore(Number.NaN, 80), null)
  assert.equal(normalizeTypingScore(Number.POSITIVE_INFINITY, 80), null)
  assert.equal(normalizeTypingScore('60' as unknown as number, 100), null)
})
