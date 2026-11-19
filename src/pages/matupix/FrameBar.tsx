import { useEffect, useRef } from 'react'
import { paintLayers, type PixelLayer } from './PixelCanvas'

type FrameBarProps = {
  frames: readonly { layers: readonly PixelLayer[] }[]
  highlight: number
  size: number
  playing: boolean
  onSelect: (index: number) => void
  onAdd: () => void
  onCopy: () => void
  onTogglePlay: () => void
  onSaveGif: () => void
}

const frameButton =
  'inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-line bg-white px-2 text-sm font-semibold text-slate-800 hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2'

function FrameThumb({ layers, size }: { layers: readonly PixelLayer[]; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    paintLayers(ctx, layers, size)
  }, [layers, size])

  return (
    <canvas
      ref={ref}
      width={32}
      height={32}
      aria-hidden="true"
      className="h-8 w-8 bg-white"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

export function FrameBar({ frames, highlight, size, playing, onSelect, onAdd, onCopy, onTogglePlay, onSaveGif }: FrameBarProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1" aria-label="帧">
      <div className="flex min-w-0 gap-1 overflow-x-auto">
        <button type="button" onClick={onAdd} className={frameButton}>
          再画一张
        </button>
        <button type="button" onClick={onCopy} className={frameButton}>
          照着这张再画一张
        </button>
        <button
          type="button"
          aria-pressed={playing}
          onClick={onTogglePlay}
          className={playing ? `${frameButton} border-transparent bg-brand-action text-white hover:border-transparent` : frameButton}
        >
          {playing ? '停止' : '放映'}
        </button>
        {frames.length >= 2 ? (
          <button type="button" onClick={onSaveGif} className={frameButton}>
            保存动画
          </button>
        ) : null}
      </div>
      <div className="flex min-w-0 gap-1 overflow-x-auto" role="listbox" aria-label="帧列表">
        {frames.map((frame, index) => {
          const selected = index === highlight
          return (
            <button
              key={frame.layers.map((layer) => layer.id).join('|') || String(index)}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={`第 ${index + 1} 帧`}
              onClick={() => onSelect(index)}
              className={`relative h-8 w-8 shrink-0 overflow-hidden rounded bg-white ${
                selected ? 'ring-2 ring-inset ring-brand-action' : 'ring-1 ring-inset ring-line'
              }`}
            >
              <FrameThumb layers={frame.layers} size={size} />
              <span className="pointer-events-none absolute left-0 top-0 bg-white/90 px-0.5 text-xs font-semibold leading-none text-slate-900">
                {index + 1}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
