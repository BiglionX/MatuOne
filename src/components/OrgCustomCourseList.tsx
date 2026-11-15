import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '@/lib/apiError'
import {
  assignOrgCustomCourse,
  createOrgCustomCourse,
  listOrgCustomCourses,
  removeOrgCustomCourse,
  unassignOrgCustomCourse,
} from '@/api/orgCustomCourses'
import { OrgAccessNotice } from '@/components/OrgAccessNotice'
import type { OrgCustomCourseSummary } from '@/types/orgMaterial'

interface PersonOption {
  id: string
  name: string
}

export function OrgCustomCourseList({
  groups,
  students,
  readOnly,
}: {
  groups: PersonOption[]
  students: PersonOption[]
  readOnly: boolean
}) {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<OrgCustomCourseSummary[]>([])
  const [ready, setReady] = useState(false)
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [pending, setPending] = useState<OrgCustomCourseSummary | null>(null)
  const [targets, setTargets] = useState<Record<string, string>>({})

  const load = () =>
    listOrgCustomCourses()
      .then(setCourses)
      .catch((error: unknown) => {
        if (error instanceof ApiError) setNotice(error.message)
      })
      .finally(() => setReady(true))

  useEffect(() => {
    void load()
  }, [])

  const create = async () => {
    if (readOnly) return
    setNotice('')
    setCreating(true)
    try {
      const course = await createOrgCustomCourse()
      navigate(`/org/custom-courses/${course.id}/edit`)
    } catch (error: unknown) {
      setNotice(error instanceof ApiError ? error.message : '创建失败')
      setCreating(false)
    }
  }

  const assign = async (courseId: string) => {
    const target = targets[courseId] ?? ''
    const [subjectType, subjectId] = target.split(':')
    if ((subjectType !== 'group' && subjectType !== 'student') || !subjectId) {
      setNotice('请选择要分配的分组或学生')
      return
    }
    setNotice('')
    try {
      setCourses(await assignOrgCustomCourse({ courseId, subjectType, subjectId }))
    } catch (error: unknown) {
      setNotice(error instanceof ApiError ? error.message : '分配失败')
    }
  }

  const remove = async (course: OrgCustomCourseSummary) => {
    setRemoving(true)
    setNotice('')
    try {
      setCourses(await removeOrgCustomCourse(course.id))
      setPending(null)
    } catch (error: unknown) {
      setPending(null)
      setNotice(error instanceof ApiError ? error.message : '删除失败')
    } finally {
      setRemoving(false)
    }
  }

  const unassign = async (assignmentId: string) => {
    if (readOnly) return
    setNotice('')
    try {
      setCourses(await unassignOrgCustomCourse(assignmentId))
    } catch (error: unknown) {
      setNotice(error instanceof ApiError ? error.message : '取消失败')
    }
  }

  return (
    <section className="card p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">自定义课程</h2>
        </div>
        <button type="button" className="btn-primary shrink-0 px-6" disabled={creating || readOnly} onClick={() => void create()}>
          {creating ? '正在创建…' : '新建课程'}
        </button>
      </div>
      <div className="mt-4">
        <OrgAccessNotice message={notice} />
      </div>
      {!ready && <p className="text-sm text-ink-soft">正在读取自定义课程…</p>}
      {ready && courses.length === 0 && <p className="text-sm text-ink-soft">还没有自定义课程。</p>}
      <ul className="space-y-4">
        {courses.map((course) => (
          <li key={course.id} className="rounded-card border border-line px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{course.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{course.sectionCount} 个环节</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link to={`/org/custom-courses/${course.id}/edit`} className="btn-secondary px-4">
                  编辑
                </Link>
                <button type="button" className="btn-ghost text-danger" disabled={readOnly} onClick={() => setPending(course)}>
                  删除
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {course.assignments.map((assignment) => (
                <span key={assignment.id} className="chip bg-canvas text-ink">
                  {assignment.subjectType === 'group' ? '分组' : '学生'} · {assignment.label}
                  <button type="button" className="ml-2 text-ink-soft disabled:opacity-40" disabled={readOnly} onClick={() => void unassign(assignment.id)}>
                    取消
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                className="field max-w-xs"
                disabled={readOnly}
                value={targets[course.id] ?? ''}
                onChange={(event) => setTargets((current) => ({ ...current, [course.id]: event.target.value }))}
              >
                <option value="">分配给…</option>
                <optgroup label="分组">
                  {groups.map((group) => (
                    <option key={group.id} value={`group:${group.id}`}>
                      {group.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="学生">
                  {students.map((student) => (
                    <option key={student.id} value={`student:${student.id}`}>
                      {student.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <button type="button" className="btn-secondary px-4" disabled={readOnly} onClick={() => void assign(course.id)}>
                分配
              </button>
            </div>
          </li>
        ))}
      </ul>
      {pending && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !removing) setPending(null)
          }}
          role="presentation"
        >
          <div className="card w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="remove-course-title">
            <h2 id="remove-course-title" className="text-xl font-bold text-ink">
              删除课程
            </h2>
            <p className="mt-2 text-sm text-ink">
              删除后，学生端不再显示「{pending.title}」。已有的学习记录仍保留。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn-ghost" disabled={removing} onClick={() => setPending(null)}>
                取消
              </button>
              <button type="button" className="btn-primary bg-danger hover:bg-danger" disabled={removing} onClick={() => void remove(pending)}>
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
