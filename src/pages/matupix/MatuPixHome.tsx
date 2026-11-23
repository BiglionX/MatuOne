import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PixelFooter } from './PixelFooter'
import { TEMPLATES, type PixelTemplate } from './templates'

const DRAFT_KEY = 'matupix.draft.v1'

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b2744] focus-visible:ring-offset-2'

const PRESS_RED = `inline-flex min-h-[56px] items-center gap-2 rounded-2xl bg-[#e10600] px-6 text-lg font-bold text-white shadow-[0_6px_0_0_#9b1020] transition-[transform,box-shadow] duration-100 hover:bg-[#c50500] active:translate-y-1 active:shadow-[0_2px_0_0_#9b1020] ${FOCUS}`

const PRESS_WHITE = `inline-flex min-h-[56px] items-center gap-2 rounded-2xl bg-white px-6 text-lg font-bold text-[#1b2744] shadow-[0_6px_0_0_#c5d0dc] ring-1 ring-[#d5dee8] transition-[transform,box-shadow] duration-100 hover:bg-[#f8fbff] active:translate-y-1 active:shadow-[0_2px_0_0_#c5d0dc] ${FOCUS}`

const TEMPLATE_TONES = [
  { card: 'border-[#b7e7c8] bg-[#e7f8ee]', name: 'text-[#146c43]', action: 'bg-[#1f9d5c]', hint: 'text-[#1f9d5c]' },
  { card: 'border-[#b9d7fb] bg-[#e7f3ff]', name: 'text-[#1d4ed8]', action: 'bg-[#3b82f6]', hint: 'text-[#2563eb]' },
  { card: 'border-[#ddc7fb] bg-[#f4eaff]', name: 'text-[#6d28d9]', action: 'bg-[#8b5cf6]', hint: 'text-[#7c3aed]' },
  { card: 'border-[#f3d19a] bg-[#fff4df]', name: 'text-[#9a6700]', action: 'bg-[#f59e0b]', hint: 'text-[#b45309]' },
] as const

const FAQ = [
  {
    question: 'MatuPix 免费吗？',
    answer: '免费使用。不需要账号，页面上也不放广告。',
  },
  {
    question: '需要安装吗？',
    answer: '不需要。打开浏览器就能画，电脑、平板和手机都可以。',
  },
  {
    question: '适合几岁？',
    answer: '大约 5 岁起，在大人旁边点一点就能填上第一格。格子和按钮都做得比较大。',
  },
  {
    question: '作品会保存吗？',
    answer: '不会上传到服务器。像素画和 3D 积木的草稿都只留在这台设备上；像素画还可以下载 PNG，积木可以导出 LDraw。换一台设备或清掉浏览器缓存就看不到了。',
  },
  {
    question: '可以让画动起来吗？',
    answer: '可以。工作室里能加好几帧，放映预览。两张以上可以保存成 GIF。',
  },
] as const

const REASONS = [
  {
    title: '无需安装',
    body: '工作室像网页一样打开。没有账号，也不用下载。',
    iconBg: 'bg-[#fff4d6]',
    border: 'border-[#f6e2a8]',
    icon: 'bolt',
  },
  {
    title: '为孩子设计',
    body: '格子清楚，颜色鲜明。点一下或拖一下，就能填上颜色。',
    iconBg: 'bg-[#ffe4ef]',
    border: 'border-[#f6c7d8]',
    icon: 'face',
  },
  {
    title: '到处都能用',
    body: '电脑、平板、触摸屏都可以。手指能画，滚轮可以放大格子。',
    iconBg: 'bg-[#e5f2ff]',
    border: 'border-[#c5dffb]',
    icon: 'device',
  },
  {
    title: '数据不出设备',
    body: '作品不会上传。你画的东西留在这台设备上。',
    iconBg: 'bg-[#e5f8ee]',
    border: 'border-[#bfe8d0]',
    icon: 'lock',
  },
] as const

function RainbowBar() {
  return (
    <div className="flex h-1 w-full" aria-hidden="true">
      <span className="h-full flex-1 bg-[#e23b3b]" />
      <span className="h-full flex-1 bg-[#f5b942]" />
      <span className="h-full flex-1 bg-[#3b82f6]" />
      <span className="h-full flex-1 bg-[#22a06b]" />
    </div>
  )
}

