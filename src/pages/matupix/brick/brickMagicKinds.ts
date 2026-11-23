// 魔法模型的类型与「零件列表 → 场景积木」转换。
//
// 不依赖 brickMagicData：BrickBuilder 首屏只需要这些，大体积目录留给弹窗懒加载。
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
