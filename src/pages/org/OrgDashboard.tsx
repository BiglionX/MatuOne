import { useEffect, useState } from 'react'
import { ApiError, loadOrgDashboard, type OrgDashboardView } from '@/api/orgPortal'
import { OrgAccessNotice } from '@/components/OrgAccessNotice'
import { OrgStudentProgress } from '@/components/OrgStudentProgress'
import { formatDate } from '@/lib/format'

export function OrgDashboard() {
  const [dashboard, setDashboard] = useState<OrgDashboardView | null>(null)
  const [notice, setNotice] = useState('')
  const [detailId, setDetailId] = useState('')
  const totalLevels = dashboard?.totalLevels ?? 0

  useEffect(() => {
    loadOrgDashboard()
      .then(setDashboard)
      .catch((error: unknown) => {
        if (error instanceof ApiError) setNotice(error.message)
      })
  }, [])

  if (!dashboard) {
    return (
      <div className="px-8 py-8">
        <OrgAccessNotice message={notice} />
        {!notice && <p className="text-sm text-ink-soft">正在加载本机构的进度…</p>}
      </div>
    )
  }

  return (
    <div className="px-8 py-8">
      <OrgAccessNotice message={notice} />
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">进度看板</h1>
        <p className="mt-1 text-sm text-ink-soft">看一眼就知道谁在学、谁卡住了。</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: '在读学生', value: dashboard.reading, unit: '人' },
          { label: '本周活跃', value: dashboard.weeklyActive, unit: '人' },
          { label: '平均完成关卡', value: dashboard.avgCompleted, unit: `关 / 共 ${totalLevels} 关` },
        ].map((card) => (
          <div key={card.label} className="card p-6">
            <p className="text-sm text-ink-soft">{card.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">
              {card.value}
              <span className="ml-2 text-sm font-normal text-ink-soft">{card.unit}</span>
            </p>
          </div>
        ))}
      </div>

      <section className="card mt-6 p-6">
        <h2 className="text-lg font-semibold text-ink">分组完成率</h2>
        <p className="mt-1 text-sm text-ink-soft">按组看整体推进，条形长度是完成关卡占应有进度的比例。</p>

        <div className="mt-5 space-y-5">
          {dashboard.groupRows.map((group) => (
            <div key={group.groupId}>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium text-ink">
                  {group.name}
                  <span className="ml-2 text-ink-soft">{group.students} 人</span>
                </span>
                <span className="text-ink-soft">{group.rate}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-canvas">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${group.rate}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-ink">学生明细</h2>
            <p className="mt-1 text-sm text-ink-soft">点名字查看关卡明细。关卡旁的「话术」是教学设计意图和上课引导。</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-line bg-canvas text-left text-ink-soft">
                <th className="px-6 py-3 font-medium">姓名</th>
                <th className="px-6 py-3 font-medium">分组</th>
                <th className="px-6 py-3 font-medium">当前关卡</th>
                <th className="px-6 py-3 font-medium">已完成</th>
                <th className="px-6 py-3 font-medium">打字 WPM / 准确率</th>
                <th className="px-6 py-3 font-medium">最近学习</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.studentRows.map((row) => (
                <tr key={row.student.id} className="border-b border-line last:border-0">
                  <td className="px-6 py-3.5 font-medium text-ink">
                    <button type="button" className="text-brand-strong hover:underline" onClick={() => setDetailId(row.student.id)}>
                      {row.student.name}
                    </button>
                    {row.student.status === 'disabled' && (
                      <span className="ml-2 chip bg-canvas text-ink-soft">已停用</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-ink-soft">{row.groupName}</td>
                  <td className="px-6 py-3.5 text-ink-soft">第 {row.currentOrder} 关</td>
                  <td className="px-6 py-3.5 text-ink-soft">
                    {row.completedCount} / {totalLevels}
                  </td>
                  <td className="px-6 py-3.5 text-ink-soft">
                    {row.typing ? `${row.typing.wpm} WPM · ${row.typing.accuracy}%` : '还没有记录'}
                  </td>
                  <td className="px-6 py-3.5 text-ink-soft">{formatDate(row.lastActiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 text-xs text-ink-soft">1.0 只统计：完成节数、当前关卡、打字 WPM/准确率、最近活跃时间。</p>
      {detailId && <OrgStudentProgress studentId={detailId} onClose={() => setDetailId('')} />}
    </div>
  )
}
