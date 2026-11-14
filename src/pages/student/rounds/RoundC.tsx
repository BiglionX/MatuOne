import { useEffect, useMemo, useState } from 'react'
import type { ChallengeParam, Level, RunResult, TypingStats } from '@/types'
import { applyParam, runCode } from '@/lib/runner'
import { frameForLevel } from '@/lib/canvasFrame'
import { addTypingRecord } from '@/api/learning'
import { normalizeTypingScore, typingFeedback } from '@/lib/typingStats'
import { RunPreview } from '@/components/RunPreview'
import { TypingTrainer } from '@/components/TypingTrainer'

interface Props {
  level: Level
  studentId: string
  targetResult: RunResult | null
  onComplete: () => void
  /** 试课沙盒：打字成绩只留在页面上，不写 typing_record。 */
  sandbox?: boolean
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
export function RoundC({ level, studentId: _studentId, targetResult, onComplete, sandbox = false }: Props) {
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
  const consoleMode = level.preview_kind === 'text' || level.challenge_params.length === 0
  const frame = useMemo(() => (consoleMode ? null : frameForLevel(level)), [consoleMode, level])

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

  const updateValue = (name: string, value: string | number) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setResult(null)
    setFlash(false)
  }

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

  const ranOk = !!result?.ok
  const typingDone = !!typingStats
  const typingUnlocked = changed && ranOk
  const readyToComplete = changed && ranOk && typingDone
  const checks = [
    { done: changed, label: '改一个参数' },
    { done: ranOk, label: '运行成功' },
    { done: typingDone, label: typingDone ? '打字练习' : '打字练习（未完成）' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="改一改">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-action text-sm font-bold text-white">
            1
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">改一改</h2>
            <p className="text-sm text-ink-soft">换一个值，结果会怎么变？先猜一猜，再运行。</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(320px,46%)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium text-ink-soft">{ranOk ? '改完的样子' : '还没改之前，它长这样'}</div>
            <div className="min-h-[340px] flex-1">
              {consoleMode ? (
                <ConsoleCompare
                  before={targetResult?.ok ? targetResult.text ?? '' : ''}
                  after={result?.ok ? result.text ?? '' : null}
                  flash={flash && ranOk}
                />
              ) : (
                <RunPreview result={result ?? targetResult} flash={flash && ranOk} frame={frame ?? undefined} />
              )}
            </div>
            {changed && !ranOk && (
              <p className="rounded-field bg-brand-soft px-4 py-3 text-brand-strong">
                参数改好了，点「再跑一次」看看有什么变化。
              </p>
            )}
            {changed && ranOk && (
              <p className="rounded-field bg-success-soft px-4 py-3 text-success">
                改一改，结果就跟着变——这就是你在控制代码。
              </p>
            )}
          </div>

          <div className="card p-6">
            <div className="space-y-5">
              {level.challenge_params.map((param) => (
                <div key={param.name}>
                  <label className="mb-2 block text-sm font-medium text-ink">{param.label}</label>
                  <ParamControl
                    param={param}
                    value={values[param.name]}
                    onChange={(v) => updateValue(param.name, v)}
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
        </div>
      </section>

      <section
        aria-label="打字巩固"
        className={`card p-6 transition ${typingUnlocked ? 'ring-2 ring-brand' : 'bg-canvas opacity-60'}`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
              typingUnlocked ? 'bg-brand-action' : 'bg-ink-soft'
            }`}
          >
            2
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">打字巩固</h2>
            <p className="text-sm text-ink-soft">
              {typingUnlocked ? '本节关键词，一个词一个词地打。' : '改好参数并运行成功后，这里才会打开。'}
            </p>
          </div>
        </div>

        {typingStats ? (
          <div className={`mt-4 rounded-field px-5 py-4 ${typingStats.accuracy >= 60 ? 'bg-success-soft' : 'bg-danger-soft'}`}>
            <p className={`font-medium ${typingStats.accuracy >= 60 ? 'text-success' : 'text-danger'}`}>
              {typingFeedback(typingStats.accuracy)}
            </p>
            <p className="mt-1 text-ink">
              速度 <span className="font-semibold">{typingStats.wpm.toFixed(1)} WPM</span> · 准确率{' '}
              <span className="font-semibold">{typingStats.accuracy.toFixed(0)}%</span>
            </p>
          </div>
        ) : typingUnlocked ? (
          <div className="mt-4">
            <TypingTrainer
              targets={level.keywords}
              hint="一个词一个词地打，不用赶"
              onComplete={(stats) => {
                setTypingStats(stats)
                if (sandbox) return
                const score = normalizeTypingScore(stats.wpm, stats.accuracy)
                if (!score) return
                void addTypingRecord({
                  practiceType: 'lesson_embedded',
                  wpm: score.wpm,
                  accuracy: score.accuracy,
                }).catch(() => undefined)
              }}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-soft">打字练习还锁着。</p>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-white px-6 py-5">
        <ul className="space-y-1.5 text-sm" aria-label="完成条件">
          {checks.map((item) => (
            <li key={item.label} className={item.done ? 'font-medium text-success' : 'text-ink-soft'}>
              {item.done ? '[✓]' : '[ ]'} {item.label}
            </li>
          ))}
        </ul>
        <button type="button" className="btn-primary px-8" disabled={!readyToComplete} onClick={onComplete}>
          完成这一关
        </button>
      </div>
    </div>
  )
}

/** 纯文字关卡：改之前和改之后的输出并排，不画海龟。 */
function ConsoleCompare({ before, after, flash }: { before: string; after: string | null; flash: boolean }) {
  const same = after != null && after === before
  return (
    <div
      className={`flex h-full flex-col gap-3 rounded-card border-2 bg-white p-4 ${
        flash ? 'flash-green border-success' : 'border-line'
      }`}
    >
      <div>
        <p className="text-xs text-ink-soft">改之前</p>
        <pre className="code-font mt-1 whitespace-pre-wrap text-ink">{before || '（没有输出）'}</pre>
      </div>
      <div className="border-t border-line pt-3">
        <p className="text-xs text-ink-soft">改之后</p>
        <pre className={`code-font mt-1 whitespace-pre-wrap ${same ? 'text-ink-soft' : 'text-ink'}`}>
          {after == null ? '还没运行' : after || '（没有输出）'}
        </pre>
      </div>
      {flash && <p className="text-sm font-semibold text-success">{same ? '输出和刚才一样' : '跑通了！输出变了'}</p>}
    </div>
  )
}
