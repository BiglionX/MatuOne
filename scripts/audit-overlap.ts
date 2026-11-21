// 体积重叠检测：判断两个零件的「实心区域」是不是真的互相嵌进去了。
//
// 判定用奇偶法（射线穿越次数的奇偶性）：
//   从查询点沿某个方向打一条射线，数它穿过对方表面几次。奇数 → 在实体内，偶数 → 在实体外。
//   中空部分算「外部」正好符合积木的物理直觉：插销插进孔里、轴穿过轮胎，
//   表面上看包围盒是套着的，但材料并没有真的压在一起，不算重叠。
//
// 为什么不用包围盒：包围盒会把「斜面贴着轮子」「板压在轮胎上」这种
//   挨着但没嵌进去的情况也报成重叠 —— 之前就是被这个坑了一轮。
// 为什么不用绕数：LDraw 里很多老零件没做 BFC 认证，绕数在它们身上会给出负值或乱值，
//   没法当判据。
//
// 为什么不能只用一个方向：LDraw 零件是壳体，不是封闭实体。
//   比如 6019（Plate 1x1 with Clip）底面被一块面片封死，
//   沿 +Y 打射线只会数到「天花板 + 封死的底面」两次穿越 → 偶数 → 判成空；
//   反过来沿 +Y 只看底面又会数成一次穿越 → 奇数 → 把空腔判成实心。
//   一个方向对不对，取决于零件的开口朝哪边。
//   所以这里沿 ±X / ±Y / ±Z 六个方向各打一条射线，取多数票。
//   封闭实心体六个方向一致；空腔则多数方向都会给出「外部」。
//
// 坐标系：所有零件必须摆在同一个坐标系里。审计脚本用 LDraw 官方坐标系，
//   因为渲染链和官方链只差一个可逆仿射变换，仿射变换不改变「是否重叠」。
import { emptyBox, grow, type Box } from './ldraw-geom.ts'
import { type Tri, type Vec3 } from './audit-solid.ts'

/** 每个候选零件对在交集区域里打多少个采样点。 */
const SAMPLES = 48
/** 交集厚度小于这个值（LDU）就当作「只是贴着」，不算重叠。 */
const MIN_OVERLAP = 0.2
/** 点正好落在表面上时的容差（LDU），这种点判不了内外。 */
const SURFACE_EPS = 1e-6
/** 同一个表面（扇形图元的共用顶点）的高度去重阈值（LDU）。 */
const SAME_SURFACE_EPS = 1e-4

export type SolidPart = {
  label: string
  tris: Tri[]
  /**
   * 世界坐标 → 零件局部坐标。
   * 用来判断重叠发生在零件的哪个部位：钉区还是砖体。
   */
  toLocal?: (p: Vec3) => Vec3
}

export type OverlapHit = {
  a: string
  b: string
  /** 落在双方实体内的采样点数。 */
  hits: number
  /** 总采样点数。 */
  samples: number
  /** 估算的重叠体积（LDU³）。 */
  volume: number
  /** 第一个命中点（LDU）。 */
  point: Vec3
  /** 全部命中点（LDU）。 */
  points: Vec3[]
}

/** XZ/YZ/XY 网格之一：把三角形按投影格子分桶。 */
type Grid = {
  cell: number
  originU: number
  originV: number
  cells: Map<number, number[]>
}

export type PartSolid = {
  label: string
  tris: Tri[]
  box: Box
  /** 每个轴一个网格，索引 0=x、1=y、2=z。 */
  grids: Grid[]
}

