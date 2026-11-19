import { MAGIC_MODELS, type MagicPiece } from '../src/pages/matupix/brick/brickMagicModels'
import { footprint, partPlates } from '../src/pages/matupix/brick/brickTypes'

function cellsOf(piece: MagicPiece) {
  const { width, depth } = footprint(piece.type, piece.rotation)
  const plates = partPlates(piece.type)
  const cells: Array<[number, number, number]> = []
  for (let layer = 0; layer < plates; layer += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let z = 0; z < depth; z += 1) cells.push([piece.gx + x, piece.base + layer, piece.gz + z])
    }
  }
  return cells
}

for (const item of MAGIC_MODELS) {
  const owners = new Map<string, number>()
  const lists = item.pieces.map((piece) => {
    const cells = cellsOf(piece)
    for (const [x, y, z] of cells) owners.set(`${x},${y},${z}`, owners.size === 0 ? 0 : 0)
    return cells
  })
  item.pieces.forEach((piece, index) => {
    for (const [x, y, z] of lists[index]) owners.set(`${x},${y},${z}`, index)
  })
  const loose: string[] = []
  item.pieces.forEach((piece, index) => {
    const { width, depth } = footprint(piece.type, piece.rotation)
    const area = width * depth
    if (area < 4) return
    const horizontal = new Set<string>()
    const stacked = new Set<string>()
    for (const [x, y, z] of lists[index]) {
      for (const [nx, nz] of [
        [x + 1, z],
        [x - 1, z],
        [x, z + 1],
        [x, z - 1],
      ] as const) {
        const other = owners.get(`${nx},${y},${nz}`)
        if (other !== undefined && other !== index) horizontal.add(`${x},${z}`)
      }
      for (const ny of [y - 1, y + 1]) {
        const other = owners.get(`${x},${ny},${z}`)
        if (other !== undefined && other !== index) stacked.add(`${x},${z}`)
      }
    }
    const long = Math.max(width, depth) >= 4
    if (long && horizontal.size < 2 && stacked.size * 2 < area) {
      loose.push(`${piece.type}@${piece.gx},${piece.gz},b${piece.base} 边${horizontal.size} 叠${stacked.size}/${area}`)
    }
  })
  if (loose.length) console.log(`${item.id}\n  ${loose.join('\n  ')}`)
}
