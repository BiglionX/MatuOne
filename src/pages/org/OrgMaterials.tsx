import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, listOrgMaterials, removeOrgMaterial, uploadOrgMaterial } from '@/api/orgMaterials'
import { OrgAccessNotice } from '@/components/OrgAccessNotice'
import { CardGridSkeleton } from '@/components/Skeleton'
import { formatDate } from '@/lib/format'
import type { OrgMaterial } from '@/types/orgMaterial'

const TYPE_LABEL: Record<OrgMaterial['fileType'], string> = {
  image: '图片',
  pdf: 'PDF',
  ppt: 'PPT',
  text: '文本',
}

export function OrgMaterials() {
  const [materials, setMaterials] = useState<OrgMaterial[]>([])
  const [ready, setReady] = useState(false)
  const [notice, setNotice] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState('')
  const [preview, setPreview] = useState<OrgMaterial | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () =>
    listOrgMaterials()
      .then((rows) => {
        setMaterials(rows)
        setReady(true)
      })
      .catch((error: unknown) => {
        setReady(true)
        if (error instanceof ApiError) setNotice(error.message)
      })

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!preview) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreview(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [preview])

  const takeFiles = async (files: File[]) => {
    if (files.length === 0 || uploading) return
    setNotice('')
    setUploading(true)
    const errors: string[] = []
    for (const file of files) {
      try {
        await uploadOrgMaterial(file)
      } catch (error: unknown) {
        errors.push(`${file.name}：${error instanceof ApiError ? error.message : '上传失败'}`)
      }
    }
    try {
      setMaterials(await listOrgMaterials())
      setReady(true)
    } catch (error: unknown) {
      if (error instanceof ApiError) errors.push(error.message)
    }
    setNotice(errors.join(' '))
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const confirmRemove = async (materialId: string) => {
    setNotice('')
    try {
      await removeOrgMaterial(materialId)
      setPendingRemoveId('')
      setMaterials(await listOrgMaterials())
    } catch (error: unknown) {
      setNotice(error instanceof ApiError ? error.message : '删除失败')
    }
  }

  return (
    <div className="px-8 py-8">
      <OrgAccessNotice message={notice} />
      <header className="mb-6">
        <Link to="/org/courses" className="text-sm text-ink-soft">
          ← 返回课程管理
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-ink">素材库</h1>
        <p className="mt-1 text-sm text-ink-soft">上传本机构的图片和 PDF，供自定义课程引用。PPT 请先导出为 PDF 再上传。</p>
      </header>

      <section
        className={`card max-w-3xl border-dashed p-8 text-center ${dragging ? 'border-brand bg-brand-soft' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void takeFiles(Array.from(event.dataTransfer.files))
        }}
      >
        <p className="text-base font-semibold text-ink">{uploading ? '正在上传…' : '把 JPG、PNG 或 PDF 拖到这里'}</p>
        <p className="mt-2 text-sm text-ink-soft">也可以点击选择文件。单个文件不超过 5MB。</p>
        <button type="button" className="btn-primary mt-5" disabled={uploading} onClick={() => fileRef.current?.click()}>
          选择文件
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
          multiple
          className="sr-only"
          onChange={(event) => void takeFiles(Array.from(event.target.files ?? []))}
        />
      </section>

      <section className="mt-8">
        {!ready && <CardGridSkeleton count={2} />}
        {ready && materials.length === 0 && <p className="text-sm text-ink-soft">还没有素材。上传图片或 PDF 后会出现在这里。</p>}
        <ul className="grid gap-4 lg:grid-cols-2">
          {materials.map((material) => (
            <li key={material.id} className="card overflow-hidden">
              <MaterialFrame material={material} onOpen={() => material.fileUrl && setPreview(material)} />
              <div className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <span className="chip bg-brand-soft text-brand-strong">{TYPE_LABEL[material.fileType] ?? material.fileType}</span>
                <p className="mt-3 truncate text-base font-semibold text-ink">{material.name}</p>
                <p className="mt-1 text-sm text-ink-soft">{formatDate(material.createdAt)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {pendingRemoveId === material.id ? (
                  <div className="flex gap-1">
                    <button type="button" className="btn-ghost text-danger" onClick={() => void confirmRemove(material.id)}>
                      确认删除
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => setPendingRemoveId('')}>
                      取消
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btn-ghost" onClick={() => setPendingRemoveId(material.id)}>
                    删除
                  </button>
                )}
              </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {preview?.fileUrl && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="素材预览">
          <div className="card flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <p className="truncate font-semibold text-ink">{preview.name}</p>
              <button type="button" className="btn-secondary" onClick={() => setPreview(null)}>
                关闭
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-canvas p-4">
              {preview.fileType === 'image' ? (
                <img src={preview.fileUrl} alt={preview.name} className="mx-auto max-h-[70vh] max-w-full object-contain" />
              ) : (
                <iframe title={preview.name} src={`${preview.fileUrl}#toolbar=0&navpanes=0`} className="h-[70vh] w-full rounded-field border border-line bg-white" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MaterialFrame({ material, onOpen }: { material: OrgMaterial; onOpen: () => void }) {
  const [broken, setBroken] = useState(false)
  if (!material.fileUrl || broken) {
    return <p className="bg-canvas px-5 py-10 text-center text-sm text-ink-soft">这个文件打不开，请重新上传</p>
  }
  if (material.fileType === 'pdf') {
    return (
      <button type="button" className="block h-48 w-full overflow-hidden bg-canvas" onClick={onOpen} aria-label={`查看${material.name}`}>
        <iframe title={material.name} src={`${material.fileUrl}#toolbar=0&navpanes=0&view=FitH`} className="pointer-events-none h-48 w-full" />
      </button>
    )
  }
  if (material.fileType === 'image') {
    return (
      <button type="button" className="block h-48 w-full bg-canvas" onClick={onOpen} aria-label={`查看${material.name}`}>
        <img src={material.fileUrl} alt={material.name} className="h-48 w-full object-contain" onError={() => setBroken(true)} />
      </button>
    )
  }
  return null
}
