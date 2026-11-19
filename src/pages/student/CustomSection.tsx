import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { completeStudentCustomSection, openStudentCustomSection } from '@/api/studentCustomCourses'
import { getCurrentStudent } from '@/api/studentAuth'
import { ApiError } from '@/lib/apiError'
import type { EnterLevelReason } from '@/api/studentLevel'
import type { StudentCustomMaterial } from '@/types/studentCustomCourse'
import { Lesson } from './Lesson'
import { FormError } from '@/components/FormError'

const ENTER_COPY: Record<EnterLevelReason, string> = {
  ok: '',
  unauthenticated: '请先登录',
  org_expired: '本机构服务已到期，请联系老师',
  org_disabled: '机构已停用，请联系老师',
  trial_locked: '试用期间只能学习 Level 1',
  not_entitled: '老师还没有为你开通这一关',
  course_locked: '本机构尚未开通该阶段课程，请联系老师',
  not_found: '没有找到这一关',
}

export function CustomSection() {
  const { courseId = '', sectionIndex: rawIndex = '' } = useParams()
  const navigate = useNavigate()
  const student = getCurrentStudent()
  const sectionIndex = Number(rawIndex)
  const indexOk = Number.isInteger(sectionIndex) && sectionIndex >= 0
  const requestKey = `${courseId}:${sectionIndex}`
  const [loadedKey, setLoadedKey] = useState('')
  const [material, setMaterial] = useState<StudentCustomMaterial | null>(null)
  const [level, setLevel] = useState<{ levelId: string; nextIndex: number | null } | null>(null)
  const [blocked, setBlocked] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [seen, setSeen] = useState<'wait' | 'ready' | 'failed'>('wait')
  const markReady = useCallback(() => setSeen('ready'), [])
  const markFailed = useCallback(() => setSeen('failed'), [])

  useEffect(() => {
    if (!student || !courseId || !indexOk) return
    let alive = true
    setSaving(false)
    setSeen('wait')
    setMaterial(null)
    setLevel(null)
    setBlocked('')
    setError('')
    openStudentCustomSection(courseId, sectionIndex)
      .then((result) => {
        if (!alive) return
        if ('allowed' in result) {
          setBlocked(result.allowed ? '' : ENTER_COPY[result.reason])
          return
        }
        if (result.kind === 'platform_level') {
          setLevel({ levelId: result.levelId, nextIndex: result.nextIndex })
          return
        }
        setMaterial(result)
      })
      .catch((err: unknown) => {
        if (!alive) return
        setError(err instanceof ApiError ? err.message : '这一节打开失败')
      })
      .finally(() => {
        if (!alive) return
        setLoadedKey(requestKey)
      })
    return () => {
      alive = false
    }
  }, [courseId, requestKey, sectionIndex, indexOk, student?.id])

  if (!student) return <Navigate to="/student/login" replace />

  const ready = loadedKey === requestKey
  if (ready && level) {
    return (
      <Lesson
        custom={{
          levelId: level.levelId,
          courseId,
          sectionIndex,
          nextIndex: level.nextIndex,
        }}
      />
    )
  }

  const finish = async () => {
    if (!material || material.readOnly) return
    setSaving(true)
    setError('')
    try {
      const saved = await completeStudentCustomSection({ courseId, sectionIndex })
      if (saved.nextIndex == null) navigate('/student?tab=custom')
      else navigate(`/student/custom/${courseId}/${saved.nextIndex}`)
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : '这一节没有记下来')
      setSaving(false)
    }
  }

  return (
    <div className="student-shell flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-8 py-4">
          <Link to="/student?tab=custom" className="btn-ghost px-2" aria-label="返回课程地图">
            ←
          </Link>
          <div className="min-w-0">
            <p className="text-sm text-ink-soft">{material?.courseTitle || '机构专属课'}</p>
            <h1 className="truncate text-lg font-semibold text-ink">{material ? material.title : '这一节'}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-8 py-6">
        {!ready && <p className="text-ink-soft">正在打开这一节…</p>}
        {ready && (blocked || error) && <FormError>{blocked || error}</FormError>}
        {ready && !blocked && material && (
          <MaterialView material={material} onReady={markReady} onFailed={markFailed} />
        )}
      </main>

      {ready && material && !blocked && (
        <footer className="sticky bottom-0 border-t border-line bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-8 py-4">
            <p className="text-sm text-ink-soft">
              {seen === 'failed'
                ? '素材暂时无法加载，请联系老师重新上传'
                : material.readOnly
                  ? '本机构服务已到期，只能查看。'
                  : seen === 'ready'
                    ? '看完这一页，就可以进入下一节。'
                    : '画面出来之后，才能进入下一节。'}
            </p>
            {seen === 'ready' && (
              <button type="button" className="btn-primary px-8" disabled={material.readOnly || saving} onClick={() => void finish()}>
                {saving ? '正在记下…' : material.nextIndex == null ? '看完了，回到课程' : '看完了，下一步'}
              </button>
            )}
            {seen === 'failed' && !material.readOnly && (
              <button type="button" className="btn-secondary px-8" disabled={saving} onClick={() => void finish()}>
                {saving ? '正在记下…' : '先跳过'}
              </button>
            )}
          </div>
        </footer>
      )}
    </div>
  )
}

