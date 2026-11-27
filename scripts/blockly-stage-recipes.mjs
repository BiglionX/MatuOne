/**
 * Blockly 二年级（Level 2 / Level 3）自由舞台关卡的「规则层」。
 *
 * 和第一学期的 blockly-level-recipes.mjs 是同一套分工：
 *   1. 一段程序怎么写（DSL）；
 *   2. 一个舞台场景怎么搭（场景构造器 + 几何工具）；
 *   3. 哪些积木这学期真的能跑（能力表）。
 *
 * 编排层在 generate-stage-levels.mjs：它按单元挑关卡、定标题、拼 SQL。
 *
 * 舞台和网格最大的不同，说白了就一句话：
 * **舞台上的角色只会沿一个方向走，不会撞墙反弹。**
 * 网格里「前进」撞墙会停，舞台里 move_steps 沿角色的 direction 一直走，
 * 走到舞台边缘才被夹住。所以舞台关卡的全部玩法都建立在
 * 「角色沿着一条直线扫过去 + 什么东西在什么时刻落进碰撞带」上面。
 *
 * 下面的几何工具就是为这件事写的：
 *   - sweepWindow()：算出角色从某个 x 出发后，第几帧会经过另一个 x；
 *   - fallEnterTick()：算出下落物第几帧掉进碰撞带；
 *   - fallStartY()：反推一个下落物要落在第几帧进带，起始高度该是多少。
 * 生成器用这三个函数排场景，再用生产解释器跑一遍验收。
 */

/** 舞台尺寸和精灵基础尺寸；和 src/modules/curriculum/moduleStageInterpreter.ts 保持一致。 */
export const STAGE_WIDTH = 480
export const STAGE_HEIGHT = 360
export const SPRITE_SIZE = 32

/** 角色站的高度。角色的身体占 [300, 332]。 */
export const PLAYER_Y = 300
/** 碰撞带上沿：目标必须落在这个高度以下，站在 300 的角色才碰得到。 */
export const BAND_TOP = 268
/** 碰撞带下沿。 */
export const BAND_BOTTOM = 332
/** 下落物落到这个高度就停住（舞台底边减去身高的余量）。 */
export const FLOOR_Y = 328
/** 角色沿地面走时能到的最右位置。 */
export const RIGHT_EDGE = STAGE_WIDTH - SPRITE_SIZE

/** 二年级两个学期的编号。 */
export const STAGE_TERMS = {
  L2: 'blk-g2-fall',
  L3: 'blk-g2-spring',
}

/** 二年级四个单元的编号（u1 / u2 复用，旧的 u3…u5 改成 -legacy）。 */
export const STAGE_UNITS = {
  L2U1: 'blk-g2-fall-u1',
  L2U2: 'blk-g2-fall-u2',
  L3U1: 'blk-g2-spring-u1',
  L3U2: 'blk-g2-spring-u2',
}

/**
 * 积木登记表。
 *
 * 「如果碰到」和「克隆」的下拉选项跟场景里的精灵、克隆模板有关，
 * 所以这两块积木由下面的工厂函数按关卡生成，其余是固定定义。
 */
export const STAGE_BLOCK_DEFS = {
  move_steps: {
    type: 'move_steps',
    label: '移动',
    category: '动作',
    kind: 'action',
    args: [{ name: 'steps', label: '步数', type: 'number', default: 10, min: -100, max: 100, step: 1 }],
  },
  set_variable: {
    type: 'set_variable',
    label: '设置变量',
    category: '变量',
    kind: 'action',
    args: [
      { name: 'variable_id', label: '变量', type: 'variable', default: 'score' },
      { name: 'value', label: '设为', type: 'number', default: 0, min: -100, max: 100, step: 1 },
    ],
  },
  change_variable: {
    type: 'change_variable',
    label: '变量增加',
    category: '变量',
    kind: 'action',
    args: [
      { name: 'variable_id', label: '变量', type: 'variable', default: 'score' },
      { name: 'value', label: '增加', type: 'number', default: 1, min: -100, max: 100, step: 1 },
    ],
  },
  forever: { type: 'forever', label: '无限循环', category: '控制', kind: 'control', args: [] },
  repeat: {
    type: 'repeat',
    label: '重复执行',
    category: '控制',
    kind: 'control',
    args: [{ name: 'times', label: '次数', type: 'number', default: 2, min: 1, max: 20, step: 1 }],
  },
}

