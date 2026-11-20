// 校验 LDraw 零件库完整性：
// 1) brickTypes 里每个零件引用的 ldraw 文件是否都在 public/ldraw 下；
// 2) 被引用零件的子文件引用是否都能找到（缺失会让渲染缺块）。
import fs from 'node:fs'
import path from 'node:path'
import { BRICK_PARTS } from '../src/pages/matupix/brick/brickTypes.ts'

const root = path.resolve('public/ldraw')

function locate(name: string): string | null {
  const clean = name.replace(/\\/g, '/')
  const file = clean.endsWith('.dat') ? clean : `${clean}.dat`
  const candidates = [path.join(root, 'parts', file), path.join(root, 'p', file)]
  return candidates.find((item) => fs.existsSync(item)) ?? null
}

// 收集一个 .dat 文件里引用到的所有子零件名
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

for (const part of BRICK_PARTS) {
  const file = locate(part.ldraw)
  if (!file) {
    missingTop.push(`${part.type} -> ${part.ldraw}`)
    continue
  }
  for (const child of children(file)) {
    if (!locate(child)) {
      const list = missingChild.get(part.ldraw) ?? []
      list.push(child)
      missingChild.set(part.ldraw, list)
    }
  }
}

console.log(`parts referenced by brickTypes = ${BRICK_PARTS.length}`)
console.log(`missing top-level files = ${missingTop.length}`)
for (const item of missingTop) console.log(`  MISSING ${item}`)
console.log(`parts with missing children = ${missingChild.size}`)
for (const [parent, list] of missingChild) console.log(`  ${parent}: ${list.join(', ')}`)
