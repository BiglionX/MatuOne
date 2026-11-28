/**
 * Blockly 关卡的绘本文案和教学提示。
 *
 * 为什么单独一个文件：绘本和提示是教研内容，和「怎么造关卡」是两件事。
 * 这里只管「这一关讲什么故事、复习卡问什么、提示怎么说」，
 * 关卡编号、标题、SQL 那些仍然在 generate-blockly-80.mjs 里。
 *
 * 最重要的一条规矩：
 *   **文案里的每一块积木、每一个数字，都必须能从这一关的标准解推出来。**
 *
 * 这套文案以前是「按单元模板」写的：一个单元 16 关共用一套说法。
 * 于是「这一关真正要用的就是「如果前面有墙」」会出现在根本没有这块积木的关卡里，
 * 复习卡的提示又直接抄上一关的原文，学生看到的数字和自己要拼的数字对不上。
 * 现在改成从标准解反推事实，模板只负责把事实讲成故事。
 *
 * 产出三样东西：
 *   1. analyzeLevel(level) —— 这一关的教学事实：形状、积木、数字、做法；
 *   2. buildHints(level)   —— 两条提示（开场 / 没通关）；
 *   3. buildStoryFor(level, previous) —— 绘本和复习卡。
 */

/** 插画标识登记表。前端 src/pages/blockly/StoryPlayer.tsx 认这几个。 */
export const STORY_IMAGES = {
  robot: '🤖',
  robot_wave: '🤖',
  robot_point: '👉',
  robot_run: '🏃',
  block_move: '🟩',
  block_turn: '🌀',
  block_repeat: '🔁',
  block_if: '❓',
  run_button: '▶️',
  goal: '🏁',
  star: '⭐',
  idea: '💡',
  path: '🛤️',
  map: '🗺️',
  book: '📘',
  treasure: '💎',
  coin: '🪙',
}

/**
 * 舞台积木类型 → 学生看到的名字。
 *
 * 绘本第三页要说「这一关真正要用的就是某某积木」，
 * 名字和插画必须对上：说了「右转」却画成前进积木，孩子会懵。
 */
const BLOCK_NAME = {
  move_forward: '前进',
  turn_left: '左转',
  turn_right: '右转',
  repeat: '重复执行',
  if_wall_ahead: '如果前面有墙',
  if_path_ahead: '如果前面有路',
  if_else: '如果…否则…',
}

/** 舞台积木类型 → 学生看到的名字。 */
const STAGE_BLOCK_NAME = {
  move_steps: '移动',
  set_variable: '设置变量',
  change_variable: '变量增加',
  if_touching: '如果碰到',
  forever: '无限循环',
  repeat: '重复执行',
  clone: '克隆',
}

/** 舞台积木类型 → 插画标识。 */
const STAGE_BLOCK_IMAGE = {
  move_steps: 'block_move',
  set_variable: 'variable_box',
  change_variable: 'variable_box',
  if_touching: 'block_if',
  forever: 'block_repeat',
  repeat: 'block_repeat',
  clone: 'block_clone',
}

/** 积木类型 → 插画标识。绘本里要画哪块积木，从推导结果里读出来。 */
const BLOCK_IMAGE = {
  move_forward: 'block_move',
  turn_left: 'block_turn',
  turn_right: 'block_turn',
  repeat: 'block_repeat',
  if_wall_ahead: 'block_if',
  if_path_ahead: 'block_if',
  if_else: 'block_if',
}

/** 开场白轮换，避免每关都是同一句。 */
const OPENINGS = [
  '欢迎回来！我们再试一个新本领。',
  '又见面啦，今天的关卡有点不一样。',
  '准备好了吗？这一关我们换个工具。',
  '小机器人已经等不及啦，我们开始吧。',
]

// ---------------------------------------------------------------------------
// 分析层：从标准解反推教学事实
// ---------------------------------------------------------------------------

/** 分支形状的积木：children 是两条链（then / else）。 */
const TWO_BRANCH = new Set(['if_path_ahead', 'if_else'])

/** 一条 next 链摊平成数组。 */
function chainOf(node) {
  const out = []
  let current = node
  while (current) {
    out.push(current)
    current = current.next
  }
  return out
}

/** 一组节点摊平（每个节点后面的 next 链也一起摊开）。 */
function flatOf(nodes) {
  const out = []
  for (const node of nodes ?? []) {
    if (!node) continue
    out.push(...chainOf(node))
  }
  return out
}

/** 递归收集程序里的所有节点，分支体也算。 */
function allNodes(nodes, out = []) {
  for (const node of flatOf(nodes)) {
    out.push(node)
    for (const child of node.children ?? []) {
      if (!child) continue
      allNodes(chainOf(child), out)
    }
  }
  return out
}

/** 转弯积木的类型；不是转弯就返回 null。 */
function turnType(node) {
  if (node?.type === 'turn_left') return 'turn_left'
  if (node?.type === 'turn_right') return 'turn_right'
  return null
}

/** 这个「重复执行」的体里只有「前进」。 */
function isPlainRepeat(node) {
  if (node?.type !== 'repeat') return false
  const body = flatOf(node.children)
  return body.length > 0 && body.every((item) => item.type === 'move_forward')
}

/** 这个「重复执行」的体里有转弯。 */
function repeatHasTurn(node) {
  return flatOf(node?.children).some((item) => turnType(item))
}

/** 1 到 n 的整数序列。直道关允许孩子数到任何一格。 */
function range(start, end) {
  const out = []
  for (let value = start; value <= end; value += 1) out.push(value)
  return out
}

/**
 * 路线外形。转弯顺序唯一决定外形：
 * 一次转弯是 L 形，两次同向是 U 形，两次反向是 Z 形，三次是 S 形。
 *
 * 镜像会把左右转互换、反向会把转弯顺序倒过来，两种变换都不改外形。
 */
function routeShapeName(turnTypes) {
  if (turnTypes.length === 0) return '直线'
  if (turnTypes.length === 1) return 'L形'
  if (turnTypes.length === 2) return turnTypes[0] === turnTypes[1] ? 'U形' : 'Z形'
  if (turnTypes.length === 3) return 'S形'
  return '折线'
}

/** 条件积木的两个分支，各摊成一条链。 */
function condBranches(cond) {
  if (TWO_BRANCH.has(cond.type)) {
    return [chainOf(cond.children?.[0]), chainOf(cond.children?.[1])]
  }
  return [flatOf(cond.children), []]
}

/**
 * 分析一关：从标准解反推它真正要教什么。
 *
 * @param level 关卡（要有 solution：标准解；可选 facts：走廊格数和拐角数）
 */
