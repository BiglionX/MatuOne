import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MODULE_IDS } from '../../../supabase/functions/_shared/moduleRegistry'
import { completeLevel, loadModuleLevel } from '@/api/learning'
import { enterLevel, type EnterLevelReason, type ModuleLevelLesson } from '@/api/studentLevel'
import { getCurrentStudent } from '@/api/studentAuth'
import { BrandMark } from '@/components/BrandMark'
import { Skeleton } from '@/components/Skeleton'
import { ApiError } from '@/lib/apiError'
import { isGameSoundEnabled, playGameSound, toggleGameSound } from '@/lib/gameSounds'
import {
  parseModuleLevelBody,
  gridSceneOf,
  hasIntroMaterial,
  type ModuleHintFocus,
  type ModuleLevelBody,
  type ModuleSuccessCheck,
} from '@/modules/curriculum/moduleLevelBody'
import {
  createInitialActorState,
  interpretModuleLevel,
  type ActorState,
  type BlockExecutionNode,
  type ModuleExecutionResult,
} from '@/modules/curriculum/moduleLevelInterpreter'
import { compileStageProgram, type StageSnapshot } from '@/modules/curriculum/moduleStageInterpreter'
import { checkTeachingStep, hasDifferentParam } from '@/modules/curriculum/teachingSteps'
import type { PythonCodeSnapshot } from './blocklyPython'
import { BlocklyNpc } from './BlocklyNpc'
import { BlocklyWorkspace, type BlocklyWorkspaceHandle } from './BlocklyWorkspace'
import { GridStage } from './GridStage'
import { PythonCodeView } from './PythonCodeView'
import { StageStage } from './StageStage'
import { StoryPlayer } from './StoryPlayer'
import { useStageRuntime } from './useStageRuntime'

const DEFAULT_LEVEL_ID = 'blk-001'
const MAP_HREF = '/blockly'
const WORKSPACE_MIN_HEIGHT = 420
const WORKSPACE_MAX_HEIGHT = 1600
const WORKSPACE_HEIGHT_STEP = 24

type ProgramView = 'blocks' | 'code'

function clampWorkspaceHeight(value: number): number {
  return Math.min(WORKSPACE_MAX_HEIGHT, Math.max(WORKSPACE_MIN_HEIGHT, value))
}

/** blk-001 这类关卡号；取最后一段数字当关卡序号。 */
function levelNumber(levelId: string): number {
  const matched = /(\d+)\s*$/.exec(levelId)
  return matched ? Number(matched[1]) : 1
}

function collectChecks(check: ModuleSuccessCheck): ModuleSuccessCheck[] {
  return check.type === 'all' || check.type === 'any' ? check.conditions.flatMap(collectChecks) : [check]
}

interface FailureProgress {
  label: string
  current: string | number | boolean
  target: string | number | boolean
}

interface TouchTargetInfo {
  id: string
  nested: boolean
  node: BlockExecutionNode
}

function variableLabel(variableId: string): string {
  if (variableId === 'score') return '得分'
  if (variableId === 'apple_count') return '苹果数'
  return variableId
}

function spriteLabel(body: ModuleLevelBody, spriteId: string): string {
  if (body.scene.type !== 'stage') return spriteId
  const sprite = body.scene.sprites.find((item) => item.id === spriteId)
  if (!sprite) return spriteId
  if (sprite.asset === 'apple') {
    const matched = /(\d+)\s*$/.exec(spriteId)
    return matched ? `苹果 ${Number(matched[1])}` : '苹果'
  }
  return sprite.asset || spriteId
}

/** 折叠时也给出可量化的目标进度，不直接把答案说破。 */
function buildFailureProgress(body: ModuleLevelBody, snapshot: StageSnapshot | null): FailureProgress[] {
  if (!snapshot) return []
  const checks = collectChecks(body.success_check)
  const progress: FailureProgress[] = []
  const valueCheck = checks.find((check) => check.type === 'variable_value')
  if (valueCheck?.type === 'variable_value' && Object.prototype.hasOwnProperty.call(snapshot.variables, valueCheck.variable_id)) {
    progress.push({
      label: variableLabel(valueCheck.variable_id),
      current: snapshot.variables[valueCheck.variable_id],
      target: valueCheck.value,
    })
  }
  const hiddenChecks = checks.filter((check) => check.type === 'sprite_hidden')
  if (hiddenChecks.length) {
    const caught = hiddenChecks.filter((check) => {
      const sprite = snapshot.sprites.find((item) => item.id === check.sprite_id)
      return Boolean(sprite && !sprite.visible)
    }).length
    const assets = hiddenChecks.map((check) => body.scene.type === 'stage'
      ? body.scene.sprites.find((sprite) => sprite.id === check.sprite_id)?.asset
      : undefined)
    progress.push({
      label: assets.every((asset) => asset === 'apple') ? '接住苹果' : '完成目标',
      current: caught,
      target: hiddenChecks.length,
    })
  }
  return progress
}

