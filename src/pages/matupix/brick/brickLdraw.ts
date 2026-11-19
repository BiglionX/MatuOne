import { BRICK_PALETTE, partInfo, type Brick, type BrickRotation } from './brickTypes'

const ROTATION_MATRIX: Record<BrickRotation, string> = {
  0: '1 0 0 0 1 0 0 0 1',
  90: '0 0 -1 0 1 0 1 0 0',
  180: '-1 0 0 0 1 0 0 0 -1',
  270: '0 0 1 0 1 0 -1 0 0',
}

const HEADER = ['0 MatuPix Brick Model', '0 Name: matupix-brick.ldr', '0 Author: MatuPix']

function formatLdu(value: number) {
  if (!Number.isFinite(value)) return '0'
  const doubled = Math.round(value * 2)
  if (Math.abs(value * 2 - doubled) <= 1e-6) {
    if (doubled % 2 === 0) {
      const integer = doubled / 2
      return Object.is(integer, -0) ? '0' : String(integer)
    }
    const whole = (Math.abs(doubled) - 1) / 2
    return `${doubled < 0 ? '-' : ''}${whole}.5`
  }
  const negative = value < 0
  const text = Math.abs(value).toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
  return `${negative ? '-' : ''}${text}`
}

function ldrawColor(color: string) {
  const key = color.trim().toUpperCase()
  const found = BRICK_PALETTE.find((item) => item.hex.toUpperCase() === key)
  if (!found) return { code: 16, fallback: true }
  return { code: found.ldraw, fallback: false }
}

export function toLDraw(bricks: readonly Brick[]): { text: string; fallbackCount: number } {
  let fallbackCount = 0
  const lines = [...HEADER]
  for (const brick of bricks) {
    const mapped = ldrawColor(brick.color)
    if (mapped.fallback) fallbackCount += 1
    const [x, y, z] = brick.position
    lines.push(
      `1 ${mapped.code} ${formatLdu(x * 20)} ${formatLdu(-y * 24)} ${formatLdu(z * 20)} ${ROTATION_MATRIX[brick.rotation]} ${partInfo(brick.type).ldraw}`,
    )
  }
  return { text: `${lines.join('\n')}\n`, fallbackCount }
}
