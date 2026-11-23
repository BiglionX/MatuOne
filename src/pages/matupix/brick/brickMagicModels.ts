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
//
// 体积：brickMagicData 约 500KB+，只应被魔法弹窗 / 导出署名 / 审计脚本引用；
// BrickBuilder 首屏请走 brickMagicKinds，不要静态 import 本文件。
import { MAGIC_MODEL_DATA } from './brickMagicData'
import { MAGIC_PARTS } from './brickMagicParts'
import { bricksFromMagic, type MagicModel, type MagicPiece } from './brickMagicKinds'

export type { MagicModel, MagicPiece }
export { bricksFromMagic }

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
