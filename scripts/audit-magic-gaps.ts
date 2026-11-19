import { MAGIC_MODELS, magicComponents, type MagicPiece } from '../src/pages/matupix/brick/brickMagicModels.ts'
import { footprint, partPlates } from '../src/pages/matupix/brick/brickTypes.ts'

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

function centerOf(piece: MagicPiece) {
  const { width, depth } = footprint(piece.type, piece.rotation)
  const plates = partPlates(piece.type)
  return {
    x: piece.gx + width / 2,
    y: piece.base + plates / 2,
    z: piece.gz + depth / 2,
  }
}

function hasSupportOrNeighbor(piece: MagicPiece, occupied: Set<string>) {
  const { width, depth } = footprint(piece.type, piece.rotation)
  // any cell directly below base
  if (piece.base === 0) return true
  for (let x = 0; x < width; x += 1) {
    for (let z = 0; z < depth; z += 1) {
      if (occupied.has(`${piece.gx + x},${piece.base - 1},${piece.gz + z}`)) return true
    }
  }
  return false
}

function horizontalGaps(pieces: MagicPiece[]) {
  const occupied = new Set<string>()
  for (const piece of pieces) for (const cell of cellsOf(piece)) occupied.add(cell)

  const suspicious: string[] = []
  let floating = 0
  for (let i = 0; i < pieces.length; i += 1) {
    const a = pieces[i]
    if (!hasSupportOrNeighbor(a, occupied)) floating += 1
    const ca = centerOf(a)
    for (let j = i + 1; j < pieces.length; j += 1) {
      const b = pieces[j]
      const cb = centerOf(b)
      const dx = Math.abs(ca.x - cb.x)
      const dy = Math.abs(ca.y - cb.y)
      const dz = Math.abs(ca.z - cb.z)
      const dist = Math.hypot(dx, dy / 3, dz)
      if (dist < 2.2 || dist > 5.5) continue
      // mid-point empty check on xz at average layer
      const mx = Math.round((ca.x + cb.x) / 2)
      const mz = Math.round((ca.z + cb.z) / 2)
      const my = Math.round((ca.y + cb.y) / 2)
      const midHit = [...occupied].some((key) => {
        const [x, y, z] = key.split(',').map(Number)
        return x === mx && z === mz && Math.abs(y - my) <= 2
      })
      if (!midHit && dy < 4) suspicious.push(`${a.type}@${a.gx},${a.gz}b${a.base} <-> ${b.type}@${b.gx},${b.gz}b${b.base} d=${dist.toFixed(1)}`)
    }
  }
  return { floating, suspicious: suspicious.slice(0, 12), suspiciousCount: suspicious.length }
}

for (const model of MAGIC_MODELS) {
  const comps = magicComponents(model.pieces)
  const { floating, suspicious, suspiciousCount } = horizontalGaps(model.pieces)
  const flag = comps.length > (model.size === 'large' ? 6 : 1) || floating > 0 || suspiciousCount > 8
  if (!flag && model.size === 'small' && suspiciousCount <= 8) {
    console.log(`OK ${model.id} n=${model.pieces.length} comps=${comps.join('+')} float=${floating} gaps~${suspiciousCount}`)
    continue
  }
  console.log(`?? ${model.id} n=${model.pieces.length} comps=${comps.join('+')} float=${floating} gaps~${suspiciousCount}`)
  for (const line of suspicious.slice(0, 5)) console.log('   ', line)
}
