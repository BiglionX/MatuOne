import { useEffect, useRef } from 'react'
import type { CanvasCommand, RunCursor } from '@/types'

interface Frame {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const COLOR_ALIAS: Record<string, string> = {
  brand: 'var(--brand)',
  teal: 'var(--brand)',
  orange: 'var(--warning)',
  red: 'var(--danger)',
  green: 'var(--success)',
  blue: 'var(--art-blue)',
  purple: 'var(--art-purple)',
  yellow: 'var(--art-yellow)',
  black: 'var(--ink)',
  white: 'var(--art-white)',
}

const colorCache = new Map<string, string>()

function cssColor(name: string): string {
  const key = name.trim().toLowerCase()
  const cached = colorCache.get(key)
  if (cached) return cached
  const alias = COLOR_ALIAS[key] ?? name
  let resolved = alias
  if (alias.startsWith('var(') || alias.startsWith('#')) {
    const probe = document.createElement('span')
    probe.style.color = alias
    document.body.appendChild(probe)
    resolved = getComputedStyle(probe).color || '#1e2a2e'
    probe.remove()
  }
  colorCache.set(key, resolved)
  return resolved
}

function commandBounds(commands: CanvasCommand[], cursor: RunCursor | undefined): Frame {
  let minX = 0
  let minY = 0
  let maxX = 0
  let maxY = 0
  let seen = false
  for (const command of commands) {
    if (command.action !== 'line') continue
    seen = true
    minX = Math.min(minX, command.x1, command.x2)
    minY = Math.min(minY, command.y1, command.y2)
    maxX = Math.max(maxX, command.x1, command.x2)
    maxY = Math.max(maxY, command.y1, command.y2)
  }
  if (cursor) {
    seen = true
    minX = Math.min(minX, cursor.x)
    minY = Math.min(minY, cursor.y)
    maxX = Math.max(maxX, cursor.x)
    maxY = Math.max(maxY, cursor.y)
  }
  if (!seen || (maxX - minX < 1 && maxY - minY < 1)) {
    return { minX: minX - 50, minY: minY - 50, maxX: maxX + 50, maxY: maxY + 50 }
  }
  return { minX, minY, maxX, maxY }
}

/** 线段自己的范围。有锁定框时，框外的大图会把框撑开，避免被裁掉。 */
function viewBounds(commands: CanvasCommand[], cursor: RunCursor | undefined, frame: Frame | undefined): Frame {
  const drawn = commandBounds(commands, cursor)
  if (!frame) {
    const span = Math.max(drawn.maxX - drawn.minX, drawn.maxY - drawn.minY, 1)
    const pad = span * 0.08
    return {
      minX: drawn.minX - pad,
      minY: drawn.minY - pad,
      maxX: drawn.maxX + pad,
      maxY: drawn.maxY + pad,
    }
  }
  return {
    minX: Math.min(frame.minX, drawn.minX),
    minY: Math.min(frame.minY, drawn.minY),
    maxX: Math.max(frame.maxX, drawn.maxX),
    maxY: Math.max(frame.maxY, drawn.maxY),
  }
}

/** 用 Canvas 2D 把海龟交回的线段画出来。坐标系 y 朝上。 */
export function CanvasPreview({
  commands,
  frame,
  cursor,
  className = '',
  placeholder = '这条代码还没有画出线来',
}: {
  commands: CanvasCommand[]
  frame?: Frame
  cursor?: RunCursor
  className?: string
  placeholder?: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const draw = () => {
      const width = wrap.clientWidth
      const height = wrap.clientHeight
      if (width < 2 || height < 2) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)

      const bounds = viewBounds(commands, cursor, frame)
      const worldW = Math.max(1, bounds.maxX - bounds.minX)
      const worldH = Math.max(1, bounds.maxY - bounds.minY)
      const scale = Math.min(width / worldW, height / worldH)
      const originX = (width - worldW * scale) / 2
      const originY = (height - worldH * scale) / 2

      ctx.save()
      ctx.translate(originX - bounds.minX * scale, originY + bounds.maxY * scale)
      ctx.scale(scale, -scale)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (const command of commands) {
        if (command.action !== 'line') continue
        ctx.beginPath()
        ctx.moveTo(command.x1, command.y1)
        ctx.lineTo(command.x2, command.y2)
        ctx.strokeStyle = cssColor(command.color)
        ctx.lineWidth = Math.max(2, command.pensize * 2) / scale
        ctx.stroke()
      }

      if (cursor) {
        ctx.beginPath()
        ctx.arc(cursor.x, cursor.y, Math.max(4, Math.min(width, height) * 0.02) / scale, 0, Math.PI * 2)
        ctx.fillStyle = cssColor('purple')
        ctx.fill()
      }
      ctx.restore()
    }

    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [commands, frame, cursor])

  return (
    <div ref={wrapRef} className={`relative min-h-0 flex-1 bg-white ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label="程序运行结果" />
      {commands.length === 0 && !cursor && (
        <div className="absolute inset-0 flex items-center justify-center text-ink-soft">{placeholder}</div>
      )}
    </div>
  )
}
