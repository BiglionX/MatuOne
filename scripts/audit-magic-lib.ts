// 审计魔法模型用到的零件在零件库里是否齐全。
//
// 校验两件事：
// 1) 模型用的每个零件类型在 BRICK_PARTS 里有登记，且对应的 .dat 文件在 public/ldraw 下；
// 2) 这些零件的所有子件引用（含孙件）都能按渲染端的解析规则找到。
//    渲染端 LDrawLoader 依次试 parts/、p/、models/、父目录相对路径，再试小写，
//    这里照抄同一套顺序，否则"文件存在但渲染缺块"的问题查不出来。
//
// 用法：npx tsx scripts/audit-magic-lib.ts
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { MAGIC_MODELS } from '../src/pages/matupix/brick/brickMagicModels.ts'
import { BRICK_PARTS, type BrickType } from '../src/pages/matupix/brick/brickTypes.ts'
import { PART_ORIGINS } from '../src/pages/matupix/brick/brickPartOrigins.ts'

// —— LDraw 几何小工具（与 three.js LDrawLoader 同一套列向量约定）——
type Vec3 = [number, number, number]
type Xform = {
  x: number; y: number; z: number
  a: number; b: number; c: number
  d: number; e: number; f: number
  g: number; h: number; i: number
}
type Box = {
  minX: number; maxX: number
  minY: number; maxY: number
  minZ: number; maxZ: number
}

const IDENTITY: Xform = {
  x: 0, y: 0, z: 0, a: 1, b: 0, c: 0, d: 0, e: 1, f: 0, g: 0, h: 0, i: 1,
}

/** 只作用旋转部分。 */
function rotate(m: Xform, v: Vec3): Vec3 {
  return [
    m.a * v[0] + m.b * v[1] + m.c * v[2],
    m.d * v[0] + m.e * v[1] + m.f * v[2],
    m.g * v[0] + m.h * v[1] + m.i * v[2],
  ]
}

/** 完整作用（旋转 + 平移）。 */
function apply(m: Xform, v: Vec3): Vec3 {
  const r = rotate(m, v)
  return [r[0] + m.x, r[1] + m.y, r[2] + m.z]
}

/** 矩阵连乘：先作用 s 再作用 m。 */
function compose(m: Xform, s: Xform): Xform {
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
function parseXform(line: string): Xform | null {
  const t = line.trim().split(/\s+/)
  if (t[0] !== '1') return null
  const n = t.slice(2, 14).map(Number)
  if (n.length < 12 || n.some((v) => !Number.isFinite(v))) return null
  const [x, y, z, a, b, c, d, e, f, g, h, i] = n
  return { a, b, c, x, d, e, f, y, g, h, i, z }
}

function emptyBox(): Box {
  return { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity }
}

function grow(box: Box, p: Vec3) {
  box.minX = Math.min(box.minX, p[0])
  box.maxX = Math.max(box.maxX, p[0])
  box.minY = Math.min(box.minY, p[1])
  box.maxY = Math.max(box.maxY, p[1])
  box.minZ = Math.min(box.minZ, p[2])
  box.maxZ = Math.max(box.maxZ, p[2])
}

/** 量一个子件在父坐标系里的包围盒（按渲染端的解析规则找文件）。 */
function measure(rel: string, xform: Xform, box: Box, parentDir: string, depth = 0) {
  if (depth > 12) return
  const text = readFileSync(join(ROOT, rel), 'utf8')
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('0')) continue
    if (line.startsWith('1 ')) {
      const sub = parseXform(line)
      if (!sub) continue
      const tokens = line.split(/\s+/)
      const hit = locate(tokens[tokens.length - 1])
      if (!hit) continue
      measure(hit, compose(xform, sub), box, dirOf(hit), depth + 1)
      continue
    }
    if (line.startsWith('3 ')) {
      const c = line.split(/\s+/).slice(2, 5).map(Number)
      if (c.length === 3 && c.every((v) => Number.isFinite(v))) grow(box, apply(xform, [c[0], c[1], c[2]]))
      continue
    }
    if (line.startsWith('4 ')) {
      const nums = line.split(/\s+/).slice(2).map(Number)
      for (let i = 0; i + 2 < nums.length; i += 3) {
        if (!nums.slice(i, i + 3).every((v) => Number.isFinite(v))) continue
        grow(box, apply(xform, [nums[i], nums[i + 1], nums[i + 2]]))
      }
    }
  }
}

