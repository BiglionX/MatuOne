import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'

export const CANVAS_SIZES = [8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128] as const

export type CanvasSize = (typeof CANVAS_SIZES)[number]

export type PixelGrid = (string | null)[][]

export type PixelLayer = {
  id: string
  name: string
  visible: boolean
  opacity: number
  pixels: PixelGrid
}

type PixelCanvasProps = {
  layers: readonly PixelLayer[]
  size: CanvasSize
  zoom: number | 'fit'
  panX: number
  panY: number
  onPaint: (x: number, y: number) => void
  onStrokeStart: () => void
  onStrokeEnd: () => void
  onPanDelta: (dx: number, dy: number) => void
  onZoomStep: (direction: 1 | -1) => void
  onFitEdge: (edge: number) => void
  handMode?: boolean
  pointerMode?: 'stroke' | 'fill' | 'pick'
  onFill?: (x: number, y: number) => void
  onPick?: (x: number, y: number) => void
  showGrid?: boolean
  paintEnabled?: boolean
  cellNumbers?: readonly (readonly (number | null)[])[] | null
  wrongCells?: readonly (readonly boolean[])[] | null
}

const GRID_IMAGE =
  'linear-gradient(to right, transparent calc(100% - 1px), rgb(var(--ink-soft-rgb) / 0.16) 1px), linear-gradient(to bottom, transparent calc(100% - 1px), rgb(var(--ink-soft-rgb) / 0.16) 1px)'

function readFitEdge(el: HTMLElement) {
  const style = getComputedStyle(el)
  const padX = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight)
  const padY = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom)
  const width = el.clientWidth - (Number.isFinite(padX) ? padX : 0)
  const height = el.clientHeight - (Number.isFinite(padY) ? padY : 0)
  return Math.max(0, Math.min(width, height))
}

function cellFromEvent(event: { clientX: number; clientY: number }, canvas: HTMLCanvasElement | null, gridSize: number) {
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * gridSize)
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * gridSize)
  if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return null
  return { x, y }
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true
  if (target instanceof HTMLElement && target.isContentEditable) return true
  return Boolean(target.closest('button, a, input, textarea, select, [contenteditable="true"]'))
}

// 显示、导出、缩略图和播放共用这一张离屏画布，播放换帧时只改尺寸不新建。
let compositeBuffer: HTMLCanvasElement | null = null

function compositeBufferCanvas(size: number) {
  if (!compositeBuffer) compositeBuffer = document.createElement('canvas')
  if (compositeBuffer.width !== size) compositeBuffer.width = size
  if (compositeBuffer.height !== size) compositeBuffer.height = size
  return compositeBuffer
}

const DOM_MARK_LIMIT = 48

