import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ApiError,
  listBilling,
  quoteSeats,
  saveBilling,
  setInvoiceStatus,
  setOrgManualStatus,
} from '@/api/adminOrgs'
import { AdminNav } from '@/pages/admin/AdminNav'
import type { BillingRecord, BillingType, InvoiceStatus } from '@/types/ops'

const TYPES: BillingType[] = ['试用', '新购', '续费', '扩容']
const INVOICE: InvoiceStatus[] = ['未开票', '已申请', '已开票', '已寄出']

export function AdminBilling() {
  const { orgId = '' } = useParams()
  const [records, setRecords] = useState<BillingRecord[]>([])
  const [notice, setNotice] = useState('')
  const [type, setType] = useState<BillingType>('新购')
  const [seats, setSeats] = useState('40')
  const [amount, setAmount] = useState('')
  const [quoted, setQuoted] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [serviceStart, setServiceStart] = useState('')
  const [serviceEnd, setServiceEnd] = useState('')

  const reload = () =>
    listBilling(orgId)
      .then(setRecords)
      .catch((error: unknown) => setNotice(error instanceof ApiError ? error.message : '读取失败'))

  useEffect(() => {
    void reload()
  }, [orgId])

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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setNotice('')
    const overridden = type !== '试用' && quoted != null && Number(amount) !== quoted
    try {
      await saveBilling(orgId, {
        type,
        seats: Number(seats),
        amount: Number(amount),
        overridden,
        note,
        serviceStart: serviceStart || undefined,
        serviceEnd: serviceEnd || undefined,
      })
      setNote('')
      await reload()
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : '保存失败')
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-8 py-10">
      <div className="mx-auto max-w-5xl">
        <AdminNav />
        <header className="mt-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">收费记录</h1>
            <p className="mt-1 text-sm text-ink-soft">金额按席位年费自动计算，可以改价并写备注。收款方式只有对公转账。</p>
          </div>
          <Link to="/admin/orgs" className="text-sm text-ink-soft">
            返回台账
          </Link>
        </header>
        {notice && <p className="mt-4 rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{notice}</p>}

        <form onSubmit={submit} className="card mt-6 grid gap-3 p-5 sm:grid-cols-3">
          <label className="text-sm text-ink-soft">
            类型
            <select className="field mt-1" value={type} onChange={(e) => setType(e.target.value as BillingType)}>
              {TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-ink-soft">
            席位
            <input className="field mt-1" value={seats} onChange={(e) => setSeats(e.target.value)} />
          </label>
          <label className="text-sm text-ink-soft">
            金额{quoted != null && type !== '试用' ? `（计算值 ${quoted}）` : ''}
            <input className="field mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="text-sm text-ink-soft">
            服务期起
            <input className="field mt-1" type="date" value={serviceStart} onChange={(e) => setServiceStart(e.target.value)} />
          </label>
          <label className="text-sm text-ink-soft">
            服务期止
            <input className="field mt-1" type="date" value={serviceEnd} onChange={(e) => setServiceEnd(e.target.value)} />
          </label>
          <label className="text-sm text-ink-soft">
            备注
            <input className="field mt-1" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="sm:col-span-3 flex flex-wrap gap-2">
            <button type="submit" className="btn-primary">
              记一笔
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOrgManualStatus(orgId, '停用').then(reload).catch((error: unknown) => setNotice(error instanceof ApiError ? error.message : '操作失败'))}
            >
              停用机构
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOrgManualStatus(orgId, '恢复').then(reload).catch((error: unknown) => setNotice(error instanceof ApiError ? error.message : '操作失败'))}
            >
              恢复
            </button>
          </div>
        </form>

        <section className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
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
                      onChange={(e) => {
                        const invoiceStatus = e.target.value as InvoiceStatus
                        setInvoiceStatus(record.id, invoiceStatus)
                          .then(reload)
                          .catch((error: unknown) => setNotice(error instanceof ApiError ? error.message : '更新失败'))
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
        </section>
      </div>
    </div>
  )
}
