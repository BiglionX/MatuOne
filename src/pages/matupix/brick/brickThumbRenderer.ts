import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Material,
  type MeshStandardMaterial,
} from 'three'
import { loadBrickTemplate } from './brickPartModel'
import type { BrickType } from './brickTypes'

/**
 * 零件缩略图直接用官方 LDraw 模型离屏渲染，和 3D 场景里看到的是同一个零件。
 * 渲染一次存成图片，按「零件 + 颜色」缓存。
 */

const THUMB_SIZE = 144
const MIN_THUMB_SIZE = 72
const SLOW_RENDER_MS = 250
const MAX_CACHE = 320

const cache = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()
let thumbSize = THUMB_SIZE
let renderer: WebGLRenderer | null = null
let stage: Scene | null = null
let camera: PerspectiveCamera | null = null
let queue: Promise<unknown> = Promise.resolve()

function ensureStage() {
  if (renderer) return
  renderer = new WebGLRenderer({ alpha: true, antialias: false, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(thumbSize, thumbSize, false)
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping

  stage = new Scene()
  stage.add(new AmbientLight(0xffffff, 0.6))
  stage.add(new HemisphereLight(0xf4f7ee, 0xc3ccd6, 0.45))
  const key = new DirectionalLight(0xffffff, 1.4)
  key.position.set(10, 18, 8)
  stage.add(key)

  camera = new PerspectiveCamera(28, 1, 0.01, 200)
}

/** 按零件包围盒摆好机位，让每个零件在卡片里占差不多的面积。 */
function frameCamera(cam: PerspectiveCamera, align: { min: [number, number, number]; max: [number, number, number] }) {
  const min = new Vector3(...align.min)
  const max = new Vector3(...align.max)
  const center = min.clone().add(max).multiplyScalar(0.5)
  const direction = new Vector3(0.82, 0.62, 1).normalize()
  const forward = direction.clone().negate()
  const right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0)).normalize()
  const up = new Vector3().crossVectors(right, forward).normalize()
  const tanV = Math.tan((cam.fov * Math.PI) / 360)
  const tanH = tanV * cam.aspect

  // 把包围盒八个角都投到相机上，取能让画面刚好装下的距离
  let distance = 0
  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) {
        const offset = new Vector3(x - center.x, y - center.y, z - center.z)
        const depth = offset.dot(forward)
        distance = Math.max(
          distance,
          Math.abs(offset.dot(right)) / tanH - depth,
          Math.abs(offset.dot(up)) / tanV - depth,
        )
      }
    }
  }
  distance = Math.max(distance * 1.14, 0.8)

  const span = min.distanceTo(max)
  cam.position.copy(center).addScaledVector(direction, distance)
  cam.lookAt(center)
  cam.near = Math.max(distance - span * 2, 0.01)
  cam.far = distance + span * 3
  cam.updateProjectionMatrix()
}

/**
 * 复制零件并换成 Lambert 材质：缩略图只要漫反射，PBR 太贵。
 * 主色（LDraw 16）用当前零件颜色，其余颜色保持模型自带。
 * 材质按颜色复用且不销毁：three.js 的着色器程序跟着材质走，
 * 每次新建再销毁会让显卡反复编译着色器，渲染时间翻几十倍。
 */
const materialCache = new Map<string, MeshLambertMaterial>()

function getMaterial(color: string) {
  const key = color.toLowerCase()
  const hit = materialCache.get(key)
  if (hit) return hit
  const material = new MeshLambertMaterial({ color })
  materialCache.set(key, material)
  return material
}

// 一个 mesh 可能带多组材质（LDraw 零件按颜色分组），
// 比如人偶头：五官一组（颜色 0）、头身一组（颜色 16）。
// 这里逐组换材质，只看第一组会把五官也涂成头色，脸就没了。
function buildThumbPart(template: Group, color: string) {
  const part = template.clone(true)
  part.traverse((obj) => {
    if (!(obj instanceof Mesh)) return
    const pick = (material: Material) => {
      const std = material as MeshStandardMaterial
      const code = std.userData?.code
      const main = code === undefined || code === '16' || code === 16
      return getMaterial(main ? color : `#${std.color?.getHexString() ?? 'ffffff'}`)
    }
    obj.material = Array.isArray(obj.material) ? obj.material.map(pick) : pick(obj.material)
  })
  return part
}

async function renderThumb(type: BrickType, color: string) {
  const template = await loadBrickTemplate(type)
  ensureStage()
  if (!renderer || !stage || !camera) throw new Error('缩略图渲染器不可用')
  const part = buildThumbPart(template, color)
  stage.add(part)
  frameCamera(camera, template.userData.align as { min: [number, number, number]; max: [number, number, number] })
  const started = performance.now()
  renderer.render(stage, camera)
  const url = renderer.domElement.toDataURL('image/webp', 0.9)
  const spent = performance.now() - started
  stage.remove(part)
  shrinkIfSlow(spent)
  return url
}

/** 机器没有硬件加速时渲染很慢，自动把画布调小，保证弹窗不卡。 */
let slowStreak = 0

function shrinkIfSlow(spent: number) {
  if (spent < SLOW_RENDER_MS) {
    slowStreak = 0
    return
  }
  slowStreak += 1
  if (slowStreak < 2 || thumbSize <= MIN_THUMB_SIZE) return
  slowStreak = 0
  thumbSize = Math.max(MIN_THUMB_SIZE, Math.round(thumbSize * 0.7))
  renderer?.setSize(thumbSize, thumbSize, false)
}

function remember(key: string, url: string) {
  cache.set(key, url)
  while (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next()
    if (oldest.done) break
    cache.delete(oldest.value)
  }
}

/** 取零件缩略图；同一个零件和颜色只渲染一次。 */
export function getPartThumb(type: BrickType, color: string) {
  const key = `${type}|${color}`
  const hit = cache.get(key)
  if (hit) return Promise.resolve(hit)
  const running = inflight.get(key)
  if (running) return running
  const run = queue.then(() => renderThumb(type, color)).then(
    (url) => {
      remember(key, url)
      inflight.delete(key)
      return url
    },
    (error) => {
      inflight.delete(key)
      throw error
    },
  )
  inflight.set(key, run)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}
