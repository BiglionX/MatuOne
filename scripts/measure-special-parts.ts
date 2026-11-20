import { Box3, Group, LoadingManager, Mesh, LineSegments } from 'three'
import { LDrawLoader } from 'three/examples/jsm/loaders/LDrawLoader.js'
import { LDrawConditionalLineMaterial } from 'three/examples/jsm/materials/LDrawConditionalLineMaterial.js'
import { BRICK_PARTS, partHeight, type BrickType } from '../src/pages/matupix/brick/brickTypes.ts'

if (typeof (globalThis as any).ProgressEvent === 'undefined') { (globalThis as any).ProgressEvent = class ProgressEvent { constructor(type: string, init: any = {}) { this.type = type; Object.assign(this, init) } } }
const STUD = 20
const HEIGHT = 24
const EXTRA_ROOTS = new Set(['3023b.dat', '3794a.dat', '4032a.dat', '6141.dat', '3815.dat', '3816.dat', '3817.dat', '3048a.dat'].map((n) => n.toLowerCase()))
const ROOT = new Set([...BRICK_PARTS.map((p) => `${p.ldraw}.dat`), ...EXTRA_ROOTS].map((n) => n.toLowerCase()))

function rewrite(url: string) {
  const marker = '/ldraw/'
  const index = url.indexOf(marker)
  if (index < 0) return url
  const prefix = url.slice(0, index + marker.length)
  let rel = url.slice(index + marker.length).replace(/\\/g, '/')
  while (rel.startsWith('parts/parts/')) rel = rel.slice('parts/'.length)
  if (rel.startsWith('parts/p/')) rel = rel.slice('parts/'.length)
  if (rel.startsWith('parts/48/')) rel = `p/${rel.slice('parts/'.length)}`
  if (rel.startsWith('parts/8/')) rel = `p/${rel.slice('parts/'.length)}`
  const flat = /^parts\/([^/]+\.dat)$/i.exec(rel)
  if (flat && !ROOT.has(flat[1].toLowerCase())) rel = `p/${flat[1]}`
  return prefix + rel
}

const special: BrickType[] = [
  'propeller',
  'bar-4l',
  'antenna',
  'tyre',
  'tyre-small',
  'windscreen',
  'seat',
  'door',
  'window',
  'flower',
  'bush',
  'steer',
  'grille',
  'canopy',
  'flag',
  'sword',
  'shield',
  'cup',
  'star',
  'leaves',
  'fence',
  'legs',
  'torso',
  'head',
  'hair',
  'hip',
  'arm-left',
  'hand',
]

async function main() {
  const manager = new LoadingManager()
  manager.setURLModifier(rewrite)
  const loader = new LDrawLoader(manager)
  loader.setPath('http://127.0.0.1:5174/ldraw/')
  loader.setPartsLibraryPath('http://127.0.0.1:5174/ldraw/')
  loader.setConditionalLineMaterial(LDrawConditionalLineMaterial)

  for (const type of special) {
    const info = BRICK_PARTS.find((p) => p.type === type)
    if (!info) continue
    try {
      const group = (await loader.loadAsync(`parts/${info.ldraw}.dat`)) as Group
      group.traverse((obj) => {
        if (obj instanceof LineSegments) {
          obj.removeFromParent()
        }
      })
      group.rotation.x = Math.PI
      group.scale.set(1 / STUD, 1 / HEIGHT, 1 / STUD)
      group.updateMatrixWorld(true)
      const box = new Box3().setFromObject(group)
      const sx = box.max.x - box.min.x
      const sy = box.max.y - box.min.y
      const sz = box.max.z - box.min.z
      const declaredH = partHeight(type)
      const declaredW = info.studs[0]
      const declaredD = info.studs[1]
      const bad =
        Math.abs(sx - declaredW) > 0.55 || Math.abs(sz - declaredD) > 0.55 || Math.abs(sy - declaredH) > 0.45
      console.log(
        `${bad ? 'BAD' : 'ok '} ${type.padEnd(14)} mesh ${sx.toFixed(2)}x${sy.toFixed(2)}x${sz.toFixed(2)}  decl ${declaredW}x${declaredH.toFixed(2)}x${declaredD}  plates ${info.plates}  file ${info.ldraw}`,
      )
    } catch (error) {
      console.log(`ERR ${type}`, error instanceof Error ? error.message : error)
    }
  }
}

main()