function LogoMark() {
  return (
    <span className="grid h-9 w-9 grid-cols-2 gap-0.5" aria-hidden="true">
      <span className="rounded-[4px] bg-[#ff5a5f]" />
      <span className="rounded-[4px] bg-[#3b82f6]" />
      <span className="rounded-[4px] bg-[#f5c542]" />
      <span className="rounded-[4px] bg-[#2fbe6a]" />
    </span>
  )
}

function BrickIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
      <path d="M4 8.5 10 5.2l6 3.3v6.2L10 18l-6-3.3V8.5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 8.5 10 11.8 16 8.5M10 11.8V18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <path d="M6 14 14 6M8 6h6v6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FlagMark() {
  return (
    <svg viewBox="0 0 20 14" className="h-3.5 w-5 rounded-[2px]" aria-hidden="true">
      <rect width="20" height="14" fill="#de2910" />
      <path fill="#ffde00" d="m4.2 2.1.55 1.55h1.65L5.4 4.6l.5 1.5-1.7-.95-1.7.95.5-1.5-1.2-.95h1.65L4.2 2.1Z" />
    </svg>
  )
}

function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M12 1.2 14.4 9.6 22.8 12 14.4 14.4 12 22.8 9.6 14.4 1.2 12 9.6 9.6 12 1.2Z" />
    </svg>
  )
}