function paintCellMarks(
  canvas: HTMLCanvasElement,
  size: number,
  edge: number,
  cellNumbers: PixelCanvasProps['cellNumbers'],
  wrongCells: PixelCanvasProps['wrongCells'],
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const px = Math.max(1, Math.round(edge * dpr))
  if (canvas.width !== px) canvas.width = px
  if (canvas.height !== px) canvas.height = px
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, edge, edge)
  if (!cellNumbers && !wrongCells) return
  const cell = edge / size
  if (!(cell > 0)) return
  const fontSize = Math.max(8, cell * 0.4)
  const style = getComputedStyle(canvas)
  ctx.font = `700 ${fontSize}px ${style.fontFamily || 'sans-serif'}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = style.color
  ctx.strokeStyle = style.getPropertyValue('--danger').trim() || 'rgb(190, 64, 64)'
  ctx.lineWidth = 2
  for (let y = 0; y < size; y += 1) {
    const numbers = cellNumbers?.[y]
    const wrongs = wrongCells?.[y]
    for (let x = 0; x < size; x += 1) {
      const number = numbers?.[x]
      if (typeof number === 'number') ctx.fillText(String(number), (x + 0.5) * cell, (y + 0.5) * cell)
      if (wrongs?.[x] !== true) continue
      const radius = (cell - 4) / 2
      if (radius <= 0) continue
      ctx.beginPath()
      ctx.arc((x + 0.5) * cell, (y + 0.5) * cell, radius, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

export function paintLayers(ctx: CanvasRenderingContext2D, layers: readonly PixelLayer[], size: number) {
  const width = ctx.canvas.width
  const height = ctx.canvas.height
  ctx.clearRect(0, 0, width, height)
  const offscreen = compositeBufferCanvas(size)
  const off = offscreen.getContext('2d')
  if (!off) return
  ctx.imageSmoothingEnabled = false
  for (const layer of layers) {
    if (layer.visible === false) continue
    off.clearRect(0, 0, size, size)
    for (let y = 0; y < size; y += 1) {
      const row = layer.pixels[y]
      if (!row) continue
      for (let x = 0; x < size; x += 1) {
        const color = row[x]
        if (!color) continue
        off.fillStyle = color
        off.fillRect(x, y, 1, 1)
      }
    }
    ctx.globalAlpha = Math.min(1, Math.max(0, layer.opacity))
    ctx.drawImage(offscreen, 0, 0, width, height)
  }
  ctx.globalAlpha = 1
}

export function PixelCanvas({
  layers,
  size,
  zoom,
  panX,
  panY,
  onPaint,
  onStrokeStart,
  onStrokeEnd,
  onPanDelta,
  onZoomStep,
  onFitEdge,
  handMode = false,
  pointerMode = 'stroke',
  onFill,
  onPick,
  showGrid = true,
  paintEnabled = true,
  cellNumbers = null,
  wrongCells = null,
}: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const markRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const paintingRef = useRef(false)
  const paintPointerRef = useRef<number | null>(null)
  const lastCellRef = useRef<string | null>(null)
  const spaceRef = useRef(false)
  const pointerInsideRef = useRef(false)
  const leftDownRef = useRef(false)
  const lastPointerRef = useRef<{ pointerId: number; clientX: number; clientY: number } | null>(null)
  const scrollAnchorRef = useRef<{ x: number; y: number } | null>(null)
  const panningRef = useRef<{ pointerId: number; lastX: number; lastY: number; mode: 'space' | 'middle' | 'hand' } | null>(null)
  const [fitEdge, setFitEdge] = useState(0)
  const lastEdgeRef = useRef(-1)
  const onPaintRef = useRef(onPaint)
  const onStrokeStartRef = useRef(onStrokeStart)
  const onStrokeEndRef = useRef(onStrokeEnd)
  const onPanDeltaRef = useRef(onPanDelta)
  const onZoomStepRef = useRef(onZoomStep)
  const onFitEdgeRef = useRef(onFitEdge)
  const onFillRef = useRef(onFill)
  const onPickRef = useRef(onPick)
  onPaintRef.current = onPaint
  onStrokeStartRef.current = onStrokeStart
  onStrokeEndRef.current = onStrokeEnd
  onPanDeltaRef.current = onPanDelta
  onZoomStepRef.current = onZoomStep
  onFitEdgeRef.current = onFitEdge
  onFillRef.current = onFill
  onPickRef.current = onPick

  const zoomFactor = zoom === 'fit' ? 1 : zoom
  const displayEdge = fitEdge * zoomFactor
  const maxPan = zoomFactor <= 1 ? 0 : Math.max(0, (displayEdge - fitEdge) / 2)
  const viewPanX = Math.min(maxPan, Math.max(-maxPan, panX))
  const viewPanY = Math.min(maxPan, Math.max(-maxPan, panY))
  const gridStyle: CSSProperties = {
    backgroundImage: GRID_IMAGE,
    backgroundSize: `calc(100% / ${size}) calc(100% / ${size})`,
  }

  function finishStroke() {
    if (!paintingRef.current) return
    paintingRef.current = false
    paintPointerRef.current = null
    lastCellRef.current = null
    onStrokeEndRef.current()
  }

  function endPan() {
    const current = panningRef.current
    if (!current) return
    panningRef.current = null
    const el = viewportRef.current
    if (!el) return
    if (el.hasPointerCapture(current.pointerId)) {
      try {
        el.releasePointerCapture(current.pointerId)
      } catch {
        // 捕获已经释放时忽略。
      }
    }
    el.style.cursor = ''
  }

  function beginPan(pointerId: number, clientX: number, clientY: number, mode: 'space' | 'middle' | 'hand') {
    const el = viewportRef.current
    if (mode === 'space' && scrollAnchorRef.current) {
      const anchor = scrollAnchorRef.current
      scrollAnchorRef.current = null
      window.scrollTo(anchor.x, anchor.y)
    }
    if (el) {
      try {
        el.setPointerCapture(pointerId)
      } catch {
        // 指针尚未按下时捕获会失败，平移仍继续。
      }
      el.style.cursor = 'grabbing'
    }
    panningRef.current = { pointerId, lastX: clientX, lastY: clientY, mode }
  }

  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const measure = () => {
      const edge = readFitEdge(el)
      if (edge === lastEdgeRef.current) return
      lastEdgeRef.current = edge
      setFitEdge(edge)
      onFitEdgeRef.current(edge)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return
      event.preventDefault()
      onZoomStepRef.current(event.deltaY < 0 ? 1 : -1)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space') return
      if (isInteractiveTarget(event.target)) return
      if (!event.repeat) {
        spaceRef.current = true
        if (pointerInsideRef.current && !leftDownRef.current) {
          scrollAnchorRef.current = { x: window.scrollX, y: window.scrollY }
        }
      }
      const draggingLeft = pointerInsideRef.current && leftDownRef.current
      const panMode = panningRef.current?.mode
      if (draggingLeft && panMode !== 'space' && panMode !== 'hand') {
        if (paintingRef.current) finishStroke()
        const last = lastPointerRef.current
        if (last) beginPan(last.pointerId, last.clientX, last.clientY, 'space')
      }
      if (draggingLeft || panningRef.current?.mode === 'space') event.preventDefault()
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code !== 'Space') return
      spaceRef.current = false
      scrollAnchorRef.current = null
      if (panningRef.current?.mode === 'space') endPan()
    }
    function onBlur() {
      spaceRef.current = false
      scrollAnchorRef.current = null
      if (panningRef.current?.mode === 'space') endPan()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (canvas.width !== size) canvas.width = size
    if (canvas.height !== size) canvas.height = size
    paintLayers(ctx, layers, size)
  }, [layers, size])

  useLayoutEffect(() => {
    if (size <= DOM_MARK_LIMIT) return
    const canvas = markRef.current
    if (!canvas || displayEdge <= 0) return
    paintCellMarks(canvas, size, displayEdge, cellNumbers, wrongCells)
  }, [cellNumbers, displayEdge, size, wrongCells])

  function paintCell(cell: { x: number; y: number }) {
    const key = `${cell.x},${cell.y}`
    if (lastCellRef.current === key) return
    lastCellRef.current = key
    onPaintRef.current(cell.x, cell.y)
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    pointerInsideRef.current = true
    lastPointerRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY }
    if (event.pointerType !== 'touch' && event.button === 1) {
      event.preventDefault()
      if (paintingRef.current) finishStroke()
      beginPan(event.pointerId, event.clientX, event.clientY, 'middle')
      return
    }
    if (event.button !== 0) return
    if (event.pointerType !== 'touch') leftDownRef.current = true
    if (handMode) {
      if (paintingRef.current) finishStroke()
      beginPan(event.pointerId, event.clientX, event.clientY, 'hand')
      return
    }
    if (event.pointerType !== 'touch' && spaceRef.current) {
      if (paintingRef.current) finishStroke()
      beginPan(event.pointerId, event.clientX, event.clientY, 'space')
      return
    }
    if (!paintEnabled) return
    const cell = cellFromEvent(event, canvasRef.current, size)
    if (!cell) return
    if (pointerMode === 'fill' || pointerMode === 'pick') {
      if (pointerMode === 'fill') onFillRef.current?.(cell.x, cell.y)
      else onPickRef.current?.(cell.x, cell.y)
      return
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // 指针尚未按下时捕获会失败，绘制仍继续。
    }
    onStrokeStartRef.current()
    paintingRef.current = true
    paintPointerRef.current = event.pointerId
    lastCellRef.current = null
    paintCell(cell)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    lastPointerRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY }
    const pan = panningRef.current
    if (pan && pan.pointerId === event.pointerId) {
      const dx = event.clientX - pan.lastX
      const dy = event.clientY - pan.lastY
      pan.lastX = event.clientX
      pan.lastY = event.clientY
      if (dx !== 0 || dy !== 0) onPanDeltaRef.current(dx, dy)
      return
    }
    if (handMode) {
      if (paintingRef.current && paintPointerRef.current === event.pointerId) finishStroke()
      return
    }
    if (!paintingRef.current || paintPointerRef.current !== event.pointerId) return
    if (spaceRef.current && event.pointerType !== 'touch') return
    const cell = cellFromEvent(event, canvasRef.current, size)
    if (!cell) return
    paintCell(cell)
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button === 0) leftDownRef.current = false
    if (panningRef.current?.pointerId === event.pointerId) endPan()
    if (paintingRef.current && paintPointerRef.current === event.pointerId) finishStroke()
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    leftDownRef.current = false
    if (panningRef.current?.pointerId === event.pointerId) endPan()
    if (paintingRef.current && paintPointerRef.current === event.pointerId) finishStroke()
  }

  function handleMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.button === 1) event.preventDefault()
  }

  return (
    <div
      ref={viewportRef}
      className={`relative aspect-square w-full max-w-full touch-none select-none overflow-hidden rounded-2xl border-[3px] border-ink bg-white${handMode ? ' cursor-grab' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerEnter={() => {
        pointerInsideRef.current = true
      }}
      onPointerLeave={() => {
        pointerInsideRef.current = false
      }}
      onMouseDown={handleMouseDown}
      onAuxClick={(event) => {
        if (event.button === 1) event.preventDefault()
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: displayEdge,
          height: displayEdge,
          transform: `translate(-50%, -50%) translate(${viewPanX}px, ${viewPanY}px)`,
        }}
      >
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          aria-label={`${size}乘${size}像素画布`}
          className="absolute inset-0 h-full w-full"
          style={{ imageRendering: 'pixelated' }}
        />
        {showGrid ? <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={gridStyle} /> : null}
        {cellNumbers || wrongCells ? (
          size <= DOM_MARK_LIMIT ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 grid"
              style={{
                gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
                fontSize: `${Math.max(8, (displayEdge / size) * 0.4)}px`,
              }}
            >
              {Array.from({ length: size * size }, (_, index) => {
                const x = index % size
                const y = Math.floor(index / size)
                const number = cellNumbers?.[y]?.[x]
                const wrong = wrongCells?.[y]?.[x] === true
                return (
                  <span key={index} className="relative flex items-center justify-center font-bold leading-none text-ink">
                    {typeof number === 'number' ? number : ''}
                    {wrong ? <span className="absolute inset-0.5 rounded-full border-2 border-danger" /> : null}
                  </span>
                )
              })}
            </div>
          ) : (
            <canvas ref={markRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full text-ink" />
          )
        ) : null}
      </div>
    </div>
  )
}
