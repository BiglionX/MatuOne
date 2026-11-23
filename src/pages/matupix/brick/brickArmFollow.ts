import {
  partInfo,
  partMount,
  partOrigin,
  partPinCount,
  partSpinAxis,
  type Brick,
  type BrickType,
  type PartSpinAxis,
} from './brickTypes'

type Vec3 = [number, number, number]
type Mat3 = [number, number, number, number, number, number, number, number, number]

const STUD_LDU = 20
const HEIGHT_LDU = 24

/**
 * 手原点贴在腕孔上的判定距离（钉距）。
 * 官方腕孔中心大约离肩 1 钉，装配时允许半钉左右的误差。
 */
const HAND_ATTACH_EPS = 0.55

/** 右臂腕孔中心（LDU，相对肩部 LDraw 原点）；左臂镜像 X。 */
const ARM_WRIST_LDU_RIGHT: Vec3 = [-5, 18.9, -9.9]

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

function transpose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]
}

function rotateX(deg: number): Mat3 {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return [1, 0, 0, 0, c, -s, 0, s, c]
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

function rotateAxis(axis: PartSpinAxis, deg: number): Mat3 {
  if (axis === 'x') return rotateX(deg)
  if (axis === 'z') return rotateZ(deg)
  return rotateY(deg)
}

function toLdu(v: Vec3): Vec3 {
  return [v[0] * STUD_LDU, -v[1] * HEIGHT_LDU, -v[2] * STUD_LDU]
}

function fromLdu(v: Vec3): Vec3 {
  return [v[0] / STUD_LDU, -v[1] / HEIGHT_LDU, -v[2] / STUD_LDU]
}

function dist(a: Vec3, b: Vec3) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return Math.hypot(dx, dy, dz)
}

function sameVec(a: Vec3, b: Vec3) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

export function isMinifigArm(type: BrickType) {
  if (type === 'arm-left' || type === 'arm-right') return true
  if (type === 'ldraw:parts/3818' || type === 'ldraw:parts/3819') return true
  try {
    return /Minifig Arm\b/i.test(partInfo(type).name)
  } catch {
    return false
  }
}

export function isMinifigHand(type: BrickType) {
  if (type === 'hand') return true
  if (type === 'ldraw:parts/3820') return true
  try {
    return /Minifig Hand\b/i.test(partInfo(type).name)
  } catch {
    return false
  }
}

function isLeftArm(type: BrickType) {
  if (type === 'arm-left' || type === 'ldraw:parts/3819') return true
  try {
    return /Minifig Arm Left\b/i.test(partInfo(type).name)
  } catch {
    return false
  }
}

function wristLocalLdu(type: BrickType): Vec3 {
  const right = ARM_WRIST_LDU_RIGHT
  if (isLeftArm(type)) return [-right[0], right[1], right[2]]
  return right
}

/**
 * 零件 LDraw 原点在世界（渲染）坐标里的位置。
 * 与 BrickScene 支点一致：point 件在 position+anchor；
 * 单插销 grid 件（魔法手臂等）在 position+anchor+origin。
 */
export function brickPivot(brick: Pick<Brick, 'type' | 'position' | 'anchor' | 'rotation'>): Vec3 {
  const anchor = brick.anchor ?? [0, 0, 0]
  const base: Vec3 = [
    brick.position[0] + anchor[0],
    brick.position[1] + anchor[1],
    brick.position[2] + anchor[2],
  ]
  if (partMount(brick.type) === 'point') return base
  const origin = partOrigin(brick.type)
  if (partPinCount(brick.type) === 1) {
    return [base[0] + origin[0], base[1] + origin[1], base[2] + origin[2]]
  }
  const yawed = apply(rotateY(brick.rotation), origin)
  return [base[0] + yawed[0], base[1] + yawed[1], base[2] + yawed[2]]
}

/** 手/零件的连接点世界坐标（手的腕销、手臂的肩销）。 */
export function brickConnection(brick: Pick<Brick, 'type' | 'position' | 'anchor' | 'rotation'>): Vec3 {
  return brickPivot(brick)
}

