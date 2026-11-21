// 魔法模型结构审计。
//
// 审计的是「渲染端真正摆出来的几何」，而不是数据表里的坐标 ——
// 数据表看着对、渲染歪了是最难查的一类问题，所以这里按渲染链复算。
//
// 渲染链（brickPartModel.alignPart + BrickScene 的 ldraw 分支）：
//   world(v) = P + o' + G⁻¹·R·v
//     P  = brick.position（落点，渲染坐标：Y 向上、1 钉 = 20 LDU、1 格高 = 24 LDU）
//     o' = alignPart() 的对齐偏移（用零件未旋转时的包围盒算）
//     G⁻¹ = diag(1/20, −1/24, −1/20)
//     R  = 官方矩阵
//
// 官方链（LDraw OMR 模型）：
//   world(v) = M0 + G⁻¹·(T + R·v)
//   M0 = 模型级偏移：贴地 + 水平居中
//
// 保真条件：逐件满足 P + o' == M0 + G⁻¹·T。
// 过了保真这一关，渲染出来的东西就和官方模型逐点重合，造型不会失真、零件不会错位。
//
// 之后的结构检查：
//   重叠：两两实体内嵌测试（点在对方实体内 → 真的嵌进去了）
//   悬空：接触图 + 连通分量，没连到地面的分量就是悬空的
//   连通：一个模型应该是一整块，不该散成好几堆
//   底板：模型最低点落在 y = 0
//
// 用法：npx tsx scripts/audit-magic-models.ts [模型 id] [--debug]
import { MAGIC_MODEL_DATA, MAGIC_PART_DATA } from '../src/pages/matupix/brick/brickMagicData.ts'
import { MAGIC_PARTS } from '../src/pages/matupix/brick/brickMagicParts.ts'
import { apply, compose, emptyBox, grow, indexLibrary } from './ldraw-geom.ts'
import {
  alignOffset,
  boxOfTris,
  GINV,
  HEIGHT,
  isPrimitive,
  partBox,
  partDesc,
  partTriangles,
  rotMatrix,
  STUD,
  transformTris,
  translate,
  type Tri,
  type Vec3,
} from './audit-solid.ts'
import { findOverlaps } from './audit-overlap.ts'
import { classifyOverlap, type ConnectionPart } from './audit-connection.ts'
import { expandFile, indexModels, LIB, MODEL_DIR, MODEL_SOURCES } from './omr-source.ts'

/** 接触判定容差（LDU）。官方模型的零件是严丝合缝的，2 LDU 足够覆盖浮点误差。 */
const CONTACT_EPS = 2
/** 判定「贴地」的容差（LDU）。 */
const GROUND_EPS = 2

type Instance = {
  index: number
  /** 零件的 LDraw 路径。 */
  file: string
  /** 渲染落点。 */
  position: Vec3
  /** 渲染世界坐标里的三角形。 */
  tris: Tri[]
  box: ReturnType<typeof boxOfTris>
  /** LDraw 官方坐标系里的三角形（重叠检测用它，坐标系统一、不受对齐偏移影响）。 */
  solidTris: Tri[]
  /** 官方坐标系 → 零件局部坐标系（判断重叠落在钉区还是砖体）。 */
  toLocal: (p: Vec3) => Vec3
  /** 零件自身局部坐标下的包围盒（未旋转）。 */
  localBox: ReturnType<typeof partBox>
  /** 零件的官方名。 */
  desc: string
  /** 是不是 LDraw 原始图元（装饰几何，不参与结构判定）。 */
  primitive: boolean
}

type Report = {
  id: string
  pieces: number
  /** 保真误差（渲染落点 vs 官方落点），单位 LDU。 */
  fidelity: number
  /** 实体内嵌的零件对数（剔除设计好的连接后）。 */
  overlaps: number
  /** 设计好的连接（钉插管孔、球关节、紧配合、薄层公差）有多少对。 */
  connections: number
  /** 没有连到地面的零件数。 */
  floating: number
  /** 连通分量数。 */
  components: number
  /** 模型最低点（渲染坐标）。 */
  ground: number
  notes: string[]
}

