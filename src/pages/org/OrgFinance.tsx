import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getOrgSession } from '@/api/orgAuth'
import { ApiError, getOrgFinance, requestOrgInvoice, saveOrgFinancePrice } from '@/api/orgPortal'
import { OrgAccessNotice } from '@/components/OrgAccessNotice'
import { FormError } from '@/components/FormError'
import { TableSkeleton } from '@/components/Skeleton'
import { SITE } from '@/config/site'
import type { OrgBill, OrgBillPayStatus, OrgFinanceView } from '@/types/orgFinance'

const PAY_CLASS: Record<OrgBillPayStatus, string> = {
  已支付: 'bg-success-soft text-success',
  待支付: 'bg-warning-soft text-warning',
}

export function OrgFinance() {
  const session = getOrgSession()
  const readOnly = session?.readOnly === true
  const [notice, setNotice] = useState('')
  const [view, setView] = useState<OrgFinanceView | null>(null)
  const [studentPrice, setStudentPrice] = useState('')
  const [priceSaved, setPriceSaved] = useState(false)
  const [priceError, setPriceError] = useState('')
  const [supportOpen, setSupportOpen] = useState(false)
  const [invoiceBill, setInvoiceBill] = useState<OrgBill | null>(null)
  const [invoiceTitle, setInvoiceTitle] = useState('')
  const [invoiceTaxNo, setInvoiceTaxNo] = useState('')
  const [invoiceError, setInvoiceError] = useState('')
  const [invoiceSending, setInvoiceSending] = useState(false)

  useEffect(() => {
    if (session?.role === 'teacher') return
    getOrgFinance()
      .then((next) => {
        setView(next)
        setStudentPrice(String(next.studentMonthlyPrice))
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError) setNotice(error.message)
      })
  }, [session?.role])

  if (session?.role === 'teacher') return <Navigate to="/org/dashboard" replace />

  const until = session?.serviceEndAt ?? session?.trialExpireAt
  const untilLabel = session?.serviceEndAt ? '正式到期' : '到期'
  const baseSeatPrice = view?.baseSeatPrice ?? 0
  const seats = view?.seatQuota ?? session?.seatQuota ?? 0
  const studentCount = view?.studentCount ?? session?.usedSeats ?? 0
  const typedPrice = Number(studentPrice)
  const priceReady = Number.isInteger(typedPrice) && typedPrice >= 150 && typedPrice <= 500 && baseSeatPrice > 0
  const fullProfit = priceReady ? (typedPrice - baseSeatPrice) * seats : null
  const actualProfit = priceReady ? (typedPrice - baseSeatPrice) * studentCount : null

  const savePrice = async () => {
    setPriceError('')
    setPriceSaved(false)
    if (!priceReady) {
      setPriceError('家长定价需要在 150 到 500 元之间')
      return
    }
    try {
      const next = await saveOrgFinancePrice(typedPrice)
      setView(next)
      setStudentPrice(String(next.studentMonthlyPrice))
      setPriceSaved(true)
    } catch (error: unknown) {
      setPriceError(error instanceof ApiError ? error.message : '保存失败')
    }
  }

  const submitInvoice = async () => {
    if (!invoiceBill) return
    setInvoiceError('')
    setInvoiceSending(true)
    try {
      const next = await requestOrgInvoice(invoiceBill.id, invoiceTitle.trim(), invoiceTaxNo.trim())
      setView(next)
      setInvoiceBill(null)
      setInvoiceTitle('')
      setInvoiceTaxNo('')
    } catch (error: unknown) {
      setInvoiceError(error instanceof ApiError ? error.message : '申请失败')
    } finally {
      setInvoiceSending(false)
    }
  }

  const boundary =
    priceReady && actualProfit !== null && studentCount === 0
      ? '*按合同约定的满席位计算毛利。当前没有在读学生，实际毛利润为 0 元。'
      : priceReady && actualProfit !== null
        ? `*按合同约定的满席位计算毛利。若当前仅有 ${studentCount} 名学生，实际毛利润为 (${typedPrice}-${baseSeatPrice}) * ${studentCount} = ${actualProfit} 元。`
        : `*按合同约定的满席位计算毛利。当前在读 ${studentCount} 名学生，填好 150–500 的定价后，会按这个人数算出实际毛利。`

  return (
    <div className="px-8 py-8">
      <OrgAccessNotice message={notice} />
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">财务</h1>
        <p className="mt-1 text-sm text-ink-soft">账单按实际合同生成。收益测算按可用席位估算满席毛利，家长端不扣费。</p>
      </header>

      <dl className="mb-3 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <div>
          <dt className="text-ink-soft">实际学生</dt>
          <dd className="mt-1 font-medium text-ink">{view ? `${studentCount} 人` : '…'}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">可用席位</dt>
          <dd className="mt-1 font-medium text-ink">{seats} 个</dd>
        </div>
        <div>
          <dt className="text-ink-soft">{untilLabel}</dt>
          <dd className="mt-1 font-medium text-ink">{until ? until.slice(0, 10) : '—'}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">平台底价</dt>
          <dd className="mt-1 font-medium text-ink">{view ? `${baseSeatPrice} 元/席/月` : '…'}</dd>
        </div>
      </dl>
      <p className="mb-6 text-sm text-ink-soft">
        实际学生按当前在读人数计。满席毛利按 {seats} 个可用席位估算。
      </p>

      <section className="card mb-6 max-w-4xl p-7">
        <h2 className="text-lg font-semibold text-ink">我的账单</h2>
        {view?.trial ? (
          <p className="mt-4 text-sm text-ink-soft">试用期无需付费，转为正式版后生成账单。</p>
        ) : !view ? (
          <TableSkeleton rows={4} cols={4} />
        ) : view.bills.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">还没有账单。</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="data-table w-full min-w-[640px] text-left text-sm">
              <thead className="text-ink-soft">
                <tr>
                  <th className="py-2 pr-4 font-medium">账单月份</th>
                  <th className="py-2 pr-4 font-medium">账单类型</th>
                  <th className="py-2 pr-4 font-medium">席位数</th>
                  <th className="py-2 pr-4 font-medium">应付金额</th>
                  <th className="py-2 pr-4 font-medium">状态</th>
                  <th className="py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {view.bills.map((bill) => (
                  <tr key={bill.id} className="border-t border-line">
                    <td className="py-3 pr-4 text-ink">{bill.month}</td>
                    <td className="py-3 pr-4 text-ink">{bill.type}</td>
                    <td className="py-3 pr-4 text-ink">{bill.seats}</td>
                    <td className="py-3 pr-4 text-ink">{bill.amount.toLocaleString('zh-CN')} 元</td>
                    <td className="py-3 pr-4">
                      <span className={`chip ${PAY_CLASS[bill.payStatus]}`}>{bill.payStatus}</span>
                    </td>
                    <td className="py-3">
                      {bill.payStatus === '已支付' && bill.invoiceStatus === '未开票' ? (
                        <button type="button" className="btn-secondary" onClick={() => setInvoiceBill(bill)}>
                          申请开票
                        </button>
                      ) : (
                        <span className="text-ink-soft">{bill.invoiceStatus}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card max-w-xl p-7">
        <h2 className="text-lg font-semibold text-ink">收益测算</h2>
        <p className="mt-2 text-sm text-ink-soft">平台按底价收取服务费，差价归机构所有。</p>
        <button type="button" className="btn-secondary mt-3 px-4" onClick={() => setSupportOpen(true)}>
          扩容或延期请联系客服
        </button>
        <label className="mt-5 block max-w-xs text-sm text-ink-soft">
          向家长收取（元/月）
          <input
            className="field mt-2"
            inputMode="numeric"
            value={studentPrice}
            disabled={readOnly || !view}
            onChange={(event) => {
              setStudentPrice(event.target.value)
              setPriceSaved(false)
              setPriceError('')
            }}
          />
          <span className="mt-1 block text-xs">可设置范围 150–500 元。</span>
        </label>
        <div className="mt-5 rounded-card bg-canvas px-5 py-4">
          <p className="text-sm text-ink-soft">每月预估毛利（满席）</p>
          <p className="mt-1 text-2xl font-bold text-ink">{fullProfit === null ? '—' : `${fullProfit.toLocaleString('zh-CN')} 元`}</p>
          <p className="mt-2 text-sm text-ink">
            （{studentPrice || '—'} − {baseSeatPrice}）× {seats} 个可用席位
          </p>
          <p className="mt-3 text-sm text-ink-soft">{boundary}</p>
        </div>
        {priceError && <FormError className="mt-4">{priceError}</FormError>}
        <div className="mt-5 flex items-center gap-4">
          <button type="button" className="btn-primary px-8" disabled={readOnly || !view} onClick={() => void savePrice()}>
            更新我的定价
          </button>
          {priceSaved && <span className="text-sm text-success">已更新</span>}
        </div>
      </section>

      <button
        type="button"
        className="btn-secondary fixed bottom-6 right-6 z-30 shadow-pop"
        onClick={() => setSupportOpen(true)}
      >
        联系客服
      </button>

      {supportOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSupportOpen(false)
          }}
          role="presentation"
        >
          <div className="card w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="support-title">
            <h2 id="support-title" className="text-xl font-bold text-ink">
              联系客服
            </h2>
            <p className="mt-2 text-sm text-ink">扩容、延期和开票进度，都可以让客服处理。</p>
            <p className="mt-4 text-sm text-ink-soft">服务时间 {SITE.serviceHours}</p>
            <p className="mt-1 text-sm text-ink">{SITE.companyName}</p>
            {SITE.contactPhone ? (
              <p className="mt-4 text-sm text-ink">
                电话{' '}
                <a className="font-medium text-brand-strong" href={`tel:${SITE.contactPhone}`}>
                  {SITE.contactPhone}
                </a>
              </p>
            ) : (
              <p className="mt-4 text-sm text-ink-soft">客服电话尚未配置。</p>
            )}
            {SITE.contactWechat ? (
              <div className="mt-4">
                <p className="text-sm text-ink">微信 {SITE.contactWechat}</p>
                <p className="mt-2 rounded-card bg-canvas px-4 py-6 text-center text-sm text-ink">打开微信，搜索上面的号码即可添加客服。</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">客服微信二维码尚未配置。</p>
            )}
            <div className="mt-6 flex justify-end">
              <button type="button" className="btn-primary px-6" onClick={() => setSupportOpen(false)}>
                知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {invoiceBill && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !invoiceSending) setInvoiceBill(null)
          }}
          role="presentation"
        >
          <div className="card w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="invoice-title">
            <h2 id="invoice-title" className="text-xl font-bold text-ink">
              申请开票
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              {invoiceBill.month} {invoiceBill.type}，应付 {invoiceBill.amount.toLocaleString('zh-CN')} 元。
            </p>
            <label className="mt-4 block text-sm text-ink-soft">
              发票抬头
              <input className="field mt-2" value={invoiceTitle} onChange={(event) => setInvoiceTitle(event.target.value)} />
            </label>
            <label className="mt-4 block text-sm text-ink-soft">
              纳税人识别号
              <input className="field mt-2" value={invoiceTaxNo} onChange={(event) => setInvoiceTaxNo(event.target.value)} />
            </label>
            {invoiceError && <FormError className="mt-4">{invoiceError}</FormError>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn-ghost" disabled={invoiceSending} onClick={() => setInvoiceBill(null)}>
                取消
              </button>
              <button type="button" className="btn-primary px-6" disabled={invoiceSending} onClick={() => void submitInvoice()}>
                提交申请
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
