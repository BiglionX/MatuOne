import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MODULE_IDS } from '../../../supabase/functions/_shared/moduleRegistry'
import { completeLevel, loadModuleLevel } from '@/api/learning'
import { enterLevel, type EnterLevelReason, type ModuleLevelLesson } from '@/api/studentLevel'
import { getCurrentStudent } from '@/api/studentAuth'
import { BrandMark } from '@/components/BrandMark'
import { Skeleton } from '@/components/Skeleton'
import { ApiError } from '@/lib/apiError'
import { isGameSoundEnabled, playGameSound, toggleGameSound } from '@/lib/gameSounds'
import { parseModuleLevelBody, gridSceneOf, hasIntroMaterial, type ModuleHintFocus, type ModuleLevelBody } from '@/modules/curriculum/moduleLevelBody'
import {
  createInitialActorState,
  interpretModuleLevel,
  type ActorState,
  type ModuleExecutionResult,
} from '@/modules/curriculum/moduleLevelInterpreter'
import { compileStageProgram } from '@/modules/curriculum/moduleStageInterpreter'
import { BlocklyNpc } from './BlocklyNpc'
import { BlocklyWorkspace, type BlocklyWorkspaceHandle } from './BlocklyWorkspace'
import { GridStage } from './GridStage'
import { StageStage } from './StageStage'
import { StoryPlayer } from './StoryPlayer'
import { useStageRuntime } from './useStageRuntime'

const DEFAULT_LEVEL_ID = 'blk-001'
const MAP_HREF = '/blockly'

