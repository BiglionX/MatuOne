import { MAGIC_MODELS, magicComponents, magicLayout, type MagicPiece } from '../src/pages/matupix/brick/brickMagicModels'
import { footprint, partPlates, type BrickRotation, type BrickType } from '../src/pages/matupix/brick/brickTypes'

type Piece = MagicPiece

function cellsOf(piece: Piece) {
  const { width, depth } = footprint(piece.type, piece.rotation)
  const plates = partPlates(piece.type)
  const out: string[] = []
  for (let layer = 0; layer < plates; layer += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let z = 0; z < depth; z += 1) out.push(`${piece.gx + x},${piece.base + layer},${piece.gz + z}`)
    }
  }
  return out
}

function neighbors(key: string) {
  const [x, y, z] = key.split(',').map(Number)
  return [`${x + 1},${y},${z}`, `${x - 1},${y},${z}`, `${x},${y + 1},${z}`, `${x},${y - 1},${z}`, `${x},${y},${z + 1}`, `${x},${y},${z - 1}`]
}

function groupIds(pieces: Piece[]) {
  const owner = new Map<string, number>()
  const lists = pieces.map((piece) => cellsOf(piece))
  lists.forEach((list, index) => {
    for (const cell of list) owner.set(cell, index)
  })
  const parent = pieces.map((_, index) => index)
  const find = (id: number): number => {
    let cursor = id
    while (parent[cursor] !== cursor) cursor = parent[cursor]
    return cursor
  }
  const unite = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[rb] = ra
  }
  lists.forEach((list, index) => {
    for (const cell of list) {
      for (const next of neighbors(cell)) {
        const other = owner.get(next)
        if (other !== undefined && other !== index) unite(index, other)
      }
    }
  })
  const groups = new Map<number, number[]>()
  pieces.forEach((_, index) => {
    const root = find(index)
    const list = groups.get(root) ?? []
    list.push(index)
    groups.set(root, list)
  })
  return [...groups.values()].sort((a, b) => b.length - a.length)
}

function occupied(pieces: Piece[], ids: number[]) {
  const set = new Set<string>()
  for (const id of ids) for (const cell of cellsOf(pieces[id])) set.add(cell)
  return set
}

function suggest(pieces: Piece[], island: number[], mainIds: number[]) {
  const main = occupied(pieces, mainIds)
  let best: { dx: number; dz: number; score: number } | null = null
  for (let radius = 0; radius <= 24; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue
        const cellsNow = new Set<string>()
        let clash = false
        for (const id of island) {
          const piece = pieces[id]
          const { width, depth } = footprint(piece.type, piece.rotation)
          const plates = partPlates(piece.type)
          for (let layer = 0; layer < plates; layer += 1) {
            for (let x = 0; x < width; x += 1) {
              for (let z = 0; z < depth; z += 1) {
                const key = `${piece.gx + dx + x},${piece.base + layer},${piece.gz + dz + z}`
                if (main.has(key) || cellsNow.has(key)) {
                  clash = true
                  break
                }
                cellsNow.add(key)
              }
              if (clash) break
            }
            if (clash) break
          }
          if (clash) break
        }
        if (clash) continue
        let touch = false
        for (const cell of cellsNow) {
          for (const next of neighbors(cell)) {
            if (main.has(next)) {
              touch = true
              break
            }
          }
          if (touch) break
        }
        if (!touch) continue
        const score = Math.abs(dx) + Math.abs(dz)
        if (!best || score < best.score) best = { dx, dz, score }
      }
    }
    if (best && best.score <= radius) return best
  }
  return best
}

const ids = process.argv.slice(2)
for (const model of MAGIC_MODELS) {
  if (ids.length && !ids.includes(model.id)) continue
  const layout = magicLayout(model.id)
  if (!layout) continue
  console.log(`\n== ${model.id} ==`)
  let cursor = 0
  const slices: Array<{ label: string; start: number; count: number }> = []
  for (const [label, pieces] of layout) {
    const parts = magicComponents(pieces)
    slices.push({ label, start: cursor, count: pieces.length })
    if (parts.length !== 1) console.log(`  slice ${label} BROKEN ${parts.join('+')} n=${pieces.length}`)
    cursor += pieces.length
  }
  if (cursor !== model.pieces.length) console.log(`  SLICE SUM ${cursor} != ${model.pieces.length}`)
  const pieces = model.pieces.map((piece) => ({ ...piece }))
  const seen = new Set<string>()
  let overlap = false
  for (const piece of pieces) {
    for (const cell of cellsOf(piece)) {
      if (seen.has(cell)) overlap = true
      seen.add(cell)
    }
  }
  if (overlap) {
    console.log('  has overlap, skip pack')
    continue
  }
  let guard = 0
  while (guard < 40) {
    guard += 1
    const groups = groupIds(pieces)
    if (groups.length === 1) break
    let choice: { island: number[]; move: { dx: number; dz: number; score: number } } | null = null
    for (const island of groups.slice(1)) {
      const move = suggest(pieces, island, groups[0])
      if (!move) continue
      if (!choice || move.score < choice.move.score || (move.score === choice.move.score && island.length > choice.island.length)) {
        choice = { island, move }
      }
    }
    if (!choice) {
      console.log(`  STUCK parts=${groups.length}`)
      break
    }
    for (const id of choice.island) {
      pieces[id] = { ...pieces[id], gx: pieces[id].gx + choice.move.dx, gz: pieces[id].gz + choice.move.dz }
    }
  }
  const finalParts = groupIds(pieces).length
  console.log(`  packed components=${finalParts}`)
  for (const slice of slices) {
    const deltas = new Map<string, number>()
    for (let index = slice.start; index < slice.start + slice.count; index += 1) {
      const before = model.pieces[index]
      const after = pieces[index]
      const key = `${after.gx - before.gx},${after.gz - before.gz}`
      deltas.set(key, (deltas.get(key) ?? 0) + 1)
    }
    const text = [...deltas.entries()].map(([key, count]) => `${key}×${count}`).join(' ')
    console.log(`  ${slice.label} ${text}`)
  }
  void (0 as unknown as BrickType)
  void (0 as unknown as BrickRotation)
}
