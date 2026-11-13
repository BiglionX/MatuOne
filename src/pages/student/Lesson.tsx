import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { completeLevel, loadLevel, touchLevel } from '@/api/learning'
import { enterLevel, type EnterLevelReason } from '@/api/studentLevel'
import { getCurrentStudent } from '@/api/studentAuth'
import type { Level, RunResult } from '@/types'
import { buildDemoCode, runCode } from '@/lib/runner'
import { Stars } from '@/components/WpmChart'
import { CommandStory } from '@/components/CommandStory'
import { BrandMark } from '@/components/BrandMark'
import { RoundA } from './rounds/RoundA'
import { RoundB } from './rounds/RoundB'
import { RoundC } from './rounds/RoundC'

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
  not_found: '没有找到这一关',
}

const ENCOURAGE = [
  '代码不是背下来的，是一行一行打出来的。',
  '刚才那几行，是你自己敲出来的。',
  '眼睛看清楚，手指慢一点，就对了。',
  '接下来这一步，只是改一个数字。',
]

export function Lesson() {
  const { levelId } = useParams()
  const navigate = useNavigate()
  const student = getCurrentStudent()
  const [level, setLevel] = useState<Level | null>(null)
  const [missing, setMissing] = useState(false)
  const [round, setRound] = useState<Round>('A')
  const [gate, setGate] = useState<Awaited<ReturnType<typeof enterLevel>> | null>(null)
  const [targetResult, setTargetResult] = useState<RunResult | null>(null)
  const [errorTaps, setErrorTaps] = useState(0)
  const [breakOverlay, setBreakOverlay] = useState<{ next: Round; line: string } | null>(null)
  const [storyOpen, setStoryOpen] = useState(true)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!levelId || !student) return
    let alive = true
    setLevel(null)
    setMissing(false)
    setGate(null)
    setFinished(false)
    setRound('A')
    enterLevel(levelId)
      .then(async (result) => {
        if (!alive) return
        setGate(result)
        if (!result.allowed) return
        void touchLevel(levelId)
        try {
          const next = await loadLevel(levelId)
          if (alive) setLevel(next)
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
  }, [levelId, student?.id])

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

  if (!student) return <Navigate to="/student/login" replace />

  if (missing || (gate && !gate.allowed && gate.reason === 'not_found')) {
    return (
      <div className="student-shell flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas">
        <p className="text-xl text-ink">没有找到这一关</p>
        <Link to="/student" className="btn-primary">
          回到课程地图
        </Link>
      </div>
    )
  }

  if (gate && !gate.allowed) {
    return (
      <div className="student-shell flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <p className="text-xl text-ink">{ENTER_COPY[gate.reason]}</p>
        <Link to="/student" className="btn-primary">
          回到课程地图
        </Link>
      </div>
    )
  }

  if (!level || !gate) {
    return (
      <div className="student-shell flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-xl text-ink">正在确认能不能进入这一关</p>
      </div>
    )
  }

  const stars: 0 | 1 | 2 | 3 = errorTaps <= 2 ? 3 : errorTaps <= 5 ? 2 : 1
  const nextId = `L${String(level.order + 1).padStart(2, '0')}`

  const finish = () => {
    void completeLevel(level.level_id, stars, errorTaps).finally(() => setFinished(true))
  }

  if (finished) {
    return (
      <div className="student-shell flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
        <div className="card w-full max-w-xl p-10 fade-up">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-soft text-4xl text-success">
            ✓
          </div>
          <h1 className="mt-6 text-3xl font-bold text-ink">这一关完成了</h1>
          <p className="mt-3 text-ink-soft">
            {level.title} · 你打对了 {level.teach_code_lines.length} 行代码，还自己改了一次参数。
          </p>
          <div className="mt-5 flex justify-center">
            <Stars count={stars} size={28} />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/student" className="btn-secondary">
              回到课程地图
            </Link>
            <button
              type="button"
              className="btn-primary px-8"
              onClick={() => navigate(`/student/lesson/${nextId}`)}
            >
              下一关
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="student-shell flex min-h-screen min-w-[1024px] flex-col bg-canvas">
      <div className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-8 py-3.5">
          <Link to="/student" className="btn-ghost px-2" aria-label="返回课程地图">
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
          <RoundA level={level} targetResult={targetResult} onNext={() => setBreakOverlay({ next: 'B', line: ENCOURAGE[0] })} />
        )}
        {round === 'B' && (
          <RoundB
            level={level}
            onErrorTap={() => setErrorTaps((n) => n + 1)}
            onNext={() => setBreakOverlay({ next: 'C', line: ENCOURAGE[1] })}
          />
        )}
        {round === 'C' && <RoundC level={level} studentId={student.id} targetResult={targetResult} onComplete={finish} />}
      </main>

      {storyOpen && <CommandStory level={level} onClose={() => setStoryOpen(false)} />}

      {breakOverlay && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-canvas px-6 text-center">
          <div className="fade-up max-w-xl">
            <p className="text-2xl font-semibold text-ink">{breakOverlay.line}</p>
            <p className="mt-4 text-ink-soft">
              {breakOverlay.next === 'B' ? '接下来，一行一行把代码抄下来。' : '最后一步：改一个数字，看看图形怎么变。'}
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
