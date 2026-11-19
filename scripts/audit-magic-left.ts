import { MAGIC_MODELS, magicComponents } from '../src/pages/matupix/brick/brickMagicModels'
import { footprint, partPlates } from '../src/pages/matupix/brick/brickTypes'

function cells(piece: { type: Parameters<typeof footprint>[0]; rotation: 0 | 90 | 180 | 270; gx: number; gz: number; base: number }) {
  const { width, depth } = footprint(piece.type, piece.rotation)
  const plates = partPlates(piece.type)
  const out: string[] = []
  for (let layer = 0; layer < plates; layer += 1) {
    for (let x = 0; x < width; x += 1) for (let z = 0; z < depth; z += 1) out.push(`${piece.gx + x},${piece.base + layer},${piece.gz + z}`)
  }
  return out
}

const names = process.argv.slice(2).filter((name) => name !== '--all')
for (const model of MAGIC_MODELS) {
  if (names.length && !names.includes(model.id)) continue
  const seen = new Map<string, number>()
  model.pieces.forEach((piece, index) => {
    for (const cell of cells(piece)) {
      const prev = seen.get(cell)
      if (prev !== undefined) {
        const other = model.pieces[prev]
        console.log(
          `OVERLAP ${model.id} #${index} ${piece.type}@${piece.gx},${piece.gz},b${piece.base} hits #${prev} ${other.type}@${other.gx},${other.gz},b${other.base} ${cell}`,
        )
      } else seen.set(cell, index)
    }
  })
  const parts = magicComponents(model.pieces)
  console.log(`${model.id} components=${parts.length} ${parts.join('+')} n=${model.pieces.length}`)
}
