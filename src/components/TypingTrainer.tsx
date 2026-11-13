import { useEffect, useRef, useState } from 'react'
import type { TypingStats } from '@/types'
import { createTypingSession, reduceTyping, type TypingAction, type TypingSession } from '@/lib/typingStats'

interface Props {
  /** 一组练习内容，按顺序逐个完成 */
  targets: string[]
  hint?: string
  onComplete: (stats: TypingStats) => void
  completeLabel?: string
}

/**
 * 打字练习：逐键计时。输入不为空，且回车或目标最后一个字符对上，才结算。
 * 课内打字与独立热身共用本组件。
 */
export function TypingTrainer({ targets, hint, onComplete, completeLabel = '完成这一组' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const sessionRef = useRef<TypingSession>(createTypingSession())
  const reported = useRef(false)
  const [session, setSession] = useState(sessionRef.current)

  const dispatch = (action: TypingAction) => {
    const next = reduceTyping(sessionRef.current, targets, action)
    sessionRef.current = next
    setSession(next)
    if (next.done && next.stats && !reported.current) {
      reported.current = true
      onComplete(next.stats)
    }
    if (inputRef.current && inputRef.current.value !== next.typed) inputRef.current.value = next.typed
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [session.index])

  if (session.done) return null

  const target = targets[session.index] ?? ''
  const value = session.typed

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between text-sm text-ink-soft">
        <span>
          第 {Math.min(session.index + 1, targets.length)} / {targets.length} 组
        </span>
        {hint && <span>{hint}</span>}
      </div>

      <div className="rounded-card border border-line bg-code-bg px-6 py-6">
        <div className="code-font select-none text-2xl tracking-wider">
          {target.split('').map((char, i) => {
            const typed = value[i]
            let cls = 'text-ink-soft'
            if (typed !== undefined) cls = typed === char ? 'text-success' : 'text-danger bg-danger-soft rounded'
            if (i === value.length) cls = 'text-ink border-b-2 border-brand'
            return (
              <span key={i} className={cls}>
                {char === ' ' ? '␣' : char}
              </span>
            )
          })}
        </div>

        <input
          ref={inputRef}
          autoFocus
          value={value}
          onChange={(e) => dispatch({ kind: 'input', next: e.target.value, now: Date.now() })}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            dispatch({ kind: 'enter', now: Date.now() })
          }}
          onPaste={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          spellCheck={false}
          autoComplete="off"
          className="code-font mt-5 w-full rounded-field border border-line bg-white px-4 py-3 text-lg outline-none
            focus:border-brand focus:ring-2 focus:ring-brand/20"
          placeholder="在这里照着打一遍"
          aria-label="打字练习输入框"
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-ink-soft">打完后自动进入下一组，打错了可以按退格键修改。</p>
        <button
          type="button"
          className="btn-secondary"
          disabled={value.length === 0}
          onClick={() => dispatch({ kind: 'enter', now: Date.now() })}
        >
          {completeLabel}
        </button>
      </div>
    </div>
  )
}
