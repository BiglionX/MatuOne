import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listAdminStudents, type AdminStudentList } from '@/api/adminStudents'
import {
  ApiError,
  listBilling,
  loadOrgDetail,
  quoteSeats,
  saveBilling,
  setInvoiceStatus,
  setOrgManualStatus,
  type OrgDetail,
  type ProvisionLog,
} from '@/api/adminOrgs'
import { formatDate } from '@/lib/format'
import type { OrgStatus } from '@/types/orgAdmin'
import type { BillingInput, BillingRecord, BillingType, InvoiceStatus } from '@/types/ops'

type TabId = 'overview' | 'people' | 'records'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: '概况' },
  { id: 'people', label: '学生与家长' },
  { id: 'records', label: '收费与开通记录' },
]

const STATUS_META: Record<OrgStatus, { label: string; className: string }> = {
  trial: { label: '试用中', className: 'bg-brand-soft text-brand-strong' },
  active: { label: '正常', className: 'bg-success-soft text-success' },
  expired: { label: '已到期', className: 'bg-warning-soft text-warning' },
  disabled: { label: '停用', className: 'bg-danger-soft text-danger' },
}

const TYPES: BillingType[] = ['续费', '新购', '扩容', '试用']
const INVOICE: InvoiceStatus[] = ['未开票', '已申请', '已开票', '已寄出']