const debug = process.argv.includes('--debug')

/**
 * 官方坐标 → 零件局部坐标。
 * 局部 = Rᵀ · (p − pos)：R 是正交矩阵，转置就是逆。
 */
function toLocalFactory(pos: Vec3, rot: readonly number[]): (p: Vec3) => Vec3 {
  const [a, b, c, d, e, f, g, h, i] = rot
  return (p: Vec3): Vec3 => {
    const dx = p[0] - pos[0]
    const dy = p[1] - pos[1]
    const dz = p[2] - pos[2]
    return [
      a * dx + d * dy + g * dz,
      b * dx + e * dy + h * dz,
      c * dx + f * dy + i * dz,
    ]
  }
}

function auditModel(id: string): Report {
  const source = MODEL_SOURCES.find((item) => item.id === id)
  if (!source) throw new Error(`未知模型 ${id}`)
  const data = MAGIC_MODEL_DATA.find((item) => item.id === id)
  if (!data) throw new Error(`数据里没有模型 ${id}`)

  const notes: string[] = []
  const official = expandFile(source.file)
  if (official.length !== data.pieces.length) {
    notes.push(`件数对不上：官方 ${official.length}，数据 ${data.pieces.length}`)
  }

  // 官方模型的几何范围（LDraw 坐标）与模型级偏移 M0。
  const officialBox = emptyBox()
  for (const item of official) {
    const box = partBox(item.file)
    for (const x of [box.minX, box.maxX]) {
      for (const y of [box.minY, box.maxY]) {
        for (const z of [box.minZ, box.maxZ]) {
          const p = apply(item.xform, [x, y, z])
          grow(officialBox, p[0], p[1], p[2])
        }
      }
    }
  }
  const m0: Vec3 = [
    -(officialBox.minX + officialBox.maxX) / (2 * STUD),
    officialBox.maxY / HEIGHT,
    (officialBox.minZ + officialBox.maxZ) / (2 * STUD),
  ]

  const instances: Instance[] = []
  let fidelity = 0

  for (let index = 0; index < data.pieces.length; index += 1) {
    const piece = data.pieces[index]
    const part = MAGIC_PART_DATA[piece.part]
    const partInfo = MAGIC_PARTS[piece.part]
    const officialItem = official[index]
    const offset = alignOffset(part.path, partInfo.plates)

    // 保真：渲染落点 + 对齐偏移 必须等于 官方落点 + M0。
    if (officialItem) {
      const expected: Vec3 = [
        m0[0] + officialItem.xform.x / STUD,
        m0[1] - officialItem.xform.y / HEIGHT,
        m0[2] - officialItem.xform.z / STUD,
      ]
      const actual: Vec3 = [
        piece.position[0] + offset[0],
        piece.position[1] + offset[1],
        piece.position[2] + offset[2],
      ]
      const delta = Math.max(
        Math.abs(actual[0] - expected[0]) * STUD,
        Math.abs(actual[1] - expected[1]) * HEIGHT,
        Math.abs(actual[2] - expected[2]) * STUD,
      )
      if (delta > fidelity) fidelity = delta

      // 官方矩阵也要对上：姿态错了，形状就歪了。
      const rot = piece.rot
      const rotDelta = Math.max(
        Math.abs(rot[0] - officialItem.xform.a),
        Math.abs(rot[1] - officialItem.xform.b),
        Math.abs(rot[2] - officialItem.xform.c),
        Math.abs(rot[3] - officialItem.xform.d),
        Math.abs(rot[4] - officialItem.xform.e),
        Math.abs(rot[5] - officialItem.xform.f),
        Math.abs(rot[6] - officialItem.xform.g),
        Math.abs(rot[7] - officialItem.xform.h),
        Math.abs(rot[8] - officialItem.xform.i),
      )
      if (rotDelta > 1e-6) notes.push(`#${index} 官方矩阵对不上，差 ${rotDelta.toFixed(6)}`)
      const posDelta = Math.max(
        Math.abs(piece.pos[0] - officialItem.xform.x),
        Math.abs(piece.pos[1] - officialItem.xform.y),
        Math.abs(piece.pos[2] - officialItem.xform.z),
      )
      if (posDelta > 0.01) notes.push(`#${index} 官方坐标对不上，差 ${posDelta.toFixed(3)} LDU`)
    }

    // 渲染世界变换：translate(P + o') ∘ G⁻¹ ∘ R
    const world = compose(
      translate(
        piece.position[0] + offset[0],
        piece.position[1] + offset[1],
        piece.position[2] + offset[2],
      ),
      compose(GINV, rotMatrix(piece.rot)),
    )
    const localTris = partTriangles(part.path)
    const tris = transformTris(localTris, world)
    instances.push({
      index,
      file: part.path,
      position: piece.position,
      tris,
      box: boxOfTris(tris),
      solidTris: transformTris(
        localTris,
        compose(translate(piece.pos[0], piece.pos[1], piece.pos[2]), rotMatrix(piece.rot)),
      ),
      toLocal: toLocalFactory(piece.pos, piece.rot),
      localBox: partBox(part.path),
      desc: partDesc(part.path),
      primitive: isPrimitive(part.path),
    })
  }

  // ---- 重叠：体积嵌入 ----
  // 用奇偶射线法在 LDraw 官方坐标系里判「实心区域是否互相嵌进去」，
  // 详情见 scripts/audit-overlap.ts。
  //
  // 嵌进去不一定是不合理的：真实乐高里下方零件的钉要插进上方零件的管孔，
  // 那段体积是真重叠，但它是设计好的连接。scripts/audit-connection.ts
  // 按积木的连接语义把两类分开，只有「穿模」才算问题。
  //
  // LDraw 原始图元（圆弧、球面、圆环）没有实体厚度，是官方模型拿来做装饰的，
  // 拿它们判重叠只会得到假问题，直接不参与这一项。
  const connectionParts = new Map<string, ConnectionPart>()
  const overlapHits = findOverlaps(
    instances
      .filter((instance) => !instance.primitive)
      .map((instance) => {
        const label = `#${instance.index} ${instance.file.split('/').pop()}`
        connectionParts.set(label, {
          label,
          localBox: instance.localBox,
          toLocal: instance.toLocal,
          desc: instance.desc,
          primitive: instance.primitive,
        })
        return { label, tris: instance.solidTris }
      }),
  )

  let connections = 0
  const spuriousHits: typeof overlapHits = []
  for (const hit of overlapHits) {
    const a = connectionParts.get(hit.a)
    const b = connectionParts.get(hit.b)
    if (!a || !b) continue
    const verdict = classifyOverlap(a, b, hit.points)
    if (verdict.kind === 'spurious') {
      spuriousHits.push(hit)
      continue
    }
    connections += 1
  }

  const overlaps = spuriousHits.length
  const overlapNotes = spuriousHits.slice(0, 8).map(
    (hit) =>
      `${hit.a} 与 ${hit.b} 穿模 约 ${hit.volume.toFixed(0)} LDU³` +
      `（${hit.hits}/${hit.samples} 个采样点同时落在双方实体内）`,
  )

  // ---- 接触图：谁挨着谁 ----
  // 原始图元没有实体厚度，不参与连通性判定。
  const structural = instances.filter((instance) => !instance.primitive)
  const parent = structural.map((_, index) => index)
  const find = (node: number): number => {
    let root = node
    while (parent[root] !== root) root = parent[root]
    let current = node
    while (parent[current] !== root) {
      const next = parent[current]
      parent[current] = root
      current = next
    }
    return root
  }
  const union = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[rb] = ra
  }
  for (let i = 0; i < structural.length; i += 1) {
    for (let j = i + 1; j < structural.length; j += 1) {
      const a = structural[i]
      const b = structural[j]
      const gapX = Math.max(a.box.minX - b.box.maxX, b.box.minX - a.box.maxX)
      const gapY = Math.max(a.box.minY - b.box.maxY, b.box.minY - a.box.maxY)
      const gapZ = Math.max(a.box.minZ - b.box.maxZ, b.box.minZ - a.box.maxZ)
      if (Math.max(gapX, gapY, gapZ) <= CONTACT_EPS) union(i, j)
    }
  }

  // ---- 连通分量 / 悬空 ----
  const groups = new Map<number, number[]>()
  for (let index = 0; index < structural.length; index += 1) {
    const root = find(index)
    const list = groups.get(root)
    if (list) list.push(index)
    else groups.set(root, [index])
  }
  let floating = 0
  const floatingNotes: string[] = []
  for (const group of groups.values()) {
    const onGround = group.some((index) => structural[index].box.minY <= GROUND_EPS)
    if (onGround) continue
    floating += group.length
    if (floatingNotes.length < 8) {
      const first = structural[group[0]]
      floatingNotes.push(
        `#${group.join(',#')} 悬空（${first.file.split('/').pop()}，离地 ${first.box.minY.toFixed(1)} LDU）`,
      )
    }
  }

  const modelBox = emptyBox()
  for (const instance of structural) {
    grow(modelBox, instance.box.minX, instance.box.minY, instance.box.minZ)
    grow(modelBox, instance.box.maxX, instance.box.maxY, instance.box.maxZ)
  }

  if (debug && groups.size > 1) {
    // 官方模型里确实存在彼此分离的结构（比如火车站的列车停在站台外）。
    // 分开报出来，方便人工确认而不是当成问题。
    for (const group of groups.values()) {
      const kinds = new Map<string, number>()
      for (const index of group) {
        const name = structural[index].file.split('/').pop() ?? '?'
        kinds.set(name, (kinds.get(name) ?? 0) + 1)
      }
      const summary = [...kinds.entries()].map(([name, count]) => `${name}×${count}`).join(' ')
      notes.push(`分离结构 ${group.length} 件：${summary.slice(0, 160)}`)
    }
  }

  notes.push(...overlapNotes, ...floatingNotes)
  return {
    id,
    pieces: instances.length,
    fidelity,
    overlaps,
    connections,
    floating,
    components: groups.size,
    ground: modelBox.minY,
    notes,
  }
}

