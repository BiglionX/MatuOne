import { useEffect, useRef } from 'react'

/**
 * MatuOne 启动器的 Canvas 背景：三幕视觉叙事。
 *
 *   第一幕「黑色星空」：纯黑底，稀疏星点几乎静止，只有极慢的漂移与呼吸。
 *   第二幕「蓝色绚丽星空」：星点被加速拉成流光，蓝色星云从四周涌向画面中心，
 *                         形成「穿越星云」的纵深冲击。
 *   第三幕「恒星（金黄火焰）」：流光收束，中心点燃一颗白热恒星，金黄日冕与火焰
 *                         持续跳动，最终定格成一团绚烂、高亮、有生命力的视觉中心。
 *
 * 三个阶段共用一条连续时间轴，之间全部用 smoothstep 插值，不做硬切，
 * 保证过渡平滑；星点、星云、光束、恒星共用同一套颜色渐变逻辑。
 */

type RGB = [number, number, number]

interface TrackKey {
  t: number
  v: number
}

interface ColorKey {
  t: number
  c: RGB
}

interface Star {
  /** 归一化横坐标，[-1, 1] */
  x: number
  /** 归一化纵坐标，[-1, 1] */
  y: number
  /** 景深，越小越靠近镜头，[0.05, 1] */
  z: number
  /** 上一帧的景深，用来算流光长度 */
  pz: number
  /** 基础亮度半径 */
  size: number
  /** 暖色倾向，0 = 冷白，1 = 金黄 */
  warm: number
  /** 归属哪一极：-1 = 冷极（蓝），1 = 暖极（橙） */
  polar: number
  /** 闪烁相位与速度 */
  phase: number
  speed: number
}

interface Cloud {
  /** 相对画面中心的归一化位置 */
  nx: number
  ny: number
  /** 半径占 min(宽, 高) 的比例 */
  r: number
  /** 整体不透明度 */
  alpha: number
  /** 纵向压扁，让星云铺成横带 */
  squash: number
  /** 自转与漂移速度 */
  rot: number
  drift: number
  spin: number
  /** 归属哪一极：-1 = 冷极，1 = 暖极，0 = 中性 */
  polar: number
  cool: HTMLCanvasElement
  warm: HTMLCanvasElement
}

interface Ember {
  angle: number
  radius: number
  speed: number
  rise: number
  size: number
  life: number
  maxLife: number
  /** 闪烁相位 */
  phase: number
}

interface Ray {
  angle: number
  len: number
  width: number
  group: number
}

const TAU = Math.PI * 2

/** 三幕时间轴（毫秒）。整体压在 3.4 秒内，好跟开屏动画、菜单入场对齐 */
const TIMELINE = {
  /** 第一幕结束：黑色星空开始被蓝色星云点燃 */
  blackEnd: 700,
  /** 第二幕结束：蓝色星云到达峰值，开始收束 */
  blueEnd: 2200,
  /** 第三幕结束：恒星完全成形，之后保持呼吸式定格 */
  goldEnd: 3400,
}

/**
 * 背景叙事的循环周期：正放三幕再倒放三幕。
 * 于是画面永远在「黑 → 蓝 → 黄 → 蓝 → 黑 → 蓝 → 黄」之间呼吸。
 */
const PERIOD = TIMELINE.goldEnd * 2

/** 把真实时间映射到叙事时间轴：前半段正放，后半段倒放 */
function timelinePhase(t: number): number {
  const phase = t % PERIOD
  const half = PERIOD / 2
  return phase <= half
    ? (phase / half) * TIMELINE.goldEnd
    : TIMELINE.goldEnd - ((phase - half) / half) * TIMELINE.goldEnd
}

/** 星际穿行速度：0 = 几乎静止，1 = 全速穿越星云 */
const TRACK_WARP: TrackKey[] = [
  { t: 0, v: 0 },
  { t: 600, v: 0.05 },
  { t: 1250, v: 0.44 },
  { t: 1700, v: 0.9 },
  { t: 2000, v: 1 },
  { t: 2200, v: 0.95 },
  { t: 2700, v: 0.62 },
  { t: 3050, v: 0.26 },
  { t: 3300, v: 0.05 },
  { t: 3400, v: 0.03 },
]

/** 蓝色星云浓度 */
const TRACK_BLUE: TrackKey[] = [
  { t: 0, v: 0 },
  { t: 700, v: 0.04 },
  { t: 1200, v: 0.46 },
  { t: 1700, v: 1 },
  { t: 2200, v: 1 },
  { t: 2650, v: 0.7 },
  { t: 3000, v: 0.16 },
  { t: 3300, v: 0 },
]

/** 金色星云浓度 */
const TRACK_GOLD: TrackKey[] = [
  { t: 0, v: 0 },
  { t: 2300, v: 0 },
  { t: 2650, v: 0.32 },
  { t: 3050, v: 0.82 },
  { t: 3400, v: 1 },
]

/** 中心恒星强度 */
const TRACK_CORE: TrackKey[] = [
  { t: 0, v: 0 },
  { t: 2350, v: 0 },
  { t: 2700, v: 0.22 },
  { t: 3100, v: 0.78 },
  { t: 3400, v: 1 },
]

