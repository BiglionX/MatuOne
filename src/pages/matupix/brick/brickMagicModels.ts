import {
  BRICK_COLORS,
  BRICK_PARTS,
  centerForPlates,
  createBrickId,
  footprint,
  occupancyKeys,
  partMount,
  partOrigin,
  partPlates,
  type Brick,
  type BrickRotation,
  type BrickType,
} from './brickTypes'

// 原创布局。零件都是目录里已经能放的型号，按 stud 网格和板层搭在底板上。
// 没有套用 OMR、乐高套装说明书、Rebrickable 或 PixActivity 的模型文件。
// 拼法本身可以随仓库再分发。点卡片仍是整组换上，记入一次撤销。

const R = '#E23D3D'
const O = '#FE8A18'
const Y = '#F5C518'
const G = '#2EAD4B'
const B = '#2F6FED'
const P = '#81007B'
const W = '#FFFFFF'
const K = '#05131D'

export type MagicPiece = {
  type: BrickType
  color: string
  gx: number
  gz: number
  base: number
  rotation: BrickRotation
  /**
   * 连接点（渲染坐标：X/Z 按钉距、Y 按格高）。
   * 单连接点零件（头、发、手臂、手）的落点不在网格上，position 直接指这个连接点。
   */
  joint?: [number, number, number]
  /** 摆角（绕 X 轴，度），支点是零件自己的 LDraw 原点。 */
  tilt?: number
  /** 滚角（绕 Z 轴，度），支点同样是零件自己的 LDraw 原点。 */
  roll?: number
}

export type MagicModel = {
  id: string
  name: string
  size: 'small' | 'large'
  tint: string
  pieces: MagicPiece[]
}

type Add = (
  type: BrickType,
  color: string,
  gx: number,
  gz: number,
  base?: number,
  rotation?: BrickRotation,
  attach?: { joint: [number, number, number]; tilt?: number; roll?: number },
) => void

function bag(): { pieces: MagicPiece[]; add: Add } {
  const pieces: MagicPiece[] = []
  const add: Add = (type, color, gx, gz, base = 0, rotation = 0, attach) => {
    pieces.push({
      type,
      color,
      gx,
      gz,
      base,
      rotation,
      ...(attach ? { joint: attach.joint } : {}),
      ...(attach?.tilt === undefined ? {} : { tilt: attach.tilt }),
      ...(attach?.roll === undefined ? {} : { roll: attach.roll }),
    })
  }
  return { pieces, add }
}

function shift(pieces: readonly MagicPiece[], dx: number, dz: number): MagicPiece[] {
  return pieces.map((piece) => ({
    ...piece,
    gx: piece.gx + dx,
    gz: piece.gz + dz,
    // 连接点跟着一起平移，否则人偶会和身子错开。
    ...(piece.joint ? { joint: [piece.joint[0] + dx, piece.joint[1], piece.joint[2] + dz] as [number, number, number] } : {}),
  }))
}

function join(...groups: MagicPiece[][]): MagicPiece[] {
  return groups.flat()
}

function column(add: Add, type: BrickType, color: string, gx: number, gz: number, base: number, levels: number, rotation: BrickRotation = 0) {
  const step = partPlates(type)
  for (let level = 0; level < levels; level += 1) add(type, color, gx, gz, base + level * step, rotation)
}

// 人偶的装配点都落在网格之外，这些数字来自 LDraw 官方注释（!HELP）和零件原始几何。
// 渲染里 1 钉距 = 20 LDU、1 格高 = 24 LDU，Z 轴与 LDraw 反向。
const ARM_OFFSET_X = 15.552 / 20 // 肩窝离躯干中线，官方 !HELP：3818 放在 -15.552 9 0
const ARM_OFFSET_Y = 9 / 24
const ARM_ROLL = 9.782 // 肩窝斜面 9.782°，官方 !HELP 给的角度
// 头的 LDraw 原点落在头顶空心凸点的底面，脑袋往下长 24 LDU 才是下巴。
// 躯干颈柱在肩线以上露出 4 LDU，下巴正好压在这截上，所以头原点比躯干原点高 28 LDU。
const HEAD_OFFSET_Y = 28 / 24
// 手腕孔在手臂自身坐标里的孔口 (-5, 18.9, -9.9)，孔轴朝 (0, .7071, -.7071) 深 15 LDU；
// 手的凸柱沿自身 +Z 长 13，插进去之后孔底还余 2 LDU，所以手就落在孔口上。
const HAND_LOCAL: [number, number, number] = [-5, 18.9, -9.9]
const HAND_TILT = 45 // 手掌相对手腕孔的倾角：孔轴是竖直方向偏 45°

function figure(add: Add, x: number, z: number, base: number, cloth: string, hairColor: string) {
  add('legs', cloth, x, z, base)
  add('leg-right', cloth, x + 1, z, base)
  add('hip', cloth, x, z, base + 5)
  add('torso', cloth, x, z, base + 9)

  // 躯干的 LDraw 原点在脖子根，不在脚印中心，肩和颈都要拿它当基准。
  const origin = partOrigin('torso')
  const torso: [number, number, number] = [
    x + 1 + origin[0],
    centerForPlates(base + 9, 'torso') + origin[1],
    z + 0.5 + origin[2],
  ]

  // 头套在颈柱上，发再套在头的空心凸点上，两者原点与头重合。
  const head: [number, number, number] = [torso[0], torso[1] + HEAD_OFFSET_Y, torso[2]]
  add('head', Y, x, z, base + 15, 0, { joint: head })
  add('hair', hairColor, x, z, base + 19, 0, { joint: head })

  // 3818 是人偶的右臂。人偶面朝观者时，它的右臂落在画面左边。
  const armRight: [number, number, number] = [torso[0] - ARM_OFFSET_X, torso[1] - ARM_OFFSET_Y, torso[2]]
  const armLeft: [number, number, number] = [torso[0] + ARM_OFFSET_X, torso[1] - ARM_OFFSET_Y, torso[2]]
  add('arm-right', cloth, x - 1, z, base + 10, 0, { joint: armRight, roll: ARM_ROLL })
  add('arm-left', cloth, x + 2, z, base + 10, 0, { joint: armLeft, roll: -ARM_ROLL })

  // 手插在手腕孔里，跟着手臂的滚角一起转。3818 的孔在自己坐标的 -X 侧，
  // 3819 是它的镜像，孔在 +X 侧，镜像系数要跟着换。
  add('hand', Y, x - 1, z, base + 14, 0, {
    joint: handJoint(armRight, ARM_ROLL, 1),
    tilt: HAND_TILT,
    roll: ARM_ROLL,
  })
  add('hand', Y, x + 2, z, base + 14, 0, {
    joint: handJoint(armLeft, -ARM_ROLL, -1),
    tilt: HAND_TILT,
    roll: -ARM_ROLL,
  })
}

// 手腕孔在手臂自身坐标里，手的落点要跟着手臂的滚角一起转。
// mirror 是左右镜像：3818 的孔在 -X 侧，3819 的孔在 +X 侧。
function handJoint(arm: [number, number, number], roll: number, mirror: number): [number, number, number] {
  const r = (roll * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  const lx = HAND_LOCAL[0] * mirror
  const x = lx * c - HAND_LOCAL[1] * s
  const y = lx * s + HAND_LOCAL[1] * c
  return [arm[0] + x / 20, arm[1] - y / 24, arm[2] - HAND_LOCAL[2] / 20]
}

function bounds(pieces: readonly MagicPiece[]) {
  let minX = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxZ = -Infinity
  for (const piece of pieces) {
    const { width, depth } = footprint(piece.type, piece.rotation)
    minX = Math.min(minX, piece.gx)
    minZ = Math.min(minZ, piece.gz)
    maxX = Math.max(maxX, piece.gx + width)
    maxZ = Math.max(maxZ, piece.gz + depth)
  }
  return { minX, minZ, maxX, maxZ }
}

function centerPieces(pieces: readonly MagicPiece[]) {
  if (pieces.length === 0) return []
  const { minX, minZ, maxX, maxZ } = bounds(pieces)
  return shift(pieces, -Math.round((minX + maxX) / 2), -Math.round((minZ + maxZ) / 2))
}

function house(): MagicPiece[] {
  const { pieces, add } = bag()
  const wall = W
  const roof = R
  add('plate-6x8', Y, 0, 0)
  add('door', K, 2, 0, 1)
  column(add, '1x2', wall, 0, 0, 1, 5)
  column(add, '1x2', wall, 6, 0, 1, 5)
  add('cheese-1x2', wall, 0, 0, 16)
  add('cheese-1x2', wall, 6, 0, 16)
  add('brick-1x8', wall, 0, 0, 18)
  add('plate-1x8', wall, 0, 0, 21)
  add('brick-1x8', wall, 0, 5, 1)
  add('window', B, 1, 5, 4)
  add('window', B, 5, 5, 4)
  for (const base of [4, 7]) {
    add('1x1', wall, 0, 5, base)
    add('1x2', wall, 3, 5, base)
    add('1x1', wall, 7, 5, base)
  }
  add('plate-1x1', wall, 0, 5, 10)
  add('plate-1x2', wall, 3, 5, 10)
  add('plate-1x1', wall, 7, 5, 10)
  add('brick-1x8', wall, 0, 5, 11)
  add('brick-1x8', wall, 0, 5, 14)
  add('brick-1x8', wall, 0, 5, 17)
  add('plate-1x8', wall, 0, 5, 20)
  add('plate-1x8', wall, 0, 5, 21)
  for (const x of [0, 7]) {
    add('brick-1x4', wall, x, 1, 1, 90)
    add('window', B, x, 2, 4, 90)
    add('1x1', wall, x, 1, 4)
    add('1x1', wall, x, 4, 4)
    add('1x1', wall, x, 1, 7)
    add('1x1', wall, x, 4, 7)
    add('plate-1x1', wall, x, 1, 10)
    add('plate-1x1', wall, x, 4, 10)
    add('brick-1x4', wall, x, 1, 11, 90)
    add('brick-1x4', wall, x, 1, 14, 90)
    add('brick-1x4', wall, x, 1, 17, 90)
    add('plate-1x4', wall, x, 1, 20, 90)
    add('plate-1x4', wall, x, 1, 21, 90)
  }
  add('slope-2x4', roof, 0, 0, 22)
  add('slope-2x4', roof, 4, 0, 22)
  add('2x4', roof, 0, 2, 22)
  add('2x4', roof, 4, 2, 22)
  add('slope-2x4', roof, 0, 4, 22, 180)
  add('slope-2x4', roof, 4, 4, 22, 180)
  add('slope-2x4', roof, 0, 2, 25)
  add('slope-2x4', roof, 4, 2, 25, 180)
  add('2x2', K, 6, 0, 25)
  add('cone-2x2', K, 6, 0, 28)
  add('plate-1x4', K, 2, -1, 0)
  add('flower', R, 0, -1, 0)
  add('flower', Y, 7, -1, 0)
  add('bush', G, -2, 2, 0)
  add('bush', G, 8, 3, 0)
  return pieces
}

function cottage(wall: string, roofColor: string): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-6x6', Y, 0, 0)
  for (const base of [1, 4]) {
    add('1x2', wall, 0, 0, base)
    add('1x2', K, 2, 0, base)
    add('1x2', wall, 4, 0, base)
    add('brick-1x4', wall, 0, 1, base, 90)
    add('brick-1x4', wall, 5, 1, base, 90)
  }
  add('brick-1x6', wall, 0, 0, 7)
  add('brick-1x6', wall, 0, 5, 1)
  add('1x1', wall, 0, 5, 4)
  add('1x2', B, 1, 5, 4)
  add('1x1', wall, 3, 5, 4)
  add('1x2', B, 4, 5, 4)
  add('brick-1x6', wall, 0, 5, 7)
  // 两侧再补一层墙，屋顶中间的平顶才有东西托着。
  add('brick-1x4', wall, 0, 1, 7, 90)
  add('brick-1x4', wall, 5, 1, 7, 90)
  add('slope-2x4', roofColor, 0, 0, 10)
  add('slope-2x2', roofColor, 4, 0, 10)
  add('2x4', roofColor, 0, 2, 10)
  add('2x2', roofColor, 4, 2, 10)
  add('slope-2x4', roofColor, 0, 4, 10, 180)
  add('slope-2x2', roofColor, 4, 4, 10, 180)
  add('2x2', K, 4, 4, 13)
  add('cone-1x1', K, 4, 4, 16)
  add('cone-1x1', K, 5, 5, 16)
  add('plate-1x2', K, 2, -1, 0)
  add('flower', R, 0, -1, 0)
  add('flower', Y, 5, -1, 0)
  add('bush', G, 0, 6, 0)
  return pieces
}