function ReasonIcon({ name }: { name: (typeof REASONS)[number]['icon'] }) {
  if (name === 'bolt') {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#e0a100]" aria-hidden="true">
        <path fill="currentColor" d="M13.2 2.5 4.8 13.2h5.2l-1 8.3 8.8-11.4h-5.4l1-7.6Z" />
      </svg>
    )
  }
  if (name === 'face') {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#e36a93]" aria-hidden="true">
        <circle cx="12" cy="12" r="7.2" fill="currentColor" />
        <circle cx="9.4" cy="11" r="1" fill="#fff" />
        <circle cx="14.6" cy="11" r="1" fill="#fff" />
        <path d="M9.2 14.2c.8 1.2 1.8 1.7 2.8 1.7s2-.5 2.8-1.7" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'device') {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#3b82f6]" fill="none" aria-hidden="true">
        <rect x="7" y="3.5" width="10" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M11 17.5h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#1f9d5c]" fill="none" aria-hidden="true">
      <rect x="6" y="10.5" width="12" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 10.5V8.2a3.5 3.5 0 0 1 7 0v2.3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function PixelBlocks({
  rows,
  colors,
  className,
}: {
  rows: readonly string[]
  colors: Record<string, string>
  className?: string
}) {
  const width = rows[0]?.length ?? 1
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))`,
      }}
      aria-hidden="true"
    >
      {rows.map((row, y) =>
        [...row].map((cell, x) => <span key={`${x}-${y}`} style={{ backgroundColor: colors[cell] ?? 'transparent' }} />),
      )}
    </div>
  )
}

const MASCOT_ROWS = [
  '................',
  '..AA......AA....',
  '..AAAAAAAAAA....',
  '..AAWWAAWWAA....',
  '..AAKKAAKKAA....',
  '..AAAAAAAAAA....',
  '....AAOOAA......',
  '.....AAAA.......',
  '....BBBBBB......',
  '...BBBBBBBB.....',
  '...BBBWWBBB.....',
  '....BBBBBB......',
  '.....B..B.......',
  '....BB..BB......',
  '................',
  '................',
] as const

const HEART_ROWS = ['.HH..HH.', 'HHHHHHHH', 'HHHHHHHH', 'HLHHHHHH', '.HHHHHH.', '..HHHH..', '...HH...', '....H...'] as const

function TemplateThumb({ pixels }: { pixels: (string | null)[][] }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const source = pixels[0]?.length || pixels.length || 1
    const scale = 64 / source
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, 64, 64)
    for (let y = 0; y < pixels.length; y += 1) {
      const row = pixels[y]
      if (!row) continue
      for (let x = 0; x < row.length; x += 1) {
        const color = row[x]
        if (!color) continue
        ctx.fillStyle = color
        ctx.fillRect(Math.floor(x * scale), Math.floor(y * scale), Math.ceil(scale), Math.ceil(scale))
      }
    }
  }, [pixels])

  return (
    <canvas
      ref={ref}
      width={64}
      height={64}
      aria-hidden="true"
      className="h-14 w-14 rounded-2xl bg-white"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function HeroArt() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <p className="absolute left-[4%] top-[7%] z-10 max-w-[260px] rounded-[22px] rounded-bl-md bg-white px-4 py-3 text-[15px] font-bold leading-snug text-[#2457d6] shadow-[0_10px_30px_rgba(36,87,214,0.12)] sm:text-base">
        <Sparkle className="mr-1 inline h-4 w-4 text-[#5b8def]" />
        一格一格，画出你的世界。
      </p>
      <div className="relative aspect-square rounded-full bg-[radial-gradient(circle_at_50%_42%,#ffffff_0%,#e7f6ff_58%,#d4eefc_100%)] shadow-[inset_0_0_0_12px_rgba(255,255,255,0.72)]">
        <PixelBlocks
          rows={MASCOT_ROWS}
          colors={{ A: '#f4b183', W: '#fff8ef', K: '#2a211c', O: '#e23d3d', B: '#5b8def' }}
          className="absolute left-1/2 top-[54%] h-64 w-64 -translate-x-1/2 -translate-y-1/2"
        />
      </div>
      <span className="absolute left-[8%] top-[38%] h-8 w-8 rounded-[6px] bg-[#7c6cf0] shadow-[4px_4px_0_#5b4ad4]" aria-hidden="true" />
      <span className="absolute right-[10%] top-[30%] h-10 w-10 rounded-[7px] bg-[#f59a23] shadow-[5px_5px_0_#d97706]" aria-hidden="true" />
      <span className="absolute bottom-[18%] left-[14%] h-7 w-7 rounded-[5px] bg-[#2fbe6a] shadow-[4px_4px_0_#159350]" aria-hidden="true" />
      <Sparkle className="absolute right-[18%] top-[18%] h-6 w-6 text-[#f5c542]" />
      <Sparkle className="absolute bottom-[28%] right-[8%] h-5 w-5 text-[#f9a8d4]" />
      <p className="absolute bottom-6 right-1 text-sm font-bold text-[#7c3aed] sm:right-3">100% 想象力</p>
    </div>
  )
}

function GraphPaper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-[230px]"
      style={{
        backgroundColor: '#fff8f2',
        backgroundImage:
          'linear-gradient(#f3ddc8 1px, transparent 1px), linear-gradient(90deg, #f3ddc8 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      {children}
    </div>
  )
}

function BrickHouse() {
  return (
    <svg viewBox="0 0 220 180" className="h-44 w-52" aria-hidden="true">
      <polygon points="110,150 196,108 110,66 24,108" fill="#7dce86" />
      <polygon points="110,150 196,108 196,122 110,164" fill="#5eae68" />
      <polygon points="24,108 110,150 110,164 24,122" fill="#8ed896" />
      <polygon points="78,118 110,136 110,78 78,60" fill="#f6d48a" />
      <polygon points="110,136 156,112 156,54 110,78" fill="#e7b85c" />
      <polygon points="70,64 110,84 110,46 70,28" fill="#8b74f0" />
      <polygon points="110,84 164,56 164,28 110,46" fill="#6d56d8" />
      <rect x="90" y="96" width="14" height="22" fill="#c47a45" />
      <rect x="124" y="78" width="16" height="14" fill="#9fd7f5" />
      <rect x="118" y="28" width="10" height="18" fill="#d98a4a" />
      <rect x="40" y="96" width="16" height="10" rx="1" fill="#f0a04a" transform="rotate(-24 40 96)" />
      <rect x="168" y="78" width="18" height="10" rx="1" fill="#6d8cff" transform="rotate(24 168 78)" />
    </svg>
  )
}

function StudioCards() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <article className="grid overflow-hidden rounded-[28px] border border-[#d7e6fb] bg-white shadow-[0_18px_40px_rgba(37,99,235,0.06)] md:grid-cols-[0.9fr_1.1fr]">
        <div className="relative flex min-h-[240px] items-center justify-center bg-[linear-gradient(160deg,#e7f6ff_0%,#f4fbff_55%,#e7f8ee_100%)]">
          <BrickHouse />
          <span className="absolute bottom-4 left-4 rounded-lg bg-[#3b82f6] px-2 py-1 text-[11px] font-bold tracking-wide text-white shadow-[0_3px_0_0_#1d4ed8]">
            3D
          </span>
        </div>
        <div className="flex flex-col items-start px-6 py-7 md:px-7">
          <p className="rounded-full bg-[#e7f1ff] px-3 py-1 text-sm font-semibold text-[#2563eb]">搭建 · 堆叠 · 想象</p>
          <h3 className="mt-4 text-[26px] font-extrabold leading-[1.3] text-[#1b2744]">你的世界，一块一块搭起来</h3>
          <p className="mt-3 text-[16px] leading-7 text-slate-600">从一张白纸开始，或者把现成的模型改成你喜欢的样子。一整箱零件正等着你。</p>
          <Link
            to="/matupix/brick"
            className={`mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#3b82f6] px-5 text-base font-bold text-white shadow-[0_5px_0_0_#1d4ed8] transition-[transform,box-shadow] hover:bg-[#2f74ea] active:translate-y-1 active:shadow-[0_2px_0_0_#1d4ed8] ${FOCUS}`}
          >
            进入3D工作室
            <ArrowUpIcon />
          </Link>
        </div>
      </article>

      <article className="grid overflow-hidden rounded-[28px] border border-[#f3c7a2] bg-white shadow-[0_18px_40px_rgba(180,90,20,0.06)] md:grid-cols-[0.9fr_1.1fr]">
        <GraphPaper>
          <PixelBlocks
            rows={HEART_ROWS}
            colors={{ H: '#e23b4a', L: '#ff8b93' }}
            className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2"
          />
          <Sparkle className="absolute right-8 top-8 h-6 w-6 text-[#f5c542]" />
          <span className="absolute bottom-4 left-4 rounded-lg bg-[#f59a23] px-2 py-1 text-[11px] font-bold tracking-wide text-white shadow-[0_3px_0_0_#c2410c]">
            PIXEL ART
          </span>
        </GraphPaper>
        <div className="flex flex-col items-start px-6 py-7 md:px-7">
          <p className="rounded-full bg-[#fff1df] px-3 py-1 text-sm font-semibold text-[#c26a00]">绘画 · 涂色 · 探索</p>
          <h3 className="mt-4 text-[28px] font-extrabold leading-[1.25] text-[#1b2744]">
            小小像素，
            <br />
            大大个性
          </h3>
          <p className="mt-3 text-[16px] leading-7 text-slate-600">选一种颜色，让你的想法成形。用鼠标画，或者直接用手指画。</p>
          <Link
            to="/matupix/create"
            className={`mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#f59a23] px-5 text-base font-bold text-white shadow-[0_5px_0_0_#c2410c] transition-[transform,box-shadow] hover:bg-[#e8880f] active:translate-y-1 active:shadow-[0_2px_0_0_#c2410c] ${FOCUS}`}
          >
            进入像素工作室
            <ArrowUpIcon />
          </Link>
        </div>
      </article>
    </div>
  )
}

