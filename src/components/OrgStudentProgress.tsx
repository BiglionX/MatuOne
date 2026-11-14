import { useEffect, useState } from 'react'
import { ApiError, loadOrgStudentProgress } from '@/api/orgPortal'
import type { OrgStudentProgress as Progress } from '@/types/orgProgress'
import { LessonCueTip } from '@/components/LessonCueTip'

function catalogId(order: number): string {
  return `L${String(order).padStart(4, '0')}`
}

/** 机构后台和学生页共用的学员进度明细。studentId 只用来点名，归属由服务端按机构会话核对。 */
export function OrgStudentProgress({ studentId, onClose }: { studentId: string; onClose: () => void }) {
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
        {error && <p className="mt-6 text-sm text-danger">{error}</p>}
        {!error && !detail && <p className="mt-6 text-sm text-ink-soft">正在读取进度…</p>}
        {detail && detail.lessons.length === 0 && <p className="mt-6 text-sm text-ink-soft">还没有学习记录。</p>}
        {detail && detail.lessons.length > 0 && (
          <ul className="mt-6 divide-y divide-line">
            {detail.lessons.map((lesson) => (
              <li key={lesson.levelId} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-xs text-ink-soft">{catalogId(lesson.order)}</p>
                  <LessonCueTip title={lesson.title} teachingIntent={lesson.teachingIntent} teacherGuide={lesson.teacherGuide} />
                </div>
                <span className={`chip shrink-0 ${lesson.completed ? 'bg-success-soft text-success' : lesson.current ? 'bg-brand-soft text-brand-strong' : 'bg-canvas text-ink-soft'}`}>
                  {lesson.completed ? '已完成' : lesson.current ? '进行中' : '已学过'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}