export function analyzeLevel(level) {
  const program = level.solution ?? []
  const top = flatOf(program)
  const all = allNodes(program)
  const facts = level.facts ?? {}
  const repeats = all.filter((node) => node.type === 'repeat')
  const conds = all.filter((node) => node.type.startsWith('if_'))

  if (conds.length > 0) {
    const cond = conds[0]
    const condRepeat = repeats.find((node) => flatOf(node.children).includes(cond))
    const plainRepeat = top.find((node) => node.type === 'repeat' && isPlainRepeat(node))
    // 顶层有两个循环：一个自己走、一个带条件——那是「先走再绕」的混合关。
    if (condRepeat && plainRepeat && plainRepeat !== condRepeat) {
      return analyzeMixed(level, plainRepeat, condRepeat, cond)
    }
    return analyzeConditional(level, condRepeat, cond, facts)
  }

  if (repeats.length > 0) {
    // 体里有转弯、而且体里还有一层循环：正方形或长方形。
    const outer = repeats.find((node) => repeatHasTurn(node) && flatOf(node.children).some((item) => item.type === 'repeat'))
    if (outer) {
      const innerTimes = outer.children
        .filter((child) => child?.type === 'repeat')
        .map((child) => Number(child.args.times))
      if (new Set(innerTimes).size === 1) return analyzeSquare(level, top, outer, innerTimes[0])
      return analyzeRect(level, top, outer, innerTimes)
    }
    const topRepeats = top.filter((node) => node.type === 'repeat')
    if (topRepeats.length === 1 && isPlainRepeat(topRepeats[0])) {
      return analyzeLoopStraight(level, topRepeats[0])
    }
    return analyzeSegments(level, top, topRepeats)
  }

  if (top.some((node) => turnType(node))) {
    return analyzePolyline(level, top)
  }
  return analyzeStraight(level, top)
}

/** 直道：一串「前进」。 */
function analyzeStraight(level, top) {
  const moves = top.filter((node) => node.type === 'move_forward').length
  return {
    shape: 'straight',
    focusBlock: 'move_forward',
    concept: { name: '数格子', detail: '一格一步，数清楚格数就能一次走对。', image: 'block_move' },
    how: `这条路一共 ${moves} 格，把 ${moves} 块「前进」积木拖到工作区，一块接一块连好。`,
    plain: `上一关是一条直路，走 ${moves} 格就到终点。`,
    check: `机器人还没到终点，这条路一共 ${moves} 格，再数一遍还差几格。`,
    goal: `把 ${moves} 块「前进」积木连起来，让机器人一条直线走到终点`,
    numbers: range(1, moves),
  }
}

/** 折线：几段直路加几个转弯，没有循环。 */
function analyzePolyline(level, top) {
  const legs = []
  const turnTypes = []
  let current = 0
  for (const node of top) {
    if (node.type === 'move_forward') {
      current += 1
      continue
    }
    const type = turnType(node)
    if (!type) continue
    legs.push(current)
    current = 0
    turnTypes.push(type)
  }
  legs.push(current)
  if (legs.some((leg) => leg <= 0)) {
    throw new Error(`${level.levelId} 的标准解里有一段直路长度是 ${legs.join('、')}，画不出路线`)
  }

  const steps = []
  for (const [index, leg] of legs.entries()) {
    if (index === 0) steps.push(`先走 ${leg} 格`)
    else if (index === legs.length - 1) steps.push(`最后走 ${leg} 格`)
    else steps.push(`再走 ${leg} 格`)
    if (turnTypes[index]) steps.push(`放一块「${BLOCK_NAME[turnTypes[index]]}」`)
  }

  return {
    shape: 'polyline',
    focusBlock: turnTypes[0],
    concept: { name: '转弯', detail: '转弯会让机器人换一个方向，几段路就要几段走法。', image: 'block_turn' },
    how: `${steps.join('，')}。`,
    plain: `上一关的路要拐 ${turnTypes.length} 个弯，每段分别走 ${legs.join('、')} 格。`,
    check: `机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？`,
    goal: `走一条 ${routeShapeName(turnTypes)}路线：${legs.map((leg) => `${leg} 步`).join(' + ')}`,
    numbers: [...legs, turnTypes.length],
  }
}

/** 单层循环走直道。 */
function analyzeLoopStraight(level, repeat) {
  const times = Number(repeat.args.times)
  return {
    shape: 'loopStraight',
    focusBlock: 'repeat',
    concept: { name: '循环', detail: '把同一件事交给循环，重复做好多次。', image: 'block_repeat' },
    how: `把「前进」放进「重复执行」里，把次数改成 ${times}。`,
    plain: `上一关用循环一次走完 ${times} 格。`,
    check: `次数还不对，这条路一共 ${times} 格，再数一遍。`,
    goal: `用「重复执行」一次走完 ${times} 格`,
    numbers: [times],
  }
}

/** 两层循环绕正方形：外层重复几次，每次走一条边再转弯。 */
function analyzeSquare(level, top, outer, side) {
  const outerTimes = Number(outer.args.times)
  const turn = turnType(flatOf(outer.children).find((node) => turnType(node)))
  const sideRepeat = top.find((node) => node.type === 'repeat' && isPlainRepeat(node))
  const trailing = top.filter((node) => node.type === 'move_forward').length
  const outerFirst = top.indexOf(outer) < top.indexOf(sideRepeat)
  const turnName = BLOCK_NAME[turn]

  const how = outerFirst
    ? `外层「重复执行」做 ${outerTimes} 次，每次先走 ${side} 格再放一块「${turnName}」；最后一条边用「重复执行」走 ${side} 格，再走 ${trailing} 步到终点。`
    : `先用「重复执行」走 ${side} 格，再走 ${trailing} 步；然后「重复执行」做 ${outerTimes} 次，每次先放一块「${turnName}」再「重复执行」走 ${side} 格。`

  return {
    shape: 'square',
    focusBlock: 'repeat',
    concept: { name: '两层循环', detail: '循环套循环，就能绕出四条一样长的边。', image: 'block_repeat' },
    how,
    plain: `上一关用两层循环绕出四条一样长的边，每条 ${side} 格。`,
    check: `把「重复执行」放进另一个「重复执行」里面，就是两层循环了：外层做 ${outerTimes} 次，每次走 ${side} 格再转弯。`,
    goal: `用两层循环绕出边长 ${side} 的正方形`,
    numbers: [outerTimes, side, trailing],
  }
}

/** 用循环绕长方形：长边和短边不一样长。 */
function analyzeRect(level, top, outer, innerTimes) {
  const wide = Math.max(...innerTimes)
  const tall = Math.min(...innerTimes)
  const turn = turnType(flatOf(outer.children).find((node) => turnType(node)))
  const sideRepeat = top.find((node) => node.type === 'repeat' && isPlainRepeat(node))
  const trailing = top.filter((node) => node.type === 'move_forward').length
  const outerFirst = top.indexOf(outer) < top.indexOf(sideRepeat)
  const turnName = BLOCK_NAME[turn]
  const body = `走 ${wide} 格 → 「${turnName}」 → 走 ${tall} 格 → 「${turnName}」 → 走 ${wide} 格 → 「${turnName}」`

  const how = outerFirst
    ? `宽边走 ${wide} 格、窄边走 ${tall} 格：「重复执行」里依次放「${body}」，最后一条窄边用「重复执行」走 ${tall} 格，再走 ${trailing} 步到终点。`
    : `先用「重复执行」走 ${tall} 格，再走 ${trailing} 步；然后「重复执行」里依次放「${body}」。`

  return {
    shape: 'rect',
    focusBlock: 'repeat',
    concept: { name: '长方形循环', detail: '长边和短边不一样长，要用不同的次数。', image: 'block_repeat' },
    how,
    plain: `上一关用循环绕出 ${wide}×${tall} 的长方形。`,
    check: `外层「重复执行」做 1 次：先走宽的一边（${wide} 格）再走窄的一边（${tall} 格），三条边走完还差最后一条。`,
    goal: `用循环绕出 ${wide}×${tall} 的长方形`,
    numbers: [wide, tall, trailing],
  }
}