function cabin(wall: string, roofColor: string): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-4x8', Y, 0, 0)
  add('plate-2x8', Y, 0, 4)
  add('brick-1x6', wall, 1, 0, 1)
  add('brick-1x6', wall, 1, 0, 4)
  add('1x1', wall, 0, 0, 1)
  add('1x1', wall, 7, 0, 1)
  add('1x1', wall, 0, 0, 4)
  add('1x1', wall, 7, 0, 4)
  add('brick-1x8', wall, 0, 0, 7)
  add('brick-1x8', wall, 0, 5, 1)
  add('1x2', B, 1, 5, 4)
  add('1x2', wall, 3, 5, 4)
  add('1x2', B, 5, 5, 4)
  add('brick-1x8', wall, 0, 5, 7)
  add('1x2', K, 0, 2, 1, 90)
  add('1x1', wall, 0, 4, 1)
  add('1x2', wall, 0, 2, 4, 90)
  add('1x1', wall, 0, 4, 4)
  add('brick-1x4', wall, 0, 1, 7, 90)
  add('brick-1x4', wall, 7, 1, 1, 90)
  add('brick-1x4', wall, 7, 1, 4, 90)
  add('brick-1x4', wall, 7, 1, 7, 90)
  add('plate-2x8', roofColor, 0, 0, 10)
  add('plate-2x8', roofColor, 0, 2, 10)
  add('plate-2x8', roofColor, 0, 4, 10)
  add('brick-1x6', roofColor, 1, 1, 11)
  add('brick-1x6', roofColor, 1, 4, 11)
  add('cone-2x2', K, 5, 2, 11)
  add('plate-1x4', K, 2, -1, 0)
  add('flower', P, 8, 1, 0)
  add('flower', R, 8, 4, 0)
  add('fence', W, 2, 6, 1)
  return pieces
}

function shop(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-6x8', Y, 0, 0)
  add('brick-1x8', W, 0, 0, 1)
  add('brick-1x4', W, 0, 0, 4)
  add('brick-1x4', W, 4, 0, 4)
  add('brick-1x8', O, 0, 0, 7)
  add('brick-1x8', W, 0, 5, 1)
  add('window', B, 1, 5, 4)
  add('1x2', W, 3, 5, 4)
  add('window', B, 5, 5, 4)
  add('brick-1x8', W, 0, 5, 11)
  add('brick-1x4', W, 0, 1, 1, 90)
  add('brick-1x4', W, 0, 1, 4, 90)
  add('brick-1x4', W, 0, 1, 7, 90)
  add('brick-1x4', W, 7, 1, 1, 90)
  add('brick-1x4', W, 7, 1, 7, 90)
  add('plate-4x8', O, 0, 0, 10)
  add('plate-1x8', O, 0, 4, 10)
  add('brick-1x6', R, 1, 0, 11)
  add('tile-1x4', W, 2, 1, 1)
  add('tile-1x4', W, 2, 1, 2)
  add('cup', Y, 2, 2, 11)
  add('cup', R, 4, 2, 11)
  add('flower', R, -1, 2, 0)
  add('flower', Y, -1, 4, 0)
  return pieces
}

function treeScene(): MagicPiece[] {
  const { pieces, add } = bag()
  // 草地底板把树干、树冠和花草全部连成一个整体。
  add('plate-8x8', G, 0, 0)
  const crown: Array<[number, number]> = [
    [1, 1],
    [1, 3],
    [1, 5],
    [3, 1],
    [3, 5],
    [5, 1],
    [5, 3],
    [5, 5],
  ]
  // 树冠一层层压在下层上，每一层都有依托，不会散开。
  for (const [x, z] of crown) add('bush', G, x, z, 1)
  column(add, 'cylinder-2x2', O, 3, 3, 1, 4)
  for (const [x, z] of crown) add('leaves', G, x, z, 5)
  for (const [x, z] of crown) add('bush', G, x, z, 7)
  for (const [x, z] of crown) add('leaves', G, x, z, 11)
  add('cone-2x2', G, 3, 3, 13)
  // 树顶的四个锥桶都压在最高那层锥体上，顶上的星星也就跟着连成一体。
  for (const [x, z] of [
    [3, 3],
    [4, 3],
    [3, 4],
    [4, 4],
  ] as const) add('cone-1x1', G, x, z, 19)
  add('star', Y, 3, 3, 22)
  for (const [x, z] of [
    [0, 0],
    [0, 2],
    [0, 4],
    [0, 6],
    [7, 1],
    [7, 3],
    [7, 5],
    [7, 7],
    [3, 0],
    [5, 7],
  ] as const) add('flower', R, x, z, 1)
  for (const [x, z] of [
    [0, 1],
    [0, 3],
    [0, 5],
    [0, 7],
  ] as const) add('1x1', K, x, z, 1)
  for (const [x, z] of [
    [7, 0],
    [7, 2],
    [7, 4],
    [7, 6],
  ] as const) add('round-1x1', O, x, z, 1)
  return pieces
}

function pine(): MagicPiece[] {
  const { pieces, add } = bag()
  column(add, 'cylinder-2x2', O, 2, 2, 0, 4)
  // 树冠一层层压在树干和下一层树冠上，整棵松树不会散开。
  const crown: Array<[number, number]> = [
    [1, 1],
    [3, 1],
    [1, 3],
    [3, 3],
  ]
  for (const [x, z] of crown) add('bush', G, x, z, 12)
  for (const [x, z] of crown) add('leaves', G, x, z, 16)
  add('cone-2x2', G, 2, 2, 18)
  for (const [x, z] of crown) add('bush', G, x, z, 24)
  add('cone-2x2', G, 2, 2, 28)
  add('cone-1x1', G, 2, 2, 34)
  // 花草紧挨树干，才算这棵树的一部分。
  add('flower', R, 2, 1, 0)
  add('flower', Y, 4, 3, 0)
  add('flower', P, 1, 3, 0)
  return pieces
}

function well(): MagicPiece[] {
  const { pieces, add } = bag()
  add('cylinder-4x4', K, 0, 0, 0)
  add('cylinder-2x2', B, 1, 1, 3)
  add('brick-1x4', O, 0, 0, 3)
  add('brick-1x4', O, 0, 3, 3)
  add('1x2', O, 0, 1, 3, 90)
  add('1x2', O, 3, 1, 3, 90)
  add('bar-4l', K, 0, 0, 6)
  add('bar-4l', K, 3, 0, 6)
  add('brick-1x4', O, 0, 0, 16)
  add('cone-1x1', R, 1, 0, 19)
  add('cup', O, 4, 1, 0)
  add('plate-1x2', O, -2, 0, 0)
  return pieces
}

function robot(): MagicPiece[] {
  const { pieces, add } = bag()
  column(add, '2x2', B, 0, 1, 0, 5)
  column(add, '2x2', B, 2, 1, 0, 5)
  column(add, '2x2', B, 4, 1, 0, 5)
  add('plate-4x8', B, 0, 0, 15)
  column(add, '2x2', B, 0, 0, 16, 3)
  column(add, '2x2', B, 4, 0, 16, 3)
  column(add, '2x2', B, 0, 2, 16, 3)
  column(add, '2x2', B, 4, 2, 16, 3)
  column(add, '1x2', R, 2, 0, 16, 3)
  column(add, '2x2', K, 2, 2, 16, 6)
  figure(add, 2, 1, 16, B, K)
  add('round-1x1', Y, 2, 0, 25)
  add('round-1x1', Y, 3, 0, 25)
  add('antenna', K, 2, 1, 38)
  add('sword', Y, 6, 1, 16)
  add('shield', R, 0, 1, 32)
  add('cone-1x1', O, 2, 3, 34)
  add('cone-1x1', O, 3, 3, 34)
  add('slope-2x2', K, -2, 1, 0)
  add('slope-2x2', K, 6, 1, 0)
  return pieces
}

function f1(): MagicPiece[] {
  const { pieces, add } = bag()
  add('tyre', K, 4, 0)
  add('tyre', K, 4, 5)
  add('tyre', K, 12, 0)
  add('tyre', K, 14, 0)
  add('tyre', K, 12, 5)
  add('tyre', K, 14, 5)
  add('plate-4x6', K, 0, 1)
  add('plate-4x8', K, 6, 1)
  add('plate-4x6', K, 14, 1)
  add('slope-2x2', R, 0, 1, 1)
  add('slope-2x2', R, 0, 3, 1)
  add('wedge-2x2-left', R, 2, 1, 1)
  add('wedge-2x2-right', R, 2, 3, 1)
  add('brick-1x6', R, 4, 1, 1)
  add('brick-1x6', R, 4, 4, 1)
  add('seat', K, 8, 2, 1)
  add('windscreen', B, 4, 2, 1)
  add('steer', K, 6, 2, 8)
  add('round-1x1', Y, 8, 2, 7)
  add('1x1', K, 9, 2, 7)
  add('2x4', R, 12, 1, 1)
  add('2x4', R, 12, 3, 1)
  add('slope-2x2', R, 16, 1, 1)
  add('slope-2x2', R, 16, 3, 1)
  add('bar-4l', K, 17, 1, 4)
  add('bar-4l', K, 17, 4, 4)
  add('brick-1x6', K, 17, 0, 14, 90)
  add('plate-1x6', R, 17, 0, 17, 90)
  add('plate-1x4', R, 0, 0, 0)
  add('plate-1x4', R, 0, 5, 0)
  add('tile-1x2', Y, 0, 0, 1)
  add('tile-1x2', Y, 0, 5, 1)
  add('round-1x1', Y, 5, 1, 4)
  add('round-1x1', Y, 5, 4, 4)
  add('tile-1x4', W, 6, 1, 4)
  add('tile-1x4', W, 6, 4, 4)
  add('cone-1x1', K, 15, 2, 4)
  add('cone-1x1', K, 15, 3, 4)
  add('tile-1x2', K, 4, 0, 5)
  add('tile-1x2', K, 4, 5, 5)
  add('1x1', R, 2, 0, 1)
  add('1x1', R, 2, 5, 1)
  add('tile-1x1', W, 1, 1, 4)
  add('tile-1x1', K, 1, 1, 5)
  add('plate-1x2', K, 12, 0, 5)
  add('plate-1x2', K, 12, 5, 5)
  return pieces
}

function fireEngine(): MagicPiece[] {
  const { pieces, add } = bag()
  add('tyre', K, 1, 0)
  add('tyre', K, 6, 0)
  add('tyre', K, 11, 1)
  add('tyre', K, 1, 4)
  add('tyre', K, 6, 4)
  add('tyre', K, 11, 3)
  // 车厢下面补两根底盘纵梁，车身才不会整个架在两排轮子中间。
  add('brick-1x8', K, 0, 1, 0)
  add('brick-1x8', K, 0, 3, 0)
  add('brick-2x8', K, 0, 1, 3)
  add('brick-1x8', K, 0, 3, 3)
  add('plate-2x8', K, 8, 1, 5)
  add('plate-1x8', K, 8, 3, 5)
  add('brick-2x3', W, 0, 1, 6)
  add('1x2', W, 0, 3, 6)
  add('1x1', W, 2, 3, 6)
  add('1x1', W, 3, 3, 6)
  add('windscreen', B, 0, 1, 9)
  add('brick-2x8', R, 4, 1, 6)
  add('brick-1x8', R, 4, 3, 6)
  add('2x4', R, 12, 1, 6)
  add('brick-1x4', R, 12, 3, 6)
  add('brick-1x8', Y, 4, 1, 9)
  add('brick-1x8', Y, 4, 2, 9)
  add('brick-1x4', Y, 12, 1, 9)
  add('brick-1x4', Y, 12, 2, 9)
  add('round-1x1', R, 0, 3, 9)
  add('round-1x1', B, 3, 3, 9)
  add('1x2', R, 0, 1, 16)
  add('round-1x1', Y, 0, 2, 16)
  add('antenna', K, 2, 1, 16)
  add('cone-1x1', R, 15, 1, 12)
  add('cone-1x1', R, 15, 3, 9)
  for (const x of [5, 6, 7, 8, 9, 10]) add('tile-1x1', W, x, 3, 9)
  add('round-1x1', K, 8, 3, 10)
  add('round-1x1', K, 9, 3, 10)
  add('round-1x1', K, 8, 3, 13)
  add('round-1x1', K, 9, 3, 13)
  add('plate-1x2', K, 1, 0, 5)
  add('plate-1x2', K, 1, 4, 5)
  add('1x1', Y, 14, 3, 9)
  add('grille', K, 0, 3, 12)
  add('plate-1x4', W, 4, 0, 5)
  add('plate-1x4', W, 4, 4, 5)
  return pieces
}

