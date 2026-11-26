/**
 * Blockly 第一学期 80 关的「规则层」：积木定义、程序 DSL、地图构造和路线变换。
 *
 * 这一层不关心关卡编号、标题和 SQL，只回答三个问题：
 *   1. 一段程序怎么写（DSL）；
 *   2. 一条路线怎么变成网格地图（corridor / room 两种场地）；
 *   3. 同一条路线怎么变出不同的走法（旋转、镜像、反向）。
 *
 * 编排层在 generate-blockly-80.mjs：它按 U1…U5 的教学节奏挑路线、定标题、拼 SQL。
 *
 * 这里产出的程序节点就是解释器吃的 BlockExecutionNode 形状（type / args / next / children），
 * 所以生成器可以直接拿生产解释器自校验，不需要另写一套模拟器。
 */

/** 第一学期的学期号和单元号。 */
export const TERM_ID = 'blk-g1-fall'

export const UNIT_IDS = {
  U1: 'blk-g1-fall-u1',
  U2: 'blk-g1-fall-u2',
  U3: 'blk-g1-fall-u3',
  U4: 'blk-g1-fall-u4',
  U5: 'blk-g1-fall-u5',
}

/**
 * 积木登记表。字段和 body.available_blocks 的元素一一对应。
 *
 * 分支形状（branches）不在这里声明：正文的解析器按类型查登记表定死，
 * 正文里写了反而会因为写错而报错。
 */
export const BLOCK_DEFS = {
  move_forward: { type: 'move_forward', label: '前进', category: '动作', kind: 'action', args: [] },
  turn_left: { type: 'turn_left', label: '左转', category: '动作', kind: 'action', args: [] },
  turn_right: { type: 'turn_right', label: '右转', category: '动作', kind: 'action', args: [] },
  repeat: {
    type: 'repeat',
    label: '重复执行',
    category: '控制',
    kind: 'control',
    args: [{ name: 'times', label: '次数', type: 'number', default: 2, min: 1, max: 20, step: 1 }],
  },
  if_wall_ahead: { type: 'if_wall_ahead', label: '如果前面有墙', category: '控制', kind: 'control', args: [] },
  if_path_ahead: { type: 'if_path_ahead', label: '如果前面有路', category: '控制', kind: 'control', args: [] },
  if_else: {
    type: 'if_else',
    label: '如果…否则…',
    category: '控制',
    kind: 'control',
    args: [
      {
        name: 'condition',
        label: '条件',
        type: 'select',
        default: 'wall_ahead',
        options: [
          { value: 'wall_ahead', label: '前面有墙' },
          { value: 'path_ahead', label: '前面有路' },
        ],
      },
    ],
  },
}

/** 一次课里能同时给的积木种类。 */
export const BLOCK_SETS = {
  move: ['move_forward'],
  moveTurn: ['move_forward', 'turn_left', 'turn_right'],
  loop: ['move_forward', 'repeat'],
  loopTurn: ['move_forward', 'turn_right', 'repeat'],
  condition: ['move_forward', 'turn_right', 'repeat', 'if_wall_ahead'],
  conditionBoth: ['move_forward', 'turn_left', 'turn_right', 'repeat', 'if_wall_ahead'],
  conditionPath: ['move_forward', 'turn_right', 'repeat', 'if_path_ahead'],
  conditionElse: ['move_forward', 'turn_right', 'repeat', 'if_else'],
}

/** then_else 形状的积木：分支体固定两项，其余是单分支。 */
const THEN_ELSE_TYPES = new Set(['if_path_ahead', 'if_else'])

const VECTORS = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
}

const TURN_RIGHT = { E: 'S', S: 'W', W: 'N', N: 'E' }
const TURN_LEFT = { E: 'N', N: 'W', W: 'S', S: 'E' }

/** 反方向。反向走一条路线时，起始朝向要跟着翻。 */
const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' }

// ---------------------------------------------------------------------------
// 程序 DSL：写出来的就是解释器吃的执行树
// ---------------------------------------------------------------------------

export const fwd = () => ({ type: 'move_forward', args: {} })
export const turnL = () => ({ type: 'turn_left', args: {} })
export const turnR = () => ({ type: 'turn_right', args: {} })

