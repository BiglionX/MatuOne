import { useEffect, useState } from 'react'
import { ApiError, listLeads, provisionOrg, setLeadStatus } from '@/api/adminOrgs'
import { AdminNav } from '@/pages/admin/AdminNav'
import type { LeadRow } from '@/types/ops'
import type { ProvisionOrgResult } from '@/types/orgAdmin'

export function AdminLeads() {
  const [rows, setRows] = useState<LeadRow[]>([])
  const [notice, setNotice] = useState('')
  const [opening, setOpening] = useState<LeadRow | null>(null)
  const [seats, setSeats] = useState('10')
  const [days, setDays] = useState('14')
  const [success, setSuccess] = useState<ProvisionOrgResult | null>(null)

  const reload = () =>
    listLeads()
      .then(setRows)
      .catch((error: unknown) => setNotice(error instanceof ApiError ? error.message : '读取失败'))

  useEffect(() => {
    void reload()
  }, [])

  const open = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!opening) return
    setNotice('')
    try {
      const result = await provisionOrg({
        name: opening.orgName,
        contactName: opening.contact,
        contactPhone: opening.phone,
        campus: opening.city,
        seatQuota: Number(seats),
        trialDays: Number(days),
        leadId: opening.id,
      })
      setSuccess(result)
      setOpening(null)
      await reload()
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : '开户失败')
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-8 py-10">
      <div className="mx-auto max-w-6xl">
        <AdminNav />
        <h1 className="mt-6 text-2xl font-bold text-ink">线索</h1>
        <p className="mt-1 text-sm text-ink-soft">来自试用申请。开户后线索变为已开户，并带上机构。</p>
        {notice && <p className="mt-4 text-sm text-danger">{notice}</p>}
        {success && (
          <p className="mt-4 rounded-field bg-warning-soft px-4 py-3 text-sm text-ink">
            已开通 {success.orgNo}，管理员 {success.adminAccount}，初始密码 {success.initialPassword}。此密码只显示这一次。
          </p>
        )}
        <section className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-ink-soft">
              <tr className="border-b border-line">
                {['机构', '联系人', '电话', '城市', '预计学生', '状态', ''].map((label) => (
                  <th key={label || 'op'} className="px-4 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink">{row.orgName}</td>
                  <td className="px-4 py-3 text-ink">{row.contact}</td>
                  <td className="px-4 py-3 text-ink">{row.phone}</td>
                  <td className="px-4 py-3 text-ink">{row.city}</td>
                  <td className="px-4 py-3 text-ink">{row.estStudents ?? '—'}</td>
                  <td className="px-4 py-3 text-ink">{row.status}</td>
                  <td className="px-4 py-3">
                    {row.status !== '已开户' && row.status !== '已关闭' && (
                      <div className="flex gap-2">
                        <button type="button" className="text-brand-strong" onClick={() => setOpening(row)}>
                          开户
                        </button>
                        <button
                          type="button"
                          className="text-ink-soft"
                          onClick={() => setLeadStatus(row.id, '已联系').then(reload)}
                        >
                          已联系
                        </button>
                        <button
                          type="button"
                          className="text-ink-soft"
                          onClick={() => setLeadStatus(row.id, '已关闭').then(reload)}
                        >
                          关闭
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {opening && (
          <form onSubmit={open} className="card mt-4 grid gap-3 p-5 sm:grid-cols-2">
            <p className="sm:col-span-2 text-sm text-ink">
              为「{opening.orgName}」开户，联系人 {opening.contact}，电话 {opening.phone}
            </p>
            <label className="text-sm text-ink-soft">
              席位
              <input className="field mt-1" value={seats} onChange={(e) => setSeats(e.target.value)} />
            </label>
            <label className="text-sm text-ink-soft">
              试用天数
              <input className="field mt-1" value={days} onChange={(e) => setDays(e.target.value)} />
            </label>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary">
                确认开户
              </button>
              <button type="button" className="btn-ghost" onClick={() => setOpening(null)}>
                取消
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
