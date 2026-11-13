import { useEffect, useState } from 'react'
import { listOrgs } from '@/api/adminOrgs'
import {
  ApiError,
  getAdminStudent,
  listAdminStudents,
  resetAdminStudentPassword,
  type AdminStudentDetail,
  type AdminStudentList,
  type AdminStudentRow,
} from '@/api/adminStudents'
import { formatDate } from '@/lib/format'
import type { OrgLedgerRow } from '@/types/orgAdmin'

const PAGE_SIZE = 20

function progressLabel(order: number, total: number): string {
  return `第 ${order} 关 / 共 ${total} 关`
}

function progressPercent(order: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((order / total) * 100)))
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

export function AdminStudents() {
  const [orgs, setOrgs] = useState<OrgLedgerRow[]>([])
  const [keyword, setKeyword] = useState('')
  const [orgId, setOrgId] = useState('')
  const [page, setPage] = useState(1)
  const [list, setList] = useState<AdminStudentList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AdminStudentDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [resettingId, setResettingId] = useState('')
  const [issued, setIssued] = useState<{ name: string; account: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmReset, setConfirmReset] = useState<Pick<AdminStudentRow, 'id' | 'name' | 'account'> | null>(null)

  useEffect(() => {
    let cancelled = false
    listOrgs()
      .then((next) => {
        if (!cancelled) setOrgs(next)
      })
      .catch(() => {
        if (!cancelled) setOrgs([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setList(null)
    listAdminStudents({
      page,
      pageSize: PAGE_SIZE,
      keyword: keyword.trim(),
      orgId: orgId || undefined,
    })
      .then((next) => {
        if (!cancelled) setList(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setList(null)
          setError(err instanceof ApiError ? err.message : '读取失败')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, keyword, orgId])

  useEffect(() => {
    if (!detailId) return
    let cancelled = false
    setDetailLoading(true)
    setDetailError('')
    setDetail(null)
    getAdminStudent(detailId)
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
  }, [detailId])

  useEffect(() => {
    if (!detailId && !issued && !confirmReset) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (issued) setIssued(null)
      else if (confirmReset) setConfirmReset(null)
      else setDetailId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detailId, issued, confirmReset])

  const total = list?.total ?? 0
  const totalLevels = detail?.totalLevels ?? list?.totalLevels ?? 0
  const pageSize = list?.pageSize ?? PAGE_SIZE
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const students = list?.students ?? []

  const resetPassword = (student: Pick<AdminStudentRow, 'id' | 'name' | 'account'>) => {
    setResettingId(student.id)
    setCopied(false)
    setNotice('')
    resetAdminStudentPassword(student.id)
      .then((result) => setIssued({ name: student.name, account: student.account, password: result.password }))
      .catch((err: unknown) => setNotice(err instanceof ApiError ? err.message : '重置失败'))
      .finally(() => setResettingId(''))
  }

  return (
    <div className="px-8 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-ink">学生库</h1>
        <p className="mt-1 text-sm text-ink-soft">全平台学生。可按机构和姓名或账号筛选。</p>
        {notice && <p className="mt-4 text-sm text-danger">{notice}</p>}

        <section className="card mt-6 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[220px] flex-1 text-sm text-ink-soft">
              姓名 / 账号
              <input
                className="field mt-1"
                value={keyword}
                placeholder="搜索学生姓名或账号"
                onChange={(event) => {
                  setKeyword(event.target.value)
                  setPage(1)
                }}
              />
            </label>
            <label className="text-sm text-ink-soft">
              机构
              <select
                className="field mt-1 w-48"
                value={orgId}
                onChange={(event) => {
                  setOrgId(event.target.value)
                  setPage(1)
                }}
              >
                <option value="">全部机构</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="card mt-4 overflow-x-auto">
          {error && <p className="px-4 py-6 text-sm text-danger">{error}</p>}
          {!error && loading && students.length === 0 && <p className="px-4 py-6 text-sm text-ink-soft">正在加载学生…</p>}
          {!error && !loading && students.length === 0 && <p className="px-4 py-6 text-sm text-ink-soft">没有符合条件的学生。</p>}
          {!error && students.length > 0 && (
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-ink-soft">
                <tr className="border-b border-line">
                  {['学生姓名', '账号', '所属机构', '当前进度', '最近学习', '绑定家长数', '操作'].map((label) => (
                    <th key={label} className="px-4 py-3 font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{student.name}</td>
                    <td className="px-4 py-3 font-mono text-ink">{student.account}</td>
                    <td className="px-4 py-3 text-ink">{student.orgName}</td>
                    <td className="px-4 py-3 text-ink">{progressLabel(student.currentLevelOrder, list?.totalLevels ?? 0)}</td>
                    <td className="px-4 py-3 text-ink-soft">{formatDate(student.lastActiveAt)}</td>
                    <td className="px-4 py-3 text-ink">{student.boundParentCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button type="button" className="text-brand-strong" onClick={() => setDetailId(student.id)}>
                          查看详情
                        </button>
                        <button
                          type="button"
                          className="text-ink-soft disabled:opacity-40"
                          disabled={resettingId === student.id}
                          onClick={() => setConfirmReset(student)}
                        >
                          重置密码
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
            <span>共 {total} 名学生</span>
            <div className="flex items-center gap-3">
              <button type="button" className="btn-ghost" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                上一页
              </button>
              <span>
                第 {Math.min(page, pages)} / {pages} 页
              </span>
              <button
                type="button"
                className="btn-ghost"
                disabled={page >= pages || loading}
                onClick={() => setPage((current) => current + 1)}
              >
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
            if (event.target === event.currentTarget) setDetailId(null)
          }}
          role="presentation"
        >
          <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-card" role="dialog" aria-modal="true" aria-labelledby="student-detail-title">
            <div className="flex items-start justify-between gap-3">
              <h2 id="student-detail-title" className="text-xl font-bold text-ink">
                {detail?.student.name ?? '学生详情'}
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
                    <dd className="mt-1 font-mono text-ink">{detail.student.account}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">状态</dt>
                    <dd className="mt-1">
                      <span className={`chip ${detail.student.status === 'active' ? 'bg-success-soft text-success' : 'bg-canvas text-ink-soft'}`}>
                        {detail.student.status === 'active' ? '正常' : '已停用'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">所属机构</dt>
                    <dd className="mt-1 text-ink">{detail.student.orgName}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">分组</dt>
                    <dd className="mt-1 text-ink">{detail.student.groupName}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">最近学习</dt>
                    <dd className="mt-1 text-ink">{formatDate(detail.student.lastActiveAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">绑定码</dt>
                    <dd className="mt-1 font-mono text-ink">{detail.student.bindCode || '—'}</dd>
                  </div>
                </dl>

                <div>
                  <p className="text-sm text-ink-soft">当前进度</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-soft">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${progressPercent(detail.student.currentLevelOrder, totalLevels)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-ink">{progressLabel(detail.student.currentLevelOrder, totalLevels)}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-ink">绑定的家长</h3>
                  {detail.parents.length === 0 ? (
                    <p className="mt-2 text-sm text-ink-soft">还没有绑定家长。</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-line rounded-field border border-line">
                      {detail.parents.map((parent) => (
                        <li key={`${parent.account}-${parent.boundAt}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                          <span className="font-mono text-ink">{parent.account}</span>
                          <span className="text-ink-soft">{formatDate(parent.boundAt)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  disabled={resettingId === detail.student.id}
                  onClick={() => setConfirmReset(detail.student)}
                >
                  重置密码
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {confirmReset && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmReset(null)
          }}
          role="presentation"
        >
          <div className="card w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="confirm-reset-title">
            <h2 id="confirm-reset-title" className="text-xl font-bold text-ink">
              重置密码
            </h2>
            <p className="mt-2 text-sm text-ink">
              确认为 {confirmReset.name}（{confirmReset.account}）重置密码？原密码会立即失效。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={() => setConfirmReset(null)}>
                取消
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={resettingId === confirmReset.id}
                onClick={() => {
                  const target = confirmReset
                  setConfirmReset(null)
                  resetPassword(target)
                }}
              >
                确认重置
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
          <div className="card w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
            <h2 id="reset-password-title" className="text-xl font-bold text-ink">
              新密码
            </h2>
            <p className="mt-2 rounded-field bg-warning-soft px-4 py-3 text-sm text-ink">
              已为 {issued.name}（{issued.account}）生成新密码。此密码只显示一次，关闭后无法再次查看。
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
