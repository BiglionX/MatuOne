import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ModuleLevelReview, ModuleStoryPage } from '@/modules/curriculum/moduleLevelBody'
import { speak, stopSpeaking } from '@/lib/speech'
import './blocklyGame.css'

/**
 * 进关前的「绘本情境导入」。
 *
 * 无师化场景：老师不教编程，孩子必须在拖积木之前先通过漫画知道这一关的概念。
 * 数据全部由关卡正文（body.intro_story / body.review）下发，这里不写死任何文案。
 *
 * 插画目前用 Emoji 占位：正文里的 image 是一段短标识（robot_wave 之类），
 * 教研老师换成真实图片路径后本组件会自动改用 <img> 渲染，数据结构不用动。
 */

/** 插画占位符 → Emoji。没登记的标识退回到书本图案。 */
const IMAGE_EMOJI: Record<string, string> = {
  robot: '🤖',
  robot_hello: '👋',
  robot_wave: '🤖',
  robot_point: '👉',
  robot_run: '🏃',
  block_move: '🟩',
  block_turn: '🌀',
  block_repeat: '🔁',
  block_if: '❓',
  run_button: '▶️',
  goal: '🏁',
  star: '⭐',
  idea: '💡',
  path: '🛤️',
  map: '🗺️',
  book: '📘',
  treasure: '💎',
  coin: '🪙',
  apple: '🍎',
  variable_box: '📦',
  score: '⭐',
}

/** 默认说话人。正文没写 speaker 时用它。 */
const DEFAULT_SPEAKER = '小精灵'

/** 看着像图片路径的插画，就按真图片渲染，不当占位符。 */
function looksLikeImagePath(image: string): boolean {
  return image.startsWith('/') || image.startsWith('./') || /^https?:\/\//.test(image) || /\.(png|jpe?g|webp|gif|svg)$/i.test(image)
}

/** 正文里的插画标识 → 可渲染的东西。 */
function StoryImage({ image }: { image: string }) {
  if (looksLikeImagePath(image)) {
    return <img src={image} alt="" className="h-36 w-52 object-contain" />
  }
  return (
    <span className="block text-[76px] leading-none" role="img" aria-hidden="true">
      {IMAGE_EMOJI[image] ?? IMAGE_EMOJI.book}
    </span>
  )
}

/** 绘本的一步：先复习卡，再一页页绘本。 */
type StoryStep =
  | { kind: 'review'; review: ModuleLevelReview }
  | { kind: 'page'; page: ModuleStoryPage }

export interface StoryPlayerProps {
  /** 绘本页；没有这一项时只显示复习卡。 */
  introStory?: ModuleStoryPage[]
  /** 课前复习卡，内容是上一关的核心知识点。 */
  review?: ModuleLevelReview
  /** 关卡标题，显示在顶部。 */
  title?: string
  /** 关卡序号，显示在顶部。 */
  levelNumber?: number
  /** 学生看完并点「开始挑战」后调用。 */
  onFinish: () => void
}

