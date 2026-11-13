import { useEffect, useMemo, useState } from 'react'
import type { ChallengeParam, Level, RunResult, TypingStats } from '@/types'
import { applyParam, runCode } from '@/lib/runner'
import { addTypingRecord } from '@/api/learning'
import { RunPreview } from '@/components/RunPreview'
import { TypingTrainer } from '@/components/TypingTrainer'

interface Props {
  level: Level
  studentId: string
  targetResult: RunResult | null
  onComplete: () => void
}

function ParamControl({
  param,
  value,
  onChange,
}: {
  param: ChallengeParam
  value: string | number
  onChange: (v: string | number) => void
}) {
  if (param.type === 'select') {
    return (
      <div className="flex flex-wrap gap-2">
        {(param.options ?? []).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-field border px-4 py-2.5 transition ${
              String(value) === option.value
                ? 'border-brand bg-brand-soft font-medium text-brand-strong'
                : 'border-line bg-white text-ink hover:border-brand'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <input
        type="range"
        min={param.min ?? 0}
        max={param.max ?? 200}
        step={param.step ?? 1}
        value={Number(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-brand-soft accent-[var(--brand)]"
        aria-label={param.label}
      />
      <span className="w-16 rounded-field bg-canvas py-1.5 text-center font-semibold text-ink">{value}</span>
    </div>
  )
}

/** C 回合：改一改 → 再跑一次 → 本节关键词打字 → 完成 */
export function RoundC({ level, studentId, targetResult, onComplete }: Props) {
  const defaults = useMemo(() => {
    const init: Record<string, string | number> = {}
    for (const param of level.challenge_params) init[param.name] = param.default
    return init
  }, [level])

  const [values, setValues] = useState<Record<string, string | number>>(defaults)
  const [result, setResult] = useState<RunResult | null>(null)
  const [flash, setFlash] = useState(false)
  const [running, setRunning] = useState(false)
  const [typingStats, setTypingStats] = useState<TypingStats | null>(null)
  const [pulse, setPulse] = useState(0)

  const changed = level.challenge_params.some((p) => String(values[p.name]) !== String(p.default))

  const code = useMemo(() => {
    let text = level.teach_code_lines.join('\n')
    for (const param of level.challenge_params) {
      text = applyParam(text, param, values[param.name])
    }
    return text
  }, [level, values])

  /** 每次改值都重新触发一次高亮动画，让学生看到“代码哪里变了” */
  useEffect(() => {
    setPulse((n) => n + 1)
  }, [code])

  /** 逐行和原始代码比对，标出改动的那一小段 */
  const marks = useMemo(() => {
    const baseLines = level.teach_code_lines
    return code.split('\n').map((line, i) => {
      const base = baseLines[i] ?? ''
      if (line === base) return null
      let start = 0
      while (start < line.length && start < base.length && line[start] === base[start]) start++
      let end = line.length
      let baseEnd = base.length
      while (end > start && baseEnd > start && line[end - 1] === base[baseEnd - 1]) {
        end--
        baseEnd--
      }
      return end > start ? { start, end } : null
    })
  }, [code, level])

  const run = async () => {
    if (running) return
    setRunning(true)
    const res = await runCode(code, level.level_id)
    setResult(res)
    setRunning(false)
    if (res.ok) {
      setFlash(true)
      window.setTimeout(() => setFlash(false), 1400)
    }
  }

  const readyToComplete = changed && !!result?.ok

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(320px,46%)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <div className="text-sm font-medium text-ink-soft">{result?.ok ? '改完的样子' : '还没改之前，它长这样'}</div>
        <div className="min-h-[340px] flex-1">
          <RunPreview result={result ?? targetResult} flash={flash && !!result?.ok} />
        </div>
        {changed && !result?.ok && (
          <p className="rounded-field bg-brand-soft px-4 py-3 text-brand-strong">
            参数改好了，点「再跑一次」看看有什么变化。
          </p>
        )}
        {changed && result?.ok && (
          <p className="rounded-field bg-success-soft px-4 py-3 text-success">
            改一改，结果就跟着变——这就是你在控制代码。
          </p>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink">改一改</h2>
          <p className="mt-1 text-sm text-ink-soft">换一个值，结果会怎么变？先猜一猜，再运行。</p>

          <div className="mt-5 space-y-5">
            {level.challenge_params.map((param) => (
              <div key={param.name}>
                <label className="mb-2 block text-sm font-medium text-ink">{param.label}</label>
                <ParamControl
                  param={param}
                  value={values[param.name]}
                  onChange={(v) => setValues((prev) => ({ ...prev, [param.name]: v }))}
                />
                {param.hint && <p className="mt-2 text-xs text-ink-soft">{param.hint}</p>}
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-card border border-line bg-code-bg px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-xs text-ink-soft">
              <span>改后的代码</span>
              <span>{changed ? '变了的地方会闪一下' : '改上面的值，代码会跟着变'}</span>
            </div>
            <pre className="code-font overflow-x-auto text-ink">
              {code.split('\n').map((line, i) => {
                const mark = marks[i]
                return (
                  <div key={`${pulse}-${i}`} className="whitespace-pre">
                    {mark ? (
                      <>
                        {line.slice(0, mark.start)}
                        <span className="code-flash">{line.slice(mark.start, mark.end)}</span>
                        {line.slice(mark.end)}
                      </>
                    ) : (
                      line || ' '
                    )}
                  </div>
                )
              })}
            </pre>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary px-8" onClick={run} disabled={running}>
              {running ? '运行中…' : '再跑一次'}
            </button>
            {!changed && <span className="text-sm text-ink-soft">先把上面的值改一改</span>}
          </div>

          {result && !result.ok && result.error && (
            <div className="mt-4 rounded-card border border-danger/40 bg-danger-soft p-4">
              <p className="font-semibold text-danger">第 {result.error.line} 行出了点小问题</p>
              <p className="mt-1 text-ink">{result.error.message}</p>
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">打字巩固</h2>
            <span className="text-sm text-ink-soft">本节关键词</span>
          </div>

          {typingStats ? (
            <div className="mt-4 rounded-field bg-success-soft px-5 py-4">
              <p className="font-medium text-success">打完了，这次打得不错。</p>
              <p className="mt-1 text-ink">
                速度 <span className="font-semibold">{typingStats.wpm.toFixed(1)} WPM</span> · 准确率{' '}
                <span className="font-semibold">{typingStats.accuracy.toFixed(0)}%</span>
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <TypingTrainer
                targets={level.keywords}
                hint="一个词一个词地打，不用赶"
                onComplete={(stats) => {
                  setTypingStats(stats)
                  void addTypingRecord({
                    practiceType: 'lesson_embedded',
                    wpm: stats.wpm,
                    accuracy: stats.accuracy,
                  })
                }}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary px-8"
            disabled={!readyToComplete}
            onClick={onComplete}
            title={readyToComplete ? '' : '先完成改动挑战并运行成功'}
          >
            完成这一关
          </button>
          {!readyToComplete && (
            <span className="text-sm text-ink-soft">
              {changed ? '再跑一次，成功了就能完成' : '完成条件：改一个参数 + 运行成功'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
