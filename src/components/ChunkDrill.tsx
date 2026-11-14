import { useEffect, useRef, useState } from 'react'
import type { TypingStats } from '@/types'
import { calcAccuracy, calcWpm, diffKeystrokes, elapsedForWpm } from '@/lib/typingStats'

interface Props {
  chunk: string
  /** 要连续打对的次数 */
  reps: number
  /** 从第几次开始遮住，1 表示第一次就遮 */
  hideFrom: number
  onComplete: (stats: TypingStats) => void
}

/**
 * 短组块打字。整串相等才算对，回车不能用错词混过。
 * 遮住的那一次先亮半秒，打错就把字重新亮出来，这一次重打对了才进入下一次。
 */
export function ChunkDrill({ chunk, reps, hideFrom, onComplete }: Props) {
  const [rep, setRep] = useState(0)
  const [typed, setTyped] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [masked, setMasked] = useState(false)
  const [note, setNote] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const typedRef = useRef('')
  const repRef = useRef(0)
  const advancing = useRef(false)
  const finished = useRef(false)
  const startedAt = useRef<number | null>(null)
  const keys = useRef({ total: 0, correct: 0 })

  const hiding = rep + 1 >= hideFrom && !revealed

  useEffect(() => {
    if (!hiding) {
      setMasked(false)
      return
    }
    setMasked(false)
    const timer = window.setTimeout(() => setMasked(true), 500)
    return () => window.clearTimeout(timer)
  }, [hiding, rep])

  useEffect(() => {
    inputRef.current?.focus()
  }, [rep, revealed])

  const succeed = () => {
    if (advancing.current || finished.current) return
    advancing.current = true
    const current = repRef.current
    typedRef.current = ''
    setTyped('')
    setNote('')
    if (current + 1 >= reps) {
      finished.current = true
      const elapsedRaw = startedAt.current === null ? 0 : Math.max(0, Date.now() - startedAt.current)
      onComplete({
        wpm: calcWpm(keys.current.correct, elapsedRaw),
        accuracy: calcAccuracy(keys.current.correct, keys.current.total),
        totalChars: keys.current.total,
        correctChars: keys.current.correct,
        elapsedMs: elapsedForWpm(elapsedRaw),
      })
      return
    }
    repRef.current = current + 1
    setRep(current + 1)
    setRevealed(false)
    advancing.current = false
  }

  const miss = () => {
    setRevealed(true)
    setMasked(false)
    typedRef.current = ''
    setTyped('')
    setNote('再看一次，把这一遍打对。')
    advancing.current = false
  }

  const onType = (next: string) => {
    if (finished.current) return
    const delta = diffKeystrokes(typedRef.current, next, chunk)
    if (startedAt.current === null && delta.totalKeys > 0) startedAt.current = Date.now()
    keys.current.total += delta.totalKeys
    keys.current.correct += delta.correctKeys
    typedRef.current = next
    setTyped(next)
    if (next === chunk) succeed()
    else if (next.length >= chunk.length) miss()
  }

  const commit = () => {
    if (finished.current || advancing.current) return
    const next = typedRef.current
    if (!next) return
    if (next === chunk) succeed()
    else miss()
  }

  if (finished.current) return null

  const showAnswer = !masked
  const guide = showAnswer ? chunk : '_'.repeat(chunk.length)

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between text-sm text-ink-soft">
        <span>
          第 {Math.min(rep + 1, reps)} / {reps} 次
        </span>
        <span>{masked ? '遮住了，凭手打' : '看着打'}</span>
      </div>

      <div className="rounded-card border border-line bg-code-bg px-6 py-6">
        <div className="code-font select-none text-2xl tracking-wider" aria-hidden={masked}>
          {guide.split('').map((char, i) => {
            const hit = typed[i]
            let cls = 'text-ink-soft'
            if (showAnswer && hit !== undefined) cls = hit === char ? 'text-success' : 'text-danger bg-danger-soft rounded'
            if (showAnswer && i === typed.length) cls = 'text-ink border-b-2 border-brand'
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
          value={typed}
          onChange={(event) => onType(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            commit()
          }}
          onPaste={(event) => event.preventDefault()}
          onContextMenu={(event) => event.preventDefault()}
          onDrop={(event) => event.preventDefault()}
          spellCheck={false}
          autoComplete="off"
          className="code-font mt-5 w-full rounded-field border border-line bg-white px-4 py-3 text-lg outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          placeholder={masked ? '凭手打一遍' : '照着上面这一串打'}
          aria-label="组块打字"
        />
      </div>

      {note && <p className="mt-3 text-sm text-brand-strong">{note}</p>}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-ink-soft">打对了才算这一次。打错了会把字亮出来，重打这一次。</p>
        <button type="button" className="btn-secondary" disabled={typed.length === 0} onClick={commit}>
          打好了
        </button>
      </div>
    </div>
  )
}
