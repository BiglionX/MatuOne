import { useLayoutEffect, useRef, useState } from 'react'
import { COLORS } from './Palette'
import type { PixelGrid } from './PixelCanvas'

const SAMPLE_CAP = 512

type PhotoToPixelProps = {
  gridSize: number
  confirming: boolean
  onGenerate: (pixels: PixelGrid) => boolean
  onDismissConfirm: () => void
}

const PALETTE = COLORS.map((item) => {
  const value = Number.parseInt(item.hex.slice(1), 16)
  return {
    hex: item.hex,
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
})

function nearestHex(r: number, g: number, b: number) {
  let best = PALETTE[0]
  let bestDist = Number.POSITIVE_INFINITY
  if (!best) return '#FFFFFF'
  for (const swatch of PALETTE) {
    const dr = r - swatch.r
    const dg = g - swatch.g
    const db = b - swatch.b
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) {
      best = swatch
      bestDist = dist
    }
  }
  return best.hex
}

function quantize(source: HTMLCanvasElement, size: number): PixelGrid {
  const ctx = source.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas')
  const width = source.width
  const height = source.height
  const data = ctx.getImageData(0, 0, width, height).data
  const grid: PixelGrid = []
  for (let y = 0; y < size; y += 1) {
    const y0 = Math.floor((y * height) / size)
    const y1 = Math.min(height, Math.max(y0 + 1, Math.floor(((y + 1) * height) / size)))
    const row: (string | null)[] = []
    for (let x = 0; x < size; x += 1) {
      const x0 = Math.floor((x * width) / size)
      const x1 = Math.min(width, Math.max(x0 + 1, Math.floor(((x + 1) * width) / size)))
      let red = 0
      let green = 0
      let blue = 0
      let count = 0
      for (let py = y0; py < y1; py += 1) {
        for (let px = x0; px < x1; px += 1) {
          const index = (py * width + px) * 4
          red += data[index] ?? 0
          green += data[index + 1] ?? 0
          blue += data[index + 2] ?? 0
          count += 1
        }
      }
      const safe = count > 0 ? count : 1
      row.push(nearestHex(Math.round(red / safe), Math.round(green / safe), Math.round(blue / safe)))
    }
    grid.push(row)
  }
  return grid
}

function readSquare(file: File) {
  const url = URL.createObjectURL(file)
  return new Promise<HTMLCanvasElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      const width = image.naturalWidth
      const height = image.naturalHeight
      if (!width || !height) {
        reject(new Error('image'))
        return
      }
      const side = Math.min(width, height)
      const sx = Math.floor((width - side) / 2)
      const sy = Math.floor((height - side) / 2)
      const out = Math.min(SAMPLE_CAP, side)
      const canvas = document.createElement('canvas')
      canvas.width = out
      canvas.height = out
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        reject(new Error('canvas'))
        return
      }
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, out, out)
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(image, sx, sy, side, side, 0, 0, out, out)
      resolve(canvas)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image'))
    }
    image.src = url
  })
}

export function PhotoToPixel({ gridSize, confirming, onGenerate, onDismissConfirm }: PhotoToPixelProps) {
  const [open, setOpen] = useState(false)
  const [square, setSquare] = useState<HTMLCanvasElement | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef(0)

  useLayoutEffect(() => {
    const preview = previewRef.current
    if (!preview || !square) return
    preview.width = square.width
    preview.height = square.height
    const ctx = preview.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(square, 0, 0)
  }, [square])

  function closeDialog() {
    requestRef.current += 1
    setOpen(false)
    setSquare(null)
    setFileName(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
    onDismissConfirm()
  }

  function openDialog() {
    setSquare(null)
    setFileName(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
    onDismissConfirm()
    setOpen(true)
  }

  async function onFile(file: File | undefined) {
    const ticket = requestRef.current + 1
    requestRef.current = ticket
    setError(null)
    setSquare(null)
    onDismissConfirm()
    if (!file) return
    try {
      const canvas = await readSquare(file)
      if (ticket !== requestRef.current) return
      setSquare(canvas)
    } catch {
      if (ticket !== requestRef.current) return
      setSquare(null)
      setError('这张图片打不开')
    }
  }

  function handleGenerate() {
    if (!square || gridSize <= 0) return
    let pixels: PixelGrid
    try {
      pixels = quantize(square, gridSize)
    } catch {
      setError('这张图片打不开')
      return
    }
    if (!onGenerate(pixels)) return
    requestRef.current += 1
    setOpen(false)
    setSquare(null)
    setFileName(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const ready = square !== null

  return (
    <section
      id="photo"
      aria-labelledby="photo-pixel-title"
      className="flex min-w-0 scroll-mt-6 flex-col gap-2 rounded-2xl border border-slate-300 bg-white p-4 shadow-[0_4px_0_0_var(--tw-shadow-color)] shadow-slate-300"
    >
      <h2 id="photo-pixel-title" className="text-2xl font-bold leading-[1.2] text-slate-900 md:text-[28px]">
        传图成画
      </h2>
      <p className="text-[17px] font-normal leading-[1.6] text-slate-700">
        你可以把任何图片变成像素画。上传一张你喜欢的图片，会自动裁成正方形，再点「生成像素图」。
      </p>
      <button type="button" onClick={openDialog} className="btn-secondary w-full text-base font-semibold sm:w-fit">
        上传
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-3">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-pixel-dialog-title"
            className="card flex max-h-[calc(100dvh-1.5rem)] w-full min-w-0 max-w-md flex-col gap-3 overflow-y-auto p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="photo-pixel-dialog-title" className="text-xl font-bold leading-[1.25] text-slate-900">
                传图成画
              </h3>
              <button type="button" onClick={closeDialog} className="btn-secondary shrink-0 px-4 text-base font-semibold">
                关闭
              </button>
            </div>
            <div className="flex min-w-0 max-w-full items-center gap-3">
              <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary shrink-0 px-4 text-base font-semibold">
                选择图片
              </button>
              <span className="min-w-0 truncate text-base text-slate-700">{fileName ? fileName : '未选择文件'}</span>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                tabIndex={-1}
                aria-label="选择图片"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  setFileName(file?.name ? file.name : null)
                  event.target.value = ''
                  void onFile(file)
                }}
                className="sr-only"
              />
            </div>
            {square ? (
              <canvas
                ref={previewRef}
                aria-label="正方形预览"
                className="h-40 w-40 max-w-full bg-canvas"
              />
            ) : null}
            {error ? (
              <p role="alert" className="text-base font-normal leading-[1.6] text-slate-700">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              aria-disabled={ready ? undefined : true}
              onClick={handleGenerate}
              className={
                ready
                  ? confirming
                    ? 'inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-danger px-4 text-center text-base font-semibold leading-[1.6] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2'
                    : 'btn-primary w-full text-base font-semibold'
                  : 'inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-xl border border-line bg-white px-4 text-base font-semibold text-slate-700 opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2'
              }
            >
              {confirming ? '生成像素图会替换当前画布，确认？' : '生成像素图'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