/** 分段循环：几段直路，每段一个「重复执行」，转弯用显式积木。 */
function analyzeSegments(level, top, topRepeats) {
  const legs = topRepeats.map((node) => Number(node.args.times))
  const turnTypes = top.filter((node) => turnType(node)).map(turnType)

  const steps = []
  for (const [index, leg] of legs.entries()) {
    steps.push(`「重复执行」走 ${leg} 格`)
    if (turnTypes[index]) steps.push(`放一块「${BLOCK_NAME[turnTypes[index]]}」`)
  }

  return {
    shape: 'segments',
    focusBlock: 'repeat',
    concept: { name: '分段循环', detail: '把长路分成几段，每段交给循环走。', image: 'block_repeat' },
    how: `这条路分成 ${legs.length} 段：${steps.join('，')}。`,
    plain: `上一关把路分成 ${legs.length} 段，分别走 ${legs.join('、')} 格。`,
    check: `每一段的次数不一样，这几段分别要走 ${legs.join('、')} 格。`,
    goal: `用 ${legs.length} 段「重复执行」走出${routeShapeName(turnTypes)}大路：分别走 ${legs.join('、')} 格`,
    numbers: [...legs],
  }
}

/** 条件关：把条件放进循环，让机器人自己转弯。 */
function analyzeConditional(level, condRepeat, cond, facts) {
  const moves = Number(facts.moves)
  const corners = Number(facts.corners)
  if (!Number.isFinite(moves) || !Number.isFinite(corners)) {
    throw new Error(`${level.levelId} 是条件关，生成器必须给出 facts.moves 和 facts.corners`)
  }
  if (!condRepeat) throw new Error(`${level.levelId} 的条件积木没有放进「重复执行」里`)
  const times = Number(condRepeat.args.times)
  const [thenNodes, elseNodes] = condBranches(cond)
  const thenTurn = turnType(thenNodes.find((node) => turnType(node)))
  const elseTurn = turnType(elseNodes.find((node) => turnType(node)))

  let how
  if (cond.type === 'if_wall_ahead') {
    how = `把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「${BLOCK_NAME[thenTurn]}」，然后往前迈一步。次数改成 ${times}（这条路一共 ${moves} 格）。`
  } else if (cond.type === 'if_path_ahead') {
    how = `把「如果前面有路」放进「重复执行」里：有路就往前迈一步，没路就放一块「${BLOCK_NAME[elseTurn]}」。次数改成 ${times}（${moves} 格路要加上 ${corners} 个拐角）。`
  } else {
    const onWall = cond.args?.condition !== 'path_ahead'
    const condLabel = onWall ? '前面有墙' : '前面有路'
    const opposite = onWall ? '没墙' : '没路'
    const thenText = thenTurn ? `${condLabel}就放一块「${BLOCK_NAME[thenTurn]}」` : `${condLabel}就往前迈一步`
    const elseText = elseTurn ? `${opposite}就放一块「${BLOCK_NAME[elseTurn]}」` : `${opposite}就往前迈一步`
    how = `把「如果…否则…」放进「重复执行」里，条件选「${condLabel}」：${thenText}，${elseText}。次数改成 ${times}（${moves} 格路要加上 ${corners} 个拐角）。`
  }

  return {
    shape: 'conditional',
    focusBlock: cond.type,
    concept: { name: '条件判断', detail: '让电脑先看情况再决定，机器人就能自己转弯。', image: 'block_if' },
    how,
    plain: `上一关用条件判断让机器人自己转弯，循环要做 ${times} 次。`,
    check: `次数要数对：${moves} 格路${times === moves ? '' : `要加上 ${corners} 个拐角`}，一共 ${times} 次。`,
    goal: `沿着走廊走 ${moves} 格，拐 ${corners} 个弯`,
    numbers: [times, moves, corners],
  }
}

/** 混合关：前面一段自己走，后面一段交给条件转弯。 */
function analyzeMixed(level, plainRepeat, condRepeat, cond) {
  const lead = Number(plainRepeat.args.times)
  const rest = Number(condRepeat.args.times)
  const facts = level.facts ?? {}
  const corners = Number(facts.corners ?? 0)
  const [thenNodes] = condBranches(cond)
  const turn = turnType(thenNodes.find((node) => turnType(node)))
  const condName = BLOCK_NAME[cond.type]

  return {
    shape: 'mixed',
    focusBlock: cond.type,
    concept: { name: '组合运用', detail: '自己先走一段，剩下的交给条件判断。', image: 'idea' },
    how: `前面 ${lead} 格自己走：把「前进」放进「重复执行」，次数改成 ${lead}；剩下 ${rest} 格交给「${condName}」自动转弯，那一段的次数也改成 ${rest}。`,
    plain: `上一关先自己走 ${lead} 格，剩下的路交给条件自动转弯。`,
    check: `前半段自己走（${lead} 次），后半段靠条件转弯（${rest} 次），两段的次数都要数对。`,
    goal: `先直走 ${lead} 格，再自动拐 ${corners} 个弯`,
    numbers: [lead, rest, corners],
  }
}

// ---------------------------------------------------------------------------
// 提示
// ---------------------------------------------------------------------------

/**
 * 两条提示：开场讲做法，没通关讲怎么改。
 *
 * 高亮都指向这一关真正要用的那块积木：
 * 小精灵说「把「重复执行」的次数改一下」，那就得闪一下「重复执行」，
 * 闪运行按钮等于让学生去碰运气。
 */
export function buildHints(level) {
  const desc = analyzeLevel(level)
  return [
    {
      trigger: 'initial',
      text: desc.how,
      focus: { target: 'block', blockType: desc.focusBlock },
    },
    {
      trigger: 'not_completed',
      text: desc.check,
      focus: { target: 'block', blockType: desc.focusBlock },
    },
  ]
}

// ---------------------------------------------------------------------------
// 前 15 关的手写绘本和复习卡
// ---------------------------------------------------------------------------

/**
 * 前 15 关的手写绘本和复习卡。
 *
 * 第一关没有上一关，所以不写 review：复习卡问的是「上一关学了什么」，
 * 没有上一关就没得问，硬凑一句反而会误导孩子。
 *
 * 手写也要守规矩：提到的星星/脚印必须这一关真的有，数字必须数得出来。
 * 所以 blk-005、blk-010、blk-015 里「藏着星星」的话要删（那三关没有收集物），
 * blk-012 里「脚印会点亮大道」也要删（那一关不画轨迹）。
 */
