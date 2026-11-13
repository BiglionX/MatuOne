import { useRef, useState } from 'react'
import type { TypingStats } from '@/types'

interface Props {
  /** 一组练习内容，按顺序逐个完成 */
  targets: string[]
  hint?: string
  onComplete: (stats: TypingStats) => void
  completeLabel?: string
}

/**
 * 打字练习：逐字符实时比对，完成后算出 WPM 与准确率。
 * 课内打字与独立热身共用本组件。
 */
export function TypingTrainer({ targets, hint, onComplete, completeLabel = '完成这一组' }: Props) {
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState('')
  const [done, setDone] = useState(false)
  const startedAt = useRef<number | null>(null)
  const totalChars = useRef(0)
  const correctChars = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const target = targets[index] ?? ''
  const finished = index >= targets.length

  const finish = (stats: TypingStats) => {
    setDone(true)
    onComplete(stats)
  }

  const commitTarget = (typed: string) => {
    totalChars.current += typed.length
    correctChars.current += typed.split('').filter((c, i) => c === target[i]).length
    if (index + 1 >= targets.length) {
      const elapsed = Math.max(1000, Date.now() - (startedAt.current ?? Date.now()))
      const minutes = elapsed / 60000
      const stats: TypingStats = {
        wpm: totalChars.current / 5 / minutes,
        accuracy: (correctChars.current / Math.max(1, totalChars.current)) * 100,
        totalChars: totalChars.current,
        correctChars: correctChars.current,
        elapsedMs: elapsed,
      }
      finish(stats)
      return
    }
    setIndex(index + 1)
    setValue('')
    window.setTimeout(() => inputRef.current?.focus(), 30)
  }

  const onChange = (next: string) => {
    if (startedAt.current === null) startedAt.current = Date.now()
    setValue(next)
    if (next.length >= target.length) {
      window.setTimeout(() => {
        if (next === target) commitTarget(next)
      }, 0)
    }
  }

  if (done) return null

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between text-sm text-ink-soft">
        <span>
          第 {Math.min(index + 1, targets.length)} / {targets.length} 组
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
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value === target) commitTarget(value)
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
          onClick={() => {
            if (finished) return
            if (value.length === 0 && startedAt.current === null) startedAt.current = Date.now()
            commitTarget(value)
          }}
        >
          {completeLabel}
        </button>
      </div>
    </div>
  )
}