/** 重复执行。children 是平铺数组，解释器按顺序逐块执行。 */
export const rep = (times, children) => ({ type: 'repeat', args: { times }, children })

/** 如果前面有墙（单分支）。 */
export const ifWall = (children) => ({ type: 'if_wall_ahead', args: {}, children })

/** 如果前面有路（双分支）。 */
export const ifPath = (thenChildren, elseChildren) => ({
  type: 'if_path_ahead',
  args: {},
  children: [chain(thenChildren), chain(elseChildren)],
})

/** 通用条件（双分支）。 */
export const ifElse = (condition, thenChildren, elseChildren) => ({
  type: 'if_else',
  args: { condition },
  children: [chain(thenChildren), chain(elseChildren)],
})

/** 把一串节点串成 next 链，返回链头。 */
export function chain(nodes) {
  let head = null
  let tail = null
  for (const node of nodes) {
    if (!node) continue
    if (!head) head = node
    else tail.next = node
    tail = node
  }
  return head
}

/** 工作区积木总数（含嵌套）。口径和解释器的 max_blocks 一致。 */
export function countBlocks(nodes) {
  let total = 0
  for (const node of nodes) {
    if (!node) continue
    total += 1
    total += countBlocks(node.children ?? [])
    if (node.next) total += countBlocks([node.next])
  }
  return total
}

/** 展开后的动作步数（前进和转弯各算一步，重复按次数展开）。 */
export function countActions(nodes) {
  let total = 0
  for (const node of nodes) {
    if (!node) continue
    if (node.type === 'repeat') {
      total += countActions(node.children ?? []) * Number(node.args.times ?? 0)
      continue
    }
    if (THEN_ELSE_TYPES.has(node.type)) {
      let worst = 0
      for (const child of node.children ?? []) worst = Math.max(worst, countActions(child ? [child] : []))
      total += worst
      continue
    }
    if (node.type === 'if_wall_ahead') {
      total += countActions(node.children ?? [])
      continue
    }
    total += 1
  }
  return total
}

// ---------------------------------------------------------------------------
// 程序变换：镜像、反向
// ---------------------------------------------------------------------------

/**
 * 镜像整段程序。
 *
 * 地图左右翻面之后，左转会变成右转，否则标准解就走到反方向去了。
 */
export function mirrorProgram(nodes) {
  return mapProgram(nodes, (node) => {
    if (node.type === 'turn_left') return turnR()
    if (node.type === 'turn_right') return turnL()
    if (node.type === 'move_forward') return fwd()
    if (node.type === 'repeat') return { type: 'repeat', args: { times: node.args.times } }
    return { type: node.type, args: { ...node.args } }
  })
}

/**
 * 反向整段程序：动作倒序，左右转互换。
 *
 * 只对没有条件分支的程序成立（有 if_* 时分支里的动作无法安全倒序），
 * 遇到 if_* 直接报错，避免生成出自以为能过、实际过不了的关卡。
 */
export function reverseProgram(nodes) {
  const out = []
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index]
    if (!node) continue
    if (node.type === 'move_forward') out.push(fwd())
    else if (node.type === 'turn_left') out.push(turnR())
    else if (node.type === 'turn_right') out.push(turnL())
    else if (node.type === 'repeat') out.push(rep(node.args.times, reverseProgram(node.children ?? [])))
    else throw new Error(`reverseProgram 不支持积木类型 ${node.type}`)
  }
  return out
}

/** 遍历整棵树做节点替换，next 链和分支体一起处理。 */
function mapProgram(nodes, fn) {
  return nodes.filter(Boolean).map((node) => {
    const next = node.next ? mapProgram([node.next], fn) : []
    const mapped = fn(node)
    if (next.length) mapped.next = next[0]
    if (node.children) {
      mapped.children = THEN_ELSE_TYPES.has(node.type)
        ? node.children.map((child) => (child ? mapProgram([child], fn)[0] : null))
        : mapProgram(node.children, fn)
    }
    return mapped
  })
}

// ---------------------------------------------------------------------------
// 路线模拟与地图构造
// ---------------------------------------------------------------------------