function collectTouchTargets(nodes: readonly BlockExecutionNode[]): TouchTargetInfo[] {
  const targets: TouchTargetInfo[] = []
  const visit = (node: BlockExecutionNode | null | undefined, nested: boolean) => {
    let current = node
    while (current) {
      if (current.type === 'if_touching') {
        targets.push({ id: String(current.args?.target_sprite_id ?? ''), nested, node: current })
        for (const child of current.children ?? []) visit(child, true)
      } else {
        for (const child of current.children ?? []) visit(child, nested)
      }
      current = current.next
    }
  }
  for (const node of nodes) visit(node, false)
  return targets
}

function chainHasBlock(node: BlockExecutionNode | null | undefined, type: string): boolean {
  let current = node
  while (current) {
    if (current.type === type) return true
    current = current.next
  }
  return false
}

/** 失败后先让学生自己想；点「查看错误信息」才展示这份具体诊断。 */
function buildFailureDetail(
  body: ModuleLevelBody,
  snapshot: StageSnapshot | null,
  tree: readonly BlockExecutionNode[],
): string {
  const fallback = body.hints.find((hint) => hint.trigger === 'not_completed')?.text ?? '程序结束了，可是还没有完成目标。'
  if (!snapshot) return fallback
  const checks = collectChecks(body.success_check)
  const valueCheck = checks.find((check) => check.type === 'variable_value')
  const parts: string[] = []
  if (valueCheck?.type === 'variable_value') {
    parts.push(`现在${variableLabel(valueCheck.variable_id)}是 ${snapshot.variables[valueCheck.variable_id]}，目标要正好是 ${valueCheck.value}`)
  }
  const missing = checks
    .filter((check) => check.type === 'sprite_hidden' && snapshot.sprites.find((sprite) => sprite.id === check.sprite_id)?.visible)
    .map((check) => (check.type === 'sprite_hidden' ? check.sprite_id : ''))
    .filter(Boolean)
  if (missing.length) parts.push(`${missing.map((id) => spriteLabel(body, id)).join('、')} 还没接住`)

  const touchTargets = collectTouchTargets(tree)
  for (const spriteId of missing) {
    const label = spriteLabel(body, spriteId)
    const target = touchTargets.find((item) => item.id === spriteId)
    if (!target) {
      parts.push(`工作区里还没有「如果碰到 ${label}」`)
      continue
    }
    if (target.nested) {
      parts.push(`「如果碰到 ${label}」放在了另一个判断里面，把它移到同一个循环里、和其他判断并列`)
      continue
    }
    if (valueCheck?.type === 'variable_value' && !(target.node.children ?? []).some((child) => chainHasBlock(child, 'change_variable'))) {
      parts.push(`「如果碰到 ${label}」里面还没有让${variableLabel(valueCheck.variable_id)}增加的积木`)
    }
  }
  if (!parts.length) return fallback
  return `${parts.join('；')}。再看看判断和加分积木的连接方式。`
}

const ENTER_COPY: Record<EnterLevelReason, string> = {
  ok: '',
  unauthenticated: '请先登录',
  org_expired: '本机构服务已到期，请联系老师',
  org_disabled: '机构已停用，请联系老师',
  trial_locked: '试用期间只能学习 Level 1',
  module_not_entitled: '该模块未开通，请联系机构',
  not_entitled: '老师还没有为你开通这一关',
  course_locked: '本机构尚未开通该阶段课程，请联系老师',
  sequence_locked: '先完成上一关，再来挑战这一关吧',
  not_found: '没有找到这一关',
}

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, durationMs))
}

function resultMessage(result: ModuleExecutionResult): string {
  if (result.completed) return ''
  if (result.failure === 'max_steps') return '程序还没有到终点，试试减少步骤。'
  if (result.blocked) return '前面走不动了，检查一下角色朝向和障碍物。'
  return '角色还没有到终点，再检查一下程序。'
}

/**
 * 提示里出现这些词，就说明这一关真的在教「吃金币」。
 *
 * 判据是文案而不是关卡配置：将来要教计分了，把「吃到金币可以加分哦」
 * 写进提示，金币就会自己回来，画面和话永远对得上。
 */
const COLLECTIBLE_WORDS = ['金币', '收集', '吃到', '宝石', '星星', '爱心', '加分']

/**
 * 这一关要不要画收集物（金币、星星）。
 *
 * 现在 80 关里所有收集物都只是装饰：通关只看「机器人到没到终点」，
 * 吃不吃金币根本不影响结果。对一年级学生来说，路上飘着一个金色圆点
 * 就是纯干扰——他只会一路想着去捡，而不是去拼积木。
 *
 * 所以只有这一关的提示/目标真的讲到收集了，才把金币画出来。
 */
