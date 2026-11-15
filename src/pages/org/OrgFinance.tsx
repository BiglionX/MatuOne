import { useEffect, useState } from 'react'
import { getOrgSession } from '@/api/orgAuth'
import { ApiError, getOrgCourse, saveOrgStudentPrice } from '@/api/orgPortal'
import { OrgAccessNotice } from '@/components/OrgAccessNotice'

export function OrgFinance() {
  const session = getOrgSession()
  const readOnly = session?.readOnly === true
  const [notice, setNotice] = useState('')
  const [ready, setReady] = useState(false)
  const [studentPrice, setStudentPrice] = useState('')
  const [baseSeatPrice, setBaseSeatPrice] = useState(0)
  const [priceSaved, setPriceSaved] = useState(false)
  const [priceError, setPriceError] = useState('')

  useEffect(() => {
    getOrgCourse()
      .then((next) => {
        setStudentPrice(String(next.studentMonthlyPrice))
        setBaseSeatPrice(next.baseSeatPrice)
        setReady(true)
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError) setNotice(error.message)
      })
  }, [])

  const until = session?.serviceEndAt ?? session?.trialExpireAt
  const untilLabel = session?.serviceEndAt ? '正式到期' : '到期'
  const typedPrice = Number(studentPrice)
  const priceReady = Number.isInteger(typedPrice) && typedPrice >= 150 && typedPrice <= 500 && baseSeatPrice > 0
  const seats = session?.seatQuota ?? 0
  const monthlyProfit = priceReady ? (typedPrice - baseSeatPrice) * seats : null

  const savePrice = async () => {
    setPriceError('')
    setPriceSaved(false)
    if (!priceReady) {
      setPriceError('家长定价需要在 150 到 500 元之间')
      return
    }
    try {
      const next = await saveOrgStudentPrice(typedPrice)
      setStudentPrice(String(next.studentMonthlyPrice))
      setBaseSeatPrice(next.baseSeatPrice)
      setPriceSaved(true)
    } catch (error: unknown) {
      setPriceError(error instanceof ApiError ? error.message : '保存失败')
    }
  }

  return (
    <div className="px-8 py-8">
      <OrgAccessNotice message={notice} />
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">财务</h1>
        <p className="mt-1 text-sm text-ink-soft">按合同席位做内部测算。家长端不扣费。</p>
      </header>

      <dl className="mb-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <div>
          <dt className="text-ink-soft">席位</dt>
          <dd className="mt-1 font-medium text-ink">{session ? `${session.usedSeats}/${session.seatQuota}` : '—'}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">{untilLabel}</dt>
          <dd className="mt-1 font-medium text-ink">{until ? until.slice(0, 10) : '—'}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">平台底价</dt>
          <dd className="mt-1 font-medium text-ink">{ready ? `${baseSeatPrice} 元/席/月` : '…'}</dd>
        </div>
      </dl>

      <section className="card max-w-xl p-7">
        <h2 className="text-lg font-semibold text-ink">内部测算</h2>
        <p className="mt-2 text-sm text-ink-soft">平台按底价收取服务费，差价归机构所有。扩容或延期请联系客服。</p>
        <label className="mt-5 block max-w-xs text-sm text-ink-soft">
          向家长收取（元/月）
          <input
            className="field mt-2"
            inputMode="numeric"
            value={studentPrice}
            disabled={readOnly || !ready}
            onChange={(event) => {
              setStudentPrice(event.target.value)
              setPriceSaved(false)
              setPriceError('')
            }}
          />
          <span className="mt-1 block text-xs">可设置范围 150–500 元。</span>
        </label>
        <div className="mt-5 rounded-card bg-canvas px-5 py-4">
          <p className="text-sm text-ink-soft">每月预估毛利</p>
          <p className="mt-1 text-2xl font-bold text-ink">
            {monthlyProfit === null ? '—' : `${monthlyProfit.toLocaleString('zh-CN')} 元`}
          </p>
          <p className="mt-2 text-sm text-ink">
            （{studentPrice || '—'} − {baseSeatPrice}）× {seats} 个合同席位
          </p>
        </div>
        {priceError && <p className="mt-4 rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{priceError}</p>}
        <div className="mt-5 flex items-center gap-4">
          <button type="button" className="btn-primary px-8" disabled={readOnly || !ready} onClick={() => void savePrice()}>
            保存
          </button>
          {priceSaved && <span className="text-sm text-success">已保存</span>}
        </div>
      </section>
    </div>
  )
}
