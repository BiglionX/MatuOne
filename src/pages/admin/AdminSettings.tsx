import { useEffect, useState } from 'react'
import { ApiError, loadPlatformSettings, savePlatformSettings } from '@/api/adminSettings'
import { getPlatformProfile } from '@/api/adminOrgs'
import type { PlatformSettings } from '@/types/platformSettings'

const EMPTY = {
  minSeatCount: '',
  baseSeatPrice: '',
  trialDays: '',
  agentCommissionRate: '',
}

export function AdminSettings() {
  const canEdit = getPlatformProfile()?.role !== 'finance'
  const [form, setForm] = useState(EMPTY)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadPlatformSettings()
      .then((next) => {
        if (cancelled) return
        setForm(toForm(next))
        setUpdatedAt(next.updatedAt)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : '配置读取失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const next = await savePlatformSettings({
        minSeatCount: Number(form.minSeatCount),
        baseSeatPrice: Number(form.baseSeatPrice),
        trialDays: Number(form.trialDays),
        agentCommissionRate: Number(form.agentCommissionRate),
        updatedAt: null,
      })
      setForm(toForm(next))
      setUpdatedAt(next.updatedAt)
      setSaved(true)
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : '配置保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-8 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-ink">运营配置</h1>
        <p className="mt-1 text-sm text-ink-soft">开户席位、平台底价、试用天数和区域服务商分成都从这里读取。续费金额按底价计算，不在页面里写死。</p>
        {loading && <p className="mt-6 text-sm text-ink-soft">正在读取配置…</p>}
        {!loading && (
          <form className="card mt-6 p-6" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-ink-soft">
                最低开户席位
                <input
                  className="field mt-1"
                  inputMode="numeric"
                  disabled={!canEdit}
                  value={form.minSeatCount}
                  onChange={(event) => setForm((prev) => ({ ...prev, minSeatCount: event.target.value }))}
                />
                <span className="mt-1 block text-xs">试用机构仍最多 10 个席位。</span>
              </label>
              <label className="text-sm text-ink-soft">
                平台席位底价（元/席/月）
                <input
                  className="field mt-1"
                  inputMode="numeric"
                  disabled={!canEdit}
                  value={form.baseSeatPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, baseSeatPrice: event.target.value }))}
                />
                <span className="mt-1 block text-xs">机构向平台支付的单价。账单金额 = 底价 × 席位。</span>
              </label>
              <label className="text-sm text-ink-soft">
                试用天数
                <input
                  className="field mt-1"
                  inputMode="numeric"
                  disabled={!canEdit}
                  value={form.trialDays}
                  onChange={(event) => setForm((prev) => ({ ...prev, trialDays: event.target.value }))}
                />
                <span className="mt-1 block text-xs">新开机构的试用期按这个天数计算。</span>
              </label>
              <label className="text-sm text-ink-soft">
                区域服务商分成比例
                <input
                  className="field mt-1"
                  inputMode="decimal"
                  disabled={!canEdit}
                  value={form.agentCommissionRate}
                  onChange={(event) => setForm((prev) => ({ ...prev, agentCommissionRate: event.target.value }))}
                />
                <span className="mt-1 block text-xs">0.40 表示区域服务商拿底价的 40%，平台拿剩下的 60%。</span>
              </label>
            </div>
            {updatedAt && <p className="mt-4 text-xs text-ink-soft">最近更新 {updatedAt.replace('T', ' ').slice(0, 16)}</p>}
            {error && <p className="mt-4 rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
            {saved && <p className="mt-4 text-sm text-success">已保存。之后的开户和续费会使用新配置。</p>}
            {canEdit && (
              <button type="submit" className="btn-primary mt-5 px-6" disabled={saving}>
                {saving ? '正在保存…' : '保存配置'}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

function rateText(value: number): string {
  if (!Number.isFinite(value)) return ''
  const text = value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  if (!text.includes('.')) return `${text}.00`
  const [whole, fraction] = text.split('.')
  return `${whole}.${fraction.padEnd(2, '0')}`
}

function toForm(settings: PlatformSettings) {
  return {
    minSeatCount: String(settings.minSeatCount),
    baseSeatPrice: String(settings.baseSeatPrice),
    trialDays: String(settings.trialDays),
    agentCommissionRate: rateText(settings.agentCommissionRate),
  }
}
