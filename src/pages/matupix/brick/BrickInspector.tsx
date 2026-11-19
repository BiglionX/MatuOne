import { useEffect, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { BRICK_PALETTE, brickColorName } from './brickTypes'

export type BrickLook = 'oblique' | 'top' | 'side' | 'front'

type BrickInspectorProps = {
  color: string
  count: number
  colorCount: number
  height: number
  onSelectColor: (color: string) => void
  onLook: (view: BrickLook) => void
  onZoomIn: () => void
  onZoomOut: () => void
}

type Hsl = { h: number; s: number; l: number }

const RING_RADIUS = 0.8

type TipState = { id: string; label: string; left: number; top: number }

const STATS = [
  { key: 'count', label: '零件', tone: 'bg-[#FDE8E8]' },
  { key: 'colors', label: '颜色', tone: 'bg-[#E5F0FF]' },
  { key: 'height', label: '高度', tone: 'bg-[#E5F7EA]' },
] as const

const VIEWS: { id: string; label: string; look?: BrickLook; zoom?: 'in' | 'out' }[] = [
  { id: 'oblique', label: '斜视', look: 'oblique' },
  { id: 'top', label: '俯视', look: 'top' },
  { id: 'side', label: '侧视', look: 'side' },
  { id: 'front', label: '正视', look: 'front' },
  { id: 'out', label: '缩小', zoom: 'out' },
  { id: 'in', label: '放大', zoom: 'in' },
]

function formatStat(key: (typeof STATS)[number]['key'], value: number) {
  if (key === 'height') return value > 0 ? value.toFixed(1) : '0'
  return String(value)
}

function isPresetColor(color: string) {
  const key = color.trim().toLowerCase()
  return BRICK_PALETTE.some((item) => item.hex.toLowerCase() === key)
}

function hslToRgb(h: number, s: number, l: number) {
  const hue = ((h % 360) + 360) % 360
  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const hp = hue / 60
  const x = chroma * (1 - Math.abs((hp % 2) - 1))
  let r = 0
  let g = 0
  let b = 0
  if (hp < 1) {
    r = chroma
    g = x
  } else if (hp < 2) {
    r = x
    g = chroma
  } else if (hp < 3) {
    g = chroma
    b = x
  } else if (hp < 4) {
    g = x
    b = chroma
  } else if (hp < 5) {
    r = x
    b = chroma
  } else {
    r = chroma
    b = x
  }
  const m = l - chroma / 2
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

function hslToHex(h: number, s: number, l: number) {
  const { r, g, b } = hslToRgb(h, s, l)
  const channel = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0')
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase()
}

function hexToHsl(color: string): Hsl {
  const raw = color.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return { h: 0, s: 1, l: 0.5 }
  const r = parseInt(raw.slice(0, 2), 16) / 255
  const g = parseInt(raw.slice(2, 4), 16) / 255
  const b = parseInt(raw.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { h: 0, s: 0, l }
  const s = delta / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (max === r) h = ((g - b) / delta) % 6
  else if (max === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s, l }
}

function hueFromPointer(event: ReactPointerEvent<HTMLDivElement>) {
  const rect = event.currentTarget.getBoundingClientRect()
  const dx = ((event.clientX - rect.left) / rect.width) * 2 - 1
  const dy = ((event.clientY - rect.top) / rect.height) * 2 - 1
  if (Math.hypot(dx, dy) > 1.04) return null
  return (Math.atan2(dx, -dy) * 180) / Math.PI
}

function ThickDash() {
  return (
    <div
      aria-hidden="true"
      data-separator="thick-dash"
      className="w-full shrink-0 border-t-2 border-dashed border-[#C5CED6]"
    />
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-2xl px-1 py-2.5 text-center ${tone}`}>
      <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] font-medium leading-4 text-ink-soft">{label}</p>
    </div>
  )
}

function TipBubble({ label, left, top }: { label: string; left: number; top: number }) {
  return createPortal(
    <span
      role="tooltip"
      className="pointer-events-none fixed z-[90] -translate-x-1/2 -translate-y-full"
      style={{ left, top: top - 8 }}
    >
      <span className="relative block whitespace-nowrap rounded-md bg-[#243038] px-2 py-1 text-[11px] font-semibold leading-none text-white shadow-[0_4px_12px_rgba(20,30,40,0.18)]">
        {label}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-[#243038]" />
      </span>
    </span>,
    document.body,
  )
}

function ViewGlyph({ id }: { id: string }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 16,
    height: 16,
    'aria-hidden': true as const,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (id === 'oblique') {
    return (
      <svg {...common}>
        <path d="M7 17 17 7" />
        <path d="M9 7h8v8" />
      </svg>
    )
  }
  if (id === 'top') {
    return (
      <svg {...common}>
        <path d="M12 5v13" />
        <path d="m7 13 5 5 5-5" />
      </svg>
    )
  }
  if (id === 'side') {
    return (
      <svg {...common}>
        <path d="M7 5v14" />
        <path d="M11 12h7" />
        <path d="m15 8 4 4-4 4" />
      </svg>
    )
  }
  if (id === 'front') {
    return (
      <svg {...common}>
        <path d="M12 19V6" />
        <path d="m7 11 5-5 5 5" />
      </svg>
    )
  }
  if (id === 'out') {
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="6" />
        <path d="m20 20-4.2-4.2" />
        <path d="M7.5 10h5" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="10" cy="10" r="6" />
      <path d="m20 20-4.2-4.2" />
      <path d="M10 7.5v5" />
      <path d="M7.5 10h5" />
    </svg>
  )
}

function WheelIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 2.2a5.8 5.8 0 0 1 4.7 8.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8" cy="8" r="1.35" fill="currentColor" />
    </svg>
  )
}

function HueWheel({ hsl, showMarker, color, onPick }: { hsl: Hsl; showMarker: boolean; color: string; onPick: (next: Hsl) => void }) {
  const point = {
    left: `${50 + Math.sin((hsl.h * Math.PI) / 180) * RING_RADIUS * 50}%`,
    top: `${50 - Math.cos((hsl.h * Math.PI) / 180) * RING_RADIUS * 50}%`,
  }
  const vivid = hslToHex(hsl.h, 1, 0.5)

  function pick(event: ReactPointerEvent<HTMLDivElement>) {
    const hue = hueFromPointer(event)
    if (hue === null) return
    const lightness = hsl.l <= 0.02 || hsl.l >= 0.98 ? 0.5 : hsl.l
    onPick({ h: (hue + 360) % 360, s: 1, l: lightness })
  }

  return (
    <div className="mt-2 rounded-[18px] border border-[#E6ECF2] bg-white px-3 pb-3 pt-3 shadow-[0_6px_16px_rgba(30,42,48,0.05)]">
      <div className="relative mx-auto h-[148px] w-[148px]">
        <div
          aria-label="色相环"
          className="h-full w-full cursor-crosshair touch-none rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
            WebkitMaskImage: 'radial-gradient(circle closest-side, transparent 56%, #000 60% 96%, transparent 100%)',
            maskImage: 'radial-gradient(circle closest-side, transparent 56%, #000 60% 96%, transparent 100%)',
          }}
          onPointerDown={(event) => {
            pick(event)
            try {
              event.currentTarget.setPointerCapture(event.pointerId)
            } catch {
              // 没有活动指针时仍然保留这一下取色。
            }
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
            pick(event)
          }}
        />
        {showMarker ? (
          <span
            data-hue-marker="true"
            className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
            style={{ left: point.left, top: point.top, backgroundColor: color }}
          />
        ) : null}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <label htmlFor="brick-lightness" className="shrink-0 text-xs font-semibold text-ink-soft">
          明度
        </label>
        <div className="relative flex h-4 min-w-0 flex-1 items-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 h-2 rounded-full"
            style={{ backgroundImage: `linear-gradient(90deg, #1c1c1c, ${vivid}, #ffffff)` }}
          />
          <input
            id="brick-lightness"
            type="range"
            min={0}
            max={100}
            step={1}
            aria-label="明度"
            value={Math.round(hsl.l * 100)}
            onChange={(event) => onPick({ h: hsl.h, s: hsl.s < 0.04 ? 1 : hsl.s, l: Number(event.target.value) / 100 })}
            className="relative z-[1] h-4 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[var(--art-purple)] [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[var(--art-purple)] [&::-webkit-slider-thumb]:shadow"
          />
        </div>
      </div>
    </div>
  )
}

export function BrickInspector({ color, count, colorCount, height, onSelectColor, onLook, onZoomIn, onZoomOut }: BrickInspectorProps) {
  const values = { count, colors: colorCount, height }
  const [wheelOpen, setWheelOpen] = useState(false)
  const [hsl, setHsl] = useState<Hsl>(() => hexToHsl(color))
  const [tip, setTip] = useState<TipState | null>(null)
  const preset = isPresetColor(color)

  useEffect(() => {
    if (preset) setHsl(hexToHsl(color))
  }, [color, preset])

  function applyHsl(next: Hsl) {
    setHsl(next)
    onSelectColor(hslToHex(next.h, next.s, next.l))
  }

  function showTip(id: string, label: string, node: HTMLElement) {
    const rect = node.getBoundingClientRect()
    setTip({ id, label, left: rect.left + rect.width / 2, top: rect.top })
  }

  return (
    <div className="flex flex-col gap-2.5">
      <ThickDash />
      <section aria-label="颜色">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold">颜色</h2>
          <p className="text-xs font-semibold text-ink-soft">{brickColorName(color)}</p>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5" role="group" aria-label="颜色">
          {BRICK_PALETTE.map((swatch) => {
            const active = swatch.hex.toLowerCase() === color.trim().toLowerCase()
            return (
              <button
                key={swatch.hex}
                type="button"
                aria-pressed={active}
                aria-label={swatch.name}
                onClick={() => onSelectColor(swatch.hex)}
                className={`h-7 w-7 shrink-0 rounded-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--art-purple)] focus-visible:ring-offset-2 ${
                  active ? 'ring-[3px] ring-[#1E2A30] ring-offset-1' : 'ring-1 ring-black/15'
                }`}
                style={{ backgroundColor: swatch.hex }}
              />
            )
          })}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div
            className="h-[10px] w-11 rounded-[4px] ring-1 ring-inset ring-black/10"
            style={{ backgroundColor: color }}
            data-color-bar={color}
            aria-hidden="true"
          />
          <button
            type="button"
            aria-pressed={wheelOpen}
            aria-expanded={wheelOpen}
            onClick={() => setWheelOpen((open) => !open)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--art-purple)] focus-visible:ring-offset-2 ${
              wheelOpen ? 'translate-y-[2px]' : ''
            }`}
            style={
              wheelOpen
                ? {
                    background: 'linear-gradient(180deg, color-mix(in srgb, var(--art-purple) 78%, black), color-mix(in srgb, var(--art-purple) 55%, black))',
                    boxShadow: 'inset 0 2px 0 rgb(40 16 70 / 0.35)',
                  }
                : {
                    background: 'linear-gradient(180deg, color-mix(in srgb, var(--art-purple) 78%, white), var(--art-purple))',
                    boxShadow: '0 3px 0 color-mix(in srgb, var(--art-purple) 42%, black)',
                  }
            }
          >
            <WheelIcon />
            色环
          </button>
        </div>
        {wheelOpen ? <HueWheel hsl={hsl} showMarker={!preset} color={color} onPick={applyHsl} /> : null}
      </section>
      <ThickDash />
      <div className="grid grid-cols-6 gap-0.5 overflow-visible rounded-[22px] bg-[#F2F5F9] p-1" role="group" aria-label="视角">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-view-button={item.id}
            aria-label={item.label}
            onMouseEnter={(event) => showTip(item.id, item.label, event.currentTarget)}
            onMouseLeave={() => setTip((current) => (current?.id === item.id ? null : current))}
            onFocus={(event) => showTip(item.id, item.label, event.currentTarget)}
            onBlur={() => setTip((current) => (current?.id === item.id ? null : current))}
            onClick={() => {
              if (item.look) onLook(item.look)
              else if (item.zoom === 'in') onZoomIn()
              else onZoomOut()
            }}
            className="inline-flex h-8 w-full min-w-0 items-center justify-center rounded-xl bg-white/90 text-[#6D7E92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--art-purple)]"
          >
            <ViewGlyph id={item.id} />
          </button>
        ))}
      </div>
      {tip ? <TipBubble label={tip.label} left={tip.left} top={tip.top} /> : null}
      <ThickDash />
      <section className="grid grid-cols-3 gap-2" aria-label="统计">
        {STATS.map((item) => (
          <Stat key={item.key} label={item.label} value={formatStat(item.key, values[item.key])} tone={item.tone} />
        ))}
      </section>
    </div>
  )
}