/** blk-001 这类关卡号；取最后一段数字当关卡序号。 */
function levelNumber(levelId: string): number {
  const matched = /(\d+)\s*$/.exec(levelId)
  return matched ? Number(matched[1]) : 1
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
  const runTokenRef = useRef(0)
  const [lesson, setLesson] = useState<ModuleLevelLesson | null>(null)
  const [body, setBody] = useState<ModuleLevelBody | null>(null)
  const [gate, setGate] = useState<Awaited<ReturnType<typeof enterLevel>> | null>(null)
  const [workspaceReady, setWorkspaceReady] = useState(false)
  const [blockCount, setBlockCount] = useState(0)
  const [actorState, setActorState] = useState<ActorState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [errorTaps, setErrorTaps] = useState(0)
  const [message, setMessage] = useState('')
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
    setBlockCount(0)
    setLoadError('')
    setActorState(null)
    setIsRunning(false)
    setIsSaving(false)
    setCompleted(false)
    setMessage('')
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
      setMessage(runtimeError)
      return
    }
    if (!snapshot) return
    if (snapshot.status === 'finished' && !snapshot.completed) {
      stageRunActiveRef.current = false
      setErrorTaps((count) => count + 1)
      setRunFailed(true)
      playGameSound('fail')
      setMessage(body.hints.find((hint) => hint.trigger === 'not_completed')?.text ?? '程序结束了，可是还没有完成目标。')
      return
    }
    if (!snapshot.completed || stageSaveStartedRef.current) return

    stageRunActiveRef.current = false
    stageSaveStartedRef.current = true
    const token = runTokenRef.current
    setIsSaving(true)
    void completeLevel(levelId, body.completion.stars, errorTaps, MODULE_IDS.blockly)
      .then(() => {
        if (runTokenRef.current !== token) return
        setCompleted(true)
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
        setMessage(error instanceof Error ? error.message : '这一关没有记下来，请再试一次')
      })
  }, [body, errorTaps, isStage, levelId, stageError, stageSnapshot])

  const handleWorkspaceReady = useCallback((ready: boolean) => {
    setWorkspaceReady(ready)
  }, [])

  const handleBlocksChange = useCallback((count: number, studentChanged = true) => {
    setBlockCount(count)
    if (studentChanged) setActivityToken((token) => token + 1)
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

  /**
   * 地图下面那行字。
   *
   * 平时不重复小精灵的开场提示（那才是讲「这一关要干什么」的地方），
   * 只在运行之后换成运行反馈；没反馈时就给三步操作指引。
   */
  const stageMessage = message

  const run = async () => {
    if (!body || !workspaceReady || isRunning || stageIsRunning || isSaving) return
    const token = runTokenRef.current + 1
    runTokenRef.current = token
    setCompleted(false)
    setMessage('')
    setRunFailed(false)
    setActivityToken((value) => value + 1)
    if (!isStage) {
      setIsRunning(true)
      setActorState(createInitialActorState(body))
    }

    try {
      const tree = workspaceRef.current?.getExecutionTree() ?? []
      if (!tree.length) {
        setErrorTaps((count) => count + 1)
        setRunFailed(true)
        setMessage(body.hints.find((hint) => hint.trigger === 'initial')?.text ?? '先把积木拖到工作区，再点运行。')
        return
      }

      if (isStage) {
        const program = compileStageProgram(body, tree, workspaceRef.current?.getVariables() ?? [])
        stageRunActiveRef.current = true
        stageSaveStartedRef.current = false
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
        setMessage(body.hints.find((hint) => hint.trigger === 'not_completed')?.text ?? resultMessage(result))
        return
      }

      setIsSaving(true)
      await completeLevel(levelId, body.completion.stars, errorTaps, MODULE_IDS.blockly)
      if (runTokenRef.current !== token) return
      setCompleted(true)
      playGameSound('win')
    } catch (error: unknown) {
      if (runTokenRef.current !== token) return
      stageRunActiveRef.current = false
      setErrorTaps((count) => count + 1)
      setRunFailed(true)
      playGameSound('fail')
      setMessage(error instanceof Error ? error.message : '程序没有运行成功，请再试一次')
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
    workspaceRef.current?.reset()
    if (isStage) resetStage()
    setIsRunning(false)
    setIsSaving(false)
    setCompleted(false)
    setMessage('')
    setErrorTaps(0)
    setRunFailed(false)
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

  const running = isStage ? stageIsRunning : isRunning

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
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
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

  return (
    <div className="student-shell flex min-h-screen flex-col bg-canvas">
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

      <main className="mx-auto w-full max-w-7xl flex-1 p-6 pb-28 lg:px-8">
        {/* 左边地图窄一点，右边工作区宽一点——积木区被挤窄了就没法拖了。 */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section className="card p-5 sm:p-6" aria-labelledby="stage-title">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand-strong">{isStage ? '看角色动起来' : '看角色走一走'}</p>
                <h2 id="stage-title" className="mt-1 text-xl font-bold text-ink">{isStage ? '自由舞台' : '从起点到终点'}</h2>
              </div>
            </div>
            {body.scene.type === 'stage' ? (
              stageSnapshot ? <StageStage scene={body.scene} snapshot={stageSnapshot} /> : null
            ) : actorState ? (
              <GridStage
                scene={gridSceneOf(body)}
                actorState={actorState}
                animationDurationMs={body.runtime.move_duration_ms}
                showTrail={body.visuals?.show_trail ?? false}
                showCollectibles={showCollectibles}
              />
            ) : null}
            {stageMessage ? (
              <p className="mt-4 text-sm text-ink-soft" aria-live="polite">
                {stageMessage}
              </p>
            ) : (
              <ol className="mt-4 flex flex-wrap items-center gap-2" aria-label="怎么玩">
                <li className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-strong">
                  ① 从左边拖积木
                </li>
                <li className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-strong">
                  ② {isStage ? '可以搭多条链' : '连成一条'}
                </li>
                <li className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-strong">
                  ③ 点「运行」
                </li>
                {showCollectibles ? (
                  <li className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-700">
                    吃到金币可以加分哦
                  </li>
                ) : null}
              </ol>
            )}
          </section>

          <section className="space-y-4" aria-labelledby="workspace-title">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand-strong">动手试一试</p>
                <h2 id="workspace-title" className="mt-1 text-xl font-bold text-ink">搭建你的程序</h2>
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
            <BlocklyWorkspace
              ref={workspaceRef}
              availableBlocks={body.available_blocks}
              initialBlocks={body.workspace.initial_blocks}
              maxBlocks={body.workspace.max_blocks}
              initialVariables={body.scene.type === 'stage' ? body.scene.variables : undefined}
              onReadyChange={handleWorkspaceReady}
              onBlocksChange={handleBlocksChange}
              highlightBlockType={focus?.target === 'block' ? focus.blockType ?? null : null}
              focusWorkspace={focus?.target === 'workspace'}
            />
            <div className="flex flex-wrap items-center gap-3">
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
        hints={body.hints}
        availableBlocks={body.available_blocks}
        activityToken={activityToken}
        runFailed={runFailed}
        completed={completed}
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
