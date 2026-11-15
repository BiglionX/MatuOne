import { useEffect, useState } from 'react'
import { ApiError, loadOrgStudentProgress } from '@/api/orgPortal'
import type { OrgStudentProgress as Progress } from '@/types/orgProgress'
import { LessonCueTip } from '@/components/LessonCueTip'
import { formatDate } from '@/lib/format'

function catalogId(order: number): string {
  return `L${String(order).padStart(4, '0')}`
}

export interface OrgStudentSummary {
  account: string
  groupName: string
  status: 'active' | 'disabled'
  currentLevelOrder: number
  completedCount: number
  authorizedLevels: number
  typing: { wpm: number; accuracy: number } | null
  lastActiveAt: string
  bindCode: string
  boundParentCount: number
}

/** 机构后台的学生档案。studentId 只用来点名，归属由服务端按机构会话核对。 */
export function OrgStudentProgress({
  studentId,
  summary,
  onClose,
}: {
  studentId: string
  summary?: OrgStudentSummary
  onClose: () => void
}) {
  const [detail, setDetail] = useState<Progress | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setDetail(null)
    setError('')
    loadOrgStudentProgress(studentId)
      .then((next) => {
        if (alive) setDetail(next)
      })
      .catch((err: unknown) => {
        if (!alive) return
        setError(err instanceof ApiError ? err.message : '读不到这名学生的进度')
      })
    return () => {
      alive = false
    }
  }, [studentId])

  return (
    <div
      className="fixed inset-0 z-30 flex justify-end bg-ink/40"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="presentation"
    >
      <aside
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-progress-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="org-progress-title" className="text-xl font-bold text-ink">
              {detail?.name ?? '学员进度'}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">关卡旁的「话术」是教学设计意图和上课引导。</p>
          </div>
          <button type="button" className="text-sm text-ink-soft" onClick={onClose}>
            关闭
          </button>
        </div>
        {summary && (
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-ink-soft">账号</dt>
              <dd className="code-font mt-1 text-ink">{summary.account}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">分组</dt>
              <dd className="mt-1 text-ink">{summary.groupName}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">状态</dt>
              <dd className="mt-1 text-ink">{summary.status === 'active' ? '正常' : '已停用'}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">进度</dt>
              <dd className="mt-1 text-ink">
                {summary.authorizedLevels > 0
                  ? `第 ${summary.currentLevelOrder} 关 · ${summary.completedCount}/${summary.authorizedLevels}`
                  : '尚未开通'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">打字</dt>
              <dd className="mt-1 text-ink">
                {summary.typing ? `${summary.typing.wpm} WPM · ${summary.typing.accuracy}%` : '还没有记录'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">最近学习</dt>
              <dd className="mt-1 text-ink">{formatDate(summary.lastActiveAt)}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">已绑定家长</dt>
              <dd className="mt-1 text-ink">{summary.boundParentCount}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">家长绑定码</dt>
              <dd className="code-font mt-1 text-ink">{summary.bindCode || '—'}</dd>
            </div>
          </dl>
        )}
        {error && <p className="mt-6 text-sm text-danger">{error}</p>}
        {!error && !detail && <p className="mt-6 text-sm text-ink-soft">正在读取进度…</p>}
        {detail && detail.lessons.length === 0 && <p className="mt-6 text-sm text-ink-soft">还没有学习记录。</p>}
        {detail && <LessonList lessons={detail.lessons.filter((lesson) => lesson.authorized !== false)} />}
        {detail && detail.lessons.some((lesson) => lesson.authorized === false) && (
          <>
            <p className="mt-6 text-sm text-ink-soft">这些关不在当前授权里，不计入上面的进度。</p>
            <LessonList className="mt-3" lessons={detail.lessons.filter((lesson) => lesson.authorized === false)} unauthorized />
          </>
        )}
      </aside>
    </div>
  )
}

function LessonList({
  lessons,
  unauthorized,
  className = 'mt-6',
}: {
  lessons: Progress['lessons']
  unauthorized?: boolean
  className?: string
}) {
  if (!lessons.length) return null
  return (
    <ul className={`${className} divide-y divide-line`}>
      {lessons.map((lesson) => (
        <li key={lesson.levelId} className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-xs text-ink-soft">{catalogId(lesson.order)}</p>
            <LessonCueTip title={lesson.title} teachingIntent={lesson.teachingIntent} teacherGuide={lesson.teacherGuide} />
          </div>
          <span
            className={`chip shrink-0 ${
              unauthorized
                ? 'bg-canvas text-ink-soft'
                : lesson.completed
                  ? 'bg-success-soft text-success'
                  : lesson.current
                    ? 'bg-brand-soft text-brand-strong'
                    : 'bg-canvas text-ink-soft'
            }`}
          >
            {unauthorized ? '未授权' : lesson.completed ? '已完成' : lesson.current ? '进行中' : '已学过'}
          </span>
        </li>
      ))}
    </ul>
  )
}
