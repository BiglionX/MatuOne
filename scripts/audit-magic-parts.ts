import { MAGIC_MODELS, magicComponents, type MagicPiece } from '../src/pages/matupix/brick/brickMagicModels'
import { footprint, partPlates } from '../src/pages/matupix/brick/brickTypes'

function cellsOf(piece: MagicPiece) {
  const { width, depth } = footprint(piece.type, piece.rotation)
  const plates = partPlates(piece.type)
  const cells: string[] = []
  for (let layer = 0; layer < plates; layer += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let z = 0; z < depth; z += 1) cells.push(`${piece.gx + x},${piece.base + layer},${piece.gz + z}`)
    }
  }
  return cells
}

function components(pieces: MagicPiece[]) {
  const owner = new Map<string, number>()
  const lists = pieces.map((piece, index) => {
    const cells = cellsOf(piece)
    for (const cell of cells) owner.set(cell, index)
    return cells
  })
  const parent = pieces.map((_, index) => index)
  const find = (id: number): number => {
    let cursor = id
    while (parent[cursor] !== cursor) cursor = parent[cursor]
    return cursor
  }
  const unite = (a: number, b: number) => {
    const left = find(a)
    const right = find(b)
    if (left !== right) parent[right] = left
  }
  const neighbors = (cell: string) => {
    const [x, y, z] = cell.split(',').map(Number)
    return [`${x + 1},${y},${z}`, `${x - 1},${y},${z}`, `${x},${y + 1},${z}`, `${x},${y - 1},${z}`, `${x},${y},${z + 1}`, `${x},${y},${z - 1}`]
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
  return [...groups.values()].sort((a, b) => a.length - b.length)
}

for (const id of ['site', 'sport']) {
  const item = MAGIC_MODELS.find((model) => model.id === id)
  if (!item) continue
  const groups = components(item.pieces)
  console.log(id, magicComponents(item.pieces).join('+'))
  const small = groups[0]
  if (!small || groups.length < 2) continue
  console.log(
    small
      .map((index) => {
        const piece = item.pieces[index]
        return `${piece.type}@${piece.gx},${piece.gz},b${piece.base}`
      })
      .join('\n'),
  )
}