export const STORY_OVERRIDES = {
  'blk-001': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '欢迎来到代码闯关！我是小精灵，从今天起我陪你一起让机器人走路。' },
      { type: 'image_text', image: 'robot_wave', speaker: '机器人', content: '你好呀！这一关的路很短，只要 1 格，我一步就能走到小旗子那里。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '看，这是「前进」积木。把它拖到工作区，再点绿色的「运行」按钮，我就出发啦！' },
    ],
    review: undefined,
  },
  'blk-002': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '上一关你让机器人走了一步，真棒！今天我们再走远一点点。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '「前进」积木就是这样：拖一块，我走一格。' },
      { type: 'image_text', image: 'run_button', speaker: '机器人', content: '今天要走到 2 格，所以要 2 块「前进」连在一起，再点「运行」。' },
    ],
    review: { question: '上一关我们拖的是哪一块积木呀？', answer: '「前进」积木！', hint: '就是那个绿色的方块，拖一次我就走一格。' },
  },
  'blk-003': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '今天这条路有 3 格，比昨天长一点点。' },
      { type: 'image_text', image: 'path', speaker: '机器人', content: '我从起点数了数：1、2、3，一共 3 格才到我爱的小旗子。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '数出几格就拖几块「前进」，一块都不能少。' },
    ],
    review: { question: '「前进」积木走一格，那走 3 格要几块？', answer: '3 块「前进」积木。', hint: '一格一块，数一数路上有几格。' },
  },
  'blk-004': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '这一关是练习关，我们把「前进」再练熟一点。' },
      { type: 'image_text', image: 'block_move', speaker: '机器人', content: '今天是 4 格，我一口气就能走到底。' },
      { type: 'image_text', image: 'run_button', speaker: '小精灵', content: '拖 4 块「前进」连成一条，再点「运行」。' },
    ],
    review: { question: '上一关走 3 格用了几块「前进」？', answer: '3 块。', hint: '一格一块。' },
  },
  'blk-005': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '五格长廊！这是我们走过的最长的路啦。' },
      { type: 'image_text', image: 'robot_run', speaker: '机器人', content: '我最喜欢长路了，一口气跑完 5 格也不费劲。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '别着急，一块一块拖，5 块「前进」排好队。' },
      { type: 'image_text', image: 'goal', speaker: '机器人', content: '排好队点「运行」，我一口气跑到小旗子那里！' },
    ],
    review: { question: '积木要怎么排，机器人才能一直往前走？', answer: '一块接一块，连成一条。', hint: '下一块要贴在上一块的下面。' },
  },
  'blk-006': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '六格啦！数字变大了一点，办法还是老办法。' },
      { type: 'image_text', image: 'path', speaker: '机器人', content: '六格路看着长，其实就是 6 块「前进」。' },
      { type: 'image_text', image: 'run_button', speaker: '小精灵', content: '排好队再点「运行」，稳稳当当。' },
    ],
    review: { question: '走 5 格要几块「前进」？', answer: '5 块。', hint: '一格一块。' },
  },
  'blk-007': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '七格通道！窄窄的通道，走起来像在探险。' },
      { type: 'image_text', image: 'robot_run', speaker: '机器人', content: '通道两边的墙我不用担心，我只会一直往前。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '7 块「前进」，一块都不能少哦。' },
    ],
    review: { question: '积木和格子是什么关系？', answer: '一格配一块「前进」。', hint: '数一数格子就知道要几块。' },
  },
  'blk-008': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '八格长道！这一关开始会画出我走过的路线。' },
      { type: 'image_text', image: 'path', speaker: '机器人', content: '我会一边走一边留下脚印，你看看是不是一条直线。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '8 块「前进」排成一条直线，走出来的脚印才不会歪。' },
    ],
    review: { question: '走过的路线是怎么画出来的？', answer: '机器人每走一格就留下一个脚印点。', hint: '跑完以后看看舞台上的小点。' },
  },
  'blk-009': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '九格冲刺！数起来有点长了，我们一起数。' },
      { type: 'image_text', image: 'robot_run', speaker: '机器人', content: '1、2、3……一直数到 9，我就站在旗子旁边啦。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '数错了也没关系，跑一次看看脚印就知道差几格。' },
    ],
    review: { question: '上一关的路有几格？', answer: '8 格。', hint: '数字每次加 1。' },
  },
  'blk-010': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '十格挑战！两位数的路啦，别数乱了。' },
      { type: 'image_text', image: 'robot_run', speaker: '机器人', content: '十格路有点长，我会一步一步慢慢走到底。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '分成两小段数：先 5 块，再 5 块，就不乱了。' },
    ],
    review: { question: '十格可以怎么数才不乱？', answer: '分成两小段数，比如 5 加 5。', hint: '先数到 5，再接着数 5。' },
  },
  'blk-011': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '十一格直行！继续练习数格子。' },
      { type: 'image_text', image: 'path', speaker: '机器人', content: '11 格，中间没有弯，只要一直往前。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '拖 11 块「前进」，连成一条长队。' },
    ],
    review: { question: '一格配几块「前进」？', answer: '一格一块。', hint: '格子数就是积木数。' },
  },
  'blk-012': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '十二格大道！这一关的大道特别宽，特别长。' },
      { type: 'image_text', image: 'path', speaker: '机器人', content: '我要一步一步走过这条宽宽的大道。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '12 块「前进」，排好队再运行。' },
    ],
    review: { question: '这条大道要放几块「前进」？', answer: '12 块，一格一块。', hint: '数一数大道上有几格。' },
  },
  'blk-013': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '十三格远征！像小蚂蚁搬家一样遥远。' },
      { type: 'image_text', image: 'robot_run', speaker: '机器人', content: '我会一步一步稳稳走到底。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '这次试试边拖边数，看能不能一次排对 13 块。' },
    ],
    review: { question: '上一关的大道有几格？', answer: '12 格。', hint: '13 比 12 多 1。' },
  },
  'blk-014': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '十四格长跑！准备好大长腿了吗？' },
      { type: 'image_text', image: 'goal', speaker: '机器人', content: '跑过 14 格，小旗子就在终点等我。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '14 块「前进」排成一条直线，点「运行」！' },
    ],
    review: { question: '「前进」积木放在哪里最合适？', answer: '放在工作区里，一块接一块连起来。', hint: '连成一条，机器人才能一直走。' },
  },
  'blk-015': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '十五格耐力赛！这是我们第一单元的最后一关。' },
      { type: 'image_text', image: 'robot_run', speaker: '机器人', content: '这一关是本单元最长的一条路，15 格呢！' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '15 块「前进」，排好队，点「运行」，我们一起冲过去！' },
    ],
    review: { question: '这一单元我们学会了什么呀？', answer: '用「前进」积木让机器人一条直线走到终点。', hint: '一格一块，连成一条。' },
  },
}

// ---------------------------------------------------------------------------
// 绘本与复习卡
// ---------------------------------------------------------------------------

/**
 * 给一关配绘本和复习卡。
 *
 * @param level 当前关卡（要已经有 solution：绘本按标准解讲这一关要做什么）
 * @param previous 上一关；第一关没有上一关
 */