/** 放射光束：第二幕是穿越爆发的星芒，第三幕变成恒星的日冕 */
const TRACK_RAYS: TrackKey[] = [
  { t: 0, v: 0 },
  { t: 800, v: 0.05 },
  { t: 1300, v: 0.52 },
  { t: 1900, v: 0.95 },
  { t: 2200, v: 0.85 },
  { t: 2700, v: 0.4 },
  { t: 3150, v: 0.62 },
  { t: 3400, v: 0.5 },
]

/** 环绕恒星的火星 */
const TRACK_EMBER: TrackKey[] = [
  { t: 0, v: 0 },
  { t: 3000, v: 0 },
  { t: 3200, v: 0.55 },
  { t: 3400, v: 1 },
]

/** 双极能量场：第三幕冷暖两极同时点燃 */
const TRACK_POLAR: TrackKey[] = [
  { t: 0, v: 0 },
  { t: 2150, v: 0 },
  { t: 2650, v: 0.48 },
  { t: 3150, v: 0.9 },
  { t: 3400, v: 1 },
]

/** 放射细光线（极光条纹）强度 */
const TRACK_STREAK: TrackKey[] = [
  { t: 0, v: 0 },
  { t: 900, v: 0 },
  { t: 1500, v: 0.42 },
  { t: 2100, v: 0.9 },
  { t: 2600, v: 0.7 },
  { t: 3100, v: 0.95 },
  { t: 3400, v: 1 },
]

/** 冲击波环强度 */
const TRACK_SHOCK: TrackKey[] = [
  { t: 0, v: 0 },
  { t: 2400, v: 0 },
  { t: 2900, v: 0.6 },
  { t: 3400, v: 1 },
]

/** 背景底色（中心 → 边缘） */
const COLOR_BG_INNER: ColorKey[] = [
  { t: 0, c: [5, 9, 22] },
  { t: 1100, c: [6, 16, 58] },
  { t: 1800, c: [20, 56, 150] },
  { t: 2200, c: [16, 46, 132] },
  { t: 2800, c: [22, 24, 62] },
  { t: 3400, c: [12, 18, 44] },
]

const COLOR_BG_OUTER: ColorKey[] = [
  { t: 0, c: [2, 3, 10] },
  { t: 1100, c: [2, 6, 24] },
  { t: 1800, c: [5, 14, 48] },
  { t: 2200, c: [4, 11, 40] },
  { t: 2800, c: [6, 8, 24] },
  { t: 3400, c: [3, 5, 14] },
]

/** 星点颜色：冷白 → 蓝 → 金黄 */
const COLOR_STAR: ColorKey[] = [
  { t: 0, c: [216, 230, 255] },
  { t: 1400, c: [178, 216, 255] },
  { t: 2200, c: [152, 198, 255] },
  { t: 2800, c: [255, 216, 154] },
  { t: 3400, c: [255, 238, 204] },
]

/** 光束颜色：冰蓝 → 暖金 */
const COLOR_RAY: ColorKey[] = [
  { t: 0, c: [204, 228, 255] },
  { t: 1900, c: [168, 214, 255] },
  { t: 2600, c: [214, 208, 255] },
  { t: 3050, c: [255, 198, 112] },
  { t: 3400, c: [255, 216, 144] },
]

/** 冷极（蓝）辉光色 */
const COLOR_POLAR_COOL: ColorKey[] = [
  { t: 0, c: [46, 123, 255] },
  { t: 2200, c: [46, 123, 255] },
  { t: 2900, c: [52, 142, 255] },
  { t: 3400, c: [92, 172, 255] },
]

/** 暖极（橙金）辉光色 */
const COLOR_POLAR_WARM: ColorKey[] = [
  { t: 0, c: [255, 138, 30] },
  { t: 2200, c: [255, 138, 30] },
  { t: 2900, c: [255, 148, 42] },
  { t: 3400, c: [255, 172, 68] },
]

const RAY_COUNT = 30
const FLAME_COUNT = 18
const EMBER_COUNT = 64

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

/** 标量轨道插值：相邻关键帧之间走 smoothstep，保证过渡没有硬切 */
function sampleTrack(track: TrackKey[], t: number): number {
  const first = track[0]
  if (t <= first.t) return first.v
  const last = track[track.length - 1]
  if (t >= last.t) return last.v
  for (let i = 0; i < track.length - 1; i += 1) {
    const a = track[i]
    const b = track[i + 1]
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t
      const p = span <= 0 ? 1 : (t - a.t) / span
      return a.v + (b.v - a.v) * smoothstep(p)
    }
  }
  return last.v
}

/** 颜色轨道插值：在 RGB 空间线性过渡 */
function sampleColor(track: ColorKey[], t: number): RGB {
  const first = track[0]
  if (t <= first.t) return first.c
  const last = track[track.length - 1]
  if (t >= last.t) return last.c
  for (let i = 0; i < track.length - 1; i += 1) {
    const a = track[i]
    const b = track[i + 1]
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t
      const p = span <= 0 ? 1 : (t - a.t) / span
      return [
        a.c[0] + (b.c[0] - a.c[0]) * p,
        a.c[1] + (b.c[1] - a.c[1]) * p,
        a.c[2] + (b.c[2] - a.c[2]) * p,
      ]
    }
  }
  return last.c
}

function mix(a: RGB, b: RGB, p: number): RGB {
  return [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p]
}

