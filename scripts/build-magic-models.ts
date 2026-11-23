// 生成魔法模型库的数据文件。
//
// 来源：LDraw 官方模型库（library.ldraw.org 的 OMR 模型）与官方零件库。
//   模型：.ldraw-src/models/*.mpd，头部带
//         `0 !LICENSE Redistributable under CCAL version 2.0`。
//         官方 CAreadme.txt 写明这行等同于 CC BY 2.0，需要署名。
//   零件：.ldraw-src/lib/ldraw/{parts,p} 的官方零件库（CC BY 4.0）。
//
// 做法：
//   1. 把模型的 `1` 摆放指令展开成零件实例（零件整体保留，不拆成图元）。
//   2. 每个实例带官方矩阵（旋转 R + 平移 T），直接进渲染端的 ldraw 精确摆放层。
//   3. 渲染端把零件原点对齐到包围盒中心（alignPart），
//      所以砖的落点要减去这个对齐偏移 o，落点公式：
//          P = G⁻¹·T + M0 − o        G = diag(20, −24, −20)
//      M0 是模型级偏移：贴地（底面 y=0）、水平居中。
//   4. 生成 src/pages/matupix/brick/brickMagicData.ts（零件目录 + 模型数据）。
//   5. 把用到的零件文件（含子件）拷进 public/ldraw，渲染端按官方目录找得到。
//
// 用法：npx tsx scripts/build-magic-models.ts [--report]
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { apply, compose, emptyBox, grow, IDENTITY, indexLibrary, isEmpty, measure, resolve, type Box, type Xform } from './ldraw-geom.ts'
import { mapColor } from './ldraw-model.ts'
import { expandFile, indexModels, isModelFile, LIB, libraryPath, missingFiles, MODEL_DIR, MODEL_SOURCES, refName, resolveFile, type ModelSource } from './omr-source.ts'

const OUT_FILE = 'src/pages/matupix/brick/brickMagicData.ts'
const OUT_PARTS_FILE = 'src/pages/matupix/brick/brickMagicParts.ts'
const OUT_MANIFEST_FILE = 'src/pages/matupix/brick/brickLdrawManifest.ts'
const PUBLIC_LDRAW = 'public/ldraw'

const STUD = 20
const HEIGHT = 24


/** 量不到实体的零件（空图元，比如 1-4ering.dat 这种适配环）。 */
const hollowParts = new Set<string>()
/** 空几何的零件用退化包围盒，不让整个模型失败。 */
function solidBox(file: string): Box {
  const box = partBox(file)
  if (!isEmpty(box)) return box
  hollowParts.add(file)
  return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 }
}

const boxCache = new Map<string, Box>()

function partBox(file: string): Box {
  const cached = boxCache.get(file)
  if (cached) return cached
  const box = emptyBox()
  measure(file, IDENTITY, box)
  boxCache.set(file, box)
  return box
}

/** 局部包围盒按矩阵变换后的世界包围盒。 */
function xformBox(box: Box, m: Xform): Box {
  const out = emptyBox()
  for (const x of [box.minX, box.maxX]) {
    for (const y of [box.minY, box.maxY]) {
      for (const z of [box.minZ, box.maxZ]) {
        const p = apply(m, [x, y, z])
        grow(out, p[0], p[1], p[2])
      }
    }
  }
  return out
}

/**
 * alignPart() 的对齐偏移（渲染坐标）：把零件包围盒中心对到零件原点。
 * 必须和渲染端 brickPartModel.alignPart 的 group.position 完全一致，
 * 落点公式 P = G⁻¹·T + M0 − o 就是拿这个偏移扣出来的。
 *
 * 推导（渲染端把 LDraw 坐标翻过来：Y、Z 取反）：
 *   measured.min.z = −maxZ/20，measured.max.z = −minZ/20
 *   → centerZ = −(minZ+maxZ)/40，group.position.z = −centerZ = +(minZ+maxZ)/40
 * 所以 z 分量是 +cz，不是 −cz。
 *
 * half 用的是渲染端的取法：partHeight = plates/3，plates 是板层数（四舍五入到四位小数），
 * 两边必须同源，否则每个零件差 0.01 LDU 级别的偏移。
 */
