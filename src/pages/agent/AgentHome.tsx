import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError, getAgentSession, loadAgentHome, logoutAgent } from '@/api/agentAuth'
import { BrandMark } from '@/components/BrandMark'
import type { AgentHome } from '@/types/agentPortal'

const STATUS_LABEL: Record<string, string> = {
  trial: '试用中',
  active: '正常',
  expired: '已到期',
  disabled: '停用',
}

function money(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN')}`
}

export function AgentHome() {
  const navigate = useNavigate()
  const session = getAgentSession()
  const adminId = session?.adminId ?? ''
  const [home, setHome] = useState<AgentHome | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!adminId) return
    let cancelled = false
    loadAgentHome()
      .then((next) => {
        if (!cancelled) setHome(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : '读取失败')
      })
    return () => {
      cancelled = true
    }
  }, [adminId])

  if (!session) return <Navigate to="/agent/login" replace />

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex items-center justify-between gap-4 border-b border-line bg-white px-5 py-3">
        <Link to="/agent" className="flex items-center gap-2">
          <BrandMark size={28} />
          <span className="text-sm font-semibold text-ink">代码闯关</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-ink">{home?.agentName ?? session.agentName}</span>
          <button
            type="button"
            className="text-ink-soft"
            onClick={() => {
              logoutAgent()
              navigate('/agent/login')
            }}
          >
            退出
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold text-ink">区域服务商</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {home?.region || session.region || '未填区域'} · {home?.account ?? session.account}。这里只显示名下机构和佣金。
        </p>
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        {!error && !home && <p className="mt-6 text-sm text-ink-soft">正在读取…</p>}
        {home && (
          <>
            <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: '名下机构', value: String(home.orgCount) },
                { label: '席位费总额', value: money(home.seatFeeTotal) },
                { label: '待发佣金', value: money(home.commissionDue) },
                { label: '已结算佣金', value: money(home.commissionSettled) },
              ].map((card) => (
                <article key={card.label} className="card px-4 py-4">
                  <p className="text-sm text-ink-soft">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold text-ink">{card.value}</p>
                </article>
              ))}
            </section>

            <section className="card mt-6 overflow-x-auto">
              <h2 className="px-4 pt-4 text-lg font-semibold text-ink">名下机构</h2>
              {home.orgs.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ink-soft">还没有归属机构。</p>
              ) : (
                <table className="mt-2 w-full min-w-[640px] text-left text-sm">
                  <thead className="text-ink-soft">
                    <tr className="border-b border-line">
                      {['机构编号', '名称', '状态', '席位额度'].map((label) => (
                        <th key={label} className="px-4 py-3 font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {home.orgs.map((org) => (
                      <tr key={org.orgNo} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 text-ink">{org.orgNo}</td>
                        <td className="px-4 py-3 text-ink">{org.name}</td>
                        <td className="px-4 py-3 text-ink">{STATUS_LABEL[org.status] ?? org.status}</td>
                        <td className="px-4 py-3 text-ink">{org.seatQuota}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="card mt-6 overflow-x-auto">
              <h2 className="px-4 pt-4 text-lg font-semibold text-ink">佣金记录</h2>
              <p className="px-4 pt-1 text-sm text-ink-soft">最近 20 笔。待发金额按平台底价和分成比例计算。</p>
              {home.records.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ink-soft">还没有佣金记录。</p>
              ) : (
                <table className="mt-2 w-full min-w-[640px] text-left text-sm">
                  <thead className="text-ink-soft">
                    <tr className="border-b border-line">
                      {['机构', '底价金额', '佣金', '状态', '时间'].map((label) => (
                        <th key={label} className="px-4 py-3 font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {home.records.map((row, index) => (
                      <tr key={`${row.createdAt}-${index}`} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 text-ink">{row.orgName}</td>
                        <td className="px-4 py-3 text-ink">{row.baseAmount == null ? '—' : money(row.baseAmount)}</td>
                        <td className="px-4 py-3 text-ink">{money(row.commissionAmount)}</td>
                        <td className="px-4 py-3 text-ink">{row.status === 'settled' ? '已结算' : '待发'}</td>
                        <td className="px-4 py-3 text-ink">{row.createdAt.replace('T', ' ').slice(0, 16)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
