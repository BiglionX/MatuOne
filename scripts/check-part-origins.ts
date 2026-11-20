// 核对零件原点表：按 alignPart() 的真实算法重算一遍，和 brickPartOrigins.ts 逐条对比。
// 用法：npx tsx scripts/check-part-origins.ts
//
// alignPart() 的实际做法：
//   1) 绕 X 轴转 180°，把 LDraw 的 Y 翻到朝上（Z 也跟着翻）。
//   2) 缩放到 XZ 20 LDU = 1、Y 24 LDU = 1。
//   3) 用量出来的包围盒把中心对到原点：position = (-centerX, -half - min.y, -centerZ)。
// 于是 LDraw 原点在对齐后局部坐标里的位置就是 group.position。
import { PART_ORIGINS } from '../src/pages/matupix/brick/brickPartOrigins.ts'
import { BRICK_PARTS, partHeight, type BrickType } from '../src/pages/matupix/brick/brickTypes.ts'
import { emptyBox, IDENTITY, indexLibrary, isEmpty, measure } from './ldraw-geom.ts'

indexLibrary()

function round3(value: number) {
  return Math.round(value * 1000) / 1000
}

let bad = 0
const rows: string[] = []

for (const item of BRICK_PARTS) {
  const file = `${item.ldraw}.dat`
  const box = emptyBox()
  measure(file, IDENTITY, box)
  if (isEmpty(box)) {
    console.log(`!! ${item.type} 量不到几何`)
    bad += 1
    continue
  }
  // 渲染空间的包围盒：绕 X 转 180° 后 Y、Z 都取反。
  const minX = box.minX / 20
  const maxX = box.maxX / 20
  const minY = -box.maxY / 24
  const maxY = -box.minY / 24
  const minZ = -box.maxZ / 20
  const maxZ = -box.minZ / 20
  const centerX = (minX + maxX) / 2
  const centerZ = (minZ + maxZ) / 2
  const half = partHeight(item.type) / 2
  const origin: [number, number, number] = [
    round3(-centerX),
    round3(-half - minY),
    round3(-centerZ),
  ]
  const current = PART_ORIGINS[item.type as BrickType]
  if (!current) {
    console.log(`!! ${item.type} 表里没有`)
    bad += 1
    continue
  }
  // 表里存到小数点后三位，浮点路径不同会差最后一位。
  const diff = current.map((value, index) => Math.abs(value - origin[index]))
  if (Math.max(...diff) > 0.002) {
    bad += 1
    rows.push(
      `  ${item.type.padEnd(20)} 表 [${current.join(', ')}]  实算 [${origin.join(', ')}]  差 [${diff.map((v) => v.toFixed(3)).join(', ')}]`,
    )
  }
}

console.log(`零件 ${BRICK_PARTS.length} 种，不一致 ${bad} 条`)
for (const row of rows) console.log(row)
if (bad) process.exitCode = 1