const ROOT = 'public/ldraw'

// public/ldraw 下所有 .dat 的索引（小写相对路径 -> 实际相对路径）。
const INDEX = new Map<string, string>()

function scan(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      scan(full)
      continue
    }
    if (!entry.toLowerCase().endsWith('.dat')) continue
    const rel = relative(ROOT, full).replace(/\\/g, '/')
    const key = rel.toLowerCase()
    if (!INDEX.has(key)) INDEX.set(key, rel)
  }
}

scan(ROOT)

/** 渲染端 brickPartModel.ts 的 ROOT_PARTS：这些文件在 parts/ 下，其余平铺引用改指 p/。 */
const EXTRA_ROOTS = ['3023b.dat', '3794a.dat', '4032a.dat', '6141.dat', '3815.dat', '3816.dat', '3817.dat', '3048a.dat']
const ROOT_PARTS = new Set(
  [...BRICK_PARTS.map((item) => `${item.ldraw}.dat`), ...EXTRA_ROOTS].map((name) => name.toLowerCase()),
)

/** 渲染端 rewriteLDrawUrl 的重写规则（逐字照抄）。 */
function rewrite(rel: string): string {
  while (rel.startsWith('parts/parts/')) rel = rel.slice('parts/'.length)
  if (rel.startsWith('parts/p/')) rel = rel.slice('parts/'.length)
  if (rel.startsWith('parts/48/')) rel = `p/${rel.slice('parts/'.length)}`
  if (rel.startsWith('parts/8/')) rel = `p/${rel.slice('parts/'.length)}`
  const flat = /^parts\/([^/]+\.dat)$/i.exec(rel)
  if (flat && !ROOT_PARTS.has(flat[1].toLowerCase())) rel = `p/${flat[1]}`
  return rel
}

/**
 * 按渲染端 LDrawLoader 的顺序找一个子件文件：
 * parts/、p/、models/、原样，再把文件名转小写重来一轮。
 * 每一步都要过 rewriteLDrawUrl，所以这里查出来的就是浏览器真能取到的。
 */
function locate(name: string): string | null {
  const clean = name.replace(/\\/g, '/')
  for (const variant of [clean, clean.toLowerCase()]) {
    const slash = variant.lastIndexOf('/')
    const candidates = [
      `parts/${variant}`,
      `p/${variant}`,
      `models/${variant}`,
      variant,
      slash >= 0 ? `${variant.slice(0, slash + 1)}${variant}` : '',
    ]
    for (const candidate of candidates) {
      if (!candidate) continue
      const rel = rewrite(candidate)
      const hit = INDEX.get(rel.toLowerCase())
      if (hit) return hit
    }
  }
  return null
}

function childRefs(relPath: string): string[] {
  const file = join(ROOT, relPath)
  const names: string[] = []
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line.startsWith('1 ')) continue
    const tokens = line.split(/\s+/)
    if (tokens.length < 15) continue
    names.push(tokens.slice(14).join(' '))
  }
  return names
}

function dirOf(relPath: string) {
  const index = relPath.lastIndexOf('/')
  return index < 0 ? '' : relPath.slice(0, index)
}

const PART_BY_TYPE = new Map(BRICK_PARTS.map((item) => [item.type, item]))

// 模型实际用到的零件类型。
const used = new Map<BrickType, Set<string>>()
for (const model of MAGIC_MODELS) {
  for (const piece of model.pieces) {
    const models = used.get(piece.type) ?? new Set<string>()
    models.add(model.id)
    used.set(piece.type, models)
  }
}

// 审计范围：魔法模型用到的零件 + 零件面板里登记的全部零件。
const scope = new Set<BrickType>([...used.keys(), ...BRICK_PARTS.map((item) => item.type)])

const missingTop: string[] = []
const missingChild: string[] = []
const noGeometry: string[] = []
const sizeMismatch: string[] = []
const missingOrigin: string[] = []
const seenFiles = new Set<string>()
let checked = 0

