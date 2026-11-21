// 审计：所有魔法模型用到的零件，是否都在 public/ldraw 零件库里存在；缺了就补。
//
// 和 scripts/audit-magic-models.ts 的分工：
//   那个脚本审的是几何 —— 保真度、穿模、悬空、连通性；
//   这个脚本审的是文件 —— 零件文件本身在不在库里、路径清单全不全。
//
// 为什么不能只看生成数据：
//   brickMagicData.ts 只记了每个零件实例的编号，零件文件本体（.dat）藏在
//   public/ldraw 里。少一个文件，渲染端就是 404（dev server 还会返回 index.html，
//   于是零件变成空壳，模型看着「缺了一块」但不会报错）。
//
// 为什么基准是源库而不是生成产物：
//   源库 .ldraw-src/lib/ldraw 才是权威副本。生成器只把顶层零件写进数据文件，
//   子件（parts/s/*.dat、p/48/*.dat 这类缩放图元）藏在 .dat 的 `1` 行里，
//   少拷一个子件，模型就少一层几何。
//   所以这里从源库出发算「模型 → 零件 → 子件」的完整依赖闭包，再逐个核对 public/ldraw。
//
// 查五件事：
//   1. 缺失：public/ldraw 下没有这个文件（渲染会缺件）。
//   2. 陈旧：文件在，但内容不是源库那一版（渲染出来的形状和生成数据量的几何对不上）。
//   3. 源库里也找不到：模型引用了库中不存在的零件（官方模型自己的问题，无法补齐）。
//   4. 贴图：零件引用的官方贴纸（0 !TEXMAP）没同步过去。
//      渲染端目前不画贴图，缺了不会空壳，但官方图案不会出现。
//   5. 路径清单：渲染端按 LDRAW_FILE_PATHS 找文件，清单漏了某个零件同样会 404。
//
// 用法：
//   npm run audit:files                     只报告
//   npx tsx scripts/audit-magic-files.ts --fix    报告并从源库补齐
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { indexLibrary, resolve } from './ldraw-geom.ts'
import {
  expandOfficial,
  indexModels,
  LIB,
  libraryPath,
  MODEL_DIR,
  MODEL_SOURCES,
  refName,
} from './omr-source.ts'
import { MAGIC_MODEL_DATA, MAGIC_PART_DATA } from '../src/pages/matupix/brick/brickMagicData.ts'
import { LDRAW_FILE_PATHS } from '../src/pages/matupix/brick/brickLdrawManifest.ts'

const PUBLIC_LDRAW = 'public/ldraw'

/** 闭包内的每个零件文件：库内相对路径 → 源库绝对路径。 */
const libFiles = new Map<string, string>()
/** 引用了但源库里找不到的引用名。 */
const unresolved = new Map<string, string>()
/** 每个模型用到的零件（含子件）集合。 */
const perModel = new Map<string, Set<string>>()
/** 贴图文件：文件名 → 源库路径。 */
const textures = new Map<string, string>()
/** 贴图引用在哪个零件里。 */
const textureOwner = new Map<string, string>()

/** 源库里的贴图都在 parts/textures/ 下。 */
function findTexture(name: string) {
  const direct = join(LIB, 'parts', 'textures', name)
  if (existsSync(direct)) return direct
  for (const dir of ['parts', 'p', 'parts/s', 'p/48']) {
    const candidate = join(LIB, dir, name)
    if (existsSync(candidate)) return candidate
  }
  return null
}

/**
 * 递归收集一个引用的依赖闭包。
 *
 * seen 用库内相对路径去重：同一个零件被引用多次只算一次，
 * 但不同引用名可能指向同一个文件（parts/6157.dat 和 6157.dat）。
 */