function plane(): MagicPiece[] {
  const { pieces, add } = bag()
  add('brick-2x8', W, 2, 4, 0)
  add('brick-2x6', W, 10, 4, 0)
  add('slope-2x2', B, 0, 4, 0)
  add('slope-2x2', W, 16, 4, 0)
  add('2x4', B, 2, 4, 3)
  add('2x4', W, 12, 4, 3)
  add('plate-2x12', B, 6, -2, 3, 90)
  add('plate-2x12', B, 8, -2, 3, 90)
  add('cylinder-2x2', K, 6, -1, 0)
  add('cylinder-2x2', K, 8, -1, 0)
  add('cylinder-2x2', K, 6, 8, 0)
  add('cylinder-2x2', K, 8, 8, 0)
  add('canopy', B, 4, 2, 6)
  add('seat', K, 8, 4, 4)
  add('steer', K, 6, 4, 12)
  // 尾翼下面补两块托板，尾翼才不会悬在半空。
  add('1x2', R, 14, 2, 0)
  add('1x2', R, 14, 6, 0)
  add('slope-2x2', R, 14, 2, 3)
  add('slope-2x2', R, 14, 6, 3)
  add('1x2', R, 15, 4, 6, 90)
  add('1x2', R, 15, 4, 9, 90)
  add('cone-1x1', R, 15, 4, 12)
  for (const x of [3, 7, 9, 13]) {
    add('round-1x1', B, x, 3, 0)
    add('round-1x1', B, x, 6, 0)
  }
  add('tyre', K, 4, 3)
  add('tyre', K, 4, 6)
  add('tyre', K, 11, 3)
  add('tyre', K, 11, 6)
  add('round-1x1', K, 6, -1, 4)
  add('round-1x1', K, 8, -1, 4)
  add('round-1x1', K, 6, 8, 4)
  add('round-1x1', K, 8, 8, 4)
  add('plate-1x1', K, 4, 3, 5)
  add('plate-1x1', K, 4, 6, 5)
  add('plate-1x1', K, 11, 3, 5)
  add('plate-1x1', K, 11, 6, 5)
  add('tile-1x2', R, 0, 4, 3)
  add('tile-1x2', B, 2, 3, 3)
  add('tile-1x2', B, 2, 6, 3)
  return pieces
}

function rocket(): MagicPiece[] {
  const { pieces, add } = bag()
  for (const [x, z] of [
    [3, 3],
    [4, 3],
    [3, 4],
    [4, 4],
  ] as const) add('cone-1x1', x === z ? O : Y, x, z, 0)
  column(add, 'cylinder-2x2', W, 3, 3, 3, 7)
  add('cone-2x2', R, 3, 3, 24)
  add('cone-1x1', R, 3, 3, 30)
  add('antenna', K, 4, 4, 30)
  for (const [x, z] of [
    [0, 3],
    [1, 3],
    [0, 4],
    [1, 4],
    [6, 3],
    [7, 3],
    [6, 4],
    [7, 4],
  ] as const) add('cone-1x1', z === 3 ? O : Y, x, z, 0)
  column(add, 'cylinder-2x2', W, 0, 3, 3, 5)
  column(add, 'cylinder-2x2', W, 6, 3, 3, 5)
  add('cone-2x2', R, 0, 3, 18)
  add('cone-2x2', R, 6, 3, 18)
  // 助推器斜撑直接落地，火箭尾巴才不是悬在半空。
  add('slope-2x2', R, 3, 1, 1)
  add('slope-2x2', R, 3, 5, 1)
  add('slope-2x2', O, 1, 1, 0)
  add('slope-2x2', O, 6, 1, 0)
  add('slope-2x2', O, 1, 5, 0)
  add('slope-2x2', O, 6, 5, 0)
  add('plate-1x3', K, 3, 2, 0)
  add('plate-1x3', K, 3, 5, 0)
  add('1x1', K, 5, 6, 0)
  column(add, '1x1', K, 9, 3, 0, 8)
  add('brick-1x6', K, 5, 3, 24)
  return pieces
}

function castle(): MagicPiece[] {
  const { pieces, add } = bag()
  for (const [x, z] of [
    [0, 0],
    [8, 0],
    [0, 8],
    [8, 8],
  ] as const) {
    column(add, 'cylinder-2x2', W, x, z, 0, 5)
    add('cone-2x2', R, x, z, 15)
    add('flag', R, x, z, 21)
  }
  for (const base of [0, 3, 6]) {
    if (base === 0) add('arch-1x6', Y, 2, 0, base)
    else add('brick-1x6', Y, 2, 0, base)
    add('brick-1x6', Y, 2, 9, base)
    add('brick-1x6', Y, 0, 2, base, 90)
    add('brick-1x6', Y, 9, 2, base, 90)
  }
  add('plate-6x6', Y, 1, 2)
  column(add, '2x2', W, 3, 4, 1, 4)
  add('cone-2x2', R, 3, 4, 13)
  for (const x of [2, 4, 6]) {
    add('1x1', Y, x, 0, 9)
    add('1x1', Y, x, 9, 9)
  }
  for (const z of [2, 4, 6]) {
    add('1x1', Y, 0, z, 9)
    add('1x1', Y, 9, z, 9)
  }
  add('flower', R, -1, 4, 0)
  add('flower', Y, 10, 4, 0)
  add('bush', G, 4, -2, 0)
  add('bush', G, 4, 10, 0)
  return pieces
}

function helicopter(): MagicPiece[] {
  const { pieces, add } = bag()
  // 滑橇贴地，龙骨夹在两橇之间，机身直接压在滑橇和龙骨上。
  add('brick-1x10', K, 0, 0, 0)
  add('brick-1x10', K, 0, 3, 0)
  add('brick-1x6', K, 0, 1, 0)
  add('brick-1x6', K, 0, 2, 0)
  add('brick-1x6', K, 6, 1, 0)
  add('brick-2x6', B, 0, 0, 3)
  add('brick-2x6', W, 0, 2, 3)
  add('brick-1x4', B, 0, 0, 6)
  add('brick-1x4', W, 0, 3, 6)
  add('windscreen', B, 0, 1, 6)
  add('seat', K, 4, 1, 6)
  add('brick-2x8', K, 6, 1, 3)
  add('brick-1x6', K, 6, 1, 6)
  add('brick-1x4', K, 6, 1, 9)
  add('slope-2x2', R, 12, 0, 6)
  add('slope-2x2', R, 12, 2, 6)
  add('propeller', R, 12, 1, 9)
  add('plate-1x6', K, 4, 1, 12)
  add('bar-4l', K, 1, 1, 13)
  add('propeller', K, 0, 1, 23)
  add('propeller', K, 1, 0, 30, 90)
  add('cone-1x1', Y, 1, 1, 37)
  add('round-1x1', Y, 0, 1, 13)
  add('round-1x1', R, 3, 1, 13)
  add('round-1x1', Y, 0, 2, 13)
  add('round-1x1', R, 3, 2, 13)
  for (const x of [6, 7, 8, 9]) {
    add('1x1', B, x, 0, 3)
    add('1x1', W, x, 3, 3)
  }
  add('1x1', B, 4, 0, 6)
  add('1x1', B, 5, 0, 6)
  add('1x1', W, 4, 3, 6)
  add('1x1', W, 5, 3, 6)
  add('tile-1x4', B, 6, 0, 6)
  add('tile-1x4', B, 6, 3, 6)
  add('plate-1x2', K, 6, 0, 7)
  add('plate-1x2', K, 8, 0, 7)
  add('plate-1x2', K, 6, 3, 7)
  add('plate-1x2', K, 8, 3, 7)
  add('plate-1x2', K, 4, 0, 9)
  add('plate-1x2', K, 4, 3, 9)
  add('antenna', K, 8, 1, 13)
  return pieces
}

function train(): MagicPiece[] {
  const { pieces, add } = bag()
  for (const [index, x] of [0, 8, 16, 24].entries()) {
    add('tyre', K, x, 0)
    add('tyre', K, x + 4, 0)
    add('tyre', K, x, 3)
    add('tyre', K, x + 4, 3)
    add('brick-2x6', index === 0 ? K : index === 3 ? R : B, x, 1, 0)
    if (index > 0) add('plate-1x2', K, x - 2, 1, 0)
    if (index === 0) {
      add('windscreen', B, x, 1, 3)
      add('2x2', R, x + 4, 1, 3)
      add('cone-2x2', K, x + 4, 1, 6)
      add('cone-1x1', K, x + 4, 1, 12)
      add('round-1x1', Y, x, 1, 10)
    } else {
      for (const dx of [1, 2, 3, 4]) {
        add('1x1', index === 3 ? W : Y, x + dx, 1, 3)
        add('1x1', index === 3 ? W : Y, x + dx, 2, 3)
      }
      add('plate-2x4', index === 3 ? R : W, x + 1, 1, 6)
      if (index === 3) add('cone-1x1', K, x + 2, 1, 7)
    }
  }
  return pieces
}

function crane(): MagicPiece[] {
  const { pieces, add } = bag()
  add('tyre', K, 0, 0)
  add('tyre', K, 8, 0)
  add('tyre', K, 0, 4)
  add('tyre', K, 8, 4)
  add('plate-2x8', K, 1, 1)
  add('plate-1x8', K, 1, 3)
  add('brick-2x3', Y, 1, 1, 1)
  add('1x2', Y, 1, 3, 1)
  add('windscreen', B, 1, 1, 4)
  add('2x2', K, 5, 1, 1)
  add('2x2', K, 5, 1, 4)
  add('bar-4l', K, 5, 1, 7)
  // 吊臂根部垫一块底座，吊臂第一节才不会悬在驾驶室旁边。
  add('1x2', K, 7, 1, 1)
  for (let step = 0; step < 5; step += 1) {
    add('1x2', Y, 7 + step, 1, 4 + step * 3)
    add('1x2', O, 7 + step, 2, 4 + step * 3)
  }
  add('brick-1x4', Y, 1, 3, 4)
  add('brick-1x4', Y, 1, 3, 7)
  add('cone-1x1', R, 11, 1, 19)
  add('cone-1x1', R, 12, 1, 19)
  for (const base of [0, 3, 6, 9, 12, 15]) add('1x1', K, 13, 1, base)
  add('cone-1x1', O, 13, 1, 18)
  add('round-1x1', Y, 1, 3, 10)
  add('round-1x1', R, 2, 3, 10)
  add('grille', K, 1, 0, 5)
  figure(add, 10, 4, 0, Y, K)
  return pieces
}

function sailboat(): MagicPiece[] {
  const { pieces, add } = bag()
  add('brick-4x6', B, 0, 1, 0)
  add('brick-4x6', B, 6, 1, 0)
  add('slope-2x2', W, 12, 1, 0)
  add('slope-2x2', W, 12, 3, 0)
  add('2x4', W, 2, 2, 3)
  add('seat', W, 6, 2, 3)
  add('bar-4l', K, 4, 2, 6)
  add('bar-4l', K, 4, 2, 16)
  add('panel-1x4', W, 2, 3, 6)
  add('panel-1x4', W, 2, 3, 9)
  add('plate-1x6', W, 1, 3, 12)
  add('plate-1x6', W, 1, 3, 13)
  add('tile-1x6', W, 1, 3, 14)
  add('tile-1x6', W, 1, 3, 15)
  add('flag', R, 4, 2, 26)
  for (const x of [1, 2, 3]) {
    add('round-1x1', Y, x, 1, 3)
    add('round-1x1', R, x, 4, 3)
  }
  add('plate-2x4', B, 8, 2, 3)
  add('brick-1x4', W, 8, 1, 3)
  add('brick-1x4', W, 8, 4, 3)
  add('cone-1x1', R, 13, 2, 3)
  add('round-1x1', K, 15, 2, 0)
  add('cylinder-2x2', R, 15, 2, 3)
  add('cone-2x2', W, 15, 2, 6)
  add('plate-1x2', W, 0, 2, 3)
  add('1x1', W, 2, 2, 6)
  add('cone-1x1', R, 2, 2, 9)
  for (const x of [8, 9, 10, 11]) add('1x1', O, x, 2, 4)
  add('1x1', Y, 8, 3, 4)
  add('1x1', Y, 9, 3, 4)
  add('flower', R, 0, 5, 0)
  add('flower', Y, 4, 5, 0)
  add('flower', P, 8, 5, 0)
  add('flower', W, 12, 5, 0)
  add('bush', G, 14, 0, 0)
  return pieces
}

