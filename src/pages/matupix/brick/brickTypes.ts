export type BrickRotation = 0 | 90 | 180 | 270

export type BrickCategory = '基础积木' | '斜面' | '曲面' | '房子' | '车辆' | '自然' | '人物' | '物件'

export type BrickGlyph = 'studs' | 'round' | 'disc' | 'tile' | 'cone' | 'jumper' | 'slope' | 'corner'

export type BrickType =
  | '2x2'
  | '2x4'
  | '1x2'
  | '1x1'
  | 'round-1x1'
  | 'plate-1x1'
  | 'plate-1x2'
  | 'plate-1x3'
  | 'plate-2x2'
  | 'plate-2x4'
  | 'plate-round-1x1'
  | 'plate-round-2x2'
  | 'tile-1x1'
  | 'tile-1x2'
  | 'tile-round-1x1'
  | 'cone-1x1'
  | 'jumper-1x2'
  | 'headlight-1x1'
  | 'curved-1x2'
  | 'bracket-1x2'
  | 'plate-1x4'
  | 'plate-1x6'
  | 'plate-1x8'
  | 'plate-1x10'
  | 'plate-1x12'
  | 'plate-2x3'
  | 'plate-2x6'
  | 'plate-2x8'
  | 'plate-2x10'
  | 'plate-2x12'
  | 'plate-2x16'
  | 'plate-3x3'
  | 'plate-4x4'
  | 'plate-4x6'
  | 'plate-4x8'
  | 'plate-4x10'
  | 'plate-4x12'
  | 'plate-6x6'
  | 'plate-6x8'
  | 'plate-6x10'
  | 'plate-6x12'
  | 'plate-8x8'
  | 'plate-8x16'
  | 'tile-1x3'
  | 'tile-1x4'
  | 'tile-1x6'
  | 'tile-1x8'
  | 'tile-2x2'
  | 'tile-2x3'
  | 'tile-2x4'
  | 'tile-2x6'
  | 'tile-3x6'
  | 'tile-4x4'
  | 'tile-4x8'
  | 'tile-6x6'
  | 'tile-6x8'
  | 'tile-round-2x2'
  | 'brick-1x3'
  | 'brick-1x4'
  | 'brick-1x6'
  | 'brick-1x8'
  | 'brick-1x10'
  | 'brick-1x12'
  | 'brick-1x16'
  | 'brick-2x3'
  | 'brick-2x6'
  | 'brick-2x8'
  | 'brick-2x10'
  | 'brick-4x6'
  | 'brick-4x10'
  | 'brick-4x12'
  | 'brick-8x8'
  | 'cylinder-2x2'
  | 'cylinder-4x4'
  | 'cone-2x2'
  | 'cone-4x4'
  | 'arch-1x6'
  | 'arch-1x8'
  | 'arch-2x6'
  | 'bar-4l'
  | 'slope-2x1'
  | 'slope-2x2'
  | 'slope-3x1'
  | 'cheese-1x1'
  | 'cheese-1x2'
  | 'cheese-1x3'
  | 'cheese-1x4'
  | 'slope-gentle-2x1'
  | 'slope-1x2'
  | 'slope-inv-2x1'
  | 'wedge-2x2-right'
  | 'wedge-2x2-left'
  | 'slope-round-2x2'
  | 'slope-gentle-2x2'
  | 'slope-double-2x2'
  | 'slope-inv-2x2'
  | 'slope-curved-2x2'
  | 'slope-gentle-3x2'
  | 'slope-gentle-4x1'
  | 'slope-gentle-4x2'
  | 'slope-gentle-3x4'
  | 'slope-gentle-3x3'
  | 'slope-2x3'
  | 'slope-2x4'
  | 'slope-double-2x1'
  | 'slope-double-2x3'
  | 'slope-double-2x4'
  | 'slope-inv-3x2'
  | 'slope-inv-3x1'
  | 'corner-2x2'
  | 'curve-1x2'
  | 'door'
  | 'door-frame'
  | 'window'
  | 'glass'
  | 'fence'
  | 'ladder'
  | 'panel-1x4'
  | 'tyre'
  | 'tyre-small'
  | 'rim'
  | 'rim-small'
  | 'steer'
  | 'windscreen'
  | 'windscreen-long'
  | 'canopy'
  | 'seat'
  | 'grille'
  | 'mudguard'
  | 'flower'
  | 'leaves'
  | 'tree'
  | 'bush'
  | 'star'
  | 'head'
  | 'hair'
  | 'hair-wavy'
  | 'hip'
  | 'legs'
  | 'leg-right'
  | 'torso'
  | 'arm-left'
  | 'arm-right'
  | 'hand'
  | 'helmet'
  | 'sword'
  | 'shield'
  | 'cup'
  | 'flag'
  | 'antenna'
  | 'dish'
  | 'propeller'

