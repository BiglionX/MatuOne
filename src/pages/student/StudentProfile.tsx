import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { loadLearningHome, type LearningHome } from '@/api/learning'
import { getCurrentStudent, logoutStudent } from '@/api/studentAuth'
import { Stars, WpmChart } from '@/components/WpmChart'
import { BrandMark } from '@/components/BrandMark'

/** 学生用户中心：我是谁、学到哪、打字练得怎么样，以及退出登录 */
export function StudentProfile() {
  const navigate = useNavigate()
  const student = getCurrentStudent()
  const [home, setHome] = useState<LearningHome | null>(null)

  useEffect(() => {
    if (!student) return
    loadLearningHome().then(setHome).catch(() => setHome(null))
  }, [student?.id])

  if (!student) return <Navigate to="/student/login" replace />

  const entries = home?.entries ?? []
  const completedCount = home?.completedCount ?? 0
  const totalStars = entries.reduce((sum, item) => sum + item.stars, 0)
  const currentLevel = entries.find((item) => item.current)
  const typing = home?.typingSeries ?? []
  const lastTyping = [...typing].reverse().find((point) => point.wpm !== null)
  const lastActive = (() => {
    if (!student.lastActiveAt) return '还没有学习记录'
    const date = new Date(student.lastActiveAt)
    if (Number.isNaN(date.getTime())) return '还没有学习记录'
    return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
  })()

  return (
    <div className="student-shell min-h-screen min-w-[1024px] bg-canvas pb-16">
      <div className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-8 py-4">
          <Link to="/student" className="btn-ghost px-2" aria-label="返回课程地图">
            ←
          </Link>
          <BrandMark size={32} />
          <div>
            <h1 className="text-xl font-bold text-ink">用户中心</h1>
            <p className="text-sm text-ink-soft">自己的记录，只和自己比</p>
          </div>
          <button
            type="button"
            className="btn-secondary ml-auto"
            onClick={() => {
              logoutStudent()
              navigate('/student/login')
            }}
          >
            退出登录
          </button>
        </div>
      </div>

      <main className="mx-auto grid max-w-5xl gap-6 px-8 pt-8 lg:grid-cols-[minmax(320px,40%)_minmax(0,1fr)]">
        <section className="flex flex-col gap-6">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white">
                {student.name.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-bold text-ink">{student.name}</h2>
                <p className="mt-1 text-sm text-ink-soft">账号 {student.account}</p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
              <div>
                <dt className="text-ink-soft">机构</dt>
                <dd className="mt-1 font-medium text-ink">{home?.orgName || '…'}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">分组</dt>
                <dd className="mt-1 font-medium text-ink">{home?.groupName || '…'}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">最近学习</dt>
                <dd className="mt-1 font-medium text-ink">{lastActive}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">账号状态</dt>
                <dd className="mt-1 font-medium text-ink">{student.status === 'active' ? '正常' : '已停用'}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-ink">我的进度</h2>
              <span className="text-sm text-ink-soft">
                {completedCount} / {entries.length} 关
              </span>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-brand-soft">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${entries.length ? (completedCount / entries.length) * 100 : 0}%` }}
              />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-ink-soft">已收集星星</span>
              <span className="inline-flex items-center gap-2 font-semibold text-ink">
                {totalStars} / {entries.length * 3}
                <Stars count={Math.min(3, Math.round(totalStars / Math.max(1, completedCount)))} />
              </span>
            </div>
            <p className="mt-4 rounded-field bg-canvas px-4 py-3 text-sm text-ink">
              {currentLevel ? `现在在学：第 ${currentLevel.order} 关 · ${currentLevel.title}` : '已经学过的关卡都跑通了，可以回头挑一关再改一改。'}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-ink">打字成长</h2>
              <span className="text-sm text-ink-soft">{lastTyping?.wpm != null ? `${lastTyping.wpm} WPM` : '还没有记录'}</span>
            </div>
            <div className="mt-4">
              <WpmChart series={typing} />
            </div>
            <p className="mt-3 text-sm text-ink-soft">打字只有两个档位：基准键位、编程关键词。</p>
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-ink">关卡记录</h2>
            <span className="text-sm text-ink-soft">共 {entries.length} 关</span>
          </div>
          <div className="mt-4 divide-y divide-line">
            {entries.map((item) => (
              <div key={item.levelId} className="flex items-center gap-4 py-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    item.completed ? 'bg-success-soft text-success' : item.current ? 'bg-brand text-white' : 'bg-canvas text-ink-soft'
                  }`}
                >
                  {item.completed ? '✓' : item.order}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{item.title}</p>
                  <p className="truncate text-sm text-ink-soft">{item.goal}</p>
                </div>
                <div className="shrink-0 text-right">
                  {item.completed ? (
                    <>
                      <Stars count={item.stars} />
                      <p className="mt-1 text-xs text-ink-soft">已完成</p>
                    </>
                  ) : item.current ? (
                    <span className="chip bg-brand-soft text-brand-strong">进行中</span>
                  ) : (
                    <span className="chip bg-canvas text-ink-soft">未解锁</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between rounded-field bg-canvas px-4 py-3">
            <span className="text-sm text-ink-soft">继续学习</span>
            <Link to="/student" className="btn-primary px-6 py-2.5">
              回到课程地图
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
