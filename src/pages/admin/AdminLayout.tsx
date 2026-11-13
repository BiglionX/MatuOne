import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getPlatformProfile, logoutPlatform } from '@/api/adminOrgs'
import { BrandMark } from '@/components/BrandMark'

export function AdminGate({ children }: { children: React.ReactNode }) {
  if (!getPlatformProfile()) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}

function itemClass(active: boolean): string {
  return `rounded-field px-3 py-2.5 text-sm font-medium transition ${
    active ? 'bg-brand-soft text-brand-strong' : 'text-ink-soft hover:bg-canvas hover:text-ink'
  }`
}

export function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = getPlatformProfile()
  const orgActive = location.pathname.startsWith('/admin/orgs') || location.pathname.startsWith('/admin/leads')
  const userActive = location.pathname.startsWith('/admin/students') || location.pathname.startsWith('/admin/parents')
  const [orgOpen, setOrgOpen] = useState(true)
  const [userOpen, setUserOpen] = useState(true)

  useEffect(() => {
    if (orgActive) setOrgOpen(true)
  }, [orgActive])

  useEffect(() => {
    if (userActive) setUserOpen(true)
  }, [userActive])

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex items-center justify-between gap-4 border-b border-line bg-white px-5 py-3">
        <Link to="/admin/dashboard" className="flex items-center gap-2">
          <BrandMark size={28} />
          <span className="text-sm font-semibold text-ink">代码闯关</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/enter" className="text-ink-soft">
            ← 返回入口
          </Link>
          {profile && <span className="text-ink">{profile.displayName}</span>}
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
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-white">
          <nav className="flex flex-col gap-1 px-3 py-4">
            <NavLink to="/admin/dashboard" end className={({ isActive }) => itemClass(isActive)}>
              工作台
            </NavLink>

            <button
              type="button"
              className={`mt-2 flex items-center justify-between rounded-field px-3 py-2 text-sm font-medium ${orgActive ? 'text-brand-strong' : 'text-ink'}`}
              aria-expanded={orgOpen}
              onClick={() => setOrgOpen((open) => !open)}
            >
              机构运营
              <span className="text-xs text-ink-soft">{orgOpen ? '▾' : '▸'}</span>
            </button>
            {orgOpen && (
              <div className="flex flex-col gap-1 pl-3">
                <NavLink to="/admin/orgs" className={({ isActive }) => itemClass(isActive)}>
                  机构台账
                </NavLink>
                <NavLink to="/admin/leads" className={({ isActive }) => itemClass(isActive)}>
                  线索列表
                </NavLink>
              </div>
            )}

            <button
              type="button"
              className={`mt-2 flex items-center justify-between rounded-field px-3 py-2 text-sm font-medium ${userActive ? 'text-brand-strong' : 'text-ink'}`}
              aria-expanded={userOpen}
              onClick={() => setUserOpen((open) => !open)}
            >
              用户中心
              <span className="text-xs text-ink-soft">{userOpen ? '▾' : '▸'}</span>
            </button>
            {userOpen && (
              <div className="flex flex-col gap-1 pl-3">
                <NavLink to="/admin/students" className={({ isActive }) => itemClass(isActive)}>
                  学生库
                </NavLink>
                <NavLink to="/admin/parents" className={({ isActive }) => itemClass(isActive)}>
                  家长库
                </NavLink>
              </div>
            )}

            <p className="mt-3 px-3 py-2 text-sm font-medium text-ink">内容管理</p>
            <div className="pl-3">
              <NavLink to="/admin/levels" className={({ isActive }) => itemClass(isActive)}>
                课程包
              </NavLink>
            </div>
          </nav>
        </aside>
        <main className="min-w-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
