import { Link, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { getPlatformProfile, logoutPlatform } from '@/api/adminOrgs'
import { BrandMark } from '@/components/BrandMark'

export function AdminNav() {
  const navigate = useNavigate()
  const profile = getPlatformProfile()
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link to="/enter" className="flex items-center gap-2">
          <BrandMark size={28} />
          <span className="text-sm font-semibold text-ink">平台后台</span>
        </Link>
        <Link to="/enter" className="text-sm text-ink-soft">
          ← 返回入口
        </Link>
      </div>
      <nav className="flex flex-wrap items-center gap-3 text-sm">
        <NavLink to="/admin/orgs" className={({ isActive }) => (isActive ? 'text-brand-strong' : 'text-ink-soft')}>
          机构台账
        </NavLink>
        <NavLink to="/admin/leads" className={({ isActive }) => (isActive ? 'text-brand-strong' : 'text-ink-soft')}>
          线索
        </NavLink>
        <NavLink to="/admin/courses" className={({ isActive }) => (isActive ? 'text-brand-strong' : 'text-ink-soft')}>
          课程包
        </NavLink>
        {profile && <span className="text-ink-soft">{profile.displayName}</span>}
        <button
          type="button"
          className="text-ink-soft"
          onClick={() => {
            logoutPlatform()
            navigate('/admin/login')
          }}
        >
          退出
        </button>
      </nav>
    </div>
  )
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  if (!getPlatformProfile()) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