function tractor(): MagicPiece[] {
  const { pieces, add } = bag()
  add('tyre-small', K, 7, 0)
  add('tyre-small', K, 7, 5)
  add('tyre', K, 1, 0)
  add('tyre', K, 1, 5)
  add('brick-2x6', G, 2, 2, 0)
  add('brick-1x6', G, 2, 1, 0)
  add('brick-1x6', G, 2, 4, 0)
  add('2x4', G, 3, 2, 3)
  add('2x2', Y, 3, 2, 6)
  add('seat', K, 5, 2, 6)
  add('steer', K, 3, 2, 9)
  add('grille', K, 2, 1, 3)
  add('cone-1x1', K, 6, 1, 3)
  add('cylinder-2x2', G, 8, 2, 0)
  add('cone-2x2', Y, 8, 2, 3)
  add('tile-1x2', Y, 4, 1, 3)
  add('tile-1x4', Y, 3, 4, 3)
  add('round-1x1', Y, 2, 2, 3)
  add('round-1x1', R, 2, 4, 3)
  add('plate-1x2', K, 10, 2, 0)
  add('plate-4x6', O, 12, 1, 0)
  add('tyre', K, 12, 0)
  add('tyre', K, 15, 0)
  add('tyre', K, 12, 5)
  add('tyre', K, 15, 5)
  add('brick-1x4', O, 13, 1, 1)
  add('brick-1x4', O, 13, 4, 1)
  add('2x4', Y, 13, 2, 1)
  for (const x of [13, 14, 15, 16]) {
    add('1x1', Y, x, 2, 4)
    add('1x1', O, x, 3, 4)
  }
  add('cone-1x1', R, 17, 2, 1)
  add('flower', R, 1, 2, 0)
  add('flower', Y, 1, 3, 0)
  add('flower', P, 18, 2, 0)
  return pieces
}

function fieldTractor(): MagicPiece[] {
  const { pieces, add } = bag()
  add('tyre-small', K, 6, 0)
  add('tyre-small', K, 6, 5)
  add('tyre', K, 0, 0)
  add('tyre', K, 0, 5)
  add('brick-2x3', G, 1, 2, 0)
  add('brick-1x4', G, 1, 1, 0)
  add('brick-1x4', G, 1, 4, 0)
  add('2x2', Y, 2, 2, 3)
  add('seat', K, 4, 2, 3)
  add('cone-1x1', K, 4, 1, 3)
  add('grille', K, 1, 1, 3)
  add('plate-4x6', O, 9, 1, 0)
  add('tyre', K, 9, 0)
  add('tyre', K, 12, 0)
  add('tyre', K, 9, 5)
  add('tyre', K, 12, 5)
  add('brick-1x4', K, 4, 2, 0)
  add('1x1', K, 8, 2, 0)
  for (const x of [9, 11, 13]) {
    add('1x1', Y, x, 1, 1)
    add('1x1', Y, x, 2, 1)
    add('1x1', Y, x, 3, 1)
    add('1x1', O, x, 2, 4)
  }
  add('brick-1x4', O, 10, 4, 1)
  return pieces
}

function lighthouse(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-8x8', K, -2, -2)
  for (let level = 0; level < 8; level += 1) {
    add('cylinder-4x4', level % 2 === 0 ? W : R, 0, 0, 1 + level * 3)
    add('1x1', B, -1, 1, 1 + level * 3)
    add('1x1', B, 4, 2, 1 + level * 3)
  }
  for (let level = 0; level < 4; level += 1) add('cylinder-2x2', W, 1, 1, 25 + level * 3)
  add('cone-2x2', Y, 1, 1, 37)
  add('round-1x1', Y, 1, 1, 43)
  add('antenna', K, 2, 2, 43)
  add('door', K, 0, -1, 1)
  add('fence', W, -2, -2, 1)
  add('fence', W, 2, -2, 1)
  add('fence', W, -2, 4, 1)
  add('fence', W, 2, 4, 1)
  add('brick-1x4', W, 0, 0, 25)
  add('brick-1x4', W, 0, 3, 25)
  add('brick-1x4', W, 0, 0, 28, 90)
  add('brick-1x4', W, 3, 0, 28, 90)
  add('2x2', K, -4, 3, 0)
  add('1x2', K, 5, 3, 1)
  add('bush', G, 6, -2, 0)
  add('flower', R, -3, -2, 0)
  add('flower', Y, 5, 5, 1)
  return pieces
}

function dinosaur(): MagicPiece[] {
  const { pieces, add } = bag()
  // 四条腿都顶在身体底面下，腿冠只放在腿上，不再往外飘。
  for (const [x, z] of [
    [1, 1],
    [6, 1],
  ] as const) {
    add('2x2', G, x, z, 0)
    add('1x1', G, x, z, 3)
    add('1x1', G, x + 1, z, 3)
  }
  for (const [x, z] of [
    [1, 3],
    [6, 3],
  ] as const) {
    add('2x2', G, x, z, 0)
    add('1x1', G, x, z + 1, 3)
    add('1x1', G, x + 1, z + 1, 3)
  }
  for (const [x, z] of [
    [1, 0],
    [2, 0],
    [6, 0],
    [7, 0],
    [1, 5],
    [2, 5],
    [6, 5],
    [7, 5],
  ] as const) add('1x1', G, x, z, 0)
  add('plate-2x3', G, 3, 2, 0)
  add('brick-2x8', G, 1, 2, 3)
  add('brick-2x6', G, 2, 2, 6)
  // 脖子落在地上的底座上，头才不会悬在半空；脖子根贴着身体前缘。
  add('2x4', G, -5, 2, 0)
  add('brick-2x3', G, -2, 2, 3)
  add('slope-2x2', G, -4, 2, 3)
  add('slope-2x1', G, -5, 2, 3)
  add('cone-1x1', G, -4, 2, 6)
  add('cone-1x1', G, -3, 2, 6)
  // 尾巴同样落在地上的底座上，尾尖才有着落。
  add('2x4', G, 9, 2, 0)
  add('brick-2x3', G, 9, 2, 3)
  add('slope-2x2', G, 12, 2, 3)
  add('slope-2x2', G, 12, 2, 6)
  add('tile-round-1x1', W, 13, 2, 9)
  add('tile-round-1x1', K, 12, 2, 9)
  add('tile-1x2', W, 12, 1, 0)
  add('brick-1x3', G, 9, 1, 0)
  add('brick-1x3', G, 9, 4, 0)
  for (const x of [2, 4, 6]) add('cone-1x1', O, x, 2, 9)
  add('plate-1x4', G, -2, 2, 6)
  add('plate-1x4', G, -2, 3, 6)
  add('1x1', R, 12, 3, 9)
  return pieces
}

function raptor(): MagicPiece[] {
  const { pieces, add } = bag()
  for (const [x, z] of [
    [4, 1],
    [8, 1],
    [4, 4],
    [8, 4],
  ] as const) {
    add('1x2', G, x, z, 0)
    add('1x1', G, x, z, 3)
  }
  add('brick-2x8', G, 3, 2, 3)
  add('brick-2x6', O, 4, 2, 6)
  // 脖子、头和尾巴都落在地上的底座上，嘴和后腿才不会悬在半空。
  add('brick-1x6', G, -3, 2, 0)
  add('brick-1x6', G, -3, 2, 3)
  add('brick-1x4', G, -7, 2, 0)
  add('brick-1x4', G, -7, 2, 3)
  add('slope-2x2', G, -9, 2, 3)
  add('2x4', G, 11, 2, 0)
  add('brick-2x3', G, 11, 2, 3)
  add('slope-2x2', G, 14, 2, 3)
  add('tile-round-1x1', Y, 15, 2, 6)
  add('cone-1x1', R, 15, 3, 6)
  for (const x of [4, 6, 8]) add('cone-1x1', R, x, 2, 9)
  add('1x2', G, 11, 1, 3)
  add('1x2', G, 11, 4, 3)
  add('plate-1x4', G, 0, 2, 6)
  add('plate-1x4', G, 0, 3, 6)
  return pieces
}

function longneck(): MagicPiece[] {
  const { pieces, add } = bag()
  for (const [x, z] of [
    [2, 1],
    [7, 1],
    [2, 4],
    [7, 4],
  ] as const) column(add, '1x1', G, x, z, 0, 3)
  add('brick-2x6', G, 2, 2, 6)
  add('2x4', O, 3, 2, 9)
  add('brick-1x4', G, -2, 2, 6)
  add('slope-2x2', G, -4, 2, 6)
  column(add, '1x1', G, 8, 2, 6, 5)
  column(add, '1x1', G, 8, 3, 6, 5)
  add('slope-2x2', G, 8, 2, 21)
  add('tile-round-1x1', K, 9, 2, 24)
  add('cone-1x1', O, 6, 2, 12)
  add('cone-1x1', O, 4, 2, 12)
  add('plate-1x4', G, 3, 2, 15)
  add('plate-1x4', G, 3, 3, 15)
  add('flower', Y, -5, 2, 6)
  add('flower', Y, 1, 1, 0)
  add('flower', R, 6, 1, 0)
  return pieces
}

function barn(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-6x10', R, 0, 0)
  add('1x2', R, 0, 0, 1)
  add('1x2', R, 2, 0, 1)
  add('brick-1x4', K, 4, 0, 1)
  add('1x2', R, 8, 0, 1)
  add('1x2', R, 0, 0, 4)
  add('brick-1x4', K, 4, 0, 4)
  add('1x2', R, 8, 0, 4)
  add('brick-1x10', R, 0, 0, 7)
  add('brick-1x10', W, 0, 5, 1)
  add('1x2', B, 2, 5, 4)
  add('1x2', W, 4, 5, 4)
  add('1x2', B, 6, 5, 4)
  add('brick-1x10', W, 0, 5, 7)
  for (const base of [1, 4]) {
    add('brick-1x4', R, 0, 1, base, 90)
    add('brick-1x4', R, 9, 1, base, 90)
  }
  // 中间隔墙把中间的平屋顶顶起来。
  add('brick-1x10', R, 0, 2, 7)
  add('slope-2x4', W, 0, 0, 10)
  add('slope-2x4', W, 4, 0, 10)
  add('slope-2x2', W, 8, 0, 10)
  add('2x4', R, 0, 2, 10)
  add('2x4', R, 4, 2, 10)
  add('2x2', R, 8, 2, 10)
  add('slope-2x4', W, 0, 4, 10, 180)
  add('slope-2x4', W, 4, 4, 10, 180)
  add('slope-2x2', W, 8, 4, 10, 180)
  add('plate-1x4', K, 4, -1, 0)
  add('flower', Y, -1, 2, 0)
  add('bush', G, 10, 2, 0)
  return pieces
}

function towerCrane(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-6x6', Y, 0, 0)
  for (const [x, z] of [
    [1, 1],
    [3, 1],
    [1, 3],
    [3, 3],
  ] as const) column(add, '1x1', Y, x, z, 1, 8)
  for (const base of [4, 10, 16]) {
    add('1x1', Y, 2, 1, base)
    add('1x1', Y, 2, 3, base)
    add('1x1', Y, 1, 2, base)
    add('1x1', Y, 3, 2, base)
  }
  add('brick-1x12', Y, 0, 1, 25)
  // 配重压在吊臂尾端，塔顶标志杆从塔身正上方的吊臂长出来。
  add('brick-1x6', O, 6, 1, 28)
  add('cone-1x1', R, 2, 1, 28)
  add('1x1', K, 2, 1, 31)
  add('1x1', K, 2, 1, 34)
  add('1x1', K, 2, 1, 37)
  add('brick-2x3', K, 1, 4, 1)
  add('tyre', K, -2, 1)
  add('tyre', K, -2, 4)
  return pieces
}

