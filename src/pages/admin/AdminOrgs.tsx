import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, getPlatformOperator, getPlatformProfile, listOrgs, loadOverview, provisionOrg } from '@/api/adminOrgs'
import type { OrgLedgerRow, OrgStatus, ProvisionOrgResult } from '@/types/orgAdmin'
import type { OpsOverview } from '@/types/ops'

const STATUS_META: Record<OrgStatus, { label: string; className: string }> = {
  trial: { label: '试用中', className: 'bg-brand-soft text-brand-strong' },
  active: { label: '正常', className: 'bg-success-soft text-success' },
  expired: { label: '已到期', className: 'bg-warning-soft text-warning' },
  disabled: { label: '停用', className: 'bg-danger-soft text-danger' },
}

const EMPTY_FORM = {
  name: '',
  contactName: '',
  contactPhone: '',
  campus: '',
  seatQuota: '10',
  trialDays: '14',
}

function ledgerDay(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
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

export function AdminOrgs() {
  const [rows, setRows] = useState<OrgLedgerRow[]>([])
  const [operator, setOperator] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [status, setStatus] = useState<OrgStatus | 'all'>('all')
  const [expireFrom, setExpireFrom] = useState('')
  const [expireTo, setExpireTo] = useState('')
  const [keyword, setKeyword] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState<ProvisionOrgResult | null>(null)
  const [copied, setCopied] = useState<'account' | 'password' | ''>('')
  const [overview, setOverview] = useState<OpsOverview | null>(null)
  const canProvision = getPlatformProfile()?.role !== 'finance'

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, success])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      listOrgs({ status, expireFrom: expireFrom || undefined, expireTo: expireTo || undefined, keyword }),
      getPlatformOperator(),
      loadOverview().catch(() => null),
    ])
      .then(([next, name, stats]) => {
        if (cancelled) return
        setRows(next)
        setOperator(name)
        setOverview(stats)
        setLoadError('')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(error instanceof ApiError ? error.message : '台账加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [status, expireFrom, expireTo, keyword])

  const closeModal = () => {
    setOpen(false)
    setForm(EMPTY_FORM)
    setFormError('')
    setSuccess(null)
    setCopied('')
    setSubmitting(false)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      const result = await provisionOrg({
        name: form.name,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        campus: form.campus,
        seatQuota: Number(form.seatQuota),
        trialDays: Number(form.trialDays),
      })
      setSuccess(result)
      setStatus('all')
      setExpireFrom('')
      setExpireTo('')
      setKeyword('')
      const next = await listOrgs({})
      setRows(next)
    } catch (error: unknown) {
      setFormError(error instanceof ApiError ? error.message : '开户失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-8 py-8">
      <div className="mx-auto max-w-6xl">
        {overview && (
            <section className="grid gap-3 sm:grid-cols-4">
            {[
              ['待续费', String(overview.renewing)],
              ['试用转正常', `${overview.conversion}%`],
              ['本月新增', String(overview.newOrgs)],
              ['本月收款', overview.collected.toLocaleString('zh-CN')],
            ].map(([label, value]) => (
              <div key={label} className="card px-4 py-3">
                <p className="text-sm text-ink-soft">{label}</p>
                <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
              </div>
            ))}
          </section>
        )}

        <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">机构台账</h1>
            <p className="mt-1 text-sm text-ink-soft">
              开户后生成机构管理员。操作人：{operator || '…'}（来自登录会话，不在表单里填写）
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="chip bg-brand-soft text-brand-strong">平台后台</span>
            {canProvision && (
              <button type="button" className="btn-primary px-5" onClick={() => setOpen(true)}>
                开户
              </button>
            )}
          </div>
        </header>

        <section className="card mt-6 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-ink-soft">
              状态
              <select
                className="field mt-1 w-36"
                value={status}
                onChange={(e) => setStatus(e.target.value as OrgStatus | 'all')}
              >
                <option value="all">全部状态</option>
                <option value="trial">试用中</option>
                <option value="active">正常</option>
                <option value="expired">已到期</option>
                <option value="disabled">停用</option>
              </select>
            </label>
            <label className="text-sm text-ink-soft">
              到期起
              <input className="field mt-1 w-40" type="date" value={expireFrom} onChange={(e) => setExpireFrom(e.target.value)} />
            </label>
            <label className="text-sm text-ink-soft">
              到期止
              <input className="field mt-1 w-40" type="date" value={expireTo} onChange={(e) => setExpireTo(e.target.value)} />
            </label>
            <label className="min-w-[220px] flex-1 text-sm text-ink-soft">
              关键词
              <input
                className="field mt-1"
                value={keyword}
                placeholder="名称 / 编号 / 电话"
                onChange={(e) => setKeyword(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setStatus('all')
                setExpireFrom('')
                setExpireTo('')
                setKeyword('')
              }}
            >
              清空筛选
            </button>
          </div>
          <p className="mt-3 text-xs text-ink-soft">默认按最近到期排列。黄底表示试用中或正常、且 30 天内到期。</p>
        </section>

        <section className="card mt-4 overflow-x-auto">
          {loadError && <p className="px-4 py-6 text-sm text-danger">{loadError}</p>}
          {!loadError && loading && rows.length === 0 && <p className="px-4 py-6 text-sm text-ink-soft">正在加载台账…</p>}
          {!loadError && !loading && rows.length === 0 && (
            <p className="px-4 py-6 text-sm text-ink-soft">没有符合条件的机构。</p>
          )}
          {!loadError && rows.length > 0 && (
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="text-ink-soft">
                <tr className="border-b border-line">
                  {['机构编号', '名称', '联系人电话', '校区', '席位（额度/已用）', '开通日', '试用到期', '正式到期', '状态', ''].map(
                    (label) => (
                      <th key={label} className="px-4 py-3 font-medium">
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const meta = STATUS_META[row.status]
                  return (
                    <tr
                      key={row.id}
                      data-status={row.status}
                      className={`border-b border-line last:border-0 ${row.expiringSoon ? 'bg-warning-soft/60' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-ink">{row.orgNo}</td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/orgs/${row.id}`} className="font-medium text-ink hover:text-brand-strong">
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink">{row.contactPhone}</td>
                      <td className="px-4 py-3 text-ink">{row.campus}</td>
                      <td className="px-4 py-3 text-ink">
                        {row.seatQuota} / {row.usedSeats}
                      </td>
                      <td className="px-4 py-3 text-ink">{ledgerDay(row.createdAt)}</td>
                      <td className="px-4 py-3 text-ink">{ledgerDay(row.trialExpireAt)}</td>
                      <td className="px-4 py-3 text-ink">{ledgerDay(row.serviceEndAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`chip ${meta.className}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/orgs/${row.id}`} className="text-brand-strong">
                          详情
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-ink/40 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') closeModal()
          }}
          role="presentation"
        >
          <div className="card w-full max-w-lg p-6" role="dialog" aria-modal="true" aria-labelledby="provision-title">
            {success ? (
              <div>
                <h2 id="provision-title" className="text-xl font-bold text-ink">
                  开户成功
                </h2>
                <p className="mt-2 rounded-field bg-warning-soft px-4 py-3 text-sm text-ink">
                  此密码只显示一次。关闭或刷新后无法再次获取，请立刻复制交给机构管理员。
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-ink-soft">机构编号</dt>
                    <dd className="mt-1 font-medium text-ink">{success.orgNo}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">管理员账号</dt>
                    <dd className="mt-1 flex items-center justify-between gap-3">
                      <span className="font-mono text-ink">{success.adminAccount}</span>
                      <button
                        type="button"
                        className="btn-secondary px-3 text-sm"
                        onClick={async () => {
                          const ok = await copyText(success.adminAccount)
                          if (ok) setCopied('account')
                        }}
                      >
                        {copied === 'account' ? '已复制' : '复制'}
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">初始密码</dt>
                    <dd className="mt-1 flex items-center justify-between gap-3">
                      <span className="font-mono text-base font-semibold text-ink">{success.initialPassword}</span>
                      <button
                        type="button"
                        className="btn-secondary px-3 text-sm"
                        onClick={async () => {
                          const ok = await copyText(success.initialPassword)
                          if (ok) setCopied('password')
                        }}
                      >
                        {copied === 'password' ? '已复制' : '复制'}
                      </button>
                    </dd>
                  </div>
                </dl>
                <button type="button" className="btn-primary mt-6 w-full" onClick={closeModal}>
                  我已复制，关闭
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h2 id="provision-title" className="text-xl font-bold text-ink">
                  机构开户
                </h2>
                <p className="mt-1 text-sm text-ink-soft">开通后状态为试用中。试用席位最多 10 个。</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-ink-soft sm:col-span-2">
                    机构名
                    <input className="field mt-1" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                  </label>
                  <label className="text-sm text-ink-soft">
                    联系人
                    <input
                      className="field mt-1"
                      value={form.contactName}
                      onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))}
                    />
                  </label>
                  <label className="text-sm text-ink-soft">
                    电话
                    <input
                      className="field mt-1"
                      inputMode="numeric"
                      value={form.contactPhone}
                      onChange={(e) => setForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                    />
                  </label>
                  <label className="text-sm text-ink-soft sm:col-span-2">
                    校区
                    <input className="field mt-1" value={form.campus} onChange={(e) => setForm((prev) => ({ ...prev, campus: e.target.value }))} />
                  </label>
                  <label className="text-sm text-ink-soft">
                    席位额度
                    <input
                      className="field mt-1"
                      inputMode="numeric"
                      value={form.seatQuota}
                      onChange={(e) => setForm((prev) => ({ ...prev, seatQuota: e.target.value }))}
                    />
                  </label>
                  <label className="text-sm text-ink-soft">
                    试用天数
                    <input
                      className="field mt-1"
                      inputMode="numeric"
                      value={form.trialDays}
                      onChange={(e) => setForm((prev) => ({ ...prev, trialDays: e.target.value }))}
                    />
                  </label>
                </div>
                {formError && <p className="mt-4 rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{formError}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" className="btn-ghost" onClick={closeModal}>
                    取消
                  </button>
                  <button type="submit" className="btn-primary px-6" disabled={submitting}>
                    {submitting ? '正在开户…' : '确认开户'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
