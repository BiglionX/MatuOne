// LDraw 官方模型库（OMR）的选型与展开。
//
// 生成器（build-magic-models.ts）和审计脚本（audit-magic-models.ts）共用这一份解析，
// 审计才能拿「官方模型」当基准，而不是拿生成器自己的产物当基准。
//
// 模型来源：.ldraw-src/models/*.mpd|.ldr
//   头部带 `0 !LICENSE Redistributable under CCAL version 2.0`（CC BY 2.0，需署名）。
// 零件来源：.ldraw-src/lib/ldraw/{parts,p} 官方零件库（CC BY 4.0）。
//
// LDraw 行格式：`1 <color> x y z a b c d e f g h i <file>`
//   - 行尾的文件名可以带空格，token[14..] 整体才是文件名。
//   - 颜色码 0 = Main Colour、16 = Current Colour，两者都表示「跟随父级/主色」。
//   - 矩阵是行向量约定：x' = a·x + b·y + c·z + tx，和渲染端一致。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { compose, resolve, type Xform } from './ldraw-geom.ts'

export const LIB = '.ldraw-src/lib/ldraw'
export const MODEL_DIR = '.ldraw-src/models'

export type ModelSource = {
  id: string
  name: string
  size: 'small' | 'large'
  tint: string
  /** OMR 模型文件名（.ldraw-src/models 下，不带扩展名）。 */
  file: string
  /**
   * 官方套装名，用于署名。
   *
   * 取自 OMR 官方索引（library.ldraw.org 的 omr-index.json）里的套装标题，
   * 写全套装号和套装名；一个套装有多个变体文件时补上变体名。
   * 署名要写清「这是什么作品」，文件名（7613 - Main.ldr）不算作品名。
   */
  label: string
}

/**
 * 30 个官方模型的选型。
 *
 * 规模都控制在 40–600 件：魔法模型是对话里直接摆进场景的，
 * 上千件的模型加载慢、审计慢，弹窗里也看不清结构。
 *
 * 尺寸控制在 46 钉以内：魔法模型摆在 48×48 钉的底板上，
 * 超出去的零件会悬在板子外面，看着就像没摆稳。
 *
 * 套装名以 OMR 官方索引（omr-index.json）为准，中文名必须对得上模型内容：
 * 6102 “Castle Mini Figures” 只是一排人偶、3314 “Stadium Security” 只是两辆卡车，
 * 这种名字对不上的模型要么换掉，要么把中文名改成模型真正的样子。
 */
