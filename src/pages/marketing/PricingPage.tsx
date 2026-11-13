import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadPricing } from '@/api/marketing'
import { usePageMeta } from '@/lib/usePageMeta'
import type { PriceExample, PriceTier } from '@/types/ops'

/**
 * 兜底阶梯必须与 supabase/functions/public-site 读的 seat_price_tier 表一致。
 * 价格是公开静态信息，接口挂了也不能让定价页变成空表；
 * 接口返回后以服务端数据为准覆盖，只在两边不一致时提示「以服务端为准」。
 */
const FALLBACK_TIERS: PriceTier[] = [
  { minSeats: 1, maxSeats: 20, unitPrice: 480 },
  { minSeats: 21, maxSeats: 50, unitPrice: 420 },
  { minSeats: 51, maxSeats: null, unitPrice: 360 },
] as PriceTier[]

const EXAMPLE_SEATS = 40

function fallbackExample(seats = EXAMPLE_SEATS): PriceExample {
  const tier = FALLBACK_TIERS.find((item) => seats >= item.minSeats && (!item.maxSeats || seats <= item.maxSeats)) ?? FALLBACK_TIERS[0]
  return { seats, unitPrice: tier.unitPrice, amount: seats * tier.unitPrice, plan: '席位年费' } as PriceExample
}

export function PricingPage() {
  usePageMeta('定价', '按席位年费计费：1–20 席 480 元/席/年，21–50 席 420 元，51 席及以上 360 元。14 天试用、最多 10 个席位。')
  const [tiers, setTiers] = useState<PriceTier[]>(FALLBACK_TIERS)
  const [example, setExample] = useState<PriceExample | null>(fallbackExample())
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let alive = true
    loadPricing(EXAMPLE_SEATS)
      .then((result) => {
        if (!alive) return
        if (result.tiers?.length) setTiers(result.tiers)
        if (result.example) setExample(result.example)
      })
      .catch(() => {
        if (!alive) return
        setNotice('价格暂时无法从系统读取，下面展示的是标准价目，最终以服务合同为准。')
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
      <h1 className="text-3xl font-bold text-ink">按席位年费，不按人头月付</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">整单落在哪一档，整单就用该档单价，不做分段累进。价格与后台计费读的是同一份配置。</p>

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
              <th className="px-5 py-3 font-medium">单价（元 / 席位 / 年）</th>
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
          例如 {example.seats} 个席位，落在对应档，{example.seats} × {example.unitPrice} ={' '}
          {example.amount.toLocaleString('zh-CN')} 元/年。
        </p>
      )}

      <section className="card mt-8 p-6">
        <h2 className="text-xl font-semibold text-ink">试用</h2>
        <p className="mt-2 text-ink-soft">14 天，最多 10 个席位，只开放前 3 关。试用到期后数据保留，开通正式服务再继续。</p>
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