function alignOffset(box: Box): [number, number, number] {
  const cx = (box.minX + box.maxX) / 2 / STUD
  const cz = (box.minZ + box.maxZ) / 2 / STUD
  const plates = round((box.maxY - box.minY) / 8, 4)
  const half = plates / 6
  return [-cx, -half + box.maxY / HEIGHT, cz]
}

function round(value: number, digits = 6) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

type PartEntry = {
  /** 相对 LDraw 库根的引用名（不含 .dat）。 */
  ldraw: string
  /** public/ldraw 下的实际路径。 */
  path: string
  /** 官方零件说明（.dat 首行）。 */
  desc: string
  studs: [number, number]
  /** 板层数，1 板 = 8 LDU。保持分数才能和真实几何对齐。 */
  plates: number
}

const parts = new Map<string, PartEntry>()

/** 八色调色板的颜色 → LDraw 色码（取第一个同色项）。 */
function tintToCode(tint: string) {
  const codes = [4, 8, 9, 2, 1, 11, 0, 5, 194, 71, 72, 14, 10, 13]
  for (const code of codes) {
    if (mapColor(code).toLowerCase() === tint.toLowerCase()) return code
  }
  return 4
}

function describe(file: string) {
  const path = resolve(file)
  if (!path) return ''
  const first = readFileSync(path, 'utf8').split(/\r?\n/, 1)[0] ?? ''
  const match = /^0\s+(.+?)\s*$/.exec(first)
  const text = match ? match[1] : ''
  return text.startsWith('Name:') ? '' : text
}

function registerPart(file: string): PartEntry {
  const libPath = libraryPath(file)
  if (!libPath) throw new Error(`零件不在官方库里：${file}`)
  const key = libPath.replace(/\.dat$/i, '')
  const existing = parts.get(key)
  if (existing) return existing
  const box = partBox(file)
  const entry: PartEntry = {
    ldraw: key,
    path: libPath,
    desc: describe(file),
    studs: [Math.max(1, Math.round((box.maxX - box.minX) / STUD)), Math.max(1, Math.round((box.maxZ - box.minZ) / STUD))],
    plates: round((box.maxY - box.minY) / 8, 4),
  }
  parts.set(key, entry)
  return entry
}

type BuiltModel = {
  id: string
  name: string
  size: 'small' | 'large'
  tint: string
  source: string
  /** 官方套装名（署名用）。 */
  label: string
  /** 模型作者（署名用，取自模型头的 0 Author: 行）。 */
  author: string
  license: string
  pieces: { part: number; color: string; position: [number, number, number]; rot: number[]; pos: [number, number, number] }[]
  bounds: { x: number; y: number; z: number }
}

function modelHeader(file: string, key: 'Name' | 'LICENSE' | 'Author') {
  const path = resolveFile(file)
  if (!path || !existsSync(path)) return ''
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    const match =
      key === 'Name'
        ? /^0\s+Name:\s*(.+)$/i.exec(line)
        : key === 'Author'
          ? /^0\s+Author:\s*(.+)$/i.exec(line)
          : /^0\s+!LICENSE\s+(.+)$/i.exec(line)
    if (match) return match[1].trim()
  }
  return ''
}