/**
 * 在空白场地上模拟一段程序，得到它走过的格子。
 *
 * 只支持动作积木和重复：重复的次数是确定的，不需要场地信息。
 * 条件积木依赖墙在哪，要靠生产解释器在真实场地上跑，这里不模拟。
 */
export function simulatePath(program, start = { x: 0, y: 0, heading: 'E' }) {
  let x = start.x
  let y = start.y
  let heading = start.heading
  const cells = [{ x, y }]
  const walk = (nodes) => {
    for (const node of nodes) {
      if (!node) continue
      if (node.type === 'move_forward') {
        const vector = VECTORS[heading]
        x += vector.x
        y += vector.y
        cells.push({ x, y })
      } else if (node.type === 'turn_left') heading = TURN_LEFT[heading]
      else if (node.type === 'turn_right') heading = TURN_RIGHT[heading]
      else if (node.type === 'repeat') {
        for (let index = 0; index < Number(node.args.times ?? 0); index += 1) walk(node.children ?? [])
      } else throw new Error(`simulatePath 不支持积木类型 ${node.type}`)
    }
  }
  walk(program)
  return { cells, heading }
}

/**
 * 走廊式地图：只把路线挖成通道，其余格子全是墙。
 *
 * 好处是路线唯一，学生不会靠乱走抄近路过关；
 * 坏处是条件积木在这类地图里永远不触发（前方总是通道），
 * 所以带 if 的关卡要用 room 场地。
 */
export function corridorScene(cells, { padding = 1 } = {}) {
  const bounds = pathBounds(cells)
  const width = bounds.maxX - bounds.minX + 1 + padding * 2
  const height = bounds.maxY - bounds.minY + 1 + padding * 2
  const shiftX = padding - bounds.minX
  const shiftY = padding - bounds.minY
  const path = cells.map((cell) => ({ x: cell.x + shiftX, y: cell.y + shiftY }))
  const pathKeys = new Set(path.map((cell) => `${cell.x},${cell.y}`))
  const obstacles = []
  const seen = new Set()
  for (const cell of path) {
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      const nx = cell.x + dx
      const ny = cell.y + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const key = `${nx},${ny}`
      if (pathKeys.has(key) || seen.has(key)) continue
      seen.add(key)
      obstacles.push({ x: nx, y: ny })
    }
  }
  return {
    width,
    height,
    path,
    obstacles,
    start: path[0],
    goal: path[path.length - 1],
  }
}

/**
 * 房间场地：矩形边框是墙，里面全空。
 *
 * 机器人贴着墙走一圈，正适合「如果前面有墙就右转」这种条件关卡。
 */
export function roomScene(width, height) {
  const obstacles = []
  for (let x = 0; x < width; x += 1) {
    obstacles.push({ x, y: 0 })
    obstacles.push({ x, y: height - 1 })
  }
  for (let y = 1; y < height - 1; y += 1) {
    obstacles.push({ x: 0, y })
    obstacles.push({ x: width - 1, y })
  }
  return { width, height, obstacles }
}

function pathBounds(cells) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const cell of cells) {
    if (cell.x < minX) minX = cell.x
    if (cell.y < minY) minY = cell.y
    if (cell.x > maxX) maxX = cell.x
    if (cell.y > maxY) maxY = cell.y
  }
  return { minX, minY, maxX, maxY }
}

/**
 * 把一条路线旋转 / 镜像，得到同一关卡的其它走法。
 *
 * rotate 是顺时针 90° 的次数，mirror 是左右翻面。
 * 返回值里的 heading 是变换之后起点的朝向，地图和程序要一起用。
 */
export function transformPath(cells, { rotate = 0, mirror = false, heading = 'E' }) {
  let points = cells.map((cell) => ({ x: cell.x, y: cell.y }))
  let currentHeading = heading

  if (mirror) {
    const bounds = pathBounds(points)
    points = points.map((cell) => ({ x: bounds.maxX - cell.x, y: cell.y }))
    currentHeading = currentHeading === 'E' ? 'W' : currentHeading === 'W' ? 'E' : currentHeading
  }

  for (let step = 0; step < (((rotate % 4) + 4) % 4); step += 1) {
    const bounds = pathBounds(points)
    points = points.map((cell) => ({ x: bounds.maxY - cell.y, y: cell.x }))
    currentHeading = TURN_RIGHT[currentHeading]
  }

  return { cells: points, heading: currentHeading }
}

