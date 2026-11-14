import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import type { TypingStats } from '@/types'
import { addTypingRecord, getRecentKeywords, loadTypingSeries } from '@/api/learning'
import { normalizeTypingScore, typingFeedback } from '@/lib/typingStats'
import { getCurrentStudent } from '@/api/studentAuth'
import { TypingTrainer } from '@/components/TypingTrainer'
import { WpmChart } from '@/components/WpmChart'
import { BrandMark } from '@/components/BrandMark'

type Mode = 'baseline_keys' | 'keywords'

const PRACTICE: Record<Mode, { label: string; sub: string; hint: string; targets: string[] }> = {
  baseline_keys: {
    label: '基准键位',
    sub: '左手 a s d f，右手 j k l ;',
    hint: '手指放回原位再开始',
    targets: ['asdf', 'jkl;', 'asdf jkl;', 'ffjj', 'fjfj'],
  },
  keywords: {
    label: '编程关键词',
    sub: '最近学过的那几串',
    hint: '一个词一个词打，别抢',
    targets: [],
  },
}

/** 独立打字热身：1.0 只做基准键位与编程关键词两档 */
export function TypingWarmup() {
  const student = getCurrentStudent()
  const [mode, setMode] = useState<Mode>('baseline_keys')
  const [stats, setStats] = useState<TypingStats | null>(null)
  const [roundKey, setRoundKey] = useState(0)
  const [series, setSeries] = useState<{ label: string; wpm: number | null; accuracy: number | null }[]>([])
  const [keywordTargets, setKeywordTargets] = useState<string[] | null>(null)

  useEffect(() => {
    if (!student) return
    loadTypingSeries().then(setSeries).catch(() => setSeries([]))
  }, [student?.id, stats])

  useEffect(() => {
    if (!student) return
    let alive = true
    getRecentKeywords()
      .then((items) => {
        if (!alive) return
        const words: string[] = []
        for (const item of items) {
          const extra = item.drillChunk ? [item.drillChunk] : []
          for (const word of [...item.keywords, ...extra]) {
            if (word && !words.includes(word)) words.push(word)
          }
        }
        setKeywordTargets(words)
      })
      .catch(() => {
        if (alive) setKeywordTargets([])
      })
    return () => {
      alive = false
    }
  }, [student?.id])

  if (!student) return <Navigate to="/student/login" replace />

  const practice = PRACTICE[mode]
  const targets = mode === 'keywords' ? (keywordTargets ?? []) : practice.targets
  const keywordsReady = mode !== 'keywords' || keywordTargets !== null

  return (
    <div className="student-shell min-h-screen min-w-[1024px] bg-canvas pb-16">
      <div className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-8 py-4">
          <Link to="/student" className="btn-ghost px-2">
            ←
          </Link>
          <BrandMark size={32} />
          <div>
            <h1 className="text-xl font-bold text-ink">打字热身</h1>
            <p className="text-sm text-ink-soft">每天 5 分钟，手指记住位置就好</p>
          </div>
          <div className="ml-auto flex gap-2">
            {(Object.keys(PRACTICE) as Mode[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key)
                  setStats(null)
                  setRoundKey((n) => n + 1)
                }}
                className={`rounded-field px-4 py-2.5 text-sm font-medium transition ${
                  mode === key ? 'bg-brand text-white' : 'bg-canvas text-ink-soft hover:text-brand-strong'
                }`}
              >
                {PRACTICE[key].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-8 pt-8">
        <div className="card p-7">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-ink">{practice.label}</h2>
            <span className="text-sm text-ink-soft">{practice.sub}</span>
          </div>

          {mode === 'keywords' && !keywordsReady ? null : mode === 'keywords' && targets.length === 0 ? (
            <p className="mt-6 text-ink-soft">先去上课，这里会留下最近打过的那几串。</p>
          ) : stats ? (
            <div className={`mt-6 rounded-card px-6 py-8 text-center ${stats.accuracy >= 60 ? 'bg-success-soft' : 'bg-danger-soft'}`}>
              <p className={`text-lg font-semibold ${stats.accuracy >= 60 ? 'text-success' : 'text-danger'}`}>
                {typingFeedback(stats.accuracy)}
              </p>
              <div className="mt-4 flex justify-center gap-10">
                <div>
                  <div className="text-3xl font-bold text-ink">{stats.wpm.toFixed(1)}</div>
                  <div className="mt-1 text-sm text-ink-soft">WPM</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-ink">{stats.accuracy.toFixed(0)}%</div>
                  <div className="mt-1 text-sm text-ink-soft">准确率</div>
                </div>
              </div>
              <button
                type="button"
                className="btn-primary mt-7 px-8"
                onClick={() => {
                  setStats(null)
                  setRoundKey((n) => n + 1)
                }}
              >
                再来一组
              </button>
            </div>
          ) : (
            <div className="mt-6" key={`${mode}-${roundKey}`}>
              <TypingTrainer
                targets={targets}
                hint={practice.hint}
                onComplete={(result) => {
                  setStats(result)
                  const score = normalizeTypingScore(result.wpm, result.accuracy)
                  if (!score) return
                  void addTypingRecord({
                    practiceType: mode,
                    wpm: score.wpm,
                    accuracy: score.accuracy,
                  }).catch(() => undefined)
                }}
              />
            </div>
          )}
        </div>

        <div className="card mt-6 p-6">
          <h2 className="text-lg font-semibold text-ink">最近四周</h2>
          <p className="mt-1 text-sm text-ink-soft">只和自己比，不用看别人。</p>
          <div className="mt-4">
            <WpmChart series={series} />
          </div>
        </div>
      </div>
    </div>
  )
}
