// 魔法模型库。
//
// 数据来自 scripts/build-magic-models.ts 生成的 brickMagicData.ts，
// 里面是 LDraw 官方模型库（OMR）的 30 个模型：每个零件带官方矩阵和官方配色。
//
// 摆放方式和仓库里自己搭的格子模型完全不同：
//   官方模型里零件可以是任意角度、任意位置的（比如斜着插进去的车轴、成角度的屋顶），
//   所以每个零件都带一个 LDraw 旋转矩阵和一个精确落点，走 BrickScene 的
//   ldraw 精确摆放层，不吸附到格子上。
//
// 许可：LDraw 官方模型库 CC BY 2.0（需要署名），官方零件库 CC BY 4.0。
import { MAGIC_MODEL_DATA } from './brickMagicData'
import { MAGIC_PARTS } from './brickMagicParts'
import type { Brick, BrickType } from './brickTypes'

export type MagicPiece = {
  /** 零件类型，形如 ldraw:parts/3005。 */
  type: BrickType
  /** MatuPix 八色调色板里的颜色。 */
  color: string
  /** 渲染坐标里的落点（Y 向上，1 钉 = 20 LDU，1 格高 = 24 LDU）。 */
  position: [number, number, number]
  /** LDraw 旋转矩阵，按 a b c / d e f / g h i 存。 */
  rot: [number, number, number, number, number, number, number, number, number]
  /** 零件 LDraw 原点在 OMR 模型坐标系里的位置，单位 LDU。导出 .ldr 用。 */
  pos: [number, number, number]
}

export type MagicModel = {
  id: string
  name: string
  size: 'small' | 'large'
  tint: string
  /** OMR 模型的官方套装名，例如 "7613-1 Track Racer"。 */
  label: string
  /** 模型作者，取自模型头的 0 Author: 行。 */
  author: string
  /** OMR 模型的官方许可声明。 */
  license: string
  /**
   * 模型包围盒，单位是格（1 格 = 20 LDU = 1 钉）。
   * 用来把镜头对准模型：模型水平居中、底面贴地，所以中心就在 x/z = 0、y = 高度一半。
   */
  bounds: { x: number; y: number; z: number }
  pieces: MagicPiece[]
}

function toPiece(data: (typeof MAGIC_MODEL_DATA)[number]['pieces'][number]): MagicPiece {
  const part = MAGIC_PARTS[data.part]
  if (!part) throw new Error(`魔法模型引用了未知零件 ${data.part}`)
  return {
    type: part.type,
    color: data.color,
    position: data.position,
    rot: data.rot as MagicPiece['rot'],
    pos: data.pos,
  }
}

export const MAGIC_MODELS: MagicModel[] = MAGIC_MODEL_DATA.map((model) => ({
  id: model.id,
  name: model.name,
  size: model.size,
  tint: model.tint,
  label: model.label,
  author: model.author,
  license: model.license,
  // 数据里存的是 LDU，渲染坐标是格（1 格 = 20 LDU）。
  bounds: {
    x: model.bounds.x / 20,
    y: model.bounds.y / 20,
    z: model.bounds.z / 20,
  },
  pieces: model.pieces.map(toPiece),
}))

export const MAGIC_SMALL = MAGIC_MODELS.filter((item) => item.size === 'small')
export const MAGIC_LARGE = MAGIC_MODELS.filter((item) => item.size === 'large')

export function magicModelById(id: string) {
  return MAGIC_MODELS.find((model) => model.id === id) ?? null
}

/**
 * 把魔法模型变成场景里的积木。
 *
 * 每个零件都是一块带 LDraw 矩阵的积木：位置是精确落点，rotation 不参与
 * （姿态全在矩阵里），导出 .ldr 时原样带回官方矩阵和原始坐标。
 *
 * magicModel 记下这块砖来自哪个官方模型，导出时用它写 CC BY 署名。
 */
export function bricksFromMagic(pieces: readonly MagicPiece[], modelId?: string): Brick[] {
  return pieces.map((piece, index) => ({
    id: `magic-${index}`,
    type: piece.type,
    color: piece.color,
    position: piece.position,
    rotation: 0,
    ldraw: { rot: piece.rot, pos: piece.pos },
    ...(modelId ? { magicModel: modelId } : {}),
  }))
}
