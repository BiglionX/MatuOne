import { useEffect, useMemo, useRef, useState } from 'react'
import type { Level } from '@/types'
import { buildStoryPages, type StoryScene } from '@/lib/storyOutline'

/** 极简扁平插图，全部用线条画，颜色跟着 token 走 */
function Art({ kind }: { kind: StoryScene }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  const body = () => {
    switch (kind) {
      case 'goal':
        return (
          <>
            <circle cx="56" cy="88" r="20" {...s} />
            <circle cx="56" cy="88" r="6" fill="currentColor" stroke="none" />
            <path d="M56 88h60" {...s} />
            <path d="M100 74l16 14-16 14" {...s} />
            <path d="M140 26l6 13 14 2-10 9 3 14-13-7-13 7 3-14-10-9 14-2z" {...s} />
            <path d="M30 118h140" {...s} />
          </>
        )
      case 'print':
        return (
          <>
            <rect x="34" y="22" width="132" height="96" rx="12" {...s} />
            <path d="M34 44h132" {...s} />
            <circle cx="48" cy="33" r="3" fill="currentColor" />
            <circle cx="60" cy="33" r="3" fill="currentColor" />
            <path d="M52 66h58" {...s} />
            <path d="M52 86h86" {...s} />
            <path d="M52 106h40" {...s} />
            <path d="M120 104v14" {...s} />
          </>
        )
      case 'forward':
        return (
          <>
            <circle cx="46" cy="88" r="20" {...s} />
            <circle cx="46" cy="88" r="6" fill="currentColor" stroke="none" />
            <path d="M46 88h96" {...s} />
            <path d="M126 74l18 14-18 14" {...s} />
            <path d="M30 118h140" {...s} />
          </>
        )
      case 'turn':
        return (
          <>
            <circle cx="86" cy="70" r="22" {...s} />
            <circle cx="86" cy="70" r="6" fill="currentColor" stroke="none" />
            <path d="M86 70a44 44 0 0 1 62 32" {...s} />
            <path d="M138 122l10-18-18-2" {...s} />
          </>
        )
      case 'loop':
        return (
          <>
            <path d="M62 52a40 40 0 0 1 68 6" {...s} />
            <path d="M130 58l2-20-20 4" {...s} />
            <path d="M138 92a40 40 0 0 1-68-6" {...s} />
            <path d="M70 86l-2 20 20-4" {...s} />
            <circle cx="100" cy="70" r="6" fill="currentColor" stroke="none" />
          </>
        )
      case 'branch':
        return (
          <>
            <path d="M100 30l34 30-34 30-34-30z" {...s} />
            <path d="M100 90v14" {...s} />
            <path d="M100 104l-36 22M100 104l36 22" {...s} />
            <path d="M52 118l4-12-12 2" {...s} />
            <path d="M148 118l-4-12 12 2" {...s} />
          </>
        )
      case 'color':
        return (
          <>
            <circle cx="74" cy="62" r="26" {...s} />
            <circle cx="104" cy="62" r="26" {...s} />
            <circle cx="89" cy="88" r="26" {...s} />
          </>
        )
      case 'variable':
        return (
          <>
            <rect x="36" y="42" width="128" height="60" rx="12" {...s} />
            <path d="M62 76h28" {...s} />
            <path d="M104 60v32M92 74h24" {...s} />
          </>
        )
      case 'done':
        return (
          <>
            <path d="M68 26v96" {...s} />
            <path d="M68 30h62l-10 16 10 16h-62z" {...s} />
            <path d="M52 122h32" {...s} />
          </>
        )
      case 'ready':
        return (
          <>
            <path d="M100 24l12 26 28 3-21 20 6 28-25-15-25 15 6-28-21-20 28-3z" {...s} />
            <path d="M64 106h72" {...s} />
          </>
        )
      default:
        return (
          <>
            <path d="M58 44l-24 26 24 26" {...s} />
            <path d="M142 44l24 26-24 26" {...s} />
            <path d="M114 36l-22 74" {...s} />
          </>
        )
    }
  }

  return (
    <svg viewBox="0 0 200 140" className="h-36 w-52 text-brand" aria-hidden="true">
      <ellipse cx="100" cy="72" rx="88" ry="62" className="fill-brand-soft" />
      {body()}
    </svg>
  )
}

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'zh-CN'
  utter.rate = 0.92
  utter.pitch = 1.05
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('zh'))
  if (voice) utter.voice = voice
  window.speechSynthesis.speak(utter)
}

