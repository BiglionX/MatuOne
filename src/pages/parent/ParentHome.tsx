import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { bindChild, getParentSession, loadParentHome, logoutParent, lookupChild, unbindChild } from '@/api/parent'
import {
  dualReadParentHome,
  findCloudModule,
  formatModuleHint,
  formatModuleStatusLabel,
  listParentStudentModuleProgress,
} from '@/api/moduleProgress'
import type { ModuleProgressSummary, StudentModulesProgressView } from '@/types/moduleProgress'
import { MODULE_IDS } from '@/modules/ids'
import { WpmChart } from '@/components/WpmChart'
import { BrandMark } from '@/components/BrandMark'
import { FormError } from '@/components/FormError'
import { ListSkeleton } from '@/components/Skeleton'
import { LEARNING_ROADMAP } from '@/data/learningRoadmap'
import { formatDate, formatDay } from '@/lib/format'
import type { ParentChildView, ParentLessonBrief, ParentStoppedChild } from '@/types'
import { ApiError } from '@/lib/apiError'

function FeedbackNote({ message, className = '' }: { message: string; className?: string }) {
  const ok = message === '已绑定' || message === '已解除绑定'
  if (ok) return <p className={`text-sm text-ink ${className}`}>{message}</p>
  return <FormError className={className}>{message}</FormError>
}

/**
 * 模块卡：按 availability 通用渲染（页面不按模块名分支）。
 * 未开通（not_entitled）不出现 —— 与机构列表 / 启动器口径一致。
 */
function ParentModuleSection({ summary }: { summary: ModuleProgressSummary }) {
  if (summary.availability === 'not_entitled') return null
  const label = formatModuleStatusLabel(summary)
  const hint = formatModuleHint(summary)
  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">{summary.displayName}</h2>
        {label && <span className="text-sm text-ink-soft">{label}</span>}
      </div>
      {hint && <p className="mt-2 text-sm text-ink-soft">{hint}</p>}
      {summary.availability === 'cloud' && summary.completed != null && summary.total != null && (
        <p className="mt-2 text-sm text-ink-soft">已学 {summary.completed} / {summary.total} 节</p>
      )}
    </section>
  )
}

function catalogId(order: number): string {
  return `L${String(order).padStart(4, '0')}`
}

