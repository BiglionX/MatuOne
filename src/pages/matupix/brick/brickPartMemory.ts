import { BRICK_PARTS, type BrickType } from './brickTypes'

const MEMORY_KEY = 'matupix.brick.parts.v1'
const TYPES = new Set<BrickType>(BRICK_PARTS.map((item) => item.type))
const RECENT_LIMIT = 12

export type BrickPartMemory = {
  favorites: BrickType[]
  recent: BrickType[]
}

const listeners = new Set<() => void>()

function isType(value: unknown): value is BrickType {
  return typeof value === 'string' && TYPES.has(value as BrickType)
}

function uniqueTypes(value: unknown) {
  if (!Array.isArray(value)) return []
  const seen = new Set<BrickType>()
  const next: BrickType[] = []
  for (const entry of value) {
    if (!isType(entry) || seen.has(entry)) continue
    seen.add(entry)
    next.push(entry)
  }
  return next
}

function emptyMemory(): BrickPartMemory {
  return { favorites: [], recent: [] }
}

export function loadPartMemory(): BrickPartMemory {
  try {
    const raw = localStorage.getItem(MEMORY_KEY)
    if (!raw) return emptyMemory()
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return emptyMemory()
    const record = data as Record<string, unknown>
    if (record.version !== 1) return emptyMemory()
    return {
      favorites: uniqueTypes(record.favorites),
      recent: uniqueTypes(record.recent).slice(0, RECENT_LIMIT),
    }
  } catch {
    return emptyMemory()
  }
}

function write(memory: BrickPartMemory) {
  try {
    localStorage.setItem(
      MEMORY_KEY,
      JSON.stringify({ version: 1, favorites: memory.favorites, recent: memory.recent }),
    )
  } catch {
    // 配额或隐私模式写失败时只留这次内存。
  }
  listeners.forEach((listener) => listener())
}

export function subscribePartMemory(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function togglePartFavorite(type: BrickType) {
  const current = loadPartMemory()
  const favorites = current.favorites.includes(type)
    ? current.favorites.filter((item) => item !== type)
    : [...current.favorites, type]
  const next = { ...current, favorites }
  write(next)
  return next
}

export function rememberPart(type: BrickType) {
  const current = loadPartMemory()
  const recent = [type, ...current.recent.filter((item) => item !== type)].slice(0, RECENT_LIMIT)
  const next = { ...current, recent }
  write(next)
  return next
}
