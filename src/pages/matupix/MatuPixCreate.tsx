import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { encodeGif } from './encodeGif'
import { FrameBar } from './FrameBar'
import { floodFill } from './floodFill'
import { LayerBar } from './LayerBar'
import { COLORS, Palette, swatchClass } from './Palette'
import { CANVAS_SIZES, paintLayers, PixelCanvas, type CanvasSize, type PixelGrid, type PixelLayer } from './PixelCanvas'
import { PhotoToPixel } from './PhotoToPixel'
import { PixelFaq, PixelInspiration, TemplateChoices } from './PixelInspiration'
import { PixelFooter } from './PixelFooter'
import { PixelGuide } from './PixelGuide'
import { TEMPLATES } from './templates'
import { CanvasSizeSelect, DrawToolControls, EraserButton, HistoryControls, ZoomControls, type DrawTool } from './Toolbar'

const DRAFT_KEY = 'matupix.draft.v1'
// 键名是历史遗留，实际版本看对象里的 version 字段。
const GRID_KEY = 'matupix.grid.v1'
const TEMPLATE_KEY = 'matupix.template.v1'
const EMPTY_HINT_MS = 2000
const PLAYBACK_MS = 500
const HEX_COLOR = /^#[0-9a-f]{6}$/i
const ZOOM_LEVELS = [1.5, 2, 3, 4, 6, 8] as const

type ZoomLevel = (typeof ZOOM_LEVELS)[number]

type Frame = { layers: PixelLayer[] }

// 图层数组下标 0 在最下面，最后一项在最上面。帧下标 0 是第一帧。
type LayerDocument = {
  width: CanvasSize
  height: CanvasSize
  frames: Frame[]
  activeFrame: number
  activeLayer: number
  templateId: string | null
}

function createEmptyGrid(size: CanvasSize): PixelGrid {
  return Array.from({ length: size }, () => Array<string | null>(size).fill(null))
}

let layerSerial = 0

function createLayerId() {
  layerSerial += 1
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {
    // 非安全上下文没有 randomUUID。
  }
  return `layer-${Date.now()}-${layerSerial}`
}

function createLayer(size: CanvasSize, name: string): PixelLayer {
  return { id: createLayerId(), name, visible: true, opacity: 1, pixels: createEmptyGrid(size) }
}

function emptyDocument(): LayerDocument {
  return {
    width: 32,
    height: 32,
    frames: [{ layers: [{ id: 'layer-0', name: '图层 1', visible: true, opacity: 1, pixels: createEmptyGrid(32) }] }],
    activeFrame: 0,
    activeLayer: 0,
    templateId: null,
  }
}

function cloneLayer(layer: PixelLayer): PixelLayer {
  return {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    opacity: layer.opacity,
    pixels: layer.pixels.map((row) => row.slice()),
  }
}

function cloneFrame(frame: Frame): Frame {
  return { layers: frame.layers.map((layer) => cloneLayer(layer)) }
}

function cloneFrames(frames: readonly Frame[]) {
  return frames.map((frame) => cloneFrame(frame))
}

function cloneDocument(document: LayerDocument): LayerDocument {
  return {
    width: document.width,
    height: document.height,
    frames: cloneFrames(document.frames),
    activeFrame: document.activeFrame,
    activeLayer: document.activeLayer,
    templateId: document.templateId,
  }
}

function cloneFramesKeepingNames(source: readonly Frame[], current: readonly Frame[]) {
  const names = new Map<string, string>()
  for (const frame of current) {
    for (const layer of frame.layers) names.set(layer.id, layer.name)
  }
  return source.map((frame) => ({
    layers: frame.layers.map((layer) => {
      const clone = cloneLayer(layer)
      const name = names.get(layer.id)
      if (name !== undefined) clone.name = name
      return clone
    }),
  }))
}

function gridHasInk(grid: PixelGrid) {
  return grid.some((row) => row.some((cell) => cell !== null))
}

function frameHasInk(frame: Frame) {
  return frame.layers.some((layer) => gridHasInk(layer.pixels))
}

function documentHasInk(frames: readonly Frame[]) {
  return frames.some((frame) => frameHasInk(frame))
}

function readTemplateId(draft: LayerDocument | null) {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY)
    if (!raw) return null
    let id: string | null = null
    try {
      const data: unknown = JSON.parse(raw)
      if (isRecord(data) && typeof data.id === 'string') id = data.id
    } catch {
      id = null
    }
    const known = id !== null && TEMPLATES.some((item) => item.id === id)
    const sizeOk = draft !== null && isCanvasSize(draft.width) && draft.height === draft.width
    if (known && sizeOk) return id
    localStorage.removeItem(TEMPLATE_KEY)
    return null
  } catch {
    return null
  }
}

function writeTemplateId(id: string | null) {
  if (!id) {
    localStorage.removeItem(TEMPLATE_KEY)
    return
  }
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify({ id }))
}

function sameColor(a: string | null, b: string | null) {
  if (a === null || b === null) return false
  return a.toUpperCase() === b.toUpperCase()
}

function visibleCell(layers: readonly PixelLayer[], x: number, y: number) {
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index]
    if (!layer || layer.visible === false) continue
    const cell = layer.pixels[y]?.[x]
    if (cell) return cell
  }
  return null
}

function scaleTemplate(source: PixelGrid, size: number): PixelGrid {
  const sourceSize = source[0]?.length ?? 0
  const grid: PixelGrid = []
  for (let y = 0; y < size; y += 1) {
    const sy = Math.floor((y * sourceSize) / size)
    const sourceRow = source[sy] ?? []
    const row: (string | null)[] = []
    for (let x = 0; x < size; x += 1) {
      const sx = Math.floor((x * sourceSize) / size)
      row.push(sourceRow[sx] ?? null)
    }
    grid.push(row)
  }
  return grid
}

function legalCanvasSize(width: number, height: number): CanvasSize {
  if (isCanvasSize(width) && width === height) return width
  return 32
}

function buildGuide(pixels: PixelGrid) {
  const legend: { number: number; hex: string }[] = []
  const byHex = new Map<string, number>()
  let total = 0
  const numbers = pixels.map((row) =>
    row.map((cell) => {
      if (!cell) return null
      total += 1
      const hex = cell.toUpperCase()
      const existing = byHex.get(hex)
      if (existing) return existing
      const number = byHex.size + 1
      byHex.set(hex, number)
      legend.push({ number, hex })
      return number
    }),
  )
  return { legend, numbers, total }
}

function sessionView(layers: readonly PixelLayer[], target: PixelGrid, numbers: (number | null)[][]) {
  const shown: (number | null)[][] = []
  const wrong: boolean[][] = []
  let done = 0
  for (let y = 0; y < target.length; y += 1) {
    const targetRow = target[y] ?? []
    const numberRow = numbers[y] ?? []
    const shownRow: (number | null)[] = []
    const wrongRow: boolean[] = []
    for (let x = 0; x < targetRow.length; x += 1) {
      const goal = targetRow[x] ?? null
      const user = visibleCell(layers, x, y)
      if (goal && sameColor(user, goal)) done += 1
      const painted = user !== null
      wrongRow.push(painted && !sameColor(user, goal))
      shownRow.push(painted ? null : (numberRow[x] ?? null))
    }
    shown.push(shownRow)
    wrong.push(wrongRow)
  }
  return { shown, wrong, done }
}

function trimHistory(stack: LayerDocument[], maxSteps: number) {
  if (stack.length <= maxSteps) return stack
  return stack.slice(stack.length - maxSteps)
}

// 用写入后的文档算一次。totalCells 为 0 时按 10，避免再被固定 50 步截断。
function maxHistorySteps(document: LayerDocument) {
  const frameCount = document.frames.length
  if (frameCount === 0) return 10
  const layerSum = document.frames.reduce((sum, frame) => sum + frame.layers.length, 0)
  const averageLayers = Math.max(1, layerSum / frameCount)
  const totalCells = document.width * document.height * frameCount * averageLayers
  if (totalCells === 0) return 10
  return Math.max(10, Math.floor(500000 / totalCells))
}

function isCanvasSize(value: unknown): value is CanvasSize {
  return CANVAS_SIZES.some((size) => size === value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function readIndex(value: unknown, length: number) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value >= length) return 0
  return value
}

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0
  if (index < 0) return 0
  if (index >= length) return length - 1
  return index
}

