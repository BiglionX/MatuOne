import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { loadPreviewLevel } from '@/api/catalog'
import { completeLevel, loadLevel, touchLevel } from '@/api/learning'
import { BonusRound } from './BonusRound'
import { ChunkDrill } from '@/components/ChunkDrill'
import { getPlatformProfile } from '@/api/adminOrgs'
import { curriculumLevelById, isPlaceholderLevel, nextLevelId } from '@/data/fullCurriculum'
import { enterLevel, type EnterLevelReason } from '@/api/studentLevel'
import { getCurrentStudent } from '@/api/studentAuth'
import type { Level, RunResult } from '@/types'
import { buildDemoCode, runCode } from '@/lib/runner'
import { usePythonEnv } from '@/lib/usePythonEnv'
import { Stars } from '@/components/WpmChart'
import { CommandStory } from '@/components/CommandStory'
import { BrandMark } from '@/components/BrandMark'
import { RoundA } from './rounds/RoundA'
import { RoundB } from './rounds/RoundB'
import { RoundC } from './rounds/RoundC'
import { FillBlank } from './rounds/FillBlank'
import { LoopFold } from './rounds/LoopFold'

type Round = 'A' | 'B' | 'C'

const ROUND_META: { key: Round; label: string; sub: string }[] = [
  { key: 'A', label: '看效果', sub: '先猜一猜' },
  { key: 'B', label: '抄代码', sub: '一行一行来' },
  { key: 'C', label: '改一改', sub: '换个数字试试' },
]

const ENTER_COPY: Record<EnterLevelReason, string> = {
  ok: '',
  unauthenticated: '请先登录',
  org_expired: '本机构服务已到期，请联系老师',
  org_disabled: '机构已停用，请联系老师',
  trial_locked: '试用期间只能学习前 3 关',
  not_entitled: '老师还没有为你开通这一关',
  course_locked: '本机构尚未开通该阶段课程，请联系老师',
  not_found: '没有找到这一关',
}

function PreviewBanner() {
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 border-b border-warning bg-warning-soft px-4 py-2.5 text-center text-sm font-semibold text-ink shadow-card"
    >
      预览模式（不会记录学习进度）
    </div>
  )
}

function PlaceholderBanner({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <p className="bg-warning-soft px-8 py-3 text-center text-sm text-ink">
      教研老师正在努力制作这节课的动画，你可以先体验基础的代码运行。
    </p>
  )
}

const ENCOURAGE = [
  '代码不是背下来的，是一行一行打出来的。',
  '刚才那几行，是你自己敲出来的。',
  '眼睛看清楚，手指慢一点，就对了。',
  '接下来这一步，只是改一个数字。',
]