function levelMentionsCollectibles(texts: string[]): boolean {
  return texts.some((text) => COLLECTIBLE_WORDS.some((word) => text.includes(word)))
}

export function BlocklyLesson() {
  const student = getCurrentStudent()
  const navigate = useNavigate()
  // 关卡号来自路由：/blockly/lesson/:levelId。老的 ?level= 写法留着当兜底。
  const { levelId: routeLevelId } = useParams<{ levelId: string }>()
  const [searchParams] = useSearchParams()
  const levelId = routeLevelId?.trim() || searchParams.get('level')?.trim() || DEFAULT_LEVEL_ID
  const workspaceRef = useRef<BlocklyWorkspaceHandle>(null)
  const workspaceAreaRef = useRef<HTMLDivElement>(null)
  const resizeGestureRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const executionTreeRef = useRef<BlockExecutionNode[]>([])
  const runTokenRef = useRef(0)
  const [lesson, setLesson] = useState<ModuleLevelLesson | null>(null)
  const [body, setBody] = useState<ModuleLevelBody | null>(null)
  const [gate, setGate] = useState<Awaited<ReturnType<typeof enterLevel>> | null>(null)
  const [workspaceReady, setWorkspaceReady] = useState(false)
  const [programView, setProgramView] = useState<ProgramView>('blocks')
  const [pythonSnapshot, setPythonSnapshot] = useState<PythonCodeSnapshot>({ code: '', error: null })
  const [workspaceHeight, setWorkspaceHeight] = useState<number | null>(null)
  const [blockCount, setBlockCount] = useState(0)
  const [actorState, setActorState] = useState<ActorState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [errorTaps, setErrorTaps] = useState(0)
  const [message, setMessage] = useState('')
  // 运行失败时先不直接给答案：左窗只说「先想想」，点按钮才展开具体诊断。
  const [errorDetail, setErrorDetail] = useState('')
  const [showErrorDetail, setShowErrorDetail] = useState(false)
  const [loadError, setLoadError] = useState('')
  // 关卡音效默认关着，学生自己在顶栏打开。
  const [soundOn, setSoundOn] = useState(isGameSoundEnabled())
  // 学生每做一次操作就加一，小精灵靠它判断「有人操作」还是「干等着」。
  const [activityToken, setActivityToken] = useState(0)
  const [runFailed, setRunFailed] = useState(false)
  // 小精灵点名要盯的东西：工作区、运行按钮或者某一块积木。
  const [focus, setFocus] = useState<ModuleHintFocus | null>(null)
  // 绘本看完了没有。关卡配了 intro_story / review 时，先全屏播绘本再进工作区；
  // 「重新开始」不碰这个状态，所以重试不会重新弹绘本。
  const [storyDone, setStoryDone] = useState(false)
  // 「再试一次」时让小精灵的分步引导从头开始。
  const [stepResetToken, setStepResetToken] = useState(0)
  // 通关后先别急着弹完成层：小精灵先问一个参数问题，学生改过再跑才真正完成。
  const [passed, setPassed] = useState(false)
  const [reflectionPhase, setReflectionPhase] = useState<'question' | 'try' | 'observed' | null>(null)
  const [reflectionChanged, setReflectionChanged] = useState(false)
  const reflectionChangedRef = useRef(false)
  const {
    snapshot: stageSnapshot,
    isRunning: stageIsRunning,
    error: stageError,
    start: startStage,
    stop: stopStage,
    reset: resetStage,
  } = useStageRuntime()
  // 只有学生点过「运行」才结算 Stage，避免初始预览直接触发通关保存。
  const stageRunActiveRef = useRef(false)
  const stageSaveStartedRef = useRef(false)
  const isStage = body?.scene.type === 'stage'

  useEffect(() => {
    if (!student) return
    let alive = true
    setLesson(null)
    setBody(null)
    setGate(null)
    setWorkspaceReady(false)
    setProgramView('blocks')
    setPythonSnapshot({ code: '', error: null })
    executionTreeRef.current = []
    setBlockCount(0)
    setLoadError('')
    setActorState(null)
    setIsRunning(false)
    setIsSaving(false)
    setCompleted(false)
    setMessage('')
    setErrorDetail('')
    setShowErrorDetail(false)
    setErrorTaps(0)
    setRunFailed(false)
    setFocus(null)
    stageRunActiveRef.current = false
    stageSaveStartedRef.current = false
    resetStage()
    // 换关卡才算重新看绘本；同一关内重试不重置。
    setStoryDone(false)
    setActivityToken((value) => value + 1)

    void enterLevel(levelId, MODULE_IDS.blockly)
      .then(async (decision) => {
        if (!alive) return
        setGate(decision)
        if (!decision.allowed) return
        const loaded = await loadModuleLevel(MODULE_IDS.blockly, levelId)
        if (!alive) return
        const parsed = parseModuleLevelBody(loaded.level.body)
        setLesson(loaded.level)
        setBody(parsed)
        if (parsed.scene.type === 'grid') {
          setActorState(createInitialActorState(parsed))
        } else {
          setActorState(null)
          resetStage(compileStageProgram(parsed, [], parsed.scene.variables))
        }
      })
      .catch((error: unknown) => {
        if (!alive) return
        if (error instanceof ApiError && error.status === 404) {
          setGate({ allowed: false, reason: 'not_found' })
          return
        }
        setLoadError(error instanceof Error ? error.message : '这一关没有打开，请稍后再试')
      })

    return () => {
      alive = false
      runTokenRef.current += 1
    }
  }, [student?.id, levelId, resetStage])

  // Stage 由 RAF 持续发布快照；运行结束或报错后在这里结算，不把异步保存塞进解释器。
  useEffect(() => {
    if (!isStage || !body || !stageRunActiveRef.current) return
    const snapshot = stageSnapshot
    const runtimeError = stageError ?? (snapshot?.status === 'error' ? snapshot.failure?.message : null)
    if (runtimeError) {
      stageRunActiveRef.current = false
      setErrorTaps((count) => count + 1)
      setRunFailed(true)
      playGameSound('fail')
      setMessage('')
      const detail = buildFailureDetail(body, snapshot, executionTreeRef.current)
      setErrorDetail(`${runtimeError} ${detail}`)
      setShowErrorDetail(false)
      return
    }
    if (!snapshot) return
    if (snapshot.status === 'finished' && !snapshot.completed) {
      stageRunActiveRef.current = false
      setErrorTaps((count) => count + 1)
      setRunFailed(true)
      playGameSound('fail')
      setMessage('')
      setErrorDetail(buildFailureDetail(body, snapshot, executionTreeRef.current))
      setShowErrorDetail(false)
      return
    }
    if (!snapshot.completed) return
    stageRunActiveRef.current = false
    if (passed || stageSaveStartedRef.current) {
      // 反思阶段再跑一次：不重复保存、不弹完成层；改了参数就进入追问。
      setIsSaving(false)
      if (reflectionChangedRef.current) setReflectionPhase('observed')
      return
    }
    stageSaveStartedRef.current = true
    const token = runTokenRef.current
    setIsSaving(true)
    void completeLevel(levelId, body.completion.stars, errorTaps, MODULE_IDS.blockly)
      .then(() => {
        if (runTokenRef.current !== token) return
        if (body.reflection) {
          setPassed(true)
          setReflectionPhase('question')
        } else {
          setCompleted(true)
        }
        setIsSaving(false)
        playGameSound('win')
      })
      .catch((error: unknown) => {
        if (runTokenRef.current !== token) return
        stageSaveStartedRef.current = false
        setIsSaving(false)
        setErrorTaps((count) => count + 1)
        setRunFailed(true)
        playGameSound('fail')
        const detail = error instanceof Error ? error.message : '这一关没有记下来，请再试一次'
        setMessage(detail)
        setErrorDetail(detail)
        setShowErrorDetail(false)
      })
  }, [body, errorTaps, isStage, levelId, passed, stageError, stageSnapshot])

  const handleWorkspaceReady = useCallback((ready: boolean) => {
    setWorkspaceReady(ready)
  }, [])

  const handleBlocksChange = useCallback((count: number, studentChanged = true) => {
    setBlockCount(count)
    if (studentChanged) setActivityToken((token) => token + 1)
  }, [])

  const handlePythonChange = useCallback((snapshot: PythonCodeSnapshot) => {
    setPythonSnapshot(snapshot)
  }, [])

  const handleFocusChange = useCallback((next: ModuleHintFocus | null) => {
    setFocus(next)
  }, [])

  /**
   * 这一关要不要画金币。
   *
   * 判据是这一关的提示和目标里有没有讲到收集：
   * 讲到才画，没讲到就一个都不画，别拿装饰去干扰一年级学生。
   */
  const showCollectibles = useMemo(() => {
    if (!body) return false
    if (body.scene.type !== 'grid' || !body.scene.entities.length) return false
    return levelMentionsCollectibles([lesson?.goal ?? '', ...body.hints.map((hint) => hint.text)])
  }, [body, lesson?.goal])

  /** 地图下面只显示运行反馈；操作引导统一交给右下角小精灵。 */
  const stageMessage = message

  const run = async () => {
    if (!body || !workspaceReady || isRunning || stageIsRunning || isSaving) return
    const token = runTokenRef.current + 1
    runTokenRef.current = token
    setCompleted(false)
    setMessage('')
    setErrorDetail('')
    setShowErrorDetail(false)
    setRunFailed(false)
    setActivityToken((value) => value + 1)
    if (!isStage) {
      setIsRunning(true)
      setActorState(createInitialActorState(body))
    }

    try {
      const tree = workspaceRef.current?.getExecutionTree() ?? []
      executionTreeRef.current = tree
      const reflection = passed ? body.reflection : undefined
      const changed = reflection
        ? hasDifferentParam(tree, reflection.target.type, reflection.target.arg, reflection.target.current, reflection.target.within, reflection.target.ancestorArgs, reflection.target.nth)
        : false
      reflectionChangedRef.current = changed
      setReflectionChanged(changed)
      if (!tree.length) {
        setErrorTaps((count) => count + 1)
        setRunFailed(true)
        setMessage('')
        setErrorDetail(body.hints.find((hint) => hint.trigger === 'initial')?.text ?? '先把积木拖到工作区，再点运行。')
        setShowErrorDetail(false)
        return
      }

      if (isStage) {
        const program = compileStageProgram(body, tree)
        stageRunActiveRef.current = true
        startStage(program)
        return
      }

      const result = interpretModuleLevel(body, tree)
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // 起点的收集物在初始状态里就吃掉了，只算之后新吃到的。
      let collected = createInitialActorState(body).collectedEntityIds.length
      for (const frame of result.steps) {
        if (runTokenRef.current !== token) return
        setActorState(frame.state)
        if (frame.blocked) {
          playGameSound('bump')
        } else if (frame.moved) {
          playGameSound('step')
          if (frame.state.collectedEntityIds.length > collected) {
            collected = frame.state.collectedEntityIds.length
            // 这一关不教收集的时候金币根本没画出来，别响一个听不见的金币声。
            if (showCollectibles) playGameSound('coin')
          }
        }
        const duration = reduceMotion ? 0 : frame.moved ? body.runtime.move_duration_ms : Math.min(180, body.runtime.move_duration_ms)
        await wait(duration)
      }
      if (runTokenRef.current !== token) return

      if (!result.completed) {
        setErrorTaps((count) => count + 1)
        setRunFailed(true)
        playGameSound('fail')
        setMessage('')
        setErrorDetail(body.hints.find((hint) => hint.trigger === 'not_completed')?.text ?? resultMessage(result))
        setShowErrorDetail(false)
        if (passed && reflectionChangedRef.current) setReflectionPhase('observed')
        return
      }

      if (passed) {
        if (reflectionChangedRef.current) setReflectionPhase('observed')
        return
      }
      setIsSaving(true)
      await completeLevel(levelId, body.completion.stars, errorTaps, MODULE_IDS.blockly)
      if (runTokenRef.current !== token) return
      if (body.reflection) {
        setPassed(true)
        setReflectionPhase('question')
      } else {
        setCompleted(true)
      }
      playGameSound('win')
    } catch (error: unknown) {
      if (runTokenRef.current !== token) return
      stageRunActiveRef.current = false
      setErrorTaps((count) => count + 1)
      setRunFailed(true)
      playGameSound('fail')
      const detail = error instanceof Error ? error.message : '程序没有运行成功，请再试一次'
      setMessage(detail)
      setErrorDetail(detail)
      setShowErrorDetail(false)
    } finally {
      if (runTokenRef.current === token) {
        if (!isStage) setIsRunning(false)
        setIsSaving(false)
      }
    }
  }

  const retry = () => {
    runTokenRef.current += 1
    stageRunActiveRef.current = false
    stageSaveStartedRef.current = false
    executionTreeRef.current = []
    workspaceRef.current?.reset()
    if (isStage) resetStage()
    setIsRunning(false)
    setIsSaving(false)
    setCompleted(false)
    setPassed(false)
    setReflectionPhase(null)
    setReflectionChanged(false)
    reflectionChangedRef.current = false
    setMessage('')
    setErrorDetail('')
    setShowErrorDetail(false)
    setErrorTaps(0)
    setRunFailed(false)
    setStepResetToken((value) => value + 1)
    setActivityToken((value) => value + 1)
    if (body?.scene.type === 'grid') setActorState(createInitialActorState(body))
  }

  const stop = () => {
    if (!stageIsRunning) return
    runTokenRef.current += 1
    stageRunActiveRef.current = false
    stageSaveStartedRef.current = false
    stopStage()
    setIsRunning(false)
    setIsSaving(false)
    setMessage('程序已停止，可以调整积木后再运行。')
  }

  const selectProgramView = (next: ProgramView) => {
    if (next === 'code' && !workspaceReady) return
    if (next === 'code') {
      try {
        setPythonSnapshot({ code: workspaceRef.current?.getPythonCode() ?? '', error: null })
      } catch (error: unknown) {
        setPythonSnapshot({ code: '', error: error instanceof Error ? error.message : 'Python 代码预览生成失败' })
      }
    }
    setProgramView(next)
  }

  const handleProgramViewKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const next: ProgramView = event.key === 'Home'
      ? 'blocks'
      : event.key === 'End'
        ? 'code'
        : programView === 'blocks' ? 'code' : 'blocks'
    selectProgramView(next)
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-program-view="${next}"]`)?.focus()
  }

  const handleWorkspaceResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const height = workspaceAreaRef.current?.getBoundingClientRect().height ?? WORKSPACE_MIN_HEIGHT
    resizeGestureRef.current = { startY: event.clientY, startHeight: height }
    event.currentTarget.setPointerCapture(event.pointerId)
    setWorkspaceHeight(height)
    event.preventDefault()
  }

  const handleWorkspaceResizeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = resizeGestureRef.current
    if (!gesture) return
    setWorkspaceHeight(clampWorkspaceHeight(gesture.startHeight + event.clientY - gesture.startY))
  }

  const handleWorkspaceResizeEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    resizeGestureRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleWorkspaceResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const currentHeight = workspaceHeight ?? workspaceAreaRef.current?.getBoundingClientRect().height ?? WORKSPACE_MIN_HEIGHT
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? WORKSPACE_HEIGHT_STEP : -WORKSPACE_HEIGHT_STEP
      setWorkspaceHeight(clampWorkspaceHeight(currentHeight + delta))
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setWorkspaceHeight(event.key === 'Home' ? WORKSPACE_MIN_HEIGHT : WORKSPACE_MAX_HEIGHT)
    }
  }

  const running = isStage ? stageIsRunning : isRunning
  const failureProgress = runFailed && stageSnapshot && body ? buildFailureProgress(body, stageSnapshot) : []

  if (!student) return <Navigate to="/student/login" replace />

  if (loadError) {
    return (
      <div className="student-shell flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <p className="text-xl text-ink">{loadError}</p>
        <Link to={MAP_HREF} className="btn-primary">回到课程地图</Link>
      </div>
    )
  }

  if (gate && !gate.allowed) {
    return (
      <div className="student-shell flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <p className="text-xl text-ink">{ENTER_COPY[gate.reason]}</p>
        <Link to={MAP_HREF} className="btn-primary">回到课程地图</Link>
      </div>
    )
  }

  if (!lesson || !body || !gate || (body.scene.type === 'grid' && !actorState) || (body.scene.type === 'stage' && !stageSnapshot)) {
    return (
      <div className="student-shell flex min-h-screen items-center justify-center bg-canvas" role="status" aria-label="正在打开这一关">
        <div className="grid w-full max-w-7xl gap-6 px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-8">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  // 无师化：关卡配了绘本或复习卡时，先全屏把绘本播完，再进工作区。
  // 没配的旧关卡（body 里没有这两个字段）直接往下走，流程完全不变。
  if (!storyDone && hasIntroMaterial(body)) {
    return (
      <StoryPlayer
        introStory={body.intro_story}
        review={body.review}
        title={lesson.title}
        levelNumber={levelNumber(levelId)}
        onFinish={() => setStoryDone(true)}
      />
    )
  }

  // 通关后的思考题由页面接管小精灵气泡；学生改参数跑过一次才进入总结。
  const reflection = body.reflection
  const npcPrompt = passed && reflection && reflectionPhase
    ? {
        text: reflectionPhase === 'question'
          ? reflection.question
          : reflectionPhase === 'try'
            ? reflectionChanged ? reflection.try_text : reflection.fail_text
            : reflection.ran_text,
        buttonLabel: reflectionPhase === 'question'
          ? '我来试试'
          : reflectionPhase === 'observed'
            ? '我明白了，完成'
            : '',
        onAction: () => {
          if (reflectionPhase === 'question') setReflectionPhase('try')
          else if (reflectionPhase === 'observed') setCompleted(true)
        },
      }
    : undefined

  return (
    <div className="student-shell flex min-h-screen flex-col bg-canvas lg:min-h-dvh">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 p-6 lg:px-8">
          <Link to={MAP_HREF} className="btn-ghost px-2" aria-label="返回课程地图">←</Link>
          <BrandMark size={30} />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-ink">第 {levelNumber(levelId)} 关 · {lesson.title}</h1>
            <p className="truncate text-sm text-ink-soft">{lesson.goal}</p>
          </div>
          <span className="ml-auto rounded-field bg-success-soft px-3 py-2 text-sm font-semibold text-success">Blockly</span>
          <button
            type="button"
            className="btn-ghost px-3"
            aria-pressed={soundOn}
            aria-label={soundOn ? '关闭关卡音效' : '打开关卡音效'}
            onClick={() => setSoundOn(toggleGameSound())}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 pb-24 sm:p-6 lg:min-h-0 lg:px-8 lg:pb-24">
        {/* 左边舞台窄一点，右边工作区宽一点；桌面端工作区默认接近视口高度，可由下沿继续拉高。 */}
        <div className="flex min-h-0 flex-1 flex-col gap-6 lg:min-h-0 lg:flex-row lg:items-stretch">
          <section className="card min-w-0 rounded-xl p-5 sm:p-6 lg:min-h-0 lg:w-5/12 lg:overflow-y-auto" aria-labelledby="stage-title">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand-strong">{isStage ? '看角色动起来' : '看角色走一走'}</p>
                <h2 id="stage-title" className="mt-1 text-xl font-bold text-ink">{isStage ? '自由舞台' : '从起点到终点'}</h2>
              </div>
            </div>
            {body.scene.type === 'stage' ? (
              stageSnapshot ? <StageStage scene={body.scene} snapshot={stageSnapshot} isRunning={stageIsRunning} /> : null
            ) : actorState ? (
              <GridStage
                scene={gridSceneOf(body)}
                actorState={actorState}
                animationDurationMs={body.runtime.move_duration_ms}
                showTrail={body.visuals?.show_trail ?? false}
                showCollectibles={showCollectibles}
              />
            ) : null}
            {runFailed && errorDetail ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4" aria-live="polite">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 18h6M10 21h4M8.2 14.5A6 6 0 1 1 15.8 14.5c-.9.7-1.3 1.4-1.3 2.5h-5c0-1.1-.4-1.8-1.3-2.5Z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-amber-900">{showErrorDetail ? '错误线索' : '再找找线索'}</p>
                      {!showErrorDetail && failureProgress.length ? (
                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-amber-700">目标还没完成</span>
                      ) : null}
                    </div>
                    <p className={`mt-1 text-sm leading-relaxed ${showErrorDetail ? 'text-ink' : 'text-ink-soft'}`}>
                      {showErrorDetail ? errorDetail : '先想想错误在哪里。'}
                    </p>
                    {failureProgress.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {failureProgress.map((item) => (
                          <span
                            key={item.label}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white/85 px-2.5 py-1.5 text-xs font-semibold text-amber-800"
                            aria-label={`${item.label}：${String(item.current)} / ${String(item.target)}`}
                          >
                            <span>{item.label}</span>
                            <span className="tabular-nums">{String(item.current)} / {String(item.target)}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="btn-ghost mt-2 px-3 py-1 text-sm"
                      aria-expanded={showErrorDetail}
                      onClick={() => setShowErrorDetail((shown) => !shown)}
                    >
                      {showErrorDetail ? '收起错误信息' : '查看错误信息'}
                    </button>
                  </div>
                </div>
              </div>
            ) : stageMessage ? (
              <p className="mt-4 text-sm text-ink-soft" aria-live="polite">
                {stageMessage}
              </p>
            ) : showCollectibles ? (
              <p className="mt-4 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-700">
                吃到金币可以加分哦
              </p>
            ) : null}
          </section>

          <section className="flex min-w-0 flex-1 flex-col gap-3 lg:min-h-0 lg:w-7/12" aria-labelledby="workspace-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand-strong">{programView === 'code' ? '从积木到代码' : '动手试一试'}</p>
                <h2 id="workspace-title" className="mt-1 text-xl font-bold text-ink">{programView === 'code' ? '查看 Python 代码' : '搭建你的程序'}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div
                  role="tablist"
                  aria-label="切换编程视图"
                  className="inline-flex rounded-lg bg-slate-100 p-1"
                  onKeyDown={handleProgramViewKeyDown}
                >
                  <button
                    type="button"
                    role="tab"
                    id="blocks-view-tab"
                    aria-controls="program-view"
                    aria-selected={programView === 'blocks'}
                    tabIndex={programView === 'blocks' ? 0 : -1}
                    data-program-view="blocks"
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                      programView === 'blocks' ? 'bg-white text-brand-strong shadow-sm' : 'text-ink-soft hover:text-ink'
                    }`}
                    onClick={() => selectProgramView('blocks')}
                  >
                    积木视图
                  </button>
                  <button
                    type="button"
                    role="tab"
                    id="code-view-tab"
                    aria-controls="program-view"
                    aria-selected={programView === 'code'}
                    tabIndex={programView === 'code' ? 0 : -1}
                    data-program-view="code"
                    disabled={!workspaceReady}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50 ${
                      programView === 'code' ? 'bg-white text-brand-strong shadow-sm' : 'text-ink-soft hover:text-ink'
                    }`}
                    onClick={() => selectProgramView('code')}
                  >
                    Python 代码
                  </button>
                </div>
                <div className="text-right">
                  <p role="status" aria-live="polite" aria-label="工作区积木数量" className="text-sm font-semibold text-ink-soft">
                    已用 {blockCount} / 最多 {body.workspace.max_blocks}
                  </p>
                  {blockCount >= body.workspace.max_blocks ? (
                    <p className="mt-1 text-xs text-amber-700">已达上限，删除一块后再加新的</p>
                  ) : null}
                </div>
              </div>
            </div>
            <div
              ref={workspaceAreaRef}
              id="program-view"
              role="tabpanel"
              aria-labelledby={programView === 'blocks' ? 'blocks-view-tab' : 'code-view-tab'}
              data-testid="blockly-workspace-area"
              className="flex h-[60vh] min-h-[420px] shrink-0 flex-col gap-3 lg:h-[calc(100dvh-16rem)] lg:min-h-[520px] lg:flex-row"
              style={workspaceHeight !== null ? { height: workspaceHeight } : undefined}
            >
              <div className={`min-h-0 w-full flex-1 flex-col gap-3 ${programView === 'blocks' ? 'flex lg:flex-row' : 'hidden'}`}>
                <BlocklyWorkspace
                  ref={workspaceRef}
                  availableBlocks={body.available_blocks}
                  initialBlocks={body.workspace.initial_blocks}
                  maxBlocks={body.workspace.max_blocks}
                  parallelScripts={body.scene.type === 'stage'}
                  initialVariables={body.scene.type === 'stage' ? body.scene.variables : undefined}
                  variableValues={isStage && stageSnapshot ? stageSnapshot.variables : undefined}
                  onReadyChange={handleWorkspaceReady}
                  onBlocksChange={handleBlocksChange}
                  onPythonChange={handlePythonChange}
                  highlightBlockType={focus?.target === 'block' ? focus.blockType ?? null : null}
                  focusWorkspace={focus?.target === 'workspace'}
                  active={programView === 'blocks'}
                />
              </div>
              {programView === 'code' ? <PythonCodeView code={pythonSnapshot.code} error={pythonSnapshot.error} /> : null}
            </div>
            {programView === 'blocks' ? (
              <div
                role="separator"
                aria-label="调整积木工作区高度"
                aria-orientation="horizontal"
                aria-valuemin={WORKSPACE_MIN_HEIGHT}
                aria-valuemax={WORKSPACE_MAX_HEIGHT}
                aria-valuenow={workspaceHeight ?? WORKSPACE_MIN_HEIGHT}
                aria-valuetext={workspaceHeight === null ? '默认高度' : `${workspaceHeight} 像素`}
                tabIndex={0}
                data-testid="workspace-resize-handle"
                title="上下拖动调整工作区高度，双击恢复"
                className="group -my-1 flex h-5 shrink-0 cursor-row-resize touch-none select-none items-center justify-center rounded-md text-slate-400 transition hover:bg-brand-soft/30 hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                onPointerDown={handleWorkspaceResizeStart}
                onPointerMove={handleWorkspaceResizeMove}
                onPointerUp={handleWorkspaceResizeEnd}
                onPointerCancel={handleWorkspaceResizeEnd}
                onLostPointerCapture={() => { resizeGestureRef.current = null }}
                onKeyDown={handleWorkspaceResizeKeyDown}
                onDoubleClick={() => setWorkspaceHeight(null)}
              >
                <span className="h-1 w-12 rounded-full bg-current opacity-60 transition group-hover:w-16" aria-hidden="true" />
              </div>
            ) : null}
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <button
                type="button"
                className={`btn-primary px-8 text-lg disabled:cursor-not-allowed disabled:opacity-50 ${
                  focus?.target === 'run' ? 'matu-focus-ring' : ''
                }`}
                disabled={!workspaceReady || running || isSaving}
                onClick={() => void run()}
              >
                {isSaving ? '正在记录…' : running ? '运行中…' : '运行'}
              </button>
              {isStage && stageIsRunning ? (
                <button type="button" className="btn-secondary" onClick={stop}>停止</button>
              ) : null}
              <button type="button" className="btn-secondary" disabled={running || isSaving} onClick={retry}>重新开始</button>
            </div>
          </section>
        </div>
      </main>

      <BlocklyNpc
        key={`${levelId}-${stepResetToken}`}
        hints={body.hints}
        availableBlocks={body.available_blocks}
        activityToken={activityToken}
        runFailed={runFailed}
        completed={completed}
        teachingSteps={body.teaching_steps}
        onCheckStep={(index) => {
          const step = body.teaching_steps?.[index]
          if (!step) return { ok: false }
          return checkTeachingStep(step, workspaceRef.current?.getExecutionTree() ?? [])
        }}
        onRun={() => void run()}
        prompt={npcPrompt}
        onFocusChange={handleFocusChange}
      />

      {completed ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-canvas/95 px-6" role="dialog" aria-modal="true" aria-labelledby="completion-title">
          <div className="card fade-up w-full max-w-xl p-10 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-soft text-4xl text-success">✓</div>
            <h2 id="completion-title" className="mt-6 text-3xl font-bold text-ink">这一关完成了</h2>
            <p className="mt-3 text-ink-soft">{body.completion.success_text}</p>
            <p className="mt-4 text-lg tracking-[0.2em] text-amber-500" aria-label={`${body.completion.stars} 星`}>
              {'★'.repeat(body.completion.stars)}{'☆'.repeat(3 - body.completion.stars)}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button type="button" className="btn-primary px-8" onClick={retry}>再试一次</button>
              <button type="button" className="btn-secondary" onClick={() => navigate(MAP_HREF)}>
                返回地图
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