function MaterialView({
  material,
  onReady,
  onFailed,
}: {
  material: StudentCustomMaterial
  onReady: () => void
  onFailed: () => void
}) {
  const [zoom, setZoom] = useState(false)
  const [broken, setBroken] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const fileUrl = material.fileUrl

  useEffect(() => {
    if (material.fileType === 'text') {
      onReady()
      return
    }
    if (!fileUrl) onFailed()
  }, [fileUrl, material.fileType, onReady, onFailed])

  useEffect(() => {
    if (material.fileType !== 'pdf' || !fileUrl) return undefined
    let cancelled = false
    void fetch(fileUrl)
      .then((response) => {
        if (cancelled) return
        if (!response.ok) {
          setBroken(true)
          onFailed()
          return
        }
        setPdfOpen(true)
      })
      .catch(() => {
        if (!cancelled) setPdfOpen(true)
      })
    return () => {
      cancelled = true
    }
  }, [fileUrl, material.fileType, onFailed])

  useEffect(() => {
    if (!zoom) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoom(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  if (material.fileType === 'text') {
    return <article className="card whitespace-pre-wrap p-8 text-lg leading-8 text-ink">{material.content || material.title}</article>
  }
  if (!fileUrl || broken) {
    return <p className="rounded-field bg-white px-4 py-16 text-center text-ink">素材暂时无法加载，请联系老师重新上传</p>
  }
  if (material.fileType === 'pdf') {
    if (!pdfOpen) return <p className="text-ink-soft">正在打开这份 PDF…</p>
    return (
      <iframe
        title={material.title}
        src={`${fileUrl}#toolbar=0&navpanes=0`}
        className="min-h-[70vh] w-full flex-1 rounded-card border border-line bg-white"
        onLoad={onReady}
      />
    )
  }
  return (
    <div className="flex flex-1 items-center justify-center">
      <button type="button" className="max-w-full" onClick={() => setZoom(true)} aria-label={`放大查看${material.title}`}>
        <img
          src={fileUrl}
          alt={material.title}
          className="max-h-[70vh] max-w-full cursor-zoom-in rounded-card object-contain shadow-card"
          onLoad={onReady}
          onError={() => {
            setBroken(true)
            onFailed()
          }}
        />
      </button>
      {zoom && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-ink/80 p-6"
          role="dialog"
          aria-modal="true"
          aria-label={material.title}
          onClick={() => setZoom(false)}
        >
          <img src={fileUrl} alt={material.title} className="h-[85vh] w-full object-contain" />
        </div>
      )}
    </div>
  )
}