export function Lesson() {
  const { levelId } = useParams()
  const [searchParams] = useSearchParams()
  const preview = searchParams.get('preview') === 'true'
  const navigate = useNavigate()
  const student = getCurrentStudent()
  const staff = preview ? getPlatformProfile() : null
  const [level, setLevel] = useState<Level | null>(null)
  const [missing, setMissing] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [round, setRound] = useState<Round>('A')
  const [gate, setGate] = useState<Awaited<ReturnType<typeof enterLevel>> | null>(null)
  const [targetResult, setTargetResult] = useState<RunResult | null>(null)
  const [errorTaps, setErrorTaps] = useState(0)
  const [breakOverlay, setBreakOverlay] = useState<{ next: Round; line: string } | null>(null)
  const [storyOpen, setStoryOpen] = useState(true)
  const [finished, setFinished] = useState(false)
  const [bonusOpen, setBonusOpen] = useState(false)
  const [bonusReward, setBonusReward] = useState('')
  const [reviewChunk, setReviewChunk] = useState<string | null>(null)
  const [recallDone, setRecallDone] = useState(true)
  // 页面从 A 回合打开。趁学生看效果、猜答案，后台把 Pyodide 下好。
  const pythonPhase = usePythonEnv(round === 'A')

  useEffect(() => {
    if (!levelId) return
    if (preview) {
      if (!staff) return
      let alive = true
      setLevel(null)
      setMissing(false)
      setPreviewError('')
      setGate({ allowed: true, reason: 'ok' })
      setFinished(false)
      setRound('A')
      setReviewChunk(null)
      setRecallDone(true)
      loadPreviewLevel(levelId)
        .then((next) => {
          if (!alive) return
          setLevel(next.level)
          setReviewChunk(next.reviewChunk)
          setRecallDone(!next.reviewChunk)
        })
        .catch((err: unknown) => {
          if (!alive) return
          setPreviewError(err instanceof Error ? err.message : '试课打开失败')
        })
      return () => {
        alive = false
      }
    }
    if (!student) return
    let alive = true
    setLevel(null)
    setMissing(false)
    setGate(null)
    setFinished(false)
    setRound('A')
    setReviewChunk(null)
    setRecallDone(true)
    enterLevel(levelId)
      .then(async (result) => {
        if (!alive) return
        setGate(result)
        if (!result.allowed) return
        void touchLevel(levelId)
        try {
          const next = await loadLevel(levelId)
          if (!alive) return
          setLevel(next.level)
          setReviewChunk(next.reviewChunk)
          setRecallDone(!next.reviewChunk)
        } catch {
          if (alive) setMissing(true)
        }
      })
      .catch(() => {
        if (alive) setMissing(true)
      })
    return () => {
      alive = false
    }
  }, [levelId, preview, staff?.displayName, student?.id])

  useEffect(() => {
    if (!level || !gate?.allowed) return
    let alive = true
    runCode(buildDemoCode(level), level.level_id).then((res) => {
      if (alive) setTargetResult(res)
    })
    return () => {
      alive = false
    }
  }, [level, gate])

  if (preview && !staff) {
    return (
      <div className="student-shell min-h-screen bg-canvas pt-12">
        <PreviewBanner />
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-xl text-ink">请先登录平台后台，再试课。</p>
          <Link to="/admin/login" className="btn-primary">
            去登录
          </Link>
        </div>
      </div>
    )
  }

  if (!preview && !student) return <Navigate to="/student/login" replace />

  const catalogLevel = levelId ? curriculumLevelById(levelId) : undefined
  const placeholderLesson = isPlaceholderLevel(catalogLevel ?? level ?? { title: '' })

  if (preview && previewError) {
    return (
      <div className="student-shell flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas pt-12">
        <PreviewBanner />
        <p className="text-xl text-ink">{previewError}</p>
        <Link to="/admin/levels" className="btn-primary">
          回到课程管理
        </Link>
      </div>
    )
  }

  if (missing || (gate && !gate.allowed && gate.reason === 'not_found')) {
    return (
      <div className="student-shell flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas pt-12">
        {preview && <PreviewBanner />}
        <p className="text-xl text-ink">没有找到这一关</p>
        <Link to={preview ? '/admin/levels' : '/student'} className="btn-primary">
          {preview ? '回到课程管理' : '回到课程地图'}
        </Link>
      </div>
    )
  }

  if (gate && !gate.allowed) {
    return (
      <div className="student-shell min-h-screen bg-canvas">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-xl text-ink">{ENTER_COPY[gate.reason]}</p>
          {gate.reason === 'course_locked' && <p className="max-w-md text-base text-ink-soft">请联系平台升级课程包。</p>}
          <Link to="/student" className="btn-primary">
            回到课程地图
          </Link>
        </div>
      </div>
    )
  }

  if (!level || !gate) {
    return (
      <div className={`student-shell flex min-h-screen items-center justify-center bg-canvas ${preview ? 'pt-12' : ''}`}>
        {preview && <PreviewBanner />}
        <p className="text-xl text-ink">{preview ? '正在打开试课…' : '正在确认能不能进入这一关'}</p>
      </div>
    )
  }

  if (!recallDone && reviewChunk) {
    return (
      <div className={`student-shell min-h-screen bg-canvas ${preview ? 'pt-12' : ''}`}>
        {preview && <PreviewBanner />}
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-8 py-12">
          <div>
            <p className="text-sm font-medium text-brand-strong">上一节</p>
            <h1 className="mt-2 text-2xl font-bold text-ink">先把上一节的这一串遮住打一遍</h1>
            <p className="mt-2 text-sm text-ink-soft">打对了再开始今天的课。</p>
          </div>
          <ChunkDrill chunk={reviewChunk} reps={1} hideFrom={1} onComplete={() => setRecallDone(true)} />
        </div>
      </div>
    )
  }

  const stars: 0 | 1 | 2 | 3 = errorTaps <= 2 ? 3 : errorTaps <= 5 ? 2 : 1
  const nextId = nextLevelId(level.order)

  const finish = () => {
    if (preview) {
      setFinished(true)
      return
    }
    void completeLevel(level.level_id, stars, errorTaps).finally(() => setFinished(true))
  }

  if (finished && bonusOpen && level.bonus_challenge) {
    return (
      <div className={`student-shell min-h-screen bg-canvas ${preview ? 'pt-12' : ''}`}>
        {preview && <PreviewBanner />}
        <BonusRound
          level={level}
          challenge={level.bonus_challenge}
          envPhase={pythonPhase}
          sandbox={preview}
          onDone={(reward) => {
            setBonusReward(reward)
            setBonusOpen(false)
          }}
          onSkip={() => setBonusOpen(false)}
        />
      </div>
    )
  }

  if (finished) {
    return (
      <div className={`student-shell flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center ${preview ? 'pt-12' : ''}`}>
        {preview && <PreviewBanner />}
        <div className="card w-full max-w-xl p-10 fade-up">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-soft text-4xl text-success">
            ✓
          </div>
          <h1 className="mt-6 text-3xl font-bold text-ink">{preview ? '预览结束' : '这一关完成了'}</h1>
          <p className="mt-3 text-ink-soft">
            {preview
              ? `${level.title} · 三个回合都走完了，学习记录没有写入。`
              : `${level.title} · 你打对了 ${level.teach_code_lines.length} 行代码，还自己改了一次参数。`}
          </p>
          <div className="mt-5 flex justify-center">
            <Stars count={stars} size={28} />
          </div>
          {bonusReward && <p className="mt-4 font-semibold text-brand-strong">拿到了{bonusReward}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={preview ? '/admin/levels' : '/student'} className="btn-secondary">
              {preview ? '回到课程管理' : '回到课程地图'}
            </Link>
            {level.bonus_challenge && !bonusReward && (
              <button type="button" className="btn-secondary" onClick={() => setBonusOpen(true)}>
                巩固一下
              </button>
            )}
            {!preview && nextId && (
              <button type="button" className="btn-primary px-8" onClick={() => navigate(`/student/lesson/${nextId}`)}>
                下一关
              </button>
            )}
          </div>
          {level.bonus_challenge && !bonusReward && (
            <p className="mt-4 text-sm text-ink-soft">{level.bonus_challenge.instruction} 不做也能去下一关。</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`student-shell flex min-h-screen min-w-[1024px] flex-col bg-canvas ${preview ? 'pt-12' : ''}`}>
      {preview && <PreviewBanner />}
      <PlaceholderBanner show={level.is_placeholder || placeholderLesson} />
      <div className={`sticky z-20 border-b border-line bg-white ${preview ? 'top-12' : 'top-0'}`}>
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-8 py-3.5">
          <Link to={preview ? '/admin/levels' : '/student'} className="btn-ghost px-2" aria-label={preview ? '返回课程管理' : '返回课程地图'}>
            ←
          </Link>
          <BrandMark size={30} />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-ink">
              第 {level.order} 关 · {level.title}
            </h1>
            <p className="truncate text-sm text-ink-soft">{level.goal}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {ROUND_META.map((item) => {
              const active = round === item.key
              const passed = ROUND_META.findIndex((r) => r.key === round) > ROUND_META.findIndex((r) => r.key === item.key)
              return (
                <div
                  key={item.key}
                  className={`rounded-field px-4 py-2 text-center transition ${
                    active ? 'bg-brand text-white' : passed ? 'bg-success-soft text-success' : 'bg-canvas text-ink-soft'
                  }`}
                >
                  <div className="text-sm font-semibold">
                    {item.key} {item.label}
                  </div>
                  <div className={`text-xs ${active ? 'text-white/80' : 'text-ink-soft/80'}`}>{item.sub}</div>
                </div>
              )
            })}
            <span className="ml-2 rounded-field border border-line px-3 py-2 text-sm text-ink-soft">预计20分钟</span>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-7">
        {round === 'A' && (
          <RoundA
            level={level}
            targetResult={targetResult}
            envPhase={pythonPhase}
            onNext={() => setBreakOverlay({ next: 'B', line: ENCOURAGE[0] })}
          />
        )}
        {round === 'B' && level.level_type === 'fill_blank' && (
          <FillBlank
            level={level}
            envPhase={pythonPhase}
            onNext={() => setBreakOverlay({ next: 'C', line: ENCOURAGE[1] })}
          />
        )}
        {round === 'B' && level.level_type !== 'fill_blank' && !!level.unfolded_lines?.length && (
          <LoopFold
            level={level}
            envPhase={pythonPhase}
            onNext={() => setBreakOverlay({ next: 'C', line: ENCOURAGE[1] })}
          />
        )}
        {round === 'B' && level.level_type !== 'fill_blank' && !level.unfolded_lines?.length && (
          <RoundB
            level={level}
            envPhase={pythonPhase}
            onErrorTap={() => setErrorTaps((n) => n + 1)}
            onNext={() => setBreakOverlay({ next: 'C', line: ENCOURAGE[1] })}
          />
        )}
        {round === 'C' && (
          <RoundC
            level={level}
            studentId={student?.id ?? ''}
            targetResult={targetResult}
            envPhase={pythonPhase}
            onComplete={finish}
            sandbox={preview}
          />
        )}
      </main>

      {storyOpen && <CommandStory level={level} onClose={() => setStoryOpen(false)} />}

      {breakOverlay && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-canvas px-6 text-center">
          <div className="fade-up max-w-xl">
            <p className="text-2xl font-semibold text-ink">{breakOverlay.line}</p>
            <p className="mt-4 text-ink-soft">
              {breakOverlay.next === 'C'
                ? '最后一步：改一个数字，看看图形怎么变。'
                : level.level_type === 'fill_blank'
                  ? '接下来，把空出来的词填上。'
                  : level.unfolded_lines?.length
                    ? '接下来，看这 8 行怎么收成一个循环。'
                    : '接下来，一行一行把代码抄下来。'}
            </p>
            <button
              type="button"
              className="btn-primary mt-9 px-10 text-lg"
              onClick={() => {
                setRound(breakOverlay.next)
                setBreakOverlay(null)
              }}
            >
              准备好了
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
