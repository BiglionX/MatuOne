import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrgSession } from '@/api/orgAuth'
import {
  dualReadOrgStudents,
  formatOrgProgressLine,
  mapOrgStudentRowToPythonSummary,
} from '@/api/moduleProgress'
import {
  ApiError,
  listOrgStudents,
  loadOrgDashboard,
  type OrgAttention,
  type OrgDashboardView,
  type OrgStudentListItem,
} from '@/api/orgPortal'
import { OrgAccessNotice } from '@/components/OrgAccessNotice'
import { CardGridSkeleton, TableSkeleton } from '@/components/Skeleton'
import { formatDate } from '@/lib/format'

const ATTENTION_LABEL: Record<OrgAttention, string> = {
  inactive: '本周未学',
  stuck: '停在当前关',
  disabled: '已停用',
}

/** 从契约 summary 汇总：平均完成关卡 / 授权关数 / 分组完成率 */
function aggregatesFromContract(
  students: OrgStudentListItem[],
  groupRows: OrgDashboardView['groupRows'],
): {
  authorizedLevels: number
  avgCompleted: number
  groupRows: OrgDashboardView['groupRows']
} {
  const active = students.filter((student) => student.status === 'active')
  const summaries = active.map(mapOrgStudentRowToPythonSummary)
  const authorizedLevels =
    summaries.find((summary) => summary.availability === 'cloud' && summary.total != null && summary.total > 0)?.total ??
    active[0]?.authorizedLevels ??
    0
  const avgCompleted =
    active.length === 0
      ? 0
      : Math.round(
          (summaries.reduce((sum, summary) => sum + (summary.completed ?? 0), 0) / active.length) * 10,
        ) / 10

  return {
    authorizedLevels,
    avgCompleted,
    groupRows: groupRows.map((group) => {
      const inGroup = active.filter((student) => student.groupId === group.groupId)
      const groupSummaries = inGroup.map(mapOrgStudentRowToPythonSummary)
      const done = groupSummaries.reduce((sum, summary) => sum + (summary.completed ?? 0), 0)
      // 未开通 python 的学生不进入分母；整组未开通时 rate=null → 「尚未开通」，不显示 0%。
      const denom = groupSummaries.reduce(
        (sum, summary) => sum + (summary.availability === 'cloud' ? summary.total ?? 0 : 0),
        0,
      )
      return {
        groupId: group.groupId,
        name: group.name,
        students: inGroup.length,
        rate: inGroup.length && denom ? Math.round((done / denom) * 100) : null,
      }
    }),
  }
}

export function OrgDashboard() {
  const session = getOrgSession()
  const [dashboard, setDashboard] = useState<OrgDashboardView | null>(null)
  const [students, setStudents] = useState<OrgStudentListItem[]>([])
  const [notice, setNotice] = useState('')

  useEffect(() => {
    Promise.all([loadOrgDashboard(), listOrgStudents()])
      .then(([nextDashboard, nextStudents]) => {
        setDashboard(nextDashboard)
        setStudents(nextStudents)
        dualReadOrgStudents(nextStudents)
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError) setNotice(error.message)
      })
  }, [])

  if (!dashboard) {
    return (
      <div className="p-8">
        <OrgAccessNotice message={notice} />
        {!notice && (
          <div className="space-y-6">
            <CardGridSkeleton />
            <div className="card">
              <TableSkeleton rows={5} cols={5} />
            </div>
          </div>
        )}
      </div>
    )
  }

  const { authorizedLevels: authorized, avgCompleted, groupRows } = aggregatesFromContract(
    students,
    dashboard.groupRows,
  )
  const until = session?.serviceEndAt ?? session?.trialExpireAt

  return (
    <div className="p-8">
      <OrgAccessNotice message={notice} />
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">进度看板</h1>
        <p className="mt-1 text-sm text-ink-soft">本周从周一开始。还没学，或当前关超过 3 天没有推进，会出现在下面。</p>
      </header>

      {session?.status === 'trial' && (
        <section className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-ink">试用机构的下一步</h2>
            <p className="mt-1 text-sm text-ink-soft">
              导入学生，把家长绑定码交给家长。试用只能进入前 {authorized || 3} 关，席位 {session.usedSeats}/{session.seatQuota}
              {until ? `，试用到期 ${until.slice(0, 10)}` : ''}。
            </p>
          </div>
          <Link to="/org/students" className="btn-primary">
            去学生管理
          </Link>
        </section>
      )}

      <div className="grid gap-6 sm:grid-cols-3">
        {[
          { label: '在读学生', value: String(dashboard.reading), unit: '人' },
          { label: '本周活跃', value: String(dashboard.weeklyActive), unit: '人' },
          {
            label: '平均完成关卡',
            value: String(avgCompleted),
            unit: authorized > 0 ? `关 / 共 ${authorized} 关` : '尚未开通',
          },
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
        <p className="mt-1 text-sm text-ink-soft">条形是已完成占已授权关卡的比例。没有学生的分组不计算完成率。</p>
        <div className="mt-5 space-y-5">
          {groupRows.map((group) => (
            <div key={group.groupId}>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium text-ink">
                  {group.name}
                  <span className="ml-2 text-ink-soft">{group.students} 人</span>
                </span>
                <span className="text-ink-soft">
                  {group.students === 0 ? '还没有学生' : group.rate == null ? '尚未开通' : `${group.rate}%`}
                </span>
              </div>
              {group.students > 0 && group.rate != null && (
                <div className="h-3 overflow-hidden rounded-full bg-canvas">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${group.rate}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-ink">需要跟进</h2>
          <p className="mt-1 text-sm text-ink-soft">点名字打开学生档案，账号、绑定码和关卡明细都在那里。</p>
        </div>
        {dashboard.attentionRows.length === 0 ? (
          <p className="border-t border-line px-6 py-8 text-sm text-ink-soft">这周没有需要跟进的学生。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="border-y border-line bg-canvas text-left text-ink-soft">
                  <th className="px-6 py-3 font-medium">姓名</th>
                  <th className="px-6 py-3 font-medium">分组</th>
                  <th className="px-6 py-3 font-medium">情况</th>
                  <th className="px-6 py-3 font-medium">进度</th>
                  <th className="px-6 py-3 font-medium">最近学习</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.attentionRows.map((row) => (
                  <tr key={row.student.id} className="border-b border-line last:border-0">
                    <td className="px-6 py-3.5 font-medium text-ink">
                      <Link to={`/org/students?student=${row.student.id}`} className="text-brand-strong hover:underline">
                        {row.student.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-ink-soft">{row.groupName}</td>
                    <td className="px-6 py-3.5 text-ink">{ATTENTION_LABEL[row.reason]}</td>
                    <td className="px-6 py-3.5 text-ink-soft">
                      {formatOrgProgressLine(
                        mapOrgStudentRowToPythonSummary({
                          id: row.student.id,
                          name: row.student.name,
                          status: row.student.status,
                          currentLevelOrder: row.currentOrder,
                          lastActiveAt: row.lastActiveAt,
                          lastStudiedAt: row.lastStudiedAt,
                          authorizedLevels: authorized,
                          authorizedCompletedCount: row.authorizedCompletedCount,
                          completedCount: row.completedCount,
                          enabledModules: row.enabledModules,
                          typing: row.typing,
                        }),
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-ink-soft">{formatDate(row.lastActiveAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