function halfWall(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-4x8', O, 0, 0)
  add('brick-1x8', O, 0, 0, 1)
  add('brick-1x8', O, 0, 3, 1)
  add('1x2', O, 0, 1, 1, 90)
  add('1x2', O, 7, 1, 1, 90)
  add('brick-1x8', Y, 0, 0, 4)
  add('brick-1x4', Y, 0, 0, 7)
  add('window', B, 4, 0, 7)
  add('brick-1x4', Y, 0, 3, 4)
  add('1x1', Y, 0, 1, 4)
  add('1x1', Y, 7, 1, 4)
  add('cone-1x1', R, 1, 3, 7)
  add('cone-1x1', R, 2, 3, 7)
  return pieces
}

function barge(): MagicPiece[] {
  const { pieces, add } = bag()
  add('brick-4x10', B, 0, 1, 0)
  add('brick-4x6', B, 10, 1, 0)
  add('slope-2x2', W, 16, 1, 0)
  add('slope-2x2', W, 16, 3, 0)
  add('brick-2x6', O, 2, 2, 3)
  add('brick-2x6', Y, 8, 2, 3)
  add('2x2', K, 4, 2, 6)
  add('2x2', K, 8, 2, 6)
  add('cone-1x1', R, 14, 2, 3)
  add('round-1x1', Y, 1, 1, 3)
  add('round-1x1', Y, 1, 4, 3)
  add('plate-1x6', K, 2, 1, 3)
  add('plate-1x6', K, 2, 4, 3)
  add('brick-1x4', W, 6, 1, 6)
  add('flag', R, 15, 2, 3)
  return pieces
}

function fishingBoat(): MagicPiece[] {
  const { pieces, add } = bag()
  add('brick-2x8', B, 0, 1, 0)
  add('brick-2x6', W, 8, 1, 0)
  add('slope-2x2', W, 14, 1, 0)
  add('seat', K, 2, 1, 3)
  add('brick-1x4', O, 5, 2, 3)
  add('bar-4l', K, 7, 1, 3)
  add('flag', R, 7, 1, 13)
  add('round-1x1', Y, 1, 1, 3)
  add('round-1x1', R, 10, 1, 3)
  add('cone-1x1', K, 4, 2, 3)
  add('plate-1x4', B, 11, 1, 3)
  add('plate-1x4', B, 11, 2, 3)
  add('1x1', W, 6, 1, 6)
  add('1x1', W, 8, 1, 6)
  return pieces
}

function airliner(): MagicPiece[] {
  const { pieces, add } = bag()
  add('brick-2x10', W, 2, 3, 0)
  add('brick-2x6', W, 12, 3, 0)
  add('slope-2x2', B, 0, 3, 0)
  add('slope-2x2', B, 18, 3, 0)
  add('plate-2x12', B, 6, -2, 3, 90)
  add('plate-2x8', B, 8, 0, 3, 90)
  add('windscreen-long', B, 4, 2, 3)
  add('brick-1x4', B, 14, 3, 3, 90)
  add('1x2', B, 16, 4, 6, 90)
  add('cone-1x1', R, 16, 4, 9)
  add('slope-2x2', B, 15, 2, 3)
  add('slope-2x2', B, 15, 5, 3)
  for (const x of [6, 8, 10, 12]) {
    add('round-1x1', B, x, 2, 0)
    add('round-1x1', B, x, 5, 0)
  }
  add('tyre', K, 4, 1)
  add('tyre', K, 4, 7)
  add('tyre', K, 12, 1)
  add('tyre', K, 12, 6)
  add('plate-1x1', K, 4, 1, 5)
  add('plate-1x1', K, 12, 1, 5)
  add('cylinder-2x2', K, 7, 0, 0)
  add('cylinder-2x2', K, 7, 6, 0)
  return pieces
}

function controlTower(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-6x6', K, -1, -1)
  column(add, 'cylinder-2x2', W, 1, 1, 1, 6)
  add('brick-4x6', B, -1, 0, 19)
  add('window', B, 0, -1, 19)
  add('window', B, 2, -1, 19)
  add('plate-4x6', W, -1, 0, 22)
  add('antenna', K, 1, 1, 23)
  add('dish', W, 5, 0, 19)
  add('cone-1x1', R, 2, 3, 23)
  add('door', K, 1, 4, 1)
  add('fence', W, -1, -2, 0)
  add('fence', W, 3, -2, 0)
  return pieces
}

function tug(): MagicPiece[] {
  const { pieces, add } = bag()
  add('tyre', K, 0, 0)
  add('tyre', K, 4, 0)
  add('tyre', K, 0, 3)
  add('tyre', K, 4, 3)
  add('brick-2x6', Y, 0, 1, 0)
  add('2x2', K, 4, 1, 3)
  add('windscreen', B, 0, 1, 3)
  add('round-1x1', R, 5, 1, 6)
  add('cone-1x1', K, 4, 1, 6)
  add('plate-1x4', K, 0, 0, 5)
  return pieces
}

function garage(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-6x10', W, 0, 0)
  add('brick-1x4', W, 0, 0, 1)
  add('brick-1x4', W, 6, 0, 1)
  add('brick-1x4', R, 0, 0, 4)
  add('brick-1x4', R, 6, 0, 4)
  add('brick-1x10', W, 0, 0, 7)
  add('brick-1x10', W, 0, 5, 1)
  add('window', B, 1, 5, 4)
  add('window', B, 6, 5, 4)
  add('1x2', W, 3, 5, 4)
  add('brick-1x10', W, 0, 5, 11)
  add('brick-1x4', W, 0, 1, 1, 90)
  add('brick-1x4', W, 0, 1, 4, 90)
  add('brick-1x4', W, 0, 1, 7, 90)
  add('brick-1x4', W, 9, 1, 1, 90)
  add('brick-1x4', W, 9, 1, 4, 90)
  add('brick-1x4', W, 9, 1, 7, 90)
  // 中间一道墙把平屋顶撑住。
  add('brick-1x8', W, 1, 2, 7)
  add('slope-2x4', R, 0, 0, 10)
  add('slope-2x4', R, 4, 0, 10)
  add('slope-2x2', R, 8, 0, 10)
  add('2x4', R, 0, 2, 10)
  add('2x4', R, 4, 2, 10)
  add('2x2', R, 8, 2, 10)
  add('slope-2x4', R, 0, 3, 13, 180)
  add('slope-2x4', R, 4, 3, 13, 180)
  add('slope-2x2', R, 8, 3, 13, 180)
  add('plate-1x6', K, 4, -1, 0)
  add('round-1x1', R, 1, 0, 13)
  add('round-1x1', B, 8, 0, 13)
  return pieces
}

function pumpEngine(): MagicPiece[] {
  const { pieces, add } = bag()
  add('tyre', K, 0, 1)
  add('tyre', K, 5, 1)
  add('tyre', K, 0, 3)
  add('tyre', K, 5, 3)
  add('plate-2x8', K, 0, 1, 5)
  add('plate-1x8', K, 0, 3, 5)
  add('brick-2x3', W, 0, 1, 6)
  add('1x2', W, 0, 3, 6)
  add('windscreen', B, 0, 1, 9)
  add('2x4', R, 4, 1, 6)
  add('brick-1x4', R, 4, 3, 6)
  add('brick-1x4', Y, 4, 1, 9)
  add('cone-1x1', R, 5, 2, 9)
  add('cone-1x1', B, 6, 2, 9)
  add('round-1x1', Y, 0, 1, 16)
  add('grille', K, 0, 3, 9)
  add('plate-1x2', K, 2, 0, 5)
  add('plate-1x2', K, 2, 4, 5)
  return pieces
}

function rover(): MagicPiece[] {
  const { pieces, add } = bag()
  add('tyre', K, 0, 1)
  add('tyre', K, 4, 1)
  add('tyre', K, 0, 2)
  add('tyre', K, 4, 2)
  add('plate-2x6', W, 0, 1, 5)
  add('2x4', B, 1, 1, 6)
  add('dish', W, 2, 3, 6)
  add('antenna', K, 3, 1, 9)
  add('cone-1x1', R, 4, 1, 9)
  add('round-1x1', Y, 3, 2, 9)
  add('seat', K, 1, 1, 9)
  return pieces
}

function serviceRocket(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-8x8', K, -2, -2)
  for (const [x, z] of [
    [2, 2],
    [3, 2],
    [2, 3],
    [3, 3],
  ] as const) add('cone-1x1', O, x, z, 1)
  column(add, 'cylinder-2x2', W, 2, 2, 4, 6)
  add('cone-2x2', R, 2, 2, 22)
  add('cone-1x1', Y, 2, 2, 28)
  add('slope-2x2', R, 2, 0, 4)
  add('slope-2x2', R, 2, 4, 4)
  add('slope-2x2', O, 0, 2, 4)
  add('slope-2x2', O, 4, 2, 4)
  column(add, '1x1', K, 7, 2, 1, 8)
  add('brick-1x3', K, 4, 2, 22)
  add('dish', W, -2, 5, 1)
  add('antenna', K, 7, 3, 1)
  add('round-1x1', B, 2, 1, 10)
  add('round-1x1', R, 4, 2, 10)
  return pieces
}

function sportCar(): MagicPiece[] {
  const { pieces, add } = bag()
  add('tyre', K, 2, 0)
  add('tyre', K, 10, 0)
  add('tyre', K, 2, 5)
  add('tyre', K, 10, 5)
  add('plate-4x6', K, 0, 1)
  add('plate-4x8', K, 6, 1)
  add('plate-4x4', K, 14, 1)
  add('slope-2x2', R, 0, 1, 1)
  add('slope-2x2', R, 0, 3, 1)
  add('brick-1x8', R, 2, 1, 1)
  add('brick-1x8', R, 2, 4, 1)
  add('2x4', R, 6, 2, 1)
  add('windscreen', B, 4, 2, 4)
  add('seat', K, 8, 2, 4)
  add('steer', K, 6, 2, 11)
  add('2x4', R, 10, 1, 1)
  add('2x4', R, 10, 3, 1)
  add('slope-2x2', R, 14, 1, 1)
  add('slope-2x2', R, 14, 3, 1)
  add('brick-1x4', K, 12, 1, 4)
  add('brick-1x4', K, 12, 4, 4)
  add('plate-1x6', K, 12, 4, 7)
  add('round-1x1', Y, 2, 1, 4)
  add('round-1x1', Y, 2, 4, 4)
  add('grille', K, 0, 2, 4)
  add('tile-1x4', W, 6, 1, 4)
  add('tile-1x4', W, 6, 4, 4)
  add('tile-1x2', K, 2, 0, 5)
  add('tile-1x2', K, 2, 5, 5)
  add('cone-1x1', K, 15, 2, 4)
  add('cone-1x1', K, 15, 3, 4)
  add('1x1', Y, 8, 2, 10)
  add('plate-1x2', R, 0, 0, 0)
  add('plate-1x2', R, 0, 5, 0)
  add('round-1x1', R, 14, 2, 4)
  add('round-1x1', R, 14, 3, 4)
  return pieces
}

function pitLane(): MagicPiece[] {
  const { pieces, add } = bag()
  for (let course = 0; course < 3; course += 1) {
    for (let index = 0; index < 6; index += 1) add('1x2', course === 1 ? R : W, index * 2, 0, course * 3)
  }
  add('plate-2x12', K, 0, 0, 9)
  add('flag', R, 0, 0, 10)
  add('flag', B, 10, 0, 10)
  column(add, 'cylinder-2x2', K, 14, 2, 0, 3)
  add('tyre', K, 14, 1, 9)
  figure(add, 4, 3, 0, R, K)
  add('cone-1x1', O, 8, 3, 0)
  add('cone-1x1', O, 9, 3, 0)
  return pieces
}

function openRacer(color: string): MagicPiece[] {
  const { pieces, add } = bag()
  add('tyre', K, 2, 0)
  add('tyre', K, 8, 0)
  add('tyre', K, 2, 4)
  add('tyre', K, 8, 4)
  add('plate-2x12', K, 0, 1)
  add('plate-1x10', K, 0, 3)
  add('slope-2x2', color, 0, 1, 1)
  add('brick-1x6', color, 2, 1, 1)
  add('brick-1x6', color, 2, 3, 1)
  add('seat', K, 7, 2, 4)
  add('windscreen', B, 3, 1, 4)
  add('2x2', color, 8, 1, 1)
  add('brick-1x4', K, 10, 1, 4, 90)
  add('round-1x1', Y, 2, 1, 4)
  add('cone-1x1', K, 9, 1, 4)
  add('plate-1x2', color, 0, 0, 0)
  add('plate-1x2', color, 0, 4, 0)
  return pieces
}

