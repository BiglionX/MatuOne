import { NavLink, Outlet, Link, Navigate, useNavigate } from 'react-router-dom'
import { getOrgSession, logoutOrgAdmin } from '@/api/orgAuth'
import { BrandMark } from '@/components/BrandMark'
import type { OrgStatus } from '@/types/orgAdmin'

const NAV = [
  { to: '/org/students', label: '学生管理' },
  { to: '/org/courses', label: '课程开通' },
  { to: '/org/dashboard', label: '进度看板' },
]

const STATUS_LABEL: Record<OrgStatus, string> = {
  trial: '试用中',
  active: '正常',
  expired: '已到期',
  disabled: '停用',
}

const STATUS_CLASS: Record<OrgStatus, string> = {
  trial: 'bg-brand-soft text-brand-strong',
  active: 'bg-success-soft text-success',
  expired: 'bg-warning-soft text-warning',
  disabled: 'bg-danger-soft text-danger',
}

function day(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${date}`
}

export function OrgLayout() {
  const navigate = useNavigate()
  const session = getOrgSession()
  if (!session) return <Navigate to="/org/login" replace />

  const until = session.serviceEndAt ?? session.trialExpireAt
  const untilLabel = session.serviceEndAt ? '正式到期' : '试用到期'

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-white">
        <div className="px-5 py-6">
          <Link to="/enter" className="text-sm text-ink-soft">
            ← 返回入口
          </Link>
          <div className="mt-4 flex items-center gap-2">
            <BrandMark size={36} />
            <h1 className="text-lg font-bold text-ink">代码闯关</h1>
          </div>
          <p className="mt-1 text-xs text-ink-soft">{session.orgName}</p>
          <p className="mt-1 text-xs text-ink-soft">{session.orgNo}</p>
          <span className={`chip mt-3 ${STATUS_CLASS[session.status]}`}>{STATUS_LABEL[session.status]}</span>
        </div>

        <nav className="mt-2 flex flex-col gap-1 px-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-field px-4 py-3 text-sm font-medium transition ${
                  isActive ? 'bg-brand-soft text-brand-strong' : 'text-ink-soft hover:bg-canvas hover:text-ink'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-5 py-6 text-xs text-ink-soft">
          <p>
            席位 {session.usedSeats}/{session.seatQuota}
          </p>
          <p className="mt-1">
            {untilLabel} {day(until)}
          </p>
          <p className="mt-1 break-all">{session.account}</p>
          <button
            type="button"
            className="btn-ghost mt-3 px-0 text-xs"
            onClick={() => {
              logoutOrgAdmin()
              navigate('/org/login', { replace: true })
            }}
          >
            退出登录
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {session.readOnly && (
          <p className="border-b border-line bg-warning-soft px-8 py-3 text-sm text-ink">
            服务已到期，当前仅可查看。数据仍保留。
          </p>
        )}
        <Outlet />
      </div>
    </div>
  )
}
