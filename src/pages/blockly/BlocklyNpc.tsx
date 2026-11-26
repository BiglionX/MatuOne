import { useEffect, useState } from 'react'
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
  useEffect(() => {
    onFocusChange?.(bubble?.focus ?? null)
  }, [bubble, onFocusChange])

  const close = () => {
    setBubble(null)
    onFocusChange?.(null)
  }

  const askAgain = () => {
    const intro = hints.find((hint) => hint.trigger === 'initial')
    setBubble(intro ? { kind: 'intro', text: intro.text, focus: resolveFocus(intro, availableBlocks) } : null)
  }

  if (completed) return null

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-30 flex flex-col items-end gap-3">
      {bubble ? (
        <div
          className="matu-npc-bubble pointer-events-auto max-w-xs rounded-2xl rounded-br-md border border-line bg-white p-4 text-sm leading-relaxed text-ink shadow-pop"
          role="status"
          aria-live="polite"
        >
          <p>{bubble.text}</p>
          <button type="button" className="mt-3 text-xs font-semibold text-brand-strong underline" onClick={close}>
            知道啦
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-3xl shadow-card transition hover:scale-105"
        aria-label="小精灵，再讲一遍这一关怎么做"
        onClick={askAgain}
      >
        🧝
      </button>
    </div>
  )
}
