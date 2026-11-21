// 审计用的几何工具：零件三角形、实体内嵌判定、对齐偏移。
//
// 这些量必须和渲染端一致，否则审的就不是屏幕上摆出来的东西：
//   渲染端 alignPart()：group.rotation.x = π，group.scale = (1/20, 1/24, 1/20)，
//   然后 group.position = (−centerX, −half − measured.min.y, −centerZ)。
import { readFileSync } from 'node:fs'

import {
  apply,
  compose,
  emptyBox,
  grow,
  IDENTITY,
  isEmpty,
  measure,
  parseXform,
  resolve,
  type Box,
  type Xform,
} from './ldraw-geom.ts'

export const STUD = 20
export const HEIGHT = 24

export type Vec3 = [number, number, number]
export type Tri = { a: Vec3; b: Vec3; c: Vec3 }

/** 渲染坐标换算：LDraw → 渲染。Y、Z 取反，X 不变。 */
export const GINV: Xform = {
  a: 1 / STUD, b: 0, c: 0, x: 0,
  d: 0, e: -1 / HEIGHT, f: 0, y: 0,
  g: 0, h: 0, i: -1 / STUD, z: 0,
}

export function translate(x: number, y: number, z: number): Xform {
  return { a: 1, b: 0, c: 0, x, d: 0, e: 1, f: 0, y, g: 0, h: 0, i: 1, z }
}

export function rotMatrix(rot: readonly number[]): Xform {
  return {
    a: rot[0], b: rot[1], c: rot[2], x: 0,
    d: rot[3], e: rot[4], f: rot[5], y: 0,
    g: rot[6], h: rot[7], i: rot[8], z: 0,
  }
}

const triCache = new Map<string, Tri[]>()
const boxCache = new Map<string, Box>()
const descCache = new Map<string, string>()
const primitiveCache = new Map<string, boolean>()

/** 文件头里不是零件名的那几类行。 */
const META_HEADER = /^(Name|Author|!|BFC|CATEGORY|KEYWORDS|HISTORY)/i

/**
 * 零件的官方名（LDraw 文件头第一行），比如 "Brick  2 x  4"。
 * 审计靠它判断连接语义（人偶、铰链、夹子、轴销……）。
 */
export function partDesc(file: string): string {
  const cached = descCache.get(file)
  if (cached !== undefined) return cached
  const path = resolve(file)
  let desc = ''
  let primitive = false
  if (path) {
    for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const line = raw.trim()
      if (!line.startsWith('0 ')) continue
      const body = line.replace(/^0\s*/, '').trim()
      if (body.includes('!LDRAW_ORG Primitive')) primitive = true
      if (!desc && !META_HEADER.test(body)) desc = body
    }
  }
  descCache.set(file, desc)
  primitiveCache.set(file, primitive)
  return desc
}

/**
 * 是不是 LDraw 原始图元（primitive）。
 *
 * 图元是渲染辅助几何：圆弧、球面、圆环、线条都没有实体厚度，
 * 官方模型拿它们当装饰（摩天轮辐条、路灯灯球）。
 * 拿它们做体积重叠、悬空、连通性判定只会得到假问题，必须排除。
 */
export function isPrimitive(file: string): boolean {
  partDesc(file)
  return primitiveCache.get(file) ?? false
}

/** 零件的局部包围盒（LDraw 坐标）。 */
export function partBox(file: string): Box {
  const cached = boxCache.get(file)
  if (cached) return cached
  const box = emptyBox()
  measure(file, IDENTITY, box)
  if (isEmpty(box)) {
    // 空几何零件（比如只画边的适配环）：退化成一点，量不出来就当没有体积。
    box.minX = 0; box.maxX = 0; box.minY = 0; box.maxY = 0; box.minZ = 0; box.maxZ = 0
  }
  boxCache.set(file, box)
  return box
}

/** 零件的全部三角形（局部 LDraw 坐标）。渲染器会递归加载 s/ 下的细分件，审计也要算进去。 */
export function partTriangles(file: string): Tri[] {
  const cached = triCache.get(file)
  if (cached) return cached
  const out: Tri[] = []
  collectTriangles(file, IDENTITY, out, 0)
  triCache.set(file, out)
  return out
}

function collectTriangles(file: string, xform: Xform, out: Tri[], depth: number) {
  if (depth > 12) return
  const path = resolve(file)
  if (!path) return
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('1 ')) {
      const sub1 = parseXform(line)
      if (!sub1) continue
      const tokens = line.split(/\s+/)
      collectTriangles(tokens.slice(14).join(' ').trim(), compose(xform, sub1), out, depth + 1)
      continue
    }
    if (line.startsWith('3 ')) {
      // type 3 = 三角形，三个顶点都写在行里（和 three.js 的 LDrawLoader 一致）。
      // 早先只取了第一个顶点，把整个圆盘/端盖都变成退化三角形，
      // 奇偶法就少了这些面 → 钉顶、圆柱端盖都判不出来。
      const nums = line.split(/\s+/).slice(2).map(Number)
      if (nums.length < 9 || !nums.slice(0, 9).every((value) => Number.isFinite(value))) continue
      out.push({
        a: apply(xform, [nums[0], nums[1], nums[2]]),
        b: apply(xform, [nums[3], nums[4], nums[5]]),
        c: apply(xform, [nums[6], nums[7], nums[8]]),
      })
      continue
    }
    if (line.startsWith('4 ')) {
      const nums = line.split(/\s+/).slice(2).map(Number)
      if (nums.length < 12 || !nums.every((value) => Number.isFinite(value))) continue
      const p = (i: number): Vec3 => apply(xform, [nums[i], nums[i + 1], nums[i + 2]])
      const v0 = p(0)
      const v1 = p(3)
      const v2 = p(6)
      const v3 = p(9)
      out.push({ a: v0, b: v1, c: v2 })
      out.push({ a: v0, b: v2, c: v3 })
    }
  }
}

/**
 * 渲染端 alignPart() 的对齐偏移。
 *
 * 渲染把 LDraw 坐标翻过来（Y、Z 取反）再各向异性缩放，
 * 所以包围盒中心在对齐后是 −centerX / −centerZ，
 * 而 group.position.z = −centerZ = +(minZ+maxZ)/40（z 分量是 +cz）。
 */
export function alignOffset(file: string, plates: number): Vec3 {
  const box = partBox(file)
  const cx = (box.minX + box.maxX) / 2 / STUD
  const cz = (box.minZ + box.maxZ) / 2 / STUD
  const half = plates / 6
  return [-cx, -half + box.maxY / HEIGHT, cz]
}

export function transformTris(tris: Tri[], m: Xform): Tri[] {
  return tris.map((tri) => ({
    a: apply(m, tri.a),
    b: apply(m, tri.b),
    c: apply(m, tri.c),
  }))
}

export function boxOfTris(tris: Tri[]): Box {
  const box = emptyBox()
  for (const tri of tris) {
    grow(box, tri.a[0], tri.a[1], tri.a[2])
    grow(box, tri.b[0], tri.b[1], tri.b[2])
    grow(box, tri.c[0], tri.c[1], tri.c[2])
  }
  return box
}

