import { BRICK_PARTS, normalizeBrickY, type Brick, type BrickRotation, type BrickType } from './brickTypes'

const DRAFT_KEY = 'matupix.brick.draft.v1'
const HEX_COLOR = /^#[0-9a-f]{6}$/i
const BRICK_TYPES = new Set<BrickType>(BRICK_PARTS.map((item) => item.type))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRotation(value: unknown): value is BrickRotation {
  return value === 0 || value === 90 || value === 180 || value === 270
}

function isBrickType(value: unknown): value is BrickType {
  return typeof value === 'string' && BRICK_TYPES.has(value as BrickType)
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
  const yFixed = normalizeBrickY(y, value.type)
  if (yFixed === null) return null
  return {
    id: value.id,
    type: value.type,
    color: value.color,
    rotation: value.rotation,
    position: [x, yFixed, z],
  }
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
