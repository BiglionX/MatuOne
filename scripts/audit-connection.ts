// 积木连接语义：区分「设计好的嵌合」和「真的穿模」。
//
// LDraw 的坐标约定（已用官方 F1 模型核对过）：
//   +Y 朝下，零件局部 y = 0 是带钉的顶面，y = maxY 是开口的底面。
//   钉占 local y ∈ [-4, 0]。
//
// 真实乐高的叠放方式（和 F1 官方模型一致）：
//   下方零件的钉朝上，插进上方零件底面的管孔里。
//   所以「合法嵌合」的体积一定同时满足两条：
//     1. 落在下方零件的钉区 —— 局部 y ∈ [-4, 0]；
//     2. 落在上方零件的底沿 —— 局部 y ≥ maxY - 4（管孔入口那一圈）。
//
// 除了钉-管孔这一类，官方模型里还有几种「几何上必然重叠」的结构：
//   人偶球关节：手臂、手掌、武器之间靠球头连接，接口处本来就互嵌一点；
//   铰链面板：3818 / 3848 / 973p4x 这一族本来就是靠铰链咬合的；
//   夹子：61252、2555 这类 C 夹就是用来抱住别的零件的；
//   Technic 紧配合：轮辋插进轮胎、轴销穿进孔，孔径和轴径在 LDraw 里画成一样粗。
//
// 最后还有一类是「建模公差」：LDraw 官方模型为了画面紧凑，
// 会让相邻零件薄薄地压在一起（比如 1×4 砖的侧面蹭到轮组砖的轮子 1.8 LDU）。
// 1 LDU = 0.5mm，1.8 LDU 只有 0.9mm，真实积木上根本不可能出现，
// 所以按「重叠区是薄层」把它归到公差，而不是穿模。
//
// 除以上之外的体积重叠才算穿模：比如钉撞钉、砖体压砖体、
// 轮胎压到板面上没挖孔的位置。
import type { Box } from './ldraw-geom.ts'
import type { Vec3 } from './audit-solid.ts'

/** 钉的高度（LDU）。LDraw 的钉占 local y ∈ [-4, 0]。 */
export const STUD_HEIGHT = 4
/** 判定钉区的容差（LDU）。 */
const BAND_EPS = 0.5
/** 判定底沿的容差（LDU）：管孔入口那一圈。 */
const LIP_EPS = 4.5
/**
 * 建模公差：重叠区在零件局部坐标下的最小轴向厚度不超过这个值就算贴着。
 * 3 LDU = 1.5mm，和真实乐高零件 1.2mm 的最小壁厚一个量级。
 */
export const FIT_TOLERANCE = 3
/** Technic 紧配合允许的最大穿插厚度（LDU）。8 LDU = 4mm。 */
const TECHNIC_TOLERANCE = 8

/** 人偶零件：靠球关节连接，接口处本来就互嵌。 */
const MINIFIG = /minifig/i
/** 铰链件：本来就靠铰链咬合。 */
const HINGE = /hinge/i
/** 夹子：本来就是用来抱住别的零件的。 */
const CLIP = /\bclip\b/i
/** 芯轴类零件：销、轴、轮辋、轮胎、齿轮、梁。 */
const SPINDLE = /\b(pin|axle|tyre|tire|rim|gear|liftarm|beam)\b/i

export type ConnectionPart = {
  label: string
  /** 零件在自身局部坐标下的包围盒（未旋转）。 */
  localBox: Box
  /** 世界坐标 → 零件局部坐标。 */
  toLocal: (p: Vec3) => Vec3
  /** 零件的官方名，用来判断连接语义。 */
  desc?: string
  /** 是不是 LDraw 原始图元（没有实体厚度，不参与结构判定）。 */
  primitive?: boolean
}

export type ConnectionKind =
  /** 钉插进管孔。 */
  | 'stud'
  /** LDraw 原始图元，装饰几何。 */
  | 'primitive'
  /** 人偶球关节。 */
  | 'figure'
  /** 铰链咬合。 */
  | 'hinge'
  /** 夹子夹持。 */
  | 'clip'
  /** 薄层建模公差。 */
  | 'fit'
  /** Technic 轴销紧配合。 */
  | 'technic'
  /** 真穿模。 */
  | 'spurious'

