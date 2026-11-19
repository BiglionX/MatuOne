import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CANVAS_SIZES, type CanvasSize } from './PixelCanvas'

export type DrawTool = 'brush' | 'eraser' | 'fill' | 'eyedropper'

type HistoryControlsProps = {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

type DrawToolControlsProps = {
  tool: DrawTool
  onChange: (tool: DrawTool) => void
  suppressToolPress?: boolean
  showGrid: boolean
  onToggleGrid: () => void
  brushSize: 1 | 2
  onToggleBrushSize: () => void
}

type CanvasSizeSelectProps = {
  size: CanvasSize
  onSelectSize: (size: CanvasSize) => void
}

type ZoomControlsProps = {
  zoomLabel: string
  canZoomOut: boolean
  canZoomIn: boolean
  handActive: boolean
  onToggleHand: () => void
  onZoomOut: () => void
  onZoomIn: () => void
  onResetView: () => void
}

const drawTools: { id: 'brush'; label: string }[] = [{ id: 'brush', label: '画笔' }]

const editTools: { id: 'fill' | 'eyedropper'; label: string }[] = [
  { id: 'fill', label: '填充' },
  { id: 'eyedropper', label: '取色' },
]

const plump =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 text-base font-extrabold tracking-[0.2px] shadow-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

const viewButtonBase =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 bg-white text-slate-700 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2'

function ToolIcon({ children }: { children: ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4 shrink-0">
      {children}
    </svg>
  )
}

function UndoIcon() {
  return (
    <ToolIcon>
      <path d="M6.25 3.25 2.75 6.75 6.25 10.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.25 6.75H9.5a3.25 3.25 0 0 1 0 6.5H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </ToolIcon>
  )
}

function RedoIcon() {
  return (
    <ToolIcon>
      <path d="M9.75 3.25 13.25 6.75 9.75 10.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.75 6.75H6.5a3.25 3.25 0 0 0 0 6.5H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </ToolIcon>
  )
}

function BrushIcon() {
  return (
    <ToolIcon>
      <path d="M9.2 2.6 13.4 6.8 6.6 13.6H2.4v-4.2L9.2 2.6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7.6 4.2 11.8 8.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </ToolIcon>
  )
}

function EraserIcon() {
  return (
    <ToolIcon>
      <path d="M6.2 13.4 2.6 9.8a1.4 1.4 0 0 1 0-2L7.8 2.6a1.4 1.4 0 0 1 2 0l3.6 3.6a1.4 1.4 0 0 1 0 2L9.2 12.4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M2.2 13.4h11.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5.4 8.2 9 11.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </ToolIcon>
  )
}

function FillIcon() {
  return (
    <ToolIcon>
      <path d="M8.8 2.4 13.2 6.8 7.6 12.4a2.2 2.2 0 0 1-3.1 0l-.9-.9a2.2 2.2 0 0 1 0-3.1L8.8 2.4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6.8 4.4 11.2 8.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.4 11.2c.5.7 1.3 1.1 2.2 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </ToolIcon>
  )
}

function EyedropperIcon() {
  return (
    <ToolIcon>
      <path d="M10.3 2.2 13.8 5.7 6.5 13H3v-3.5L10.3 2.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8.4 4.1 11.9 7.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </ToolIcon>
  )
}

function HandIcon() {
  return (
    <ToolIcon>
      <path
        d="M6.2 7.4V4.1a.85.85 0 0 1 1.7 0v3.5M7.9 6.8V3a.85.85 0 0 1 1.7 0v4.2M9.6 7.1V4.5a.85.85 0 0 1 1.7 0V9c0 2.2-1.2 3.7-3.3 3.7h-.6c-1.6 0-2.7-.85-3.2-2L3.5 8.6a.8.8 0 0 1 1.4-.75l.5.75V5.2a.85.85 0 0 1 1.7 0v2.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </ToolIcon>
  )
}

function GridIcon() {
  return (
    <ToolIcon>
      <rect x="2.25" y="2.25" width="11.5" height="11.5" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 2.25v11.5M2.25 8h11.5" stroke="currentColor" strokeWidth="1.5" />
    </ToolIcon>
  )
}

function MinusIcon() {
  return (
    <ToolIcon>
      <path d="M3.5 8h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </ToolIcon>
  )
}

function PlusIcon() {
  return (
    <ToolIcon>
      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </ToolIcon>
  )
}

function ResetIcon() {
  return (
    <ToolIcon>
      <path d="M12.6 6.1A4.7 4.7 0 1 0 13.2 9.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12.6 3.1v3.2H9.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </ToolIcon>
  )
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 text-slate-500">
      <path d="M4 6.2 8 10.2 12 6.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BrushSizeIcon({ size }: { size: 1 | 2 }) {
  if (size === 1) {
    return (
      <ToolIcon>
        <rect x="5.25" y="5.25" width="5.5" height="5.5" rx="0.8" stroke="currentColor" strokeWidth="1.5" />
      </ToolIcon>
    )
  }
  return (
    <ToolIcon>
      <rect x="2.4" y="2.4" width="4.6" height="4.6" rx="0.6" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="2.4" width="4.6" height="4.6" rx="0.6" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2.4" y="9" width="4.6" height="4.6" rx="0.6" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="9" width="4.6" height="4.6" rx="0.6" stroke="currentColor" strokeWidth="1.4" />
    </ToolIcon>
  )
}

const toolIcons: Record<DrawTool, ReactNode> = {
  brush: <BrushIcon />,
  eraser: <EraserIcon />,
  fill: <FillIcon />,
  eyedropper: <EyedropperIcon />,
}

function toolClass(selected: boolean) {
  return `inline-flex h-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border-2 bg-white px-1.5 text-sm font-semibold text-slate-700 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
    selected ? 'border-slate-800' : 'border-slate-200 hover:border-slate-300'
  }`
}

function viewButton(selected: boolean, enabled = true) {
  return `${viewButtonBase} ${selected ? 'border-slate-800' : 'border-slate-200 hover:border-slate-300'} ${
    enabled ? '' : 'cursor-not-allowed opacity-40'
  }`
}

function HistoryButton({
  label,
  enabled,
  onClick,
  icon,
  tone,
}: {
  label: string
  enabled: boolean
  onClick: () => void
  icon: ReactNode
  tone: 'undo' | 'redo'
}) {
  const toneClass =
    tone === 'undo'
      ? 'bg-sky-500 text-white focus-visible:ring-sky-700'
      : 'bg-sky-200 text-sky-950 focus-visible:ring-sky-400'
  return (
    <button
      type="button"
      aria-disabled={enabled ? undefined : true}
      onClick={onClick}
      className={`${plump} ${toneClass} ${enabled ? '' : 'cursor-not-allowed opacity-80'}`}
    >
      {icon}
      {label}
    </button>
  )
}

export function HistoryControls({ canUndo, canRedo, onUndo, onRedo }: HistoryControlsProps) {
  return (
    <>
      <HistoryButton label="撤销" tone="undo" enabled={canUndo} onClick={onUndo} icon={<UndoIcon />} />
      <HistoryButton label="重做" tone="redo" enabled={canRedo} onClick={onRedo} icon={<RedoIcon />} />
    </>
  )
}

export function EraserButton({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`${plump} bg-pink-500 text-white focus-visible:ring-pink-700 ${selected ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
    >
      <EraserIcon />
      橡皮
    </button>
  )
}

export function DrawToolControls({
  tool,
  onChange,
  suppressToolPress = false,
  showGrid,
  onToggleGrid,
  brushSize,
  onToggleBrushSize,
}: DrawToolControlsProps) {
  return (
    <div className="contents" role="group" aria-label="绘图工具">
      {drawTools.map((item) => {
        const selected = !suppressToolPress && tool === item.id
        return (
          <button key={item.id} type="button" aria-pressed={selected} onClick={() => onChange(item.id)} className={toolClass(selected)}>
            {toolIcons[item.id]}
            {item.label}
          </button>
        )
      })}
      {editTools.map((item) => {
        const selected = !suppressToolPress && tool === item.id
        return (
          <button key={item.id} type="button" aria-pressed={selected} onClick={() => onChange(item.id)} className={toolClass(selected)}>
            {toolIcons[item.id]}
            {item.label}
          </button>
        )
      })}
      <button type="button" aria-pressed={showGrid} onClick={onToggleGrid} className={toolClass(showGrid)}>
        <GridIcon />
        网格
      </button>
      <button type="button" aria-pressed={brushSize === 2} onClick={onToggleBrushSize} className={toolClass(brushSize === 2)}>
        <BrushSizeIcon size={brushSize} />
        笔触
      </button>
    </div>
  )
}

export function CanvasSizeSelect({ size, onSelectSize }: CanvasSizeSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const root = rootRef.current
    root?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })

    function onPointerDown(event: PointerEvent) {
      if (!root?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="inline-flex items-center gap-1">
      <span className="text-[15px] font-semibold leading-normal text-slate-600">网格大小</span>
      <div ref={rootRef} className={open ? 'relative z-30' : 'relative'}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`网格大小 ${size} × ${size}`}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 text-[15px] font-semibold leading-normal text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        >
          {size} × {size}
          <ChevronIcon />
        </button>
        {open ? (
          <ul
            role="listbox"
            aria-label="网格大小"
            className="absolute left-0 z-30 mt-1.5 max-h-72 w-full min-w-[7.75rem] overflow-auto rounded-2xl bg-orange-50 p-1.5 shadow-lg ring-1 ring-orange-100"
          >
            {CANVAS_SIZES.map((item) => {
              const selected = item === size
              return (
                <li key={item} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onSelectSize(item)
                      setOpen(false)
                    }}
                    className={`w-full rounded-lg px-3 py-1.5 text-left text-[15px] leading-normal ${
                      selected ? 'bg-neutral-600 font-medium text-white' : 'font-medium text-neutral-800 hover:bg-orange-100'
                    }`}
                  >
                    {item} × {item}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

export function ZoomControls({
  zoomLabel,
  canZoomOut,
  canZoomIn,
  handActive,
  onToggleHand,
  onZoomOut,
  onZoomIn,
  onResetView,
}: ZoomControlsProps) {
  return (
    <div className="contents">
      <button type="button" aria-label="手形" aria-pressed={handActive} onClick={onToggleHand} className={viewButton(handActive)}>
        <HandIcon />
      </button>
      <button
        type="button"
        aria-label="缩小"
        aria-disabled={canZoomOut ? undefined : true}
        onClick={() => {
          if (!canZoomOut) return
          onZoomOut()
        }}
        className={viewButton(false, canZoomOut)}
      >
        <MinusIcon />
      </button>
      <button type="button" aria-label="重置" onClick={onResetView} className={viewButton(false)}>
        <ResetIcon />
      </button>
      <button
        type="button"
        aria-label="放大"
        aria-disabled={canZoomIn ? undefined : true}
        onClick={() => {
          if (!canZoomIn) return
          onZoomIn()
        }}
        className={viewButton(false, canZoomIn)}
      >
        <PlusIcon />
      </button>
      <span className="sr-only" aria-live="polite">
        {zoomLabel}
      </span>
      <span className="text-sm font-semibold text-slate-400">滚轮缩放，小手拖动</span>
    </div>
  )
}
