import { footprint, partHeight, type Brick } from './brickTypes'

export type ShotStyle = 'quick' | 'hand'
export type ShotFps = 30 | 60

export type CameraPose = {
  position: [number, number, number]
  target: [number, number, number]
}

export type ModelFrame = {
  target: [number, number, number]
  radius: number
  height: number
}

export function videoPlan(style: ShotStyle, count: number) {
  const steps = Math.max(0, count)
  if (style === 'quick') return { seconds: 8, steps }
  return { seconds: Math.max(6, Math.round(steps * 0.4)), steps }
}

export function frameModel(bricks: readonly Brick[]): ModelFrame {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let maxY = 0
  for (const brick of bricks) {
    const { width, depth } = footprint(brick.type, brick.rotation)
    const [x, y, z] = brick.position
    minX = Math.min(minX, x - width / 2)
    maxX = Math.max(maxX, x + width / 2)
    minZ = Math.min(minZ, z - depth / 2)
    maxZ = Math.max(maxZ, z + depth / 2)
    maxY = Math.max(maxY, y + partHeight(brick.type) / 2)
  }
  if (!Number.isFinite(minX)) return { target: [0, 0.8, 0], radius: 16, height: 14 }
  const span = Math.max(maxX - minX, maxZ - minZ, 4)
  const radius = Math.max(14, span * 1.45)
  return {
    target: [(minX + maxX) / 2, Math.max(0.5, maxY * 0.35), (minZ + maxZ) / 2],
    radius,
    height: Math.max(radius * 0.7, maxY + 5),
  }
}

export function orbitPose(frame: ModelFrame, angle: number): CameraPose {
  const [tx, ty, tz] = frame.target
  return {
    position: [tx + Math.sin(angle) * frame.radius, frame.height, tz + Math.cos(angle) * frame.radius],
    target: [tx, ty, tz],
  }
}

export type RecordResult = { ok: true; blob: Blob; ext: 'webm' } | { ok: false; message: string }

const WEBM_TYPES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']

export function paintAspect(source: HTMLCanvasElement, target: HTMLCanvasElement) {
  const context = target.getContext('2d')
  if (!context || source.width <= 0 || source.height <= 0) return false
  const scale = Math.max(target.width / source.width, target.height / source.height)
  const width = source.width * scale
  const height = source.height * scale
  context.fillStyle = '#f4f6f4'
  context.fillRect(0, 0, target.width, target.height)
  context.drawImage(source, (target.width - width) / 2, (target.height - height) / 2, width, height)
  return true
}

export async function recordCanvas(options: {
  canvas: HTMLCanvasElement
  fps: ShotFps
  durationMs: number
  cancelled: { current: boolean }
  onTick: (t: number) => void
}): Promise<RecordResult> {
  const { canvas, fps, durationMs, cancelled, onTick } = options
  if (typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
    return { ok: false, message: '这个浏览器不能生成视频' }
  }
  const mime = WEBM_TYPES.find((item) => MediaRecorder.isTypeSupported(item))
  if (!mime) return { ok: false, message: '这个浏览器不能生成视频' }
  let stream: MediaStream
  try {
    stream = canvas.captureStream(fps)
  } catch {
    return { ok: false, message: '这个浏览器不能生成视频' }
  }
  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: fps === 60 ? 8_000_000 : 5_000_000 })
  } catch {
    return { ok: false, message: '这个浏览器不能生成视频' }
  }
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.addEventListener('stop', () => resolve(new Blob(chunks, { type: 'video/webm' })), { once: true })
    recorder.addEventListener('error', () => reject(new Error('录制失败')), { once: true })
  })
  try {
    recorder.start(200)
  } catch {
    stream.getTracks().forEach((track) => track.stop())
    return { ok: false, message: '这个浏览器不能生成视频' }
  }
  const started = performance.now()
  try {
    await new Promise<void>((resolve) => {
      function frame(now: number) {
        if (cancelled.current) {
          resolve()
          return
        }
        const t = Math.min(1, (now - started) / durationMs)
        onTick(t)
        if (t < 1) requestAnimationFrame(frame)
        else resolve()
      }
      requestAnimationFrame(frame)
    })
  } finally {
    if (recorder.state !== 'inactive') recorder.stop()
  }
  let blob: Blob
  try {
    blob = await stopped
  } catch {
    stream.getTracks().forEach((track) => track.stop())
    return { ok: false, message: '视频没有录完' }
  }
  stream.getTracks().forEach((track) => track.stop())
  if (cancelled.current) return { ok: false, message: '' }
  if (blob.size < 256) return { ok: false, message: '这个浏览器没有写出视频' }
  return { ok: true, blob, ext: 'webm' }
}