export function buildStoryFor(level, previous) {
  const override = STORY_OVERRIDES[level.levelId]
  if (override) return { intro_story: override.intro_story, review: override.review }

  const desc = analyzeLevel(level)
  const opening = OPENINGS[level.sortOrder % OPENINGS.length]
  const focusName = BLOCK_NAME[desc.focusBlock]

  const intro_story = [
    { type: 'text', speaker: '小精灵', content: `${opening}这一关的目标是：${level.goal}。` },
    { type: 'image_text', image: desc.concept.image, speaker: '小精灵', content: `今天请「${desc.concept.name}」来帮忙：${desc.concept.detail}` },
    // 第三页点名这一关真正要用的积木，名字和插画必须对上。
    {
      type: 'image_text',
      image: BLOCK_IMAGE[desc.focusBlock],
      speaker: '机器人',
      content: `这一关真正要用的就是「${focusName}」。${desc.how}`,
    },
    { type: 'text', speaker: '小精灵', content: '把积木拖到工作区，连好，再点「运行」，我就能走完啦！' },
  ]

  // 复习卡讲上一关：问的是上一关学了什么，答的是上一关的做法。
  // 做法用上一关推导出来的「不带积木名」的版本，免得孩子在本关的积木盘里
  // 找一块这一关根本没有的积木。
  const prev = previous ? analyzeLevel(previous) : null
  const review = prev
    ? {
        question: `上一关我们学了「${prev.concept.name}」，还记得怎么用吗？`,
        answer: prev.concept.detail,
        hint: prev.plain,
      }
    : undefined

  return { intro_story, review }
}

// ---------------------------------------------------------------------------
// 自由舞台（Level 2 / Level 3）专用：绘本、提示、复习卡
// ---------------------------------------------------------------------------

/**
 * 舞台关卡的分析层。
 *
 * 和网格关一样，文案里的每个数字都必须从标准解和场景里反推出来，
 * 不能写「多接几个苹果」这种没法核对的句子。
 * 生成器会把这些数字放进 level.facts，这里只管把它们讲成故事。
 *
 * facts 的字段（生成器负责填）：
 *   kind          这一关属于哪一类玩法：collect / dodge / clone / nested
 *   targetCount   要收集的目标个数
 *   scoreTotal    满分是多少分
 *   speed         角色每步走多少
 *   goalX         终点的 x（没有终点就是 null）
 *   hazardCount   路上有几个障碍
 *   hazardHits    标准解会被撞到几个
 *   lives         生命值（没有就是 null）
 *   cloneCount    有几个克隆模板
 *   enemyCount    有几个敌人
 */
export function analyzeStageLevel(level) {
  const facts = level.facts ?? {}
  const kind = facts.kind ?? 'collect'
  if (kind === 'collect') return analyzeStageCollect(level, facts)
  if (kind === 'dodge') return analyzeStageDodge(level, facts)
  if (kind === 'clone') return analyzeStageClone(level, facts)
  if (kind === 'tower') return analyzeStageTower(level, facts)
  return analyzeStageNested(level, facts)
}

/** 接东西：角色一路扫过去，碰到就加分。 */
function analyzeStageCollect(level, facts) {
  const count = Number(facts.targetCount ?? 0)
  const total = Number(facts.scoreTotal ?? count)
  const speed = Number(facts.speed ?? 0)
  const name = facts.targetName ?? '目标'
  const bonus = Number(facts.bonusTargets ?? 0)
  const bonusText = bonus > 0 ? `，其中 ${bonus} 个要加 2 分` : ''
  return {
    shape: 'stageCollect',
    focusBlock: 'if_touching',
    concept: { name: '边走边接', detail: '角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。', image: 'block_if' },
    how: `先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」${speed} 步，再给 ${count} 个${name}各配一个「如果碰到」，体里放「变量增加」1 分${bonusText}。`,
    plain: `上一关接住了 ${count} 个${name}，score 记成了 ${total} 分。`,
    check: `score 要正好等于 ${total}：每个「如果碰到」都要选对${name}，而且每次只加 1 分。`,
    goal: `接住 ${count} 个${name}，把 score 加到 ${total}`,
    numbers: [count, total, speed],
  }
}

/** 躲障碍：碰到要扣命，走得快就能躲开。 */
function analyzeStageDodge(level, facts) {
  const bombs = Number(facts.hazardCount ?? 0)
  const hits = Number(facts.hazardHits ?? 0)
  const coins = Number(facts.targetCount ?? 0)
  const lives = Number(facts.lives ?? 0)
  const speed = Number(facts.speed ?? 0)
  return {
    shape: 'stageDodge',
    focusBlock: 'if_touching',
    concept: { name: '躲开危险', detail: '碰到危险要扣分，看准时机走过去就能毫发无损。', image: 'idea' },
    how: `先用「设置变量」把 lives 设成 ${lives}，再放「无限循环」：里面先放「移动」${speed} 步，再给 ${bombs} 个障碍各配一个「如果碰到」，体里放「变量增加」-1。`,
    plain: `上一关路上有 ${bombs} 个障碍，撞到 ${hits} 次，剩下 ${lives - hits} 条命。`,
    check: `lives 要正好剩 ${lives - hits} 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。`,
    goal: `在 ${bombs} 个障碍里只撞到 ${hits} 个，同时接住 ${coins} 个目标`,
    numbers: [bombs, hits, lives, speed],
  }
}

