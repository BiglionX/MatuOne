import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const HINT_MS = 2000

const linkClass =
  'inline cursor-pointer rounded-sm border-0 bg-transparent p-0 text-[15px] font-normal leading-normal text-slate-600 underline decoration-slate-400 underline-offset-[3px] hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2'

const iconButtonClass =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold leading-none text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2'

const languageClass =
  'cursor-pointer whitespace-nowrap rounded-sm border-0 bg-transparent p-0 text-[13px] font-normal leading-[1.9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2'

const LANGUAGES = ['English', 'Français', 'Español', 'Deutsch', 'Italiano', 'Türkçe', 'العربية', 'Русский', '中文', '日本語'] as const

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.1 3.4c.4 2.5 1.9 4 4.3 4.3v2.6a6.7 6.7 0 0 1-4.1-1.3v6.8a5.5 5.5 0 1 1-5.5-5.5c.3 0 .7 0 1 .1v2.7a2.9 2.9 0 1 0 2 2.8V3.4h2.3Z"
      />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.3" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16.7" cy="7.3" r="0.9" fill="currentColor" />
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <rect x="2.6" y="6.2" width="18.8" height="11.6" rx="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10.3 9.2v5.6l4.8-2.8-4.8-2.8Z" fill="currentColor" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M13.7 20v-6.2h2.1l.4-2.4h-2.5V9.8c0-.7.2-1.2 1.3-1.2h1.3V6.2c-.2 0-1.1-.1-2-.1-1.9 0-3.2 1.2-3.2 3.4v1.9H8.6v2.4h2.5V20h2.6Z"
      />
    </svg>
  )
}

function PinterestIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10.1 16.6V8h2.9a2.6 2.6 0 0 1 0 5.2h-2.9" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function WeChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#12B75A"
        d="M16.15 4.15c-2.2 0-4 1.48-4 3.3 0 1.82 1.8 3.3 4 3.3.36 0 .7-.04 1.04-.12l1.58.8-.44-1.38c.92-.56 1.52-1.5 1.52-2.6 0-1.82-1.8-3.3-4-3.3Z"
      />
      <circle cx="14.65" cy="7.45" r="0.55" fill="#fff" />
      <circle cx="17.55" cy="7.45" r="0.55" fill="#fff" />
      <path
        fill="#12B75A"
        d="M9.2 8.05c-3.2 0-5.8 2.2-5.8 4.9 0 1.52.86 2.9 2.24 3.76l-.64 2.05 2.3-1.18c.6.16 1.22.26 1.9.26 3.2 0 5.8-2.2 5.8-4.9s-2.6-4.89-5.8-4.89Z"
      />
      <circle cx="7.15" cy="12.9" r="0.7" fill="#fff" />
      <circle cx="9.35" cy="12.9" r="0.7" fill="#fff" />
      <circle cx="11.55" cy="12.9" r="0.7" fill="#fff" />
    </svg>
  )
}

function WeiboIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M3.2 12S6.5 7 12 7s8.8 5 8.8 5-3.3 5-8.8 5-8.8-5-8.8-5Z"
        stroke="#E6162D"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12.4" cy="11.7" r="2.05" fill="#E6162D" />
    </svg>
  )
}

function XiaohongshuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M12 7.1c-2.15-1.45-4.5-1.95-7.1-1.55v11.1c2.6-.4 4.95.1 7.1 1.55 2.15-1.45 4.5-1.95 7.1-1.55V5.55c-2.6-.4-4.95.1-7.1 1.55Z"
        stroke="#FF2442"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 7.1v11.1" stroke="#FF2442" strokeWidth="1.6" />
    </svg>
  )
}

function BilibiliIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M7.5 4.3 5.7 7M16.5 4.3 18.3 7" stroke="#FB7299" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="3.8" y="7" width="16.4" height="12.1" rx="2.2" stroke="#3AA0E8" strokeWidth="1.7" />
      <path d="M8.3 11.2v4M15.7 11.2v4" stroke="#FB7299" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

const SOCIALS: { label: string; mark: string | null; Icon: (() => React.JSX.Element) | null }[] = [
  { label: 'TikTok', mark: null, Icon: TikTokIcon },
  { label: 'Instagram', mark: null, Icon: InstagramIcon },
  { label: 'YouTube', mark: null, Icon: YouTubeIcon },
  { label: 'Facebook', mark: null, Icon: FacebookIcon },
  { label: 'Pinterest', mark: null, Icon: PinterestIcon },
  { label: 'X', mark: null, Icon: XIcon },
  { label: '微信', mark: null, Icon: WeChatIcon },
  { label: '微博', mark: null, Icon: WeiboIcon },
  { label: '小红书', mark: null, Icon: XiaohongshuIcon },
  { label: '哔哩哔哩', mark: null, Icon: BilibiliIcon },
]

export function PixelFooter({
  links,
  framed = true,
}: {
  links?: readonly { label: string; to: string }[]
  framed?: boolean
} = {}) {
  const [hint, setHint] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  function showSoon() {
    setHint(true)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      setHint(false)
    }, HINT_MS)
  }

  return (
    <footer className={`w-full min-w-0 overflow-x-clip bg-white px-3 py-5 text-center ${framed ? 'border-t border-slate-200' : ''}`}>
      {links && links.length > 0 ? (
        <div className="mx-auto mb-4 flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-2 text-left">
          <p className="m-0 text-sm text-slate-500">© {new Date().getFullYear()} MatuPix — 儿童像素画工作室</p>
          <nav aria-label="页脚" className="flex flex-wrap gap-x-4 gap-y-1">
            {links.map((item) =>
              item.to.startsWith('/') ? (
                <Link key={item.label} to={item.to} className={linkClass}>
                  {item.label}
                </Link>
              ) : (
                <a key={item.label} href={item.to} className={linkClass}>
                  {item.label}
                </a>
              ),
            )}
          </nav>
        </div>
      ) : null}
      <p className="m-0 flex flex-wrap items-baseline justify-center gap-x-1 text-[15px] font-normal leading-normal text-slate-500">
        <button type="button" className={linkClass} onClick={showSoon}>
          matupix
        </button>
        <span>— 另一个工作室：</span>
        <button type="button" className={linkClass} onClick={showSoon}>
          3D积木搭建
        </button>
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm font-semibold leading-normal text-slate-400">关注我们</span>
        {SOCIALS.map((item) => (
          <button key={item.label} type="button" aria-label={item.label} className={iconButtonClass} onClick={showSoon}>
            {item.Icon ? <item.Icon /> : <span aria-hidden="true">{item.mark}</span>}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-4 w-full max-w-3xl border-t border-slate-200 pt-3">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1" aria-label="语言">
          {LANGUAGES.map((label) => (
            <button
              key={label}
              type="button"
              className={`${languageClass} ${label === '中文' ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
              onClick={showSoon}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 h-5">
        {hint ? (
          <p role="status" className="m-0 text-sm text-slate-500">
            即将开放
          </p>
        ) : null}
      </div>
    </footer>
  )
}
