import { ALL_BRICK_TYPES, normalizeBrickY, type Brick, type BrickLdrawPlacement, type BrickRotation, type BrickType } from './brickTypes'

const DRAFT_KEY = 'matupix.brick.draft.v1'
const HEX_COLOR = /^#[0-9a-f]{6}$/i
const BRICK_TYPES = ALL_BRICK_TYPES

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRotation(value: unknown): value is BrickRotation {
  return value === 0 || value === 90 || value === 180 || value === 270
}

function isBrickType(value: unknown): value is BrickType {
  return typeof value === 'string' && BRICK_TYPES.has(value as BrickType)
}

function readVector(value: unknown): [number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 3) return null
  const [x, y, z] = value
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return null
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null
  return [x, y, z]
}

function readAngle(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return value
}

/** LDraw 矩阵的旋转部分：行向量三行，共 9 个数。 */
function readRot(value: unknown): BrickLdrawPlacement['rot'] | null {
  if (!Array.isArray(value) || value.length !== 9) return null
  const nums = value.map(Number)
  if (nums.some((item) => !Number.isFinite(item))) return null
  return nums as BrickLdrawPlacement['rot']
}

function readBrick(value: unknown): Brick | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || value.id.length === 0) return null
  if (!isBrickType(value.type)) return null
  if (!isRotation(value.rotation)) return null
  if (typeof value.color !== 'string' || !HEX_COLOR.test(value.color)) return null
  if (!Array.isArray(value.position) || value.position.length !== 3) return null
  const [x, y, z] = value.position
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return null
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null
  // LDraw 矩阵件的坐标是官方模型的精确值，吸到板层网格上会把模型拆歪。
  const exact = isRecord(value.ldraw)
  const yFixed = exact ? (Number.isFinite(y) ? y : null) : normalizeBrickY(y, value.type)
  if (yFixed === null) return null
  const brick: Brick = {
    id: value.id,
    type: value.type,
    color: value.color,
    rotation: value.rotation,
    position: [x, yFixed, z],
  }
  // 亚格偏移、摆角、滚角是单连接点零件的姿态信息，草稿里要一起存。
  const anchor = readVector(value.anchor)
  if (anchor) brick.anchor = anchor
  const tilt = readAngle(value.tilt)
  if (tilt !== undefined) brick.tilt = tilt
  const roll = readAngle(value.roll)
  if (roll !== undefined) brick.roll = roll
  // LDraw 矩阵件：官方模型带来的精确姿态，草稿里要原样存回去。
  if (value.ldraw !== undefined) {
    if (!isRecord(value.ldraw)) return null
    const rot = readRot(value.ldraw.rot)
    const pos = readVector(value.ldraw.pos)
    if (!rot || !pos) return null
    brick.ldraw = { rot, pos }
  }
  // 魔法模型来源：导出 .ldr 时要靠它写 CC BY 署名。
  if (typeof value.magicModel === 'string' && value.magicModel.length > 0) {
    brick.magicModel = value.magicModel
  }
  return brick
}

export function loadBrickDraft(): Brick[] {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return []
    const data: unknown = JSON.parse(raw)
    if (!isRecord(data) || data.version !== 1 || !Array.isArray(data.bricks)) return []
    const bricks: Brick[] = []
    for (const entry of data.bricks) {
      const brick = readBrick(entry)
      if (brick) bricks.push(brick)
    }
    return bricks
  } catch {
    return []
  }
}

export function saveBrickDraft(bricks: Brick[]) {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: 1,
        bricks,
        updatedAt: new Date().toISOString(),
      }),
    )
  } catch {
    // 配额或隐私模式写失败时只留内存。
  }
}