function buildModel(source: ModelSource, partIndex: Map<string, number>): BuiltModel {
  const items = expandFile(source.file)
  if (items.length === 0) throw new Error(`${source.file} 展开后没有零件`)

  const world = emptyBox()
  for (const item of items) {
    const box = solidBox(item.file)
    const placed = xformBox(box, item.xform)
    grow(world, placed.minX, placed.minY, placed.minZ)
    grow(world, placed.maxX, placed.maxY, placed.maxZ)
  }

  // 模型级偏移 M0：底面贴地、水平居中。
  const m0: [number, number, number] = [
    -(world.minX + world.maxX) / (2 * STUD),
    world.maxY / HEIGHT,
    (world.minZ + world.maxZ) / (2 * STUD),
  ]

  // 颜色：0 和 16 都是“跟随主色”，其余是具体色。
  const counts = new Map<number, number>()
  for (const item of items) counts.set(item.color, (counts.get(item.color) ?? 0) + 1)
  let primary = 0
  let best = 0
  for (const [code, count] of counts) {
    if (code !== 16 && count > best) {
      best = count
      primary = code
    }
  }
  if (primary === 0) primary = tintToCode(source.tint)
  const mainColor = mapColor(primary)

  const pieces: BuiltModel['pieces'] = []
  for (const item of items) {
    const entry = registerPart(item.file)
    let index = partIndex.get(entry.ldraw)
    if (index === undefined) {
      index = partIndex.size
      partIndex.set(entry.ldraw, index)
    }
    const o = alignOffset(solidBox(item.file))
    const t = item.xform
    const position: [number, number, number] = [
      round(t.x / STUD + m0[0] - o[0]),
      round(-t.y / HEIGHT + m0[1] - o[1]),
      round(-t.z / STUD + m0[2] - o[2]),
    ]
    const rot = [t.a, t.b, t.c, t.d, t.e, t.f, t.g, t.h, t.i].map((value) => round(value))
    const color = item.color === 16 ? mainColor : mapColor(item.color)
    pieces.push({ part: index, color, position, rot, pos: [round(t.x), round(t.y), round(t.z)] })
  }

  return {
    id: source.id,
    name: source.name,
    size: source.size,
    tint: source.tint,
    source: source.file,
    label: source.label,
    author: modelHeader(source.file, 'Author'),
    license: modelHeader(source.file, 'LICENSE'),
    pieces,
    bounds: {
      x: round(world.maxX - world.minX),
      y: round(world.maxY - world.minY),
      z: round(world.maxZ - world.minZ),
    },
  }
}

/** 零件的子引用（.dat 里的 `1` 行），渲染器会递归去取。 */
function dependencies(file: string, seen: Set<string>) {
  if (seen.has(file)) return
  seen.add(file)
  const path = resolve(file)
  if (!path) return
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line.startsWith('1 ')) continue
    const tokens = line.split(/\s+/)
    const child = refName(tokens)
    if (!child) continue
    if (isModelFile(child)) continue
    if (!resolve(child)) continue
    dependencies(child, seen)
  }
}

function copyParts() {
  const copied: string[] = []
  const seen = new Set<string>()
  for (const entry of parts.values()) dependencies(`${entry.ldraw}.dat`, seen)
  for (const key of seen) {
    const libPath = libraryPath(key)
    if (!libPath) continue
    const source = join(LIB, libPath)
    const target = join(PUBLIC_LDRAW, libPath)
    if (!existsSync(source)) continue
    // 内容不一致就覆盖：public/ldraw 是渲染端真正加载的目录，
    // 留着旧版本会让渲染出来的形状和生成数据时量的几何对不上。
    if (existsSync(target) && readFileSync(target).equals(readFileSync(source))) continue
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(source, target)
    copied.push(libPath)
  }
  return copied
}

