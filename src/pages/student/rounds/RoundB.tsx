import { useEffect, useRef, useState } from 'react'
import type { Level, RunResult } from '@/types'
import { buildDemoCode, runCode } from '@/lib/runner'
import { checkTypedLine } from '@/lib/lineCheck'
import { getLineNotes } from '@/lib/lineNotes'
import { RunPreview } from '@/components/RunPreview'
import { useToast } from '@/components/Toast'

interface Props {
  level: Level
  onNext: () => void
  onErrorTap: () => void
}

/** B 回合：逐行抄代码 + 逐行校验 + 防粘贴 */
export function RoundB({ level, onNext, onErrorTap }: Props) {
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
    if (locked === 0) {
      toast('先打对一行，再运行看看')
      inputRef.current?.focus()
      return
    }
    setRunning(true)
    setResult(null)
    const code = lines.slice(0, locked).join('\n')
    const res = await runCode(code, level.level_id)
    setResult(res)
    setRunning(false)
    // 只有整段 8 行都打完、整段跑通，才算“跑通了”；打到一半只画图，不弹成功标记
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
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,40%)_minmax(0,1fr)]">
      <div className="flex min-h-[420px] flex-col gap-4">
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
            <pre className="code-font overflow-auto border-t border-line bg-code-bg px-4 py-3 text-sm text-ink-soft">
              {buildDemoCode(level)}
            </pre>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="mb-2 flex items-center justify-between text-sm text-ink-soft">
          <span>
            第 {Math.min(locked + 1, lines.length)} 行 / 共 {lines.length} 行
          </span>
          <span>打完一行按回车</span>
        </div>

        <div className="card flex-1 p-5">
          <div className="space-y-1">
            {lines.map((line, i) => {
              const state = i < locked ? 'done' : i === locked ? 'current' : 'todo'
              return (
                <div key={i} className="flex items-start gap-3">
                  <span
                    className={`code-font w-6 shrink-0 select-none pt-1 text-right text-sm ${
                      state === 'done' ? 'text-success' : 'text-ink-soft/70'
                    }`}
                  >
                    {i + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div
                      className={`code-font whitespace-pre rounded-field px-3 py-1.5 transition-colors ${
                        state === 'done'
                          ? 'bg-success-soft text-success'
                          : state === 'current'
                            ? 'bg-brand-soft text-ink ring-1 ring-brand/40'
                            : 'text-ink-soft/60'
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
                          className={`code-font mt-2 w-full rounded-field border-2 bg-white px-3 py-2 outline-none transition ${
                            error
                              ? 'border-danger focus:ring-danger/15'
                              : 'border-brand focus:ring-2 focus:ring-brand/20'
                          }`}
                          placeholder="照着上面这一行打一遍"
                        />

                        {error && (
                          <div className="mt-2 rounded-field bg-danger-soft px-4 py-2.5 text-sm text-danger">
                            {error}
                          </div>
                        )}

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
                          ? 'bg-brand text-white'
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

        {result && !result.ok && result.error && (
          <div className="mt-4 rounded-card border border-danger/40 bg-danger-soft p-4">
            <p className="font-semibold text-danger">
              第 {result.error.line} 行出了点小问题
            </p>
            <p className="mt-1 text-ink">{result.error.message}</p>
            <button
              type="button"
              className="mt-3 rounded-field border border-danger/40 bg-white px-4 py-2 text-sm font-medium text-danger"
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
          <button type="button" className="btn-primary px-8" onClick={run} disabled={running}>
            {running ? '运行中…' : '运行'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setShowCode((v) => !v)}>
            查看整段代码
          </button>
          {!done && <span className="text-sm text-ink-soft">还有 {lines.length - locked} 行没打完</span>}
        </div>

        {showCode && (
          <pre className="code-font mt-3 overflow-auto rounded-card border border-line bg-code-bg p-4 text-sm">
            {lines.slice(0, locked).join('\n') || '还没有打任何一行'}
          </pre>
        )}
      </div>

      {toastNode}
    </div>
  )
}