function LessonBriefList({ lessons, empty }: { lessons: ParentLessonBrief[]; empty: string }) {
  const [openId, setOpenId] = useState('')
  if (lessons.length === 0) return <p className="mt-4 text-sm text-ink-soft">{empty}</p>
  return (
    <ul className="mt-4 divide-y divide-line">
      {lessons.map((lesson) => {
        const open = openId === lesson.levelId
        return (
          <li key={lesson.levelId} className="py-3">
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left"
              aria-expanded={open}
              onClick={() => setOpenId(open ? '' : lesson.levelId)}
            >
              <span className="min-w-0">
                <span className="block text-xs text-ink-soft">{catalogId(lesson.order)}</span>
                <span className="block truncate font-medium text-ink">{lesson.title}</span>
              </span>
              <span className="shrink-0 text-sm text-brand-strong">{open ? '收起' : '展开'}</span>
            </button>
            {open && (
              <div className="mt-3 rounded-field bg-canvas px-4 py-3">
                <p className="text-sm font-medium text-ink">本节课学了什么</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{lesson.parentBrief?.trim() || '这一节还没有通俗解读。'}</p>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** 家长端 H5：先登录，再绑定孩子。只放结论。 */
export function ParentHome() {
  const navigate = useNavigate()
  const session = getParentSession()
  const [children, setChildren] = useState<ParentChildView[]>([])
  const [moduleViews, setModuleViews] = useState<StudentModulesProgressView[]>([])
  const [activeId, setActiveId] = useState('')
  const [binding, setBinding] = useState(false)
  const [code, setCode] = useState('')
  const [codeReady, setCodeReady] = useState(false)
  const [confirmUnbind, setConfirmUnbind] = useState(false)
  const [stopped, setStopped] = useState<ParentStoppedChild[]>([])
  const [feedback, setFeedback] = useState('')
  const [ready, setReady] = useState(false)
  const [roadmapOpen, setRoadmapOpen] = useState(false)

  const refresh = () =>
    Promise.all([loadParentHome(), listParentStudentModuleProgress()])
      .then(([next, views]) => {
        setChildren(next.children)
        setStopped(next.stopped)
        setModuleViews(views)
        setActiveId((current) => current || next.children[0]?.student.id || '')
        dualReadParentHome(next.children, views)
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          logoutParent()
          navigate('/parent/login', { replace: true })
          return
        }
        if (error instanceof ApiError && error.status === 403) {
          setChildren([])
          setStopped([])
          setModuleViews([])
          setActiveId('')
          setFeedback(error.message)
          return
        }
        setFeedback(error instanceof ApiError ? error.message : '暂时读不到学习记录')
      })
      .finally(() => setReady(true))

  useEffect(() => {
    if (!session) return
    void refresh()
  }, [])

  if (!session) return <Navigate to="/parent/login" replace />

  const view = children.find((child) => child.student.id === activeId) ?? children[0]
  const modules =
    (view ? moduleViews.find((row) => row.studentId === view.student.id)?.modules : undefined) ?? []
  /** 主卡：唯一带云进度的模块（当前是 Python 课程）。页面不按模块名分支。 */
  const cloudModule = findCloudModule(modules)
  /** 学习记录区块按「有没有云进度」显示，不再判断具体模块名。 */
  const courseOpened = cloudModule != null
  const stageLabel = view?.curriculum.stageLabel ?? ''
  const unitLabel = view?.curriculum.unitLabel ?? ''
  const unitCompleted = view?.curriculum.unitCompleted ?? 0
  const unitTotal = view?.curriculum.unitTotal ?? 0
  const currentLevelTitle = view?.currentLevelTitle ?? ''
  const typingChartSeries =
    view?.typingSeries.map((point) => ({
      at: point.weekStart,
      label: point.label,
      wpm: point.wpm,
      accuracy: point.accuracy,
    })) ?? []

  /** 未开通（not_entitled）完全不渲染；云进度主卡已单独渲染，其余按 availability 通用渲染。 */
  const extraModules = modules.filter(
    (m) => m.availability !== 'not_entitled' && m !== cloudModule,
  )
  const blocklyProgress = view?.blocklyProgress
  const blocklyOpened = view?.enabledModules.includes(MODULE_IDS.blockly) === true
  const blocklyCard = blocklyOpened && blocklyProgress ? (
    <section className="card p-5">
      <h2 className="text-lg font-semibold text-ink">图形化编程</h2>
      <p className="mt-3 text-ink">
        已通关 <span className="font-semibold">{blocklyProgress.completedCount}</span> 关
      </p>
      {blocklyProgress.completedCount === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">尚未开始</p>
      ) : blocklyProgress.currentLevelTitle ? (
        <p className="mt-2 text-sm text-ink-soft">
          当前进度：第 {blocklyProgress.completedCount + 1} 关（{blocklyProgress.currentLevelTitle}）
        </p>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">当前进度：已全部通关</p>
      )}
    </section>
  ) : null

  const lookup = async () => {
    const trimmed = code.trim()
    if (!/^[A-Za-z0-9]{6,12}$/.test(trimmed)) {
      setCodeReady(false)
      setFeedback('请输入 6–12 位字母或数字')
      return
    }
    try {
      await lookupChild(trimmed)
      setFeedback('')
      setCodeReady(true)
    } catch (error) {
      setCodeReady(false)
      setFeedback(error instanceof ApiError ? error.message : '绑定码无效或已失效')
    }
  }

  const confirmBind = async () => {
    try {
      await bindChild(code.trim())
      await refresh()
      setCodeReady(false)
      setBinding(false)
      setCode('')
      setFeedback('已绑定')
    } catch (error) {
      setFeedback(error instanceof ApiError ? error.message : '绑定失败')
    }
  }

  const confirmRemove = async () => {
    if (!view) return
    try {
      await unbindChild(view.student.id)
      setConfirmUnbind(false)
      setFeedback('已解除绑定')
      await refresh()
    } catch (error) {
      setFeedback(error instanceof ApiError ? error.message : '解除失败')
    }
  }

  return (
    <div className="min-h-screen bg-canvas pb-12">
      <div className="h5-shell min-w-0 p-6">
        <header className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link to="/enter" className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-soft">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft">
                  <BrandMark size={22} />
                </span>
                代码闯关 · 家长端
              </Link>
              <h1 className="mt-2 text-xl font-bold text-ink">看看孩子的学习</h1>
              <p className="mt-1 break-all text-sm text-ink-soft">{session.account}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setBinding((value) => !value)
                  setFeedback('')
                }}
              >
                绑定孩子
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  logoutParent()
                  navigate('/parent/login', { replace: true })
                }}
              >
                退出
              </button>
            </div>
          </div>
          {children.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {children.map((child) => (
                <button
                  key={child.student.id}
                  type="button"
                  onClick={() => {
                    setActiveId(child.student.id)
                    setConfirmUnbind(false)
                  }}
                  className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm transition ${
                    activeId === child.student.id ? 'bg-brand-action font-semibold text-white' : 'bg-canvas text-ink'
                  }`}
                >
                  {child.student.name}
                </button>
              ))}
            </div>
          )}
        </header>

        {binding && (
          <section className="card mt-4 p-5">
            <h2 className="text-lg font-semibold text-ink">绑定孩子</h2>
            <p className="mt-1 text-sm text-ink-soft">输入机构老师给你的绑定码。可以是原来的 6 位数字，或新的 10 位字母数字。确认前不会显示孩子信息。</p>
            <div className="mt-4 flex gap-2">
              <input
                className="field flex-1"
                value={code}
                maxLength={12}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                placeholder="6–12 位字母或数字"
                onChange={(e) => {
                  setCode(e.target.value)
                  setCodeReady(false)
                  setFeedback('')
                }}
              />
              <button type="button" className="btn-primary shrink-0" onClick={() => void lookup()}>
                下一步
              </button>
            </div>
            {codeReady && (
              <div className="mt-4 rounded-card border border-brand bg-brand-soft p-4">
                <p className="text-sm text-ink">绑定码可用。确认后，孩子会出现在首页。</p>
                <button type="button" className="btn-primary mt-4 w-full" onClick={() => void confirmBind()}>
                  确认绑定
                </button>
              </div>
            )}
            {feedback && <FeedbackNote message={feedback} className="mt-3" />}
          </section>
        )}

        {stopped.map((item) => (
          <section key={item.name} className="card mt-4 p-5">
            <p className="font-semibold text-ink">{item.name}</p>
            <p className="mt-2 text-sm text-ink-soft">{item.message}</p>
          </section>
        ))}

        {view ? (
          <div className="mt-4 space-y-4">
            {courseOpened && (
              <>
            <section className="card p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-ink">本周学习</h2>
                <span className="text-sm text-ink-soft">{view.student.name}</span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
                <div className="rounded-field bg-canvas py-4">
                  <p className="text-2xl font-bold text-ink">{view.weekly.sessions}</p>
                  <p className="mt-1 text-sm text-ink-soft">学习次数</p>
                </div>
                <div className="rounded-field bg-canvas py-4">
                  <p className="text-2xl font-bold text-ink">{view.weekly.totalMinutes}</p>
                  <p className="mt-1 text-sm text-ink-soft">总时长（分钟）</p>
                </div>
                <div className="rounded-field bg-canvas py-4">
                  <p className="text-lg font-bold text-ink">{formatDay(view.weekly.lastStudyDate)}</p>
                  <p className="mt-1 text-sm text-ink-soft">最近学习</p>
                </div>
              </div>
              <h3 className="mt-5 text-sm font-medium text-ink">本周课时</h3>
              <LessonBriefList lessons={view.weeklyLessons} empty="本周还没有学完的课。学完之后，才会看到这一节学了什么。" />
            </section>
            <section className="card p-5">
              <h2 className="text-lg font-semibold text-ink">已学关卡</h2>
              <p className="mt-1 text-sm text-ink-soft">只展示已经学完的课，后面还没学的内容先不打开。</p>
              <LessonBriefList lessons={view.learnedLessons} empty="还没有学完的关卡。" />
            </section>
            <section className="card p-5">
              <h2 className="text-lg font-semibold text-ink">课程进度</h2>
              <p className="mt-4 text-ink">
                当前学段：<span className="font-semibold">{stageLabel}</span>
              </p>
              <p className="mt-2 text-ink">
                当前单元：<span className="font-semibold">{unitLabel}</span>
              </p>
              <p className="mt-2 text-ink">
                最近学习：
                <span className="font-semibold">{formatDate(cloudModule?.lastStudiedAt)}</span>
              </p>
              {view.curriculum.beyondAuthored ? (
                <p className="mt-4 text-ink">当前阶段的基础内容已学完，进阶课程即将上线</p>
              ) : (
                <>
                  <p className="mt-2 text-ink">
                    本单元进度：
                    <span className="font-semibold">
                      {unitCompleted}/{unitTotal} 节
                    </span>
                  </p>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-brand-soft">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{
                        width: `${unitTotal ? (unitCompleted / unitTotal) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-ink-soft">正在学的是「{currentLevelTitle}」。这一单元学完，就可以先歇一歇。</p>
                </>
              )}
            </section>
            {blocklyCard}
            <section className="card p-5">
              <h2 className="text-lg font-semibold text-ink">里程碑</h2>
              {view.curriculum.badges.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {view.curriculum.badges.map((badge) => (
                    <li key={badge.id} className="chip bg-brand-soft text-brand-strong">
                      {badge.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-soft">还没有徽章。学完带里程碑的那一节，比如「初识海龟」，会出现在这里。</p>
              )}
              <button type="button" className="btn-secondary mt-4 w-full" onClick={() => setRoadmapOpen(true)}>
                查看完整学习路线
              </button>
            </section>
              </>
            )}
            {!courseOpened && blocklyCard}
            <section className="card p-5">
              {confirmUnbind ? (
                <div>
                  <p className="text-sm text-ink">解除后将看不到 {view.student.name} 的学习记录。绑定关系会保留为已解除，不会从系统里删掉。</p>
                  <div className="mt-4 flex gap-2">
                    <button type="button" className="btn-primary" onClick={() => void confirmRemove()}>
                      确认解除
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setConfirmUnbind(false)}>
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn-ghost w-full" onClick={() => setConfirmUnbind(true)}>
                  解除绑定
                </button>
              )}
            </section>
            {courseOpened && (
              <section className="card p-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold text-ink">打字成长</h2>
                  <span className="text-sm text-ink-soft">WPM</span>
                </div>
                <div className="mt-4">
                  <WpmChart series={typingChartSeries} />
                </div>
              </section>
            )}
            {extraModules.map((summary) => (
              <ParentModuleSection key={summary.moduleId} summary={summary} />
            ))}
            <section className="card p-5 opacity-70">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink">深度课程</h2>
                  <p className="mt-1 text-sm text-ink-soft">更多项目课与家庭练习，正在准备中。</p>
                </div>
                <span className="chip bg-canvas text-ink-soft">敬请期待</span>
              </div>
            </section>
          </div>
        ) : ready && !feedback ? (
          <section className="card mt-4 p-8 text-center">
            <p className="text-ink">还没有绑定孩子</p>
            <p className="mt-2 text-sm text-ink-soft">输入老师给的绑定码，就能看到学习记录。</p>
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={() => {
                setBinding(true)
                setFeedback('')
              }}
            >
              绑定孩子
            </button>
          </section>
        ) : (
          !ready && <div className="mt-4"><ListSkeleton rows={3} /></div>
        )}
        {!binding && feedback && <FeedbackNote message={feedback} className="mt-3" />}
        <p className="mt-6 text-center text-xs text-ink-soft">只显示自己孩子的记录，不做任何排名与对比。</p>
      </div>
      {roadmapOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 px-4 py-6 sm:items-center" role="presentation" onClick={() => setRoadmapOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="roadmap-title"
            className="h5-shell max-h-[85vh] overflow-y-auto rounded-card bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="roadmap-title" className="text-lg font-semibold text-ink">
                  完整学习路线
                </h2>
                <p className="mt-1 text-sm text-ink-soft">一共 8 个 Level。不必一次学完，每一级停下都有能带走的东西。</p>
              </div>
              <button type="button" className="btn-ghost px-3" onClick={() => setRoadmapOpen(false)}>
                关闭
              </button>
            </div>
            <ol className="mt-4 space-y-3">
              {LEARNING_ROADMAP.map((stage, index) => (
                <li key={stage.id} className="rounded-card border border-line px-4 py-4">
                  <p className="text-sm text-brand-strong">
                    {stage.level}
                  </p>
                  <p className="mt-1 font-semibold text-ink">{stage.title}</p>
                  <p className="mt-2 text-sm text-ink-soft">{stage.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