/** 克隆：按直线、双发、散弹、追踪和混合模式讲解同一套生产积木。 */
function analyzeStageClone(level, facts) {
  const enemies = Number(facts.enemyCount ?? 0)
  const score = Number(facts.enemyScore ?? enemies)
  const clones = Number(facts.cloneCount ?? 1)
  const speed = Number(facts.speed ?? 0)
  const pattern = facts.pattern ?? 'straight'

  if (pattern === 'spread' || pattern === 'mixed') {
    const mixed = pattern === 'mixed'
    return {
      shape: mixed ? 'stageMixed' : 'stageSpread',
      focusBlock: 'clone',
      concept: {
        name: mixed ? '组合火力' : '三向散弹',
        detail: mixed
          ? '把三路散弹和折线追踪拼在同一套程序里，交替处理不同位置的目标。'
          : '同一轮复制出三颗子弹，分别沿左、中、右三条路线飞行。',
        image: 'block_clone',
      },
      how: mixed
        ? `放一块「无限循环」，依次「克隆」左、中、右三路散弹和追踪父弹；散弹负责正面航线，父弹「如果碰到」定位星星后，再「克隆」一颗转向弹。每颗子弹都用「移动」前进，命中后「变量增加」1 分。`
        : `放一块「无限循环」，里面依次放三块「克隆」，分别生成左、中、右三路子弹。每颗子弹里先「移动」，再用「如果碰到」检查敌人，命中后「变量增加」1 分。`,
      plain: `上一关${mixed ? '组合了三向散弹和折线追踪' : '同时放出了左、中、右三路子弹'}，打掉 ${enemies} 个敌人，score 记成 ${score} 分。`,
      check: `score 要正好等于 ${score}：三路弹药的方向和「如果碰到」的目标要配对，每中一次只加 1 分。`,
      goal: `用${mixed ? '组合火力' : '三向散弹'}消灭 ${enemies} 个敌人`,
      numbers: [enemies, clones, speed, ...(facts.spreadDirections ?? [])],
    }
  }

  if (pattern === 'tracking') {
    return {
      shape: 'stageTracking',
      focusBlock: 'clone',
      concept: { name: '折线追踪', detail: '先沿直线找到定位点，再换成朝目标飞去的第二段路线。', image: 'block_clone' },
      how: `「克隆」一颗追踪父弹，让它先「移动」向上飞；父弹「如果碰到」定位星星后，从当前位置再「克隆」一颗转向弹，转向弹「移动」到敌人身上并「变量增加」1 分。`,
      plain: `上一关用两段路线打掉 ${enemies} 个敌人，score 记成 ${score} 分。`,
      check: `score 要正好等于 ${score}：父弹要先碰到定位星星，转向弹的方向要和对应敌人一致。`,
      goal: `用折线追踪消灭 ${enemies} 个敌人`,
      numbers: [enemies, Number(facts.trackingGuides ?? 0), speed],
    }
  }

  if (pattern === 'twin') {
    return {
      shape: 'stageTwin',
      focusBlock: 'clone',
      concept: { name: '双重火力', detail: '两种弹药同时出发，一路清理航线上的目标。', image: 'block_clone' },
      how: `用两块「无限循环」分别「克隆」普通弹和炮弹，两个循环会同时运行。每颗子弹里先「移动」，再「如果碰到」敌人，「变量增加」1 分。`,
      plain: `上一关用了两种弹药，打掉 ${enemies} 个敌人，score 记成 ${score} 分。`,
      check: `score 要正好等于 ${score}：两条发射程序都要保留，子弹碰到敌人后再加分。`,
      goal: `用双重火力消灭 ${enemies} 个敌人`,
      numbers: [enemies, clones, speed],
    }
  }

  return {
    shape: 'stageClone',
    focusBlock: 'clone',
    // 概念名和 detail 不写积木名，复习卡跨到下一单元时才不会让孩子找错积木。
    concept: { name: '造出新角色', detail: '复制出一个一模一样的角色，让它自己跑你写在里面的积木。', image: 'block_clone' },
    how: `放一块「无限循环」让角色每步走 ${speed}，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。`,
    plain: `上一关复制出了 ${clones} 种新角色，打掉了 ${enemies} 个敌人，score 记成了 ${score} 分。`,
    check: `score 要正好等于 ${score}：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。`,
    goal: `用克隆发射，消灭 ${enemies} 个敌人`,
    numbers: [enemies, clones, speed],
  }
}

/** 塔防：重叠怪物形成嵌套判断，辅助塔与玩家同时开火。 */
function analyzeStageTower(level, facts) {
  const enemies = Number(facts.enemyCount ?? 0)
  const score = Number(facts.enemyScore ?? enemies)
  const groups = Number(facts.monsterGroups ?? 0)
  const speed = Number(facts.speed ?? 0)
  const mix = facts.monsterMix ?? {}
  const single = Number(mix.single ?? 0)
  const pair = Number(mix.pair ?? 0)
  const triple = Number(mix.triple ?? 0)
  const hazards = Number(facts.hazardCount ?? 0)
  const hits = Number(facts.hazardHits ?? 0)
  const lives = Number(facts.lives ?? 0)
  const helper = Boolean(facts.helper)
  return {
    shape: 'stageTower',
    focusBlock: 'if_touching',
    concept: {
      name: '塔防编队',
      detail: '单怪、双怪和三怪叠在一起，外层判断通过后再检查内层，辅助塔同时开火。',
      image: 'block_if',
    },
    how: `先用「设置变量」把 score 清成 0，再放「无限循环」让飞船「移动」${speed} 步并「克隆」防守子弹。每颗子弹里给最外层怪物放「如果碰到」，里面继续检查重叠怪物，命中后按分值「变量增加」${hazards ? `；同时把 lives 设成 ${lives}，碰到障碍就「变量增加」-1` : ''}。${helper ? '蜜蜂塔会自动发射炮弹，和你一起清理编队。' : ''}`,
    plain: `上一关有 ${single} 组单怪、${pair} 组双怪、${triple} 组三怪，辅助塔${helper ? '参与了防守' : '没有上场'}，最后得到 ${score} 分。`,
    check: `score 要正好等于 ${score}：先检查每组最外层怪物，再检查重叠的内层怪物${hazards ? `；lives 要剩 ${lives - hits} 条` : ''}。`,
    goal: `清理 ${groups} 组塔防怪物，把 score 加到 ${score}`,
    numbers: [groups, single, pair, triple, score, speed],
  }
}

/** 复杂逻辑：条件里再套条件，一次判断好几件事。 */
function analyzeStageNested(level, facts) {
  const count = Number(facts.targetCount ?? 0)
  const total = Number(facts.scoreTotal ?? count)
  const bonus = Number(facts.bonusTargets ?? 0)
  const lives = Number(facts.lives ?? 0)
  const speed = Number(facts.speed ?? 0)
  const nested = facts.nestedRule ?? '碰到特殊目标的时候，条件里面还要再放一层积木'
  return {
    shape: 'stageNested',
    focusBlock: 'if_touching',
    concept: { name: '条件套条件', detail: '条件积木里面还能再放积木，判断可以一层一层叠起来。', image: 'block_if' },
    how: `先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」${speed} 步，再放「如果碰到」；${nested}${bonus > 0 ? `，${bonus} 个特殊目标一次加 2 分` : ''}。`,
    plain: `上一关用了条件套条件，一共拿到 ${total} 分。`,
    check: `score 要正好等于 ${total}：先检查外层条件，再照着里面的写法做，别把两层积木放反了。`,
    goal: `用套起来的条件拿到 ${total} 分`,
    numbers: [count, total, speed],
  }
}

/** 舞台关卡的两条提示。 */
export function buildStageHints(level) {
  const desc = analyzeStageLevel(level)
  return [
    {
      trigger: 'initial',
      text: desc.how,
      focus: { target: 'block', blockType: desc.focusBlock },
    },
    {
      trigger: 'not_completed',
      text: desc.check,
      focus: { target: 'block', blockType: desc.focusBlock },
    },
  ]
}

/**
 * 舞台关卡的绘本和复习卡。
 *
 * 和网格关一样的规矩：绘本里提到的每一块积木、每一个数字，
 * 都必须能从这一关的标准解推出来。
 */
