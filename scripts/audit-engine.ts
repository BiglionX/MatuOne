// 引擎一致性自检：把渲染端的摆放链条和 LDraw 导出端逐件对拍。
//
// 渲染端（brickScene.tsx + brickPartModel.ts + brickPartOrigins.ts）算的是：
//   顶点 → 摆角 Rx(τ) → 滚角 Rz(ρ) → 缩放 S → 翻正 Rx(π) → 对齐偏移 T
//        → 原点回退 −origin（只有单连接点零件有）→ 转向 Ry(θ) → 位置 + 亚格偏移
// 导出端（brickLdraw.ts）算的是：
//   顶点 → 摆角 Rx(τ) → 滚角 Rz(ρ) → 转向 Ry(−θ) → 落点
// 两边只差一个换算 G = diag(20, −24, −20)（渲染坐标 ↔ LDraw 单位），
// 所以 G·渲染包围盒 必须逐件等于 导出包围盒。
//
// 顺带核对零件原点表：alignPart() 实际用的对齐偏移 T 必须等于 PART_ORIGINS。
// 用法：npx tsx scripts/audit-engine.ts [模型 id]
import { MAGIC_MODELS, bricksFromMagic } from '../src/pages/matupix/brick/brickMagicModels.ts'
import { toLDraw } from '../src/pages/matupix/brick/brickLdraw.ts'
import { partHeight, partInfo, partMount, partOrigin, type Brick, type BrickType } from '../src/pages/matupix/brick/brickTypes.ts'
import { compose, emptyBox, IDENTITY, indexLibrary, isEmpty, measure, parseXform, type Box, type Xform } from './ldraw-geom.ts'
import { rotMatrix } from './audit-solid.ts'

const STUD = 20
const HEIGHT = 24
// 原点表只存到小数点后三位，渲染端用的是 alignPart() 的实算值，
// 导出端用表里的值，两者天生差半个末位（0.01 LDU 量级）。
const EPS = 0.02

indexLibrary()

type Vec3 = [number, number, number]

function translate(x: number, y: number, z: number): Xform {
  return { a: 1, b: 0, c: 0, x, d: 0, e: 1, f: 0, y, g: 0, h: 0, i: 1, z }
}

function scale(x: number, y: number, z: number): Xform {
  return { a: x, b: 0, c: 0, x: 0, d: 0, e: y, f: 0, y: 0, g: 0, h: 0, i: z, z: 0 }
}

function rotateX(deg: number): Xform {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return { a: 1, b: 0, c: 0, x: 0, d: 0, e: c, f: -s, y: 0, g: 0, h: s, i: c, z: 0 }
}

function rotateY(deg: number): Xform {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return { a: c, b: 0, c: s, x: 0, d: 0, e: 1, f: 0, y: 0, g: -s, h: 0, i: c, z: 0 }
}

function rotateZ(deg: number): Xform {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return { a: c, b: -s, c: 0, x: 0, d: s, e: c, f: 0, y: 0, g: 0, h: 0, i: 1, z: 0 }
}

// alignPart() 的对齐偏移：把包围盒中心对到零件原点。
// 渲染空间里 Y、Z 都被 Rx(π) 翻过，所以量的是 -maxY/24 和 -maxZ/20。
function alignOffset(type: BrickType, box: Box): Vec3 {
  const minX = box.minX / STUD
  const maxX = box.maxX / STUD
  const minY = -box.maxY / HEIGHT
  const maxY = -box.minY / HEIGHT
  const minZ = -box.maxZ / STUD
  const maxZ = -box.minZ / STUD
  const half = partHeight(type) / 2
  return [-(minX + maxX) / 2, -half - minY, -(minZ + maxZ) / 2]
}

/** 渲染端这条砖的完整变换：零件自己的 LDraw 顶点 → 渲染世界坐标。 */
function renderXform(brick: Brick, offset: Vec3): Xform {
  const origin = partOrigin(brick.type)
  const anchor = brick.anchor ?? [0, 0, 0]
  const point = partMount(brick.type) === 'point'
  const tilt = rotateX(brick.tilt ?? 0)
  const roll = rotateZ(brick.roll ?? 0)
  const flip = compose(rotateX(180), scale(1 / STUD, 1 / HEIGHT, 1 / STUD))
  // LDraw 矩阵件：渲染端多一层 part-ldraw-rot，直接吃官方矩阵。
  // 层级见 brickPartModel.ts：ldraw-rot → roll → tilt → 几何，
  // 矩阵在缩放里面，作用在 LDraw 原始坐标上。
  const ldraw = brick.ldraw ? rotMatrix(brick.ldraw.rot) : IDENTITY
  const inner = compose(ldraw, compose(roll, tilt))
  const aligned = compose(translate(offset[0], offset[1], offset[2]), compose(flip, inner))
  const pulled = point
    ? compose(translate(-origin[0], -origin[1], -origin[2]), aligned)
    : aligned
  return compose(
    translate(brick.position[0] + anchor[0], brick.position[1] + anchor[1], brick.position[2] + anchor[2]),
    compose(rotateY(brick.rotation), pulled),
  )
}

