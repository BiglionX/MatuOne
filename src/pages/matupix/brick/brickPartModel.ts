import { Box3, DoubleSide, Group, LineBasicMaterial, LineSegments, LoadingManager, Mesh, MeshStandardMaterial, type Material, type Object3D } from 'three'
import { LDrawConditionalLineMaterial } from 'three/examples/jsm/materials/LDrawConditionalLineMaterial.js'
import { LDrawLoader } from 'three/examples/jsm/loaders/LDrawLoader.js'
import { MAGIC_PARTS } from './brickMagicParts'
import { LDRAW_FILE_PATHS } from './brickLdrawManifest'
import { BRICK_PARTS, partHeight, type BrickType } from './brickTypes'

const PART_FILE = new Map<string, string>([
  ...BRICK_PARTS.map((item): [string, string] => [item.type as string, `parts/${item.ldraw}.dat`]),
  ...MAGIC_PARTS.map((item): [string, string] => [item.type as string, item.path ?? `parts/${item.ldraw}.dat`]),
])

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

// 零件加载的并发上限。
// 一个魔法模型要用几十种零件，串行加载会让弹窗等很久；并发 8 个是网络和解析的平衡点。
const MAX_CONCURRENT = 8
let active = 0
const waiters: (() => void)[] = []

const EXTRA_ROOTS = ['3023b.dat', '3794a.dat', '4032a.dat', '6141.dat', '3815.dat', '3816.dat', '3817.dat', '3048a.dat']
const ROOT_PARTS = new Set(
  [...BRICK_PARTS.map((item) => `${item.ldraw}.dat`), ...EXTRA_ROOTS].map((name) => name.toLowerCase()),
)

// Vite 对未知路径回 200 的 index.html，LDrawLoader 会把第一次猜中的地址当成文件，不再试 p/ 和 as-is。
// 子零件的第一次请求是 parts/parts/s/...，裸文件名的第一次请求是 parts/xxx.dat。这里改到真实位置。
//
// 清单里记着 public/ldraw 下每个文件的真实路径（带目录和裸名两种写法），
// 优先按清单命中：第一次请求就落在真实文件上，零件不会加载成空的。
function rewriteLDrawUrl(url: string) {
  const marker = '/ldraw/'
  const index = url.indexOf(marker)
  if (index < 0) return url
  const prefix = url.slice(0, index + marker.length)
  let rel = url.slice(index + marker.length).replace(/\\/g, '/')
  while (rel.startsWith('parts/parts/')) rel = rel.slice('parts/'.length)
  const hit = LDRAW_FILE_PATHS[rel.toLowerCase()]
  if (hit) return prefix + hit
  if (rel.startsWith('parts/p/')) rel = rel.slice('parts/'.length)
  if (rel.startsWith('parts/48/')) rel = `p/${rel.slice('parts/'.length)}`
  if (rel.startsWith('parts/8/')) rel = `p/${rel.slice('parts/'.length)}`
  const flat = /^parts\/([^/]+\.dat)$/i.exec(rel)
  if (flat && !ROOT_PARTS.has(flat[1].toLowerCase())) rel = `p/${flat[1]}`
  return prefix + rel
}

// LDraw 官方颜色表。这份零件库只用到三个颜色号：16 主色、24 边线色、0 黑色。
// 加载器自带 16 和 24，缺 0：不注册的话，加载器会退回洋红兜底材质，
// 人偶脸上的眼睛和嘴（颜色 0）就跟着主色一起被涂掉，脸就没了。
const LDRAW_BLACK = new MeshStandardMaterial({ color: '#05131D', roughness: 0.35, metalness: 0 })
LDRAW_BLACK.userData.code = '0'
LDRAW_BLACK.name = 'LDraw_Black'

// 颜色 0 的边线材质和条件线材质。
//
// three 的加载器只在解析 !COLOUR 指令时，才把「边线材质 → 条件线材质」这一对写进缓存。
// 我们手动塞进去的黑色主材质没走那条路，于是颜色 0 的条件线查不到材质（undefined）；
// 材质库里没有的颜色码，加载器自带的兜底条件线材质又正好是 null。
// 两种空材质都会在释放边线时炸掉，整个零件加载失败 —— 这里都补上真的。
const LDRAW_BLACK_EDGE = new LineBasicMaterial({ color: '#333333' })
const LDRAW_BLACK_COND = new LDrawConditionalLineMaterial({ fog: true })
LDRAW_BLACK_COND.uniforms.diffuse.value.set('#333333')
const MISSING_COND = new LDrawConditionalLineMaterial({ fog: true })
MISSING_COND.uniforms.diffuse.value.set('#FF00FF')

// 加载器每次 load 都会把材质表重置成默认的两个材质，这里包一层把官方颜色装回去。
// 边线材质缓存按材质索引：颜色 0 的零件如果带边线，没有这条会拿到 undefined，
// 后面释放材质时就会炸。类型声明里没有这些字段，按实际结构取。
type LDrawLoaderInternals = {
  edgeMaterialCache?: WeakMap<Material, Material>
  conditionalEdgeMaterialCache?: WeakMap<Material, Material>
  missingEdgeColorMaterial?: Material
  missingConditionalEdgeColorMaterial?: Material
}