function main() {
  const only = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  indexLibrary(['public/ldraw/parts', 'public/ldraw/p', `${LIB}/parts`, `${LIB}/p`, MODEL_DIR])
  indexModels()

  const ids = only ? [only] : MODEL_SOURCES.map((item) => item.id)
  const reports: Report[] = []
  for (const id of ids) {
    try {
      reports.push(auditModel(id))
    } catch (error) {
      console.log(`  ! ${id} 审计失败：${(error as Error).message}`)
    }
  }

  console.log('模型          件数  保真Δ    穿模  合规  悬空  分量  底面')
  let bad = 0
  for (const report of reports) {
    const flag =
      report.fidelity > 0.5 || report.overlaps > 0 || report.floating > 0 || Math.abs(report.ground) > 1 ? ' !' : ''
    if (flag) bad += 1
    console.log(
      `  ${report.id.padEnd(13)} ${String(report.pieces).padStart(4)}  ${report.fidelity.toFixed(3).padStart(7)}  ${String(report.overlaps).padStart(4)}  ${String(report.connections).padStart(4)}  ${String(report.floating).padStart(4)}  ${String(report.components).padStart(4)}  ${report.ground.toFixed(2).padStart(6)}${flag}`,
    )
    for (const note of report.notes) console.log(`      ${note}`)
  }
  const pieces = reports.reduce((sum, report) => sum + report.pieces, 0)
  console.log(`合计 ${reports.length} 个模型 / ${pieces} 件，问题模型 ${bad} 个`)
  if (bad > 0) process.exitCode = 1
}

main()