for (const type of [...scope].sort((a, b) => a.localeCompare(b))) {
  const models = used.get(type)
  const info = PART_BY_TYPE.get(type)
  if (!info) {
    missingTop.push(`${type}（${models ? [...models].join(',') : '零件面板'}）没有在 BRICK_PARTS 里登记`)
    continue
  }
  const root = locate(`${info.ldraw}.dat`)
  if (!root) {
    missingTop.push(`${type} -> ${info.ldraw}.dat（${models ? [...models].join(',') : '零件面板'}）文件不存在`)
    continue
  }

  // 递归展开所有子件。
  const seen = new Set<string>()
  const stack: Array<{ rel: string; from: string }> = [{ rel: root, from: `${type}` }]
  let geometry = 0
  while (stack.length) {
    const { rel, from } = stack.pop()!
    if (seen.has(rel)) continue
    seen.add(rel)
    seenFiles.add(rel)
    checked += 1
    const text = readFileSync(join(ROOT, rel), 'utf8')
    if (/^\s*[34]\s/m.test(text)) geometry += 1
    const parentDir = dirOf(rel)
    for (const child of childRefs(rel)) {
      const hit = locate(child)
      if (!hit) {
        missingChild.push(`${from} -> ${rel} -> ${child}`)
        continue
      }
      stack.push({ rel: hit, from: `${type}` })
    }
  }
  if (geometry === 0) noGeometry.push(`${type} -> ${info.ldraw}.dat 没有面片`)

  // 声明尺寸（凸点数、板层）要和真实几何对得上，对不上就会在网格里错位。
  const box = emptyBox()
  measure(root, IDENTITY, box, '')
  const sizeX = (box.maxX - box.minX) / 20
  const sizeZ = (box.maxZ - box.minZ) / 20
  const sizeY = (box.maxY - box.minY) / 24
  const wantX = info.studs[0]
  const wantZ = info.studs[1]
  const wantY = info.plates / 3
  const bad = [
    Math.abs(sizeX - wantX) > 0.2 ? `X ${sizeX.toFixed(2)}≠${wantX}` : '',
    Math.abs(sizeZ - wantZ) > 0.2 ? `Z ${sizeZ.toFixed(2)}≠${wantZ}` : '',
    Math.abs(sizeY - wantY) > 0.35 ? `Y ${sizeY.toFixed(2)}≠${wantY}` : '',
  ].filter(Boolean)
  if (bad.length) sizeMismatch.push(`${type} ${info.ldraw} ${bad.join(' ')}`)

  // 原点表缺条目会退回到“顶面中心”，摆角和 LDraw 导出就会算错支点。
  if (!PART_ORIGINS[type]) missingOrigin.push(`${type} ${info.ldraw}`)
}

console.log(`魔法模型 ${MAGIC_MODELS.length} 个，用到零件类型 ${used.size} 种`)
console.log(`审计范围 ${scope.size} 种零件，展开文件 ${checked} 个`)
console.log('')
console.log('逐模型明细：')
for (const model of MAGIC_MODELS) {
  const types = [...new Set(model.pieces.map((piece) => piece.type))].sort()
  const missing = types.filter((type) => {
    const info = PART_BY_TYPE.get(type)
    if (!info) return true
    return !locate(`${info.ldraw}.dat`)
  })
  const mark = missing.length ? 'MISSING' : 'ok'
  console.log(`  ${mark} ${model.id.padEnd(14)} 零件 ${String(types.length).padStart(2)} 种 ${missing.join(',')}`)
}
console.log('')
console.log(`缺顶层文件 ${missingTop.length}`)
for (const item of missingTop) console.log(`  MISSING ${item}`)
console.log(`缺子件 ${missingChild.length}`)
for (const item of missingChild) console.log(`  MISSING ${item}`)
console.log(`无几何 ${noGeometry.length}`)
for (const item of noGeometry) console.log(`  EMPTY ${item}`)
console.log(`声明尺寸与几何不符 ${sizeMismatch.length}`)
for (const item of sizeMismatch) console.log(`  SIZE ${item}`)
console.log(`原点表缺条目 ${missingOrigin.length}`)
for (const item of missingOrigin) console.log(`  ORIGIN ${item}`)

if (missingTop.length || missingChild.length || noGeometry.length || missingOrigin.length) process.exitCode = 1
