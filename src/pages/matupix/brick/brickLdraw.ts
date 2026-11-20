import { BRICK_PALETTE, partInfo, partMount, partOrigin, type Brick } from './brickTypes'

const STUD_LDU = 20
const HEIGHT_LDU = 24

type Vec3 = [number, number, number]

// 列向量矩阵，按行展开成 a b c / d e f / g h i，作用是 v' = M·v。
// LDraw 文件里的矩阵就是这个写法，three.js 的 LDrawLoader 也按这个约定解析。
type Mat3 = [number, number, number, number, number, number, number, number, number]

const HEADER = ['0 MatuPix Brick Model', '0 Name: matupix-brick.ldr', '0 Author: MatuPix']

function formatLdu(value: number) {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 1e6) / 1e6
  if (Number.isInteger(rounded)) return Object.is(rounded, -0) ? '0' : String(rounded)
  return String(rounded)
}

function ldrawColor(color: string) {
  const key = color.trim().toUpperCase()
  const found = BRICK_PALETTE.find((item) => item.hex.toUpperCase() === key)
  if (!found) return { code: 16, fallback: true }
  return { code: found.ldraw, fallback: false }
}

function multiply(a: Mat3, b: Mat3): Mat3 {
  return [
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
    a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
    a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
    a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
    a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
    a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
    a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
    a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
  ]
}

function apply(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ]
}

function rotateY(deg: number): Mat3 {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return [c, 0, s, 0, 1, 0, -s, 0, c]
}

function rotateZ(deg: number): Mat3 {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return [c, -s, 0, s, c, 0, 0, 0, 1]
}

function rotateX(deg: number): Mat3 {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return [1, 0, 0, 0, c, -s, 0, s, c]
}

// 渲染是 LDraw 翻过来的：Y 朝上、Z 朝观者。换算回去是 X 不变、Y 取反、Z 取反。
function toLdraw(v: Vec3): Vec3 {
  return [v[0] * STUD_LDU, -v[1] * HEIGHT_LDU, -v[2] * STUD_LDU]
}

/**
 * 把渲染里的摆放换算成 LDraw 的一句放置指令。
 *
 * 渲染端的层级是：位置 -> 亚格偏移 -> 绕 Y 转向 -> 绕连接点摆动/滚角 -> 零件自身。
 * 网格件的零件自身还带一个「原点相对脚印中心」的偏移，单连接点零件则把原点挪回支点。
 *
 * 推导出来的导出式（θ 转向、ρ 滚角、τ 摆角、o 零件原点、P+A 支点）：
 *   旋转部分 R = Ry(-θ)·Rz(ρ)·Rx(τ)
 *   网格件落点   base = G(P+A) + Ry(-θ)·G·o
 *   连接点件落点 base = G(P+A)
 * 其中 G = diag(20, -24, -20) 是渲染坐标到 LDraw 的换算。
 */
function placement(brick: Brick) {
  const origin = partOrigin(brick.type)
  const anchor = brick.anchor ?? [0, 0, 0]
  const pivot: Vec3 = toLdraw([
    brick.position[0] + anchor[0],
    brick.position[1] + anchor[1],
    brick.position[2] + anchor[2],
  ])
  const theta = brick.rotation
  const rho = brick.roll ?? 0
  const tau = brick.tilt ?? 0
  const point = partMount(brick.type) === 'point'

  const turned = apply(rotateY(-theta), toLdraw(origin))
  const base: Vec3 = point
    ? pivot
    : [pivot[0] + turned[0], pivot[1] + turned[1], pivot[2] + turned[2]]
  const matrix = multiply(multiply(rotateY(-theta), rotateZ(rho)), rotateX(tau))
  return { base, matrix }
}

export function toLDraw(bricks: readonly Brick[]): { text: string; fallbackCount: number } {
  let fallbackCount = 0
  const lines = [...HEADER]
  for (const brick of bricks) {
    const mapped = ldrawColor(brick.color)
    if (mapped.fallback) fallbackCount += 1
    const { base, matrix } = placement(brick)
    lines.push(
      `1 ${mapped.code} ${formatLdu(base[0])} ${formatLdu(base[1])} ${formatLdu(base[2])} ${matrix
        .map((value) => formatLdu(value))
        .join(' ')} ${partInfo(brick.type).ldraw}.dat`,
    )
  }
  return { text: `${lines.join('\n')}\n`, fallbackCount }
}