function setConnection(brick: Brick, world: Vec3): Brick {
  const anchor = brick.anchor ?? [0, 0, 0]
  if (partMount(brick.type) === 'point') {
    return {
      ...brick,
      position: [world[0] - anchor[0], world[1] - anchor[1], world[2] - anchor[2]],
    }
  }
  const origin = partOrigin(brick.type)
  if (partPinCount(brick.type) === 1) {
    return {
      ...brick,
      position: [
        world[0] - anchor[0] - origin[0],
        world[1] - anchor[1] - origin[1],
        world[2] - anchor[2] - origin[2],
      ],
    }
  }
  const yawed = apply(rotateY(brick.rotation), origin)
  return {
    ...brick,
    position: [
      world[0] - anchor[0] - yawed[0],
      world[1] - anchor[1] - yawed[1],
      world[2] - anchor[2] - yawed[2],
    ],
  }
}

/**
 * 手臂在 LDraw 坐标里的姿态：官方矩阵 → 销轴 spin → 滚角 → 摆角。
 * 与 brickPartModel / BrickScene 内层顺序一致。
 */
function armLdrawPose(brick: Brick): Mat3 {
  const tilted = rotateX(brick.tilt ?? 0)
  const rolled = multiply(rotateZ(brick.roll ?? 0), tilted)
  const spun = multiply(rotateAxis(partSpinAxis(brick.type), brick.spin ?? 0), rolled)
  if (brick.ldraw) return multiply(brick.ldraw.rot, spun)
  return spun
}

function worldToArmLocal(arm: Brick, world: Vec3): Vec3 {
  const pivot = brickPivot(arm)
  const rel: Vec3 = [world[0] - pivot[0], world[1] - pivot[1], world[2] - pivot[2]]
  const unYawed = apply(rotateY(-arm.rotation), rel)
  return apply(transpose(armLdrawPose(arm)), toLdu(unYawed))
}

function armLocalToWorld(arm: Brick, localLdu: Vec3): Vec3 {
  const posed = apply(armLdrawPose(arm), localLdu)
  const yawed = apply(rotateY(arm.rotation), fromLdu(posed))
  const pivot = brickPivot(arm)
  return [pivot[0] + yawed[0], pivot[1] + yawed[1], pivot[2] + yawed[2]]
}

export function armWristWorld(arm: Brick): Vec3 {
  return armLocalToWorld(arm, wristLocalLdu(arm.type))
}

function armPoseChanged(before: Brick, after: Brick) {
  return (
    before.tilt !== after.tilt ||
    before.roll !== after.roll ||
    before.spin !== after.spin ||
    before.rotation !== after.rotation ||
    !sameVec(before.position, after.position) ||
    !sameVec(before.anchor ?? [0, 0, 0], after.anchor ?? [0, 0, 0]) ||
    before.ldraw !== after.ldraw
  )
}

/**
 * 手臂姿态/位置变了之后，把仍插在腕孔上的手一起带走。
 *
 * 零件是平铺的 Brick，没有骨骼父子；这里按「手连接点是否贴着旧腕孔」判定附着，
 * 再把该点变到新手臂坐标系，并给手加上同样的摆角增量，腕部朝向跟着抬起。
 */
export function syncArmFollowers(before: Brick, after: Brick, bricks: readonly Brick[]): Brick[] {
  if (!isMinifigArm(after.type) || before.id !== after.id) {
    return bricks.map((item) => (item.id === after.id ? after : item))
  }
  if (!armPoseChanged(before, after)) {
    return bricks.map((item) => (item.id === after.id ? after : item))
  }

  const wristBefore = armWristWorld(before)
  const dTilt = (after.tilt ?? 0) - (before.tilt ?? 0)

  return bricks.map((item) => {
    if (item.id === after.id) return after
    if (!isMinifigHand(item.type)) return item
    const handAt = brickConnection(item)
    if (dist(handAt, wristBefore) > HAND_ATTACH_EPS) return item

    const local = worldToArmLocal(before, handAt)
    const nextAt = armLocalToWorld(after, local)
    const moved = setConnection(item, nextAt)
    if (dTilt === 0) return moved
    return { ...moved, tilt: (moved.tilt ?? 0) + dTilt }
  })
}
