import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SITE } from '@/config/site'
import { isLauncherAudioEnabled, playLauncherSound, toggleLauncherAudio } from '@/lib/launcherAudio'
import { listLauncherRegistryModules } from '@/modules/registry'
import type { ModuleIconName, TeachingModuleDef } from '@/modules/types'
import { BrandGlyph } from './BrandGlyph'

/**
 * MatuOne 启动器：项目总入口。
 * 打开就是一个「桌面窗口」，中间是注册表里的全部板块入口，方向键可以在模块之间移动。
 *
 * 菜单本身不会一上来就摆好：MatuOneLayout 先播开屏动画，结束后菜单各元素才依次浮现。
 * 首页是通用入口，不按机构开通状态过滤；实际课程准入由各模块自己的服务端门禁负责。
 */

type LauncherModule = TeachingModuleDef

const TOP_LINKS = [
  { to: '/curriculum', label: '课程体系' },
  { to: '/pricing', label: '定价' },
  { to: '/apply', label: '申请试用' },
  { to: '/enter', label: '进入系统' },
]

const FOOT_LINKS = [
  { to: '/about', label: '关于我们' },
  { to: '/faq', label: '常见问题' },
  { to: '/privacy', label: '隐私政策' },
  { to: '/terms', label: '服务条款' },
]

function ModuleIcon({ name }: { name: ModuleIconName }) {
  if (name === 'python') {
    return (
      <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" aria-hidden="true">
        <rect x="2.5" y="4" width="19" height="16" rx="3" stroke="currentColor" strokeWidth="1.7" />
        <path d="M7 10.5 9.5 13 7 15.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 15.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'pix') {
    return (
      <svg viewBox="0 0 24 24" className="h-9 w-9" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="1.6" fill="currentColor" opacity="0.9" />
        <rect x="13" y="3" width="8" height="8" rx="1.6" fill="currentColor" opacity="0.55" />
        <rect x="3" y="13" width="8" height="8" rx="1.6" fill="currentColor" opacity="0.55" />
        <rect x="13" y="13" width="8" height="8" rx="1.6" fill="currentColor" opacity="0.9" />
      </svg>
    )
  }
  // 筹备中的板块用锁：一眼就知道还没开放
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" aria-hidden="true">
      <rect x="4.5" y="10" width="15" height="10" rx="2.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10V7.6a4 4 0 0 1 8 0V10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.4" fill="currentColor" />
    </svg>
  )
}

function isLockedModule(module: LauncherModule): boolean {
  return module.status === 'coming_soon' || module.entry_path == null
}

function ModuleCard({ module, onSoon }: { module: LauncherModule; onSoon: (message: string) => void }) {
  const navigate = useNavigate()
  const [launching, setLaunching] = useState(false)
  const locked = isLockedModule(module)
  const style = { '--accent': module.accent } as CSSProperties

  const body = (
    <>
      <div className="matuone-preview" data-module={module.module_id}>
        <span className="relative z-10 flex h-12 w-12 items-center justify-center" style={{ color: module.accent }}>
          <ModuleIcon name={module.icon} />
        </span>
        <span className="absolute left-3 top-3 z-10 rounded-md border border-white/15 bg-black/45 px-2 py-0.5 font-mono text-[10px] tracking-[0.2em] text-white/80">
          {module.index} / {module.code}
        </span>
      </div>

      <div className="mt-5 flex items-start justify-between gap-3">
        <h3 className="text-xl font-bold leading-snug text-ink">{module.display_name}</h3>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-ink-soft">
          {module.grade_range}
        </span>
      </div>

      <p className="mt-2.5 text-sm leading-6 text-ink-soft">{module.summary}</p>
      <p className="mt-1.5 text-xs leading-6 text-ink-soft/75">{module.detail}</p>

      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] tracking-[0.2em] text-ink-soft/70">
          {locked ? 'COMING SOON' : 'READY'}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold"
          style={
            locked
              ? { borderColor: 'rgba(255,255,255,0.12)', color: 'rgb(148 163 190)' }
              : { borderColor: `${module.accent}66`, backgroundColor: `${module.accent}24`, color: module.accent }
          }
        >
          {module.cta}
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </>
  )

  const shell = 'matuone-card group flex h-full flex-col rounded-2xl border p-5 text-left'

  /** 点下去先爆亮一下再跳走，让「进入」有个仪式感；待开发板块只给提示 */
  function handleActivate(event: React.MouseEvent) {
    if (locked) {
      playLauncherSound('locked')
      onSoon(`「${module.display_name}」还在开发中，先玩其他板块吧。`)
      return
    }
    event.preventDefault()
    if (launching || !module.entry_path) return
    setLaunching(true)
    playLauncherSound('click')
    window.setTimeout(() => navigate(module.entry_path as string), 680)
  }

  if (locked) {
    return (
      <button
        type="button"
        data-module-control
        onClick={handleActivate}
        className={`${shell} is-locked cursor-pointer opacity-80`}
        style={style}
      >
        {body}
      </button>
    )
  }

  return (
    <Link
      to={module.entry_path as string}
      data-module-control
      onClick={handleActivate}
      onMouseEnter={() => playLauncherSound('hover')}
      className={`${shell} ${launching ? 'is-launching' : ''}`}
      style={style}
    >
      {body}
    </Link>
  )
}