function buildData(built: BuiltModel[], partIndex: Map<string, number>) {
  const partRows: string[] = []
  for (const [key, index] of partIndex) {
    const entry = parts.get(key)!
    partRows.push(
      `  { ldraw: '${entry.ldraw}', path: '${entry.path}', desc: ${JSON.stringify(entry.desc)}, studs: [${entry.studs[0]}, ${entry.studs[1]}], plates: ${entry.plates} },`,
    )
  }
  const modelRows: string[] = []
  for (const model of built) {
    const pieceRows = model.pieces.map(
      (piece) => `    { part: ${piece.part}, color: '${piece.color}', position: [${piece.position.join(', ')}], rot: [${piece.rot.join(', ')}], pos: [${piece.pos.join(', ')}] },`,
    )
    modelRows.push(
      [
        '  {',
        `    id: '${model.id}',`,
        `    name: '${model.name}',`,
        `    size: '${model.size}',`,
        `    tint: '${model.tint}',`,
        `    source: '${model.source}',`,
        `    label: ${JSON.stringify(model.label)},`,
        `    author: ${JSON.stringify(model.author)},`,
        `    license: ${JSON.stringify(model.license)},`,
        `    bounds: { x: ${model.bounds.x}, y: ${model.bounds.y}, z: ${model.bounds.z} },`,
        '    pieces: [',
        ...pieceRows,
        '    ],',
        '  },',
      ].join('\n'),
    )
  }
  return `// 由 scripts/build-magic-models.ts 生成，勿手改。
//
// 魔法模型库的数据：零件目录 + 30 个官方模型的摆放。
//
// 来源：LDraw 官方模型库（library.ldraw.org 的 OMR 模型）与官方零件库。
//   模型许可：CC BY 2.0（模型头写的是 CCAL version 2.0，官方 CAreadme.txt 写明等同于 CC BY 2.0），需署名。
//   零件许可：LDraw 官方零件库 CC BY 4.0。
//   每个模型都有 label（官方套装名）、author（作者）和 license（许可声明），用于界面署名。
//
// 坐标约定：位置是渲染坐标（Y 向上、Z 朝观者，1 钉 = 20 LDU、1 格高 = 24 LDU）；
// rot 是 LDraw 的旋转矩阵（a b c / d e f / g h i），在零件自己的 LDraw 坐标里作用，
// 位置由渲染端的 ldraw 精确摆放层直接套用，不做格子吸附。
export type MagicPartData = {
  /** 相对 LDraw 库根的引用名（不含 .dat）。 */
  ldraw: string
  /** public/ldraw 下的实际路径。 */
  path: string
  /** 官方零件说明。 */
  desc: string
  /** 钉数 [X, Z]。 */
  studs: [number, number]
  /** 板层数（1 板 = 8 LDU）。 */
  plates: number
}

export type MagicPieceData = {
  /** 零件在 MAGIC_PART_DATA 里的下标。 */
  part: number
  /** MatuPix 八色调色板里的颜色。 */
  color: string
  /** 渲染坐标里的落点。 */
  position: [number, number, number]
  /** LDraw 旋转矩阵 a b c / d e f / g h i。 */
  rot: number[]
  /** 零件 LDraw 原点在 OMR 模型坐标系里的位置，单位 LDU（导出 .ldr 用）。 */
  pos: [number, number, number]
}

export type MagicModelData = {
  id: string
  name: string
  size: 'small' | 'large'
  tint: string
  /** OMR 模型文件名。 */
  source: string
  /** 官方套装名，署名用。 */
  label: string
  /** 模型作者，署名用。 */
  author: string
  /** OMR 模型许可声明。 */
  license: string
  /** 模型包围盒，单位 LDU。 */
  bounds: { x: number; y: number; z: number }
  pieces: MagicPieceData[]
}

export const MAGIC_PART_DATA: MagicPartData[] = [
${partRows.join('\n')}
]

export const MAGIC_MODEL_DATA: MagicModelData[] = [
${modelRows.join('\n')}
]
`
}

/**
 * 单插销语义由运行时 brickTypes.isSinglePinPart 按名称识别（Propeller / Minifig Arm…），
 * 这里不写 mount:'point'：给魔法实例标 point 会叠原点偏移，官方矩阵摆放会歪。
 */
function buildPartsModule(partIndex: Map<string, number>) {
  const rows: string[] = []
  for (const key of partIndex.keys()) {
    const entry = parts.get(key)!
    const short = entry.ldraw.split('/').pop() ?? entry.ldraw
    const label = entry.desc || `零件 ${short}`
    rows.push(
      `  { type: 'ldraw:${entry.ldraw}' as BrickType, label: ${JSON.stringify(label)}, name: ${JSON.stringify(label)}, footprint: '${entry.studs[0]}×${entry.studs[1]}', ldraw: '${entry.ldraw}', studs: [${entry.studs[0]}, ${entry.studs[1]}] as const, plates: ${entry.plates}, category: '物件' as BrickCategory, glyph: 'studs' as BrickGlyph, path: '${entry.path}' },`,
    )
  }
  return `// 由 scripts/build-magic-models.ts 生成，勿手改。
//
// 魔法模型用到的官方零件目录。每种零件一个 BrickType：ldraw:<库内路径>。
// path 是它在 public/ldraw 下的真实位置（渲染端按这个路径加载）。
import type { BrickCategory, BrickGlyph, BrickPartInfo, BrickType } from './brickTypes'

export const MAGIC_PARTS: BrickPartInfo[] = [
${rows.join('\n')}
]
`
}