function applyLDrawColors(target: LDrawLoader) {
  const base = target.setMaterials.bind(target)
  target.setMaterials = (materials: Material[]) => base([LDRAW_BLACK, ...materials])
  const internals = target as unknown as LDrawLoaderInternals
  internals.edgeMaterialCache?.set(LDRAW_BLACK, LDRAW_BLACK_EDGE)
  internals.conditionalEdgeMaterialCache?.set(LDRAW_BLACK_EDGE, LDRAW_BLACK_COND)
  // 材质库里没有的颜色码，加载器拿洋红兜底，并且把兜底的条件线材质置成 null。
  // 换成真的洋红条件线材质，条件线才不会拿到空材质。
  if (internals.missingEdgeColorMaterial) {
    internals.missingConditionalEdgeColorMaterial = MISSING_COND
    internals.conditionalEdgeMaterialCache?.set(internals.missingEdgeColorMaterial, MISSING_COND)
  }
}

function getLoader() {
  if (!loader) {
    const manager = new LoadingManager()
    manager.setURLModifier(rewriteLDrawUrl)
    loader = new LDrawLoader(manager)
    loader.setPath('/ldraw/')
    loader.setPartsLibraryPath('/ldraw/')
    loader.setConditionalLineMaterial(LDrawConditionalLineMaterial)
    applyLDrawColors(loader)
  }
  return loader
}

function disposeMaterial(material: Material | Material[] | null | undefined) {
  // 边线材质有可能取不到：加载器对条件线和缺失颜色码都可能给出空材质。
  // 这里放空，整个零件就加载失败退化成方块了，所以必须挡一层。
  if (!material) return
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
    // 边线材质是加载器在整个 load 期间共享的（缓存挂在 loader 上），
    // 释放掉会让同一批次的其它零件丢边线。边线本来就要去掉，材质留着无害。
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

export const PART_ROLL = 'part-roll'
export const PART_TILT = 'part-tilt'
// 绕插销的自由旋转（spin）：作用在零件局部 LDraw 坐标、绕销轴，支点是 LDraw 原点。
// 放在官方矩阵内侧，这样任意姿态下都绕自己的销转，而不是绕世界竖直轴。
export const PART_SPIN = 'part-spin'
// LDraw 矩阵层：官方模型里的零件带任意角度的姿态，转向/摆角/滚角三个档位表达不了，
// 所以多留一层直接吃 LDraw 矩阵。层级在 align 里面、零件外面，作用在 LDraw 坐标里。
export const PART_LDRAW_ROT = 'part-ldraw-rot'

function paintDoubleSided(root: Object3D) {
  // 帆、翼板是单薄面：只画正面时，从背面/侧边看面消失，只剩钉和卡口，像零件飘在空中。
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
    for (const material of materials) {
      if (material && 'side' in material) material.side = DoubleSide
    }
  })
}

async function fetchAligned(type: BrickType) {
  const file = PART_FILE.get(type)
  if (!file) throw new Error(`未知零件 ${type}`)
  const loaded = await getLoader().loadAsync(file)
  stripLines(loaded)
  paintDoubleSided(loaded)
  // 摆角和滚角必须作用在 LDraw 坐标上：缩放是 XZ 1/20、Y 1/24 的各向异性，
  // 放在缩放之后旋转会被拉歪（45 度摆角看着像 56 度）。
  // 所以在几何外面套多层空的 group：spin → 滚角 → 摆角，支点都是零件的 LDraw 原点。
  // 层级：ldrawRot > spin > roll > tilt > 几何。spin 在矩阵内侧，绕局部销轴。
  const tilt = new Group()
  tilt.name = PART_TILT
  const roll = new Group()
  roll.name = PART_ROLL
  const spin = new Group()
  spin.name = PART_SPIN
  const ldrawRot = new Group()
  ldrawRot.name = PART_LDRAW_ROT
  tilt.add(loaded)
  roll.add(tilt)
  spin.add(roll)
  ldrawRot.add(spin)
  const root = new Group()
  root.add(ldrawRot)
  const bounds = alignPart(root, type)
  const counts = countGeometry(root)
  const align: PartAlign = { ...bounds, ...counts }
  root.name = `ldraw-${type}`
  root.userData.partType = type
  root.userData.align = align
  return root
}

function enqueue(type: BrickType) {
  return new Promise<Group>((resolve, reject) => {
    const release = () => {
      active -= 1
      const next = waiters.shift()
      if (next) next()
    }
    const start = () => {
      fetchAligned(type).then(
        (group) => {
          release()
          resolve(group)
        },
        (error: unknown) => {
          release()
          reject(error)
        },
      )
    }
    if (active < MAX_CONCURRENT) {
      active += 1
      start()
      return
    }
    waiters.push(() => {
      active += 1
      start()
    })
  })
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
  if ('side' in next) next.side = DoubleSide
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