function collect(ref: string, owner: string, seen: Set<string>) {
  const rel = libraryPath(ref)
  if (!rel) {
    if (!unresolved.has(ref)) unresolved.set(ref, owner)
    return
  }
  if (seen.has(rel)) return
  seen.add(rel)
  const abs = resolve(ref)
  if (!abs) {
    if (!unresolved.has(ref)) unresolved.set(ref, owner)
    return
  }
  libFiles.set(rel, abs)
  const model = perModel.get(owner)
  if (model) model.add(rel)

  // .dat 里的 `1` 行是子引用，渲染器会递归去取。
  for (const raw of readFileSync(abs, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    // 贴图引用：0 !TEXMAP START <投影参数...> <文件名>.png，最后一个 token 是文件名。
    if (/^0\s+!TEXMAP\s+START\b/i.test(line)) {
      const name = line.split(/\s+/).pop() ?? ''
      if (/\.png$/i.test(name) && !textures.has(name)) {
        const tex = findTexture(name)
        if (tex) {
          textures.set(name, tex)
          textureOwner.set(name, rel)
        }
      }
      continue
    }
    if (!line.startsWith('1 ')) continue
    const child = refName(line.split(/\s+/))
    if (!child) continue
    // .mpd/.ldr 是模型不是零件，模型内部由 expandOfficial 单独展开。
    if (/\.(mpd|ldr)$/i.test(child)) continue
    collect(child, owner, seen)
  }
}

function main() {
  const fix = process.argv.includes('--fix')
  indexLibrary([`${LIB}/parts`, `${LIB}/p`, MODEL_DIR])
  indexModels()

  // 第一路：源库权威视角 —— 30 个模型展开后的完整依赖闭包。
  const modelRows: { id: string; name: string; pieces: number; kinds: number }[] = []
  for (const source of MODEL_SOURCES) {
    perModel.set(source.id, new Set())
    const items = expandOfficial(source.file)
    const seen = new Set<string>()
    for (const item of items) collect(item.file, source.id, seen)
    modelRows.push({
      id: source.id,
      name: source.name,
      pieces: items.length,
      kinds: perModel.get(source.id)!.size,
    })
  }

  // 第二路：核对 public/ldraw。
  const missing: string[] = []
  const stale: string[] = []
  for (const [rel, abs] of libFiles) {
    const target = join(PUBLIC_LDRAW, rel)
    if (!existsSync(target)) {
      missing.push(rel)
      continue
    }
    if (!readFileSync(target).equals(readFileSync(abs))) stale.push(rel)
  }

  // 第三路：生成数据引用的路径必须在 public/ldraw 下真实存在。
  const dataMissing: string[] = []
  for (const part of MAGIC_PART_DATA) {
    if (!existsSync(join(PUBLIC_LDRAW, part.path))) dataMissing.push(part.path)
  }
  // 零件编号必须都在目录范围内，否则渲染端会取到 undefined。
  const badIndex: string[] = []
  for (const model of MAGIC_MODEL_DATA) {
    for (const piece of model.pieces) {
      if (piece.part < 0 || piece.part >= MAGIC_PART_DATA.length) {
        badIndex.push(`${model.id}:${piece.part}`)
      }
    }
  }

  // 第五路：路径清单。渲染端 rewriteLDrawUrl() 先查清单再猜路径，
  // 清单里没有的零件要么 404、要么落到错目录，模型就缺件。
  const manifestMissing: string[] = []
  for (const rel of libFiles.keys()) {
    const bare = rel.replace(/^(parts|p)\//, '')
    if (!LDRAW_FILE_PATHS[rel.toLowerCase()] && !LDRAW_FILE_PATHS[bare.toLowerCase()]) {
      manifestMissing.push(rel)
    }
  }
  // 清单里指向的文件必须真实存在。
  const manifestBroken: string[] = []
  for (const [key, value] of Object.entries(LDRAW_FILE_PATHS)) {
    if (!existsSync(join(PUBLIC_LDRAW, value))) manifestBroken.push(`${key} -> ${value}`)
  }

  // 贴图：官方图案没同步过去，渲染端目前不画贴图，但导出到 LDraw 工具里会缺。
  const textureMissing: { name: string; owner: string }[] = []
  for (const [name, source] of textures) {
    const rel = `parts/textures/${name}`
    const target = join(PUBLIC_LDRAW, rel)
    if (!existsSync(target) || !readFileSync(target).equals(readFileSync(source))) {
      textureMissing.push({ name: rel, owner: textureOwner.get(name) ?? '' })
    }
  }

  console.log(`模型 ${modelRows.length} 个，零件实例 ${modelRows.reduce((s, m) => s + m.pieces, 0)} 件`)
  console.log(`依赖闭包 ${libFiles.size} 个文件（顶层零件 + 子件），贴图 ${textures.size} 个`)
  for (const row of modelRows) {
    console.log(
      `  ${row.id.padEnd(13)} ${row.name.padEnd(12)} p=${String(row.pieces).padStart(4)} 闭包=${String(row.kinds).padStart(4)}`,
    )
  }

  if (
    missing.length === 0 &&
    stale.length === 0 &&
    unresolved.size === 0 &&
    dataMissing.length === 0 &&
    badIndex.length === 0 &&
    textureMissing.length === 0 &&
    manifestMissing.length === 0 &&
    manifestBroken.length === 0
  ) {
    console.log('零件库完整：所有模型的零件（含子件、贴图）都在 public/ldraw 下且与源库一致')
    return
  }

  console.log('\n问题清单：')
  for (const rel of missing) console.log(`  缺失    ${rel}  (public/ldraw)`)
  for (const rel of stale) console.log(`  陈旧    ${rel}  (public/ldraw)`)
  for (const [ref, owner] of unresolved) console.log(`  源库缺  ${ref}  (${owner})`)
  for (const path of dataMissing) console.log(`  缺失    ${path}  (生成数据引用)`)
  for (const index of badIndex) console.log(`  编号越界 ${index}  (生成数据引用)`)
  for (const tex of textureMissing) console.log(`  贴图缺  ${tex.name}  (${tex.owner})`)
  for (const rel of manifestMissing) console.log(`  清单缺  ${rel}  (渲染端会 404)`)
  for (const item of manifestBroken) console.log(`  清单坏  ${item}  (指向不存在的文件)`)
  console.log(
    `\n缺失 ${missing.length}，陈旧 ${stale.length}，源库找不到 ${unresolved.size}，数据引用缺失 ${dataMissing.length}，编号越界 ${badIndex.length}，贴图缺失 ${textureMissing.length}，清单缺 ${manifestMissing.length}，清单坏 ${manifestBroken.length}`,
  )

  if (!fix) {
    console.log('\n加 --fix 可以从源库补齐')
    return
  }

  let copied = 0
  for (const rel of [...missing, ...stale]) {
    const source = libFiles.get(rel)
    if (!source) continue
    const target = join(PUBLIC_LDRAW, rel)
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(source, target)
    copied++
  }
  for (const tex of textureMissing) {
    const source = textures.get(tex.name.replace('parts/textures/', ''))
    if (!source) continue
    const target = join(PUBLIC_LDRAW, tex.name)
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(source, target)
    copied++
  }
  console.log(`\n已从源库补齐 ${copied} 个文件`)
  if (unresolved.size > 0) {
    console.log(`还有 ${unresolved.size} 项源库里就没有，无法补齐（官方模型自身的引用缺失）`)
  }
}

main()
