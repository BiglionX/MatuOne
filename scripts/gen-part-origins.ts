// 生成每个零件的 LDraw 原点表。
//
// alignPart() 把 LDraw mesh 的"包围盒中心"对到零件原点，而导出与装配需要的是 LDraw 原点。
// 两者对普通砖一致，对斜面、人物件差半格甚至更多，所以先离线量出每个零件的
// 「LDraw 原点在对齐后局部坐标里的位置」，渲染、导出、人偶装配共用这一份基准。
//
// 公式（对齐后局部坐标：bbox 中心 XZ = 0，bbox 底面 Y = -partHeight/2）：
//   origin.x = -cx        cx  = 原始 LDraw 包围盒 X 中心 / 20
//   origin.y = -half + maxY/24   maxY = 原始 LDraw 包围盒 Y 最大值（LDraw 的 Y 向下）
//   origin.z = +cz        cz  = 原始 LDraw 包围盒 Z 中心 / 20
//
// 另外还导出 PART_BOUNDS：零件包围盒相对它自己 LDraw 原点的位置。
// 渲染里 Y、Z 都被 Rx(π) 翻过，所以要取反：
//   minX = minX/20      minY = -maxY/24      minZ = -maxZ/20
//   maxX = maxX/20      maxY = -minY/24      maxZ = -minZ/20
// 单连接点零件（头、发、手臂、手）的支点就是 LDraw 原点，
// 这张表告诉编辑器它们的实体相对连接点在哪儿，叠放高度才算得准。
//
// X 和 Z 的符号不一样：LDraw 的 Z 轴被 alignPart() 里 group.rotation.x = Math.PI 翻了过来，
// 渲染坐标是 render_z = -LDraw_z / 20。所以 LDraw 原点相对包围盒中心的渲染偏移是 +cz。
// 写成 -cz 的话每个前后不对称的零件（斜面、玻璃、头发、手臂）都会整体错位一截。
// 详见 scripts/check-part-origins.ts 的逐条核对。
//
// 矩阵约定必须和渲染端（three.js 的 LDrawLoader）一致，见 scripts/ldraw-geom.ts。
import { writeFileSync } from 'node:fs'
import { BRICK_PARTS, partHeight, type BrickType } from '../src/pages/matupix/brick/brickTypes.ts'
import { emptyBox, IDENTITY, indexLibrary, isEmpty, measure, resolve } from './ldraw-geom.ts'

indexLibrary()

function round3(value: number) {
  return Math.round(value * 1000) / 1000
}

const rows: string[] = []
const boundRows: string[] = []
const problems: string[] = []

for (const item of BRICK_PARTS) {
  const file = `${item.ldraw}.dat`
  const path = resolve(file)
  if (!path) {
    problems.push(`${item.type} 找不到 ${file}`)
    continue
  }
  const box = emptyBox()
  measure(file, IDENTITY, box)
  if (isEmpty(box)) {
    problems.push(`${item.type} 量不到几何`)
    continue
  }
  const cx = (box.minX + box.maxX) / 2 / 20
  const cz = (box.minZ + box.maxZ) / 2 / 20
  const half = partHeight(item.type) / 2
  const ox = round3(-cx)
  const oy = round3(-half + box.maxY / 24)
  const oz = round3(cz)
  const sizeX = round3((box.maxX - box.minX) / 20)
  const sizeZ = round3((box.maxZ - box.minZ) / 20)
  rows.push(`  '${item.type}': [${ox}, ${oy}, ${oz}],`)
  boundRows.push(
    `  '${item.type}': [${round3(box.minX / 20)}, ${round3(-box.maxY / 24)}, ${round3(-box.maxZ / 20)}, ${round3(box.maxX / 20)}, ${round3(-box.minY / 24)}, ${round3(-box.minZ / 20)}],`,
  )
  if (Math.abs(ox) > 0.02 || Math.abs(oz) > 0.02) {
    problems.push(`${item.type} 原点偏离底面中心 ${ox},${oy},${oz}  mesh ${sizeX}x${sizeZ}`)
  }
}

const output = `// 由 scripts/gen-part-origins.ts 生成，勿手改。
//
// 每个零件的 LDraw 原点在对齐后局部坐标里的位置：
//   x/z 相对包围盒中心，y 相对包围盒底面（= -partHeight/2）。
// 渲染的支点、LDraw 导出、人偶装配都用这一份基准，避免逻辑层与视觉层各算各的。
export const PART_ORIGINS: Record<string, [number, number, number]> = {
${rows.join('\n')}
}

// 零件包围盒相对它自己 LDraw 原点的位置：[minX, minY, minZ, maxX, maxY, maxZ]，渲染坐标。
export const PART_BOUNDS: Record<string, [number, number, number, number, number, number]> = {
${boundRows.join('\n')}
}
`

writeFileSync('src/pages/matupix/brick/brickPartOrigins.ts', output)
console.log(`写出 ${rows.length} 条`)
for (const item of problems) console.log(`  ! ${item}`)
