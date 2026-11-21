// 校验 LDraw 零件库完整性：
// 1) brickTypes 里每个零件引用的 ldraw 文件是否都在 public/ldraw 下；
// 2) 魔法模型目录 MAGIC_PARTS 里的零件是否都在 public/ldraw 下；
// 3) 被引用零件的子文件引用是否都能找到（缺失会让渲染缺块）。
//
// 零件的子零件是递归的：3001.dat 引用 3001s01.dat，后者再引用 stud.dat、box5.dat。
// 只查一层会漏掉更深层的缺失，所以这里按引用链逐层往下走。
import fs from 'node:fs'
import path from 'node:path'
import { BRICK_PARTS } from '../src/pages/matupix/brick/brickTypes.ts'
import { MAGIC_PARTS } from '../src/pages/matupix/brick/brickMagicParts.ts'
import { LDRAW_FILE_PATHS } from '../src/pages/matupix/brick/brickLdrawManifest.ts'

const root = path.resolve('public/ldraw')

/**
 * 按渲染端的规则找零件文件。
 *
 * 渲染端先查清单（LDRAW_FILE_PATHS，生成器写的真实路径），
 * 再退回 parts/ 和 p/ 两个目录 —— 和 brickPartModel.ts 的 rewriteLDrawUrl 同一套顺序。
 */
function locate(name: string): string | null {
  const clean = name.replace(/\\/g, '/')
  const file = clean.endsWith('.dat') ? clean : `${clean}.dat`
  const manifest = LDRAW_FILE_PATHS[file.toLowerCase()]
  if (manifest) {
    const hit = path.join(root, manifest)
    if (fs.existsSync(hit)) return hit
  }
  const bare = file.split('/').pop() ?? file
  const candidates = [
    path.join(root, 'parts', file),
    path.join(root, 'p', file),
    path.join(root, 'parts', bare),
    path.join(root, 'p', bare),
  ]
  return candidates.find((item) => fs.existsSync(item)) ?? null
}

/** 收集一个 .dat 文件里引用到的所有子零件名 */
function children(file: string): string[] {
  const names: string[] = []
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/)
    if (parts[0] !== '1' || parts.length < 15) continue
    names.push(parts.slice(14).join(' ').replace(/\\/g, '/'))
  }
  return names
}

const missingTop: string[] = []
const missingChild = new Map<string, string[]>()
/** 已经查过的文件，避免同一份子零件被重复递归。 */
const visited = new Set<string>()

function walk(file: string, chain: string[], depth: number) {
  if (depth > 12) return
  for (const child of children(file)) {
    const target = locate(child)
    if (!target) {
      const key = chain.join(' > ')
      const list = missingChild.get(key) ?? []
      list.push(child)
      missingChild.set(key, list)
      continue
    }
    if (visited.has(target)) continue
    visited.add(target)
    walk(target, [...chain, path.basename(target)], depth + 1)
  }
}

const roots: { label: string; ldraw: string }[] = [
  ...BRICK_PARTS.map((item) => ({ label: item.type, ldraw: item.ldraw })),
  ...MAGIC_PARTS.map((item) => ({ label: item.type, ldraw: item.path ?? `parts/${item.ldraw}.dat` })),
]

for (const part of roots) {
  const file = locate(part.ldraw)
  if (!file) {
    missingTop.push(`${part.label} -> ${part.ldraw}`)
    continue
  }
  if (visited.has(file)) continue
  visited.add(file)
  walk(file, [path.basename(file)], 0)
}

console.log(`引用到的零件 ${roots.length} 种（基础 ${BRICK_PARTS.length} + 魔法 ${MAGIC_PARTS.length}）`)
console.log(`实际遍历到的 .dat 文件 ${visited.size} 个`)
console.log(`missing top-level files = ${missingTop.length}`)
for (const item of missingTop) console.log(`  MISSING ${item}`)
console.log(`missing children = ${missingChild.size}`)
for (const [parent, list] of missingChild) console.log(`  ${parent}: ${list.join(', ')}`)
if (missingTop.length || missingChild.size) process.exitCode = 1
