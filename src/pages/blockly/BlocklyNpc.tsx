import { useCallback, useEffect, useState } from 'react'
import type {
  ModuleAvailableBlock,
  ModuleHintFocus,
  ModuleLevelBody,
  ModuleTeachingStep,
} from '@/modules/curriculum/moduleLevelBody'
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
  /**
   * 可选的分步引导。配了这一项时小精灵一次只讲一步，
   * 学生点「我已完成，下一步」后由页面检查工作区，通过了才讲下一步。
   */
  teachingSteps?: ModuleTeachingStep[]
  /** 检查第 index 步是否做完；由页面读工作区实现。 */
  onCheckStep?: (index: number) => { ok: boolean; message?: string }
  /** 最后一步验收通过后，学生点按钮直接运行当前程序。 */
  onRun?: () => void
  /**
   * 页面临时接管气泡，例如通关后的「改个参数会怎样」思考题。
   * 有值时优先级最高；buttonLabel 为空则不显示按钮，只让学生去动手。
   */
  prompt?: { text: string; buttonLabel: string; onAction: () => void }
  /** 高亮目标变了，交给页面去闪工作区、运行按钮或者某一块积木。 */
  onFocusChange?: (focus: ModuleHintFocus | null) => void
}

interface NpcBubble {
  kind: 'intro' | 'idle' | 'fail'
  text: string
  focus?: ModuleHintFocus
}

interface StepFeedback {
  kind: 'ok' | 'fail'
  text: string
}

/** 关卡没写专门的闲置提示时，小精灵自己说这句。 */
const IDLE_TEXT = '还在发呆呀～ 把需要的积木拖进工作区，连好后点「运行」试试！'

/**
 * 提示气泡自己收起来的时间。
 *
 * 气泡要是不自动消失，就会一直挂在右下角挡着工作区，
 * 而提示本身念一遍也就几秒，五秒足够读完。
 * 运行失败的提示不自动收（见下面的 effect），那种必须让孩子停下来看。
 * 分步引导的气泡不走这套自动收起，学生要一直看得见当前这一步。
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
 * 普通关卡三种开口时机：关卡刚打开讲一遍要做的事、闲置太久没人操作、运行之后没通关。
 * 配了 teaching_steps 的关卡改成一步步带：每步点一次按钮检查一次，错了只提醒不往下走。
 * 每次开口都会带一个 focus，页面照着 focus 去闪工作区、运行按钮或者某一块积木。
 */