/** 反向一条路线的坐标：终点变起点，方向掉头。 */
export function reversePath(cells, endHeading) {
  return {
    cells: [...cells].reverse(),
    heading: OPPOSITE[endHeading],
  }
}

/**
 * 给一条路线套一组变体：镜像 → 反向 → 旋转。
 *
 * 顺序固定：先镜像再反向最后旋转，这样坐标和程序能一一对上。
 * 变体不只是为了好看——镜像之后左转变右转、反向之后起点终点互换，
 * 同一个教学点能换出完全不同的走法。
 */
export function applyVariant(program, { mirror = false, reverse = false, rotate = 0 }) {
  let cells = simulatePath(program).cells
  let current = program
  let heading = 'E'

  if (mirror) {
    const moved = transformPath(cells, { mirror: true, heading })
    cells = moved.cells
    heading = moved.heading
    current = mirrorProgram(current)
  }

  if (reverse) {
    const sim = simulatePath(current)
    const rev = reversePath(sim.cells, sim.heading)
    cells = rev.cells
    heading = rev.heading
    current = reverseProgram(current)
  }

  if (rotate) {
    const moved = transformPath(cells, { rotate, heading })
    cells = moved.cells
    heading = moved.heading
  }

  return { program: current, cells, heading }
}

/**
 * 路线是否「终点唯一」。
 *
 * 终点必须是路线上只出现一次的格子，而且不能和起点重合：
 * 终点撞上中间经过的格子时，机器人会在半路就判定通关，标准解的步数也会对不上。
 */
export function pathIsSafe(cells) {
  if (!cells.length) return false
  const start = cells[0]
  const goal = cells[cells.length - 1]
  if (goal.x === start.x && goal.y === start.y) return false
  return cells.filter((cell) => cell.x === goal.x && cell.y === goal.y).length === 1
}

/** 全部变体组合，生成器按顺序挑第一个安全的。 */
export const ALL_VARIANTS = (() => {
  const list = []
  for (const rotate of [0, 1, 2, 3]) {
    for (const mirror of [false, true]) {
      for (const reverse of [false, true]) list.push({ rotate, mirror, reverse })
    }
  }
  return list
})()

/**
 * 从变体表里挑一个终点唯一的走法。
 *
 * startIndex 让不同的关卡错开起点，16 关不会挤在同一种形状上。
 */
export function pickSafeVariant(program, startIndex = 0) {
  for (let offset = 0; offset < ALL_VARIANTS.length; offset += 1) {
    const variant = ALL_VARIANTS[(startIndex + offset) % ALL_VARIANTS.length]
    const applied = applyVariant(program, variant)
    if (pathIsSafe(applied.cells)) return { ...applied, variant }
  }
  return null
}

/** 程序里用到的积木类型（去重）。标准解用到的积木必须出现在本关的积木盘上。 */
export function blockTypesOf(nodes) {
  const types = new Set()
  const walk = (list) => {
    for (const node of list ?? []) {
      if (!node) continue
      types.add(node.type)
      walk(node.children ?? [])
      if (node.next) walk([node.next])
    }
  }
  walk(nodes)
  return [...types]
}

/** 收集物类型：能被机器人吃掉的那些。 */
export const COLLECTIBLE_TYPES = ['coin', 'star']

/**
 * 在路线中间摆收集物。
 *
 * 起点和终点不放；金币放在路线的正中间，视觉上更像是「一路走过去顺手捡」。
 */
export function placeCollectibles(path, count, prefix) {
  const middle = path.slice(1, -1)
  if (!middle.length || count <= 0) return []
  const out = []
  for (let index = 0; index < count; index += 1) {
    const cell = middle[Math.floor(((index + 0.5) * middle.length) / count)]
    if (!cell) continue
    out.push({
      id: `${prefix}-${index + 1}`,
      type: COLLECTIBLE_TYPES[index % COLLECTIBLE_TYPES.length],
      x: cell.x,
      y: cell.y,
    })
  }
  return out
}
