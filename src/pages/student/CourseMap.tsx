import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { getCurrentStudent } from '@/api/studentAuth'
import { loadLearningHome, type LearningHome } from '@/api/learning'
import type { MapEntry } from '@/types'
import { Stars } from '@/components/WpmChart'

export function CourseMap() {
  const navigate = useNavigate()
  const student = getCurrentStudent()
  const currentRef = useRef<HTMLDivElement>(null)
  const [home, setHome] = useState<LearningHome | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!student) return
    loadLearningHome()
      .then(setHome)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '课程加载失败'))
  }, [student?.id])

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [home])

  if (!student) return <Navigate to="/student/login" replace />

  const entries = home?.entries ?? []
  const completedCount = home?.completedCount ?? 0
  const total = entries.length || 1

  return (
    <div className="student-shell min-h-screen min-w-[1024px] bg-canvas pb-16">
      <div className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/enter" className="btn-ghost px-2">
              ←
            </Link>
            <Link to="/student/profile" className="rounded-field px-2 py-1 transition hover:bg-canvas" aria-label="打开用户中心">
              <h1 className="text-xl font-bold text-ink">代码闯关</h1>
              <p className="text-sm text-ink-soft">
                {student.name} · {completionText(completedCount, entries.length)}
                <span className="ml-2 text-brand">用户中心 ›</span>
              </p>
            </Link>
          </div>
          <div className="flex items-center gap-5">
            <div className="w-56">
              <div className="mb-1 flex justify-between text-sm text-ink-soft">
                <span>
                  已闯 {completedCount}/{entries.length} 关
                </span>
                <span>{entries.length ? Math.round((completedCount / entries.length) * 100) : 0}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-brand-soft">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(completedCount / total) * 100}%` }} />
              </div>
            </div>
            <Link to="/student/typing" className="btn-secondary">
              打字热身
              {home?.latestTyping && <span className="text-sm text-ink-soft">{home.latestTyping.wpm} WPM</span>}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-8 pt-8">
        <p className="mb-5 text-ink-soft">每一关大约 20 分钟，先看效果，再抄代码，最后改一改。</p>
        {error && <p className="mb-4 rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
        {!home && !error && <p className="text-ink-soft">正在读取关卡…</p>}

        <div className="space-y-3">
          {entries.map((entry) => (
            <LevelCard key={entry.levelId} entry={entry} currentRef={currentRef} onOpen={() => navigate(`/student/lesson/${entry.levelId}`)} />
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-ink-soft">后面的关卡会随着前面的通关自动打开，不用着急。</p>
      </div>
    </div>
  )
}

function LevelCard({
  entry,
  currentRef,
  onOpen,
}: {
  entry: MapEntry
  currentRef: RefObject<HTMLDivElement>
  onOpen: () => void
}) {
  const card = (
    <div
      className={`card flex items-center gap-5 p-5 transition ${
        entry.current ? 'border-brand bg-white ring-2 ring-brand/25' : ''
      } ${entry.unlocked ? 'hover:border-brand' : 'opacity-60'}`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
          entry.completed ? 'bg-success-soft text-success' : entry.current ? 'bg-brand text-white' : 'bg-canvas text-ink-soft'
        }`}
      >
        {entry.completed ? '✓' : entry.order}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h2 className="truncate text-lg font-semibold text-ink">{entry.title}</h2>
          {entry.isReview && <span className="chip bg-warning-soft text-warning">综合</span>}
        </div>
        <p className="mt-1 truncate text-sm text-ink-soft">{entry.goal}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {entry.completed ? (
          <div className="text-right">
            <Stars count={entry.stars} />
            <p className="mt-1 text-xs text-ink-soft">已完成</p>
          </div>
        ) : entry.current ? (
          <span className="chip bg-brand-soft text-brand-strong">进行中</span>
        ) : (
          <span className="chip bg-canvas text-ink-soft">未解锁</span>
        )}
        {entry.unlocked && <span className="text-brand">→</span>}
      </div>
    </div>
  )

  if (!entry.unlocked) return <div>{card}</div>
  return (
    <div
      ref={entry.current ? currentRef : undefined}
      onClick={onOpen}
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(event) => event.key === 'Enter' && onOpen()}
    >
      {card}
    </div>
  )
}

function completionText(completed: number, total: number) {
  if (!total) return '课程正在准备'
  if (completed === 0) return '今天的第 1 关等你来'
  if (completed >= total) return '全部关卡都跑通了'
  return `再接再厉，还剩 ${total - completed} 关`
}