function hatch(color: string): MagicPiece[] {
  const { pieces, add } = bag()
  add('tyre', K, 1, 0)
  add('tyre', K, 7, 1)
  add('tyre', K, 1, 4)
  add('tyre', K, 7, 3)
  add('plate-2x12', K, 0, 1, 5)
  add('plate-1x10', K, 0, 3, 5)
  add('2x4', color, 0, 1, 6)
  add('brick-1x4', color, 0, 3, 6)
  add('windscreen', B, 2, 1, 9)
  add('2x4', color, 6, 1, 6)
  add('brick-1x4', color, 6, 3, 6)
  add('slope-2x2', color, 10, 1, 6)
  add('round-1x1', Y, 0, 1, 9)
  add('round-1x1', R, 9, 1, 9)
  add('tile-1x4', W, 4, 3, 9)
  add('plate-1x2', K, 1, 0, 5)
  add('plate-1x2', K, 1, 4, 5)
  return pieces
}

function startGantry(): MagicPiece[] {
  const { pieces, add } = bag()
  column(add, '2x2', K, 0, 0, 0, 4)
  column(add, '2x2', K, 10, 0, 0, 4)
  add('brick-1x12', W, 0, 0, 12)
  add('round-1x1', R, 2, 0, 15)
  add('round-1x1', Y, 4, 0, 15)
  add('round-1x1', G, 6, 0, 15)
  add('round-1x1', R, 8, 0, 15)
  add('flag', R, 0, 1, 12)
  add('flag', B, 11, 1, 12)
  return pieces
}

function stationHouse(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-6x12', Y, 0, 0)
  // 四面墙砌到同一高度，屋顶才有整圈依托，窗户也贴在墙外面。
  for (const base of [1, 4, 7, 10, 13, 16]) {
    add('brick-1x4', W, 0, 0, base)
    add('brick-1x4', W, 8, 0, base)
    add('brick-1x12', W, 0, 5, base)
    add('brick-1x4', W, 0, 1, base, 90)
    add('brick-1x4', W, 11, 1, base, 90)
  }
  add('door', K, 4, 0, 1)
  add('window', B, 1, 6, 4)
  add('window', B, 5, 6, 4)
  add('window', B, 9, 6, 4)
  add('plate-6x12', R, 0, 0, 19)
  add('brick-1x12', R, 0, 0, 20)
  return pieces
}

function platform(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-2x12', K, 0, 0)
  add('tile-1x6', Y, 0, 0, 1)
  add('tile-1x6', Y, 6, 0, 1)
  add('fence', W, 0, 1, 1)
  add('fence', W, 4, 1, 1)
  add('fence', W, 8, 1, 1)
  return pieces
}

function shortTrain(): MagicPiece[] {
  const { pieces, add } = bag()
  for (const x of [0, 10]) {
    add('tyre', K, x, 1)
    add('tyre', K, x + 4, 1)
    add('tyre', K, x, 4)
    add('tyre', K, x + 4, 4)
    add('brick-2x6', x === 0 ? R : B, x, 2, 0)
  }
  add('windscreen', B, 0, 2, 3)
  add('2x2', K, 4, 2, 3)
  add('cone-1x1', K, 4, 2, 6)
  add('plate-1x4', K, 6, 2, 0)
  for (const dx of [1, 2, 3]) {
    add('1x1', Y, 10 + dx, 2, 3)
    add('1x1', Y, 10 + dx, 3, 3)
  }
  add('plate-2x4', W, 11, 2, 6)
  add('round-1x1', Y, 0, 2, 10)
  return pieces
}

function beacon(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-4x4', K, 0, 0)
  column(add, 'cylinder-2x2', W, 1, 1, 1, 4)
  add('cylinder-2x2', R, 1, 1, 13)
  add('cone-2x2', Y, 1, 1, 16)
  add('round-1x1', Y, 1, 1, 22)
  add('fence', W, 0, -1, 0)
  add('fence', W, 0, 4, 0)
  return pieces
}

function dock(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-4x12', O, 0, 0)
  add('brick-1x12', O, 0, 0, 1)
  add('brick-1x12', O, 0, 3, 1)
  add('fence', W, 0, 0, 4)
  add('fence', W, 4, 0, 4)
  add('fence', W, 8, 0, 4)
  add('cone-1x1', R, 1, 3, 4)
  add('cone-1x1', G, 6, 3, 4)
  return pieces
}

function waterPads(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-6x10', B, 0, 0)
  add('plate-6x8', B, 10, 0)
  add('plate-4x10', B, 0, 6)
  add('plate-4x6', B, 10, 6)
  add('tile-1x4', W, 2, 2, 1)
  add('tile-1x4', W, 8, 4, 1)
  return pieces
}

function crops(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-4x8', G, 0, 0)
  add('plate-4x8', Y, 0, 4)
  for (const x of [0, 2, 4, 6]) {
    add('flower', Y, x, 1, 1)
    add('flower', R, x, 3, 1)
    add('flower', O, x, 5, 1)
  }
  add('bush', G, 8, 2, 0)
  return pieces
}

function bigCastle(): MagicPiece[] {
  const { pieces, add } = bag()
  for (const [x, z] of [
    [0, 0],
    [14, 0],
    [0, 14],
    [14, 14],
  ] as const) {
    column(add, 'cylinder-2x2', W, x, z, 0, 8)
    add('cone-2x2', R, x, z, 24)
    add('flag', R, x, z, 30)
  }
  for (const base of [3, 6, 9, 12]) {
    add('brick-1x12', Y, 2, 0, base)
    add('brick-1x12', Y, 2, 15, base)
    add('brick-1x12', Y, 0, 2, base, 90)
    add('brick-1x12', Y, 15, 2, base, 90)
  }
  add('1x2', Y, 2, 0, 0)
  add('arch-1x6', Y, 4, 0, 0)
  add('brick-1x4', Y, 10, 0, 0)
  add('brick-1x12', Y, 2, 15, 0)
  add('brick-1x12', Y, 0, 2, 0, 90)
  add('brick-1x12', Y, 15, 2, 0, 90)
  for (const x of [2, 4, 6, 8, 10, 12]) add('1x1', Y, x, 0, 15)
  for (const x of [2, 4, 6, 8, 10, 12]) add('1x1', Y, x, 15, 15)
  for (const z of [2, 4, 6, 8, 10, 12]) add('1x1', Y, 0, z, 15)
  for (const z of [2, 4, 6, 8, 10, 12]) add('1x1', Y, 15, z, 15)
  add('plate-8x8', Y, 1, 4)
  for (const [x, z] of [
    [3, 6],
    [5, 6],
    [3, 8],
    [5, 8],
  ] as const) {
    column(add, '2x2', W, x, z, 1, 5)
    add('cone-2x2', R, x, z, 16)
  }
  column(add, '2x2', W, 2, -2, 0, 5)
  column(add, '2x2', W, 10, -2, 0, 5)
  add('arch-1x6', Y, 4, -2, 0)
  add('brick-1x6', Y, 4, -2, 3)
  add('cone-2x2', R, 2, -2, 15)
  add('cone-2x2', R, 10, -2, 15)
  add('flag', B, 3, -2, 21)
  add('flower', R, 6, 14, 0)
  add('flower', Y, 8, 14, 0)
  return pieces
}

function eiffel(): MagicPiece[] {
  const { pieces, add } = bag()
  for (const [x, z] of [
    [0, 0],
    [7, 0],
    [0, 7],
    [7, 7],
  ] as const) column(add, '1x1', K, x, z, 0, 12)
  for (const base of [0, 6, 12, 18, 24, 30]) {
    add('brick-1x6', Y, 1, 0, base)
    add('brick-1x6', Y, 1, 7, base)
    add('brick-1x6', Y, 0, 1, base, 90)
    add('brick-1x6', Y, 7, 1, base, 90)
  }
  for (const [x, z] of [
    [2, 2],
    [5, 2],
    [2, 5],
    [5, 5],
  ] as const) column(add, '1x1', K, x, z, 37, 6)
  add('plate-8x8', Y, 0, 0, 36)
  for (const base of [37, 43, 49]) {
    add('1x2', Y, 3, 2, base)
    add('1x2', Y, 3, 5, base)
    add('1x2', Y, 2, 3, base, 90)
    add('1x2', Y, 5, 3, base, 90)
  }
  add('plate-4x4', Y, 2, 2, 55)
  add('2x2', K, 3, 3, 56)
  add('cone-2x2', Y, 3, 3, 59)
  add('antenna', K, 3, 3, 65)
  add('slope-2x2', K, -2, 0, 0)
  add('slope-2x2', K, 8, 0, 0)
  add('slope-2x2', K, 0, -2, 0)
  add('slope-2x2', K, 0, 8, 0)
  return pieces
}

function colosseum(): MagicPiece[] {
  const { pieces, add } = bag()
  for (const base of [0, 3, 6, 9, 12, 15, 18]) {
    add('2x2', Y, 0, 0, base)
    add('2x2', Y, 10, 0, base)
    add('2x2', Y, 0, 10, base)
    add('2x2', Y, 10, 10, base)
    add('arch-1x6', W, 2, 0, base)
    add('1x2', Y, 8, 0, base)
    add('arch-1x6', W, 2, 10, base)
    add('1x2', Y, 8, 10, base)
    add('arch-1x6', W, 0, 2, base, 90)
    add('1x2', Y, 0, 8, base, 90)
    add('arch-1x6', W, 10, 2, base, 90)
    add('1x2', Y, 10, 8, base, 90)
  }
  add('brick-1x8', W, 2, 0, 21)
  add('brick-1x8', W, 2, 10, 21)
  add('brick-1x8', W, 0, 2, 21, 90)
  add('brick-1x8', W, 10, 2, 21, 90)
  add('cone-2x2', O, 0, 0, 21)
  add('cone-2x2', O, 10, 0, 21)
  add('cone-2x2', O, 0, 10, 21)
  add('cone-2x2', O, 10, 10, 21)
  add('plate-6x6', Y, 3, 4)
  for (const [x, z] of [
    [4, 5],
    [6, 5],
    [4, 7],
    [6, 7],
  ] as const) {
    column(add, 'cylinder-2x2', W, x, z, 1, 4)
    add('cone-2x2', O, x, z, 13)
  }
  return pieces
}

function stadium(): MagicPiece[] {
  const { pieces, add } = bag()
  for (let row = 0; row < 4; row += 1) {
    const courses = 4 - row
    for (let course = 0; course < courses; course += 1) add('brick-1x12', W, 4, row, course * 3)
    for (let index = 0; index < 6; index += 1) add('1x2', row % 2 === 0 ? R : B, 4 + index * 2, row, courses * 3)
  }
  for (let row = 0; row < 4; row += 1) {
    const courses = row + 1
    for (let course = 0; course < courses; course += 1) add('brick-1x12', W, 4, 16 + row, course * 3)
    for (let index = 0; index < 6; index += 1) add('1x2', row % 2 === 0 ? B : R, 4 + index * 2, 16 + row, courses * 3)
  }
  for (let row = 0; row < 4; row += 1) {
    const courses = 4 - row
    for (let course = 0; course < courses; course += 1) add('brick-1x12', W, row, 4, course * 3, 90)
    for (let index = 0; index < 6; index += 1) add('1x2', row % 2 === 0 ? R : B, row, 4 + index * 2, courses * 3, 90)
  }
  for (let row = 0; row < 4; row += 1) {
    const courses = row + 1
    for (let course = 0; course < courses; course += 1) add('brick-1x12', W, 16 + row, 4, course * 3, 90)
    for (let index = 0; index < 6; index += 1) add('1x2', row % 2 === 0 ? B : R, 16 + row, 4 + index * 2, courses * 3, 90)
  }
  add('plate-8x8', G, 6, 6)
  add('plate-2x8', G, 6, 4)
  add('plate-2x8', G, 6, 14)
  add('plate-2x8', G, 4, 6, 0, 90)
  add('plate-2x8', G, 14, 6, 0, 90)
  add('tile-1x8', W, 6, 9, 1)
  add('tile-1x3', W, 8, 6, 1, 90)
  add('tile-1x3', W, 8, 10, 1, 90)
  for (const [x, z] of [
    [2, 1],
    [16, 1],
    [1, 16],
    [16, 16],
  ] as const) {
    column(add, '2x2', Y, x, z, 0, 5)
    add('cone-2x2', O, x, z, 15)
    add('flag', R, x, z, 21)
  }
  return pieces
}