/** 稳定的伪随机数，保证每次审计结果一致。 */
function rng(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function boxOf(tris: Tri[]): Box {
  const box = emptyBox()
  for (const tri of tris) {
    grow(box, tri.a[0], tri.a[1], tri.a[2])
    grow(box, tri.b[0], tri.b[1], tri.b[2])
    grow(box, tri.c[0], tri.c[1], tri.c[2])
  }
  return box
}

/**
 * 三角形在 axis 轴上的表面位置。
 * 给定另外两个轴上的坐标 (u, v)，求三角形表面在 axis 轴上的坐标。
 * 点不落在三角形在 (u, v) 平面上的投影里 → 返回 null（射线打不到）。
 */
function surfaceAxis(tri: Tri, axis: number, u: number, v: number): number | null {
  const b = (axis + 1) % 3
  const c = (axis + 2) % 3
  const v0u = tri.b[b] - tri.a[b]
  const v0v = tri.b[c] - tri.a[c]
  const v1u = tri.c[b] - tri.a[b]
  const v1v = tri.c[c] - tri.a[c]
  const den = v0u * v1v - v1u * v0v
  if (Math.abs(den) < 1e-12) return null
  const wu = u - tri.a[b]
  const wv = v - tri.a[c]
  const s = (wu * v1v - v1u * wv) / den
  const t = (v0u * wv - wu * v0v) / den
  if (s < -1e-9 || t < -1e-9 || s + t > 1 + 1e-9) return null
  return tri.a[axis] + s * (tri.b[axis] - tri.a[axis]) + t * (tri.c[axis] - tri.a[axis])
}

/** 包围盒在某个轴上的上下界。axis：0=x、1=y、2=z。 */
function boxAxis(box: Box, axis: number): [number, number] {
  if (axis === 0) return [box.minX, box.maxX]
  if (axis === 1) return [box.minY, box.maxY]
  return [box.minZ, box.maxZ]
}

/** 建一个投影网格：把三角形按 (b, c) 两个轴的包围盒塞进格子。 */
function buildGrid(tris: Tri[], axis: number, box: Box): Grid {
  const b = (axis + 1) % 3
  const c = (axis + 2) % 3
  const [minU, maxU] = boxAxis(box, b)
  const [minV, maxV] = boxAxis(box, c)
  const spanU = maxU - minU
  const spanV = maxV - minV
  const cell = Math.max(4, Math.max(spanU, spanV) / 8)
  const originU = minU
  const originV = minV
  const cells = new Map<number, number[]>()
  tris.forEach((tri, index) => {
    const loU = Math.floor((Math.min(tri.a[b], tri.b[b], tri.c[b]) - originU) / cell)
    const hiU = Math.floor((Math.max(tri.a[b], tri.b[b], tri.c[b]) - originU) / cell)
    const loV = Math.floor((Math.min(tri.a[c], tri.b[c], tri.c[c]) - originV) / cell)
    const hiV = Math.floor((Math.max(tri.a[c], tri.b[c], tri.c[c]) - originV) / cell)
    for (let iu = loU; iu <= hiU; iu += 1) {
      for (let iv = loV; iv <= hiV; iv += 1) {
        const key = iu * 1048576 + iv
        const list = cells.get(key)
        if (list) list.push(index)
        else cells.set(key, [index])
      }
    }
  })
  return { cell, originU, originV, cells }
}

/** 零件的实心区域：三角形 + 三个方向的网格索引。 */
export function buildSolid(part: SolidPart): PartSolid {
  const box = boxOf(part.tris)
  if (!Number.isFinite(box.minX)) {
    box.minX = 0; box.maxX = 0
    box.minY = 0; box.maxY = 0
    box.minZ = 0; box.maxZ = 0
  }
  return {
    label: part.label,
    tris: part.tris,
    box,
    grids: [buildGrid(part.tris, 0, box), buildGrid(part.tris, 1, box), buildGrid(part.tris, 2, box)],
  }
}

/**
 * 射线穿过的表面位置（沿 axis 轴）。
 *
 * 关键：LDraw 的圆盘/圆柱图元（4-4disc.dat 等）是扇形三角面，
 * 所有三角形共用同一个顶点。射线正好穿过扇心时，
 * 那个顶点上的所有三角形都会被算成一次穿越 → 穿越次数翻倍 → 内外判反。
 * 所以这里要按高度去重：同一个高度只算一次穿越。
 */
function crossingsAlong(solid: PartSolid, p: Vec3, axis: number): number[] {
  const b = (axis + 1) % 3
  const c = (axis + 2) % 3
  const grid = solid.grids[axis]
  const iu = Math.floor((p[b] - grid.originU) / grid.cell)
  const iv = Math.floor((p[c] - grid.originV) / grid.cell)
  if (iu < 0 || iv < 0) return []
  const bucket = grid.cells.get(iu * 1048576 + iv)
  if (!bucket) return []
  const heights: number[] = []
  for (const index of bucket) {
    const t = surfaceAxis(solid.tris[index], axis, p[b], p[c])
    if (t === null) continue
    heights.push(t)
  }
  if (!heights.length) return []
  heights.sort((a, b) => a - b)
  const out: number[] = []
  for (const h of heights) {
    const last = out[out.length - 1]
    if (last === undefined || h - last > SAME_SURFACE_EPS) out.push(h)
  }
  return out
}

/**
 * 点在实体内吗？on = 正好落在表面上，判不了。
 *
 * 沿 ±X / ±Y / ±Z 六个方向各打一条射线，多数票决定内外。
 */
export function insideByParity(solid: PartSolid, p: Vec3): 'in' | 'out' | 'on' {
  let votes = 0
  for (let axis = 0; axis < 3; axis += 1) {
    const heights = crossingsAlong(solid, p, axis)
    for (const h of heights) {
      if (Math.abs(h - p[axis]) <= SURFACE_EPS) return 'on'
    }
    // 正方向：从 p 往 +axis 走，穿越次数奇数 → 实体内。
    let forward = 0
    for (const h of heights) if (h > p[axis]) forward += 1
    // 负方向：从 p 往 -axis 走。
    const backward = heights.length - forward
    votes += forward % 2 === 1 ? 1 : 0
    votes += backward % 2 === 1 ? 1 : 0
  }
  return votes > 3 ? 'in' : 'out'
}

/** 找出所有实心区域互相嵌入的零件对。 */
export function findOverlaps(parts: SolidPart[]): OverlapHit[] {
  const solids = parts.map(buildSolid)
  const hits: OverlapHit[] = []
  for (let i = 0; i < solids.length; i += 1) {
    for (let j = i + 1; j < solids.length; j += 1) {
      const a = solids[i]
      const b = solids[j]
      const minX = Math.max(a.box.minX, b.box.minX)
      const maxX = Math.min(a.box.maxX, b.box.maxX)
      const minY = Math.max(a.box.minY, b.box.minY)
      const maxY = Math.min(a.box.maxY, b.box.maxY)
      const minZ = Math.max(a.box.minZ, b.box.minZ)
      const maxZ = Math.min(a.box.maxZ, b.box.maxZ)
      const sizeX = maxX - minX
      const sizeY = maxY - minY
      const sizeZ = maxZ - minZ
      // 交集在任一轴上退化 → 只是面接触，不是体积重叠。
      if (sizeX <= MIN_OVERLAP || sizeY <= MIN_OVERLAP || sizeZ <= MIN_OVERLAP) continue

      const random = rng(i * 7919 + j * 104729)
      const points: Vec3[] = []
      for (let s = 0; s < SAMPLES; s += 1) {
        const p: Vec3 = [
          minX + random() * sizeX,
          minY + random() * sizeY,
          minZ + random() * sizeZ,
        ]
        if (insideByParity(a, p) !== 'in') continue
        if (insideByParity(b, p) !== 'in') continue
        points.push(p)
      }
      if (points.length > 0) {
        hits.push({
          a: a.label,
          b: b.label,
          hits: points.length,
          samples: SAMPLES,
          volume: (points.length / SAMPLES) * sizeX * sizeY * sizeZ,
          point: points[0],
          points,
        })
      }
    }
  }
  return hits
}