export function MatuOneHome() {
  const modules = listLauncherRegistryModules()
  const [notice, setNotice] = useState<string | null>(null)
  const [clock, setClock] = useState(() => new Date())
  const gridRef = useRef<HTMLDivElement>(null)
  const noticeTimer = useRef<number | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(
    () => () => {
      if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    },
    [],
  )

  function showNotice(message: string) {
    setNotice(message)
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => {
      noticeTimer.current = null
      setNotice(null)
    }, 4200)
  }

  /** 方向键在模块之间移动焦点，Enter 直接进入 */
  function onGridKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(event.key)) return
    const controls = Array.from(gridRef.current?.querySelectorAll<HTMLElement>('[data-module-control]') ?? [])
    if (controls.length === 0) return

    event.preventDefault()
    const current = controls.indexOf(document.activeElement as HTMLElement)
    let next = current
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1 + controls.length) % controls.length
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + controls.length) % controls.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = controls.length - 1
    controls[next]?.focus()
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <TopBar clock={clock} />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 pb-14 pt-10 sm:px-6 sm:pt-14">
        <header className="matuone-rise text-center" style={{ '--matuone-delay': '2900ms' } as CSSProperties}>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
            STEM 课外课学习中枢
          </p>
          <h1 className="mt-5 text-[clamp(28px,5vw,46px)] font-bold leading-tight tracking-tight text-ink">
            选一个板块，开始今天的探索
          </h1>
        </header>

        <section aria-label="板块启动" className="mt-9 w-full sm:mt-12">
          <div
            className="matuone-window matuone-rise relative rounded-3xl border border-white/10 bg-white/[0.02] p-1.5 shadow-[0_40px_120px_-40px_rgba(255,176,92,0.32)]"
            style={{ '--matuone-delay': '3050ms' } as CSSProperties}
          >
            <span className="matuone-corner-tl" aria-hidden="true" />
            <span className="matuone-corner-tr" aria-hidden="true" />
            <span className="matuone-corner-bl" aria-hidden="true" />
            <span className="matuone-corner-br" aria-hidden="true" />

            <div className="flex items-center gap-3 rounded-t-2xl border-b border-white/10 px-4 py-3">
              <span className="flex gap-2" aria-hidden="true">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              </span>
              <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft">MATUONE · LAUNCHER</p>
              <p className="ml-auto hidden font-mono text-[11px] text-ink-soft/70 sm:block">
                {modules.length} MODULES · v1.0
              </p>
            </div>

            <div
              ref={gridRef}
              onKeyDown={onGridKeyDown}
              className="grid gap-3 p-3 md:grid-cols-3"
            >
              {modules.map((module) => (
                <ModuleCard key={module.module_id} module={module} onSoon={showNotice} />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-white/10 px-4 py-2.5 font-mono text-[11px] text-ink-soft/80">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                系统就绪
              </span>
              <span>已装载 {modules.length} 个板块</span>
              <span className="ml-auto hidden sm:inline">方向键选择 · Enter 进入</span>
            </div>
          </div>

          <p role="status" className="mt-3 min-h-6 text-center text-sm text-brand">
            {notice}
          </p>
        </section>

      </main>

      <footer className="matuone-rise relative z-10 border-t border-white/10 px-4 py-6 sm:px-6" style={{ '--matuone-delay': '3450ms' } as CSSProperties}>
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-xs text-ink-soft/80 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.companyName}
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="站点信息">
            {FOOT_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="transition hover:text-brand">
                {link.label}
              </Link>
            ))}
            <Link to="/python" className="transition hover:text-brand">
              Python 课外课介绍
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

function TopBar({ clock }: { clock: Date }): ReactNode {
  const [soundOn, setSoundOn] = useState(isLauncherAudioEnabled)

  function toggleSound() {
    const next = toggleLauncherAudio()
    setSoundOn(next)
    if (next) playLauncherSound('click')
  }

  return (
    <header
      className="matuone-rise relative z-10 border-b border-white/10 bg-white/[0.03] backdrop-blur"
      style={{ '--matuone-delay': '2850ms' } as CSSProperties}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3.5 sm:px-6">
        <Link to="/" className="flex items-center gap-3" aria-label="MatuOne 首页">
          <BrandGlyph className="h-9 w-9 shrink-0" />
          <span className="leading-tight">
            <span className="block text-[17px] font-bold tracking-tight text-ink">MatuOne</span>
            <span className="block font-mono text-[10px] tracking-[0.2em] text-ink-soft/70">STEM 学习中枢</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="主导航">
          {TOP_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg px-3 py-2 text-sm text-ink-soft transition hover:bg-white/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <span className="ml-auto font-mono text-xs tabular-nums text-ink-soft/80 md:ml-0">
          {clock.toLocaleTimeString('zh-CN', { hour12: false })}
        </span>

        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
          title={soundOn ? '关闭音效' : '开启音效'}
          className="hidden items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 font-mono text-[11px] text-ink-soft transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:flex"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${soundOn ? 'bg-brand' : 'bg-white/25'}`}
            aria-hidden="true"
          />
          音效
        </button>

        <Link
          to="/enter"
          className="rounded-lg border border-white/15 px-3 py-2 text-sm text-ink transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:hidden"
        >
          进入系统
        </Link>
      </div>
    </header>
  )
}
