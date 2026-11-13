import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadPricing } from '@/api/marketing'
import type { PriceExample, PriceTier } from '@/types/ops'

export function PricingPage() {
  const [tiers, setTiers] = useState<PriceTier[]>([])
  const [example, setExample] = useState<PriceExample | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPricing(40)
      .then((result) => {
        setTiers(result.tiers)
        setExample(result.example)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '暂时无法读取定价'))
  }, [])

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="text-3xl font-bold text-ink">按席位年费，不按人头月付</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">整单落在哪一档，整单就用该档单价。价格和后台计费读的是同一份配置。</p>
      {error && <p className="mt-6 rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

      <section className="card mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-ink-soft">
            <tr className="border-b border-line">
              <th className="px-5 py-3 font-medium">席位</th>
              <th className="px-5 py-3 font-medium">单价（元 / 席位 / 年）</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr key={tier.minSeats} className="border-b border-line last:border-0">
                <td className="px-5 py-3 text-ink">{tier.maxSeats ? `${tier.minSeats}–${tier.maxSeats}` : `${tier.minSeats} 及以上`}</td>
                <td className="px-5 py-3 text-ink">{tier.unitPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {example && (
        <p className="mt-5 text-ink">
          例如 {example.seats} 个席位，落在对应档，{example.seats} × {example.unitPrice} = {example.amount.toLocaleString('zh-CN')} 元/年。
        </p>
      )}

      <section className="card mt-8 p-6">
        <h2 className="text-xl font-semibold text-ink">试用</h2>
        <p className="mt-2 text-ink-soft">14 天，最多 10 个席位，只开放前 3 关。试用到期后数据保留，开通正式服务再继续。</p>
        <Link to="/apply" className="btn-primary mt-5">
          申请 14 天试用
        </Link>
      </section>
    </main>
  )
}