export const MODEL_SOURCES: ModelSource[] = [
  { id: 'f1', name: 'F1赛车', size: 'small', tint: '#E23D3D', file: '7613-1', label: '7613-1 Track Racer' },
  {
    id: 'fire-engine',
    name: '消防车',
    size: 'small',
    tint: '#E23D3D',
    file: '6911-1_Ladder-Truck',
    label: '6911-1 Mini Fire Rescue (Ladder Truck)',
  },
  {
    id: 'plane',
    name: '飞机',
    size: 'small',
    tint: '#2F6FED',
    file: '5762-1_Plane',
    label: '5762-1 Mini Plane (Plane)',
  },
  { id: 'rocket', name: '穿梭机', size: 'small', tint: '#E23D3D', file: '6842-1', label: '6842-1 Shuttle Craft' },
  { id: 'castle', name: '城堡', size: 'small', tint: '#F5C518', file: '6035-1', label: '6035-1 Castle Guard' },
  { id: 'house', name: '房子', size: 'small', tint: '#FE8A18', file: '7796-1', label: '7796-1 House' },
  { id: 'robot', name: '机器人', size: 'small', tint: '#2F6FED', file: '7910-1', label: '7910-1 Robot' },
  {
    id: 'heli',
    name: '直升机',
    size: 'small',
    tint: '#F5C518',
    file: '5864-1_Helicopter',
    label: '5864-1 Mini Helicopter (Helicopter)',
  },
  { id: 'tree', name: '圣诞树', size: 'small', tint: '#2EAD4B', file: '561412-1', label: '561412-1 Christmas Tree' },
  { id: 'train', name: '蒸汽火车', size: 'small', tint: '#2EAD4B', file: '126-1', label: '126-1 Steam Locomotive (Push)' },
  { id: 'crane', name: '起重机', size: 'small', tint: '#F5C518', file: '689-1', label: '689-1 Mobile Crane' },
  {
    id: 'boat',
    name: '帆船',
    size: 'small',
    tint: '#2F6FED',
    file: '31028-1_Sailboat',
    label: '31028-1 Sea Plane (Sailboat)',
  },
  { id: 'tractor', name: '拖拉机', size: 'small', tint: '#2EAD4B', file: '6504-1', label: '6504-1 Tractor' },
  { id: 'lighthouse', name: '灯塔', size: 'small', tint: '#FBDEDF', file: '30023-1', label: '30023-1 Lighthouse' },
  { id: 'dino', name: '恐龙', size: 'small', tint: '#2EAD4B', file: '7219-1', label: '7219-1 Dinosaur' },
  {
    id: 'village',
    name: '砖月镇公所',
    size: 'large',
    tint: '#2EAD4B',
    file: '40183-1',
    label: '40183-1 Bricktober Town Hall',
  },
  { id: 'race', name: '雷霆赛道', size: 'large', tint: '#E23D3D', file: '8125-1', label: '8125-1 Thunder Raceway' },
  {
    id: 'site',
    name: '工地推土机',
    size: 'large',
    tint: '#FE8A18',
    file: '8259-1_Excavator',
    label: '8259-1 Mini Bulldozer (Excavator)',
  },
  {
    id: 'port',
    name: '拖船',
    size: 'large',
    tint: '#2F6FED',
    file: '8151-1_Combination-with-8148',
    label: '8151-1 Adrift Sport (Combination with 8148)',
  },
  {
    id: 'station',
    name: '砖月火车站',
    size: 'large',
    tint: '#FE8A18',
    file: '40142-1',
    label: '40142-1 Bricktober Train Station',
  },
  { id: 'dino-park', name: '游乐园', size: 'large', tint: '#2EAD4B', file: '3676-1', label: "3676-1 Catherine Cat's Fun Park" },
  { id: 'farm', name: '农场拖车', size: 'large', tint: '#F5C518', file: '6692-1', label: '6692-1 Tractor Trailer' },
  { id: 'airport', name: '机场', size: 'large', tint: '#D8DEE6', file: '40199-1', label: '40199-1 Billund Airport' },
  {
    id: 'fire-station',
    name: '砖月消防站',
    size: 'large',
    tint: '#E23D3D',
    file: '40182-1',
    label: '40182-1 Bricktober Fire Station',
  },
  {
    id: 'space',
    name: '太空隔离基地',
    size: 'large',
    tint: '#81007B',
    file: '6955-1',
    label: '6955-1 Space Lock-Up Isolation Base',
  },
  { id: 'big-castle', name: '骑士城堡', size: 'large', tint: '#F5C518', file: '6073-1', label: "6073-1 Knight's Castle" },
  { id: 'stadium', name: '法拉利赛车', size: 'large', tint: '#E23D3D', file: '8123-1', label: '8123-1 Ferrari F1 Racers' },
  { id: 'sport', name: '跑车', size: 'large', tint: '#E23D3D', file: '8148-1', label: '8148-1 EZ-Roadster' },
  { id: 'eiffel', name: '埃菲尔铁塔', size: 'large', tint: '#D8DEE6', file: '21019-1', label: '21019-1 The Eiffel Tower' },
  { id: 'skyscraper', name: '西尔斯大厦', size: 'large', tint: '#D8DEE6', file: '21000-1', label: '21000-1 Sears Tower' },
]

export type OmrItem = {
  /** 官方库里的零件引用（相对库根）。 */
  file: string
  /** 摆放矩阵：R（旋转）+ T（平移）。 */
  xform: Xform
  /** LDraw 颜色码。 */
  color: number
}