export type Brick = {
  id: string
  type: BrickType
  color: string
  position: [number, number, number]
  rotation: BrickRotation
}

export const BRICK_PALETTE = [
  { hex: '#E23D3D', name: '红', ldraw: 4 },
  { hex: '#FE8A18', name: '橙', ldraw: 25 },
  { hex: '#F5C518', name: '黄', ldraw: 14 },
  { hex: '#2EAD4B', name: '绿', ldraw: 2 },
  { hex: '#2F6FED', name: '蓝', ldraw: 1 },
  { hex: '#81007B', name: '紫', ldraw: 22 },
  { hex: '#FFFFFF', name: '白', ldraw: 15 },
  { hex: '#05131D', name: '黑', ldraw: 0 },
] as const

export const BRICK_COLORS = BRICK_PALETTE.map((item) => item.hex)

export function brickColorName(color: string) {
  const key = color.trim().toUpperCase()
  return BRICK_PALETTE.find((item) => item.hex.toUpperCase() === key)?.name ?? color
}

export type BrickPartInfo = {
  type: BrickType
  label: string
  name: string
  footprint: string
  ldraw: string
  studs: readonly [number, number]
  plates: number
  category: BrickCategory
  glyph: BrickGlyph
}

// studs 是旋转 0° 时的 [X 向钉数, Z 向钉数]，和 .dat 实心包围盒一致。
// plates 是垂直占用的板层数。一整砖 3，板和片 1。
export const BRICK_PARTS: BrickPartInfo[] = [
  { type: 'plate-1x1', label: '1×1 板', name: '1×1 板', footprint: '1×1', ldraw: '3024', studs: [1, 1], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-round-1x1', label: '1×1 圆板', name: '1×1 圆板', footprint: '1×1', ldraw: '4073', studs: [1, 1], plates: 1, category: '基础积木', glyph: 'round' },
  { type: 'tile-1x1', label: '1×1 片', name: '1×1 片', footprint: '1×1', ldraw: '3070b', studs: [1, 1], plates: 1, category: '基础积木', glyph: 'tile' },
  { type: 'tile-round-1x1', label: '1×1 圆片', name: '1×1 圆片', footprint: '1×1', ldraw: '98138', studs: [1, 1], plates: 1, category: '基础积木', glyph: 'disc' },
  { type: '1x1', label: '1×1 砖', name: '1×1 砖', footprint: '1×1', ldraw: '3005', studs: [1, 1], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'round-1x1', label: '1×1 圆砖', name: '1×1 圆砖', footprint: '1×1', ldraw: '3062b', studs: [1, 1], plates: 3, category: '基础积木', glyph: 'round' },
  { type: 'headlight-1x1', label: '1×1 头灯砖', name: '1×1 头灯砖', footprint: '1×1', ldraw: '4070', studs: [1, 1], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'cone-1x1', label: '1×1 锥', name: '1×1 锥', footprint: '1×1', ldraw: '4589', studs: [1, 1], plates: 3, category: '基础积木', glyph: 'cone' },
  { type: 'plate-1x2', label: '1×2 板', name: '1×2 板', footprint: '1×2', ldraw: '3023', studs: [2, 1], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'jumper-1x2', label: '1×2 跳板', name: '1×2 跳板', footprint: '1×2', ldraw: '3794', studs: [2, 1], plates: 1, category: '基础积木', glyph: 'jumper' },
  { type: 'tile-1x2', label: '1×2 片', name: '1×2 片', footprint: '1×2', ldraw: '3069b', studs: [2, 1], plates: 1, category: '基础积木', glyph: 'tile' },
  { type: '1x2', label: '1×2 砖', name: '1×2 砖', footprint: '1×2', ldraw: '3004', studs: [2, 1], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'curved-1x2', label: '1×2 弧形砖', name: '1×2 弧形砖', footprint: '1×2', ldraw: '11477', studs: [1, 2], plates: 2, category: '基础积木', glyph: 'slope' },
  { type: 'bracket-1x2', label: '1×2 支架', name: '1×2 支架', footprint: '1×2', ldraw: '99781', studs: [2, 1], plates: 3, category: '基础积木', glyph: 'corner' },
  { type: 'plate-1x3', label: '1×3 板', name: '1×3 板', footprint: '1×3', ldraw: '3623', studs: [3, 1], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-2x2', label: '2×2 板', name: '2×2 板', footprint: '2×2', ldraw: '3022', studs: [2, 2], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-round-2x2', label: '2×2 圆板', name: '2×2 圆板', footprint: '2×2', ldraw: '4032', studs: [2, 2], plates: 1, category: '基础积木', glyph: 'round' },
  { type: 'plate-2x4', label: '2×4 板', name: '2×4 板', footprint: '2×4', ldraw: '3020', studs: [4, 2], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: '2x2', label: '2×2 砖', name: '2×2 砖', footprint: '2×2', ldraw: '3003', studs: [2, 2], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: '2x4', label: '2×4 砖', name: '2×4 砖', footprint: '2×4', ldraw: '3001', studs: [4, 2], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'plate-1x4', label: '1×4 板', name: '1×4 板', footprint: '1×4', ldraw: '3710', studs: [4, 1], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-1x6', label: '1×6 板', name: '1×6 板', footprint: '1×6', ldraw: '3666', studs: [6, 1], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-1x8', label: '1×8 板', name: '1×8 板', footprint: '1×8', ldraw: '3460', studs: [8, 1], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-1x10', label: '1×10 板', name: '1×10 板', footprint: '1×10', ldraw: '4477', studs: [10, 1], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-1x12', label: '1×12 板', name: '1×12 板', footprint: '1×12', ldraw: '60479', studs: [12, 1], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-2x3', label: '2×3 板', name: '2×3 板', footprint: '2×3', ldraw: '3021', studs: [3, 2], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-2x6', label: '2×6 板', name: '2×6 板', footprint: '2×6', ldraw: '3795', studs: [6, 2], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-2x8', label: '2×8 板', name: '2×8 板', footprint: '2×8', ldraw: '3034', studs: [8, 2], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-2x10', label: '2×10 板', name: '2×10 板', footprint: '2×10', ldraw: '3832', studs: [10, 2], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-2x12', label: '2×12 板', name: '2×12 板', footprint: '2×12', ldraw: '2445', studs: [12, 2], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-2x16', label: '2×16 板', name: '2×16 板', footprint: '2×16', ldraw: '4282', studs: [16, 2], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-3x3', label: '3×3 板', name: '3×3 板', footprint: '3×3', ldraw: '11212', studs: [3, 3], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-4x4', label: '4×4 板', name: '4×4 板', footprint: '4×4', ldraw: '3031', studs: [4, 4], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-4x6', label: '4×6 板', name: '4×6 板', footprint: '4×6', ldraw: '3032', studs: [6, 4], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-4x8', label: '4×8 板', name: '4×8 板', footprint: '4×8', ldraw: '3035', studs: [8, 4], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-4x10', label: '4×10 板', name: '4×10 板', footprint: '4×10', ldraw: '3030', studs: [10, 4], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-4x12', label: '4×12 板', name: '4×12 板', footprint: '4×12', ldraw: '3029', studs: [12, 4], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-6x6', label: '6×6 板', name: '6×6 板', footprint: '6×6', ldraw: '3958', studs: [6, 6], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-6x8', label: '6×8 板', name: '6×8 板', footprint: '6×8', ldraw: '3036', studs: [8, 6], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-6x10', label: '6×10 板', name: '6×10 板', footprint: '6×10', ldraw: '3033', studs: [10, 6], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-6x12', label: '6×12 板', name: '6×12 板', footprint: '6×12', ldraw: '3028', studs: [12, 6], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-8x8', label: '8×8 板', name: '8×8 板', footprint: '8×8', ldraw: '41539', studs: [8, 8], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'plate-8x16', label: '8×16 板', name: '8×16 板', footprint: '8×16', ldraw: '92438', studs: [16, 8], plates: 1, category: '基础积木', glyph: 'studs' },
  { type: 'tile-1x3', label: '1×3 片', name: '1×3 片', footprint: '1×3', ldraw: '63864', studs: [3, 1], plates: 1, category: '基础积木', glyph: 'tile' },
  { type: 'tile-1x4', label: '1×4 片', name: '1×4 片', footprint: '1×4', ldraw: '2431', studs: [4, 1], plates: 1, category: '基础积木', glyph: 'tile' },
  { type: 'tile-1x6', label: '1×6 片', name: '1×6 片', footprint: '1×6', ldraw: '6636', studs: [6, 1], plates: 1, category: '基础积木', glyph: 'tile' },
  { type: 'tile-1x8', label: '1×8 片', name: '1×8 片', footprint: '1×8', ldraw: '4162', studs: [8, 1], plates: 1, category: '基础积木', glyph: 'tile' },
  { type: 'tile-2x2', label: '2×2 片', name: '2×2 片', footprint: '2×2', ldraw: '3068b', studs: [2, 2], plates: 1, category: '基础积木', glyph: 'tile' },
  { type: 'tile-2x3', label: '2×3 片', name: '2×3 片', footprint: '2×3', ldraw: '26603', studs: [3, 2], plates: 1, category: '基础积木', glyph: 'tile' },
  { type: 'tile-2x4', label: '2×4 片', name: '2×4 片', footprint: '2×4', ldraw: '87079', studs: [4, 2], plates: 1, category: '基础积木', glyph: 'tile' },
  { type: 'tile-2x6', label: '2×6 片', name: '2×6 片', footprint: '2×6', ldraw: '69729', studs: [6, 2], plates: 1, category: '基础积木', glyph: 'tile' },
  { type: 'tile-3x6', label: '3×6 片', name: '3×6 片', footprint: '3×6', ldraw: '6934', studs: [6, 3], plates: 1, category: '基础积木', glyph: 'tile' },
  { type: 'tile-4x4', label: '4×4 片', name: '4×4 片', footprint: '4×4', ldraw: '1751', studs: [4, 4], plates: 1, category: '基础积木', glyph: 'tile' },
  { type: 'tile-4x8', label: '4×8 片', name: '4×8 片', footprint: '4×8', ldraw: '8165', studs: [8, 4], plates: 1, category: '基础积木', glyph: 'tile' },
  { type: 'tile-6x6', label: '6×6 片', name: '6×6 片', footprint: '6×6', ldraw: '10202', studs: [6, 6], plates: 1, category: '基础积木', glyph: 'tile' },
  { type: 'tile-6x8', label: '6×8 片', name: '6×8 片', footprint: '6×8', ldraw: '6320', studs: [8, 6], plates: 1, category: '基础积木', glyph: 'tile' },
  { type: 'tile-round-2x2', label: '2×2 圆片', name: '2×2 圆片', footprint: '2×2', ldraw: '14769', studs: [2, 2], plates: 1, category: '基础积木', glyph: 'disc' },
  { type: 'brick-1x3', label: '1×3 砖', name: '1×3 砖', footprint: '1×3', ldraw: '3622', studs: [3, 1], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'brick-1x4', label: '1×4 砖', name: '1×4 砖', footprint: '1×4', ldraw: '3010', studs: [4, 1], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'brick-1x6', label: '1×6 砖', name: '1×6 砖', footprint: '1×6', ldraw: '3009', studs: [6, 1], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'brick-1x8', label: '1×8 砖', name: '1×8 砖', footprint: '1×8', ldraw: '3008', studs: [8, 1], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'brick-1x10', label: '1×10 砖', name: '1×10 砖', footprint: '1×10', ldraw: '6111', studs: [10, 1], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'brick-1x12', label: '1×12 砖', name: '1×12 砖', footprint: '1×12', ldraw: '6112', studs: [12, 1], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'brick-1x16', label: '1×16 砖', name: '1×16 砖', footprint: '1×16', ldraw: '2465', studs: [16, 1], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'brick-2x3', label: '2×3 砖', name: '2×3 砖', footprint: '2×3', ldraw: '3002', studs: [3, 2], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'brick-2x6', label: '2×6 砖', name: '2×6 砖', footprint: '2×6', ldraw: '2456', studs: [6, 2], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'brick-2x8', label: '2×8 砖', name: '2×8 砖', footprint: '2×8', ldraw: '3007', studs: [8, 2], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'brick-2x10', label: '2×10 砖', name: '2×10 砖', footprint: '2×10', ldraw: '3006', studs: [10, 2], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'brick-4x6', label: '4×6 砖', name: '4×6 砖', footprint: '4×6', ldraw: '2356', studs: [6, 4], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'brick-4x10', label: '4×10 砖', name: '4×10 砖', footprint: '4×10', ldraw: '6212', studs: [10, 4], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'brick-4x12', label: '4×12 砖', name: '4×12 砖', footprint: '4×12', ldraw: '4202', studs: [12, 4], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'brick-8x8', label: '8×8 砖', name: '8×8 砖', footprint: '8×8', ldraw: '4201', studs: [8, 8], plates: 3, category: '基础积木', glyph: 'studs' },
  { type: 'cylinder-2x2', label: '2×2 圆柱', name: '2×2 圆柱', footprint: '2×2', ldraw: '3941', studs: [2, 2], plates: 3, category: '基础积木', glyph: 'round' },
  { type: 'cylinder-4x4', label: '4×4 圆柱', name: '4×4 圆柱', footprint: '4×4', ldraw: '6222', studs: [4, 4], plates: 3, category: '基础积木', glyph: 'round' },
  { type: 'cone-2x2', label: '2×2 锥', name: '2×2 锥', footprint: '2×2', ldraw: '3942c', studs: [2, 2], plates: 6, category: '基础积木', glyph: 'cone' },
  { type: 'cone-4x4', label: '4×4 锥', name: '4×4 锥', footprint: '4×4', ldraw: '3943b', studs: [4, 4], plates: 6, category: '基础积木', glyph: 'cone' },
  { type: 'arch-1x6', label: '1×6 拱', name: '1×6 拱', footprint: '1×6', ldraw: '3455', studs: [6, 1], plates: 3, category: '基础积木', glyph: 'slope' },
  { type: 'arch-1x8', label: '1×8 拱', name: '1×8 拱', footprint: '1×8', ldraw: '3308a', studs: [8, 1], plates: 6, category: '基础积木', glyph: 'slope' },
  { type: 'arch-2x6', label: '2×6 拱', name: '2×6 拱', footprint: '2×6', ldraw: '2145', studs: [6, 2], plates: 15, category: '基础积木', glyph: 'slope' },
  { type: 'bar-4l', label: '4L 横杆', name: '4L 横杆', footprint: '1×1', ldraw: '30374', studs: [1, 1], plates: 10, category: '基础积木', glyph: 'tile' },
  { type: 'cheese-1x1', label: '奶酪 1×1', name: '奶酪 1×1', footprint: '1 × 1', ldraw: '54200', studs: [1, 1], plates: 2, category: '斜面', glyph: 'slope' },
  { type: 'cheese-1x2', label: '奶酪 1×2', name: '奶酪 1×2', footprint: '1 × 2', ldraw: '85984', studs: [2, 1], plates: 2, category: '斜面', glyph: 'slope' },
  { type: 'slope-gentle-2x1', label: '缓斜 2×1', name: '缓斜 2×1', footprint: '2 × 1', ldraw: '5404', studs: [1, 2], plates: 2, category: '斜面', glyph: 'slope' },
  { type: 'slope-1x2', label: '斜面 1×2', name: '斜面 1×2', footprint: '1 × 2', ldraw: '3048b', studs: [2, 1], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-2x1', label: '斜面 2×1', name: '斜面 2×1', footprint: '2 × 1', ldraw: '3040b', studs: [1, 2], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-inv-2x1', label: '倒斜 2×1', name: '倒斜 2×1', footprint: '2 × 1', ldraw: '3665b', studs: [1, 2], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'wedge-2x2-right', label: '右楔 2×2', name: '右楔 2×2', footprint: '2 × 2', ldraw: '24307', studs: [2, 2], plates: 1, category: '斜面', glyph: 'slope' },
  { type: 'wedge-2x2-left', label: '左楔 2×2', name: '左楔 2×2', footprint: '2 × 2', ldraw: '24299', studs: [2, 2], plates: 1, category: '斜面', glyph: 'slope' },
  { type: 'slope-round-2x2', label: '奶酪 2×2', name: '奶酪 2×2', footprint: '2 × 2', ldraw: '41855', studs: [2, 2], plates: 2, category: '斜面', glyph: 'slope' },
  { type: 'slope-gentle-2x2', label: '缓双斜 2×2', name: '缓双斜 2×2', footprint: '2 × 2', ldraw: '3300', studs: [2, 2], plates: 2, category: '斜面', glyph: 'slope' },
  { type: 'slope-2x2', label: '斜面 2×2', name: '斜面 2×2', footprint: '2 × 2', ldraw: '3039', studs: [2, 2], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-double-2x2', label: '双斜 2×2', name: '双斜 2×2', footprint: '2 × 2', ldraw: '3043', studs: [2, 2], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-inv-2x2', label: '倒斜 2×2', name: '倒斜 2×2', footprint: '2 × 2', ldraw: '3660b', studs: [2, 2], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-curved-2x2', label: '弧斜 2×2', name: '弧斜 2×2', footprint: '2 × 2', ldraw: '30602', studs: [2, 2], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-gentle-3x2', label: '缓斜 3×2', name: '缓斜 3×2', footprint: '3 × 2', ldraw: '3298', studs: [2, 3], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-3x1', label: '缓斜 3×1', name: '缓斜 3×1', footprint: '3 × 1', ldraw: '4286', studs: [1, 3], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'cheese-1x3', label: '奶酪 1×3', name: '奶酪 1×3', footprint: '1 × 3', ldraw: '7825', studs: [3, 1], plates: 2, category: '斜面', glyph: 'slope' },
  { type: 'cheese-1x4', label: '奶酪 1×4', name: '奶酪 1×4', footprint: '1 × 4', ldraw: '7835', studs: [4, 1], plates: 2, category: '斜面', glyph: 'slope' },
  { type: 'slope-2x3', label: '斜面 2×3', name: '斜面 2×3', footprint: '2 × 3', ldraw: '3038', studs: [3, 2], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-2x4', label: '斜面 2×4', name: '斜面 2×4', footprint: '2 × 4', ldraw: '3037', studs: [4, 2], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-double-2x1', label: '双斜 2×1', name: '双斜 2×1', footprint: '2 × 1', ldraw: '3044b', studs: [1, 2], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-double-2x3', label: '双斜 2×3', name: '双斜 2×3', footprint: '2 × 3', ldraw: '3042', studs: [3, 2], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-double-2x4', label: '双斜 2×4', name: '双斜 2×4', footprint: '2 × 4', ldraw: '3041', studs: [4, 2], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-inv-3x2', label: '倒斜 3×2', name: '倒斜 3×2', footprint: '3 × 2', ldraw: '3747b', studs: [2, 3], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-inv-3x1', label: '倒斜 3×1', name: '倒斜 3×1', footprint: '3 × 1', ldraw: '4287a', studs: [1, 3], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-gentle-4x1', label: '缓斜 4×1', name: '缓斜 4×1', footprint: '4 × 1', ldraw: '60477', studs: [1, 4], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-gentle-4x2', label: '缓斜 4×2', name: '缓斜 4×2', footprint: '4 × 2', ldraw: '30363', studs: [2, 4], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-gentle-3x4', label: '缓斜 3×4', name: '缓斜 3×4', footprint: '3 × 4', ldraw: '3297', studs: [4, 3], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'slope-gentle-3x3', label: '缓斜 3×3', name: '缓斜 3×3', footprint: '3 × 3', ldraw: '4161', studs: [3, 3], plates: 3, category: '斜面', glyph: 'slope' },
  { type: 'corner-2x2', label: '2×2 转角板', name: '2×2 转角板', footprint: '2×2', ldraw: '2420', studs: [2, 2], plates: 1, category: '曲面', glyph: 'corner' },
  { type: 'curve-1x2', label: '1×2 曲面砖', name: '1×2 曲面砖', footprint: '1×2', ldraw: '6091', studs: [1, 2], plates: 4, category: '曲面', glyph: 'slope' },
  { type: 'door', label: '门', name: '门', footprint: '4×1', ldraw: '60623', studs: [4, 1], plates: 17, category: '房子', glyph: 'studs' },
  { type: 'door-frame', label: '门框', name: '门框', footprint: '4×1', ldraw: '60596', studs: [4, 1], plates: 19, category: '房子', glyph: 'studs' },
  { type: 'window', label: '窗', name: '窗', footprint: '2×1', ldraw: '60592', studs: [2, 1], plates: 7, category: '房子', glyph: 'studs' },
  { type: 'glass', label: '玻璃', name: '玻璃', footprint: '2×1', ldraw: '60601', studs: [2, 1], plates: 5, category: '房子', glyph: 'tile' },
  { type: 'fence', label: '栅栏', name: '栅栏', footprint: '4×1', ldraw: '3185', studs: [4, 1], plates: 6, category: '房子', glyph: 'studs' },
  { type: 'ladder', label: '梯子', name: '梯子', footprint: '3×7', ldraw: '6020', studs: [3, 7], plates: 2, category: '房子', glyph: 'studs' },
  { type: 'panel-1x4', label: '面板', name: '面板', footprint: '4×1', ldraw: '30413', studs: [4, 1], plates: 3, category: '房子', glyph: 'studs' },
  { type: 'tyre', label: '轮胎', name: '轮胎', footprint: '2×1', ldraw: '3641', studs: [2, 1], plates: 5, category: '车辆', glyph: 'round' },
  { type: 'tyre-small', label: '小轮胎', name: '小轮胎', footprint: '3×1', ldraw: '6015', studs: [3, 1], plates: 6, category: '车辆', glyph: 'round' },
  { type: 'rim', label: '轮毂', name: '轮毂', footprint: '1×1', ldraw: '4624', studs: [1, 1], plates: 3, category: '车辆', glyph: 'round' },
  { type: 'rim-small', label: '小轮毂', name: '小轮毂', footprint: '1×1', ldraw: '30027a', studs: [1, 1], plates: 3, category: '车辆', glyph: 'round' },
  { type: 'steer', label: '方向盘', name: '方向盘', footprint: '2×2', ldraw: '30663', studs: [2, 2], plates: 2, category: '车辆', glyph: 'round' },
  { type: 'windscreen', label: '挡风', name: '挡风', footprint: '4×2', ldraw: '3823', studs: [4, 2], plates: 7, category: '车辆', glyph: 'slope' },
  { type: 'windscreen-long', label: '长挡风', name: '长挡风', footprint: '2×5', ldraw: '6070', studs: [2, 5], plates: 6, category: '车辆', glyph: 'slope' },
  { type: 'canopy', label: '座舱罩', name: '座舱罩', footprint: '4×6', ldraw: '4474', studs: [4, 6], plates: 6, category: '车辆', glyph: 'slope' },
  { type: 'seat', label: '座椅', name: '座椅', footprint: '2×2', ldraw: '4079', studs: [2, 2], plates: 6, category: '车辆', glyph: 'studs' },
  { type: 'grille', label: '格栅', name: '格栅', footprint: '2×1', ldraw: '2412b', studs: [2, 1], plates: 1, category: '车辆', glyph: 'tile' },
  { type: 'mudguard', label: '挡泥板', name: '挡泥板', footprint: '4×2', ldraw: '3788', studs: [4, 2], plates: 3, category: '车辆', glyph: 'studs' },
  { type: 'flower', label: '花', name: '花', footprint: '1×1', ldraw: '32606', studs: [1, 1], plates: 2, category: '自然', glyph: 'cone' },
  { type: 'leaves', label: '叶', name: '叶', footprint: '2×2', ldraw: '32607', studs: [2, 2], plates: 2, category: '自然', glyph: 'cone' },
  { type: 'tree', label: '树', name: '树', footprint: '4×4', ldraw: '3471', studs: [4, 4], plates: 20, category: '自然', glyph: 'cone' },
  { type: 'bush', label: '灌木', name: '灌木', footprint: '2×2', ldraw: '37695', studs: [2, 2], plates: 4, category: '自然', glyph: 'cone' },
  { type: 'star', label: '星', name: '星', footprint: '1×1', ldraw: '11609', studs: [1, 1], plates: 1, category: '自然', glyph: 'disc' },
  { type: 'head', label: '头', name: '头', footprint: '1×1', ldraw: '3626b', studs: [1, 1], plates: 4, category: '人物', glyph: 'round' },
  { type: 'hair', label: '男发', name: '男发', footprint: '2×2', ldraw: '3901', studs: [2, 2], plates: 3, category: '人物', glyph: 'round' },
  { type: 'hair-wavy', label: '波浪发', name: '波浪发', footprint: '2×2', ldraw: '43751', studs: [2, 2], plates: 4, category: '人物', glyph: 'round' },
  { type: 'helmet', label: '头盔', name: '头盔', footprint: '2×2', ldraw: '3624', studs: [2, 2], plates: 2, category: '人物', glyph: 'round' },
  { type: 'torso', label: '躯干', name: '躯干', footprint: '2×1', ldraw: '973', studs: [2, 1], plates: 6, category: '人物', glyph: 'studs' },
  { type: 'hip', label: '髓部', name: '髓部', footprint: '2×1', ldraw: '3815b', studs: [2, 1], plates: 4, category: '人物', glyph: 'studs' },
  { type: 'legs', label: '左腿', name: '左腿', footprint: '1×1', ldraw: '3817c', studs: [1, 1], plates: 5, category: '人物', glyph: 'studs' },
  { type: 'leg-right', label: '右腿', name: '右腿', footprint: '1×1', ldraw: '3816c', studs: [1, 1], plates: 5, category: '人物', glyph: 'studs' },
  { type: 'arm-left', label: '左臂', name: '左臂', footprint: '1×1', ldraw: '3819', studs: [1, 1], plates: 4, category: '人物', glyph: 'studs' },
  { type: 'arm-right', label: '右臂', name: '右臂', footprint: '1×1', ldraw: '3818', studs: [1, 1], plates: 4, category: '人物', glyph: 'studs' },
  { type: 'hand', label: '手', name: '手', footprint: '1×1', ldraw: '3820', studs: [1, 1], plates: 2, category: '人物', glyph: 'studs' },
  { type: 'sword', label: '剑', name: '剑', footprint: '1×2', ldraw: '3847', studs: [1, 2], plates: 10, category: '人物', glyph: 'slope' },
  { type: 'shield', label: '盾', name: '盾', footprint: '2×1', ldraw: '3846', studs: [2, 1], plates: 6, category: '人物', glyph: 'studs' },
  { type: 'cup', label: '杯子', name: '杯子', footprint: '1×2', ldraw: '3899', studs: [1, 2], plates: 3, category: '物件', glyph: 'round' },
  { type: 'flag', label: '旗', name: '旗', footprint: '1×3', ldraw: '2335', studs: [1, 3], plates: 5, category: '物件', glyph: 'tile' },
  { type: 'antenna', label: '天线', name: '天线', footprint: '1×1', ldraw: '3957a', studs: [1, 1], plates: 12, category: '物件', glyph: 'cone' },
  { type: 'dish', label: '碟', name: '碟', footprint: '4×4', ldraw: '3960', studs: [4, 4], plates: 3, category: '物件', glyph: 'round' },
  { type: 'propeller', label: '螺旋桨', name: '螺旋桨', footprint: '3×1', ldraw: '6041', studs: [3, 1], plates: 7, category: '物件', glyph: 'cone' },
]

const PART_BY_TYPE = new Map(BRICK_PARTS.map((item) => [item.type, item]))

export const BRICK_CATEGORIES = ['基础积木', '斜面', '曲面', '房子', '车辆', '自然', '人物', '物件'] as const

export function categoriesInUse() {
  const present = new Set(BRICK_PARTS.map((item) => item.category))
  return BRICK_CATEGORIES.filter((category) => present.has(category))
}

export function partInfo(type: BrickType) {
  const found = PART_BY_TYPE.get(type)
  if (!found) throw new Error(`未知零件 ${type}`)
  return found
}

export function partPlates(type: BrickType) {
  return partInfo(type).plates
}

export function partHeight(type: BrickType) {
  return partInfo(type).plates / 3
}

export function initialPartColor(type: BrickType) {
  if (type === '2x4') return '#F5C518'
  if (type === '1x2') return '#2F6FED'
  return '#E23D3D'
}

const ROTATIONS: BrickRotation[] = [0, 90, 180, 270]

let fallbackSerial = 0

export function createBrickId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {
    // 非安全上下文没有 randomUUID。
  }
  fallbackSerial += 1
  return `brick-${Date.now()}-${fallbackSerial}`
}

export function cycleBrickColor(current: string, direction: 1 | -1) {
  const index = BRICK_COLORS.findIndex((color) => color.toLowerCase() === current.toLowerCase())
  const start = index >= 0 ? index : 0
  const next = (start + direction + BRICK_COLORS.length) % BRICK_COLORS.length
  return BRICK_COLORS[next] ?? BRICK_COLORS[0]
}

export function localSize(type: BrickType): [number, number, number] {
  const info = partInfo(type)
  return [info.studs[0], info.plates / 3, info.studs[1]]
}

export function footprint(type: BrickType, rotation: BrickRotation) {
  const [width, depth] = partInfo(type).studs
  const turned = rotation === 90 || rotation === 270
  return turned ? { width: depth, depth: width } : { width, depth }
}

export function snapAxis(value: number, size: number) {
  if (size % 2 === 0) return Math.round(value)
  return Math.round(value - 0.5) + 0.5
}

export function snapPosition(x: number, z: number, type: BrickType, rotation: BrickRotation): [number, number] {
  const { width, depth } = footprint(type, rotation)
  return [snapAxis(x, width), snapAxis(z, depth)]
}

// 底面落在板层网格上。整砖高 1，所以旧草稿的 y=0.5、1.5、2.5 会原样回来。
export function normalizeBrickY(y: number, type: BrickType) {
  if (!Number.isFinite(y)) return null
  const height = partHeight(type)
  const steps = Math.round((y - height / 2) * 3)
  return Math.max(0, steps) / 3 + height / 2
}

export function plateIndex(y: number, type: BrickType) {
  const height = partHeight(type)
  return Math.max(0, Math.round((y - height / 2) * 3))
}

export function centerForPlates(basePlates: number, type: BrickType) {
  const steps = Math.max(0, Math.floor(basePlates))
  return steps / 3 + partHeight(type) / 2
}

function axisCells(center: number, size: number) {
  const start = size % 2 === 0 ? Math.round(center) - size / 2 : Math.round(center - 0.5) - (size - 1) / 2
  const cells: number[] = []
  for (let index = 0; index < size; index += 1) cells.push(start + index)
  return cells
}

export function occupancyKeys(brick: Pick<Brick, 'type' | 'rotation' | 'position'>) {
  const { width, depth } = footprint(brick.type, brick.rotation)
  const [x, y, z] = brick.position
  const start = plateIndex(y, brick.type)
  const layers = partPlates(brick.type)
  const keys: string[] = []
  for (let layer = 0; layer < layers; layer += 1) {
    for (const gx of axisCells(x, width)) {
      for (const gz of axisCells(z, depth)) keys.push(`${gx},${start + layer},${gz}`)
    }
  }
  return keys
}

export function hasOverlap(bricks: readonly Brick[], candidate: Pick<Brick, 'id' | 'type' | 'rotation' | 'position'>) {
  const occupied = new Set<string>()
  for (const brick of bricks) {
    if (brick.id === candidate.id) continue
    for (const key of occupancyKeys(brick)) occupied.add(key)
  }
  return occupancyKeys(candidate).some((key) => occupied.has(key))
}

export function rotateBrick(brick: Brick): Brick {
  const index = ROTATIONS.indexOf(brick.rotation)
  const rotation = ROTATIONS[(index + 1) % ROTATIONS.length] ?? 90
  const [x, y, z] = brick.position
  const [sx, sz] = snapPosition(x, z, brick.type, rotation)
  return { ...brick, rotation, position: [sx, y, sz] }
}
