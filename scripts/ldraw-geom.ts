// LDraw 几何的公共解析。
//
// 矩阵约定必须和渲染端一致：three.js 的 LDrawLoader 用
//   Matrix4.set(a, b, c, tx,  d, e, f, ty,  g, h, i, tz,  0, 0, 0, 1)
// 而 Matrix4.set 里 te[0]=a、te[4]=b、te[8]=c、te[12]=tx，
// Vector3.applyMatrix4 又按 x' = te[0]·x + te[4]·y + te[8]·z + te[12] 取值，
// 所以实际是
//   x' = a·x + b·y + c·z + tx
//   y' = d·x + e·y + f·z + ty
//   z' = g·x + h·y + i·z + tz
// 即 (a,b,c)、(d,e,f)、(g,h,i) 是三行，也就是行向量约定。
//
// 物理论证：躯干肩窝 `0.85 1.97 0 / 4.925 -0.34 0 / 0 0 5` 在这个约定下
// 得到半径 5、长度 2、轴向正好 9.782° 倾斜的圆柱，和 LDraw 官方注释一致；
// 反过来按列向量算会得到一个椭圆，根本不是圆柱。
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

export const ROOTS = ['public/ldraw/parts', 'public/ldraw/p']

const INDEX = new Map<string, { path: string; depth: number }>()

// p/48/、p/8/ 里有一批同名图元（LDraw 的 48 倍缩放版本）。
// 直接引用 “4-4cyli.dat” 时必须取 p/ 下的本体，所以索引时偏浅的路径优先。
function scan(dir: string, depth: number) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      scan(full, depth + 1)
      continue
    }
    if (!entry.toLowerCase().endsWith('.dat')) continue
    const key = entry.toLowerCase()
    const found = INDEX.get(key)
    if (!found || depth < found.depth) INDEX.set(key, { path: full.replace(/\\/g, '/'), depth })
  }
}

export function indexLibrary(roots: readonly string[] = ROOTS) {
  for (const root of roots) scan(root, 0)
}

export function resolve(name: string): string | null {
  const key = name.toLowerCase().replace(/\\/g, '/')
  const direct = INDEX.get(key)
  if (direct) return direct.path
  const base = key.slice(key.lastIndexOf('/') + 1)
  return INDEX.get(base)?.path ?? null
}

export type Xform = {
  x: number
  y: number
  z: number
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
  g: number
  h: number
  i: number
}

export const IDENTITY: Xform = {
  a: 1, b: 0, c: 0, x: 0,
  d: 0, e: 1, f: 0, y: 0,
  g: 0, h: 0, i: 1, z: 0,
}

export type Vec3 = [number, number, number]

/** 只作用旋转部分。 */
export function rotate(m: Xform, v: Vec3): Vec3 {
  return [
    m.a * v[0] + m.b * v[1] + m.c * v[2],
    m.d * v[0] + m.e * v[1] + m.f * v[2],
    m.g * v[0] + m.h * v[1] + m.i * v[2],
  ]
}

/** 完整作用（旋转 + 平移）。 */
export function apply(m: Xform, v: Vec3): Vec3 {
  const r = rotate(m, v)
  return [r[0] + m.x, r[1] + m.y, r[2] + m.z]
}

/**
 * 矩阵连乘：结果等价于先作用 s 再作用 m。
 * 行向量约定下，M·S 的第 j 列就是 M 作用在 S 的第 j 列上。
 */
export function compose(m: Xform, s: Xform): Xform {
  const c1 = rotate(m, [s.a, s.d, s.g])
  const c2 = rotate(m, [s.b, s.e, s.h])
  const c3 = rotate(m, [s.c, s.f, s.i])
  const t = rotate(m, [s.x, s.y, s.z])
  return {
    a: c1[0], b: c2[0], c: c3[0], x: t[0] + m.x,
    d: c1[1], e: c2[1], f: c3[1], y: t[1] + m.y,
    g: c1[2], h: c2[2], i: c3[2], z: t[2] + m.z,
  }
}

/** 解析一行 `1 <color> x y z a b c d e f g h i <file>`。 */
export function parseXform(line: string): Xform | null {
  const t = line.trim().split(/\s+/)
  if (t[0] !== '1') return null
  const n = t.slice(2, 14).map(Number)
  if (n.length < 12 || n.some((v) => !Number.isFinite(v))) return null
  const [x, y, z, a, b, c, d, e, f, g, h, i] = n
  return { a, b, c, x, d, e, f, y, g, h, i, z }
}

export type Box = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export function emptyBox(): Box {
  return {
    minX: Infinity, maxX: -Infinity,
    minY: Infinity, maxY: -Infinity,
    minZ: Infinity, maxZ: -Infinity,
  }
}

export function grow(box: Box, x: number, y: number, z: number) {
  box.minX = Math.min(box.minX, x)
  box.maxX = Math.max(box.maxX, x)
  box.minY = Math.min(box.minY, y)
  box.maxY = Math.max(box.maxY, y)
  box.minZ = Math.min(box.minZ, z)
  box.maxZ = Math.max(box.maxZ, z)
}

export function isEmpty(box: Box) {
  return !Number.isFinite(box.minX)
}

/** 量一个零件在给定坐标系里的包围盒。 */
export function measure(file: string, xform: Xform, box: Box, depth = 0) {
  if (depth > 12) return
  const path = resolve(file)
  if (!path) return
  const text = readFileSync(path, 'utf8')
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('0')) continue
    if (line.startsWith('1 ')) {
      const sub = parseXform(line)
      if (sub) {
        const tokens = line.split(/\s+/)
        measure(tokens[tokens.length - 1], compose(xform, sub), box, depth + 1)
      }
      continue
    }
    if (line.startsWith('3 ')) {
      const c = line.split(/\s+/).slice(2, 5).map(Number)
      if (c.length === 3 && c.every((v) => Number.isFinite(v))) {
        const p = apply(xform, [c[0], c[1], c[2]])
        grow(box, p[0], p[1], p[2])
      }
      continue
    }
    if (line.startsWith('4 ')) {
      // 4 行有 3 个或 4 个点，必须全部读，否则圆柱面会只剩一条边。
      const nums = line.split(/\s+/).slice(2).map(Number)
      for (let index = 0; index + 2 < nums.length; index += 3) {
        if (!nums.slice(index, index + 3).every((value) => Number.isFinite(value))) continue
        const p = apply(xform, [nums[index], nums[index + 1], nums[index + 2]])
        grow(box, p[0], p[1], p[2])
      }
    }
  }
}

/** 直接子零件的引用（只取 `1` 行）。 */
export function children(file: string): { name: string; xform: Xform }[] {
  const path = resolve(file)
  if (!path) return []
  const out: { name: string; xform: Xform }[] = []
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line.startsWith('1 ')) continue
    const xform = parseXform(line)
    if (!xform) continue
    const tokens = line.split(/\s+/)
    out.push({ name: tokens[tokens.length - 1], xform })
  }
  return out
}
