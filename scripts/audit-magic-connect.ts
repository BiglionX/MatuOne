import { MAGIC_MODELS, bricksFromMagic } from '../src/pages/matupix/brick/brickMagicModels'
import { footprint, occupancyKeys, partPlates } from '../src/pages/matupix/brick/brickTypes'

type Cell = string

function cellsOf(brick: { type: string; rotation: 0 | 90 | 180 | 270; position: [number, number, number] }) {
  return occupancyKeys(brick)
}

function neighbors(key: string): string[] {
  const [x, y, z] = key.split(',').map(Number)
  return [
    `${x + 1},${y},${z}`,
    `${x - 1},${y},${z}`,
    `${x},${y + 1},${z}`,
    `${x},${y - 1},${z}`,
    `${x},${y},${z + 1}`,
    `${x},${y},${z - 1}`,
  ]
}

function components(bricks: ReturnType<typeof bricksFromMagic>) {
  const owner = new Map<Cell, number>()
  const lists: Cell[][] = []
  bricks.forEach((brick, index) => {
    const cells = cellsOf(brick)
    lists[index] = cells
    for (const cell of cells) owner.set(cell, index)
  })
  const parent = bricks.map((_, index) => index)
  const find = (id: number): number => {
    let cursor = id
    while (parent[cursor] !== cursor) cursor = parent[cursor]
    let walk = id
    while (parent[walk] !== cursor) {
      const next = parent[walk]
      parent[walk] = cursor
      walk = next
    }
    return cursor
  }
  const unite = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[ra] = rb
  }
  bricks.forEach((_, index) => {
    for (const cell of lists[index]) {
      for (const next of neighbors(cell)) {
        const other = owner.get(next)
        if (other !== undefined && other !== index) unite(index, other)
      }
    }
  })
  const groups = new Map<number, number[]>()
  bricks.forEach((_, index) => {
    const root = find(index)
    const list = groups.get(root) ?? []
    list.push(index)
    groups.set(root, list)
  })
  return [...groups.values()].sort((a, b) => b.length - a.length)
}

for (const model of MAGIC_MODELS) {
  let bricks: ReturnType<typeof bricksFromMagic>
  try {
    bricks = bricksFromMagic(model.pieces)
  } catch (error) {
    console.log(`FAIL ${model.id} ${error instanceof Error ? error.message : error}`)
    continue
  }
  const groups = components(bricks)
  const minBase = Math.min(...model.pieces.map((piece) => piece.base))
  const grounded = model.pieces.filter((piece) => piece.base === 0).length
  console.log(
    `${model.id}\t${model.name}\t${model.size}\tpieces=${model.pieces.length}\tbricks=${bricks.length}\tcomponents=${groups.length}\tminBase=${minBase}\tground=${grounded}`,
  )
  if (groups.length === 1) continue
  const main = new Set(groups[0])
  const mainCells = new Set<string>()
  for (const index of groups[0]) for (const cell of cellsOf(bricks[index])) mainCells.add(cell)
  for (const group of groups.slice(1)) {
    const sample = group
      .slice(0, 6)
      .map((index) => {
        const piece = model.pieces[index]
        const brick = bricks[index]
        return `${piece.type}@${piece.gx},${piece.gz},b${piece.base} y=${brick.position[1].toFixed(2)}`
      })
      .join(' | ')
    let best = Infinity
    let bestCell = ''
    for (const index of group) {
      for (const cell of cellsOf(bricks[index])) {
        const [x, y, z] = cell.split(',').map(Number)
        for (const other of mainCells) {
          const [ox, oy, oz] = other.split(',').map(Number)
          const dist = Math.abs(x - ox) + Math.abs(y - oy) + Math.abs(z - oz)
          if (dist < best) {
            best = dist
            bestCell = `${cell} ~ ${other}`
          }
        }
      }
    }
    console.log(`  island ${group.length} gap=${best} ${bestCell} :: ${sample}`)
  }
  void partPlates
  void footprint
}