/** 「如果碰到」积木：下拉里是这一关场景里的精灵。 */
export function ifTouchingDef(spriteOptions, defaultSpriteId) {
  return {
    type: 'if_touching',
    label: '如果碰到',
    category: '控制',
    kind: 'control',
    args: [
      {
        name: 'target_sprite_id',
        label: '精灵',
        type: 'select',
        default: defaultSpriteId ?? spriteOptions[0]?.value,
        options: spriteOptions,
      },
    ],
  }
}

/** 「克隆」积木：下拉里是这一关的克隆模板。 */
export function cloneDef(cloneOptions, defaultCloneId) {
  return {
    type: 'clone',
    label: '克隆',
    category: '控制',
    kind: 'control',
    args: [
      {
        name: 'clone_id',
        label: '克隆谁',
        type: 'select',
        default: defaultCloneId ?? cloneOptions[0]?.value,
        options: cloneOptions,
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// 程序 DSL：写出来的就是解释器吃的执行树
// ---------------------------------------------------------------------------

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

/** 沿角色朝向移动。步数可以是负数（往回走）。 */
export const move = (steps) => ({ type: 'move_steps', args: { steps } })

/** 把变量设成某个值（开局清零用）。 */
export const setVar = (variableId, value) => ({ type: 'set_variable', args: { variable_id: variableId, value } })

/** 变量加一个数（加分、扣分用）。 */
export const changeVar = (variableId, value) => ({ type: 'change_variable', args: { variable_id: variableId, value } })

/** 如果碰到某个精灵，就执行体里的积木。 */
export const ifTouch = (targetSpriteId, body) => ({
  type: 'if_touching',
  args: { target_sprite_id: targetSpriteId },
  children: [chain(body)],
})

/** 无限循环。 */
export const forever = (body) => ({ type: 'forever', args: {}, children: [chain(body)] })

/** 重复执行固定次数。 */
export const rep = (times, body) => ({ type: 'repeat', args: { times }, children: [chain(body)] })

/** 克隆：造出一个新角色，体里的积木由这个新角色自己跑。 */
export const cloneBlock = (cloneId, body) => ({
  type: 'clone',
  args: { clone_id: cloneId },
  children: [chain(body)],
})

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

/**
 * 一段程序展开后最多同时执行几个原子动作。
 *
 * 舞台解释器每个线程每个 Tick 只跑一个动作，所以这里算的是「一条分支上最多的动作数」，
 * 用来估一关至少要多少 Tick 才能跑完。
 */
export function countActions(nodes) {
  let total = 0
  for (const node of nodes) {
    if (!node) continue
    if (node.type === 'repeat') {
      total += countActions(node.children ?? []) * Number(node.args.times ?? 0)
      continue
    }
    if (node.type === 'if_touching') {
      total += countActions(node.children ?? [])
      continue
    }
    if (node.type === 'forever' || node.type === 'clone') {
      // 循环和克隆会一直跑，这里只看它一轮里有多少动作。
      total += Math.max(1, countActions(node.children ?? []))
      continue
    }
    total += 1
  }
  return total
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

// ---------------------------------------------------------------------------
// 场景构造
// ---------------------------------------------------------------------------

/** 一个精灵。direction 用角度：0 上、90 右、180 下、270 左。 */
export function sprite({ id, asset, x, y, direction = 90, size = 100, collectible = false, visible }) {
  const out = { id, asset, x, y, direction, size, collectible }
  if (visible !== undefined) out.visible = visible
  return out
}

/** 一个克隆模板：决定新角色的样子、出生位置和能活多久。 */
export function cloneTemplate({ id, asset, spawn, lifetimeSteps, size, direction }) {
  const out = { id, asset, spawn }
  if (lifetimeSteps !== undefined) out.lifetime_steps = lifetimeSteps
  if (size !== undefined) out.size = size
  if (direction !== undefined) out.direction = direction
  return out
}

/**
 * 给一棵树上的每块积木补上 id。
 *
 * 关卡正文里的积木实例必须带 id（前端靠它认积木），
 * 可写程序的时候谁也不会手写一串 id，所以这里按顺序自动编号。
 */
export function assignBlockIds(node, prefix) {
  let index = 0
  const walk = (head) => {
    let cursor = head
    while (cursor) {
      index += 1
      cursor.id = `${prefix}-b${index}`
      if (cursor.children) cursor.children = cursor.children.map((child) => (child ? walk(child) : null))
      cursor = cursor.next
    }
    return head
  }
  return node ? walk(node) : node
}

/** 课程隐藏脚本：驱动场景里的某个角色，不受学生工作区积木上限约束。 */
export function initialScript({ id, targetSpriteId, block }) {
  return { id, target_sprite_id: targetSpriteId, block: assignBlockIds(block, id) }
}

/** 一个舞台场景。 */
export function stageScene({ backdrop = 'sky', sprites = [], clones = [], variables = [], initialScripts = [] }) {
  return {
    backdrop,
    stage_size: { width: STAGE_WIDTH, height: STAGE_HEIGHT },
    sprites,
    clones,
    variables,
    broadcasts: [],
    initial_scripts: initialScripts,
  }
}

/** 一个全局变量。 */
export function variable(id, initial, name) {
  return { id, name: name ?? id, initial, scope: 'global' }
}

// ---------------------------------------------------------------------------
// 几何工具：排场景靠它们，验收靠解释器
// ---------------------------------------------------------------------------

/**
 * 角色从 x0 出发、每帧向右走 speed，第几帧会经过 targetX 附近。
 *
 * 判定用的是严格不等式 |x - targetX| < 32，所以端点要往外让一格。
 */
export function sweepWindow(targetX, x0, speed) {
  const enter = Math.floor((targetX - SPRITE_SIZE - x0) / speed) + 1
  const leave = Math.ceil((targetX + SPRITE_SIZE - x0) / speed) - 1
  return { enter, leave }
}

/** 角色第 t 帧的位置（不考虑夹边）。 */
export function sweepX(t, x0, speed) {
  return Math.min(x0 + speed * t, RIGHT_EDGE)
}

/** 下落物第几帧掉进碰撞带。startY 已经在带里就是第 0 帧。 */
export function fallEnterTick(startY, fallSpeed) {
  if (startY > BAND_TOP) return 0
  return Math.floor((BAND_TOP - startY) / fallSpeed) + 1
}

/**
 * 反推下落物的起始高度：让它正好在第 entryTick 帧掉进碰撞带。
 *
 * 起始高度被夹在 [0, 260] 之间：太高学生看不见它在落，太低它一开局就在带里。
 */
export function fallStartY(fallSpeed, entryTick) {
  const raw = BAND_TOP - fallSpeed * entryTick
  return Math.max(0, Math.min(260, Math.round(raw)))
}

/**
 * 下落物在第几帧会撞上沿路扫过去的角色。
 *
 * 下落物从进带开始一直待在带里（下落后会停在 328，仍在带内），
 * 所以只要角色经过它的那几帧里有一帧它在带里，就算撞上。
 */
export function hitTick(targetX, x0, speed, startY, fallSpeed) {
  const window = sweepWindow(targetX, x0, speed)
  if (window.leave < window.enter) return null
  const enter = fallEnterTick(startY, fallSpeed)
  const tick = Math.max(window.enter, enter)
  return tick <= window.leave ? tick : null
}

/**
 * 积木能力表：这学期真的能跑的积木，以及它们各自的限制。
 *
 * 编排层会拿它核对生成器用到的积木，生成文件里也会带一份，
 * 教研老师一眼就能看出「哪些积木还没做」。
 */
export const STAGE_BLOCK_SUPPORT = {
  move_steps: { ready: true, note: '沿角色朝向移动，负数往回走，走到边缘会停住。' },
  set_variable: { ready: true, note: '把全局变量设成新值，开局清零用。' },
  change_variable: { ready: true, note: '全局变量加减，计分和扣命用。' },
  if_touching: { ready: true, note: '碰到目标就执行体里的积木；目标是一次性收集物时，碰到后自动消失。' },
  forever: { ready: true, note: '一直重复体里的积木。' },
  repeat: { ready: true, note: '重复固定次数。' },
  clone: { ready: true, note: '造出一个新角色，体里的积木由新角色自己跑；活够 lifetime_steps 就自动回收。' },
}

/** 这学期还没做、但关卡里很想用的积木；生成器会把它们写进待办报告。 */
export const STAGE_PENDING_BLOCKS = {
  when_key_pressed: '按空格发射子弹这类「按键事件」积木还没有，克隆只能靠循环一直造。',
  random: '随机数积木还没有，随机出生点用的是关卡内部写死的伪随机，换一次运行结果都一样。',
  broadcast: '广播积木还没有，多角色之间只能靠各自的时间和位置配合。',
  say: '说话积木还没有，角色不会在舞台上冒字。',
  switch_costume: '换造型积木还没有。',
  wait: '等待积木还没有，节奏全靠「移动」的步数控制。',
}