function nonEmptyText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function readOpacity(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function sameOpacity(a: number, b: number) {
  return Math.round(a * 100) === Math.round(b * 100)
}

function nextLayerName(layers: readonly PixelLayer[]) {
  let max = 0
  let found = false
  for (const layer of layers) {
    const match = /^图层\s*(\d+)$/.exec(layer.name.trim())
    if (!match) continue
    const value = Number(match[1])
    if (!Number.isInteger(value)) continue
    found = true
    if (value > max) max = value
  }
  if (!found) return `图层 ${layers.length + 1}`
  return `图层 ${max + 1}`
}

function draftKeyExists() {
  try {
    return localStorage.getItem(DRAFT_KEY) !== null
  } catch {
    return false
  }
}

function cellFromDraft(cell: unknown) {
  if (cell === null) return null
  if (typeof cell === 'string' && HEX_COLOR.test(cell)) return cell
  return null
}

function readLayerPixels(value: unknown, width: number, height: number): PixelGrid | null {
  if (!Array.isArray(value) || value.length !== height) return null
  const grid: PixelGrid = []
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== width) return null
    grid.push(row.map((cell) => cellFromDraft(cell)))
  }
  return grid
}

function readStoredLayer(value: unknown, size: number, index: number): PixelLayer | null {
  if (!isRecord(value)) return null
  const pixels = readLayerPixels(value.pixels, size, size)
  if (!pixels) return null
  return {
    id: nonEmptyText(value.id, `layer-${index}`),
    name: nonEmptyText(value.name, `图层 ${index + 1}`),
    visible: typeof value.visible === 'boolean' ? value.visible : true,
    opacity: readOpacity(value.opacity),
    pixels,
  }
}

function readStoredFrames(value: unknown, size: number): Frame[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const frames: Frame[] = []
  for (const entry of value) {
    if (!isRecord(entry) || !Array.isArray(entry.layers) || entry.layers.length === 0) return null
    const layers: PixelLayer[] = []
    for (let index = 0; index < entry.layers.length; index += 1) {
      const layer = readStoredLayer(entry.layers[index], size, index)
      if (!layer) return null
      layers.push(layer)
    }
    frames.push({ layers })
  }
  return frames
}

function saveDraft(input: LayerDocument) {
  localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      version: 2,
      width: input.width,
      height: input.height,
      frames: input.frames,
      activeFrame: input.activeFrame,
      activeLayer: input.activeLayer,
      updatedAt: new Date().toISOString(),
    }),
  )
}

function readDraft(): LayerDocument | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    if (!isRecord(data)) return null
    if (data.version === 1) {
      if (data.width !== 16 || data.height !== 16) return null
      const pixels = readLayerPixels(data.pixels, 16, 16)
      if (!pixels) return null
      const loaded: LayerDocument = {
        width: 16,
        height: 16,
        frames: [{ layers: [{ id: 'layer-0', name: '图层 1', visible: true, opacity: 1, pixels }] }],
        activeFrame: 0,
        activeLayer: 0,
        templateId: null,
      }
      try {
        saveDraft(loaded)
      } catch {
        // 写失败只留内存。
      }
      return loaded
    }
    if (data.version !== 2) return null
    if (!isCanvasSize(data.width) || data.width !== data.height) return null
    const size = data.width
    const frames = readStoredFrames(data.frames, size)
    if (!frames) return null
    const activeFrame = frames.length === 1 ? 0 : readIndex(data.activeFrame, frames.length)
    const activeLayers = frames[activeFrame]?.layers ?? []
    return {
      width: size,
      height: size,
      frames,
      activeFrame,
      activeLayer: readIndex(data.activeLayer, activeLayers.length),
      templateId: null,
    }
  } catch {
    return null
  }
}

function readShowGrid() {
  try {
    return localStorage.getItem(GRID_KEY) !== 'off'
  } catch {
    return true
  }
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true
  return target instanceof HTMLElement && target.isContentEditable
}

function maxPanFor(factor: number, edge: number) {
  if (factor <= 1) return 0
  return Math.max(0, (edge * factor - edge) / 2)
}

function clampNumber(value: number, limit: number) {
  return Math.min(limit, Math.max(-limit, value))
}

function nextZoomLevel(zoom: ZoomLevel | 'fit', direction: 1 | -1): ZoomLevel | 'fit' | null {
  if (zoom === 'fit') return direction > 0 ? ZOOM_LEVELS[0] : null
  const index = ZOOM_LEVELS.indexOf(zoom)
  if (index < 0) return null
  if (direction < 0 && index === 0) return 'fit'
  return ZOOM_LEVELS[index + direction] ?? null
}