function dayLabel(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function isOrgStatus(value: string): value is OrgStatus {
  return value === 'trial' || value === 'active' || value === 'expired' || value === 'disabled'
}

export function AdminOrgDetail() {
  const { orgId = '' } = useParams()
  const [tab, setTab] = useState<TabId>('overview')
  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [logs, setLogs] = useState<ProvisionLog[]>([])
  const [records, setRecords] = useState<BillingRecord[]>([])
  const [students, setStudents] = useState<AdminStudentList | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [renewing, setRenewing] = useState(false)
  const [confirmStatus, setConfirmStatus] = useState<'停用' | '恢复' | null>(null)
  const [savingStatus, setSavingStatus] = useState(false)

  const reload = () => {
    setError('')
    return Promise.all([loadOrgDetail(orgId), listBilling(orgId)])
      .then(([detail, nextRecords]) => {
        setOrg(detail.org)
        setLogs(detail.logs)
        setRecords(nextRecords)
      })
      .catch((err: unknown) => {
        setOrg(null)
        setError(err instanceof ApiError ? err.message : '读取失败')
      })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    reload().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [orgId])

  useEffect(() => {
    if (tab !== 'people' || !orgId) return
    let cancelled = false
    listAdminStudents({ orgId, page: 1, pageSize: 50 })
      .then((next) => {
        if (!cancelled) setStudents(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) setNotice(err instanceof ApiError ? err.message : '读取失败')
      })
    return () => {
      cancelled = true
    }
  }, [tab, orgId])

  const status = org && isOrgStatus(org.status) ? org.status : 'expired'
  const meta = STATUS_META[status]

  return (
    <div className="px-8 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">{org?.name ?? '机构详情'}</h1>
            <p className="mt-1 text-sm text-ink-soft">{org ? `${org.orgNo} · ${org.campus}` : '查看这个机构的概况、学生和收费记录。'}</p>
          </div>
          <Link to="/admin/orgs" className="text-sm text-ink-soft">
            返回台账
          </Link>
        </header>

        <div className="mt-6 flex gap-6 border-b border-line">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`border-b-2 pb-2 text-sm font-medium ${tab === item.id ? 'border-brand text-brand-strong' : 'border-transparent text-ink-soft'}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        {notice && <p className="mt-4 text-sm text-danger">{notice}</p>}
        {!error && loading && <p className="mt-6 text-sm text-ink-soft">正在读取机构…</p>}

        {org && tab === 'overview' && (
          <div className="mt-6 space-y-4">
            <section className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-ink-soft">机构编号</p>
                <p className="mt-1 font-medium text-ink">{org.orgNo}</p>
              </div>
              <div>
                <p className="text-sm text-ink-soft">联系人</p>
                <p className="mt-1 font-medium text-ink">{org.contactName}</p>
                <p className="text-sm text-ink-soft">{org.contactPhone}</p>
              </div>
              <div>
                <p className="text-sm text-ink-soft">状态</p>
                <p className="mt-1">
                  <span className={`chip ${meta.className}`}>{meta.label}</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-ink-soft">试用到期 / 正式到期</p>
                <p className="mt-1 font-medium text-ink">{dayLabel(org.trialExpireAt)}</p>
                <p className="text-sm text-ink-soft">{dayLabel(org.serviceEndAt)}</p>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
              <article className="card px-4 py-4">
                <p className="text-sm text-ink-soft">已用席位 / 总额度</p>
                <p className="mt-2 text-2xl font-bold text-ink">
                  {org.usedSeats} / {org.seatQuota}
                </p>
              </article>
              <article className="card px-4 py-4">
                <p className="text-sm text-ink-soft">在读学生</p>
                <p className="mt-2 text-2xl font-bold text-ink">{org.activeStudents}</p>
              </article>
              <article className="card px-4 py-4">
                <p className="text-sm text-ink-soft">绑定家长</p>
                <p className="mt-2 text-2xl font-bold text-ink">{org.boundParents}</p>
              </article>
            </section>

            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn-primary" onClick={() => setRenewing(true)}>
                续费
              </button>
              <button type="button" className="btn-secondary" onClick={() => setConfirmStatus(status === 'disabled' ? '恢复' : '停用')}>
                {status === 'disabled' ? '恢复' : '停用'}
              </button>
            </div>
          </div>
        )}

        {org && tab === 'people' && (
          <section className="card mt-6 overflow-x-auto">
            {!students && <p className="px-4 py-6 text-sm text-ink-soft">正在读取学生…</p>}
            {students && students.students.length === 0 && <p className="px-4 py-6 text-sm text-ink-soft">这个机构还没有学生。</p>}
            {students && students.students.length > 0 && (
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-ink-soft">
                  <tr className="border-b border-line">
                    {['学生姓名', '账号', '当前进度', '最近学习', '绑定家长数'].map((label) => (
                      <th key={label} className="px-4 py-3 font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.students.map((student) => (
                    <tr key={student.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-medium text-ink">{student.name}</td>
                      <td className="px-4 py-3 font-mono text-ink">{student.account}</td>
                      <td className="px-4 py-3 text-ink">
                        第 {student.currentLevelOrder} 关 / 共 {students.totalLevels} 关
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{formatDate(student.lastActiveAt)}</td>
                      <td className="px-4 py-3 text-ink">{student.boundParentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {org && tab === 'records' && (
          <div className="mt-6 space-y-4">
            <section className="card overflow-x-auto">
              <h2 className="px-4 pt-4 text-lg font-semibold text-ink">收费记录</h2>
              {records.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ink-soft">还没有收费记录。</p>
              ) : (
                <table className="mt-2 w-full min-w-[760px] text-left text-sm">
                  <thead className="text-ink-soft">
                    <tr className="border-b border-line">
                      {['类型', '套餐', '席位', '金额', '服务期', '开票', '操作人'].map((label) => (
                        <th key={label} className="px-4 py-3 font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 text-ink">{record.type}</td>
                        <td className="px-4 py-3 text-ink">{record.plan}</td>
                        <td className="px-4 py-3 text-ink">{record.seats}</td>
                        <td className="px-4 py-3 text-ink">
                          {record.amount}
                          {record.overridden ? '（已改价）' : ''}
                        </td>
                        <td className="px-4 py-3 text-ink">
                          {record.serviceStart ?? '—'} → {record.serviceEnd ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="field"
                            value={record.invoiceStatus}
                            onChange={(event) => {
                              const invoiceStatus = event.target.value as InvoiceStatus
                              setInvoiceStatus(record.id, invoiceStatus)
                                .then(() => listBilling(orgId).then(setRecords))
                                .catch((err: unknown) => setNotice(err instanceof ApiError ? err.message : '更新失败'))
                            }}
                          >
                            {INVOICE.map((item) => (
                              <option key={item}>{item}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-ink-soft">{record.operator}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="card overflow-x-auto">
              <h2 className="px-4 pt-4 text-lg font-semibold text-ink">开通记录</h2>
              {logs.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ink-soft">还没有开通记录。</p>
              ) : (
                <table className="mt-2 w-full min-w-[640px] text-left text-sm">
                  <thead className="text-ink-soft">
                    <tr className="border-b border-line">
                      {['动作', '说明', '操作人', '时间'].map((label) => (
                        <th key={label} className="px-4 py-3 font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 font-medium text-ink">{log.action}</td>
                        <td className="px-4 py-3 text-ink">{log.summary || '—'}</td>
                        <td className="px-4 py-3 text-ink-soft">{log.operator}</td>
                        <td className="px-4 py-3 text-ink-soft">{formatDate(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        )}
      </div>

      {renewing && org && (
        <RenewForm
          seats={String(org.seatQuota || 10)}
          onClose={() => setRenewing(false)}
          onSubmit={async (record) => {
            await saveBilling(orgId, record)
            setRenewing(false)
            setTab('records')
            setNotice('')
            await reload()
          }}
        />
      )}

      {confirmStatus && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmStatus(null)
          }}
          role="presentation"
        >
          <div className="card w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="org-status-title">
            <h2 id="org-status-title" className="text-xl font-bold text-ink">
              {confirmStatus === '停用' ? '停用机构' : '恢复机构'}
            </h2>
            <p className="mt-2 text-sm text-ink">
              {confirmStatus === '停用' ? '停用后该机构无法登录。确认停用？' : '确认恢复该机构？恢复后按停用前的状态继续。'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={() => setConfirmStatus(null)}>
                取消
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={savingStatus}
                onClick={() => {
                  setSavingStatus(true)
                  setNotice('')
                  setOrgManualStatus(orgId, confirmStatus)
                    .then(() => {
                      setConfirmStatus(null)
                      return reload()
                    })
                    .catch((err: unknown) => setNotice(err instanceof ApiError ? err.message : '操作失败'))
                    .finally(() => setSavingStatus(false))
                }}
              >
                确认{confirmStatus}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RenewForm({
  seats: initialSeats,
  onClose,
  onSubmit,
}: {
  seats: string
  onClose: () => void
  onSubmit: (record: BillingInput) => Promise<void>
}) {
  const [type, setType] = useState<BillingType>('续费')
  const [seats, setSeats] = useState(initialSeats)
  const [amount, setAmount] = useState('')
  const [quoted, setQuoted] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [serviceStart, setServiceStart] = useState('')
  const [serviceEnd, setServiceEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const count = Number(seats)
    if (!Number.isInteger(count) || count < 1 || type === '试用') {
      setQuoted(type === '试用' ? 0 : null)
      if (type === '试用') setAmount('0')
      return
    }
    quoteSeats(count)
      .then((quote) => {
        setQuoted(quote.amount)
        setAmount(String(quote.amount))
      })
      .catch(() => setQuoted(null))
  }, [seats, type])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="presentation"
    >
      <form
        className="card w-full max-w-lg p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="renew-title"
        onSubmit={(event) => {
          event.preventDefault()
          const overridden = type !== '试用' && quoted != null && Number(amount) !== quoted
          setSaving(true)
          setFormError('')
          onSubmit({
            type,
            seats: Number(seats),
            amount: Number(amount),
            overridden,
            note,
            serviceStart: serviceStart || undefined,
            serviceEnd: serviceEnd || undefined,
          })
            .catch((err: unknown) => setFormError(err instanceof ApiError ? err.message : '保存失败'))
            .finally(() => setSaving(false))
        }}
      >
        <h2 id="renew-title" className="text-xl font-bold text-ink">
          续费
        </h2>
        <p className="mt-1 text-sm text-ink-soft">金额按运营配置里的平台底价计算，单位是元/席/月。改价时需要写备注。有所属代理时，系统按分成比例自动记一笔佣金。</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-ink-soft">
            类型
            <select className="field mt-1" value={type} onChange={(event) => setType(event.target.value as BillingType)}>
              {TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-ink-soft">
            席位
            <input className="field mt-1" value={seats} onChange={(event) => setSeats(event.target.value)} />
          </label>
          <label className="text-sm text-ink-soft">
            金额{quoted != null && type !== '试用' ? `（计算值 ${quoted}）` : ''}
            <input className="field mt-1" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>
          <label className="text-sm text-ink-soft">
            备注
            <input className="field mt-1" value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <label className="text-sm text-ink-soft">
            服务期起
            <input className="field mt-1" type="date" value={serviceStart} onChange={(event) => setServiceStart(event.target.value)} />
          </label>
          <label className="text-sm text-ink-soft">
            服务期止
            <input className="field mt-1" type="date" value={serviceEnd} onChange={(event) => setServiceEnd(event.target.value)} />
          </label>
        </div>
        {formError && <p className="mt-4 text-sm text-danger">{formError}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            确认收费
          </button>
        </div>
      </form>
    </div>
  )
}