/**
 * public/ldraw 下所有零件文件的真实位置。
 *
 * 键是 LDraw 里可能出现的引用名（带目录的完整路径和去掉目录的裸名两种写法），
 * 值是真实相对路径。
 *
 * 为什么需要它：Vite dev 对不存在的路径返回 200 + index.html，
 * LDrawLoader 拿到 HTML 就当文件加载成功，不会再试 p/ 目录，
 * 结果零件变成空的。第一次请求就必须落在真实文件上。
 */
function buildManifestModule() {
  const map = new Map<string, string>()
  const walk = (dir: string, rel: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        walk(join(dir, entry.name), childRel)
        continue
      }
      if (!/\.(dat|ldr|mpd)$/i.test(entry.name)) continue
      const key = childRel.toLowerCase()
      if (!map.has(key)) map.set(key, childRel)
      const bare = key.replace(/^(parts|p)\//, '')
      if (!map.has(bare)) map.set(bare, childRel)
    }
  }
  // 先 parts/ 再 p/：裸名冲突时零件优先，和 LDraw 自己的查找顺序一致。
  for (const top of ['parts', 'p', 'models']) {
    const dir = join(PUBLIC_LDRAW, top)
    if (existsSync(dir)) walk(dir, top)
  }
  const rows = [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  '${key}': '${value}',`)
  return `// 由 scripts/build-magic-models.ts 生成，勿手改。
//
// public/ldraw 下所有零件文件的真实位置。
// 键是 LDraw 里可能出现的引用名（带目录的完整路径 + 去掉目录的裸名两种写法），
// 值是真实相对路径。
export const LDRAW_FILE_PATHS: Record<string, string> = {
${rows.join('\n')}
}
`
}

function main() {
  const report = process.argv.includes('--report')
  indexLibrary([`${LIB}/parts`, `${LIB}/p`, MODEL_DIR])
  indexModels()

  const partIndex = new Map<string, number>()
  const built: BuiltModel[] = []
  for (const source of MODEL_SOURCES) {
    try {
      built.push(buildModel(source, partIndex))
    } catch (error) {
      console.log(`  ! ${source.id} ${source.file}：${(error as Error).message}`)
    }
  }

  const totalPieces = built.reduce((sum, model) => sum + model.pieces.length, 0)
  console.log(`模型 ${built.length} 个，零件 ${totalPieces} 件，零件目录 ${partIndex.size} 种`)
  for (const model of built) {
    const kinds = new Set(model.pieces.map((piece) => piece.part)).size
    console.log(
      `  ${model.id.padEnd(13)} ${model.source.padEnd(22)} p=${String(model.pieces.length).padStart(4)} k=${String(kinds).padStart(3)}  ${model.bounds.x}x${model.bounds.y}x${model.bounds.z} LDU  ${model.label}`,
    )
  }
  if (missingFiles.size > 0) {
    console.log(`找不到的零件 ${missingFiles.size} 个：`)
    for (const file of [...missingFiles].slice(0, 20)) console.log(`  ! ${file}`)
  }
  if (hollowParts.size > 0) {
    console.log(`空几何零件 ${hollowParts.size} 个：${[...hollowParts].slice(0, 8).join(', ')}`)
  }

  if (report) return

  const copied = copyParts()
  console.log(`拷贝零件文件 ${copied.length} 个`)
  writeFileSync(OUT_FILE, buildData(built, partIndex))
  console.log(`写出 ${OUT_FILE}`)
  writeFileSync(OUT_PARTS_FILE, buildPartsModule(partIndex))
  console.log(`写出 ${OUT_PARTS_FILE}`)
  writeFileSync(OUT_MANIFEST_FILE, buildManifestModule())
  console.log(`写出 ${OUT_MANIFEST_FILE}`)

  // 零件目录一变，原点表必须跟着重生：漏表时导出回退到 height/2，渲染仍用 alignPart，
  // 两边差一整板高，audit:engine 会红。
  const origins = spawnSync('npx', ['tsx', 'scripts/gen-part-origins.ts'], {
    stdio: 'inherit',
    shell: true,
  })
  if (origins.status !== 0) {
    throw new Error(`gen-part-origins 失败，退出码 ${origins.status ?? 'null'}`)
  }
}

main()
