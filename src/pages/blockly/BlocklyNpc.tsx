import { useCallback, useEffect, useState } from 'react'
import type { ModuleAvailableBlock, ModuleHintFocus, ModuleLevelBody } from '@/modules/curriculum/moduleLevelBody'
import './blocklyGame.css'

export interface BlocklyNpcProps {
  /** 关卡提示；小精灵从这里挑话术。 */
  hints: ModuleLevelBody['hints']
  /** 这一关能用的积木；提示里没写 focus 时靠它猜该闪哪一块。 */
  availableBlocks?: ModuleAvailableBlock[]
  /** 闲置多久没人操作就开口，默认 30 秒。 */
  idleDelayMs?: number
  /** 学生每做一次操作就变一次，用来重置闲置计时。 */
  activityToken?: number
  /** 最近一次运行没通关；为 true 时小精灵马上给一条具体建议。 */
  runFailed?: boolean
  /** 通关了就不再打扰。 */
  completed?: boolean
  /** 高亮目标变了，交给页面去闪工作区、运行按钮或某一块积木。 */
  onFocusChange?: (focus: ModuleHintFocus | null) => void
}

interface NpcBubble {
  kind: 'intro' | 'idle' | 'fail'
  text: string
  focus?: ModuleHintFocus
}

/** 关卡没写专门的闲置提示时，小精灵自己说这句。 */
const IDLE_TEXT = '还在发呆呀～ 把积木从左边拖到右边的工作区，再点「运行」试试！'

/**
 * 提示气泡自己收起来的时间。
 *
 * 气泡要是不自动消失，就会一直挂在右下角挡着工作区，
 * 而提示本身念一遍也就几秒，五秒足够读完。
 * 运行失败的提示不自动收（见下面的 effect），那种必须让孩子停下来看。
 */
const AUTO_HIDE_MS = 5_000

/**
 * 提示里没写 focus 时的兜底。
 *
 * 老关卡数据没有 focus 字段，不做兜底的话小精灵虽然开口了，却不会高亮任何东西。
 * 优先按提示文案里出现的积木名猜一块（写「多走几步」时对应「前进」），
 * 猜不出来就闪工作区，提醒学生去改积木。
 */
function fallbackFocus(text: string, availableBlocks: ModuleAvailableBlock[]): ModuleHintFocus {
  const mentioned = availableBlocks.find((block) => block.label && text.includes(block.label))
  if (mentioned) return { target: 'block', blockType: mentioned.type }
  return { target: 'workspace' }
}

/** 给气泡补上高亮目标：数据里写了就用数据里的，没写就猜一个。 */
function resolveFocus(
  hint: ModuleLevelBody['hints'][number] | undefined,
  availableBlocks: ModuleAvailableBlock[],
): ModuleHintFocus | undefined {
  if (!hint) return undefined
  if (hint.focus) return hint.focus
  return fallbackFocus(hint.text, availableBlocks)
}

/**
 * 无师化引导小精灵。
 *
 * 三种开口时机：关卡刚打开讲一遍要做的事、闲置太久没人操作、运行之后没通关。
 * 每次开口都会带一个 focus，页面照着 focus 去闪工作区、运行按钮或者某一块积木。
 */
export function BlocklyNpc({
  hints,
  availableBlocks = [],
  idleDelayMs = 30_000,
  activityToken = 0,
  runFailed = false,
  completed = false,
  onFocusChange,
}: BlocklyNpcProps) {
  const [bubble, setBubble] = useState<NpcBubble | null>(null)

  // 关卡一打开先讲一遍：这一关要干什么。
  useEffect(() => {
    const intro = hints.find((hint) => hint.trigger === 'initial')
    setBubble(intro ? { kind: 'intro', text: intro.text, focus: resolveFocus(intro, availableBlocks) } : null)
    // availableBlocks 是常量表，关卡不变就不用重算。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hints])

  // 闲置计时：没人动就提醒一句怎么开始。
  useEffect(() => {
    if (completed) return
    const timer = window.setTimeout(() => {
      setBubble((current) => {
        // 运行失败的提示更紧急，先不打断它。
        if (current?.kind === 'fail') return current
        const idle = hints.find((hint) => hint.trigger === 'idle')
        const initial = hints.find((hint) => hint.trigger === 'initial')
        return {
          kind: 'idle',
          text: idle?.text ?? IDLE_TEXT,
          focus: idle ? resolveFocus(idle, availableBlocks) : resolveFocus(initial, availableBlocks),
        }
      })
    }, idleDelayMs)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityToken, completed, hints, idleDelayMs])

  // 运行没通关：立刻给一条具体的建议，别让学生自己猜。
  useEffect(() => {
    if (!runFailed) return
    const fail = hints.find((hint) => hint.trigger === 'not_completed')
    if (!fail) return
    setBubble({ kind: 'fail', text: fail.text, focus: resolveFocus(fail, availableBlocks) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hints, runFailed])

  // 高亮跟着气泡走：气泡一换，页面就换要闪的东西。
  // 气泡被自动收起时不清高亮——学生可能还没看完提示，
  // 闪的那块积木得继续闪着，等他自己动手。
  useEffect(() => {
    if (!bubble) return
    onFocusChange?.(bubble.focus ?? null)
  }, [bubble, onFocusChange])

  const close = useCallback(() => {
    setBubble(null)
    onFocusChange?.(null)
  }, [onFocusChange])

  // 提示读完就自己收起来，别一直挡着工作区。
  useEffect(() => {
    if (!bubble) return
    // 运行失败的那条要停下来看，不能自动消失。
    if (bubble.kind === 'fail') return
    const timer = window.setTimeout(() => setBubble(null), AUTO_HIDE_MS)
    return () => window.clearTimeout(timer)
  }, [bubble])

  const askAgain = () => {
    const intro = hints.find((hint) => hint.trigger === 'initial')
    setBubble(intro ? { kind: 'intro', text: intro.text, focus: resolveFocus(intro, availableBlocks) } : null)
  }

  if (completed) return null

  return (
    <div className="pointer-events-none fixed bottom-2 right-2 z-30 flex flex-col items-end gap-2">
      {bubble ? (
        <div
          className="matu-npc-bubble pointer-events-auto relative w-[236px] rounded-2xl rounded-br-md border border-line bg-white p-3 shadow-pop"
          role="status"
          aria-live="polite"
        >
          {/* 整块气泡都是一个按钮：点哪儿都能关，不用再找「知道啦」那个小字。 */}
          <button
            type="button"
            className="block w-full pr-5 text-left"
            aria-label="关掉小精灵的提示"
            onClick={close}
          >
            <span className="text-sm leading-relaxed text-ink">{bubble.text}</span>
          </button>
          <span className="pointer-events-none absolute right-2 top-1.5 text-xs text-ink-soft" aria-hidden="true">
            ✕
          </span>
        </div>
      ) : null}
      <button
        type="button"
        className="matu-npc-ball pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-2xl shadow-card"
        aria-label="小精灵，再讲一遍这一关怎么做"
        onClick={askAgain}
      >
        🧝
      </button>
    </div>
  )
}
