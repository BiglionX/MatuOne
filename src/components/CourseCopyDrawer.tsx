import { useState } from 'react'
import { saveCourseCopy } from '@/api/catalog'
import type { CourseCopyField, CourseCopySave } from '@/types/courseAdmin'

const LIMIT = 2000

/** 只编辑一段纯文本。代码和关卡结构不从这里写入。 */
export function CourseCopyDrawer({
  levelId,
  field,
  label,
  value,
  hint,
  onClose,
  onSaved,
}: {
  levelId: string
  field: CourseCopyField
  label: string
  value: string
  hint?: string
  onClose: () => void
  onSaved: (result: CourseCopySave) => void
}) {
  const [text, setText] = useState(value)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const trimmed = text.trim()
  const blocked = field === 'goal' && trimmed.length === 0

  const save = () => {
    if (blocked || trimmed.length > LIMIT) return
    setPending(true)
    setError('')
    saveCourseCopy(levelId, field, text)
      .then((result) => {
        onSaved(result)
        onClose()
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '文案没有保存')
        setPending(false)
      })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/40"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
      }}
    >
      <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-card" role="dialog" aria-modal="true" aria-label={`编辑${label}`}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">编辑{label}</h2>
            <p className="mt-1 text-xs text-ink-soft">纯文本。课文、代码和报错映射仍走 JSON 课程包。</p>
          </div>
          <button type="button" className="btn-ghost px-3 py-1 text-sm" onClick={onClose} disabled={pending}>
            关闭
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {hint && <p className="mb-3 text-sm text-ink-soft">{hint}</p>}
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            spellCheck={false}
            aria-label={label}
            className="min-h-48 w-full resize-y rounded-card border border-line bg-canvas p-3 text-sm leading-6 text-ink outline-none focus:border-brand"
          />
          <p className="mt-2 text-xs text-ink-soft">
            {trimmed.length} / {LIMIT} 字
            {trimmed.length > LIMIT ? '，请缩短后再保存' : ''}
          </p>
          {blocked && <p className="mt-2 text-sm text-danger">学习目标不能为空。</p>}
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={pending}>
            取消
          </button>
          <button type="button" className="btn-primary px-6" onClick={save} disabled={pending || blocked || trimmed.length > LIMIT}>
            {pending ? '正在保存…' : '保存'}
          </button>
        </div>
      </aside>
    </div>
  )
}