function figurePieces(cloth: string, hairColor: string): MagicPiece[] {
  const { pieces, add } = bag()
  figure(add, 0, 0, 0, cloth, hairColor)
  return pieces
}

function gardenPath(): MagicPiece[] {
  const { pieces, add } = bag()
  for (const x of [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]) add('tile-1x2', K, x, 0, 0)
  add('flower', R, 8, -1, 0)
  add('flower', Y, 10, -1, 0)
  return pieces
}

function villageScene(): MagicPiece[] {
  return join(
    cottage(W, R),
    shift(cabin(Y, B), 16, 2),
    shift(shop(), 1, 13),
    shift(pine(), 18, 8),
    shift(well(), 8, 9),
    shift(gardenPath(), 0, 8),
    shift(figurePieces(B, K), 13, 4),
    shift(fenceRow(), -5, 0),
  )
}

function fenceRow(): MagicPiece[] {
  const { pieces, add } = bag()
  add('fence', W, 0, 0, 0)
  add('fence', W, 0, 1, 0)
  add('flower', P, 4, 0, 0)
  add('flower', R, 4, 1, 0)
  return pieces
}

function grandstand(): MagicPiece[] {
  const { pieces, add } = bag()
  for (const x of [0, 4, 8, 12]) column(add, '1x1', K, x, 0, 0, 4)
  for (let step = 0; step < 4; step += 1) {
    const color = step % 2 === 0 ? R : W
    add('brick-2x3', color, 1, step, step * 3)
    add('brick-2x3', color, 5, step, step * 3)
    add('brick-2x3', color, 9, step, step * 3)
  }
  add('flag', R, 0, 0, 12)
  add('flag', B, 12, 0, 12)
  return pieces
}

function raceScene(): MagicPiece[] {
  return join(
    shift(openRacer(R), 0, 8),
    shift(hatch(B), 0, 15),
    shift(startGantry(), 10, 7),
    shift(trackMarks(), 2, 13),
    shift(fenceRow(), 0, 20),
    shift(grandstand(), 0, 22),
  )
}

function trackMarks(): MagicPiece[] {
  const { pieces, add } = bag()
  add('tile-1x8', W, 0, 0)
  add('tile-1x8', W, 8, 0)
  add('tile-1x4', Y, 4, 1, 0)
  add('cone-1x1', O, -1, 0, 0)
  add('cone-1x1', O, 16, 0, 0)
  add('bar-4l', K, -1, 1, 0)
  add('flag', R, -1, 1, 10)
  return pieces
}

function siteScene(): MagicPiece[] {
  return join(towerCrane(), shift(halfWall(), 6, 1), shift(figurePieces(Y, K), 10, 8), shift(brickPile(), 0, 6), shift(pine(), 12, 7))
}

function brickPile(): MagicPiece[] {
  const { pieces, add } = bag()
  add('2x4', R, 0, 0)
  add('2x2', B, 4, 0)
  add('2x4', Y, 0, 2)
  add('1x2', O, 4, 2)
  add('brick-1x4', W, 0, 4)
  add('cone-2x2', O, 5, 3)
  add('cylinder-2x2', K, 6, 0)
  add('plate-2x4', G, 7, 3)
  add('1x1', R, 6, 2)
  add('1x2', P, 6, 7)
  add('brick-1x6', Y, 0, 5)
  add('2x2', K, 6, 5)
  return pieces
}

function cargoYard(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-4x4', O, 0, 0)
  add('2x2', R, 0, 0, 1)
  add('2x2', Y, 2, 0, 1)
  add('2x2', B, 0, 2, 1)
  add('2x2', G, 2, 2, 1)
  add('1x1', R, 0, 0, 4)
  add('1x1', Y, 1, 0, 4)
  add('1x1', B, 0, 1, 4)
  add('1x1', G, 1, 1, 4)
  add('cone-1x1', O, 2, 0, 4)
  add('cone-1x1', R, 3, 0, 4)
  add('cone-1x1', Y, 2, 1, 4)
  add('cone-1x1', W, 3, 1, 4)
  add('fence', W, 0, 4, 0)
  add('flag', R, 4, 0, 0)
  add('flower', R, 5, 2, 0)
  add('flower', Y, 4, 4, 0)
  add('bush', G, 5, 3, 0)
  return pieces
}

function portScene(): MagicPiece[] {
  return join(
    waterPads(),
    shift(dock(), 0, 10),
    shift(barge(), 2, 13),
    shift(fishingBoat(), 18, 2),
    shift(beacon(), 34, 0),
    shift(figurePieces(B, K), 12, 12),
    shift(cargoYard(), 22, 5),
  )
}

function stationScene(): MagicPiece[] {
  return join(shortTrain(), shift(stationHouse(), 0, 7), shift(platform(), 2, 5), shift(pine(), 11, 9), shift(figurePieces(R, K), 16, 9))
}

function dinoPark(): MagicPiece[] {
  return join(shift(raptor(), 3, 0), shift(longneck(), 24, 0), shift(pine(), 3, 2), shift(pine(), 12, 3), shift(fenceRow(), -1, 5), shift(plateSign(), 20, 4))
}

function plateSign(): MagicPiece[] {
  const { pieces, add } = bag()
  add('bar-4l', K, 0, 0, 0)
  add('tile-2x4', W, 0, 0, 10)
  add('round-1x1', G, 1, 0, 11)
  add('flower', R, 0, 1, 0)
  add('bush', G, 1, 0, 0)
  return pieces
}

function farmScene(): MagicPiece[] {
  return join(barn(), shift(fieldTractor(), 14, 1), shift(crops(), 0, 6), shift(pine(), 13, 8), shift(fenceRow(), 11, 7), shift(figurePieces(G, K), 10, 6))
}

function hangar(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-6x8', Y, 0, 0)
  add('brick-1x8', W, 0, 0, 1)
  add('brick-1x8', W, 0, 0, 4)
  add('brick-1x8', R, 0, 0, 7)
  add('brick-1x8', W, 0, 5, 1)
  add('window', B, 1, 5, 4)
  add('window', B, 5, 5, 4)
  add('brick-1x8', W, 0, 5, 11)
  add('brick-1x4', W, 0, 1, 1, 90)
  add('brick-1x4', W, 0, 1, 4, 90)
  add('brick-1x4', W, 7, 1, 1, 90)
  add('brick-1x4', W, 7, 1, 4, 90)
  // 两侧再补一层墙，中间的平屋顶才有东西托着。
  add('brick-1x4', W, 0, 1, 7, 90)
  add('brick-1x4', W, 7, 1, 7, 90)
  add('plate-2x8', R, 0, 0, 10)
  add('plate-2x8', R, 0, 2, 10)
  add('plate-1x8', R, 0, 4, 11)
  add('door', K, 2, -1, 1)
  add('flower', R, 8, 2, 0)
  return pieces
}

function airportScene(): MagicPiece[] {
  return join(airliner(), shift(runwayMarks(), 0, 8), shift(controlTower(), 21, 0), shift(tug(), 15, 10), shift(hangar(), 0, 11))
}

function runwayMarks(): MagicPiece[] {
  const { pieces, add } = bag()
  add('tile-1x8', K, 0, 0)
  add('tile-1x8', K, 8, 0)
  add('tile-1x8', K, 16, 0)
  add('tile-1x4', Y, 6, 1)
  add('tile-1x4', W, 0, 1)
  add('tile-1x4', W, 12, 1)
  add('plate-1x8', K, 4, 2)
  add('cone-1x1', O, 0, 0, 1)
  add('cone-1x1', O, 18, 0, 1)
  return pieces
}

function fireStation(): MagicPiece[] {
  return join(garage(), shift(pumpEngine(), 10, 1), shift(pine(), 0, 5), shift(figurePieces(R, K), 12, 6), shift(fenceRow(), 16, 5))
}

function habitat(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-6x6', W, 0, 0)
  for (const [x, z] of [
    [0, 0],
    [5, 0],
    [0, 5],
    [5, 5],
  ] as const) column(add, '1x1', W, x, z, 1, 4)
  for (const base of [1, 4, 7, 10]) add('brick-1x4', B, 1, 0, base)
  add('window', B, 1, 5, 4)
  add('brick-1x4', B, 1, 5, 11)
  add('door', K, 1, -1, 1)
  add('plate-4x4', W, 1, 1, 13)
  add('cone-2x2', R, 2, 2, 14)
  add('antenna', K, 3, 2, 20)
  return pieces
}

function spaceBase(): MagicPiece[] {
  return join(serviceRocket(), shift(rover(), 8, 0), shift(brickPile(), 0, 9), shift(dishPad(), 11, 10), shift(habitat(), 17, 12))
}

function dishPad(): MagicPiece[] {
  const { pieces, add } = bag()
  add('plate-6x6', K, 0, 0)
  add('cylinder-2x2', W, 2, 2, 1)
  add('dish', W, 1, 1, 4)
  add('antenna', K, 2, 2, 7)
  add('round-1x1', R, 0, 0, 1)
  add('round-1x1', B, 5, 0, 1)
  add('cone-1x1', Y, 0, 5, 1)
  add('1x1', W, 5, 5, 1)
  return pieces
}

function paddock(): MagicPiece[] {
  const { pieces, add } = bag()
  column(add, '2x2', K, 0, 0, 0, 3)
  add('cone-2x2', R, 0, 0, 9)
  add('flag', R, 0, 0, 15)
  add('tyre', K, 2, 0)
  add('tyre', K, 2, 0, 5)
  add('cone-1x1', O, 2, 1, 0)
  add('cone-1x1', Y, 3, 1, 0)
  add('cone-1x1', R, 4, 1, 0)
  add('brick-1x4', W, 0, 2, 0)
  add('brick-1x4', R, 0, 2, 3)
  add('round-1x1', Y, 0, 2, 6)
  add('flower', G, 4, 2, 0)
  return pieces
}

function sportScene(): MagicPiece[] {
  const { pieces, add } = bag()
  const car = sportCar()
  const wall = pitWall()
  return join(car, shift(wall, 1, 6), shift(figurePieces(R, K), 4, 8), shift(paddock(), 17, 5))
}

function pitWall(): MagicPiece[] {
  const { pieces, add } = bag()
  for (let course = 0; course < 3; course += 1) {
    for (let index = 0; index < 5; index += 1) add('1x2', course === 1 ? R : W, index * 2, 0, course * 3)
  }
  add('plate-2x10', K, 0, 0, 9)
  add('flag', R, 0, 0, 10)
  column(add, 'cylinder-2x2', K, 10, 0, 0, 2)
  add('tyre', K, 10, 0, 6)
  add('cone-1x1', O, 8, 1, 0)
  add('cone-1x1', Y, 10, 2, 0)
  return pieces
}

function model(id: string, name: string, size: 'small' | 'large', tint: string, pieces: MagicPiece[]): MagicModel {
  return { id, name, size, tint, pieces }
}

const CARD_ORDER: Array<[string, string, 'small' | 'large']> = [
  ['f1', 'F1赛车', 'small'],
  ['fire-engine', '消防车', 'small'],
  ['plane', '飞机', 'small'],
  ['rocket', '火箭', 'small'],
  ['castle', '城堡', 'small'],
  ['house', '房子', 'small'],
  ['robot', '机器人', 'small'],
  ['heli', '直升机', 'small'],
  ['tree', '树', 'small'],
  ['train', '火车', 'small'],
  ['crane', '起重机', 'small'],
  ['boat', '帆船', 'small'],
  ['tractor', '拖拉机', 'small'],
  ['lighthouse', '灯塔', 'small'],
  ['dino', '恐龙', 'small'],
  ['village', '村庄', 'large'],
  ['race', '大奖赛', 'large'],
  ['site', '工地', 'large'],
  ['port', '港口', 'large'],
  ['station', '火车站', 'large'],
  ['dino-park', '恐龙公园', 'large'],
  ['farm', '农场', 'large'],
  ['airport', '机场', 'large'],
  ['fire-station', '消防站', 'large'],
  ['space', '太空基地', 'large'],
  ['big-castle', '大城堡', 'large'],
  ['stadium', '体育场', 'large'],
  ['sport', '跑车', 'large'],
  ['eiffel', '埃菲尔铁塔', 'large'],
  ['colosseum', '斗兽场', 'large'],
]

