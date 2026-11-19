import { useEffect, useRef, useState } from 'react'
import type { Level, RunResult } from '@/types'
import { buildDemoCode, runCode, type PythonPhase } from '@/lib/runner'
import { RunButton } from '@/components/RunButton'
import { checkTypedLine } from '@/lib/lineCheck'
import { getLineNotes } from '@/lib/lineNotes'
import { RunPreview } from '@/components/RunPreview'
import { useToast } from '@/components/Toast'
import { FormError } from '@/components/FormError'

interface Props {
  level: Level
  envPhase: PythonPhase
  onNext: () => void
  onErrorTap: () => void
}

/** B 回合：逐行抄代码 + 逐行校验 + 防粘贴 */
export function RoundB({ level, envPhase, onNext, onErrorTap }: Props) {
  const lines = level.teach_code_lines
  const [locked, setLocked] = useState(0)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showStandard, setShowStandard] = useState(false)
  const [showFullRef, setShowFullRef] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [flash, setFlash] = useState(false)
  const [running, setRunning] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const errorTimes = useRef<Record<number, number>>({})
  const standardTimer = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { show: toast, toast: toastNode } = useToast()

  const current = locked < lines.length ? lines[locked] : null
  const currentNote = current ? getLineNotes(level)[locked] : undefined
  const indentOf = (line: string) => (line.match(/^[ \t]*/) ?? [''])[0]
  const done = locked >= lines.length

  // 换行时把缩进预先填好，学生只需要打代码本身
  useEffect(() => {
    if (!current) return
    setInput(indentOf(current))
    setError(null)
    setShowStandard(false)
    window.setTimeout(() => inputRef.current?.focus(), 20)
  }, [locked, current])

  useEffect(() => {
    return () => {
      if (standardTimer.current) window.clearTimeout(standardTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!result || result.ok || result.loading || result.line < 1) return
    document.getElementById(`code-line-${result.line}`)?.scrollIntoView({ block: 'nearest' })
  }, [result])

  const noteError = () => {
    onErrorTap()
    const line = locked
    errorTimes.current[line] = (errorTimes.current[line] ?? 0) + 1
    if (errorTimes.current[line] >= 2) {
      setShowStandard(true)
      if (standardTimer.current) window.clearTimeout(standardTimer.current)
      standardTimer.current = window.setTimeout(() => setShowStandard(false), 3000)
    }
  }

  const validate = () => {
    if (!current) return
    const check = checkTypedLine(input, current, level.error_mappings)
    if (check.ok) {
      setError(null)
      setInput('')
      setLocked((n) => n + 1)
      return
    }
    setError(check.message)
    noteError()
  }

  const run = async () => {
    if (running) return
    const indent = current ? indentOf(current) : ''
    const hasDraft = !!current && input !== indent && input.trim().length > 0
    const pieces = lines.slice(0, locked)
    if (hasDraft) pieces.push(input)
    const code = pieces.join('\n')
    if (!code.trim()) {
      toast('先打对一行，再运行看看')
      inputRef.current?.focus()
      return
    }
    setRunning(true)
    setResult(null)
    const res = await runCode(code, level.level_id, setResult)
    setResult(res)
    setRunning(false)
    // 只有整段都打完、整段跑通，才算“跑通了”；打到一半只出结果，不弹成功标记
    if (res.ok && locked >= lines.length) {
      setFlash(true)
      window.setTimeout(() => setFlash(false), 1400)
    }
  }

  const pasteGuard = (e: React.ClipboardEvent | React.DragEvent | React.MouseEvent) => {
    e.preventDefault()
    toast('自己打出来才记得牢哦')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,40%)_minmax(0,1fr)]">
      <div className="flex min-h-[420px] min-w-0 flex-col gap-4">
        <div className="text-sm font-medium text-ink-soft">
          {result?.ok ? '这是你跑出来的' : '还没有运行，点下面的「运行」看看'}
        </div>
        <div className="min-h-[300px] flex-1">
          <RunPreview result={result} flash={flash && !!result?.ok} />
        </div>

        <div className="card overflow-hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-ink-soft"
            onClick={() => setShowFullRef((v) => !v)}
            aria-expanded={showFullRef}
          >
            <span>参考代码整段视图</span>
            <span>{showFullRef ? '收起' : '展开'}</span>
          </button>
          {showFullRef && (
            <pre className="code-font overflow-x-auto border-t border-line bg-code-bg px-4 py-3 text-ink">
              {buildDemoCode(level)}
            </pre>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="mb-2 flex items-center justify-between text-sm text-ink-soft">
          <span>
            第 {Math.min(locked + 1, lines.length)} 行 / 共 {lines.length} 行
          </span>
          <span>打完一行按回车</span>
        </div>

        <div className="card min-w-0 flex-1 p-6">
          <div className="space-y-1">
            {lines.map((line, i) => {
              const state = i < locked ? 'done' : i === locked ? 'current' : 'todo'
              const failed = !!result && !result.ok && !result.loading && result.line === i + 1
              return (
                <div key={i} id={`code-line-${i + 1}`} className="flex items-start gap-3">
                  <span
                    className={`code-font w-8 shrink-0 select-none pt-1 text-right ${
                      state === 'done' ? 'text-success' : 'text-ink-soft'
                    }`}
                  >
                    {i + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div
                      className={`code-font overflow-x-auto whitespace-pre rounded-xl px-3 py-1.5 transition-colors ${
                        failed
                          ? 'bg-danger-soft text-ink ring-1 ring-danger'
                          : state === 'done'
                            ? 'bg-success-soft text-ink'
                            : state === 'current'
                              ? 'bg-brand-soft text-ink ring-1 ring-brand/40'
                              : 'text-ink-soft'
                      }`}
                    >
                      {line || ' '}
                    </div>

                    {state === 'current' && (
                      <>
                        {currentNote && (
                          <p className="mt-1.5 text-sm text-ink-soft">这一行：{currentNote}</p>
                        )}
                        <input
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              validate()
                            }
                          }}
                          onPaste={pasteGuard}
                          onContextMenu={pasteGuard}
                          onDrop={pasteGuard}
                          spellCheck={false}
                          autoComplete="off"
                          aria-label={`第 ${i + 1} 行代码`}
                          className={`code-font mt-2 w-full rounded-xl border-2 bg-white px-3 py-2 outline-none transition focus:ring-2 ${
                            error
                              ? 'border-danger focus:ring-danger'
                              : 'border-brand focus:ring-brand'
                          }`}
                          placeholder="照着上面这一行打一遍"
                        />

                        {error && <FormError className="mt-2">{error}</FormError>}

                        {showStandard && (
                          <div className="mt-2 rounded-field border border-warning/50 bg-warning-soft px-4 py-2.5 text-sm">
                            <span className="font-medium text-ink">标准答案：</span>
                            <code className="code-font whitespace-pre text-ink">{current}</code>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <span
                    className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm ${
                      state === 'done'
                        ? 'bg-success text-white'
                        : state === 'current'
                          ? 'bg-brand-action text-white'
                          : 'bg-canvas text-ink-soft'
                    }`}
                    aria-hidden="true"
                  >
                    {state === 'done' ? '✓' : ''}
                  </span>
                </div>
              )
            })}
          </div>

          {done && (
            <p className="mt-5 rounded-field bg-success-soft px-4 py-3 text-success">
              整段代码都打对了，点下面的「运行」看看效果。
            </p>
          )}
        </div>

        {result && !result.ok && !result.loading && (
          <div className="mt-4 rounded-2xl border border-danger/40 bg-danger-soft p-4">
            <p className="flex items-start gap-2 font-semibold text-danger">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="mt-1 shrink-0">
                <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 4.6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="11.15" r="0.8" fill="currentColor" />
              </svg>
              <span>{result.line > 0 ? `第 ${result.line} 行出了点小问题` : result.message}</span>
            </p>
            {result.line > 0 && <p className="mt-1 pl-6 text-ink">{result.message}</p>}
            <button
              type="button"
              className="btn-secondary mt-3"
              onClick={() => {
                inputRef.current?.focus()
                inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
              }}
            >
              回到代码
            </button>
          </div>
        )}

        {done && result?.ok && (
          <div className="mt-4 flex items-center justify-between rounded-card border border-success bg-success-soft px-5 py-4">
            <span className="font-semibold text-success">跑通了！</span>
            <button type="button" className="btn-primary" onClick={onNext}>
              下一回合
            </button>
          </div>
        )}

        {done && result && !result.ok && (
          <div className="mt-4 flex justify-end">
            <button type="button" className="btn-secondary" onClick={onNext}>
              先不管，去改一改
            </button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <RunButton
            textLevel
            envPhase={envPhase}
            busy={running}
            idleLabel="运行"
            onRun={run}
          />
          <button type="button" className="btn-secondary" onClick={() => setShowCode((v) => !v)}>
            查看整段代码
          </button>
          {!done && <span className="text-sm text-ink-soft">还有 {lines.length - locked} 行没打完</span>}
        </div>

        {showCode && (
          <pre className="code-font mt-3 overflow-x-auto rounded-2xl border border-line bg-code-bg p-4">
            {lines.slice(0, locked).join('\n') || '还没有打任何一行'}
          </pre>
        )}
      </div>

      {toastNode}
    </div>
  )
}
