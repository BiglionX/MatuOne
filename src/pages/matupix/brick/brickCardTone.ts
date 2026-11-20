import type { CSSProperties } from 'react'
import type { BrickCategory } from './brickTypes'

/** 立体卡片的一套配色：卡面渐变、描边、厚底边、落地投影、选中高亮。 */
export type BrickCardTone = {
  from: string
  to: string
  edge: string
  lip: string
  glow: string
  ring: string
}

/** 允许写入 --brick3d-* 自定义属性的行内样式。 */
export type Brick3dStyle = CSSProperties & Record<`--brick3d-${string}`, string>

function parseHex(hex: string): [number, number, number] | null {
  const raw = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null
  return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)]
}

/** 按比例调整明暗，ratio 大于 1 提亮、小于 1 压暗。 */
export function shadeHex(hex: string, ratio: number) {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value * ratio))).toString(16).padStart(2, '0')
  return `#${channel(rgb[0])}${channel(rgb[1])}${channel(rgb[2])}`
}

/** 把 hex 往目标色混，amount 取 0~1。 */
export function mixHex(hex: string, target: string, amount: number) {
  const from = parseHex(hex)
  const to = parseHex(target)
  if (!from || !to) return hex
  const channel = (index: number) => {
    const value = Math.round(from[index] + (to[index] - from[index]) * amount)
    return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')
  }
  return `#${channel(0)}${channel(1)}${channel(2)}`
}

/** hex 转半透明色，用来做落地投影。 */
export function hexToRgba(hex: string, alpha: number) {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
}

/** 每个零件分类一套卡片色，底边色跟分类主色一致。 */
export const BRICK_CATEGORY_TONES: Record<BrickCategory, BrickCardTone> = {
  基础积木: { from: '#FFFFFF', to: '#FFF1EF', edge: '#F4C9C5', lip: '#D8363C', glow: 'rgba(216, 54, 60, 0.26)', ring: 'rgba(216, 54, 60, 0.24)' },
  斜面: { from: '#FFFFFF', to: '#FFF5E9', edge: '#F3D9B4', lip: '#DD8021', glow: 'rgba(221, 128, 33, 0.26)', ring: 'rgba(221, 128, 33, 0.24)' },
  曲面: { from: '#FFFFFF', to: '#F6F2FF', edge: '#DBCFF6', lip: '#7A4FD8', glow: 'rgba(122, 79, 216, 0.26)', ring: 'rgba(122, 79, 216, 0.24)' },
  房子: { from: '#FFFFFF', to: '#FFF8EA', edge: '#EFDCB0', lip: '#C99324', glow: 'rgba(201, 147, 36, 0.26)', ring: 'rgba(201, 147, 36, 0.24)' },
  车辆: { from: '#FFFFFF', to: '#EFF6FF', edge: '#C4DBF5', lip: '#2A80D6', glow: 'rgba(42, 128, 214, 0.26)', ring: 'rgba(42, 128, 214, 0.24)' },
  自然: { from: '#FFFFFF', to: '#EFFAF3', edge: '#C6E6D3', lip: '#31A259', glow: 'rgba(49, 162, 89, 0.26)', ring: 'rgba(49, 162, 89, 0.24)' },
  人物: { from: '#FFFFFF', to: '#FFF1F7', edge: '#F4CFE0', lip: '#DB4590', glow: 'rgba(219, 69, 144, 0.26)', ring: 'rgba(219, 69, 144, 0.24)' },
  物件: { from: '#FFFFFF', to: '#EDF9F7', edge: '#BFE6DF', lip: '#109C90', glow: 'rgba(16, 156, 144, 0.26)', ring: 'rgba(16, 156, 144, 0.24)' },
}

/** 把卡片配色写进 CSS 变量。 */
export function cardToneVars(tone: BrickCardTone): Brick3dStyle {
  return {
    '--brick3d-from': tone.from,
    '--brick3d-to': tone.to,
    '--brick3d-edge': tone.edge,
    '--brick3d-lip': tone.lip,
    '--brick3d-glow': tone.glow,
    '--brick3d-ring': tone.ring,
  }
}
