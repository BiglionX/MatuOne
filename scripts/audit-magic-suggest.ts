import { MAGIC_MODELS, bricksFromMagic } from '../src/pages/matupix/brick/brickMagicModels'
import { footprint, partPlates, type BrickRotation, type BrickType } from '../src/pages/matupix/brick/brickTypes'

type Piece = { type: BrickType; color: string; gx: number; gz: number; base: number; rotation: BrickRotation }

function cells(piece: Piece) {
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
  const lists = pieces.map((piece, index) => {
    const list = cells(piece)
    for (const cell of list) owner.set(cell, index)
    return list
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
  pieces.forEach((_, index) => {
    for (const cell of lists[index]) {
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
  for (const id of ids) for (const cell of cells(pieces[id])) set.add(cell)
  return set
}

function translate(piece: Piece, dx: number, dz: number, dy: number): Piece {
  return { ...piece, gx: piece.gx + dx, gz: piece.gz + dz, base: piece.base + dy }
}

function touches(a: Set<string>, b: Set<string>) {
  for (const cell of a) {
    for (const next of neighbors(cell)) if (b.has(next)) return true
  }
  return false
}

function overlaps(a: Set<string>, b: Set<string>) {
  for (const cell of a) if (b.has(cell)) return true
  return false
}

function suggest(pieces: Piece[], island: number[], mainIds: number[]) {
  const main = occupied(pieces, mainIds)
  let best: { dx: number; dz: number; dy: number; score: number } | null = null
  for (let dy = 0; dy >= -30; dy -= 1) {
    for (let radius = 0; radius <= 12; radius += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        for (let dz = -radius; dz <= radius; dz += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue
          const moved = island.map((id) => translate(pieces[id], dx, dz, dy))
          if (moved.some((piece) => piece.base < 0)) continue
          const cellsNow = new Set<string>()
          let clash = false
          for (const piece of moved) {
            for (const cell of cells(piece)) {
              if (main.has(cell) || cellsNow.has(cell)) {
                clash = true
                break
              }
              cellsNow.add(cell)
            }
            if (clash) break
          }
          if (clash) continue
          if (!touches(cellsNow, main)) continue
          const score = Math.abs(dx) + Math.abs(dz) + Math.abs(dy) * 2
          if (!best || score < best.score) best = { dx, dz, dy, score }
        }
      }
      if (best && best.score <= radius) return best
    }
  }
  return best
}

for (const model of MAGIC_MODELS) {
  try {
    bricksFromMagic(model.pieces)
  } catch (error) {
    console.log(`OVERLAP ${model.id} ${error instanceof Error ? error.message : error}`)
    continue
  }
  const pieces = model.pieces.map((piece) => ({ ...piece }))
  const groups = groupIds(pieces)
  if (groups.length === 1) {
    console.log(`OK ${model.id} ${pieces.length}`)
    continue
  }
  console.log(`-- ${model.id} ${model.name} parts=${groups.length} n=${pieces.length}`)
  const main = groups[0]
  for (const island of groups.slice(1)) {
    const move = suggest(pieces, island, main)
    const sample = island
      .slice(0, 4)
      .map((id) => `${pieces[id].type}@${pieces[id].gx},${pieces[id].gz},b${pieces[id].base}`)
      .join(' ')
    console.log(
      `  n=${island.length} ${move ? `dx=${move.dx} dz=${move.dz} dy=${move.dy}` : 'NO MOVE'} ${sample}${island.length > 4 ? ' …' : ''}`,
    )
  }
}
