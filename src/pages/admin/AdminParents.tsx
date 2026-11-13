import { useEffect, useState } from 'react'
import {
  ApiError,
  getAdminParent,
  listAdminParents,
  resetAdminParentPassword,
  unbindAdminParent,
  deleteAdminParent,
  type AdminParentChild,
  type AdminParentDetail,
  type AdminParentList,
} from '@/api/adminParents'
import { formatDate } from '@/lib/format'

const PAGE_SIZE = 20

function formatWhen(iso: string | null, empty: string): string {
  if (!iso) return empty
  return formatDate(iso)
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', 'true')
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

export function AdminParents() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [list, setList] = useState<AdminParentList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reload, setReload] = useState(0)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AdminParentDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [pending, setPending] = useState<AdminParentChild | null>(null)
  const [unbinding, setUnbinding] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [issued, setIssued] = useState<{ account: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirm, setConfirm] = useState<{ kind: 'reset' | 'delete'; id: string; account: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setList(null)
    listAdminParents({ page, pageSize: PAGE_SIZE, keyword: keyword.trim() })
      .then((next) => {
        if (!cancelled) setList(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : '读取失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, keyword, reload])

  useEffect(() => {
    if (!detailId) return
    let cancelled = false
    setDetailLoading(true)
    setDetailError('')
    setDetail(null)
    setPending(null)
    getAdminParent(detailId)
      .then((next) => {
        if (!cancelled) setDetail(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) setDetailError(err instanceof ApiError ? err.message : '读取失败')
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [detailId, reload])

  useEffect(() => {
    if (!detailId && !issued && !confirm) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (issued) setIssued(null)
      else if (confirm) setConfirm(null)
      else if (pending) setPending(null)
      else setDetailId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detailId, issued, pending, confirm])

  const total = list?.total ?? 0
  const pageSize = list?.pageSize ?? PAGE_SIZE
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const parents = list?.parents ?? []

  const confirmUnbind = () => {
    if (!detail || !pending) return
    setUnbinding(true)
    setNotice('')
    unbindAdminParent(detail.parent.id, pending.studentId)
      .then(() => {
        setPending(null)
        setReload((current) => current + 1)
      })
      .catch((err: unknown) => setNotice(err instanceof ApiError ? err.message : '解除失败'))
      .finally(() => setUnbinding(false))
  }

  const resetPassword = (parent: { id: string; account: string }) => {
    setResetting(true)
    setCopied(false)
    setNotice('')
    resetAdminParentPassword(parent.id)
      .then((result) => setIssued({ account: parent.account, password: result.password }))
      .catch((err: unknown) => setNotice(err instanceof ApiError ? err.message : '重置失败'))
      .finally(() => setResetting(false))
  }

  const deleteParent = (parentId: string) => {
    setDeleting(true)
    setNotice('')
    deleteAdminParent(parentId)
      .then(() => {
        if (detailId === parentId) setDetailId(null)
        setReload((current) => current + 1)
      })
      .catch((err: unknown) => setNotice(err instanceof ApiError ? err.message : '注销失败'))
      .finally(() => setDeleting(false))
  }

  return (
    <div className="px-8 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-ink">家长库</h1>
        <p className="mt-1 text-sm text-ink-soft">全平台家长。可按家长账号或孩子姓名搜索。</p>
        {notice && <p className="mt-4 text-sm text-danger">{notice}</p>}

        <section className="card mt-6 p-4">
          <label className="block max-w-md text-sm text-ink-soft">
            家长账号 / 孩子姓名
            <input
              className="field mt-1"
              value={keyword}
              placeholder="搜索家长账号或孩子姓名"
              onChange={(event) => {
                setKeyword(event.target.value)
                setPage(1)
              }}
            />
          </label>
        </section>

        <section className="card mt-4 overflow-x-auto">
          {error && <p className="px-4 py-6 text-sm text-danger">{error}</p>}
          {!error && loading && parents.length === 0 && <p className="px-4 py-6 text-sm text-ink-soft">正在加载家长…</p>}
          {!error && !loading && parents.length === 0 && <p className="px-4 py-6 text-sm text-ink-soft">没有符合条件的家长。</p>}
          {!error && parents.length > 0 && (
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-ink-soft">
                <tr className="border-b border-line">
                  {['家长账号', '绑定孩子数', '注册时间', '最近登录', '操作'].map((label) => (
                    <th key={label} className="px-4 py-3 font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parents.map((parent) => (
                  <tr key={parent.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-mono text-ink">{parent.account}</td>
                    <td className="px-4 py-3 text-ink">{parent.childCount}</td>
                    <td className="px-4 py-3 text-ink-soft">{formatWhen(parent.createdAt, '—')}</td>
                    <td className="px-4 py-3 text-ink-soft">{formatWhen(parent.lastLoginAt, '还没有登录')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button type="button" className="text-brand-strong" onClick={() => setDetailId(parent.id)}>
                          查看详情
                        </button>
                        <button type="button" className="text-ink-soft" onClick={() => setConfirm({ kind: 'reset', id: parent.id, account: parent.account })}>
                          重置密码
                        </button>
                        <button type="button" className="text-danger" onClick={() => setConfirm({ kind: 'delete', id: parent.id, account: parent.account })}>
                          注销账号
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {!error && (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-ink-soft">
            <span>共 {total} 位家长</span>
            <div className="flex items-center gap-3">
              <button type="button" className="btn-ghost" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                上一页
              </button>
              <span>
                第 {Math.min(page, pages)} / {pages} 页
              </span>
              <button type="button" className="btn-ghost" disabled={page >= pages || loading} onClick={() => setPage((current) => current + 1)}>
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {detailId && (
        <div
          className="fixed inset-0 z-30 flex justify-end bg-ink/40"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !issued) setDetailId(null)
          }}
          role="presentation"
        >
          <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-card" role="dialog" aria-modal="true" aria-labelledby="parent-detail-title">
            <div className="flex items-start justify-between gap-3">
              <h2 id="parent-detail-title" className="text-xl font-bold text-ink">
                {detail?.parent.account ?? '家长详情'}
              </h2>
              <button type="button" className="text-sm text-ink-soft" onClick={() => setDetailId(null)}>
                关闭
              </button>
            </div>
            {detailLoading && <p className="mt-6 text-sm text-ink-soft">正在读取…</p>}
            {detailError && <p className="mt-6 text-sm text-danger">{detailError}</p>}
            {detail && (
              <div className="mt-6 space-y-6">
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-ink-soft">账号</dt>
                    <dd className="mt-1 font-mono text-ink">{detail.parent.account}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">绑定孩子</dt>
                    <dd className="mt-1 text-ink">{detail.parent.childCount}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">注册时间</dt>
                    <dd className="mt-1 text-ink">{formatWhen(detail.parent.createdAt, '—')}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">最近登录</dt>
                    <dd className="mt-1 text-ink">{formatWhen(detail.parent.lastLoginAt, '还没有登录')}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setConfirm({ kind: 'reset', id: detail.parent.id, account: detail.parent.account })}
                >
                  重置密码
                </button>
                <button
                  type="button"
                  className="text-sm text-danger"
                  onClick={() => setConfirm({ kind: 'delete', id: detail.parent.id, account: detail.parent.account })}
                >
                  注销账号
                </button>

                <div>
                  <h3 className="text-sm font-medium text-ink">绑定的孩子</h3>
                  {detail.children.length === 0 ? (
                    <p className="mt-2 text-sm text-ink-soft">还没有绑定孩子。</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-line rounded-field border border-line">
                      {detail.children.map((child) => (
                        <li key={child.studentId} className="px-3 py-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-ink">{child.name}</p>
                              <p className="mt-1 text-ink-soft">{child.orgName}</p>
                              <p className="mt-1 text-ink-soft">{formatWhen(child.boundAt, '—')}</p>
                            </div>
                            {pending?.studentId === child.studentId ? (
                              <div className="max-w-[180px] text-right">
                                <p className="text-ink">解绑后家长将无法查看该孩子数据</p>
                                <div className="mt-2 flex justify-end gap-2">
                                  <button type="button" className="text-danger disabled:opacity-40" disabled={unbinding} onClick={confirmUnbind}>
                                    确认解绑
                                  </button>
                                  <button type="button" className="text-ink-soft" onClick={() => setPending(null)}>
                                    取消
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button type="button" className="text-danger" onClick={() => setPending(child)}>
                                强制解绑
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {confirm && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirm(null)
          }}
          role="presentation"
        >
          <div className="card w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="parent-confirm-title">
            <h2 id="parent-confirm-title" className="text-xl font-bold text-ink">
              {confirm.kind === 'reset' ? '重置密码' : '注销账号'}
            </h2>
            <p className="mt-2 text-sm text-ink">
              {confirm.kind === 'reset'
                ? `确认为 ${confirm.account} 重置密码？原密码会立即失效。`
                : `确认注销 ${confirm.account}？注销后无法登录，已绑定的孩子会解除，账号信息会被清除。`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={() => setConfirm(null)}>
                取消
              </button>
              <button
                type="button"
                className={confirm.kind === 'delete' ? 'text-sm font-medium text-danger' : 'btn-primary'}
                disabled={confirm.kind === 'reset' ? resetting : deleting}
                onClick={() => {
                  const target = confirm
                  setConfirm(null)
                  if (target.kind === 'reset') resetPassword(target)
                  else deleteParent(target.id)
                }}
              >
                {confirm.kind === 'reset' ? '确认重置' : '确认注销'}
              </button>
            </div>
          </div>
        </div>
      )}

      {issued && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIssued(null)
          }}
          role="presentation"
        >
          <div className="card w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="parent-reset-title">
            <h2 id="parent-reset-title" className="text-xl font-bold text-ink">
              新密码
            </h2>
            <p className="mt-2 rounded-field bg-warning-soft px-4 py-3 text-sm text-ink">
              已为 {issued.account} 生成新密码。此密码只显示一次，关闭后无法再次查看。
            </p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="font-mono text-lg font-semibold text-ink">{issued.password}</span>
              <button
                type="button"
                className="btn-secondary px-3 text-sm"
                onClick={() => {
                  void copyText(issued.password).then((ok) => {
                    if (ok) setCopied(true)
                  })
                }}
              >
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <button type="button" className="btn-primary mt-6 w-full" onClick={() => setIssued(null)}>
              我已记下
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
