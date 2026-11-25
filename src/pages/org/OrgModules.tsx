import { useEffect, useState } from 'react'
import { getOrgSession } from '@/api/orgAuth'
import { ApiError } from '@/api/orgPortal'
import {
  listOrgManagedModules,
  restoreModule,
  revokeModule,
  type OrgModuleManaged,
} from '@/api/orgModules'
import { OrgAccessNotice } from '@/components/OrgAccessNotice'
import { getModule } from '@/modules/registry'
import { isToggleableModule, PROGRESS_MODULE_IDS } from '@/modules/ids'

export function OrgModules() {
  const session = getOrgSession()
  const readOnly = session?.readOnly === true
  const isAdmin = session?.role !== 'teacher'
  const canWrite = isAdmin && !readOnly

  const [modules, setModules] = useState<OrgModuleManaged[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<OrgModuleManaged | null>(null)

  useEffect(() => {
    setLoading(true)
    listOrgManagedModules()
      .then((rows) => {
        setModules(sortModules(rows))
        setNotice('')
      })
      .catch((error: unknown) => {
        setModules([])
        if (error instanceof ApiError) setNotice(error.message)
        else setNotice('读取失败')
      })
      .finally(() => setLoading(false))
  }, [])

  async function toggleModule(row: OrgModuleManaged) {
    if (!canWrite || !row.canToggle || busy) return
    if (!isToggleableModule(row.moduleId)) return
    if (row.enabled) {
      setRevokeTarget(row)
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const next = await restoreModule(row.moduleId)
      setModules(sortModules(next))
    } catch (error: unknown) {
      if (error instanceof ApiError) setNotice(error.message)
      else setNotice('重开失败')
    } finally {
      setBusy(false)
    }
  }

  async function confirmClose() {
    const target = revokeTarget
    if (!target || !isToggleableModule(target.moduleId)) {
      setNotice('没有可关闭的模块')
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const next = await revokeModule(target.moduleId)
      setModules(sortModules(next))
      setRevokeTarget(null)
    } catch (error: unknown) {
      if (error instanceof ApiError) setNotice(error.message)
      else setNotice('关闭失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-8 py-8">
      <OrgAccessNotice message={notice} />
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">模块开通</h1>
        <p className="mt-1 text-sm text-ink-soft">查看本机构已开通的教学模块。可自行开关的模块可在这里软关或重开；其余由平台决定。</p>
      </header>

      {loading ? (
        <p className="text-sm text-ink-soft">加载中…</p>
      ) : modules.length === 0 ? (
        <p className="text-sm text-ink-soft">暂无开通记录。</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {modules.map((row) => {
            const meta = getModule(row.moduleId)
            const name = meta?.display_name ?? row.moduleId
            return (
              <li key={row.moduleId} className="flex flex-wrap items-center justify-between gap-4 py-5">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{name}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {row.enabled ? '已开通' : '已关闭'}
                    {row.maxLevel != null && (
                      <>
                        {' · '}
                        课程包 Level 1–{row.maxLevel}
                        <span className="text-ink-soft">（平台决定，只读）</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusChip enabled={row.enabled} />
                  {row.canToggle ? (
                    <button
                      type="button"
                      className={row.enabled ? 'btn-ghost text-danger' : 'btn-secondary'}
                      disabled={!canWrite || busy}
                      title={!isAdmin ? '需要机构管理员' : readOnly ? '服务已到期，仅可查看' : undefined}
                      onClick={() => void toggleModule(row)}
                    >
                      {row.enabled ? '关闭' : '重新开通'}
                    </button>
                  ) : (
                    <span className="text-sm text-ink-soft">不可开关</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!isAdmin && (
        <p className="mt-4 text-sm text-ink-soft">开关模块需要机构管理员账号。</p>
      )}

      {revokeTarget && (
        <ConfirmDialog
          title={`关闭${getModule(revokeTarget.moduleId)?.display_name ?? revokeTarget.moduleId}`}
          body="关闭后，本机构学生在启动器将看不到这个模块，也无法进入。学习与本地草稿仍保留，可随时重新开通。"
          confirmLabel="确认关闭"
          danger
          busy={busy}
          onCancel={() => {
            if (!busy) setRevokeTarget(null)
          }}
          onConfirm={() => void confirmClose()}
        />
      )}
    </div>
  )
}

function sortModules(rows: OrgModuleManaged[]): OrgModuleManaged[] {
  return [...rows].sort(
    (a, b) => PROGRESS_MODULE_IDS.indexOf(a.moduleId) - PROGRESS_MODULE_IDS.indexOf(b.moduleId),
  )
}

function StatusChip({ enabled }: { enabled: boolean }) {
  return (
    <span className={`chip ${enabled ? 'bg-success-soft text-success' : 'bg-canvas text-ink-soft'}`}>
      {enabled ? '已开通' : '已关闭'}
    </span>
  )
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
      role="presentation"
    >
      <div className="card w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="org-modules-confirm-title">
        <h2 id="org-modules-confirm-title" className="text-xl font-bold text-ink">
          {title}
        </h2>
        <p className="mt-2 text-sm text-ink">{body}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-ghost" disabled={busy} onClick={onCancel}>
            取消
          </button>
          <button type="button" className={danger ? 'btn-primary bg-danger hover:bg-danger' : 'btn-primary'} disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