function rgba(c: RGB, a: number): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a.toFixed(4)})`
}

function hexToRgb(hex: string): RGB {
  const parts = hex.slice(1).match(/.{2}/g) ?? ['00', '00', '00']
  return [Number.parseInt(parts[0], 16), Number.parseInt(parts[1], 16), Number.parseInt(parts[2], 16)]
}

/** 预渲染一团星云：几团错位的柔光叠在一起，避免看起来像规则的圆 */
function makeCloudSprite(color: string, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')
  if (!g) return canvas

  const rgb = hexToRgb(color)
  const r = size / 2

  const blobs = [
    { dx: -0.2, dy: -0.12, r: 0.66, a: 0.9 },
    { dx: 0.22, dy: 0.14, r: 0.54, a: 0.72 },
    { dx: 0.02, dy: 0.26, r: 0.42, a: 0.58 },
    { dx: -0.34, dy: 0.24, r: 0.3, a: 0.4 },
  ]

  g.globalCompositeOperation = 'lighter'
  for (const blob of blobs) {
    const bx = r + blob.dx * r
    const by = r + blob.dy * r
    const br = blob.r * r
    const grad = g.createRadialGradient(bx, by, 0, bx, by, br)
    grad.addColorStop(0, rgba(rgb, blob.a))
    grad.addColorStop(0.34, rgba(rgb, 0.58 * blob.a))
    grad.addColorStop(0.68, rgba(rgb, 0.16 * blob.a))
    grad.addColorStop(1, rgba(rgb, 0))
    g.fillStyle = grad
    g.fillRect(0, 0, size, size)
  }
  return canvas
}

/** 预渲染火焰拖尾：底部亮、顶部散成尖角 */
function makeFlameSprite(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')
  if (!g) return canvas

  const grad = g.createRadialGradient(size * 0.5, size * 0.72, 0, size * 0.5, size * 0.72, size * 0.62)
  grad.addColorStop(0, 'rgba(255,252,238,0.95)')
  grad.addColorStop(0.28, 'rgba(255,206,110,0.62)')
  grad.addColorStop(0.62, 'rgba(255,132,34,0.24)')
  grad.addColorStop(1, 'rgba(255,96,16,0)')
  g.fillStyle = grad
  g.beginPath()
  g.ellipse(size * 0.5, size * 0.66, size * 0.3, size * 0.44, 0, 0, TAU)
  g.fill()
  return canvas
}

/** 预渲染火星用的柔光点 */
function makeSparkSprite(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')
  if (!g) return canvas

  const grad = g.createRadialGradient(size * 0.5, size * 0.5, 0, size * 0.5, size * 0.5, size * 0.5)
  grad.addColorStop(0, 'rgba(255,248,224,0.95)')
  grad.addColorStop(0.35, 'rgba(255,190,90,0.45)')
  grad.addColorStop(1, 'rgba(255,140,40,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  return canvas
}

/** 预渲染极光条纹：从中心向外炸开的细长光线，两极各一张 */
function makeStreakSprite(color: string, size: number, count: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')
  if (!g) return canvas

  const rgb = hexToRgb(color)
  const c = size / 2
  g.globalCompositeOperation = 'lighter'

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * TAU
    const len = size * (0.14 + Math.random() * 0.34)
    const spread = 0.002 + Math.random() * 0.013
    const alpha = 0.1 + Math.random() * 0.52
    const tipX = c + Math.cos(angle) * len
    const tipY = c + Math.sin(angle) * len
    const grad = g.createLinearGradient(c, c, tipX, tipY)
    grad.addColorStop(0, rgba(rgb, alpha))
    grad.addColorStop(0.16, rgba(rgb, alpha * 0.52))
    grad.addColorStop(1, rgba(rgb, 0))
    g.fillStyle = grad
    g.beginPath()
    g.moveTo(c, c)
    g.lineTo(c + Math.cos(angle - spread) * len, c + Math.sin(angle - spread) * len)
    g.lineTo(c + Math.cos(angle + spread) * len, c + Math.sin(angle + spread) * len)
    g.closePath()
    g.fill()
  }
  return canvas
}

/** 预渲染穿梭层：白热放射细丝，缩放时像在冲向观者 */
function makeBurstSprite(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')
  if (!g) return canvas

  const c = size / 2
  g.globalCompositeOperation = 'lighter'

  for (let i = 0; i < 240; i += 1) {
    const angle = Math.random() * TAU
    const len = size * (0.08 + Math.random() * 0.44)
    const spread = 0.0015 + Math.random() * 0.007
    const alpha = 0.06 + Math.random() * 0.32
    const tipX = c + Math.cos(angle) * len
    const tipY = c + Math.sin(angle) * len
    const grad = g.createLinearGradient(c, c, tipX, tipY)
    grad.addColorStop(0, `rgba(255,248,232,${alpha.toFixed(3)})`)
    grad.addColorStop(0.2, `rgba(206,230,255,${(alpha * 0.4).toFixed(3)})`)
    grad.addColorStop(1, 'rgba(120,180,255,0)')
    g.fillStyle = grad
    g.beginPath()
    g.moveTo(c, c)
    g.lineTo(c + Math.cos(angle - spread) * len, c + Math.sin(angle - spread) * len)
    g.lineTo(c + Math.cos(angle + spread) * len, c + Math.sin(angle + spread) * len)
    g.closePath()
    g.fill()
  }

  const core = g.createRadialGradient(c, c, 0, c, c, size * 0.22)
  core.addColorStop(0, 'rgba(255,255,255,0.85)')
  core.addColorStop(0.28, 'rgba(255,236,200,0.4)')
  core.addColorStop(1, 'rgba(255,190,120,0)')
  g.fillStyle = core
  g.fillRect(0, 0, size, size)
  return canvas
}

export function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const element = canvasRef.current
    if (!element) return
    const context = element.getContext('2d', { alpha: false })
    if (!context) return

    // 这两个别名已经带上非空类型，后面所有闭包里都不用重复判空
    const canvas: HTMLCanvasElement = element
    const ctx: CanvasRenderingContext2D = context

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let width = 0
    let height = 0
    let minDim = 0
    let cx = 0
    let cy = 0
    /** 冷极（蓝）极心 */
    let coolX = 0
    let coolY = 0
    /** 暖极（橙）极心 */
    let warmX = 0
    let warmY = 0
    let lowPower = false
    /** 当前处于第几幕：0 = 黑色星空，1 = 蓝色星云，2 = 金黄恒星 */
        let act = 0
    
    const stars: Star[] = []
    const clouds: Cloud[] = []
    const embers: Ember[] = []
    const rays: Ray[] = []

    const flameSprite = makeFlameSprite(96)
    const sparkSprite = makeSparkSprite(48)
    const streakCool = makeStreakSprite('#8FD0FF', 768, 150)
    const streakWarm = makeStreakSprite('#FFC272', 768, 150)
    const burstSprite = makeBurstSprite(768)

    function makeStar(): Star {
      const x = Math.random() * 2 - 1
      return {
        x,
        y: Math.random() * 2 - 1,
        z: 0.12 + Math.random() * 0.88,
        pz: 0.12 + Math.random() * 0.88,
        size: 0.5 + Math.random() * 1.5,
        warm: Math.random(),
        polar: x < 0 ? -1 : 1,
        phase: Math.random() * TAU,
        speed: 0.4 + Math.random() * 1.6,
      }
    }

    /** 粒子数量随画布面积走，并设上下限，低端机不会一开始就压不住 */
    function starTarget(): number {
      return Math.min(520, Math.max(220, Math.round((width * height) / 3800)))
    }

    function buildStars() {
      stars.length = 0
      const count = starTarget()
      for (let i = 0; i < count; i += 1) stars.push(makeStar())
    }

    function buildClouds() {
      clouds.length = 0
      // 两团巨云分居左右，第三幕时右云转暖、左云保持冷色
      const layout = [
        { nx: -0.52, ny: 0.12, r: 0.92, alpha: 1, squash: 0.86, rot: 0.00006, drift: 0.0013, polar: -1, cool: '#1D6BFF', warm: '#3C86FF' },
        { nx: 0.5, ny: -0.06, r: 0.9, alpha: 1, squash: 0.84, rot: -0.00007, drift: 0.0018, polar: 1, cool: '#2E7BFF', warm: '#FFB347' },
        { nx: -0.3, ny: -0.44, r: 0.44, alpha: 0.82, squash: 0.68, rot: 0.00012, drift: 0.0026, polar: -1, cool: '#2C9BFF', warm: '#4A46FF' },
        { nx: 0.32, ny: 0.46, r: 0.42, alpha: 0.78, squash: 0.66, rot: -0.00014, drift: 0.0023, polar: 1, cool: '#0FA0FF', warm: '#FF8A1E' },
        { nx: 0.02, ny: 0.48, r: 0.46, alpha: 0.66, squash: 0.62, rot: 0.00006, drift: 0.0018, polar: 0, cool: '#1A88FF', warm: '#FFCE70' },
        { nx: -0.05, ny: -0.46, r: 0.44, alpha: 0.7, squash: 0.64, rot: -0.00008, drift: 0.002, polar: 0, cool: '#6B4BFF', warm: '#F76A10' },
        { nx: 0.72, ny: -0.42, r: 0.34, alpha: 0.7, squash: 0.72, rot: 0.0001, drift: 0.0024, polar: 1, cool: '#0E6EFF', warm: '#FFA42E' },
      ]
      layout.forEach((item) => {
        clouds.push({
          nx: item.nx,
          ny: item.ny,
          r: item.r,
          alpha: item.alpha,
          squash: item.squash,
          rot: item.rot,
          drift: item.drift,
          spin: Math.random() * TAU,
          polar: item.polar,
          cool: makeCloudSprite(item.cool, 256),
          warm: makeCloudSprite(item.warm, 256),
        })
      })
    }

    function buildRays() {
      rays.length = 0
      for (let i = 0; i < RAY_COUNT; i += 1) {
        rays.push({
          angle: (i / RAY_COUNT) * TAU + Math.random() * 0.16,
          len: 0.84 + Math.random() * 0.16,
          width: 0.006 + Math.random() * 0.024,
          group: i % 3,
        })
      }
    }

    function buildEmbers() {
      embers.length = 0
      for (let i = 0; i < EMBER_COUNT; i += 1) {
        const life = 2.5 + Math.random() * 4
        embers.push({
          angle: Math.random() * TAU,
          radius: minDim * (0.12 + Math.random() * 0.34),
          speed: (0.12 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1),
          rise: 6 + Math.random() * 22,
          size: 3 + Math.random() * 7,
          life,
          maxLife: life,
          phase: Math.random() * TAU,
        })
      }
    }

    function resize() {
      const rect = canvas.getBoundingClientRect()
      const w = Math.max(1, Math.round(rect.width || window.innerWidth))
      const h = Math.max(1, Math.round(rect.height || window.innerHeight))
      const dpr = Math.min(2, window.devicePixelRatio || 1)

      width = w
      height = h
      minDim = Math.min(w, h)
      cx = w * 0.5
      cy = h * 0.46
      coolX = cx - w * 0.31
      coolY = cy + h * 0.16
      warmX = cx + w * 0.31
      warmY = cy + h * 0.06

      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    /** 背景底色：黑 → 蓝 → 暖金，随时间轴连续渐变 */
    function drawBackground(inner: RGB, outer: RGB) {
      const radius = Math.max(width, height) * 0.95
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
      grad.addColorStop(0, rgba(inner, 0.96))
      grad.addColorStop(0.5, rgba(mix(inner, outer, 0.5), 0.94))
      grad.addColorStop(1, rgba(outer, 1))
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
    }

    /** 星云：冷色与暖色两套同形状贴图交叉淡入淡出，实现平滑的蓝 → 金换色 */
    function drawNebula(t: number, blue: number, gold: number, warp: number) {
      if (blue <= 0.003 && gold <= 0.003) return
      // 第二幕的星云会随着推进微微胀大，制造「正在穿过星云」的推近感
      const zoom = 1 + warp * 0.3
      ctx.globalCompositeOperation = 'source-over'
      for (const cloud of clouds) {
        const drift = t * cloud.drift
        const x = cx + (cloud.nx + Math.sin(drift) * 0.05) * width * 0.62
        const y = cy + (cloud.ny + Math.cos(drift * 0.8) * 0.04) * height * 0.62
        const size = cloud.r * minDim * 2 * zoom
        const alpha = cloud.alpha

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(cloud.spin + t * cloud.rot)
        ctx.scale(1, cloud.squash)
        if (blue > 0.003) {
          // 右极在第三幕会从冷转暖，所以它先扣掉一半暖色权重
          const coolShare = cloud.polar > 0 ? blue * (1 - gold) : blue
          ctx.globalAlpha = Math.min(1, coolShare * alpha)
          ctx.drawImage(cloud.cool, -size / 2, -size / 2, size, size)
        }
        if (gold > 0.003 && cloud.polar !== -1) {
          ctx.globalAlpha = Math.min(1, gold * alpha)
          ctx.drawImage(cloud.warm, -size / 2, -size / 2, size, size)
        }
        ctx.restore()
      }
      ctx.globalAlpha = 1
    }

    /** 双极能量场：左冷右暖两团辉光互相渗透，中间留一道对撞的冷热交界 */
    function drawPolarField(t: number, amount: number, cool: RGB, warm: RGB) {
      if (amount <= 0.004) return
      const pulse = 0.9 + 0.1 * Math.sin(t / 900)
      ctx.globalCompositeOperation = 'lighter'

      const coolR = minDim * 1.0 * pulse
      const coolGrad = ctx.createRadialGradient(coolX, coolY, 0, coolX, coolY, coolR)
      coolGrad.addColorStop(0, rgba(cool, 0.4 * amount))
      coolGrad.addColorStop(0.2, rgba(cool, 0.21 * amount))
      coolGrad.addColorStop(0.56, rgba(cool, 0.07 * amount))
      coolGrad.addColorStop(1, rgba(cool, 0))
      ctx.fillStyle = coolGrad
      ctx.fillRect(coolX - coolR, coolY - coolR, coolR * 2, coolR * 2)

      const warmR = minDim * 0.96 * pulse
      const warmGrad = ctx.createRadialGradient(warmX, warmY, 0, warmX, warmY, warmR)
      warmGrad.addColorStop(0, rgba(warm, 0.42 * amount))
      warmGrad.addColorStop(0.2, rgba(warm, 0.21 * amount))
      warmGrad.addColorStop(0.56, rgba(warm, 0.065 * amount))
      warmGrad.addColorStop(1, rgba(warm, 0))
      ctx.fillStyle = warmGrad
      ctx.fillRect(warmX - warmR, warmY - warmR, warmR * 2, warmR * 2)

      ctx.globalAlpha = 1
    }

    /** 极光条纹：两极各自向外炸开的放射光线 */
    function drawStreakFields(t: number, amount: number) {
      if (amount <= 0.005) return
      const size = minDim * 3.1
      ctx.globalCompositeOperation = 'lighter'

      ctx.save()
      ctx.translate(coolX, coolY)
      ctx.rotate(t * 0.00004)
      ctx.globalAlpha = amount * 0.3
      ctx.drawImage(streakCool, -size / 2, -size / 2, size, size)
      ctx.restore()

      ctx.save()
      ctx.translate(warmX, warmY)
      ctx.rotate(-t * 0.000052)
      ctx.globalAlpha = amount * 0.36
      ctx.drawImage(streakWarm, -size / 2, -size / 2, size, size)
      ctx.restore()

      ctx.globalAlpha = 1
    }

    /** 穿梭层：放射纹理不断放大，像在冲向观者 */
    function drawBurst(t: number, amount: number) {
      if (amount <= 0.005) return
      const phase = (t / 2600) % 1
      const size = minDim * 2.4 * (0.2 + phase * 1.5)
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = amount * 0.3 * (1 - phase)
      ctx.drawImage(burstSprite, cx - size / 2, cy - size / 2, size, size)
      ctx.globalAlpha = 1
    }

    /** 冲击波：从极心扩散的椭圆环 */
    function drawShockwaves(t: number, amount: number) {
      if (amount <= 0.005) return
      const waves = [
        { x: coolX, y: coolY, color: [156, 214, 255] as RGB, offset: 0 },
        { x: warmX, y: warmY, color: [255, 190, 104] as RGB, offset: 0.34 },
        { x: warmX, y: warmY, color: [255, 146, 64] as RGB, offset: 0.68 },
      ]
      ctx.globalCompositeOperation = 'lighter'
      for (const wave of waves) {
        const phase = (t / 3600 + wave.offset) % 1
        const r = minDim * (0.1 + phase * 0.95)
        const fade = Math.sin(phase * Math.PI)
        ctx.beginPath()
        ctx.ellipse(wave.x, wave.y, r, r * 0.74, 0, 0, TAU)
        ctx.strokeStyle = rgba(wave.color, 0.14 * amount * fade)
        ctx.lineWidth = 1 + (1 - phase) * 2
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    /** 放射光束：第二幕是穿越爆发的星芒，第三幕是恒星的日冕 */
    function drawRays(t: number, amount: number, color: RGB, coreAmount: number) {
      if (amount <= 0.005) return
      const length = Math.max(width, height) * 0.66
      const rot = t * (0.00005 + 0.00017 * coreAmount)

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.translate(cx, cy)
      ctx.rotate(rot)
      for (let group = 0; group < 3; group += 1) {
        ctx.beginPath()
        for (const ray of rays) {
          if (ray.group !== group) continue
          const half = ray.width
          const tip = length * ray.len
          const base = 5 + tip * 0.012
          ctx.moveTo(Math.cos(ray.angle - half) * base, Math.sin(ray.angle - half) * base)
          ctx.lineTo(Math.cos(ray.angle) * tip, Math.sin(ray.angle) * tip)
          ctx.lineTo(Math.cos(ray.angle + half) * base, Math.sin(ray.angle + half) * base)
        }
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, length * 0.82)
        const strength = amount * [0.45, 0.78, 1][group]
        grad.addColorStop(0, rgba(color, 0.6 * strength))
        grad.addColorStop(0.2, rgba(color, 0.3 * strength))
        grad.addColorStop(0.58, rgba(color, 0.1 * strength))
        grad.addColorStop(1, rgba(color, 0))
        ctx.fillStyle = grad
        ctx.fill()
      }
      ctx.restore()
      ctx.globalAlpha = 1
    }

    /** 星点：景深投影，速度上来时拉成流光，形成「穿越星云」的纵深 */
    function drawStars(t: number, dt: number, warp: number, color: RGB) {
      const speed = 0.06 + 1.55 * warp
      const spreadX = width * 0.52
      const spreadY = height * 0.52
      const drawStreak = warp > 0.02

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1

      // 分三个景深桶批量画流光，避免每颗星都切一次画笔状态
      if (drawStreak) {
        for (let bucket = 0; bucket < 3; bucket += 1) {
          ctx.beginPath()
          for (const star of stars) {
            const k = 1 / star.z
            const pk = 1 / star.pz
            const sx = cx + star.x * k * spreadX
            const sy = cy + star.y * k * spreadY
            // 定格后也留一小段拖尾，让尘埃看起来还在被激波推着走
            const tail = 6 + 26 * warp
            const pxx = cx + star.x * pk * spreadX
            const pyy = cy + star.y * pk * spreadY
            const dx = sx - pxx
            const dy = sy - pyy
            const len = Math.hypot(dx, dy)
            const tailX = len > 0.001 ? sx - (dx / len) * tail : pxx
            const tailY = len > 0.001 ? sy - (dy / len) * tail : pyy
            const depth = star.z < 0.28 ? 0 : star.z < 0.62 ? 1 : 2
            if (depth !== bucket) continue
            if (sx < -80 || sx > width + 80 || sy < -80 || sy > height + 80) continue
            ctx.moveTo(tailX, tailY)
            ctx.lineTo(sx, sy)
          }
          ctx.strokeStyle = rgba(color, [0.4, 0.62, 0.8][bucket])
          ctx.lineWidth = [1.8, 1.3, 0.9][bucket]
          ctx.lineCap = 'round'
          ctx.stroke()
        }
      }

      for (const star of stars) {
        star.pz = star.z
        star.z -= speed * dt
        if (star.z <= 0.05) {
          star.x = Math.random() * 2 - 1
          star.y = Math.random() * 2 - 1
          star.polar = star.x < 0 ? -1 : 1
          star.z = 1
          star.pz = 1
        }

        const k = 1 / star.z
        const sx = cx + star.x * k * spreadX
        const sy = cy + star.y * k * spreadY
        if (sx < -6 || sx > width + 6 || sy < -6 || sy > height + 6) continue

        const near = 1 - star.z
        const twinkle = 0.68 + 0.32 * Math.sin((t / 1000) * star.speed + star.phase)
        const alpha = clamp01((0.22 + 0.78 * near) * twinkle)
        if (alpha <= 0.01) continue

        const size = star.size * (0.45 + 0.95 * near)
        const poleTint: RGB = star.polar < 0 ? [126, 198, 255] : [255, 184, 108]
        const tint = mix(mix(color, poleTint, 0.55), [255, 224, 170], star.warm * 0.45)
        ctx.fillStyle = rgba(tint, alpha)
        ctx.beginPath()
        ctx.arc(sx, sy, size, 0, TAU)
        ctx.fill()
      }
    }

    /** 对撞核心：白热的光核 + 跳动的火舌 */
    function drawCore(t: number, amount: number) {
      if (amount <= 0.004) return
      const breath = 0.84 + 0.16 * Math.sin(t / 760)
      const coreR = minDim * 0.018 * (0.78 + 0.22 * breath)

      ctx.globalCompositeOperation = 'lighter'

      // 外层大范围光晕
      const bloomR = minDim * 0.3 * (0.88 + 0.12 * breath)
      const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, bloomR)
      bloom.addColorStop(0, rgba([255, 250, 236], 0.38 * amount * breath))
      bloom.addColorStop(0.14, rgba([255, 220, 160], 0.22 * amount * breath))
      bloom.addColorStop(0.44, rgba([255, 150, 60], 0.1 * amount * breath))
      bloom.addColorStop(1, rgba([255, 92, 18], 0))
      ctx.fillStyle = bloom
      ctx.fillRect(cx - bloomR, cy - bloomR, bloomR * 2, bloomR * 2)

      // 火焰：绕着光球跳动的金色火舌
      for (let i = 0; i < FLAME_COUNT; i += 1) {
        const dir = i % 2 === 0 ? 1 : -1
        const angle = (i / FLAME_COUNT) * TAU + t * 0.00034 * dir
        const flick = 0.5 + 0.5 * Math.sin(t / 190 + i * 1.9)
        const dist = coreR * (0.9 + 0.6 * flick)
        const size = coreR * (0.85 + 0.8 * flick)
        ctx.save()
        ctx.translate(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist)
        ctx.rotate(angle + Math.PI / 2)
        ctx.globalAlpha = amount * (0.18 + 0.3 * flick)
        ctx.drawImage(flameSprite, -size * 0.5, -size * 0.5, size, size * 1.7)
        ctx.restore()
      }

      // 光球本体：中心白热，往外过渡到金橙
      const discR = coreR * 3
      const disc = ctx.createRadialGradient(cx, cy, 0, cx, cy, discR)
      disc.addColorStop(0, rgba([255, 255, 255], 1 * amount))
      disc.addColorStop(0.2, rgba([255, 252, 242], 0.9 * amount))
      disc.addColorStop(0.46, rgba([255, 226, 172], 0.5 * amount))
      disc.addColorStop(0.76, rgba([255, 156, 66], 0.2 * amount))
      disc.addColorStop(1, rgba([255, 92, 18], 0))
      ctx.fillStyle = disc
      ctx.beginPath()
      ctx.arc(cx, cy, discR, 0, TAU)
      ctx.fill()

      // 表面颗粒：几团游走的亮斑，让恒星看起来「活着」
      for (let i = 0; i < 7; i += 1) {
        const dir = i % 2 === 0 ? 1 : -1
        const angle = t * 0.00042 * dir + i * 1.7
        const rr = discR * (0.12 + 0.5 * ((i * 0.37) % 1))
        const x = cx + Math.cos(angle) * rr
        const y = cy + Math.sin(angle) * rr
        const size = discR * (0.16 + 0.12 * Math.sin(t / 700 + i))
        const spot = ctx.createRadialGradient(x, y, 0, x, y, size)
        spot.addColorStop(0, rgba([255, 252, 232], 0.44 * amount))
        spot.addColorStop(1, rgba([255, 200, 120], 0))
        ctx.fillStyle = spot
        ctx.beginPath()
        ctx.arc(x, y, size, 0, TAU)
        ctx.fill()
      }

      ctx.globalAlpha = 1
    }

    /** 火星：绕恒星飞行的金色微粒，给定格的画面留一点生气 */
    function drawEmbers(dt: number, amount: number, t: number) {
      if (amount <= 0.005 || lowPower) return
      ctx.globalCompositeOperation = 'lighter'
      for (const ember of embers) {
        ember.life -= dt
        if (ember.life <= 0 || ember.radius > minDim * 0.66) {
          const life = 2.5 + Math.random() * 4
          ember.angle = Math.random() * TAU
          ember.radius = minDim * (0.1 + Math.random() * 0.2)
          ember.speed = (0.12 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1)
          ember.rise = 6 + Math.random() * 22
          ember.size = 3 + Math.random() * 7
          ember.life = life
          ember.maxLife = life
          ember.phase = Math.random() * TAU
        }
        ember.angle += ember.speed * dt
        ember.radius += ember.rise * dt
        const x = cx + Math.cos(ember.angle) * ember.radius
        const y = cy + Math.sin(ember.angle) * ember.radius * 0.62
        const fade = Math.min(1, ember.life / 0.9) * Math.min(1, (ember.maxLife - ember.life) / 0.4)
        const r = ember.size * (0.6 + 0.4 * Math.sin(ember.phase + t / 220))
        ctx.globalAlpha = amount * fade * 0.8
        ctx.drawImage(sparkSprite, x - r, y - r, r * 2, r * 2)
      }
      ctx.globalAlpha = 1
    }

    /** 暗角 + 底部压暗，保证前景文字始终可读 */
    function drawVignette() {
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      const radius = Math.max(width, height) * 0.78
      const vignette = ctx.createRadialGradient(cx, cy, minDim * 0.3, cx, cy, radius)
      vignette.addColorStop(0, 'rgba(0,0,0,0)')
      vignette.addColorStop(0.62, 'rgba(0,0,0,0.1)')
      vignette.addColorStop(1, 'rgba(0,0,0,0.42)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, width, height)

      const bottom = ctx.createLinearGradient(0, height * 0.72, 0, height)
      bottom.addColorStop(0, 'rgba(0,0,0,0)')
      bottom.addColorStop(1, 'rgba(0,0,0,0.42)')
      ctx.fillStyle = bottom
      ctx.fillRect(0, height * 0.72, width, height * 0.28)

      // 顶部压暗：顶栏与标题区不能被两极的能量染花
      const top = ctx.createLinearGradient(0, 0, 0, height * 0.24)
      top.addColorStop(0, 'rgba(2,4,10,0.62)')
      top.addColorStop(1, 'rgba(2,4,10,0)')
      ctx.fillStyle = top
      ctx.fillRect(0, 0, width, height * 0.24)
    }

    function render(t: number, dt: number) {
      // 轨道与颜色按叙事时间取样（会倒放），动画相位仍用真实时间
      const tl = timelinePhase(t)
      const nextAct = tl < TIMELINE.blackEnd ? 0 : tl < TIMELINE.blueEnd ? 1 : 2
      if (nextAct !== act) {
        act = nextAct
        canvas.parentElement?.style.setProperty('--matuone-act', String(act))
      }

      const warp = sampleTrack(TRACK_WARP, tl)
      const blue = sampleTrack(TRACK_BLUE, tl)
      const gold = sampleTrack(TRACK_GOLD, tl)
      const coreAmount = sampleTrack(TRACK_CORE, tl)
      const rayAmount = sampleTrack(TRACK_RAYS, tl)
      const emberAmount = sampleTrack(TRACK_EMBER, tl)
      const polarAmount = sampleTrack(TRACK_POLAR, tl)
      const streakAmount = sampleTrack(TRACK_STREAK, tl)
      const shockAmount = sampleTrack(TRACK_SHOCK, tl)

      const bgInner = sampleColor(COLOR_BG_INNER, tl)
      const bgOuter = sampleColor(COLOR_BG_OUTER, tl)
      const starColor = sampleColor(COLOR_STAR, tl)
      const rayColor = sampleColor(COLOR_RAY, tl)
      const polarCool = sampleColor(COLOR_POLAR_COOL, tl)
      const polarWarm = sampleColor(COLOR_POLAR_WARM, tl)

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1

      drawBackground(bgInner, bgOuter)
      drawPolarField(t, polarAmount, polarCool, polarWarm)
      drawNebula(t, blue, gold, warp)
      drawStreakFields(t, streakAmount)
      drawRays(t, rayAmount, rayColor, coreAmount)
      drawBurst(t, streakAmount)
      drawStars(t, dt, warp, starColor)
      drawCore(t, coreAmount)
      drawShockwaves(t, shockAmount)
      drawEmbers(dt, emberAmount, t)
      drawVignette()
    }

    function resizeAndBuild() {
      resize()
      buildStars()
      buildEmbers()
    }

    /** 低功耗裁剪后，画布尺寸变化需要按新面积补回粒子 */
    function replenishStars() {
      if (lowPower) return
      const target = starTarget()
      while (stars.length < target) stars.push(makeStar())
    }

    resizeAndBuild()
    buildClouds()
    buildRays()

    const onResize = () => {
      resizeAndBuild()
      replenishStars()
      if (reducedMotion) render(TIMELINE.goldEnd, 0)
    }
    window.addEventListener('resize', onResize)

    if (reducedMotion) {
      // 尊重系统的「减少动态效果」：直接定格在恒星阶段，不跑动画
      render(TIMELINE.goldEnd, 0)
      return () => {
        window.removeEventListener('resize', onResize)
      }
    }

    const startTime = performance.now()
    let lastFrame = startTime
    let raf = 0

    // 帧率看门狗：连续偏低就砍粒子，保证低端机也不掉帧
    let fpsWindowStart = startTime
    let fpsFrames = 0

    function loop(now: number) {
      raf = window.requestAnimationFrame(loop)
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000))
      lastFrame = now
      const t = now - startTime

      render(t, dt)

      fpsFrames += 1
      if (now - fpsWindowStart >= 1000) {
        const fps = (fpsFrames * 1000) / (now - fpsWindowStart)
        if (!lowPower && fps < 40) {
          lowPower = true
          stars.length = Math.min(stars.length, 110)
        }
        fpsFrames = 0
        fpsWindowStart = now
      }
    }

    const onVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(raf)
        raf = 0
        return
      }
      if (raf === 0) {
        lastFrame = performance.now()
        raf = window.requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    raf = window.requestAnimationFrame(loop)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} className="matuone-stars" role="presentation" aria-hidden="true" />
}