export function buildStageStoryFor(level, previous) {
  const desc = analyzeStageLevel(level)
  const opening = OPENINGS[level.sortOrder % OPENINGS.length]
  const focusName = STAGE_BLOCK_NAME[desc.focusBlock]

  const intro_story = [
    { type: 'text', speaker: '小精灵', content: `${opening}这一关的目标是：${level.goal}。` },
    { type: 'image_text', image: 'stage', speaker: '小精灵', content: `欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。` },
    {
      type: 'image_text',
      image: desc.concept.image,
      speaker: '小精灵',
      content: `今天请「${desc.concept.name}」来帮忙：${desc.concept.detail}`,
    },
    {
      type: 'image_text',
      image: STAGE_BLOCK_IMAGE[desc.focusBlock],
      speaker: '机器人',
      content: `这一关真正要用的就是「${focusName}」。${desc.how}`,
    },
    { type: 'text', speaker: '小精灵', content: '把积木拖到工作区，连好，再点「运行」，我就能走完啦！' },
  ]

  const prev = previous ? analyzeStageLevel(previous) : null
  const review = prev
    ? {
        question: `上一关我们学了「${prev.concept.name}」，还记得怎么用吗？`,
        answer: prev.concept.detail,
        hint: prev.plain,
      }
    : undefined

  return { intro_story, review }
}

/**
 * 标准解的 children 既按顺序列出节点、节点之间又带 next 链，
 * 直接摊平会把同一块数好几遍；这里按节点引用去重。
 */
function uniqueNodesOf(solution) {
  const seen = new Set()
  const nodes = []
  const visit = (list) => {
    for (const node of list ?? []) {
      if (!node || seen.has(node)) continue
      seen.add(node)
      nodes.push(node)
      if (node.children) visit(node.children)
      if (node.next) visit([node.next])
    }
  }
  visit(solution ?? [])
  return nodes
}

/** 一个「如果碰到」的检查条件、要学生照着搭的说法、和没搭对时的提醒。 */
function touchTeaching(node, within) {
  const target = String(node.args.target_sprite_id)
  const gain = flatOf(node.children).find((child) => child.type === 'change_variable')
  const value = gain?.args?.value ?? 1
  const varId = gain ? String(gain.args.variable_id) : 'score'
  return {
    check: {
      type: 'if_touching',
      args: { target_sprite_id: target },
      ...(within ? { within } : {}),
      contains: [{ type: 'change_variable', args: { variable_id: varId, value } }],
    },
    text: `「如果碰到」选 ${target}，里面放「变量 ${varId} 增加 ${value}」`,
    fail: `「如果碰到 ${target}」要选对精灵，里面还要有「变量 ${varId} 增加 ${value}」`,
  }
}

/**
 * 分步引导：把标准解拆成学生能一步一步照着搭的检查点。
 *
 * 四类玩法（接物、躲障碍、克隆发射、塔防）都按同一套结构拆：
 * 设变量 → 主循环 → 移动 → 主循环里的判断 → 发射循环 → 克隆 → 克隆里的循环与判断。
 * 每步的条件和文案里的数字、精灵名都从这一关的标准解反推，
 * 不写死「苹果」或「加 1」，免得和关卡数据对不上。
 */
export function buildStageTeachingSteps(level) {
  const top = flatOf(level.solution ?? [])
  const loops = top.filter((node) => node.type === 'forever')
  const setVars = top.filter((node) => node.type === 'set_variable')
  if (!setVars.length || !loops.length) return undefined

  const playerLoop = loops[0]
  const fireLoop = loops[1]
  const playerBody = uniqueNodesOf(playerLoop.children)
  const playerMove = playerBody.find((node) => node.type === 'move_steps')
  const playerTouches = playerBody.filter((node) => node.type === 'if_touching')
  const clone = fireLoop ? fireLoop.children && flatOf(fireLoop.children).find((node) => node.type === 'clone') : null
  const innerLoop = clone ? flatOf(clone.children).find((node) => node.type === 'forever') : null
  const innerBody = innerLoop ? uniqueNodesOf(innerLoop.children) : []
  const innerMove = innerBody.find((node) => node.type === 'move_steps')
  const innerTouches = innerBody.filter((node) => node.type === 'if_touching')
  const steps = []

  const setTexts = setVars.map((node) => `「设置变量」选 ${node.args.variable_id}，填 ${node.args.value}`)
  const setChecks = setVars.map((node) => ({
    type: 'set_variable',
    args: { variable_id: String(node.args.variable_id), value: node.args.value },
  }))
  steps.push({
    text: `先把变量设好：${setTexts.join('；')}。`,
    check: setChecks.length === 1 ? setChecks[0] : { all: setChecks },
    fail_text: `还没把变量设好：${setTexts.join('；')}。`,
    done_text: '变量设好啦！',
  })
  steps.push({
    text: '放一块「无限循环」，让角色一直重复同一件事。',
    check: { type: 'forever' },
    fail_text: '还没有「无限循环」。先拖一块放到工作区。',
    done_text: '循环搭好了！',
  })

  if (playerMove) {
    steps.push({
      text: `在循环里放「移动」，步数填 ${playerMove.args.steps}。`,
      check: { type: 'move_steps', args: { steps: playerMove.args.steps }, within: ['forever'] },
      fail_text: `循环里还没有「移动 ${playerMove.args.steps} 步」。`,
      done_text: '走得对！',
    })
  }
  if (playerTouches.length) {
    const items = playerTouches.map((node) => touchTeaching(node, ['forever']))
    steps.push({
      text: `在循环里依次放好判断：${items.map((item) => item.text).join('；')}。`,
      check: items.length === 1 ? items[0].check : { all: items.map((item) => item.check) },
      fail_text: `还差这些判断：${items.map((item) => item.fail).join('；')}。`,
      done_text: '角色会自己判断啦！',
    })
  }

  if (clone) {
    steps.push({
      text: `再放一块「无限循环」，里面放「克隆」，编号选 ${clone.args.clone_id}。`,
      check: { type: 'clone', args: { clone_id: String(clone.args.clone_id) }, within: ['forever'] },
      fail_text: `还没有「克隆 ${clone.args.clone_id}」。把它放进第二块「无限循环」里。`,
      done_text: '发射器搭好啦！',
    })
  }
  if (innerLoop) {
    steps.push({
      text: '在「克隆」里面也放一块「无限循环」。',
      check: { type: 'forever', within: ['clone'] },
      fail_text: '「克隆」里面还没有「无限循环」，把克隆体里的动作包起来。',
      done_text: '克隆体也动起来啦！',
    })
  }
  if (innerMove) {
    steps.push({
      text: `在克隆的循环里放「移动」，步数填 ${innerMove.args.steps}。`,
      check: { type: 'move_steps', args: { steps: innerMove.args.steps }, within: ['clone', 'forever'] },
      fail_text: `克隆里还没有「移动 ${innerMove.args.steps} 步」。`,
      done_text: '子弹飞出去啦！',
    })
  }
  if (innerTouches.length) {
    const items = innerTouches.map((node) => touchTeaching(node, ['clone', 'forever']))
    steps.push({
      text: `在克隆里放好判断：${items.map((item) => item.text).join('；')}。`,
      check: items.length === 1 ? items[0].check : { all: items.map((item) => item.check) },
      fail_text: `还差这些判断：${items.map((item) => item.fail).join('；')}。`,
      done_text: '能打中目标啦！',
    })
  }

  return steps
}

/**
 * 通关后的思考题：挑标准解里的一个「移动步数」改小，让学生先猜、再改、再看结果。
 * 接物、躲障碍、克隆、塔防四类玩法都适用，只是问的角色和结果不同。
 */
