import { useEffect, useState } from 'react'
import type { Level, RunResult } from '@/types'
import { runCode, type PythonPhase } from '@/lib/runner'
import { RunPreview } from '@/components/RunPreview'
import { RunButton } from '@/components/RunButton'

interface Props {
  level: Level
  envPhase: PythonPhase
  onNext: () => void
}

/** 第 6 关：先看 8 行重复，一键折叠成 for，不用从零把循环敲出来。 */
export function LoopFold({ level, envPhase, onNext }: Props) {
  const unfolded = level.unfolded_lines ?? []
  const [phase, setPhase] = useState<'open' | 'folding' | 'done'>('open')
  const [result, setResult] = useState<RunResult | null>(null)
  const [flash, setFlash] = useState(false)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (phase !== 'folding') return
    const timer = window.setTimeout(() => setPhase('done'), 650)
    return () => window.clearTimeout(timer)
  }, [phase])

  const folded = phase !== 'open'
  const code = level.teach_code_lines.join('\n')

  const run = async () => {
    if (running || phase !== 'done') return
    setRunning(true)
    const res = await runCode(code, level.level_id, setResult)
    setResult(res)
    setRunning(false)
    if (res.ok) {
      setFlash(true)
      window.setTimeout(() => setFlash(false), 1400)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,40%)_minmax(0,1fr)]">
      <div className="flex min-h-[420px] flex-col gap-4">
        <div className="text-sm font-medium text-ink-soft">
          {result?.ok ? '折叠之后，正方形还在' : '先看重复的 8 行画出的正方形'}
        </div>
        <div className="min-h-[300px] flex-1">
          <RunPreview result={result} flash={flash && !!result?.ok} />
        </div>
      </div>

      <div className="card flex flex-col p-6">
        <span className="chip w-fit bg-brand-soft text-brand-strong">收一收</span>
        <h2 className="mt-3 text-xl font-semibold text-ink">同样的正方形，不用写 8 行</h2>
        <p className="mt-1 text-sm text-ink-soft">这 8 行是「走一段、转 90 度」写了 4 遍。点一下，看它们收成循环。</p>

        <div className="relative mt-5 overflow-hidden rounded-card border border-line bg-code-bg px-4 py-4">
          <div
            className={`space-y-1 transition-all duration-500 ${
              folded ? 'pointer-events-none max-h-0 -translate-y-2 opacity-0' : 'max-h-96 opacity-100'
            }`}
          >
            {unfolded.map((line, index) => (
              <pre
                key={`open-${index}`}
                className={`code-font text-sm ${index >= 2 ? 'text-ink-soft' : 'text-ink'}`}
              >
                {line}
              </pre>
            ))}
          </div>

          <div
            className={`space-y-1 overflow-hidden transition-all duration-500 ${
              folded ? 'max-h-48 translate-y-0 opacity-100' : 'invisible h-0'
            }`}
          >
            {level.teach_code_lines.map((line, index) => {
              const failed = !!result && !result.ok && !result.loading && result.line === index + 1
              return (
                <pre
                  key={`fold-${index}`}
                  className={`code-font rounded-md px-1 text-sm text-ink ${failed ? 'bg-danger-soft ring-1 ring-danger' : ''}`}
                >
                  {line || ' '}
                </pre>
              )
            })}
          </div>
        </div>

        {phase === 'done' && (
          <p className="mt-4 rounded-field bg-brand-soft px-4 py-3 text-brand-strong">
            上面两行写 4 遍，就是 <span className="code-font">for i in range(4):</span>。循环替你把重复的事做完。
          </p>
        )}

        {result?.ok && (
          <div className="mt-4 flex items-center justify-between rounded-card border border-success bg-success-soft px-5 py-4">
            <span className="font-semibold text-success">跑通了！图形没变，代码短了。</span>
            <button type="button" className="btn-primary" onClick={onNext}>
              下一回合
            </button>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {phase === 'open' && (
            <button type="button" className="btn-primary px-8" onClick={() => setPhase('folding')}>
              一键折叠
            </button>
          )}
          {phase === 'folding' && <span className="text-sm text-ink-soft">正在收成循环…</span>}
          {phase === 'done' && (
            <RunButton
              textLevel
              envPhase={envPhase}
              busy={running}
              idleLabel="运行折叠后的代码"
              onRun={run}
            />
          )}
        </div>
      </div>
    </div>
  )
}
