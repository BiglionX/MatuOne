import { Box3, Group, LineSegments, LoadingManager, Mesh, MeshStandardMaterial, type Material, type Object3D } from 'three'
import { LDrawConditionalLineMaterial } from 'three/examples/jsm/materials/LDrawConditionalLineMaterial.js'
import { LDrawLoader } from 'three/examples/jsm/loaders/LDrawLoader.js'
import { BRICK_PARTS, partHeight, type BrickType } from './brickTypes'

const PART_FILE = new Map(BRICK_PARTS.map((item) => [item.type, `parts/${item.ldraw}.dat`]))

const STUD_LDU = 20
const HEIGHT_LDU = 24

export type PartAlign = {
  min: [number, number, number]
  max: [number, number, number]
  triangles: number
  vertices: number
}

const ready = new Map<BrickType, Group>()
const pending = new Map<BrickType, Promise<Group>>()
let loader: LDrawLoader | null = null
let queue: Promise<void> = Promise.resolve()

const EXTRA_ROOTS = ['3023b.dat', '3794a.dat', '4032a.dat', '6141.dat', '3815.dat', '3816.dat', '3817.dat', '3048a.dat']
const ROOT_PARTS = new Set(
  [...BRICK_PARTS.map((item) => `${item.ldraw}.dat`), ...EXTRA_ROOTS].map((name) => name.toLowerCase()),
)

// Vite 对未知路径回 200 的 index.html，LDrawLoader 会把第一次猜中的地址当成文件，不再试 p/ 和 as-is。
// 子零件的第一次请求是 parts/parts/s/...，裸文件名的第一次请求是 parts/xxx.dat。这里改到真实位置。
function rewriteLDrawUrl(url: string) {
  const marker = '/ldraw/'
  const index = url.indexOf(marker)
  if (index < 0) return url
  const prefix = url.slice(0, index + marker.length)
  let rel = url.slice(index + marker.length).replace(/\\/g, '/')
  while (rel.startsWith('parts/parts/')) rel = rel.slice('parts/'.length)
  if (rel.startsWith('parts/p/')) rel = rel.slice('parts/'.length)
  if (rel.startsWith('parts/48/')) rel = `p/${rel.slice('parts/'.length)}`
  if (rel.startsWith('parts/8/')) rel = `p/${rel.slice('parts/'.length)}`
  const flat = /^parts\/([^/]+\.dat)$/i.exec(rel)
  if (flat && !ROOT_PARTS.has(flat[1].toLowerCase())) rel = `p/${flat[1]}`
  return prefix + rel
}

function getLoader() {
  if (!loader) {
    const manager = new LoadingManager()
    manager.setURLModifier(rewriteLDrawUrl)
    loader = new LDrawLoader(manager)
    loader.setPath('/ldraw/')
    loader.setPartsLibraryPath('/ldraw/')
    loader.setConditionalLineMaterial(LDrawConditionalLineMaterial)
  }
  return loader
}

function disposeMaterial(material: Material | Material[]) {
  if (Array.isArray(material)) {
    for (const item of material) item.dispose()
    return
  }
  material.dispose()
}

function stripLines(root: Object3D) {
  const lines: LineSegments[] = []
  root.traverse((obj) => {
    if (obj instanceof LineSegments) lines.push(obj)
  })
  for (const line of lines) {
    line.removeFromParent()
    line.geometry.dispose()
    disposeMaterial(line.material)
  }
}

function countGeometry(root: Object3D) {
  let triangles = 0
  let vertices = 0
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return
    const position = obj.geometry.getAttribute('position')
    if (!position) return
    vertices += position.count
    const index = obj.geometry.getIndex()
    triangles += index ? index.count / 3 : position.count / 3
  })
  return { triangles, vertices }
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000
}

function tuple(x: number, y: number, z: number): [number, number, number] {
  return [round3(x), round3(y), round3(z)]
}

// LDraw 的 Y 轴向下。绕 X 转 180° 让 Y 朝上。
// XZ 上 20 LDU = 1，Y 上 24 LDU = 1。底面贴到局部中心下方的一半高度，凸点留在逻辑顶面之上。
function alignPart(group: Group, type: BrickType): Pick<PartAlign, 'min' | 'max'> {
  group.rotation.x = Math.PI
  group.scale.set(1 / STUD_LDU, 1 / HEIGHT_LDU, 1 / STUD_LDU)
  group.updateMatrixWorld(true)
  const measured = new Box3().setFromObject(group)
  const centerX = (measured.min.x + measured.max.x) / 2
  const centerZ = (measured.min.z + measured.max.z) / 2
  const half = partHeight(type) / 2
  group.position.set(-centerX, -half - measured.min.y, -centerZ)
  group.updateMatrixWorld(true)
  const aligned = new Box3().setFromObject(group)
  return {
    min: tuple(aligned.min.x, aligned.min.y, aligned.min.z),
    max: tuple(aligned.max.x, aligned.max.y, aligned.max.z),
  }
}

async function fetchAligned(type: BrickType) {
  const file = PART_FILE.get(type)
  if (!file) throw new Error(`未知零件 ${type}`)
  const group = await getLoader().loadAsync(file)
  stripLines(group)
  const bounds = alignPart(group, type)
  const counts = countGeometry(group)
  const align: PartAlign = { ...bounds, ...counts }
  group.name = `ldraw-${type}`
  group.userData.partType = type
  group.userData.align = align
  return group
}

function enqueue(type: BrickType) {
  const run = queue.then(() => fetchAligned(type))
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export function peekBrickTemplate(type: BrickType) {
  return ready.get(type) ?? null
}

export function loadBrickTemplate(type: BrickType) {
  const done = ready.get(type)
  if (done) return Promise.resolve(done)
  const inflight = pending.get(type)
  if (inflight) return inflight
  const promise = enqueue(type).then((group) => {
    ready.set(type, group)
    return group
  })
  promise.catch((error: unknown) => {
    console.warn('LDraw 零件加载失败', type, error)
  })
  pending.set(type, promise)
  return promise
}

function tintMaterial(material: Material, color: string) {
  const next = material.clone()
  if (next instanceof MeshStandardMaterial) {
    const code = next.userData?.code
    if (code === undefined || code === '16') {
      next.color.set(color)
      next.emissive.set('#000000')
      next.emissiveIntensity = 0
    }
  }
  return next
}

export function cloneColoredPart(template: Group, color: string) {
  const clone = template.clone(true)
  clone.traverse((obj) => {
    if (!(obj instanceof Mesh)) return
    obj.material = Array.isArray(obj.material)
      ? obj.material.map((material) => tintMaterial(material, color))
      : tintMaterial(obj.material, color)
  })
  return clone
}

export function disposePartMaterials(root: Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return
    disposeMaterial(obj.material)
  })
}