/** 段名 / 引用名的精确键（保留编号前缀）。 */
export function exactKey(name: string) {
  return name
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .pop()!
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** 宽松键：去掉 OMR 的编号前缀（10001 - TRAIN 1.LDR → train 1.ldr）。 */
export function looseKey(name: string) {
  return exactKey(name).replace(/^\d+\s*-\s*/, '')
}

/** LDraw 行尾的文件名可以带空格，token[14..] 整体才是文件名。 */
export function refName(tokens: string[]) {
  return tokens.slice(14).join(' ').trim()
}

export function isModelFile(file: string) {
  return /\.(mpd|ldr)$/i.test(file)
}

type Segment = { name: string; items: OmrItem[] }

/** 模型文件解析缓存。 */
const SEGMENT_CACHE = new Map<string, Segment[]>()

/** OMR 模型文件按 set 号索引（扩展名有 .mpd 和 .ldr 两种）。 */
const MODEL_INDEX = new Map<string, string>()

export function indexModels() {
  if (!existsSync(MODEL_DIR)) return
  for (const entry of readdirSync(MODEL_DIR)) {
    if (!/\.(mpd|ldr)$/i.test(entry)) continue
    const key = entry.replace(/\.(mpd|ldr)$/i, '').toLowerCase()
    if (!MODEL_INDEX.has(key)) MODEL_INDEX.set(key, join(MODEL_DIR, entry))
  }
}

/** 找模型或零件的真实路径。 */
export function resolveFile(file: string) {
  const direct = MODEL_INDEX.get(file.toLowerCase())
  if (direct) return direct
  const withoutExt = file.replace(/\.(mpd|ldr)$/i, '')
  const model = MODEL_INDEX.get(withoutExt.toLowerCase())
  if (model) return model
  return resolve(file)
}

/**
 * 官方库里的零件文件 → 库根相对路径（parts/6157.dat、p/48/xxx.dat）。
 *
 * 生成器和审计脚本必须用同一个映射：审计要回答的正是
 * 「public/ldraw 下有没有这个文件」，映射两处各写一份就会漂移。
 */
export function libraryPath(file: string) {
  const path = resolve(file)
  if (!path) return null
  const normalized = path.replace(/\\/g, '/')
  const marker = '/ldraw/'
  const index = normalized.lastIndexOf(marker)
  if (index < 0) return null
  return normalized.slice(index + marker.length)
}

export function readSegments(file: string): Segment[] {
  const path = resolveFile(file)
  if (!path) return []
  const cached = SEGMENT_CACHE.get(path)
  if (cached) return cached
  const text = readFileSync(path, 'utf8')
  const segments: Segment[] = []
  // 第一个 `0 FILE` 头之前的内容不算一段（不要 push 空占位段，
  // 否则主段会取到空段，展开后一个零件都没有）。
  let current: Segment | null = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('0')) {
      const header = /^0\s+FILE\s+(.+)$/i.exec(line)
      if (header) {
        if (current) segments.push(current)
        current = { name: header[1].trim(), items: [] }
      }
      continue
    }
    if (!line.startsWith('1 ')) continue
    const tokens = line.split(/\s+/)
    if (tokens[0] !== '1') continue
    const nums = tokens.slice(2, 14).map(Number)
    if (nums.length < 12 || nums.some((value) => !Number.isFinite(value))) continue
    const [x, y, z, a, b, c, d, e, f, g, h, i] = nums
    const ref = refName(tokens)
    if (!ref) continue
    if (!current) current = { name: file, items: [] }
    const code = Number(tokens[1])
    current.items.push({
      file: ref,
      color: Number.isFinite(code) ? code : 16,
      xform: { a, b, c, x, d, e, f, y, g, h, i, z },
    })
  }
  if (current) segments.push(current)
  SEGMENT_CACHE.set(path, segments)
  return segments
}

/** 展开过程中找不到的零件引用。 */
export const missingFiles = new Set<string>()

/**
 * 展开一个模型文件的摆放指令，零件整体保留。
 *
 * 根段 = 没有被其它段引用的段。主段引用子段时（常见）只有主段是根；
 * 主段不引用子段时（LDCad 扁平模型，比如 21019 埃菲尔铁塔）所有段都是根，
 * 必须全展开，否则只剩 16 个零件。
 */
export function expandFile(file: string, depth = 0, inherited = 16): OmrItem[] {
  const segments = readSegments(file)
  if (segments.length === 0) return []
  // 内嵌段只能在当前文件里找，不能全局找：不同模型的段名（如 1.ldr）会重名。
  const local = new Map<string, Segment>()
  for (const segment of segments) {
    local.set(exactKey(segment.name), segment)
    const loose = looseKey(segment.name)
    if (!local.has(loose)) local.set(loose, segment)
  }
  const referenced = new Set<string>()
  for (const segment of segments) {
    for (const item of segment.items) {
      referenced.add(exactKey(item.file))
      referenced.add(looseKey(item.file))
    }
  }
  const roots = segments.filter(
    (segment) => !referenced.has(exactKey(segment.name)) && !referenced.has(looseKey(segment.name)),
  )
  const picked = roots.length > 0 ? roots : [segments[0]]
  const out: OmrItem[] = []
  for (const segment of picked) out.push(...expandItems(segment.items, depth, local, inherited))
  return out
}

/**
 * 展开摆放指令。
 *
 * 颜色码：0 = Main Colour、16 = Current Colour，两者都是「跟随父级/主色」，
 * 其余色码是具体颜色。OMR 的模型大量使用 `1 0 ...` 写法表示「用主色」。
 */
export function expandItems(
  items: OmrItem[],
  depth: number,
  local: Map<string, Segment>,
  inherited: number,
): OmrItem[] {
  const out: OmrItem[] = []
  for (const item of items) {
    if (depth > 12) continue
    const effective = item.color === 0 || item.color === 16 ? inherited : item.color
    const diskPath = resolve(item.file)
    if (diskPath) {
      if (isModelFile(item.file)) {
        for (const leaf of expandFile(item.file, depth + 1, effective)) {
          out.push({ ...leaf, xform: compose(item.xform, leaf.xform) })
        }
        continue
      }
      out.push({ ...item, color: effective })
      continue
    }
    const embedded = local.get(exactKey(item.file)) ?? local.get(looseKey(item.file))
    if (embedded) {
      for (const leaf of expandItems(embedded.items, depth + 1, local, effective)) {
        out.push({ ...leaf, xform: compose(item.xform, leaf.xform) })
      }
      continue
    }
    missingFiles.add(item.file)
  }
  return out
}

/** 展开一个官方模型，取它的全部零件实例。 */
export function expandOfficial(file: string) {
  return expandFile(file)
}