export function buildStageReflection(level) {
  const seen = new Set()
  const moves = []
  const visit = (list, ancestors) => {
    for (const node of list ?? []) {
      if (!node || seen.has(node)) continue
      seen.add(node)
      if (node.type === 'move_steps') moves.push({ node, ancestors })
      if (node.children) visit(node.children, [...ancestors, node])
      if (node.next) visit([node.next], ancestors)
    }
  }
  visit(level.solution ?? [], [])
  if (!moves.length) return undefined
  const last = moves[moves.length - 1]
  const move = last.node
  const cloneAncestor = [...last.ancestors].reverse().find((parent) => parent.type === 'clone')
  const within = cloneAncestor ? ['clone'] : last.ancestors.some((parent) => parent.type === 'forever') ? ['forever'] : undefined
  const ancestorArgs = cloneAncestor
    ? [{ type: 'clone', arg: 'clone_id', value: cloneAncestor.args.clone_id }]
    : undefined
  const current = Number(move.args.steps)
  if (!Number.isFinite(current) || current < 2) return undefined
  const suggested = Math.max(1, Math.floor(current / 2))
  const kind = level.facts?.kind ?? 'collect'
  const shooting = kind === 'clone' || kind === 'tower'
  const subject = shooting ? '子弹' : '机器人'
  const goal = shooting ? '打中敌人' : '接到目标'

  return {
    question: `这一关过啦！想一想：把「移动」的 ${current} 步改成 ${suggested} 步，${subject}还能${goal}吗？你来试试。`,
    target: {
      type: 'move_steps',
      arg: 'steps',
      current,
      suggested,
      ...(within ? { within } : {}),
      ...(ancestorArgs ? { ancestorArgs } : {}),
    },
    try_text: `找到「移动」，把 ${current} 改成 ${suggested}，再点「运行」，看看发生什么。`,
    ran_text: `看到区别了吗？步数从 ${current} 变成 ${suggested}，${subject}走慢了，就没那么容易${goal}了。点这里完成。`,
    fail_text: `还没改到「移动」的步数呢：把 ${current} 改成 ${suggested}，再点一次「运行」。`,
  }
}

/**
 * 网格关的分步引导。
 *
 * 纯直线关（标准解只有「前进」）跳过：那只是数格子，没有概念也没有可改参数，
 * 硬拆成一步一块反而干扰学生。其余关卡按顶层结构拆：
 * 有「重复执行」的按每块循环讲一次，折线按段用累计块数检查。
 */
export function buildGridTeachingSteps(level) {
  const top = flatOf(level.solution ?? [])
  if (!top.length || top.every((node) => node.type === 'move_forward')) return undefined
  const steps = []
  const repeats = top.filter((node) => node.type === 'repeat')
  const turns = top.filter((node) => node.type === 'turn_left' || node.type === 'turn_right')

  repeats.forEach((node, index) => {
    const times = Number(node.args.times)
    const children = flatOf(node.children)
    const childChecks = children.map((child) => {
      if (child.type.startsWith('if_')) {
        const turn = flatOf(child.children).find((item) => item.type === 'turn_left' || item.type === 'turn_right')
        return turn ? { type: child.type, contains: [{ type: turn.type }] } : { type: child.type }
      }
      if (child.type === 'repeat') return { type: 'repeat', args: { times: child.args.times } }
      return { type: child.type }
    })
    const names = {
      move_forward: '前进',
      turn_left: '左转',
      turn_right: '右转',
      repeat: '重复执行',
    }
    const inside = [...new Set(children.map((child) => names[child.type] ?? (child.type.startsWith('if_') ? '如果判断' : child.type)))].join('、')
    steps.push({
      text: `放第 ${index + 1} 块「重复执行」，次数填 ${times}，里面放：${inside}。`,
      check: { type: 'repeat', args: { times }, contains: childChecks },
      fail_text: `第 ${index + 1} 块「重复执行」还没搭好：次数要是 ${times}，里面要有${inside}。`,
      done_text: '这一段路线搭好啦！',
    })
  })

  if (!repeats.length && turns.length) {
    let moves = 0
    const turnCounts = { turn_left: 0, turn_right: 0 }
    const marks = []
    for (const node of top) {
      if (node.type === 'move_forward') moves += 1
      else if (node.type === 'turn_left' || node.type === 'turn_right') {
        turnCounts[node.type] += 1
        marks.push({ moves, turns: { ...turnCounts } })
      }
    }
    marks.forEach((mark, index) => {
      // 左转、右转要分别数：标准解是完整程序，早期段落只要求「已经放了这么多」。
      const parts = Object.entries(mark.turns)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => `${count} 块「${type === 'turn_left' ? '左转' : '右转'}」`)
      const turnChecks = Object.entries(mark.turns)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => count > 1 ? { count: { type, value: count, atLeast: true } } : { type })
      steps.push({
        text: `第 ${index + 1} 段：放 ${mark.moves} 块「前进」，再放 ${parts.join('、')}。`,
        check: { all: [{ count: { type: 'move_forward', value: mark.moves, atLeast: true } }, ...turnChecks] },
        fail_text: `第 ${index + 1} 段还不对：工作区要有 ${mark.moves} 块「前进」和${parts.join('、')}。`,
        done_text: '转弯接上了！',
      })
    })
    const last = marks.length ? marks[marks.length - 1].moves : 0
    if (moves > last) {
      steps.push({
        text: `最后再放 ${moves - last} 块「前进」，一直走到终点。`,
        check: { count: { type: 'move_forward', value: moves } },
        fail_text: `前进积木应该是 ${moves} 块，再数一遍。`,
        done_text: '路线排好啦！',
      })
    }
  }

  return steps.length ? steps : undefined
}

/** 网格关的思考题：把第一块「重复执行」的次数减一次，看机器人会不会走不到终点。 */
export function buildGridReflection(level) {
  const seen = new Set()
  const repeats = []
  const visit = (list) => {
    for (const node of list ?? []) {
      if (!node || seen.has(node)) continue
      seen.add(node)
      if (node.type === 'repeat') repeats.push(node)
      if (node.children) visit(node.children)
      if (node.next) visit([node.next])
    }
  }
  visit(level.solution ?? [])
  // 长方形关的外层循环只做 1 次，跳过它，挑第一块真正能改的循环。
  const index = repeats.findIndex((node) => Number(node.args.times) >= 2)
  if (index < 0) return undefined
  const current = Number(repeats[index].args.times)
  const suggested = Math.max(1, current - 1)
  const label = `第 ${index + 1} 块「重复执行」`

  return {
    question: `路线走通啦！想一想：把${label}的次数从 ${current} 改成 ${suggested}，机器人还能走到终点吗？你来试试。`,
    target: { type: 'repeat', arg: 'times', current, suggested, nth: index + 1 },
    try_text: `找到${label}，把次数 ${current} 改成 ${suggested}，再点「运行」，看看发生什么。`,
    ran_text: `看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。`,
    fail_text: `还没改到次数：把${label}的 ${current} 改成 ${suggested}，再点一次「运行」。`,
  }
}