export function StoryPlayer({ introStory, review, title, levelNumber, onFinish }: StoryPlayerProps) {
  const steps = useMemo<StoryStep[]>(() => {
    const list: StoryStep[] = []
    // 复习卡排在绘本之前：先回忆上一关，再看今天要学什么。
    if (review) list.push({ kind: 'review', review })
    for (const page of introStory ?? []) list.push({ kind: 'page', page })
    return list
  }, [introStory, review])

  const [index, setIndex] = useState(0)
  /** 淡出中：先把当前页淡出去，动画走完再换页。 */
  const [fading, setFading] = useState(false)
  /** 复习卡的答案默认收起来，学生想起来了再点开。 */
  const [answerShown, setAnswerShown] = useState(false)
  const [autoRead, setAutoRead] = useState(true)
  const swapTimerRef = useRef<number | null>(null)

  const step = steps[index]
  const last = index === steps.length - 1

  /** 换页：先淡出，动画结束后再换内容，视觉上就是一次淡入淡出。 */
  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= steps.length || next === index) return
      if (swapTimerRef.current !== null) window.clearTimeout(swapTimerRef.current)
      setFading(true)
      swapTimerRef.current = window.setTimeout(() => {
        setIndex(next)
        setFading(false)
        swapTimerRef.current = null
      }, 160)
    },
    [index, steps.length],
  )

  useEffect(
    () => () => {
      if (swapTimerRef.current !== null) window.clearTimeout(swapTimerRef.current)
      stopSpeaking()
    },
    [],
  )

  // 复习卡换了关卡就重新盖住答案。
  useEffect(() => {
    setAnswerShown(false)
  }, [index])

  /** 这一页要念的内容。 */
  const spokenText = useMemo(() => {
    if (!step) return ''
    if (step.kind === 'review') return answerShown ? `${step.review.question} ${step.review.answer}` : step.review.question
    return step.page.content
  }, [answerShown, step])

  useEffect(() => {
    if (!autoRead) return
    if (!spokenText) return
    const timer = window.setTimeout(() => speak(spokenText), 240)
    return () => {
      window.clearTimeout(timer)
      stopSpeaking()
    }
  }, [autoRead, spokenText])

  // 左右方向键翻页，和 Python 模块的小绘本保持一致的手感。
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goTo(index + 1)
      if (event.key === 'ArrowLeft') goTo(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, index])

  if (!step) return null

  return (
    <div
      className="matu-story-backdrop fixed inset-0 z-50 overflow-auto"
      role="dialog"
      aria-modal="true"
      aria-label="进关前的绘本"
    >
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-brand-strong">
            {levelNumber ? `第 ${levelNumber} 关` : ''}
            {title ? ` · ${title}` : ''} · 先看一个小绘本
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary px-4 py-2 text-sm"
              onClick={() => speak(spokenText)}
              disabled={!spokenText}
            >
              朗读一遍
            </button>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center py-4 sm:py-6">
          <div
            className={`matu-story-page card w-full max-w-3xl p-5 sm:p-8 lg:p-10 ${
              fading ? 'opacity-0' : 'opacity-100'
            } transition-opacity duration-150`}
          >
            <div className="flex items-center gap-2">
              <span className="chip bg-brand-soft text-brand-strong">
                {/* 页码按「绘本里的第几页」算：有复习卡时复习卡占了第 0 步。 */}
                {step.kind === 'review' ? '课前复习' : `第 ${review ? index : index + 1} / ${introStory?.length ?? 0} 页`}
              </span>
              <span className="ml-auto text-sm text-ink-soft">
                共 {steps.length} 步
              </span>
            </div>

            {step.kind === 'review' ? (
              <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                <div className="shrink-0 rounded-card bg-canvas px-5 py-4">
                  <span className="block text-[64px] leading-none" role="img" aria-hidden="true">
                    💭
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-ink sm:text-xl">{step.review.question}</p>
                  {answerShown ? (
                    <div className="matu-story-bubble mt-4 rounded-2xl rounded-bl-md bg-brand-soft px-4 py-3">
                      <p className="text-lg font-semibold text-brand-strong">{step.review.answer}</p>
                      {step.review.hint ? <p className="mt-1 text-base text-ink-soft">{step.review.hint}</p> : null}
                    </div>
                  ) : (
                    <button type="button" className="btn-secondary mt-4" onClick={() => setAnswerShown(true)}>
                      看看答案
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                {step.page.image ? (
                  <div className="shrink-0 rounded-card bg-canvas px-5 py-4">
                    <StoryImage image={step.page.image} />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-brand-strong">{step.page.speaker ?? DEFAULT_SPEAKER}</p>
                  <div className="matu-story-bubble mt-2 rounded-2xl rounded-bl-md bg-brand-soft px-4 py-3">
                    <p className="text-lg leading-relaxed text-ink sm:text-xl">{step.page.content}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 pb-2">
          <button
            type="button"
            className="btn-secondary px-5 sm:px-6"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
          >
            上一页
          </button>

          <div className="flex items-center gap-2" aria-hidden="true">
            {steps.map((_, item) => (
              <span
                key={item}
                className={`h-2 rounded-full transition-all ${item === index ? 'w-6 bg-brand' : 'w-2 bg-line'}`}
              />
            ))}
          </div>

          {last ? (
            <button type="button" className="btn-primary px-6 sm:px-8" onClick={onFinish}>
              开始挑战
            </button>
          ) : (
            <button type="button" className="btn-primary px-6 sm:px-8" onClick={() => goTo(index + 1)}>
              下一页
            </button>
          )}
        </footer>

        <label className="flex items-center justify-center gap-2 pb-2 text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={autoRead}
            onChange={(event) => {
              setAutoRead(event.target.checked)
              if (!event.target.checked) stopSpeaking()
            }}
          />
          翻页时自动朗读
        </label>
      </div>
    </div>
  )
}