import { MAGIC_MODELS, magicComponents } from '../src/pages/matupix/brick/brickMagicModels.ts'
import { footprint, partPlates } from '../src/pages/matupix/brick/brickTypes.ts'

const heli = MAGIC_MODELS.find((m) => m.id === 'heli')
if (!heli) throw new Error('missing heli')
console.log('heli components', magicComponents(heli.pieces))
for (const p of heli.pieces) {
  const fp = footprint(p.type, p.rotation)
  const plates = partPlates(p.type)
  console.log([p.type, p.gx, p.gz, p.base, p.rotation, `${fp.width}x${fp.depth}`, plates, p.base + plates].join('\t'))
}