export const MAGIC_MODELS: MagicModel[] = [
  model('f1', 'F1赛车', 'small', '#FFE4D6', f1()),
  model('fire-engine', '消防车', 'small', '#FDE2E4', fireEngine()),
  model('plane', '飞机', 'small', '#D9ECFF', plane()),
  model('rocket', '火箭', 'small', '#E6DEFF', rocket()),
  model('castle', '城堡', 'small', '#ECEDEF', castle()),
  model('house', '房子', 'small', '#FFF1D6', house()),
  model('robot', '机器人', 'small', '#D9ECFF', robot()),
  model('heli', '直升机', 'small', '#FFF6D0', helicopter()),
  model('tree', '树', 'small', '#E3F6DE', treeScene()),
  model('train', '火车', 'small', '#F3E6D8', train()),
  model('crane', '起重机', 'small', '#FFF3C4', crane()),
  model('boat', '帆船', 'small', '#F4EFE4', sailboat()),
  model('tractor', '拖拉机', 'small', '#E5F6D4', tractor()),
  model('lighthouse', '灯塔', 'small', '#FDE2EA', lighthouse()),
  model('dino', '恐龙', 'small', '#E4F6D8', dinosaur()),
  model('village', '村庄', 'large', '#E5F6D8', villageScene()),
  model('race', '大奖赛', 'large', '#FDE2E8', raceScene()),
  model('site', '工地', 'large', '#FFF3C4', siteScene()),
  model('port', '港口', 'large', '#D9ECFF', portScene()),
  model('station', '火车站', 'large', '#FFF1D6', stationScene()),
  model('dino-park', '恐龙公园', 'large', '#E4F6D8', dinoPark()),
  model('farm', '农场', 'large', '#F8F1C8', farmScene()),
  model('airport', '机场', 'large', '#F4F7FB', airportScene()),
  model('fire-station', '消防站', 'large', '#FDE2E4', fireStation()),
  model('space', '太空基地', 'large', '#E6DEFF', spaceBase()),
  model('big-castle', '大城堡', 'large', '#ECEDEF', bigCastle()),
  model('stadium', '体育场', 'large', '#E5F6D8', stadium()),
  model('sport', '跑车', 'large', '#FDE2E8', sportScene()),
  model('eiffel', '埃菲尔铁塔', 'large', '#F3F4F6', eiffel()),
  model('colosseum', '斗兽场', 'large', '#FDE8E0', colosseum()),
]

export const MAGIC_SMALL = MAGIC_MODELS.filter((item) => item.size === 'small')
export const MAGIC_LARGE = MAGIC_MODELS.filter((item) => item.size === 'large')

const ALLOWED_COLORS = new Set(BRICK_COLORS.map((color) => color.toLowerCase()))

function place(pieces: readonly MagicPiece[]): Brick[] {
  const occupied = new Map<string, string>()
  const bricks: Brick[] = []
  pieces.forEach((piece, index) => {
    if (!ALLOWED_COLORS.has(piece.color.toLowerCase())) {
      throw new Error(`颜色不在色板里 ${piece.color}`)
    }
    const { width, depth } = footprint(piece.type, piece.rotation)
    // 单连接点零件（头、发、手臂、手）用连接点定位，position 直接指连接点，
    // 位置可以落在网格之外，绕 Y 转向、摆角、滚角都绕着这个点转。
    const point = partMount(piece.type) === 'point'
    const brick: Brick = {
      id: createBrickId(),
      type: piece.type,
      color: piece.color,
      rotation: piece.rotation,
      position:
        piece.joint ?? [piece.gx + width / 2, centerForPlates(piece.base, piece.type), piece.gz + depth / 2],
      ...(piece.tilt === undefined ? {} : { tilt: piece.tilt }),
      ...(piece.roll === undefined ? {} : { roll: piece.roll }),
    }
    const label = `${index}:${piece.type}@${piece.gx},${piece.gz},b${piece.base}`
    // 连接点零件挂在别的零件上，本身不占格，不能参与撞格检查。
    if (!point) {
      for (const key of occupancyKeys(brick)) {
        const previous = occupied.get(key)
        if (previous) throw new Error(`${label} 撞上 ${previous} (${key})`)
        occupied.set(key, label)
      }
    }
    bricks.push(brick)
  })
  return bricks
}

export function bricksFromMagic(pieces: readonly MagicPiece[]): Brick[] {
  return place(centerPieces(pieces))
}

function pieceCells(piece: MagicPiece) {
  const { width, depth } = footprint(piece.type, piece.rotation)
  const plates = partPlates(piece.type)
  const cells: string[] = []
  for (let layer = 0; layer < plates; layer += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let z = 0; z < depth; z += 1) cells.push(`${piece.gx + x},${piece.base + layer},${piece.gz + z}`)
    }
  }
  return cells
}

function faceNeighbors(cell: string) {
  const [x, y, z] = cell.split(',').map(Number)
  return [`${x + 1},${y},${z}`, `${x - 1},${y},${z}`, `${x},${y + 1},${z}`, `${x},${y - 1},${z}`, `${x},${y},${z + 1}`, `${x},${y},${z - 1}`]
}

// 两块砖的脚印在同一板层共享一条边，或一块的顶面和另一块的底面在同一格叠上，算相连。
// 天线、横杆、螺旋桨按各自脚印和板层参与连接。
export function magicComponents(pieces: readonly MagicPiece[]) {
  const owner = new Map<string, number>()
  const lists = pieces.map((piece, index) => {
    const cells = pieceCells(piece)
    for (const cell of cells) owner.set(cell, index)
    return cells
  })
  const parent = pieces.map((_, index) => index)
  const find = (id: number): number => {
    let cursor = id
    while (parent[cursor] !== cursor) cursor = parent[cursor]
    return cursor
  }
  const unite = (a: number, b: number) => {
    const left = find(a)
    const right = find(b)
    if (left !== right) parent[right] = left
  }
  pieces.forEach((_, index) => {
    for (const cell of lists[index]) {
      for (const next of faceNeighbors(cell)) {
        const other = owner.get(next)
        if (other !== undefined && other !== index) unite(index, other)
      }
    }
  })
  const groups = new Map<number, number>()
  pieces.forEach((_, index) => {
    const root = find(index)
    groups.set(root, (groups.get(root) ?? 0) + 1)
  })
  return [...groups.values()].sort((a, b) => b - a)
}

// 会卡在侧面而不是压在下面的零件：人偶手臂、门窗、轮胎这类件靠咬在旁边的积木上固定。
const SIDE_MOUNT = new Set([
  'arm-left',
  'arm-right',
  'hand',
  'window',
  'door',
  'door-frame',
  'glass',
  'fence',
  'ladder',
  'panel-1x4',
  'grille',
  'mudguard',
  'windscreen',
  'windscreen-long',
  'canopy',
  'steer',
  'tyre',
  'tyre-small',
  'rim',
  'rim-small',
  'dish',
])

function footprintCells(piece: MagicPiece): Array<[number, number]> {
  const { width, depth } = footprint(piece.type, piece.rotation)
  const cells: Array<[number, number]> = []
  for (let x = 0; x < width; x += 1) for (let z = 0; z < depth; z += 1) cells.push([piece.gx + x, piece.gz + z])
  return cells
}

// 检查一个模型的结构问题：
// 1) 碰撞：两件积木占同一格，摆出来会报错；
// 2) 悬空：没贴地、下面没东西托着，也不是能卡在侧面的件；
// 3) 拆堆：模型被切成几堆，没有连成整体。
export function auditMagicStructure(pieces: readonly MagicPiece[]) {
  const problems: string[] = []
  const owner = new Map<string, number>()
  for (const [index, piece] of pieces.entries()) {
    for (const cell of pieceCells(piece)) owner.set(cell, index)
  }

  const seen = new Map<string, number>()
  pieces.forEach((piece, index) => {
    for (const cell of pieceCells(piece)) {
      const other = seen.get(cell)
      if (other === undefined) {
        seen.set(cell, index)
        continue
      }
      problems.push(`overlap: #${index} ${piece.type} at ${piece.gx},${piece.gz} base=${piece.base} 撞上 #${other} (${cell})`)
    }
  })

  // 侧向咬合：同一层里 x/z 相邻一格，属于另一块积木。
  const lateral: number[][] = pieces.map(() => [])
  pieces.forEach((piece, index) => {
    const hit = new Set<number>()
    for (const cell of pieceCells(piece)) {
      const [x, y, z] = cell.split(',').map(Number)
      for (const next of [`${x + 1},${y},${z}`, `${x - 1},${y},${z}`, `${x},${y},${z + 1}`, `${x},${y},${z - 1}`]) {
        const other = owner.get(next)
        if (other === undefined || other === index || hit.has(other)) continue
        hit.add(other)
        lateral[index].push(other)
      }
    }
  })

  // 直接支撑：底面正下方一格被占。斜下方（脚印外扩一格）被占也算托住，
  // 乐高车轮就是靠这种方式把底盘顶起来的，没有这块支撑的才是真的悬空。
  const supported = pieces.map((piece) => {
    if (piece.base === 0) return true
    for (const [x, z] of footprintCells(piece)) {
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dz = -1; dz <= 1; dz += 1) {
          if (owner.has(`${x + dx},${piece.base - 1},${z + dz}`)) return true
        }
      }
    }
    return false
  })

  // 递归判定：贴地 / 下面有托 / 侧装件咬在有依托的积木上。
  const state = new Array<number>(pieces.length).fill(0) // 0 未算 1 在算 2 有依托 3 无依托
  const anchored = (index: number): boolean => {
    if (state[index] === 2) return true
    if (state[index] === 3) return false
    if (state[index] === 1) return false // 互相吊着，不算依托
    state[index] = 1
    let ok = supported[index]
    if (!ok && SIDE_MOUNT.has(pieces[index].type)) {
      for (const other of lateral[index]) {
        if (anchored(other)) {
          ok = true
          break
        }
      }
    }
    state[index] = ok ? 2 : 3
    return ok
  }

  pieces.forEach((piece, index) => {
    if (anchored(index)) return
    problems.push(`floating: #${index} ${piece.type} at ${piece.gx},${piece.gz} base=${piece.base} 悬空，没有东西托着`)
  })

  const components = magicComponents(pieces)
  if (components.length !== 1) problems.push(`split: 拆成 ${components.length} 块 ${components.join('+')}`)

  return problems
}

export function auditMagicModels() {
  const problems: string[] = []
  const counts: string[] = []
  for (const item of MAGIC_MODELS) {
    const min = item.size === 'small' ? 40 : 80
    const max = 180
    try {
      const bricks = place(item.pieces)
      const box = bounds(centerPieces(item.pieces))
      counts.push(`${item.id} ${bricks.length}`)
      if (bricks.length < min || bricks.length > max) problems.push(`${item.id} ${bricks.length} 块，应在 ${min}-${max}`)
      if (!item.pieces.some((piece) => piece.base === 0)) problems.push(`${item.id} 没有贴地`)
      for (const detail of auditMagicStructure(item.pieces)) problems.push(`${item.id} ${detail}`)
      if (box.minX < -24 || box.minZ < -24 || box.maxX > 24 || box.maxZ > 24) {
        problems.push(`${item.id} 超出底板 ${box.minX},${box.maxX},${box.minZ},${box.maxZ}`)
      }
    } catch (error) {
      problems.push(`${item.id} ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const ids = MAGIC_MODELS.map((item) => item.id)
  if (new Set(ids).size !== ids.length) problems.push('模型 id 重复')
  if (MAGIC_SMALL.length !== 15 || MAGIC_LARGE.length !== 15) problems.push(`数量 ${MAGIC_SMALL.length}/${MAGIC_LARGE.length}`)
  CARD_ORDER.forEach((expected, index) => {
    const item = MAGIC_MODELS[index]
    if (!item || item.id !== expected[0] || item.name !== expected[1] || item.size !== expected[2]) {
      problems.push(`名单 ${expected[0]}`)
    }
  })
  return { problems, counts }
}
