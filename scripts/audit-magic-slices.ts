import { magicComponents, magicLayout } from '../src/pages/matupix/brick/brickMagicModels'
import { footprint, partPlates } from '../src/pages/matupix/brick/brickTypes'

function cells(piece: { type: Parameters<typeof footprint>[0]; rotation: 0 | 90 | 180 | 270; gx: number; gz: number; base: number }) {
  const { width, depth } = footprint(piece.type, piece.rotation)
  const plates = partPlates(piece.type)
  const out: Array<[number, number, number]> = []
  for (let layer = 0; layer < plates; layer += 1) {
    for (let x = 0; x < width; x += 1) for (let z = 0; z < depth; z += 1) out.push([piece.gx + x, piece.base + layer, piece.gz + z])
  }
  return out
}

function neighbors(x: number, y: number, z: number) {
  return [
    [x + 1, y, z],
    [x - 1, y, z],
    [x, y + 1, z],
    [x, y - 1, z],
    [x, y, z + 1],
    [x, y, z - 1],
  ]
}

const want = new Set(process.argv.slice(2))
for (const id of ['race', 'port', 'dino-park', 'farm', 'airport', 'fire-station', 'space', 'sport']) {
  const layout = magicLayout(id)
  if (!layout) continue
  for (const [label, pieces] of layout) {
    const key = `${id}:${label}`
    if (want.size && !want.has(key) && !want.has(id)) continue
    const parts = magicComponents(pieces)
    if (parts.length === 1) continue
    const owner = new Map<string, number>()
    const lists = pieces.map((piece) => cells(piece))
    lists.forEach((list, index) => {
      for (const [x, y, z] of list) owner.set(`${x},${y},${z}`, index)
    })
    const parent = pieces.map((_, index) => index)
    const find = (n: number): number => (parent[n] === n ? n : (parent[n] = find(parent[n])))
    lists.forEach((list, index) => {
      for (const [x, y, z] of list) {
        for (const [nx, ny, nz] of neighbors(x, y, z)) {
          const other = owner.get(`${nx},${ny},${nz}`)
          if (other !== undefined) parent[find(other)] = find(index)
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
    const ordered = [...groups.values()].sort((a, b) => b.length - a.length)
    console.log(`\n${key} ${parts.join('+')}`)
    const main = new Set(ordered[0])
    const mainCells: Array<[number, number, number]> = []
    for (const index of ordered[0]) mainCells.push(...lists[index])
    for (const island of ordered.slice(1)) {
      let best = 99
      let how = ''
      for (const index of island) {
        for (const [x, y, z] of lists[index]) {
          for (const [mx, my, mz] of mainCells) {
            const dist = Math.abs(x - mx) + Math.abs(y - my) + Math.abs(z - mz)
            if (dist < best) {
              best = dist
              how = `${pieces[index].type}@${pieces[index].gx},${pieces[index].gz},b${pieces[index].base} -> ${mx},${my},${mz} from ${x},${y},${z}`
            }
          }
        }
      }
      const names = island
        .map((index) => `${pieces[index].type}@${pieces[index].gx},${pieces[index].gz},b${pieces[index].base}`)
        .join(' ')
      console.log(`  n=${island.length} gap=${best} ${how} :: ${names}`)
    }
  }
}