function TemplateCard({ template, index }: { template: PixelTemplate; index: number }) {
  const tone = TEMPLATE_TONES[index % TEMPLATE_TONES.length] ?? TEMPLATE_TONES[0]
  return (
    <Link
      to={`/matupix/create?template=${template.id}`}
      aria-label={`${template.name}，打开这个模板`}
      className={`flex min-h-[92px] items-center gap-3 rounded-[22px] border px-3 py-3 transition hover:-translate-y-0.5 ${tone.card} ${FOCUS}`}
    >
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
        <TemplateThumb pixels={template.pixels} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-lg font-extrabold ${tone.name}`}>{template.name}</span>
        <span className={`mt-0.5 block text-sm font-semibold ${tone.hint}`}>打开这个模板</span>
      </span>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${tone.action}`}>
        <ArrowUpIcon />
      </span>
    </Link>
  )
}

export function MatuPixHome() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [soon, setSoon] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const soonTimer = useRef<number | null>(null)

  useEffect(() => {
    try {
      setHasDraft(localStorage.getItem(DRAFT_KEY) !== null)
    } catch {
      setHasDraft(false)
    }
    return () => {
      if (soonTimer.current !== null) window.clearTimeout(soonTimer.current)
    }
  }, [])

  function showSoon(message: string) {
    setSoon(message)
    if (soonTimer.current !== null) window.clearTimeout(soonTimer.current)
    soonTimer.current = window.setTimeout(() => {
      soonTimer.current = null
      setSoon(null)
    }, 2000)
  }

  function submitParent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setNotice('请填写有效的电子邮箱。')
      return
    }
    if (!agreed) {
      setNotice('请先勾选同意。')
      return
    }
    setNotice('通讯还没开通。这个邮箱没有发出去，也没有被保存。')
  }

  const nav = [
    { label: '像素画', to: '/matupix/create' },
    { label: '3D积木', to: '/matupix/brick' },
    { label: '模型文件', to: '#templates' },
    { label: '关于', to: '#about' },
  ]

  return (
    <div className="relative flex min-h-screen w-full flex-1 flex-col bg-[linear-gradient(180deg,#8fd4fb_0%,#d4f0ff_18%,#eef8ff_42%,#fff8ee_100%)] text-[#1b2744]">
      <a
        href="#content"
        className={`sr-only top-3 left-3 z-50 bg-white px-3 py-2 font-semibold focus:not-sr-only focus:absolute focus:rounded-lg ${FOCUS}`}
      >
        跳到正文
      </a>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/matupix" className={`flex items-center gap-2 ${FOCUS} rounded-lg`} aria-label="MatuPix 主页">
            <LogoMark />
            <span className="text-[22px] font-extrabold tracking-tight">MatuPix</span>
          </Link>
          <nav aria-label="主导航" className="ml-auto hidden items-center gap-7 md:flex">
            {nav.map((item) =>
              item.to.startsWith('/') ? (
                <Link key={item.label} to={item.to} className={`text-[15px] font-semibold text-slate-700 hover:text-[#1b2744] ${FOCUS} rounded-md`}>
                  {item.label}
                </Link>
              ) : (
                <a key={item.label} href={item.to} className={`text-[15px] font-semibold text-slate-700 hover:text-[#1b2744] ${FOCUS} rounded-md`}>
                  {item.label}
                </a>
              ),
            )}
          </nav>
          <div className="relative ml-auto flex items-center gap-2 md:ml-4">
            <button
              type="button"
              className={`inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-[0_3px_0_0_#e2e8f0] transition-[transform,box-shadow] active:translate-y-0.5 active:shadow-[0_1px_0_0_#e2e8f0] ${FOCUS}`}
              onClick={() => showSoon('语言切换即将开放')}
            >
              <FlagMark />
              ZH
            </button>
            <button
              type="button"
              aria-label="深色"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg shadow-[0_3px_0_0_#e2e8f0] transition-[transform,box-shadow] active:translate-y-0.5 active:shadow-[0_1px_0_0_#e2e8f0] ${FOCUS}`}
              onClick={() => showSoon('深色模式即将开放')}
            >
              <span aria-hidden="true">🌙</span>
            </button>
            <button
              type="button"
              className={`inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-3 text-sm font-bold md:hidden ${FOCUS}`}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              菜单
            </button>
            {soon ? (
              <p role="status" className="absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-lg bg-white px-3 py-1 text-sm text-slate-500 shadow">
                {soon}
              </p>
            ) : null}
          </div>
        </div>
        {menuOpen ? (
          <nav aria-label="移动导航" className="flex flex-col gap-1 border-t border-slate-100 px-4 py-3 md:hidden">
            {nav.map((item) =>
              item.to.startsWith('/') ? (
                <Link key={item.label} to={item.to} className={`rounded-xl px-3 py-3 text-base font-semibold ${FOCUS}`} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              ) : (
                <a key={item.label} href={item.to} className={`rounded-xl px-3 py-3 text-base font-semibold ${FOCUS}`} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </a>
              ),
            )}
          </nav>
        ) : null}
        <RainbowBar />
      </header>

      <main id="content" className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-16 sm:px-6">
        <section className="relative left-1/2 grid w-screen -translate-x-1/2 items-center gap-8 bg-[radial-gradient(ellipse_at_78%_42%,#ffffff_0%,rgba(255,255,255,0)_42%),linear-gradient(180deg,#7ecff8_0%,#b7e7ff_34%,#e5f6ff_78%,rgba(255,248,238,0)_100%)] px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="mx-auto w-full max-w-6xl lg:col-span-2 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#fff6d8] px-3 py-1.5 text-sm font-semibold text-[#8a5a00] shadow-[0_3px_0_0_#f3e2a4]">
              <span className="h-2 w-2 rounded-full bg-[#22a06b]" aria-hidden="true" />
              像素画与3D积木 · 免费在浏览器里玩
            </p>
            <h1 className="mt-5 text-[clamp(40px,6vw,68px)] font-extrabold leading-[1.05] tracking-tight">
              像素画与3D积木。
              <span className="mt-1 block text-[#e10600]">
                <span className="bg-[linear-gradient(transparent_62%,#ffe14a_62%,#ffe14a_92%,transparent_92%)]">无限创意。</span>
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              只要一点点想象力。直接在浏览器里搭建3D世界，或者让像素画活起来。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/matupix/brick" className={PRESS_RED}>
                <BrickIcon />
                搭3D积木
              </Link>
              <Link to="/matupix/create" className={PRESS_WHITE}>
                画像素画
                <span aria-hidden="true">→</span>
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2">
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[#17804a] shadow-[0_3px_0_0_#b7e7c8] ring-1 ring-[#b7e7c8]">
                <span aria-hidden="true">✓</span> 免费畅玩
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[#2563eb] shadow-[0_3px_0_0_#b9d7fb] ring-1 ring-[#b9d7fb]">
                <span aria-hidden="true">✓</span> 无需注册
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[#c26a00] shadow-[0_3px_0_0_#f3d19a] ring-1 ring-[#f3d19a]">
                <span aria-hidden="true">✓</span> 专为触屏设计
              </li>
            </ul>
          </div>
          <HeroArt />
          </div>
        </section>

        {hasDraft ? (
          <section aria-labelledby="draft-title" className="mb-10 rounded-[24px] bg-white/80 px-5 py-5 shadow-[0_10px_30px_rgba(28,43,74,0.05)] ring-1 ring-white">
            <h2 id="draft-title" className="text-2xl font-extrabold">
              你的作品在等你
            </h2>
            <p className="mt-1 text-slate-600">接着画这台设备上保存的作品。</p>
            <Link to="/matupix/create" className={`mt-4 inline-flex min-h-11 items-center rounded-full bg-[#1b2744] px-5 text-sm font-bold text-white ${FOCUS}`}>
              继续创作
            </Link>
          </section>
        ) : null}

        <section id="studio" aria-labelledby="studio-title" className="scroll-mt-24 pb-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex rounded-full bg-[#ffe4ef] px-3 py-1 text-xs font-bold tracking-[0.14em] text-[#d4537e]">MATUPIX STUDIO</p>
              <h2 id="studio-title" className="mt-3 text-[clamp(32px,4vw,44px)] font-extrabold leading-tight">
                今天想创作什么？
              </h2>
            </div>
            <p className="max-w-xs text-right text-slate-600">两个工作室，千百种玩法，由你做主。</p>
          </div>
          <div className="mt-6">
            <StudioCards />
          </div>
        </section>

        <section id="templates" aria-labelledby="template-title" className="scroll-mt-24 py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex rounded-full bg-[#e5f8ee] px-3 py-1 text-sm font-semibold text-[#17804a]">分步指南</p>
              <h2 id="template-title" className="mt-3 text-[clamp(32px,4vw,44px)] font-extrabold leading-tight">
                来个灵感开个头
              </h2>
              <p className="mt-2 max-w-xl text-slate-600">打开一个模板，跟着编号填色，再加上你自己的创意。</p>
            </div>
            <Link
              to="/matupix/create"
              className={`inline-flex min-h-11 items-center rounded-full bg-[#ffe4e6] px-4 text-sm font-bold text-[#e10600] hover:bg-[#ffd0d4] ${FOCUS}`}
            >
              全部模板 →
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {TEMPLATES.map((template, index) => (
              <TemplateCard key={template.id} template={template} index={index} />
            ))}
          </div>
        </section>

        <section id="photo" aria-labelledby="photo-home-title" className="scroll-mt-24 grid items-center gap-6 rounded-[28px] bg-white/75 px-5 py-6 ring-1 ring-white sm:grid-cols-[1fr_auto] sm:px-7">
          <div>
            <h2 id="photo-home-title" className="text-2xl font-extrabold">
              手里有一张喜欢的图片？
            </h2>
            <p className="mt-2 max-w-xl text-slate-600">上传之后会裁成正方形，再收成当前网格上的像素画。原来的照片不会离开这台设备。</p>
          </div>
          <Link
            to="/matupix/create#photo"
            className={`inline-flex min-h-12 items-center justify-center rounded-full bg-[#1b2744] px-5 font-bold text-white ${FOCUS}`}
          >
            上传图片
          </Link>
        </section>

        <section id="about" aria-labelledby="about-title" className="scroll-mt-24 border-t border-dashed border-[#d5e4ef] pt-12">
          <h2 id="about-title" className="max-w-3xl text-[clamp(28px,4vw,40px)] font-extrabold leading-tight">
            免费的像素画与3D积木创作工坊
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            在 8×8 至 128×128 网格上绘画，或用 2×2、2×4、1×2 三种零件搭建模型。开始新作品，或打开带有填色编号的免费模板。两个工坊均可在手机、平板和电脑浏览器中使用，无需账户。
          </p>

          <h2 className="mt-12 text-[clamp(28px,4vw,40px)] font-extrabold">为什么选 MatuPix</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {REASONS.map((item) => (
              <li key={item.title} className={`rounded-[24px] border bg-white px-5 py-5 ${item.border}`}>
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconBg}`}>
                  <ReasonIcon name={item.icon} />
                </span>
                <h3 className="mt-4 text-xl font-extrabold">{item.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-slate-600">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq-title" className="py-14">
          <h2 id="faq-title" className="text-center text-[clamp(28px,4vw,40px)] font-extrabold">
            常见问题
          </h2>
          <ul className="mx-auto mt-6 flex max-w-3xl flex-col gap-3">
            {FAQ.map((item, index) => {
              const expanded = openFaq === index
              const panelId = `home-faq-${index}`
              return (
                <li key={item.question}>
                  <div className="rounded-[20px] bg-white shadow-[0_8px_24px_rgba(28,43,74,0.05)] ring-1 ring-[#e7eef6]">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() => setOpenFaq(expanded ? null : index)}
                      className={`flex min-h-[60px] w-full items-center gap-3 rounded-[20px] px-5 text-left text-lg font-bold ${FOCUS}`}
                    >
                      <span className="min-w-0 flex-1">{item.question}</span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3b82f6] text-xl leading-none text-white" aria-hidden="true">
                        {expanded ? '–' : '+'}
                      </span>
                    </button>
                    {expanded ? (
                      <p id={panelId} className="px-5 pb-4 text-[16px] leading-7 text-slate-600">
                        {item.answer}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section aria-labelledby="parent-title" className="rounded-[28px] border border-dashed border-[#e4c56a] bg-[#fff6d2] px-5 py-7 sm:px-8">
          <h2 id="parent-title" className="text-[clamp(28px,4vw,36px)] font-extrabold">
            家长：新模板还在准备
          </h2>
          <p className="mt-3 max-w-3xl text-slate-700">
            家长通讯还没开通。开通之后，每月最多一封信：一个可以临摹的新模板，以及工作室的新消息。写给大人看，不是给孩子。
          </p>
          <form onSubmit={submitParent} className="mt-5" noValidate>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="min-w-0 flex-1">
                <span className="sr-only">电子邮箱</span>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="parent@example.com"
                  autoComplete="email"
                  className={`h-12 w-full rounded-2xl border border-white bg-white px-4 text-base outline-none ${FOCUS}`}
                />
              </label>
              <button type="submit" className={`h-12 shrink-0 rounded-2xl bg-[#e10600] px-6 font-bold text-white hover:bg-[#c50500] ${FOCUS}`}>
                我想收到
              </button>
            </div>
            <label className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>我已成年，同意在通讯开通后接收这些邮件。</span>
            </label>
            <p className="mt-3 text-sm text-slate-600">邮箱不会上传。通讯开通前，这里只检查格式。</p>
            {notice ? (
              <p role="status" className="mt-3 text-sm font-semibold text-[#1b2744]">
                {notice}
              </p>
            ) : null}
          </form>
        </section>
      </main>

      <RainbowBar />
      <PixelFooter
        framed={false}
        links={[
          { label: '像素画', to: '/matupix/create' },
          { label: '3D积木', to: '/matupix/brick' },
          { label: '模型文件', to: '#templates' },
          { label: '关于', to: '#about' },
          { label: '返回 MatuOne', to: '/' },
        ]}
      />
    </div>
  )
}