function downloadGif(frames: readonly { layers: readonly PixelLayer[] }[], size: CanvasSize) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return
  const rasters: Uint8ClampedArray[] = []
  for (const frame of frames) {
    paintLayers(ctx, frame.layers, size)
    rasters.push(new Uint8ClampedArray(ctx.getImageData(0, 0, size, size).data))
  }
  const bytes = encodeGif(size, size, rasters, 50)
  const blob = new Blob([bytes], { type: 'image/gif' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'matupix-动画.gif'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function downloadPng(layers: readonly PixelLayer[], width: CanvasSize, height: CanvasSize) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  paintLayers(ctx, layers, width)
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `matupix-${width}x${height}.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}

function toolButtonClass(selected: boolean) {
  return `inline-flex h-9 min-h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border-2 bg-white px-2 text-base font-extrabold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
    selected ? 'border-slate-800' : 'border-slate-200 hover:border-slate-300'
  }`
}

const colorAction =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 text-base font-extrabold tracking-[0.2px] text-white shadow-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

const quietButton =
  'inline-flex h-8 min-h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-slate-50 px-2 text-sm font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2'

const menuButton =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white shadow-[0_3px_0_0_var(--tw-shadow-color)] shadow-slate-300 transition-[transform,box-shadow] duration-100 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:translate-y-0.5 active:shadow-[0_1px_0_0_var(--tw-shadow-color)] sm:h-11 sm:w-11 sm:rounded-2xl'

const menuLangButton =
  'inline-flex h-8 max-w-[4.25rem] shrink-0 items-center justify-center gap-0.5 rounded-xl border border-slate-300 bg-white px-1 text-sm font-bold leading-none text-slate-900 shadow-[0_3px_0_0_var(--tw-shadow-color)] shadow-slate-300 transition-[transform,box-shadow] duration-100 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:translate-y-0.5 active:shadow-[0_1px_0_0_var(--tw-shadow-color)] sm:h-11 sm:max-w-none sm:gap-1 sm:rounded-2xl sm:px-2'

function HeaderPaletteIcon() {
  return (
    <svg viewBox="0 0 36 36" className="h-10 w-10 shrink-0" aria-hidden="true">
      <path
        d="M18 4.5c7.2 0 13 4.6 13 11.1 0 4.6-2.8 7.2-6.7 7.2h-1.6c-.9 0-1.3.7-1.1 1.5.4 1.4-.5 3.2-2.7 3.2-7.4 0-12.4-5.2-12.4-11.8C6.5 9.2 11.2 4.5 18 4.5Z"
        className="fill-amber-400"
      />
      <circle cx="12.2" cy="14" r="2.1" className="fill-red-500" />
      <circle cx="17.6" cy="11.6" r="2.1" className="fill-sky-500" />
      <circle cx="23.2" cy="14.4" r="2.1" className="fill-emerald-500" />
      <circle cx="20.2" cy="19.2" r="1.9" className="fill-violet-500" />
      <circle cx="24.6" cy="20" r="2.3" className="fill-amber-50" />
    </svg>
  )
}

const menuIcon = 'h-[18px] w-[18px] sm:h-6 sm:w-6'

function HouseIcon() {
  return (
    <svg viewBox="0 0 24 24" className={menuIcon} aria-hidden="true">
      <path d="M16.4 5.2h2.1v3.4l-2.1-1.4V5.2Z" className="fill-stone-400" />
      <path d="M2.4 11.6 12 3.2l9.6 8.4H19L12 6.2 5 11.6H2.4Z" className="fill-rose-500" />
      <path d="M5.2 11.2h13.6V20.4H5.2V11.2Z" className="fill-amber-50" />
      <path d="M10.3 14.8h3.4V20.4h-3.4v-5.6Z" className="fill-amber-700" />
      <path d="M6.6 12.8h3.1v2.5H6.6v-2.5Z" className="fill-sky-400" />
      <path d="M7.6 12.8v2.5M6.6 14h3.1" className="stroke-sky-700" strokeWidth="0.6" fill="none" />
      <ellipse cx="6.3" cy="19.8" rx="2.4" ry="1.5" className="fill-emerald-500" />
    </svg>
  )
}

function BlocksIcon() {
  return (
    <svg viewBox="0 0 24 24" className={menuIcon} aria-hidden="true">
      <path d="M10.2 3.2h10.2l-1.6 2.2H8.6l1.6-2.2Z" className="fill-orange-300" />
      <path d="M8.6 5.4h10.2V11H8.6V5.4Z" className="fill-orange-500" />
      <path d="M18.8 5.4 20.4 3.2v7.2L18.8 11V5.4Z" className="fill-orange-700" />
      <circle cx="11.4" cy="4.2" r="0.85" className="fill-orange-100" />
      <circle cx="15.2" cy="3.7" r="0.85" className="fill-orange-100" />
      <path d="M3.4 12.2h10.4L12.2 14.4H1.8l1.6-2.2Z" className="fill-amber-300" />
      <path d="M1.8 14.4h10.4v5.6H1.8v-5.6Z" className="fill-orange-400" />
      <path d="M12.2 14.4 13.8 12.2v5.6l-1.6 2.2v-5.6Z" className="fill-orange-600" />
      <circle cx="4.6" cy="13.2" r="0.85" className="fill-amber-50" />
      <circle cx="8.5" cy="12.7" r="0.85" className="fill-amber-50" />
    </svg>
  )
}

function BooksIcon() {
  return (
    <svg viewBox="0 0 24 24" className={menuIcon} aria-hidden="true">
      <path d="M3 17.2h17.2v3.6H3v-3.6Z" className="fill-amber-400" />
      <path d="M3 17.2h2.3v3.6H3v-3.6Z" className="fill-amber-600" />
      <path d="M6.4 18.4h11.6" className="stroke-amber-50" strokeWidth="0.7" />
      <path d="M3.8 12.2h16.2v4.2H3.8v-4.2Z" className="fill-emerald-500" />
      <path d="M3.8 12.2h2.3v4.2H3.8v-4.2Z" className="fill-emerald-700" />
      <path d="M7.2 13.6h10.8" className="stroke-emerald-50" strokeWidth="0.7" />
      <path d="M4.6 7.2h15.2v4.2H4.6V7.2Z" className="fill-sky-500" />
      <path d="M4.6 7.2h2.3v4.2H4.6V7.2Z" className="fill-sky-700" />
      <path d="M8 8.6h10" className="stroke-sky-50" strokeWidth="0.7" />
    </svg>
  )
}

function FlagMark() {
  return (
    <svg viewBox="0 0 30 20" className="h-3 w-[1.15rem] shrink-0 sm:h-4 sm:w-6" aria-hidden="true">
      <rect width="30" height="20" rx="1.2" className="fill-red-600" />
      <path className="fill-yellow-300" d="M6.4 2.8 7.6 6.1h3.4L8.2 8.1l1.2 3.3-3-2.1-3 2.1 1.2-3.3-2.8-2h3.4L6.4 2.8Z" />
      <path className="fill-yellow-300" d="m13.1 2.4.45 1.2h1.25l-1 .75.4 1.2-1.05-.75-1.05.75.4-1.2-1-.75h1.25l.45-1.2Z" />
      <path className="fill-yellow-300" d="m16.3 4.5.45 1.2h1.25l-1 .75.4 1.2-1.05-.75-1.05.75.4-1.2-1-.75h1.25l.45-1.2Z" />
      <path className="fill-yellow-300" d="m16.3 8.2.45 1.2h1.25l-1 .75.4 1.2-1.05-.75-1.05.75.4-1.2-1-.75h1.25l.45-1.2Z" />
      <path className="fill-yellow-300" d="m13.1 10.4.45 1.2h1.25l-1 .75.4 1.2-1.05-.75-1.05.75.4-1.2-1-.75h1.25l.45-1.2Z" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className={menuIcon} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M11.2 2.4a9 9 0 1 0 .1 18 9 9 0 0 0-.1-18Zm3.1 1.7a7.2 7.2 0 1 1 0 14.6 7.2 7.2 0 0 1 0-14.6Z"
        className="fill-yellow-400"
      />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M3 2.6h7.1L13.4 5.9V13.4H3V2.6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5.4 2.6V6h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5.4 13.4v-3h5.2v3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M3 4.4h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.2 4.3V3h3.6v1.3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4.3 4.4 5 13h6l.7-8.6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function TemplateIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <path d="M8 1.6c3.4 0 6.1 2.1 6.1 5.1 0 2.1-1.3 3.3-3.1 3.3h-.8c-.4 0-.6.3-.5.7.2.6-.2 1.5-1.2 1.5-3.4 0-5.8-2.4-5.8-5.4C2.7 3.8 4.8 1.6 8 1.6Z" className="fill-white" />
      <circle cx="5.6" cy="6" r="1" className="fill-amber-300" />
      <circle cx="8.1" cy="5" r="1" className="fill-sky-300" />
      <circle cx="10.4" cy="6.3" r="1" className="fill-emerald-300" />
    </svg>
  )
}

function copyFrameLayers(frame: Frame): Frame {
  return {
    layers: frame.layers.map((layer) => ({
      id: createLayerId(),
      name: layer.name,
      visible: layer.visible,
      opacity: layer.opacity,
      pixels: layer.pixels.map((row) => row.slice()),
    })),
  }
}

export function MatuPixCreate() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [boot] = useState(() => {
    const draft = readDraft()
    return { document: draft ?? emptyDocument(), templateId: readTemplateId(draft) }
  })
  const [frames, setFrames] = useState<Frame[]>(boot.document.frames)
  const [activeFrame, setActiveFrame] = useState(boot.document.activeFrame)
  const [activeLayer, setActiveLayer] = useState(boot.document.activeLayer)
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(boot.document.width)
  const [undoStack, setUndoStack] = useState<LayerDocument[]>([])
  const [redoStack, setRedoStack] = useState<LayerDocument[]>([])
  const [tool, setTool] = useState<DrawTool>('brush')
  const [color, setColor] = useState<string>(COLORS[0].hex)
  const [customColors, setCustomColors] = useState<string[]>([])
  const [showGrid, setShowGrid] = useState(readShowGrid)
  const [brushSize, setBrushSize] = useState<1 | 2>(1)
  const [emptyHint, setEmptyHint] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [confirmSize, setConfirmSize] = useState<CanvasSize | null>(null)
  const [confirmSizeTick, setConfirmSizeTick] = useState(0)
  const [confirmTemplate, setConfirmTemplate] = useState<string | null>(null)
  const [confirmTemplateTick, setConfirmTemplateTick] = useState(0)
  const [confirmPhoto, setConfirmPhoto] = useState(false)
  const [confirmPhotoTick, setConfirmPhotoTick] = useState(0)
  const [templateId, setTemplateId] = useState<string | null>(boot.templateId)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [showCheck, setShowCheck] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [confirmDeleteTick, setConfirmDeleteTick] = useState(0)
  const [confirmDeleteFrame, setConfirmDeleteFrame] = useState<number | null>(null)
  const [confirmDeleteFrameTick, setConfirmDeleteFrameTick] = useState(0)
  const [hasDraft, setHasDraft] = useState(draftKeyExists)
  const [publicHint, setPublicHint] = useState(false)
  const [soonHint, setSoonHint] = useState(false)
  const [zoom, setZoom] = useState<ZoomLevel | 'fit'>('fit')
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [handMode, setHandMode] = useState(false)
  const [previewFrame, setPreviewFrame] = useState<number | null>(null)
  const [motionOpen, setMotionOpen] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)
  const framesRef = useRef(frames)
  const activeFrameRef = useRef(activeFrame)
  const activeLayerRef = useRef(activeLayer)
  const sizeRef = useRef({ width: boot.document.width, height: boot.document.height })
  const templateIdRef = useRef<string | null>(boot.templateId)
  const historyRef = useRef({ undo: undoStack, redo: redoStack })
  const hasDraftRef = useRef(hasDraft)
  const strokingRef = useRef(false)
  const hasChangedRef = useRef(false)
  const beforeStrokeRef = useRef<LayerDocument | null>(null)
  const opacityDragRef = useRef<{ index: number; opacity: number } | null>(null)
  const opacityEndRef = useRef<(() => void) | null>(null)
  const commitOpacityRef = useRef(() => {})
  const actionsRef = useRef({ undo: () => {}, redo: () => {} })
  const emptyHintTimerRef = useRef<number | null>(null)
  const soonHintTimerRef = useRef<number | null>(null)
  const previewRef = useRef<number | null>(null)
  const playTimerRef = useRef<number | null>(null)
  const zoomRef = useRef<ZoomLevel | 'fit'>('fit')
  const panRef = useRef({ x: 0, y: 0 })
  const fitEdgeRef = useRef(0)
  const zoomFactor = zoom === 'fit' ? 1 : zoom
  const zoomLabel = `${Math.round(zoomFactor * 100)}%`
  const canZoomOut = zoom !== 'fit'
  const canZoomIn = zoom === 'fit' || zoom < ZOOM_LEVELS[ZOOM_LEVELS.length - 1]
  const layers = frames[activeFrame]?.layers ?? []
  const active = layers[activeLayer]
  const activeHidden = active ? active.visible === false : false
  const playing = previewFrame !== null
  const shownLayers = frames[previewFrame ?? activeFrame]?.layers ?? layers

  function setDraftStored(stored: boolean) {
    hasDraftRef.current = stored
    setHasDraft(stored)
  }

  function setZoomValue(next: ZoomLevel | 'fit') {
    zoomRef.current = next
    setZoom(next)
  }

  function setPanValue(next: { x: number; y: number }) {
    panRef.current = next
    setPan(next)
  }

  function applySize(width: CanvasSize, height: CanvasSize) {
    sizeRef.current = { width, height }
    setCanvasSize(width)
  }

  function currentDocument(): LayerDocument {
    return cloneDocument({
      width: sizeRef.current.width,
      height: sizeRef.current.height,
      frames: framesRef.current,
      activeFrame: activeFrameRef.current,
      activeLayer: activeLayerRef.current,
      templateId: templateIdRef.current,
    })
  }

  function syncTemplateId(id: string | null) {
    const changed = templateIdRef.current !== id
    templateIdRef.current = id
    if (!changed) return
    setTemplateId(id)
    setShowSolution(false)
    setShowCheck(false)
  }

  function writeCanvas(
    width: CanvasSize,
    height: CanvasSize,
    nextFrames: Frame[],
    nextActiveFrame: number,
    nextActiveLayer: number,
    nextUndo: LayerDocument[],
    nextRedo: LayerDocument[],
  ) {
    const maxSteps = maxHistorySteps({
      width,
      height,
      frames: nextFrames,
      activeFrame: nextActiveFrame,
      activeLayer: nextActiveLayer,
      templateId: templateIdRef.current,
    })
    const undo = trimHistory(nextUndo, maxSteps)
    const redo = trimHistory(nextRedo, maxSteps)
    const framesChanged = nextFrames !== framesRef.current
    const frameChanged = nextActiveFrame !== activeFrameRef.current
    const layerChanged = nextActiveLayer !== activeLayerRef.current
    const sizeChanged = width !== sizeRef.current.width || height !== sizeRef.current.height
    applySize(width, height)
    framesRef.current = nextFrames
    activeFrameRef.current = nextActiveFrame
    activeLayerRef.current = nextActiveLayer
    historyRef.current = { undo, redo }
    setFrames(nextFrames)
    setActiveFrame(nextActiveFrame)
    setActiveLayer(nextActiveLayer)
    setUndoStack(undo)
    setRedoStack(redo)
    try {
      writeTemplateId(templateIdRef.current)
    } catch {
      // 写失败只留内存。
    }
    if (!framesChanged && !frameChanged && !layerChanged && !sizeChanged) return
    try {
      saveDraft({
        width,
        height,
        frames: nextFrames,
        activeFrame: nextActiveFrame,
        activeLayer: nextActiveLayer,
        templateId: templateIdRef.current,
      })
      setDraftStored(true)
    } catch {
      // 隐私模式或配额不足时继续画，不把异常抛到页面外。
    }
  }

  function stopPlayback() {
    if (playTimerRef.current !== null) {
      window.clearInterval(playTimerRef.current)
      playTimerRef.current = null
    }
    if (previewRef.current === null) return
    previewRef.current = null
    setPreviewFrame(null)
  }

  function togglePlayback() {
    if (playTimerRef.current !== null || previewRef.current !== null) {
      stopPlayback()
      return
    }
    const totalAtStart = framesRef.current.length
    if (totalAtStart <= 0) return
    let cursor = 0
    previewRef.current = cursor
    setPreviewFrame(cursor)
    playTimerRef.current = window.setInterval(() => {
      const total = framesRef.current.length
      if (total <= 0) {
        stopPlayback()
        return
      }
      cursor = (cursor + 1) % total
      previewRef.current = cursor
      setPreviewFrame(cursor)
    }, PLAYBACK_MS)
  }

  function replaceActiveFrame(nextLayers: PixelLayer[], nextActiveLayer: number, before: LayerDocument | null) {
    const frameIndex = activeFrameRef.current
    if (!framesRef.current[frameIndex]) return
    const nextFrames = framesRef.current.slice()
    nextFrames[frameIndex] = { layers: nextLayers }
    const { width, height } = sizeRef.current
    const nextUndo = before ? [...historyRef.current.undo, before] : historyRef.current.undo
    const nextRedo = before ? [] : historyRef.current.redo
    writeCanvas(width, height, nextFrames, frameIndex, nextActiveLayer, nextUndo, nextRedo)
  }

  useLayoutEffect(() => {
    applySize(sizeRef.current.width, sizeRef.current.height)
  }, [])

  useEffect(() => {
    if (!confirmClear) return
    const timer = window.setTimeout(() => setConfirmClear(false), 3000)
    return () => window.clearTimeout(timer)
  }, [confirmClear])

  useEffect(() => {
    if (!confirmDiscard) return
    const timer = window.setTimeout(() => setConfirmDiscard(false), 3000)
    return () => window.clearTimeout(timer)
  }, [confirmDiscard])

  useEffect(() => {
    if (confirmSize === null) return
    const timer = window.setTimeout(() => setConfirmSize(null), 3000)
    return () => window.clearTimeout(timer)
  }, [confirmSize, confirmSizeTick])

  useEffect(() => {
    if (confirmTemplate === null) return
    const timer = window.setTimeout(() => setConfirmTemplate(null), 8000)
    return () => window.clearTimeout(timer)
  }, [confirmTemplate, confirmTemplateTick])

  useEffect(() => {
    if (!confirmPhoto) return
    const timer = window.setTimeout(() => setConfirmPhoto(false), 3000)
    return () => window.clearTimeout(timer)
  }, [confirmPhoto, confirmPhotoTick])

  useEffect(() => {
    if (confirmDelete === null) return
    const timer = window.setTimeout(() => setConfirmDelete(null), 3000)
    return () => window.clearTimeout(timer)
  }, [confirmDelete, confirmDeleteTick])

  useEffect(() => {
    if (confirmDeleteFrame === null) return
    const timer = window.setTimeout(() => setConfirmDeleteFrame(null), 3000)
    return () => window.clearTimeout(timer)
  }, [confirmDeleteFrame, confirmDeleteFrameTick])

  useEffect(() => {
    return () => {
      if (playTimerRef.current !== null) window.clearInterval(playTimerRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      const onEnd = opacityEndRef.current
      if (!onEnd) return
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  }, [])

  function undo() {
    if (strokingRef.current) return
    const { undo: past, redo } = historyRef.current
    if (past.length === 0) return
    const previous = past[past.length - 1]
    if (!previous) return
    const current = currentDocument()
    const restored = cloneFramesKeepingNames(previous.frames, framesRef.current)
    const frameIndex = previous.activeFrame >= 0 && previous.activeFrame < restored.length ? previous.activeFrame : 0
    const layerCount = restored[frameIndex]?.layers.length ?? 0
    const layerIndex = previous.activeLayer >= 0 && previous.activeLayer < layerCount ? previous.activeLayer : 0
    setConfirmDelete(null)
    setConfirmDeleteFrame(null)
    stopPlayback()
    syncTemplateId(previous.templateId ?? null)
    writeCanvas(previous.width, previous.height, restored, frameIndex, layerIndex, past.slice(0, -1), [...redo, current])
  }

  function redo() {
    if (strokingRef.current) return
    const { undo: past, redo } = historyRef.current
    if (redo.length === 0) return
    const next = redo[redo.length - 1]
    if (!next) return
    const current = currentDocument()
    const restored = cloneFramesKeepingNames(next.frames, framesRef.current)
    const frameIndex = next.activeFrame >= 0 && next.activeFrame < restored.length ? next.activeFrame : 0
    const layerCount = restored[frameIndex]?.layers.length ?? 0
    const layerIndex = next.activeLayer >= 0 && next.activeLayer < layerCount ? next.activeLayer : 0
    setConfirmDelete(null)
    setConfirmDeleteFrame(null)
    stopPlayback()
    syncTemplateId(next.templateId ?? null)
    writeCanvas(next.width, next.height, restored, frameIndex, layerIndex, [...past, current], redo.slice(0, -1))
  }

  actionsRef.current = { undo, redo }

  useEffect(() => {
    return () => {
      if (emptyHintTimerRef.current !== null) window.clearTimeout(emptyHintTimerRef.current)
      if (soonHintTimerRef.current !== null) window.clearTimeout(soonHintTimerRef.current)
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.key.toLowerCase() !== 'z') return
      event.preventDefault()
      if (event.shiftKey) actionsRef.current.redo()
      else actionsRef.current.undo()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function replaceActivePixels(nextPixels: PixelGrid, before: LayerDocument | null) {
    const frame = framesRef.current[activeFrameRef.current]
    const index = activeLayerRef.current
    const layer = frame?.layers[index]
    if (!frame || !layer) return
    const nextLayers = frame.layers.slice()
    nextLayers[index] = { ...layer, pixels: nextPixels }
    replaceActiveFrame(nextLayers, index, before)
  }

  function paint(x: number, y: number) {
    if (showSolution) return
    const nextColor = tool === 'eraser' ? null : color
    const layer = framesRef.current[activeFrameRef.current]?.layers[activeLayerRef.current]
    if (!layer) return
    const { width, height } = sizeRef.current
    const next = layer.pixels.map((row) => row.slice())
    let changed = false
    for (let dy = 0; dy < brushSize; dy += 1) {
      for (let dx = 0; dx < brushSize; dx += 1) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= width || ny >= height) continue
        const row = next[ny]
        if (!row || row[nx] === nextColor) continue
        row[nx] = nextColor
        changed = true
      }
    }
    if (!changed) return
    hasChangedRef.current = true
    replaceActivePixels(next, null)
  }

  function handleFill(x: number, y: number) {
    if (showSolution) return
    stopPlayback()
    const layer = framesRef.current[activeFrameRef.current]?.layers[activeLayerRef.current]
    if (!layer) return
    const next = floodFill(layer.pixels, x, y, color)
    if (!next) return
    replaceActivePixels(next, currentDocument())
  }

  function handlePick(x: number, y: number) {
    if (showSolution) return
    stopPlayback()
    const layer = framesRef.current[activeFrameRef.current]?.layers[activeLayerRef.current]
    const cell = layer?.pixels[y]?.[x] ?? null
    if (cell) {
      if (emptyHintTimerRef.current !== null) {
        window.clearTimeout(emptyHintTimerRef.current)
        emptyHintTimerRef.current = null
      }
      setEmptyHint(false)
      setColor(cell.toUpperCase())
      return
    }
    setEmptyHint(true)
    if (emptyHintTimerRef.current !== null) window.clearTimeout(emptyHintTimerRef.current)
    emptyHintTimerRef.current = window.setTimeout(() => {
      emptyHintTimerRef.current = null
      setEmptyHint(false)
    }, EMPTY_HINT_MS)
  }

  function handleCustom(hex: string) {
    const next = hex.toUpperCase()
    setColor(next)
    if (COLORS.some((item) => item.hex.toUpperCase() === next)) return
    setCustomColors((current) => (current.some((item) => item.toUpperCase() === next) ? current : [...current, next]))
  }

  function handleToggleGrid() {
    setShowGrid((current) => {
      const next = !current
      try {
        localStorage.setItem(GRID_KEY, next ? 'on' : 'off')
      } catch {
        // 写失败只改内存。
      }
      return next
    })
  }

  function handleToggleBrushSize() {
    setBrushSize((size) => (size === 1 ? 2 : 1))
  }

  function selectTool(next: DrawTool) {
    setHandMode(false)
    setTool(next)
  }

  function toggleHandMode() {
    setHandMode((current) => !current)
  }

  function handleStrokeStart() {
    stopPlayback()
    strokingRef.current = true
    hasChangedRef.current = false
    beforeStrokeRef.current = currentDocument()
  }

  function handleStrokeEnd() {
    const changed = hasChangedRef.current
    const before = beforeStrokeRef.current
    strokingRef.current = false
    hasChangedRef.current = false
    beforeStrokeRef.current = null
    if (!changed || !before) return
    writeCanvas(
      sizeRef.current.width,
      sizeRef.current.height,
      framesRef.current,
      activeFrameRef.current,
      activeLayerRef.current,
      [...historyRef.current.undo, before],
      [],
    )
  }

  function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    setConfirmClear(false)
    const layer = framesRef.current[activeFrameRef.current]?.layers[activeLayerRef.current]
    if (!layer || !gridHasInk(layer.pixels)) return
    replaceActivePixels(createEmptyGrid(sizeRef.current.width), currentDocument())
  }

  function handleClearDraft() {
    if (!hasDraftRef.current) return
    if (!confirmDiscard) {
      setConfirmDiscard(true)
      return
    }
    setConfirmDiscard(false)
    if (documentHasInk(framesRef.current)) {
      const { width, height } = sizeRef.current
      const before = currentDocument()
      syncTemplateId(null)
      const nextFrames = framesRef.current.map((frame) => ({
        layers: frame.layers.map((layer) => ({ ...layer, pixels: createEmptyGrid(width) })),
      }))
      writeCanvas(width, height, nextFrames, activeFrameRef.current, activeLayerRef.current, [...historyRef.current.undo, before], [])
    } else {
      syncTemplateId(null)
    }
    try {
      localStorage.removeItem(DRAFT_KEY)
      localStorage.removeItem(TEMPLATE_KEY)
      setDraftStored(false)
    } catch {
      // 删除失败时不打断页面。
    }
  }

  function switchSize(target: CanvasSize) {
    setConfirmSize(null)
    if (target === sizeRef.current.width) return
    stopPlayback()
    const before = currentDocument()
    syncTemplateId(null)
    writeCanvas(target, target, [{ layers: [createLayer(target, '图层 1')] }], 0, 0, [...historyRef.current.undo, before], [])
    setZoomValue('fit')
    setPanValue({ x: 0, y: 0 })
  }

  function handleSelectSize(target: CanvasSize) {
    if (target === sizeRef.current.width) return
    if (!documentHasInk(framesRef.current)) {
      switchSize(target)
      return
    }
    setConfirmSize(target)
    setConfirmSizeTick((tick) => tick + 1)
  }

  function handleConfirmSize() {
    if (confirmSize === null) return
    switchSize(confirmSize)
  }

  function applyTemplate(template: (typeof TEMPLATES)[number]) {
    setConfirmTemplate(null)
    stopPlayback()
    const before = currentDocument()
    templateIdRef.current = template.id
    setTemplateId(template.id)
    setShowSolution(false)
    setShowCheck(false)
    setTemplatesOpen(false)
    const size = legalCanvasSize(sizeRef.current.width, sizeRef.current.height)
    const layer = createLayer(size, '图层 1')
    writeCanvas(size, size, [{ layers: [layer] }], 0, 0, [...historyRef.current.undo, before], [])
    setZoomValue('fit')
    setPanValue({ x: 0, y: 0 })
  }

  useEffect(() => {
    const requested = searchParams.get('template')
    const hash = window.location.hash.replace('#', '')
    if (!requested && hash !== 'photo' && hash !== 'templates') return
    if (requested) {
      const next = new URLSearchParams(searchParams)
      next.delete('template')
      setSearchParams(next, { replace: true })
      const template = TEMPLATES.find((item) => item.id === requested)
      if (template) {
        if (!documentHasInk(framesRef.current)) {
          applyTemplate(template)
        } else {
          setConfirmTemplate(template.id)
          setConfirmTemplateTick((tick) => tick + 1)
          window.setTimeout(() => {
            document.getElementById('templates')?.scrollIntoView({ block: 'center' })
          }, 60)
        }
      }
    }
    if (hash === 'photo' || hash === 'templates') {
      window.setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ block: 'start' })
      }, 60)
    }
    // 只处理打开这一页时带上的模板或锚点。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handlePickTemplate(id: string) {
    const template = TEMPLATES.find((item) => item.id === id)
    if (!template) return
    if (confirmTemplate === id) {
      applyTemplate(template)
      return
    }
    if (!documentHasInk(framesRef.current)) {
      applyTemplate(template)
      return
    }
    setConfirmTemplate(id)
    setConfirmTemplateTick((tick) => tick + 1)
  }

  function applyPhoto(pixels: PixelGrid) {
    setConfirmPhoto(false)
    setConfirmTemplate(null)
    stopPlayback()
    const before = currentDocument()
    templateIdRef.current = null
    setTemplateId(null)
    setShowSolution(false)
    setShowCheck(false)
    const size = legalCanvasSize(sizeRef.current.width, sizeRef.current.height)
    const layer = createLayer(size, '图层 1')
    layer.pixels = pixels
    writeCanvas(size, size, [{ layers: [layer] }], 0, 0, [...historyRef.current.undo, before], [])
    setZoomValue('fit')
    setPanValue({ x: 0, y: 0 })
  }

  function handlePhotoGenerate(pixels: PixelGrid) {
    if (pixels.length !== sizeRef.current.width || pixels.some((row) => row.length !== sizeRef.current.width)) return false
    if (documentHasInk(framesRef.current)) {
      if (!confirmPhoto) {
        setConfirmPhoto(true)
        setConfirmPhotoTick((tick) => tick + 1)
        return false
      }
    }
    applyPhoto(pixels)
    return true
  }

  function selectLayer(index: number) {
    const currentLayers = framesRef.current[activeFrameRef.current]?.layers ?? []
    if (index === activeLayerRef.current) return
    if (index < 0 || index >= currentLayers.length) return
    writeCanvas(sizeRef.current.width, sizeRef.current.height, framesRef.current, activeFrameRef.current, index, historyRef.current.undo, historyRef.current.redo)
  }

  function toggleLayerVisible(index: number) {
    const currentLayers = framesRef.current[activeFrameRef.current]?.layers
    const layer = currentLayers?.[index]
    if (!currentLayers || !layer) return
    const nextLayers = currentLayers.slice()
    nextLayers[index] = { ...layer, visible: !layer.visible }
    replaceActiveFrame(nextLayers, activeLayerRef.current, null)
  }

  function renameLayer(index: number, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const currentLayers = framesRef.current[activeFrameRef.current]?.layers
    const layer = currentLayers?.[index]
    if (!currentLayers || !layer || layer.name === trimmed) return
    const nextLayers = currentLayers.slice()
    nextLayers[index] = { ...layer, name: trimmed }
    replaceActiveFrame(nextLayers, activeLayerRef.current, null)
  }

  function addLayer() {
    const currentLayers = framesRef.current[activeFrameRef.current]?.layers
    if (!currentLayers) return
    const { width, height } = sizeRef.current
    const before = currentDocument()
    const insertAt = activeLayerRef.current + 1
    const layer = createLayer(width, nextLayerName(currentLayers))
    const nextLayers = [...currentLayers.slice(0, insertAt), layer, ...currentLayers.slice(insertAt)]
    setConfirmDelete(null)
    replaceActiveFrame(nextLayers, insertAt, before)
  }

  function moveLayer(index: number, direction: 1 | -1) {
    const currentLayers = framesRef.current[activeFrameRef.current]?.layers
    if (!currentLayers) return
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= currentLayers.length) return
    const activeId = currentLayers[activeLayerRef.current]?.id
    const before = currentDocument()
    const nextLayers = currentLayers.slice()
    const [item] = nextLayers.splice(index, 1)
    if (!item) return
    nextLayers.splice(nextIndex, 0, item)
    const nextActive = Math.max(0, nextLayers.findIndex((layer) => layer.id === activeId))
    setConfirmDelete(null)
    replaceActiveFrame(nextLayers, nextActive, before)
  }

  function deleteLayer(index: number) {
    const currentLayers = framesRef.current[activeFrameRef.current]?.layers
    if (!currentLayers || currentLayers.length <= 1) return
    const layer = currentLayers[index]
    if (!layer) return
    if (gridHasInk(layer.pixels)) {
      if (confirmDelete !== index) {
        setConfirmDelete(index)
        setConfirmDeleteTick((tick) => tick + 1)
        return
      }
    }
    setConfirmDelete(null)
    const activeId = currentLayers[activeLayerRef.current]?.id
    const before = currentDocument()
    const nextLayers = currentLayers.filter((_, layerIndex) => layerIndex !== index)
    let nextActive = nextLayers.findIndex((item) => item.id === activeId)
    if (nextActive < 0) nextActive = Math.min(index, nextLayers.length - 1)
    replaceActiveFrame(nextLayers, nextActive, before)
  }

  function selectFrame(index: number) {
    stopPlayback()
    const frame = framesRef.current[index]
    if (!frame) return
    setConfirmDelete(null)
    setConfirmDeleteFrame(null)
    if (index === activeFrameRef.current) return
    const nextLayer = clampIndex(activeLayerRef.current, frame.layers.length)
    writeCanvas(sizeRef.current.width, sizeRef.current.height, framesRef.current, index, nextLayer, historyRef.current.undo, historyRef.current.redo)
  }

  function addFrame() {
    stopPlayback()
    const { width, height } = sizeRef.current
    const before = currentDocument()
    const insertAt = activeFrameRef.current + 1
    const nextFrames = [...framesRef.current.slice(0, insertAt), { layers: [createLayer(width, '图层 1')] }, ...framesRef.current.slice(insertAt)]
    setConfirmDelete(null)
    setConfirmDeleteFrame(null)
    writeCanvas(width, height, nextFrames, insertAt, 0, [...historyRef.current.undo, before], [])
  }

  function duplicateFrame() {
    stopPlayback()
    const frame = framesRef.current[activeFrameRef.current]
    if (!frame) return
    const before = currentDocument()
    const copied = copyFrameLayers(frame)
    const insertAt = activeFrameRef.current + 1
    const nextFrames = [...framesRef.current.slice(0, insertAt), copied, ...framesRef.current.slice(insertAt)]
    const nextLayer = clampIndex(activeLayerRef.current, copied.layers.length)
    setConfirmDelete(null)
    setConfirmDeleteFrame(null)
    writeCanvas(sizeRef.current.width, sizeRef.current.height, nextFrames, insertAt, nextLayer, [...historyRef.current.undo, before], [])
  }

  function deleteActiveFrame() {
    const currentFrames = framesRef.current
    if (currentFrames.length <= 1) return
    const index = activeFrameRef.current
    const frame = currentFrames[index]
    if (!frame) return
    if (frameHasInk(frame)) {
      if (confirmDeleteFrame !== index) {
        setConfirmDeleteFrame(index)
        setConfirmDeleteFrameTick((tick) => tick + 1)
        return
      }
    }
    setConfirmDeleteFrame(null)
    stopPlayback()
    const before = currentDocument()
    const nextFrames = currentFrames.filter((_, frameIndex) => frameIndex !== index)
    const nextActive = Math.min(index, nextFrames.length - 1)
    const nextLayer = clampIndex(activeLayerRef.current, nextFrames[nextActive]?.layers.length ?? 0)
    setConfirmDelete(null)
    writeCanvas(sizeRef.current.width, sizeRef.current.height, nextFrames, nextActive, nextLayer, [...historyRef.current.undo, before], [])
  }

  function moveFrame(direction: -1 | 1) {
    stopPlayback()
    const currentFrames = framesRef.current
    const index = activeFrameRef.current
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= currentFrames.length) return
    const before = currentDocument()
    const nextFrames = currentFrames.slice()
    const [item] = nextFrames.splice(index, 1)
    if (!item) return
    nextFrames.splice(nextIndex, 0, item)
    setConfirmDeleteFrame(null)
    writeCanvas(sizeRef.current.width, sizeRef.current.height, nextFrames, nextIndex, activeLayerRef.current, [...historyRef.current.undo, before], [])
  }

  function applyOpacity(percent: number, recordHistory: boolean) {
    const index = activeLayerRef.current
    const frame = framesRef.current[activeFrameRef.current]
    const layer = frame?.layers[index]
    if (!frame || !layer) return
    const opacity = Math.min(100, Math.max(0, Math.round(percent))) / 100
    if (sameOpacity(layer.opacity, opacity)) return
    const nextLayers = frame.layers.slice()
    nextLayers[index] = { ...layer, opacity }
    if (!recordHistory) {
      replaceActiveFrame(nextLayers, index, null)
      return
    }
    replaceActiveFrame(nextLayers, index, currentDocument())
  }

  function beginOpacity() {
    const index = activeLayerRef.current
    const layer = framesRef.current[activeFrameRef.current]?.layers[index]
    if (!layer) return
    opacityDragRef.current = { index, opacity: layer.opacity }
    if (opacityEndRef.current) {
      window.removeEventListener('pointerup', opacityEndRef.current)
      window.removeEventListener('pointercancel', opacityEndRef.current)
    }
    const onEnd = () => {
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
      if (opacityEndRef.current === onEnd) opacityEndRef.current = null
      commitOpacityRef.current()
    }
    opacityEndRef.current = onEnd
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
  }

  function commitOpacity() {
    const start = opacityDragRef.current
    if (!start) return
    opacityDragRef.current = null
    const frameIndex = activeFrameRef.current
    const layer = framesRef.current[frameIndex]?.layers[start.index]
    if (!layer || sameOpacity(layer.opacity, start.opacity)) return
    const beforeFrames = cloneFrames(framesRef.current)
    const target = beforeFrames[frameIndex]?.layers[start.index]
    if (!target) return
    target.opacity = start.opacity
    writeCanvas(sizeRef.current.width, sizeRef.current.height, framesRef.current, frameIndex, activeLayerRef.current, [
      ...historyRef.current.undo,
      {
        width: sizeRef.current.width,
        height: sizeRef.current.height,
        frames: beforeFrames,
        activeFrame: frameIndex,
        activeLayer: activeLayerRef.current,
        templateId: templateIdRef.current,
      },
    ], [])
  }

  commitOpacityRef.current = commitOpacity

  function changeZoom(direction: 1 | -1) {
    const current = zoomRef.current
    const next = nextZoomLevel(current, direction)
    if (next === null) return
    const oldScale = current === 'fit' ? 1 : current
    const newScale = next === 'fit' ? 1 : next
    // 平移量以视口中心为原点，center 为 0。
    // newPan = (pan - center) * (newScale / oldScale) + center，缩放后按 maxPan 钳制。
    const center = 0
    const ratio = newScale / oldScale
    const limit = maxPanFor(newScale, fitEdgeRef.current)
    const currentPan = panRef.current
    setZoomValue(next)
    setPanValue({
      x: clampNumber((currentPan.x - center) * ratio + center, limit),
      y: clampNumber((currentPan.y - center) * ratio + center, limit),
    })
  }

  function handlePanDelta(dx: number, dy: number) {
    const factor = zoomRef.current === 'fit' ? 1 : zoomRef.current
    const limit = maxPanFor(factor, fitEdgeRef.current)
    setPanValue({
      x: clampNumber(panRef.current.x + dx, limit),
      y: clampNumber(panRef.current.y + dy, limit),
    })
  }

  function handleFitEdge(edge: number) {
    fitEdgeRef.current = edge
    const factor = zoomRef.current === 'fit' ? 1 : zoomRef.current
    const limit = maxPanFor(factor, edge)
    const nextX = clampNumber(panRef.current.x, limit)
    const nextY = clampNumber(panRef.current.y, limit)
    if (nextX === panRef.current.x && nextY === panRef.current.y) return
    setPanValue({ x: nextX, y: nextY })
  }

  function resetView() {
    setZoomValue('fit')
    setPanValue({ x: 0, y: 0 })
  }

  function collapseMotion() {
    setMotionOpen(false)
    setLayersOpen(false)
  }

  function handleDownload() {
    const frame = framesRef.current[activeFrameRef.current]
    if (!frame) return
    downloadPng(frame.layers, sizeRef.current.width, sizeRef.current.height)
  }

  function handleSaveGif() {
    const stored = framesRef.current
    if (stored.length < 2) return
    downloadGif(stored, sizeRef.current.width)
  }

  function showComingSoon() {
    setSoonHint(true)
    if (soonHintTimerRef.current !== null) window.clearTimeout(soonHintTimerRef.current)
    soonHintTimerRef.current = window.setTimeout(() => {
      soonHintTimerRef.current = null
      setSoonHint(false)
    }, EMPTY_HINT_MS)
  }

  const customColorValue = /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : '#e23d3d'
  const activeTemplate = TEMPLATES.find((item) => item.id === templateId) ?? null
  const templatePixels = activeTemplate ? scaleTemplate(activeTemplate.pixels, canvasSize) : null
  const templateGuide = templatePixels ? buildGuide(templatePixels) : null
  const templateProgress = templatePixels && templateGuide ? sessionView(layers, templatePixels, templateGuide.numbers) : null
  const showTemplateOverlay = Boolean(templateProgress) && !showSolution && !playing
  const canvasLayers: readonly PixelLayer[] =
    showSolution && templatePixels
      ? [{ id: 'template-solution', name: '成品', visible: true, opacity: 1, pixels: templatePixels }]
      : shownLayers

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col bg-gradient-to-b from-sky-200 via-sky-50 to-white">
    <main className="mx-auto flex w-full min-w-0 max-w-4xl flex-1 flex-col gap-4 overflow-x-clip px-3 py-5 sm:px-5">
      <header className="relative z-10 flex min-w-0 items-start justify-between gap-1.5 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <HeaderPaletteIcon />
          <div className="min-w-0">
            <h1 className="text-[clamp(23px,_3.8vw,_38px)] font-extrabold leading-tight tracking-[0.2px] text-slate-900">像素画</h1>
            <p className="mt-1 text-base font-semibold leading-snug text-slate-600">先选一个颜色，然后点击或拖动填满格子。</p>
          </div>
        </div>
        <div className="relative flex shrink-0 items-center gap-1 sm:gap-1.5">
          <Link to="/matupix" aria-label="返回" className={menuButton}>
            <HouseIcon />
          </Link>
          <button type="button" aria-label="积木" onClick={showComingSoon} className={menuButton}>
            <BlocksIcon />
          </button>
          <button type="button" aria-label="文件" onClick={showComingSoon} className={menuButton}>
            <BooksIcon />
          </button>
          <button type="button" aria-label="语言" onClick={showComingSoon} className={menuLangButton}>
            <FlagMark />
            zh
          </button>
          <button type="button" aria-label="深色" onClick={showComingSoon} className={menuButton}>
            <MoonIcon />
          </button>
          {soonHint ? (
            <p role="status" className="pointer-events-none absolute right-0 top-full z-20 mt-1 whitespace-nowrap text-sm text-slate-500">
              即将开放
            </p>
          ) : null}
        </div>
      </header>

      <div className={`flex w-full min-w-0 flex-col items-center gap-1.5 rounded-[28px] bg-white px-2.5 py-2 shadow-[0_12px_40px_rgba(56,140,190,0.16)] sm:px-4 sm:py-2.5 ${playing ? 'opacity-60' : ''}`}>
        <Palette color={color} onChange={setColor} customColors={customColors} onCustom={handleCustom} />
        <div className="flex w-full min-w-0 max-w-full flex-wrap items-center justify-center gap-1">
          <label className="inline-flex h-9 shrink-0 items-center gap-1 text-[15px] font-semibold leading-normal text-slate-600">
            我的颜色
            <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md">
              <span aria-hidden="true" className="block h-7 w-7 rounded-md border border-slate-300" style={{ backgroundColor: customColorValue }} />
              <input
                type="color"
                aria-label="自定义颜色"
                value={customColorValue}
                onChange={(event) => handleCustom(event.target.value.toUpperCase())}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </span>
          </label>
          <CanvasSizeSelect size={canvasSize} onSelectSize={handleSelectSize} />
          <HistoryControls canUndo={undoStack.length > 0} canRedo={redoStack.length > 0} onUndo={undo} onRedo={redo} />
          <EraserButton selected={!handMode && tool === 'eraser'} onClick={() => selectTool('eraser')} />
          <button type="button" className={`${colorAction} bg-emerald-500 focus-visible:ring-emerald-700`} onClick={handleDownload}>
            <SaveIcon />
            保存
          </button>
          <button
            type="button"
            onClick={handleClear}
            className={`${colorAction} focus-visible:ring-red-700 ${confirmClear ? 'bg-red-600' : 'bg-red-500'}`}
          >
            <TrashIcon />
            {confirmClear ? '确认清空？' : '清空'}
          </button>
          <button
            type="button"
            aria-expanded={templatesOpen}
            onClick={() => setTemplatesOpen((open) => !open)}
            className={`${colorAction} focus-visible:ring-violet-700 ${templatesOpen ? 'bg-violet-600' : 'bg-violet-500'}`}
          >
            <TemplateIcon />
            免费模板
          </button>
          {templateGuide ? (
            <>
              <button type="button" aria-pressed={showCheck} onClick={() => setShowCheck((current) => !current)} className={toolButtonClass(showCheck)}>
                检查
              </button>
              <button
                type="button"
                aria-pressed={showSolution}
                onClick={() => setShowSolution((current) => !current)}
                className={toolButtonClass(showSolution)}
              >
                {showSolution ? '藏起成品' : '看看成品'}
              </button>
            </>
          ) : null}
        </div>
        {templatesOpen ? (
          <div className="flex w-full min-w-0 flex-col gap-1.5">
            <TemplateChoices templates={TEMPLATES} pendingId={confirmTemplate} onPick={handlePickTemplate} />
            {confirmTemplate ? (
              <button
                type="button"
                onClick={() => handlePickTemplate(confirmTemplate)}
                className="inline-flex min-h-9 w-full items-center justify-center rounded-xl bg-danger px-5 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                使用模板会替换当前画布，确认？
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="flex w-full min-w-0 max-w-full flex-wrap items-center justify-center gap-1">
          <DrawToolControls
            tool={tool}
            suppressToolPress={handMode}
            onChange={selectTool}
            showGrid={showGrid}
            onToggleGrid={handleToggleGrid}
            brushSize={brushSize}
            onToggleBrushSize={handleToggleBrushSize}
          />
          <button
            type="button"
            aria-disabled={hasDraft ? undefined : true}
            onClick={handleClearDraft}
            className={
              !hasDraft
                ? `${quietButton} cursor-not-allowed opacity-50`
                : confirmDiscard
                  ? 'inline-flex h-8 min-h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-red-500 px-2.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2'
                  : quietButton
            }
          >
            {hasDraft && confirmDiscard ? '确认清除？' : '清除草稿'}
          </button>
          <button
            type="button"
            className={`${quietButton} cursor-not-allowed opacity-50`}
            aria-disabled="true"
            onClick={() => setPublicHint(true)}
          >
            公开作品（即将开放）
          </button>
          {hasDraft ? <span className="text-sm text-slate-500">已保存</span> : null}
          {publicHint ? (
            <span role="status" className="text-sm text-slate-500">
              公开功能还在准备中
            </span>
          ) : null}
          <ZoomControls
            zoomLabel={zoomLabel}
            canZoomOut={canZoomOut}
            canZoomIn={canZoomIn}
            handActive={handMode}
            onToggleHand={toggleHandMode}
            onZoomOut={() => changeZoom(-1)}
            onZoomIn={() => changeZoom(1)}
            onResetView={resetView}
          />
        </div>
      </div>

      {activeHidden ? (
        <p role="status" className="text-sm text-slate-600">
          当前图层已隐藏
        </p>
      ) : null}
      {emptyHint ? (
        <p role="status" className="text-sm text-slate-600">
          这个格子是空的
        </p>
      ) : null}
      {confirmSize !== null ? (
        <button
          type="button"
          onClick={handleConfirmSize}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-danger px-5 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          切换尺寸会清空当前画布，确认？
        </button>
      ) : null}

      {templateGuide && templateProgress ? (
        <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-2" aria-label="颜色对照">
          {templateGuide.legend.map((item) => {
            const selected = color.toUpperCase() === item.hex.toUpperCase()
            return (
              <span key={item.number} className="inline-flex items-center gap-1 text-[15px] font-semibold leading-normal text-slate-800">
                <span>{item.number}</span>
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={`编号 ${item.number}`}
                  onClick={() => setColor(item.hex)}
                  className={swatchClass(selected, 'h-6 w-6 rounded-md')}
                  style={{ backgroundColor: item.hex }}
                />
              </span>
            )
          })}
          <span className="text-[15px] font-semibold leading-normal text-slate-800">
            已完成 {templateProgress.done} / {templateGuide.total}
          </span>
        </div>
      ) : null}

      <div className={playing ? 'w-full opacity-60' : 'w-full'}>
        <PixelCanvas
          layers={canvasLayers}
          size={canvasSize}
          zoom={zoom}
          panX={pan.x}
          panY={pan.y}
          onPaint={paint}
          onStrokeStart={handleStrokeStart}
          onStrokeEnd={handleStrokeEnd}
          onPanDelta={handlePanDelta}
          onZoomStep={changeZoom}
          onFitEdge={handleFitEdge}
          handMode={handMode}
          pointerMode={tool === 'fill' ? 'fill' : tool === 'eyedropper' ? 'pick' : 'stroke'}
          onFill={handleFill}
          onPick={handlePick}
          showGrid={showGrid}
          paintEnabled={!showSolution}
          cellNumbers={showTemplateOverlay && templateProgress ? templateProgress.shown : null}
          wrongCells={showCheck && showTemplateOverlay && templateProgress ? templateProgress.wrong : null}
        />
      </div>

      <section className="flex w-full min-w-0 flex-col gap-1" aria-label="动画">
        {motionOpen ? (
          <>
            {layersOpen ? null : (
              <FrameBar
                frames={frames}
                highlight={previewFrame ?? activeFrame}
                size={canvasSize}
                playing={playing}
                onSelect={selectFrame}
                onAdd={addFrame}
                onCopy={duplicateFrame}
                onTogglePlay={togglePlayback}
                onSaveGif={handleSaveGif}
              />
            )}
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-expanded={layersOpen}
                  onClick={() => setLayersOpen((open) => !open)}
                  className="rounded-md px-1 py-0.5 text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  叠一层颜色
                </button>
                {layersOpen ? (
                  <button
                    type="button"
                    onClick={() => setLayersOpen(false)}
                    className="rounded-md px-1 py-0.5 text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                  >
                    回到这些画
                  </button>
                ) : null}
              </div>
              <button type="button" onClick={collapseMotion} className="btn-secondary shrink-0 px-3 text-base font-semibold">
                收起
              </button>
            </div>
            {layersOpen ? (
              <LayerBar
                layers={layers}
                activeLayer={activeLayer}
                confirmDeleteIndex={confirmDelete}
                onSelect={selectLayer}
                onToggleVisible={toggleLayerVisible}
                onMove={moveLayer}
                onDelete={deleteLayer}
                onAdd={addLayer}
                onOpacityBegin={beginOpacity}
                onOpacityInput={(percent) => applyOpacity(percent, opacityDragRef.current === null)}
                onOpacityCommit={commitOpacity}
              />
            ) : null}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setMotionOpen(true)}
            className="self-center rounded-xl px-3 py-2 text-base font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            想让画动起来
          </button>
        )}
      </section>

      <PixelGuide />
      <PixelInspiration templates={TEMPLATES} pendingId={confirmTemplate} onPick={handlePickTemplate} />
      <PhotoToPixel
        gridSize={canvasSize}
        confirming={confirmPhoto}
        onGenerate={handlePhotoGenerate}
        onDismissConfirm={() => setConfirmPhoto(false)}
      />
      <PixelFaq />
    </main>
    <PixelFooter />
    </div>
  )
}
