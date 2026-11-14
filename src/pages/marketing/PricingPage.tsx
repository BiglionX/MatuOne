import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadPricing } from '@/api/marketing'
import { usePageMeta } from '@/lib/usePageMeta'
import type { PriceExample, PriceTier } from '@/types/ops'

const EXAMPLE_SEATS = 40

export function PricingPage() {
  usePageMeta('定价', '机构按平台底价按席位月付，差价由机构向家长收取。试用天数和底价以运营配置为准。')
  const [tiers, setTiers] = useState<PriceTier[]>([])
  const [example, setExample] = useState<PriceExample | null>(null)
  const [trialDays, setTrialDays] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let alive = true
    loadPricing(EXAMPLE_SEATS)
      .then((result) => {
        if (!alive) return
        if (result.tiers?.length) setTiers(result.tiers)
        if (result.example) setExample(result.example)
        if (result.trialDays) setTrialDays(result.trialDays)
      })
      .catch(() => {
        if (!alive) return
        setNotice('价格暂时无法从系统读取，请稍后再看，或直接告诉我们席位数。')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const rows = useMemo(() => (loading ? [] : tiers), [loading, tiers])

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="text-3xl font-bold text-ink">按平台底价，按席位月付</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">机构向平台支付的单价来自运营配置。机构向家长的收费可以在这个底价之上自定，差价归机构。</p>

      {notice && (
        <p className="mt-6 rounded-field bg-warning-soft px-4 py-3 text-sm text-ink">
          {notice}
          <Link to="/apply" className="ml-2 text-brand-strong">
            需要准确报价？告诉我们席位数
          </Link>
        </p>
      )}

      <section className="card mt-8 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="text-ink-soft">
            <tr className="border-b border-line">
              <th className="px-5 py-3 font-medium">席位</th>
              <th className="px-5 py-3 font-medium">单价（元 / 席位 / 月）</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              [0, 1, 2].map((index) => (
                <tr key={`skeleton-${index}`} className="border-b border-line last:border-0">
                  <td className="px-5 py-3">
                    <span className="block h-4 w-24 animate-pulse rounded bg-canvas" />
                  </td>
                  <td className="px-5 py-3">
                    <span className="block h-4 w-16 animate-pulse rounded bg-canvas" />
                  </td>
                </tr>
              ))}
            {rows.map((tier) => (
              <tr key={tier.minSeats} className="border-b border-line last:border-0">
                <td className="px-5 py-3 text-ink">
                  {tier.maxSeats ? `${tier.minSeats}–${tier.maxSeats} 席` : `${tier.minSeats} 席及以上`}
                </td>
                <td className="px-5 py-3 text-ink">{tier.unitPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {example && !loading && (
        <p className="mt-5 text-ink">
          例如 {example.seats} 个席位，{example.seats} × {example.unitPrice} = {example.amount.toLocaleString('zh-CN')} 元/月。
        </p>
      )}

      <section className="card mt-8 p-6">
        <h2 className="text-xl font-semibold text-ink">试用</h2>
        <p className="mt-2 text-ink-soft">{trialDays ?? '—'} 天，最多 10 个席位，只开放前 3 关。试用到期后数据保留，开通正式服务再继续。</p>
        <p className="mt-2 text-sm text-ink-soft">
          1.0 不提供在线支付与自动扣费，收款、发票与退费口径按双方签署的服务合同执行。
        </p>
        <Link to="/apply" className="btn-primary mt-5">
          申请 14 天试用
        </Link>
      </section>
    </main>
  )
}