export function BlocklyNpc({
  hints,
  availableBlocks = [],
  idleDelayMs = 30_000,
  activityToken = 0,
  runFailed = false,
  completed = false,
  teachingSteps,
  onCheckStep,
  onRun,
  prompt,
  onFocusChange,
}: BlocklyNpcProps) {
  const [bubble, setBubble] = useState<NpcBubble | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [stepFeedback, setStepFeedback] = useState<StepFeedback | null>(null)
  const [lastStepAccepted, setLastStepAccepted] = useState(false)
  const [teachingFinished, setTeachingFinished] = useState(false)
  const steps = teachingSteps ?? []
  const teachingMode = steps.length > 0 && Boolean(onCheckStep)

  // 换关卡时从头开始带；同一个关卡「再试一次」不重新弹绘本，也不重头讲步骤。
  useEffect(() => {
    setStepIndex(0)
    setStepFeedback(null)
    setLastStepAccepted(false)
    setTeachingFinished(false)
  }, [teachingSteps])

  // 关卡一打开先讲一遍：这一关要干什么。分步引导的关卡由步骤气泡接手。
  useEffect(() => {
    if (teachingMode) return
    const intro = hints.find((hint) => hint.trigger === 'initial')
    setBubble(intro ? { kind: 'intro', text: intro.text, focus: resolveFocus(intro, availableBlocks) } : null)
    // availableBlocks 是常量表，关卡不变就不用重算。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hints, teachingMode])

  // 闲置计时：没人动就提醒一句怎么开始。
  useEffect(() => {
    if (completed || teachingMode) return
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
  }, [activityToken, completed, hints, idleDelayMs, teachingMode])

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
    if (!bubble || teachingMode) return
    onFocusChange?.(bubble.focus ?? null)
  }, [bubble, onFocusChange, teachingMode])

  // 分步引导时高亮当前这一步要用的积木。
  useEffect(() => {
    if (!teachingMode) return
    const current = steps[stepIndex]
    const focusType = current?.check.all?.[0]?.type ?? current?.check.type
    onFocusChange?.(current ? { target: 'block', blockType: focusType } : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachingMode, stepIndex])

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
    if (prompt?.text) return
    if (teachingMode) {
      setBubble(null)
      setStepFeedback(null)
      setLastStepAccepted(false)
      setTeachingFinished(false)
      return
    }
    const intro = hints.find((hint) => hint.trigger === 'initial')
    setBubble(intro ? { kind: 'intro', text: intro.text, focus: resolveFocus(intro, availableBlocks) } : null)
  }

  const handleNext = () => {
    const step = steps[stepIndex]
    if (!step) return
    const result = onCheckStep?.(stepIndex)
    if (!result?.ok) {
      setLastStepAccepted(false)
      setStepFeedback({ kind: 'fail', text: result?.message || step.fail_text })
      return
    }
    const next = steps[stepIndex + 1]
    if (next) {
      setLastStepAccepted(false)
      setStepFeedback({ kind: 'ok', text: `${step.done_text ?? '做得好！'}下一步是：${next.text}` })
      setStepIndex((value) => value + 1)
    } else {
      setLastStepAccepted(true)
      setStepFeedback({ kind: 'ok', text: step.done_text ?? '代码验收通过！' })
    }
  }

  const handleTeachingFinished = () => {
    setTeachingFinished(true)
    onFocusChange?.({ target: 'run' })
    onRun?.()
  }

  if (completed) return null

  const step = steps[stepIndex]
  const showPrompt = Boolean(prompt?.text)
  const showStep = teachingMode && !teachingFinished && !bubble && !showPrompt
  const bubbleText = showPrompt
    ? prompt!.text
    : showStep
      ? stepFeedback?.text ?? (step ? `第 ${stepIndex + 1}/${steps.length} 步：${step.text}` : '')
      : bubble?.text ?? ''
  const finalStepAccepted = showStep && lastStepAccepted && stepIndex === steps.length - 1
  const canCheck = showStep && !finalStepAccepted
  const showAction = showPrompt ? Boolean(prompt!.buttonLabel) : canCheck || finalStepAccepted
  const actionLabel = showPrompt
    ? prompt!.buttonLabel
    : finalStepAccepted
      ? '已完成，可以运行看看效果了'
      : '我已完成，下一步'
  const handleAction = showPrompt ? prompt!.onAction : finalStepAccepted ? handleTeachingFinished : handleNext

  return (
    <div className="pointer-events-none fixed bottom-2 right-2 z-30 flex flex-col items-end gap-2">
      {bubbleText ? (
        <div
          className="matu-npc-bubble pointer-events-auto relative w-[236px] rounded-2xl rounded-br-md border border-line bg-white p-3 shadow-pop"
          role="status"
          aria-live="polite"
        >
          {showStep || showPrompt ? (
            <span className="block text-sm leading-relaxed text-ink">{bubbleText}</span>
          ) : (
            /* 整块气泡都是一个按钮：点哪儿都能关，不用再找「知道啦」那个小字。 */
            <button
              type="button"
              className="block w-full pr-5 text-left"
              aria-label="关掉小精灵的提示"
              onClick={close}
            >
              <span className="text-sm leading-relaxed text-ink">{bubbleText}</span>
            </button>
          )}
          {!showStep && !showPrompt ? (
            <span className="pointer-events-none absolute right-2 top-1.5 text-xs text-ink-soft" aria-hidden="true">
              ✕
            </span>
          ) : null}
        </div>
      ) : null}
      {showAction ? (
        <button
          type="button"
          className="btn-primary pointer-events-auto min-h-10 rounded-full px-5 text-sm shadow-card"
          onClick={handleAction}
        >
          {actionLabel}
        </button>
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
