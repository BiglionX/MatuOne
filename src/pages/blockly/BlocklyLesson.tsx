import { useCallback, useEffect, useRef, useState } from 'react'
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
import { BlocklyNpc } from './BlocklyNpc'
import { BlocklyWorkspace, type BlocklyWorkspaceHandle } from './BlocklyWorkspace'
import { GridStage } from './GridStage'
import { StoryPlayer } from './StoryPlayer'

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

  useEffect(() => {
    if (!student) return
    let alive = true
    setLesson(null)
    setBody(null)
    setGate(null)
    setWorkspaceReady(false)
    setLoadError('')
    setCompleted(false)
    setMessage('')
    setErrorTaps(0)
    setRunFailed(false)
    setFocus(null)
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
        setActorState(createInitialActorState(parsed))
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
  }, [student?.id, levelId])

  const handleWorkspaceReady = useCallback((ready: boolean) => {
    setWorkspaceReady(ready)
  }, [])

  const handleBlocksChange = useCallback(() => {
    setActivityToken((token) => token + 1)
  }, [])

  const handleFocusChange = useCallback((next: ModuleHintFocus | null) => {
    setFocus(next)
  }, [])

  const run = async () => {
    if (!body || !workspaceReady || isRunning || isSaving) return
    const token = runTokenRef.current + 1
    runTokenRef.current = token
    setIsRunning(true)
    setCompleted(false)
    setMessage('')
    setRunFailed(false)
    setActivityToken((value) => value + 1)
    setActorState(createInitialActorState(body))

    try {
      const tree = workspaceRef.current?.getExecutionTree() ?? []
      if (!tree.length) {
        setErrorTaps((count) => count + 1)
        setRunFailed(true)
        setMessage(body.hints.find((hint) => hint.trigger === 'initial')?.text ?? '先把积木拖到工作区，再点运行。')
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
            playGameSound('coin')
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
      setErrorTaps((count) => count + 1)
      setRunFailed(true)
      playGameSound('fail')
      setMessage(error instanceof Error ? error.message : '程序没有运行成功，请再试一次')
    } finally {
      if (runTokenRef.current === token) {
        setIsRunning(false)
        setIsSaving(false)
      }
    }
  }

  const retry = () => {
    runTokenRef.current += 1
    workspaceRef.current?.reset()
    setIsRunning(false)
    setIsSaving(false)
    setCompleted(false)
    setMessage('')
    setErrorTaps(0)
    setRunFailed(false)
    setActivityToken((value) => value + 1)
    if (body) setActorState(createInitialActorState(body))
  }

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

  if (!lesson || !body || !actorState || !gate) {
    return (
      <div className="student-shell flex min-h-screen items-center justify-center bg-canvas" role="status" aria-label="正在打开这一关">
        <div className="grid w-full max-w-6xl gap-6 px-6 lg:grid-cols-2 lg:px-8">
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
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 p-6 lg:px-8">
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

      <main className="mx-auto w-full max-w-6xl flex-1 p-6 lg:p-8">
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section className="card p-5 sm:p-6" aria-labelledby="stage-title">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand-strong">看角色走一走</p>
                <h2 id="stage-title" className="mt-1 text-xl font-bold text-ink">从起点到终点</h2>
              </div>
              <span className="text-sm text-ink-soft">最多 {body.workspace.max_blocks} 块积木</span>
            </div>
            <GridStage
              scene={gridSceneOf(body)}
              actorState={actorState}
              animationDurationMs={body.runtime.move_duration_ms}
              showTrail={body.visuals?.show_trail ?? false}
            />
            <p className="mt-4 text-sm text-ink-soft" aria-live="polite">
              {message || body.hints.find((hint) => hint.trigger === 'initial')?.text || '拖一块积木，再点运行。'}
            </p>
          </section>

          <section className="space-y-4" aria-labelledby="workspace-title">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand-strong">动手试一试</p>
                <h2 id="workspace-title" className="mt-1 text-xl font-bold text-ink">搭建你的程序</h2>
              </div>
              <span className="text-sm text-ink-soft">最多 {body.workspace.max_blocks} 块积木</span>
            </div>
            <BlocklyWorkspace
              ref={workspaceRef}
              availableBlocks={body.available_blocks}
              initialBlocks={body.workspace.initial_blocks}
              maxBlocks={body.workspace.max_blocks}
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
                disabled={!workspaceReady || isRunning || isSaving}
                onClick={() => void run()}
              >
                {isSaving ? '正在记录…' : isRunning ? '运行中…' : '运行'}
              </button>
              <button type="button" className="btn-secondary" disabled={isRunning || isSaving} onClick={retry}>重新开始</button>
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-canvas/95 px-6" role="dialog" aria-modal="true" aria-labelledby="completion-title">
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
