// 核对零件原点表：按 alignPart() 的真实算法重算一遍，和 brickPartOrigins.ts 逐条对比。
// 用法：npx tsx scripts/check-part-origins.ts
//
// alignPart() 的实际做法：
//   1) 绕 X 轴转 180°，把 LDraw 的 Y 翻到朝上（Z 也跟着翻）。
//   2) 缩放到 XZ 20 LDU = 1、Y 24 LDU = 1。
//   3) 用量出来的包围盒把中心对到原点：position = (-centerX, -half - min.y, -centerZ)。
// 于是 LDraw 原点在对齐后局部坐标里的位置就是 group.position。
//
// 目录零件 + 魔法零件都要核对：魔法零件漏表时，导出端会回退到 height/2，
// 和渲染端的 alignPart 实算差一整板高（典型 4 LDU），audit:engine 会红。
import { PART_ORIGINS } from '../src/pages/matupix/brick/brickPartOrigins.ts'
import { MAGIC_PARTS } from '../src/pages/matupix/brick/brickMagicParts.ts'
import { BRICK_PARTS, partHeight, type BrickType } from '../src/pages/matupix/brick/brickTypes.ts'
import { emptyBox, IDENTITY, indexLibrary, isEmpty, measure } from './ldraw-geom.ts'

indexLibrary()

function round3(value: number) {
  return Math.round(value * 1000) / 1000
}

type Target = { type: BrickType; file: string }

const targets: Target[] = [
  ...BRICK_PARTS.map((item) => ({ type: item.type, file: `${item.ldraw}.dat` })),
  ...MAGIC_PARTS.map((item) => ({
    type: item.type,
    file: item.path ?? `${item.ldraw}.dat`,
  })),
]

let bad = 0
const rows: string[] = []

for (const item of targets) {
  const box = emptyBox()
  measure(item.file, IDENTITY, box)
  if (isEmpty(box)) {
    console.log(`!! ${item.type} 量不到几何`)
    bad += 1
    continue
  }
  // 渲染空间的包围盒：绕 X 转 180° 后 Y、Z 都取反。
  const minX = box.minX / 20
  const maxX = box.maxX / 20
  const minY = -box.maxY / 24
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
  const current = PART_ORIGINS[item.type]
  if (!current) {
    bad += 1
    rows.push(`  ${item.type.padEnd(28)} 表里没有`)
    continue
  }
  // 表里存到小数点后三位，浮点路径不同会差最后一位。
  const diff = current.map((value, index) => Math.abs(value - origin[index]))
  if (Math.max(...diff) > 0.002) {
    bad += 1
    rows.push(
      `  ${item.type.padEnd(28)} 表 [${current.join(', ')}]  实算 [${origin.join(', ')}]  差 [${diff.map((v) => v.toFixed(3)).join(', ')}]`,
    )
  }
}

console.log(`零件 ${targets.length} 种（目录 ${BRICK_PARTS.length} + 魔法 ${MAGIC_PARTS.length}），不一致 ${bad} 条`)
for (const row of rows) console.log(row)
if (bad) process.exitCode = 1
