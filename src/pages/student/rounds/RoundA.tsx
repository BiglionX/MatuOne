import { useState } from 'react'
import type { Level, RunResult } from '@/types'
import { buildDemoCode, runCode } from '@/lib/runner'
import { getLineNotes } from '@/lib/lineNotes'
import { RunPreview } from '@/components/RunPreview'

interface Props {
  level: Level
  targetResult: RunResult | null
  onNext: () => void
}

/** A 回合：先看效果、猜一猜，再运行给定代码验证 */
export function RoundA({ level, targetResult, onNext }: Props) {
  const [choice, setChoice] = useState<number | null>(null)
  const [result, setResult] = useState<RunResult | null>(null)
  const [flash, setFlash] = useState(false)
  const [running, setRunning] = useState(false)

  const answered = choice !== null
  const correct = choice === level.quiz.answerIndex
  const notes = getLineNotes(level)

  const run = async () => {
    if (running) return
    setRunning(true)
    const res = await runCode(buildDemoCode(level), level.level_id)
    setResult(res)
    setRunning(false)
    if (res.ok) {
      setFlash(true)
      window.setTimeout(() => setFlash(false), 1400)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(320px,46%)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <div className="text-sm font-medium text-ink-soft">{result ? '运行后的样子' : '这一段代码跑出来是这样'}</div>
        <div className="min-h-[360px] flex-1">
          <RunPreview result={result ?? targetResult} flash={flash && !!result?.ok} />
        </div>
        {result?.ok && (
          <p className="rounded-field bg-success-soft px-4 py-3 text-success">
            跑通了！和刚才看到的图案一样，代码就是这样指挥电脑的。
          </p>
        )}
      </div>

      <div className="card flex flex-col p-7">
        <span className="chip w-fit bg-brand-soft text-brand-strong">猜一猜</span>
        <h2 className="mt-4 text-2xl font-semibold text-ink">{level.quiz.question}</h2>

        <div className="mt-6 space-y-3">
          {level.quiz.options.map((option, i) => {
            const isChosen = choice === i
            const isAnswer = level.quiz.answerIndex === i
            const state = !answered
              ? 'idle'
              : isAnswer
                ? 'right'
                : isChosen
                  ? 'wrong'
                  : 'idle'
            return (
              <button
                key={option}
                type="button"
                disabled={answered}
                onClick={() => setChoice(i)}
                className={`flex w-full items-center justify-between rounded-field border px-5 py-4 text-left transition ${
                  state === 'right'
                    ? 'border-success bg-success-soft text-ink'
                    : state === 'wrong'
                      ? 'border-danger bg-danger-soft text-ink'
                      : 'border-line bg-white hover:border-brand'
                } ${answered ? 'cursor-default' : ''}`}
              >
                <span>{option}</span>
                <span className="text-sm text-ink-soft">
                  {state === 'right' ? '✓ 对' : state === 'wrong' ? '再想想' : ''}
                </span>
              </button>
            )
          })}
        </div>

        {answered && (
          <div className="mt-6 rounded-field bg-canvas px-5 py-4">
            <p className="font-medium text-ink">{correct ? '猜对了！' : '没关系，运行一次就明白了。'}</p>
            <p className="mt-1 text-ink-soft">{level.quiz.explain}</p>
          </div>
        )}

        <div className="mt-auto pt-8">
          <div className="mb-4 rounded-field border border-line bg-code-bg px-4 py-3">
            <p className="mb-2 text-xs text-ink-soft">要运行的代码 · 每一行在做什么</p>
            <div className="max-h-64 space-y-2.5 overflow-auto pr-1">
              {level.teach_code_lines.map((line, i) => (
                <div key={`${i}-${line}`}>
                  <pre className="code-font text-sm text-ink">{line || ' '}</pre>
                  {notes[i] && <p className="mt-0.5 text-sm leading-snug text-ink-soft">{notes[i]}</p>}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary px-8" onClick={run} disabled={running || !answered}>
              {running ? '运行中…' : '运行看看'}
            </button>
            {!answered && <span className="text-sm text-ink-soft">先选一个答案，再运行验证</span>}
            {result?.ok && (
              <button type="button" className="btn-secondary" onClick={onNext}>
                开始抄代码
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
