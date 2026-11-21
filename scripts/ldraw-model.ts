// LDraw 模型（.ldr / .mpd）解析与展开。
//
// 矩阵约定与渲染端、scripts/ldraw-geom.ts 一致：行向量，(a,b,c)、(d,e,f)、(g,h,i) 是三行，
// p' = p·M，也就是 x' = a·x + b·y + c·z + tx。
//
// MPD 的结构：文件用 `0 FILE <名字>` 切成若干段，每段里的 `1` 行是这一段的摆放指令。
// 段与段之间互不继承变换，引用别的 MPD 段时按普通零件处理（复合矩阵）。
import { readFileSync } from 'node:fs'

import { compose, resolve, type Xform } from './ldraw-geom.ts'

export type ModelItem = {
  /** 零件文件名（相对 LDraw 库根，如 3005.dat / p/48/3005.dat）。 */
  file: string
  /** 摆放矩阵（行向量约定）。 */
  xform: Xform
  /** LDraw 颜色码。 */
  color: number
}

export type MpdSegment = {
  name: string
  items: ModelItem[]
}

/** 解析一行 `1 <color> x y z a b c d e f g h i <file>`。 */
export function parseItem(line: string): ModelItem | null {
  const tokens = line.trim().split(/\s+/)
  if (tokens[0] !== '1') return null
  const nums = tokens.slice(2, 14).map(Number)
  if (nums.length < 12 || nums.some((value) => !Number.isFinite(value))) return null
  const [x, y, z, a, b, c, d, e, f, g, h, i] = nums
  const file = tokens.slice(14).join(' ').trim()
  if (!file) return null
  return {
    file,
    color: Number(tokens[1]) || 16,
    xform: { a, b, c, x, d, e, f, y, g, h, i, z },
  }
}

const MDP_CACHE = new Map<string, MpdSegment[]>()

/**
 * 读一个 LDraw 文件，按 `0 FILE` 切成 MPD 段。
 * 不是 MPD 的普通 .dat 返回单段，段名用文件名。
 */
export function readMpd(file: string): MpdSegment[] {
  const key = file.toLowerCase()
  const cached = MDP_CACHE.get(key)
  if (cached) return cached
  const path = resolve(file)
  if (!path) return []
  const text = readFileSync(path, 'utf8')
  const segments: MpdSegment[] = []
  let current: MpdSegment = { name: file, items: [] }
  let sawFileHeader = false

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('0')) {
      const header = /^0\s+FILE\s+(.+)$/i.exec(line)
      if (header) {
        if (sawFileHeader) segments.push(current)
        current = { name: header[1].trim(), items: [] }
        sawFileHeader = true
      }
      continue
    }
    const item = parseItem(line)
    if (item) current.items.push(item)
  }
  segments.push(current)
  MDP_CACHE.set(key, segments)
  return segments
}

/** 是不是子模型（MPD / LDR）而不是零件。 */
function isModelFile(file: string) {
  return /\.(mpd|ldr)$/i.test(file)
}

function baseName(file: string) {
  return file.split(/[/\\]/).pop() ?? file
}

/**
 * 展开一个 MPD 段里的摆放指令。
 *
 * 零件（.dat）到这里就停：LDraw 的 .dat 里还有一层 s/xxx-1.dat 的细节件，
 * 那是给渲染器省体积用的几何细分，展开它会把一个砖拆成几十个几何片，
 * 零件数、审计、目录全都跟着失真。
 */
function expandSegment(segment: MpdSegment, depth: number): ModelItem[] {
  const out: ModelItem[] = []
  for (const item of segment.items) {
    if (!resolve(item.file)) continue
    if (!isModelFile(item.file)) {
      out.push(item)
      continue
    }
    if (depth > 10) continue
    const sub = readMpd(item.file)
    if (sub.length === 0) continue
    const base = baseName(item.file).toLowerCase()
    const picked = sub.find((one) => one.name.toLowerCase() === base) ?? sub[0]
    for (const leaf of expandSegment(picked, depth + 1)) {
      out.push({
        ...leaf,
        xform: compose(item.xform, leaf.xform),
        color: leaf.color === 16 ? item.color : leaf.color,
      })
    }
  }
  return out
}

/**
 * 递归展开模型，得到所有零件实例的最终矩阵。
 *
 * 复合规则：父矩阵乘在子矩阵前面（行向量约定下 p·父·子）。
 * MPD 段的引用按「同名段优先、否则取第一段」处理：
 * OMR 的模型常用 `1 16 ... 3001.dat` 直接引零件，也用 `1 16 ... sub.mpd` 引子模型。
 */
export function expandModel(file: string, depth = 0): ModelItem[] {
  const segments = readMpd(file)
  const out: ModelItem[] = []
  for (const segment of segments) {
    for (const leaf of expandSegment(segment, depth)) {
      out.push(leaf)
    }
  }
  return out
}

/** LDraw 颜色码 → MatuPix 八色调色板。 */
const COLOR_MAP: Record<number, string> = {
  0: '#05131D',
  1: '#2F6FED',
  2: '#2EAD4B',
  3: '#05131D',
  4: '#E23D3D',
  5: '#FFFFFF',
  6: '#05131D',
  7: '#FFFFFF',
  8: '#FE8A18',
  9: '#F5C518',
  10: '#F5C518',
  11: '#81007B',
  12: '#81007B',
  13: '#2F6FED',
  14: '#F5C518',
  15: '#FFFFFF',
  16: '#E23D3D',
  17: '#FE8A18',
  18: '#E23D3D',
  19: '#2EAD4B',
  20: '#2EAD4B',
  21: '#2EAD4B',
  22: '#81007B',
  23: '#81007B',
  24: '#E23D3D',
  25: '#FE8A18',
  26: '#81007B',
  27: '#81007B',
  28: '#FE8A18',
  71: '#FFFFFF',
  72: '#05131D',
  110: '#05131D',
  191: '#F5C518',
  194: '#D8DEE6',
}

export function mapColor(code: number) {
  return COLOR_MAP[code] ?? '#E23D3D'
}