interface Props {
  level: Level
  onClose: () => void
  /** 后台预览时改成「关闭」，学生进关仍用原来的收束文案。 */
  finishLabel?: string
  dismissLabel?: string
}
/** 进入关卡前的“小绘本”：几页图画 + 一句说明 + 系统语音朗读 */
export function CommandStory({ level, onClose, finishLabel = '看懂了，开始猜一猜', dismissLabel = '跳过' }: Props) {
  const pages = useMemo(() => buildStoryPages(level), [level])

  const [index, setIndex] = useState(0)
  const [autoRead, setAutoRead] = useState(true)
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  useEffect(() => {
    if (!autoRead) return
    const page = pages[index]
    if (!page) return
    const timer = window.setTimeout(() => {
      if (aliveRef.current) speak(page.speak)
    }, 260)
    return () => {
      window.clearTimeout(timer)
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [index, autoRead, pages])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, pages.length - 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pages.length])

  const page = pages[index]
  const last = index === pages.length - 1

  return (
    <div className="fixed inset-0 z-40 overflow-auto bg-canvas">
      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-ink-soft">
            第 {level.order} 关 · 先看一页小绘本
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary px-4 py-2 text-sm"
              onClick={() => speak(page.speak)}
            >
              朗读一遍
            </button>
            <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={onClose}>
              {dismissLabel}
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-4">
          <div key={index} className="card fade-up w-full p-9">
            <div className="flex items-center gap-2">
              <span className="chip bg-brand-soft text-brand-strong">{page.kicker}</span>
              <span className="ml-auto text-sm text-ink-soft">
                第 {index + 1} / {pages.length} 页
              </span>
            </div>

            <div className="mt-7 flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-9">
              <div className="shrink-0 rounded-card bg-canvas px-4 py-3">
                <Art kind={page.kind} />
              </div>
              <div className="min-w-0 text-center md:text-left">
                <h2 className="text-[26px] font-bold leading-snug text-ink">{page.title}</h2>
                {page.text && page.text !== page.title && (
                  <p className="mt-3 text-xl leading-relaxed text-ink-soft">{page.text}</p>
                )}
                {page.code && (
                  <code className="code-font mt-4 inline-block rounded-field bg-code-bg px-4 py-2 text-brand-strong">
                    {page.code}
                  </code>
                )}
              </div>
            </div>

            <div className="mt-9 flex items-center gap-3">
              <button
                type="button"
                className="btn-secondary px-6"
                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                disabled={index === 0}
              >
                上一页
              </button>

              <div className="mx-auto flex items-center gap-2" aria-hidden="true">
                {pages.map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 rounded-full transition-all ${
                      i === index ? 'w-6 bg-brand' : 'w-2 bg-line'
                    }`}
                  />
                ))}
              </div>

              {last ? (
                <button type="button" className="btn-primary px-8" onClick={onClose}>
                  {finishLabel}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary px-8"
                  onClick={() => setIndex((i) => Math.min(i + 1, pages.length - 1))}
                >
                  下一页
                </button>
              )}
            </div>

            <label className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={autoRead}
                onChange={(e) => {
                  setAutoRead(e.target.checked)
                  if (!e.target.checked && 'speechSynthesis' in window) window.speechSynthesis.cancel()
                }}
              />
              翻页时自动朗读
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
