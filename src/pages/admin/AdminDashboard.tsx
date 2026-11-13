import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, loadAdminDashboard, type AdminDashboard } from '@/api/adminDashboard'

function money(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN')}`
}

export function AdminDashboard() {
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    loadAdminDashboard()
      .then((next) => {
        if (!cancelled) setData(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : '读取失败')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const cards = data
    ? [
        { label: '本月营收', value: money(data.revenue), note: '收费记录合计，不含试用' },
        { label: '全平台在读学生', value: String(data.activeStudents), note: '状态为正常的学生' },
        { label: '今日活跃家长', value: String(data.activeParentsToday), note: '今天登录过的家长' },
        { label: '试用转正率', value: `${data.conversionRate}%`, note: '试用机构中已转为正式' },
      ]
    : []

  return (
    <div className="px-8 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-ink">工作台</h1>
        <p className="mt-1 text-sm text-ink-soft">全平台的经营数字，以及需要跟进的机构。</p>
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        {!error && !data && <p className="mt-6 text-sm text-ink-soft">正在汇总…</p>}
        {data && (
          <>
            <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <article key={card.label} className="card px-4 py-4">
                  <p className="text-sm text-ink-soft">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold text-ink">{card.value}</p>
                  <p className="mt-2 text-xs text-ink-soft">{card.note}</p>
                </article>
              ))}
            </section>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <section className="card p-5">
                <h2 className="text-lg font-semibold text-ink">即将到期机构</h2>
                <p className="mt-1 text-sm text-ink-soft">试用或正式服务在 30 天内到期。</p>
                {data.expiringOrgs.length === 0 ? (
                  <p className="mt-4 text-sm text-ink-soft">暂无即将到期的机构。</p>
                ) : (
                  <ul className="mt-4 divide-y divide-line">
                    {data.expiringOrgs.map((org) => (
                      <li key={org.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                        <div>
                          <Link to={`/admin/orgs/${org.id}`} className="font-medium text-ink hover:text-brand-strong">
                            {org.name}
                          </Link>
                          <p className="mt-1 text-ink-soft">{org.contactPhone}</p>
                        </div>
                        <span className="shrink-0 text-warning">{org.daysLeft === 0 ? '今天到期' : `剩余 ${org.daysLeft} 天`}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card p-5">
                <h2 className="text-lg font-semibold text-ink">席位预警</h2>
                <p className="mt-1 text-sm text-ink-soft">已用席位达到总额度的 90%。</p>
                {data.seatAlerts.length === 0 ? (
                  <p className="mt-4 text-sm text-ink-soft">暂无席位预警。</p>
                ) : (
                  <ul className="mt-4 divide-y divide-line">
                    {data.seatAlerts.map((org) => (
                      <li key={org.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <Link to={`/admin/orgs/${org.id}`} className="font-medium text-ink hover:text-brand-strong">
                          {org.name}
                        </Link>
                        <span className="text-ink">
                          {org.usedSeats} / {org.seatQuota}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