/** 渲染坐标的包围盒换算成 LDraw 单位。 */
function toLdrawBox(box: Box): Box {
  return {
    minX: box.minX * STUD,
    maxX: box.maxX * STUD,
    minY: -box.maxY * HEIGHT,
    maxY: -box.minY * HEIGHT,
    minZ: -box.maxZ * STUD,
    maxZ: -box.minZ * STUD,
  }
}

function diff(a: Box, b: Box) {
  return Math.max(
    Math.abs(a.minX - b.minX),
    Math.abs(a.maxX - b.maxX),
    Math.abs(a.minY - b.minY),
    Math.abs(a.maxY - b.maxY),
    Math.abs(a.minZ - b.minZ),
    Math.abs(a.maxZ - b.maxZ),
  )
}

function fmt(box: Box) {
  return `X ${box.minX.toFixed(3)}..${box.maxX.toFixed(3)}  Y ${box.minY.toFixed(3)}..${box.maxY.toFixed(3)}  Z ${box.minZ.toFixed(3)}..${box.maxZ.toFixed(3)}`
}

const originCache = new Map<BrickType, { offset: Vec3; box: Box }>()

function partBox(type: BrickType) {
  const cached = originCache.get(type)
  if (cached) return cached
  const box = emptyBox()
  measure(`${partInfo(type).ldraw}.dat`, IDENTITY, box)
  if (isEmpty(box)) throw new Error(`${type} 量不到几何`)
  const entry = { offset: alignOffset(type, box), box }
  originCache.set(type, entry)
  return entry
}

function main() {
  const only = process.argv[2]
  const models = only ? MAGIC_MODELS.filter((item) => item.id === only) : MAGIC_MODELS
  if (models.length === 0) throw new Error(`找不到模型 ${only}`)

  let pieces = 0
  let mismatched = 0
  let originDrift = 0
  const rows: string[] = []

  for (const model of models) {
    const bricks = bricksFromMagic(model.pieces)
    const { text } = toLDraw(bricks)
    const lines = text.split('\n').filter((line) => line.startsWith('1 '))
    bricks.forEach((brick, index) => {
      const line = lines[index]
      if (!line) throw new Error(`${model.id} 第 ${index} 件没有导出指令`)
      const file = line.trim().split(/\s+/).pop() as string
      const { offset } = partBox(brick.type)

      // 原点表要跟 alignPart() 的实算值一致，否则渲染和导出各算各的。
      const declared = partOrigin(brick.type)
      const drift = Math.max(...declared.map((value, i) => Math.abs(value - offset[i])))
      if (drift > 0.002) {
        originDrift += 1
        rows.push(`  ! ${model.id} ${brick.type} 原点表 [${declared.join(', ')}] 实算 [${offset.map((v) => v.toFixed(3)).join(', ')}]`)
      }

      const exportXform = parseXform(line)
      if (!exportXform) throw new Error(`${model.id} 第 ${index} 件导出指令解析失败`)
      const exportBox = emptyBox()
      measure(file, exportXform, exportBox)

      const renderBox = emptyBox()
      measure(file, renderXform(brick, offset), renderBox)
      const expected = toLdrawBox(renderBox)

      pieces += 1
      const delta = diff(expected, exportBox)
      if (delta > EPS) {
        mismatched += 1
        if (rows.length < 40) {
          rows.push(
            `  ! ${model.id} ${brick.type}#${index} 差 ${delta.toFixed(6)}\n      渲染→LDraw ${fmt(expected)}\n      导出       ${fmt(exportBox)}`,
          )
        }
      }
    })
  }

  console.log(`模型 ${models.length} 个，零件 ${pieces} 件`)
  console.log(`原点表不一致 ${originDrift} 处，渲染↔导出不一致 ${mismatched} 处`)
  for (const row of rows) console.log(row)
  if (originDrift || mismatched) process.exitCode = 1
}

main()
