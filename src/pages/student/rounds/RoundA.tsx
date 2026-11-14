import { useEffect, useMemo, useRef, useState } from 'react'
import type { Level, RunResult, RunStep } from '@/types'
import { beginTrace, buildDemoCode, nextTraceStep, runCode, type PythonPhase } from '@/lib/runner'
import { getLineNotes } from '@/lib/lineNotes'
import { RunPreview } from '@/components/RunPreview'
import { RunButton } from '@/components/RunButton'

interface Props {
  level: Level
  targetResult: RunResult | null
  envPhase: PythonPhase
  onNext: () => void
}

function missedGuessHint(answer: string): string {
  const name = answer === '一个三角形' ? '三角形' : answer
  return `猜错了没关系，看看图形和你想的一样吗？其实这是${name}哦`
}

function stepResult(level: Level, step: RunStep): RunResult {
  if (level.preview_kind === 'text') {
    return { ok: true, output: { kind: 'text', text: step.text } }
  }
  return {
    ok: true,
    output: { kind: 'canvas', commands: step.commands, text: step.text },
  }
}

/** A 回合：先看效果、猜一猜，再运行给定代码验证。猜错也能跑通。 */
export function RoundA({ level, targetResult, envPhase, onNext }: Props) {
  const [choice, setChoice] = useState<number | null>(null)
  const [result, setResult] = useState<RunResult | null>(null)
  const [flash, setFlash] = useState(false)
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState<RunStep[]>([])
  const [stepIndex, setStepIndex] = useState(-1)
  const [stepTotal, setStepTotal] = useState(0)
  const [nextLine, setNextLine] = useState<number | null>(null)
  const [stepFrame, setStepFrame] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null)
  const [stepping, setStepping] = useState(false)
  const [stepError, setStepError] = useState('')
  const [stepNotice, setStepNotice] = useState('')
  const activeLineRef = useRef<HTMLDivElement>(null)
  const pulling = useRef(false)
  const progress = useRef({ index: -1, total: 0 })
  const capped = useRef(false)
  const gaveUp = useRef(false)

  const answered = choice !== null
  const correct = choice === level.quiz.answerIndex
  const source = useMemo(
    () => (level.unfolded_lines?.length ? level.unfolded_lines.join('\n') : buildDemoCode(level)),
    [level],
  )
  const sourceLines = source.split('\n')
  const notes = level.unfolded_lines?.length ? [] : getLineNotes(level)
  const step = stepping && stepIndex >= 0 ? steps[stepIndex] : null
  const steppedDone = stepTotal > 0 && stepIndex >= stepTotal - 1
  const passed = !!result?.ok || (stepping && steppedDone)
  const frame = stepping && stepFrame ? stepFrame : undefined

  const run = async () => {
    if (running) return
    setRunning(true)
    setStepping(false)
    setStepIndex(-1)
    const res = await runCode(source, level.level_id, setResult)
    setResult(res)
    setRunning(false)
    if (res.ok) {
      setFlash(true)
      window.setTimeout(() => setFlash(false), 1400)
    }
  }

  const giveUpStepping = async () => {
    gaveUp.current = true
    capped.current = false
    setStepping(false)
    setStepNotice('代码太长啦，我们直接看结果吧')
    await run()
  }

  const startStep = async () => {
    gaveUp.current = false
    capped.current = false
    setStepNotice('')
    setStepError('')
    setResult(null)
    setFlash(false)
    setSteps([])
    setStepIndex(-1)
    setStepTotal(0)
    setNextLine(null)
    setStepFrame(null)
    progress.current = { index: -1, total: 0 }
    setStepping(true)
    const traced = await beginTrace(source)
    if (gaveUp.current) return
    if (!traced.ok) {
      setStepping(false)
      setStepError(traced.message)
      return
    }
    if (traced.truncated) {
      capped.current = true
      return
    }
    if (!traced.total) {
      setStepping(false)
      setStepError('这段代码没有可以一步一步走的语句。')
      return
    }
    progress.current = { index: -1, total: traced.total }
    setStepTotal(traced.total)
    setNextLine(traced.nextLine)
    setStepFrame(traced.bounds)
  }

  const advance = async () => {
    if (pulling.current) return
    if (!capped.current && progress.current.total > 0 && progress.current.index >= progress.current.total - 1) return
    pulling.current = true
    try {
      if (capped.current) {
        await giveUpStepping()
        return
      }
      const pulled = await nextTraceStep()
      if (gaveUp.current) return
      if (!pulled.ok) {
        setStepError(pulled.message)
        return
      }
      if (pulled.truncated) {
        await giveUpStepping()
        return
      }
      if (!pulled.step) return
      progress.current = { index: pulled.index, total: pulled.total }
      setNextLine(pulled.nextLine)
      setStepTotal(pulled.total)
      setSteps((prev) => [...prev, pulled.step!])
      setStepIndex(pulled.index)
    } finally {
      pulling.current = false
    }
  }

  useEffect(() => {
    if (!stepping) return
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      const el = event.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      event.preventDefault()
      void advance()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [stepping, source])

  useEffect(() => {
    activeLineRef.current?.scrollIntoView({ block: 'nearest' })
  }, [stepIndex])

  const preview = step ? stepResult(level, step) : stepping ? null : (result ?? targetResult)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(320px,46%)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <div className="text-sm font-medium text-ink-soft">
          {stepping ? (step ? `第 ${stepIndex + 1} / ${stepTotal} 步` : '准备分步走') : result ? '运行后的样子' : '这一段代码跑出来是这样'}
        </div>
        <div className="min-h-[360px] flex-1">
          <RunPreview
            result={preview}
            flash={flash && !!result?.ok}
            frame={frame}
            cursor={step && !steppedDone ? step.cursor : undefined}
            blank={stepping && !step}
          />
        </div>
        {step && (
          <p className="rounded-field bg-brand-soft px-4 py-3 text-brand-strong" aria-live="polite">
            {step.note}
            {steppedDone ? ' · 全部走完了' : ' · 按空格走下一步'}
          </p>
        )}
        {passed && correct && (
          <p className="rounded-field bg-success-soft px-4 py-3 text-success">
            跑通了！和刚才看到的图案一样，代码就是这样指挥电脑的。
          </p>
        )}
        {passed && !correct && (
          <p className="rounded-field bg-warning-soft px-4 py-3 text-ink">
            {missedGuessHint(level.quiz.options[level.quiz.answerIndex] ?? '')}
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
            const state = !answered ? 'idle' : isAnswer ? 'right' : isChosen ? 'wrong' : 'idle'
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
                <span className="text-sm text-ink-soft">{state === 'right' ? '✓ 对' : state === 'wrong' ? '再想想' : ''}</span>
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
            <div className="max-h-64 space-y-1 overflow-auto pr-1">
              {sourceLines.map((line, i) => {
                const lineNo = i + 1
                const active = !!step && step.line === lineNo
                const upcoming = nextLine === lineNo && !active
                const failed = !stepping && !!result && !result.ok && !result.loading && result.line === lineNo
                return (
                  <div
                    key={`${i}-${line}`}
                    ref={active ? activeLineRef : undefined}
                    className={`rounded-md px-2 py-1 ${
                      failed
                        ? 'bg-danger-soft ring-1 ring-danger'
                        : active
                          ? 'bg-brand-soft ring-1 ring-brand'
                          : upcoming
                            ? 'border border-dashed border-brand/40'
                            : ''
                    }`}
                  >
                    <pre className={`code-font whitespace-pre text-sm ${active ? 'font-semibold text-brand-strong' : 'text-ink'}`}>
                      {line || ' '}
                    </pre>
                    {active && <p className="mt-0.5 text-sm leading-snug text-brand-strong">{step.note}</p>}
                    {!active && notes[i] && <p className="mt-0.5 text-sm leading-snug text-ink-soft">{notes[i]}</p>}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RunButton
              textLevel
              envPhase={envPhase}
              busy={running}
              disabled={!answered}
              idleLabel="运行看看"
              onRun={run}
            />
            <button type="button" className="btn-secondary" onClick={startStep} disabled={!answered}>
              {stepping ? '重新分步' : '分步执行'}
            </button>
            {stepping && (
              <button type="button" className="btn-secondary" onClick={advance} disabled={steppedDone}>
                {steppedDone ? '走完了' : '下一步'}
              </button>
            )}
            {!answered && <span className="text-sm text-ink-soft">先选一个答案，再运行验证</span>}
            {stepping && !steppedDone && <span className="text-sm text-ink-soft">按空格走下一步</span>}
            {passed && (
              <button type="button" className="btn-secondary" onClick={onNext}>
                开始抄代码
              </button>
            )}
          </div>
          {result && !result.ok && !result.loading && (
            <p className="mt-3 text-sm text-danger">
              {result.line > 0 ? `第 ${result.line} 行：${result.message}` : result.message}
            </p>
          )}
          {stepNotice && (
            <p className="mt-3 rounded-field bg-brand-soft px-4 py-3 text-sm text-brand-strong" role="status">
              {stepNotice}
            </p>
          )}
          {stepError && <p className="mt-3 text-sm text-danger">{stepError}</p>}
        </div>
      </div>
    </div>
  )
}