export type OverlapVerdict = {
  kind: ConnectionKind
  /** 哪一方是「带钉的下方零件」。 */
  studSide?: 'a' | 'b'
  /** 重叠区在双方局部坐标下的 y 范围。 */
  localY: { a: [number, number]; b: [number, number] }
  /** 重叠区在双方局部坐标下的最小轴向厚度（LDU）。 */
  thickness: number
}

type Range = { min: [number, number, number]; max: [number, number, number] }

function localRange(part: ConnectionPart, points: Vec3[]): Range {
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (const p of points) {
    const l = part.toLocal(p)
    for (let axis = 0; axis < 3; axis += 1) {
      if (l[axis] < min[axis]) min[axis] = l[axis]
      if (l[axis] > max[axis]) max[axis] = l[axis]
    }
  }
  if (!Number.isFinite(min[0])) {
    return { min: [0, 0, 0], max: [0, 0, 0] }
  }
  return { min, max }
}

/** 重叠区在某一方局部坐标下的最小轴向厚度。 */
function thinness(range: Range): number {
  return Math.min(
    range.max[0] - range.min[0],
    range.max[1] - range.min[1],
    range.max[2] - range.min[2],
  )
}

/** 局部 y 是否整段落在钉区里。 */
function inStudBand(part: ConnectionPart, range: [number, number]) {
  if (part.localBox.minY > -1) return false // 根本没有钉
  return range[0] >= -STUD_HEIGHT - BAND_EPS && range[1] <= BAND_EPS
}

/** 局部 y 是否整段落在底沿（管孔入口）里。 */
function inBottomLip(part: ConnectionPart, range: [number, number]) {
  return range[0] >= part.localBox.maxY - LIP_EPS
}

/**
 * 判定一段体积重叠是设计好的连接还是穿模。
 *
 * @param a 零件 A
 * @param b 零件 B
 * @param points 重叠区里的采样点（世界坐标）
 */
export function classifyOverlap(
  a: ConnectionPart,
  b: ConnectionPart,
  points: Vec3[],
): OverlapVerdict {
  const rangeA = localRange(a, points)
  const rangeB = localRange(b, points)
  const ya: [number, number] = [rangeA.min[1], rangeA.max[1]]
  const yb: [number, number] = [rangeB.min[1], rangeB.max[1]]
  const thickness = Math.min(thinness(rangeA), thinness(rangeB))
  const localY = { a: ya, b: yb }

  // 图元没有实体厚度，不参与结构判定。
  if (a.primitive || b.primitive) return { kind: 'primitive', localY, thickness }

  // A 是带钉的下方零件、B 是接受它的上方零件。
  if (inStudBand(a, ya) && inBottomLip(b, yb)) {
    return { kind: 'stud', studSide: 'a', localY, thickness }
  }
  // 反过来。
  if (inStudBand(b, yb) && inBottomLip(a, ya)) {
    return { kind: 'stud', studSide: 'b', localY, thickness }
  }

  const descA = a.desc ?? ''
  const descB = b.desc ?? ''

  // 人偶球关节、铰链、夹子：官方模型里这些结构本来就互相嵌着。
  if (MINIFIG.test(descA) || MINIFIG.test(descB)) return { kind: 'figure', localY, thickness }
  if (HINGE.test(descA) || HINGE.test(descB)) return { kind: 'hinge', localY, thickness }
  if (CLIP.test(descA) || CLIP.test(descB)) return { kind: 'clip', localY, thickness }

  // 薄层：官方模型为了画面紧凑让相邻零件压在一起，量级在毫米以下。
  if (thickness <= FIT_TOLERANCE) return { kind: 'fit', localY, thickness }

  // Technic 紧配合：销/轴/轮辋/齿轮这一族零件相互嵌入，
  // 在真实乐高里只可能是「穿孔」（轴穿齿轮、轮辋插进轮胎、销插进砖孔）。
  // LDraw 把孔径和轴径画成一样粗，所以几何上必然有一点点重叠；
  // 只要穿插不深（≤ 4mm）就算紧配合，不是穿模。
  if (SPINDLE.test(descA) || SPINDLE.test(descB)) {
    if (thickness <= TECHNIC_TOLERANCE) return { kind: 'technic', localY, thickness }
  }

  return { kind: 'spurious', localY, thickness }
}
