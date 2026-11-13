import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BrandMark } from '@/components/BrandMark'
import { SiteFooter } from '@/components/SiteFooter'

const LINKS = [
  { to: '/curriculum', label: '课程体系' },
  { to: '/pricing', label: '定价' },
  { to: '/faq', label: '常见问题' },
  { to: '/about', label: '关于' },
]

export function MarketingLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <BrandMark size={32} />
            <span className="text-lg font-bold text-ink">代码闯关</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-1 sm:flex">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `rounded-field px-3 py-2 text-sm ${isActive ? 'text-brand-strong' : 'text-ink-soft'}`}
              >
                {link.label}
              </NavLink>
            ))}
            <Link to="/enter" className="rounded-field px-3 py-2 text-sm text-ink-soft">
              进入系统
            </Link>
            <Link to="/apply" className="btn-primary px-4 text-sm">
              申请试用
            </Link>
          </nav>
          <button
            type="button"
            className="ml-auto rounded-field px-3 py-2 text-sm text-ink-soft sm:hidden"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? '关闭' : '菜单'}
          </button>
          <Link to="/apply" className="btn-primary px-4 text-sm sm:hidden">
            申请试用
          </Link>
        </div>
        {open && (
          <nav className="mx-auto flex max-w-5xl flex-col gap-1 px-5 pb-3 sm:hidden">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `rounded-field px-3 py-2 text-sm ${isActive ? 'text-brand-strong' : 'text-ink-soft'}`}
              >
                {link.label}
              </NavLink>
            ))}
            <Link to="/enter" className="rounded-field px-3 py-2 text-sm text-ink-soft">
              进入系统
            </Link>
          </nav>
        )}
      </header>
      <div className="pb-24 sm:pb-0">
        <Outlet />
      </div>
      <SiteFooter />
      <div className="sticky bottom-0 z-20 border-t border-line bg-white px-5 py-3 sm:hidden">
        <Link to="/apply" className="btn-primary w-full">
          申请 14 天试用
        </Link>
      </div>
    </div>
  )
}
