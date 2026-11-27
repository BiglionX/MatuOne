/**
 * Blockly 第一学期 80 关生成器。
 *
 * 用法：npx tsx scripts/generate-blockly-80.mjs
 *
 * 产出两样东西：
 *   1. supabase/migrations/20261126160000_blockly_level_1_80_generated.sql
 *      —— 一次把第一学期扩到 80 关的迁移（含后续学期的编号重排）。
 *   2. scripts/generated/blockly-80.manifest.json
 *      —— 每关的标准解和正文，测试直接读它，不连数据库。
 *
 * 关键约束：
 *   - 每关都用生产解析器（parseModuleLevelBody）和生产解释器（interpretModuleLevel）自校验，
 *     标准解必须真的能通关，不合格直接抛错，不允许把半成品写进 SQL。
 *   - 只生成文件，不连数据库。迁移要人工确认后再执行。
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseModuleLevelBody } from '../src/modules/curriculum/moduleLevelBody.ts'
import { interpretModuleLevel } from '../src/modules/curriculum/moduleLevelInterpreter.ts'
import {
  BLOCK_DEFS,
  TERM_ID,
  UNIT_IDS,
  blockTypesOf,
  corridorScene,
  countActions,
  countBlocks,
  fwd,
  ifElse,
  ifPath,
  ifWall,
  pickSafeVariant,
  placeCollectibles,
  rep,
  simulatePath,
  transformPath,
  turnL,
  turnR,
} from './blockly-level-recipes.mjs'
import { analyzeLevel, buildHints, buildStoryFor } from './blockly-story-recipes.mjs'

const ROOT = process.cwd()
const SQL_PATH = path.join(ROOT, 'supabase/migrations/20261126160000_blockly_level_1_80_generated.sql')
const MANIFEST_PATH = path.join(ROOT, 'scripts/generated/blockly-80.manifest.json')
/** 绘本样板的独立迁移：给教研老师看「一条关卡正文长什么样」。 */
const SAMPLE_SQL_PATH = path.join(ROOT, 'supabase/migrations/20261126170000_blockly_intro_story_sample.sql')
/** 样板迁移覆盖的关卡：前 5 关。 */
const SAMPLE_LEVEL_IDS = ['blk-001', 'blk-002', 'blk-003', 'blk-004', 'blk-005']

/** 后面三个学期的占位关卡挪到预留号段，避免和第一学期的 80 关撞号。 */
const RESERVED_RANGES = [
  { termId: 'blk-g1-spring', from: 16, to: 30, target: 81 },
  { termId: 'blk-g2-fall', from: 31, to: 45, target: 161 },
  { termId: 'blk-g2-spring', from: 46, to: 60, target: 241 },
]

const UNIT_META = [
  {
    unitId: UNIT_IDS.U1,
    sortOrder: 1,
    title: '走直线',
    summary: '只有一块「前进」积木。学会数步数，让机器人一条直线走到终点。',
    knowledgeTags: ['sequence', 'move'],
  },
  {
    unitId: UNIT_IDS.U2,
    sortOrder: 2,
    title: '转向与路径',
    summary: '加上左转和右转，走出 L 形、之字形和 U 形路线，起点和终点每次都不一样。',
    knowledgeTags: ['sequence', 'turn', 'path'],
  },
  {
    unitId: UNIT_IDS.U3,
    sortOrder: 3,
    title: '循环的威力',
    summary: '用「重复执行」走长道，用内外两层循环绕出正方形和长方形。',
    knowledgeTags: ['loop', 'nested_loop'],
  },
  {
    unitId: UNIT_IDS.U4,
    sortOrder: 4,
    title: '条件与岔路',
    summary: '学会用「如果」让电脑自己判断，遇到墙自己转弯，绕着房间走一圈又一圈。',
    knowledgeTags: ['condition', 'if', 'loop'],
  },
  {
    unitId: UNIT_IDS.U5,
    sortOrder: 5,
    title: '综合大挑战',
    summary: '顺序、循环、条件一起上，连续闯过几个大迷宫，完成学期作品。',
    knowledgeTags: ['project', 'sequence', 'turn', 'loop', 'condition'],
  },
]

/** 打字活动的练习串：键位练习和单词练习各准备一组。 */
const TYPING_KEYS = ['asdf jkl;', 'eieio', 'wsx zcvn', 'rtyu ghjk', 'qwert asdfg']
const TYPING_WORDS = ['forward', 'turn left', 'turn right', 'repeat', 'go home']

// ---------------------------------------------------------------------------
// 关卡组装
// ---------------------------------------------------------------------------

function availableBlocks(types) {
  return types.map((type) => BLOCK_DEFS[type])
}

/** 积木盘的固定顺序：动作 → 控制，和积木选择器的分类一致。 */
const BLOCK_ORDER = [
  'move_forward',
  'turn_left',
  'turn_right',
  'repeat',
  'if_wall_ahead',
  'if_path_ahead',
  'if_else',
]

/**
 * 积木盘 = 本关允许的积木 + 标准解实际用到的积木。
 *
 * 变体系统会把左右转互换，所以标准解可能需要「左转」而关卡原本只给了「右转」。
 * 解释器遇到积木盘上没有的类型会直接报错，这里统一兜住。
 */
function palette(types, program) {
  const merged = new Set([...types, ...blockTypesOf(program)])
  return availableBlocks(BLOCK_ORDER.filter((type) => merged.has(type)))
}

/**
 * 关卡正文。
 *
 * hints 先留空：提示和绘本都由 blockly-story-recipes.mjs 从标准解反推后填进来，
 * 填好之后 sealLevel 会用生产解析器再验一遍正文。
 */
function buildBody({ scene, blocks, maxBlocks, maxSteps, visuals, activities, successText, successCheck }) {
  const body = {
    schema_version: 2,
    scene_type: 'grid',
    scene,
    available_blocks: blocks,
    success_check: successCheck ?? { type: 'actor_at_goal', actor_id: 'player' },
    workspace: { initial_blocks: [], max_blocks: maxBlocks, require_connected: true },
    runtime: { out_of_bounds: 'blocked', max_steps: maxSteps, stop_on_success: true, move_duration_ms: 450 },
    hints: [],
    completion: { stars: 3, success_text: successText },
  }
  if (visuals) body.visuals = visuals
  if (activities) body.activities = activities
  return body
}

/** 网格场景。cells 是路径格（已平移到网格内），obstacles 是墙。 */
function gridScene({ width, height, start, goal, obstacles, entities }) {
  return {
    type: 'grid',
    width,
    height,
    start,
    goal,
    actor: { id: 'player', asset: 'grid_robot' },
    obstacles,
    entities: entities ?? [],
  }
}

/**
 * 自校验：标准解必须真的通关，而且步数和积木数都在上限内。
 *
 * 走生产解析器是为了连正文 schema 一起验，正文写错了这里就会炸。
 */
function verify(level) {
  const parsed = parseModuleLevelBody(level.body)
  let result
  try {
    result = interpretModuleLevel(parsed, level.solution)
  } catch (error) {
    throw new Error(`${level.levelId} 标准解跑不通：${error instanceof Error ? error.message : String(error)}`)
  }
  if (!result.completed) {
    throw new Error(`${level.levelId} 标准解没有通关：最终位置 (${result.final.x},${result.final.y})，终点 (${parsed.scene.goal.x},${parsed.scene.goal.y})`)
  }
  // 终点必须只被经过一次，而且不能和起点重合。
  // 撞上中间经过的格子会让机器人在半路就判定通关，标准解的步数对不上。
  const trail = result.final.trail
  const goalHits = trail.filter((cell) => cell.x === parsed.scene.goal.x && cell.y === parsed.scene.goal.y).length
  if (goalHits !== 1) {
    throw new Error(`${level.levelId} 终点 (${parsed.scene.goal.x},${parsed.scene.goal.y}) 在路线上出现了 ${goalHits} 次，终点必须唯一`)
  }
  if (trail[0].x === parsed.scene.goal.x && trail[0].y === parsed.scene.goal.y) {
    throw new Error(`${level.levelId} 终点和起点重合`)
  }
  const blocks = countBlocks(level.solution)
  if (blocks > parsed.workspace.max_blocks) {
    throw new Error(`${level.levelId} 标准解用了 ${blocks} 块积木，超过上限 ${parsed.workspace.max_blocks}`)
  }
  if (result.steps.length > parsed.runtime.max_steps) {
    throw new Error(`${level.levelId} 标准解走了 ${result.steps.length} 步，超过上限 ${parsed.runtime.max_steps}`)
  }
  return { parsed, result, blocks }
}

/**
 * 用真实步数回填 max_steps，再验一次。
 *
 * maxStepsSlack 是留给学生的余量：重复次数调大一点会多出几步「撞墙」，
 * 余量不够的话运行会被截断，学生明明走到了终点却看到失败。
 */
function sealLevel(level) {
  const first = verify({ ...level, body: { ...level.body, runtime: { ...level.body.runtime, max_steps: 400 } } })
  const maxSteps = Math.max(first.result.steps.length + 2 + (level.maxStepsSlack ?? 0), 4)
  const sealed = { ...level, body: { ...level.body, runtime: { ...level.body.runtime, max_steps: maxSteps } } }
  const second = verify(sealed)
  return {
    ...sealed,
    maxSteps,
    steps: second.result.steps.length,
    blocks: countBlocks(sealed.solution),
    trail: second.result.final.trail,
  }
}

// ---------------------------------------------------------------------------
// U1：只有前进
// ---------------------------------------------------------------------------

const U1_TITLES = [
  '小小出发', '再走一步', '三格直线', '四格不回头', '五格长廊',
  '六格前进', '七格通道', '八格长道', '九格冲刺', '十格挑战',
  '十一格直行', '十二格大道', '十三格远征', '十四格长跑', '十五格耐力赛', '十六格终点线',
]

function unit1Levels() {
  const levels = []
  for (let index = 0; index < 16; index += 1) {
    const distance = index + 1
    const program = Array.from({ length: distance }, () => fwd())
    const { cells } = simulatePath(program)
    const scene = corridorScene(cells)
    const phase = index % 5
    const coins = phase === 1 ? 1 : phase === 2 ? 2 : 0
    const showTrail = phase >= 2
    const typing = phase === 4
    const levelType = phase === 3 ? 'practice' : typing ? 'typing' : 'new'
    levels.push({
      levelId: `blk-${String(index + 1).padStart(3, '0')}`,
      sortOrder: index + 1,
      unitId: UNIT_IDS.U1,
      title: U1_TITLES[index],
      levelType,
      knowledgeTags: ['sequence', 'move'],
      milestoneBadge: null,
      estimatedMinutes: 15,
      solution: program,
      body: buildBody({
        scene: gridScene({
          width: scene.width,
          height: scene.height,
          start: { x: scene.start.x, y: scene.start.y, heading: 'E' },
          goal: { x: scene.goal.x, y: scene.goal.y },
          obstacles: scene.obstacles,
          entities: placeCollectibles(scene.path, coins, `coin-${index + 1}`),
        }),
        blocks: palette(['move_forward'], program),
        maxBlocks: distance,
        maxSteps: distance + 2,
        visuals: showTrail ? { show_trail: true } : undefined,
        activities: typing
          ? { typing: { targets: [TYPING_KEYS[index % TYPING_KEYS.length]], required: false } }
          : undefined,
        successText: `走到终点啦！`,
      }),
    })
  }
  return levels
}

// ---------------------------------------------------------------------------
// U2：加转弯
// ---------------------------------------------------------------------------

/** 折线路线：每段给步数和这一段走完之后的转向。 */
function polyline(segments) {
  const program = []
  for (const segment of segments) {
    for (let step = 0; step < segment.steps; step += 1) program.push(fwd())
    if (segment.turn === 'L') program.push(turnL())
    if (segment.turn === 'R') program.push(turnR())
  }
  return program
}

/**
 * 折线路线（循环版）：每一段用「重复执行」走，转弯用显式积木。
 *
 * 显式版 polyline 一段要几块就写几块「前进」，循环版只写一块「重复执行」，
 * 块数差一个量级——这就是「必须用循环」的强制力来源：
 * 工作区上限卡在循环解的块数上，学生手写一长串前进就会超限。
 */
function polylineLoops(segments) {
  const program = []
  for (const segment of segments) {
    program.push(rep(segment.steps, [fwd()]))
    if (segment.turn === 'L') program.push(turnL())
    if (segment.turn === 'R') program.push(turnR())
  }
  return program
}

const U2_PLANS = [
  { name: 'L', segments: [{ steps: 2, turn: 'R' }, { steps: 2 }] },
  { name: 'L', segments: [{ steps: 3, turn: 'R' }, { steps: 2 }] },
  { name: 'L', segments: [{ steps: 3, turn: 'R' }, { steps: 3 }] },
  { name: 'L', segments: [{ steps: 4, turn: 'R' }, { steps: 3 }] },
  { name: 'Z', segments: [{ steps: 3, turn: 'R' }, { steps: 2, turn: 'L' }, { steps: 3 }] },
  { name: 'Z', segments: [{ steps: 4, turn: 'R' }, { steps: 2, turn: 'L' }, { steps: 4 }] },
  { name: 'Z', segments: [{ steps: 4, turn: 'R' }, { steps: 3, turn: 'L' }, { steps: 4 }] },
  { name: 'Z', segments: [{ steps: 5, turn: 'R' }, { steps: 3, turn: 'L' }, { steps: 5 }] },
  { name: 'U', segments: [{ steps: 3, turn: 'R' }, { steps: 3, turn: 'R' }, { steps: 3 }] },
  { name: 'U', segments: [{ steps: 4, turn: 'R' }, { steps: 3, turn: 'R' }, { steps: 4 }] },
  { name: 'U', segments: [{ steps: 4, turn: 'R' }, { steps: 4, turn: 'R' }, { steps: 4 }] },
  { name: 'U', segments: [{ steps: 5, turn: 'R' }, { steps: 4, turn: 'R' }, { steps: 5 }] },
  { name: 'S', segments: [{ steps: 4, turn: 'R' }, { steps: 2, turn: 'L' }, { steps: 3, turn: 'R' }, { steps: 2 }] },
  { name: 'S', segments: [{ steps: 5, turn: 'R' }, { steps: 3, turn: 'L' }, { steps: 4, turn: 'R' }, { steps: 3 }] },
  { name: 'S', segments: [{ steps: 5, turn: 'R' }, { steps: 3, turn: 'L' }, { steps: 5, turn: 'R' }, { steps: 3 }] },
  { name: 'S', segments: [{ steps: 6, turn: 'R' }, { steps: 4, turn: 'L' }, { steps: 5, turn: 'R' }, { steps: 4 }] },
]

const U2_TITLES = [
  '第一个拐角', '直角路口', '长一点的 L', '大 L 弯',
  '之字形起步', '小 Z 字', '标准之字', '长之字',
  'U 型大道', 'U 型转弯', '宽 U 型', '大 U 型',
  '四段小路', '四段长路', '复杂折线', '终极折线',
]

function unit2Levels() {
  const levels = []
  for (let index = 0; index < 16; index += 1) {
    const plan = U2_PLANS[index]
    const baseProgram = polyline(plan.segments)
    // 每关换一个朝向、镜像或反向，同一条路线能走出完全不同的样子。
    const picked = pickSafeVariant(baseProgram, index * 3)
    if (!picked) throw new Error(`blk-${String(index + 17).padStart(3, '0')} 找不到终点唯一的走法`)
    const program = picked.program
    const scene = corridorScene(picked.cells)
    const phase = index % 5
    const coins = phase === 1 || phase === 2 ? 1 : 0
    const levelType = phase === 3 ? 'practice' : phase === 4 ? 'typing' : 'new'
    levels.push({
      levelId: `blk-${String(index + 17).padStart(3, '0')}`,
      sortOrder: index + 17,
      unitId: UNIT_IDS.U2,
      title: U2_TITLES[index],
      levelType,
      knowledgeTags: ['sequence', 'turn', 'path'],
      milestoneBadge: null,
      estimatedMinutes: 15,
      solution: program,
      body: buildBody({
        scene: gridScene({
          width: scene.width,
          height: scene.height,
          start: { x: scene.start.x, y: scene.start.y, heading: picked.heading },
          goal: { x: scene.goal.x, y: scene.goal.y },
          obstacles: scene.obstacles,
          entities: placeCollectibles(scene.path, coins, `coin-${index + 17}`),
        }),
        blocks: palette(['move_forward', 'turn_left', 'turn_right'], program),
        // 多给一块容错，但不给到能写一长串前进绕过转动的地步。
        maxBlocks: countBlocks(program) + 1,
        maxSteps: countActions(program) + 3,
        visuals: phase >= 2 ? { show_trail: true } : undefined,
        activities: phase === 4
          ? { typing: { targets: [TYPING_WORDS[index % TYPING_WORDS.length]], required: false } }
          : undefined,
        successText: '拐弯成功！',
      }),
    })
  }
  return levels
}

// ---------------------------------------------------------------------------
// U3：循环
// ---------------------------------------------------------------------------

const U3_TITLES = [
  '长直道', '更长直道', '超长直道', '极限直道',
  '画正方形', '大一点的正方形', '正方形花园', '巨型正方形',
  '长方形', '瘦长方形', '宽长方形', '大长方形',
  '循环 U 型', '循环大 U 型', '三段循环', '循环组合技',
]

function unit3Levels() {
  const levels = []
  const specs = []

  // 033-036：超长直道，只靠一块「重复执行」。
  for (const distance of [8, 10, 12, 14]) {
    specs.push({
      title: U3_TITLES[specs.length],
      program: [rep(distance, [fwd()])],
      blocks: ['move_forward', 'repeat'],
      maxBlocks: 2,
      tags: ['loop'],
    })
  }

  // 037-040：正方形，内外两层循环。
  // 走满三条边后，第四条边用一段独立的重复补上，最后再走一步离开正方形——
  // 终点落在正方形外面，才不会在绕圈的中途就判定通关。
  for (const side of [2, 3, 4, 5]) {
    specs.push({
      title: U3_TITLES[specs.length],
      program: [rep(3, [rep(side, [fwd()]), turnR()]), rep(side, [fwd()]), fwd()],
      blocks: ['move_forward', 'turn_right', 'repeat'],
      maxBlocks: 7,
      tags: ['loop', 'nested_loop'],
    })
  }

  // 041-044：长方形，宽和高不一样。
  for (const [wide, tall] of [[4, 2], [5, 2], [4, 3], [6, 3]]) {
    specs.push({
      title: U3_TITLES[specs.length],
      program: [
        rep(1, [rep(wide, [fwd()]), turnR(), rep(tall, [fwd()]), turnR(), rep(wide, [fwd()]), turnR()]),
        rep(tall, [fwd()]),
        fwd(),
      ],
      blocks: ['move_forward', 'turn_right', 'repeat'],
      maxBlocks: 13,
      tags: ['loop', 'nested_loop'],
    })
  }

  // 045-048：三段循环路线。
  for (const [first, second, third] of [[4, 3, 2], [5, 3, 2], [5, 4, 2], [6, 4, 3]]) {
    specs.push({
      title: U3_TITLES[specs.length],
      program: [rep(first, [fwd()]), turnR(), rep(second, [fwd()]), turnR(), rep(third, [fwd()])],
      blocks: ['move_forward', 'turn_right', 'repeat'],
      maxBlocks: 8,
      tags: ['loop', 'sequence'],
    })
  }

  for (let index = 0; index < specs.length; index += 1) {
    const spec = specs[index]
    const picked = pickSafeVariant(spec.program, index * 5)
    if (!picked) throw new Error(`blk-${String(index + 33).padStart(3, '0')} 找不到终点唯一的走法`)
    const program = picked.program
    const scene = corridorScene(picked.cells)
    const phase = index % 5
    const coins = phase === 1 || phase === 2 ? 2 : 0
    const levelType = phase === 3 ? 'practice' : phase === 4 ? 'typing' : 'new'
    levels.push({
      levelId: `blk-${String(index + 33).padStart(3, '0')}`,
      sortOrder: index + 33,
      unitId: UNIT_IDS.U3,
      title: spec.title,
      levelType,
      knowledgeTags: spec.tags,
      milestoneBadge: null,
      estimatedMinutes: 15,
      solution: program,
      body: buildBody({
        scene: gridScene({
          width: scene.width,
          height: scene.height,
          start: { x: scene.start.x, y: scene.start.y, heading: picked.heading },
          goal: { x: scene.goal.x, y: scene.goal.y },
          obstacles: scene.obstacles,
          entities: placeCollectibles(scene.path, coins, `coin-${index + 33}`),
        }),
        blocks: palette(spec.blocks, program),
        maxBlocks: spec.maxBlocks,
        maxSteps: countActions(program) + 4,
        visuals: phase >= 2 ? { show_trail: true } : undefined,
        activities: phase === 4
          ? { typing: { targets: [TYPING_KEYS[(index + 2) % TYPING_KEYS.length]], required: false } }
          : undefined,
        successText: '循环真省力！',
      }),
    })
  }
  return levels
}

// ---------------------------------------------------------------------------
// U4：条件（只向右转的走廊）
// ---------------------------------------------------------------------------

/**
 * 只向右转的路线：每段走若干步，段末右转 90°（东 → 南 → 西 → 北）。
 *
 * 走廊只挖了一条通道，其余格子全是墙，所以每个拐角的正前方必然是墙——
 * 「如果前面有墙就右转」正好能把机器人一路带到走廊尽头。
 * 路线不自交，终点唯一，标准解的步数也唯一确定。
 */
function clockwisePath(lengths) {
  const program = []
  for (let index = 0; index < lengths.length; index += 1) {
    for (let step = 0; step < lengths[index]; step += 1) program.push(fwd())
    if (index < lengths.length - 1) program.push(turnR())
  }
  return program
}

/**
 * 条件规则的标准解。
 *
 * wall：有墙就右转，然后照常往前一步 —— 一次循环正好走一格，次数 = 前进次数。
 * path：有路才走，没路先转 —— 拐角要单独花一次循环，所以次数 = 前进次数 + 拐角数。
 * else：前进在「否则」分支里，拐角那一轮只转弯不前进，同样要加上拐角数。
 */
function conditionProgram(rule, moves, corners) {
  if (rule === 'wall') return [rep(moves, [ifWall([turnR()]), fwd()])]
  if (rule === 'path') return [rep(moves + corners, [ifPath([fwd()], [turnR()])])]
  return [rep(moves + corners, [ifElse('wall_ahead', [turnR()], [fwd()])])]
}

/**
 * 条件走廊关卡。
 *
 * 路线只允许旋转，不能镜像也不能反向：
 * 镜像会把右转弯变成左转弯，「撞墙右转」的规则就不成立了。
 */
function conditionCorridor({ lengths, rule, rotate = 0 }) {
  const explicit = clockwisePath(lengths)
  const { cells } = simulatePath(explicit)
  // 基准路线的起点朝东；simulatePath 返回的是走完之后的朝向，这里要的是起点朝向。
  const moved = transformPath(cells, { rotate, heading: 'E' })
  const moves = lengths.reduce((sum, value) => sum + value, 0)
  const corners = lengths.length - 1
  return {
    program: conditionProgram(rule, moves, corners),
    cells: moved.cells,
    heading: moved.heading,
    moves,
    corners,
  }
}

/**
 * 先走一段直线，再交给条件转弯。
 *
 * 前半段用循环走直线，后半段把「如果前面有墙」放进循环里，拐角自动处理。
 * 走廊是只向右转的，所以规则照样成立。
 */
function mixedCorridor({ lengths, lead, rotate = 0 }) {
  const explicit = clockwisePath(lengths)
  const { cells } = simulatePath(explicit)
  // 基准路线的起点朝东；simulatePath 返回的是走完之后的朝向，这里要的是起点朝向。
  const moved = transformPath(cells, { rotate, heading: 'E' })
  const moves = lengths.reduce((sum, value) => sum + value, 0)
  const corners = lengths.length - 1
  const rest = moves - lead
  const program = [rep(lead, [fwd()]), rep(rest, [ifWall([turnR()]), fwd()])]
  return { program, cells: moved.cells, heading: moved.heading, moves, corners, lead, rest }
}

const U4_TITLES = [
  '第一个拐角', '第二个拐角', '长一点的走廊', '大 L 走廊',
  '三弯走廊', '回形长廊', '越绕越深', '螺旋走廊',
  '有路就直走', '有路就直走 2', '有路就直走 3', '有路就直走 4',
  '如果否则', '如果否则 2', '如果否则 3', '如果否则 4',
]

/**
 * U4 的四组规则，每组四关。
 *
 * shapes 里每一项是走廊各段的步数：
 *   [4, 3, 4]      → 东 4 步、右转、南 3 步、右转、西 4 步（两个拐角）
 *   [6, 5, 4, 3]   → 三个拐角的回环，四段之间都留出至少两格间距，
 *                     路线不会贴着自己走，拐角正前方因此必然是墙。
 *
 * 走廊总步数 moves 和拐角数 corners 由走廊形状算出：
 * 「如果前面有墙」那组，循环次数就等于总步数；
 * 「如果前面有路」和「如果…否则…」那组，拐角要单独花一次循环，
 * 所以次数还要加上拐角数。提示里必须把这个算式讲给孩子听。
 */
const U4_GROUPS = [
  {
    rule: 'wall',
    blocks: ['move_forward', 'turn_right', 'repeat', 'if_wall_ahead'],
    shapes: [[4, 3, 4], [5, 3, 5], [5, 4, 5], [6, 4, 6]],
  },
  {
    rule: 'wall',
    blocks: ['move_forward', 'turn_right', 'repeat', 'if_wall_ahead'],
    shapes: [[6, 5, 4, 3], [7, 5, 4, 3], [7, 5, 4, 2], [8, 5, 4, 2]],
  },
  {
    rule: 'path',
    blocks: ['move_forward', 'turn_right', 'repeat', 'if_path_ahead'],
    shapes: [[4, 3, 4], [5, 3, 5], [5, 4, 5], [6, 4, 6]],
  },
  {
    rule: 'else',
    blocks: ['move_forward', 'turn_right', 'repeat', 'if_else'],
    shapes: [[6, 5, 4, 3], [7, 5, 4, 3], [7, 5, 4, 2], [8, 5, 4, 2]],
  },
]

function unit4Levels() {
  const levels = []
  for (let index = 0; index < 16; index += 1) {
    const group = U4_GROUPS[Math.floor(index / 4)]
    const shape = group.shapes[index % 4]
    // 每关换一个朝向，同一条路线能看出不同的走法。
    const built = conditionCorridor({ lengths: shape, rule: group.rule, rotate: index % 4 })
    const scene = corridorScene(built.cells)
    const program = built.program
    const phase = index % 5
    const levelType = phase === 3 ? 'practice' : phase === 4 ? 'typing' : 'new'
    levels.push({
      levelId: `blk-${String(index + 49).padStart(3, '0')}`,
      sortOrder: index + 49,
      unitId: UNIT_IDS.U4,
      title: U4_TITLES[index],
      levelType,
      knowledgeTags: ['condition', 'if', 'loop'],
      milestoneBadge: null,
      estimatedMinutes: 15,
      // 走廊总步数和拐角数：提示里要把「次数 = 格数 (+ 拐角数)」这个算式讲出来。
      facts: { moves: built.moves, corners: built.corners },
      solution: program,
      body: buildBody({
        scene: gridScene({
          width: scene.width,
          height: scene.height,
          start: { x: scene.start.x, y: scene.start.y, heading: built.heading },
          goal: { x: scene.goal.x, y: scene.goal.y },
          obstacles: scene.obstacles,
          entities: placeCollectibles(scene.path, phase === 1 || phase === 2 ? 2 : 0, `coin-${index + 49}`),
        }),
        blocks: palette(group.blocks, program),
        // 只够放「重复 + 条件 + 右转 + 前进」四块，写不出显式的长走廊。
        maxBlocks: 4,
        maxSteps: countActions(program) + 4,
        visuals: phase >= 2 ? { show_trail: true } : undefined,
        activities: phase === 4
          ? { typing: { targets: [TYPING_WORDS[(index + 1) % TYPING_WORDS.length]], required: false } }
          : undefined,
        successText: '电脑自己做选择！',
      }),
    })
  }
  return levels
}

// ---------------------------------------------------------------------------
// U5：综合
// ---------------------------------------------------------------------------

const U5_TITLES = [
  '三段大路', '三段长路', '三段回环', '三段远行',
  '四段大路', '四段长路', '四段回环', '四段远行',
  '先走再绕', '走一步再绕', '边走边判断', '综合一',
  '综合二', '综合三', '综合四', '学期大挑战',
]

const U5_SEGMENTS = [
  [
    { steps: 4, turn: 'R' },
    { steps: 3, turn: 'L' },
    { steps: 4 },
  ],
  [
    { steps: 5, turn: 'R' },
    { steps: 3, turn: 'L' },
    { steps: 5 },
  ],
  [
    { steps: 5, turn: 'R' },
    { steps: 4, turn: 'L' },
    { steps: 5 },
  ],
  [
    { steps: 6, turn: 'R' },
    { steps: 4, turn: 'L' },
    { steps: 6 },
  ],
  [
    { steps: 5, turn: 'R' },
    { steps: 4, turn: 'L' },
    { steps: 5, turn: 'R' },
    { steps: 3 },
  ],
  [
    { steps: 6, turn: 'R' },
    { steps: 4, turn: 'L' },
    { steps: 6, turn: 'R' },
    { steps: 4 },
  ],
  [
    { steps: 6, turn: 'R' },
    { steps: 5, turn: 'L' },
    { steps: 7, turn: 'R' },
    { steps: 4 },
  ],
  [
    { steps: 7, turn: 'R' },
    { steps: 5, turn: 'L' },
    { steps: 7, turn: 'R' },
    { steps: 5 },
  ],
]

/**
 * U5 后 8 关的走廊形状。
 *
 * lengths 是各段步数（只向右转），lead 是「自己先走」的那一段有多长。
 * 四段之间都留出至少两格间距，路线不贴着自己走，
 * 拐角正前方因此必然是墙，「如果前面有墙就右转」在全程都成立。
 */
const U5_MIXED_SHAPES = [
  { lengths: [5, 4, 3, 2], lead: 5 },
  { lengths: [6, 4, 3, 2], lead: 6 },
  { lengths: [6, 5, 3, 2], lead: 6 },
  { lengths: [7, 5, 4, 2], lead: 7 },
  { lengths: [7, 5, 4, 3], lead: 7 },
  { lengths: [8, 5, 4, 3], lead: 8 },
  { lengths: [8, 6, 4, 3], lead: 8 },
  { lengths: [8, 6, 5, 3], lead: 8 },
]

function unit5Levels() {
  const levels = []
  for (let index = 0; index < 16; index += 1) {
    const phase = index % 5
    let program
    let blocks
    let maxBlocks
    let facts = null
    let tags
    let milestoneBadge = null
    let estimatedMinutes = 15
    let levelType = phase === 3 ? 'practice' : phase === 4 ? 'typing' : 'new'
    let room = null

    if (index < 8) {
      // 前 8 关：走廊里的多段路线，每段都用循环走，转弯用显式积木。
      const segments = U5_SEGMENTS[index]
      const baseProgram = polylineLoops(segments)
      const picked = pickSafeVariant(baseProgram, index * 7)
      if (!picked) throw new Error(`blk-${String(index + 65).padStart(3, '0')} 找不到终点唯一的走法`)
      program = picked.program
      blocks = ['move_forward', 'turn_left', 'turn_right', 'repeat']
      // 上限卡在循环解的块数上：一条条手写「前进」会超限，必须用重复执行。
      maxBlocks = countBlocks(program) + 1
      tags = ['project', 'sequence', 'turn', 'loop']
      const scene = corridorScene(picked.cells)
      room = {
        scene: gridScene({
          width: scene.width,
          height: scene.height,
          start: { x: scene.start.x, y: scene.start.y, heading: picked.heading },
          goal: { x: scene.goal.x, y: scene.goal.y },
          obstacles: scene.obstacles,
          entities: placeCollectibles(scene.path, phase === 1 || phase === 2 ? 2 : 0, `coin-${index + 65}`),
        }),
      }
    } else {
      // 后 8 关：先自己走一段直线，再把剩下的路交给条件转弯。
      const shape = U5_MIXED_SHAPES[index - 8]
      const built = mixedCorridor({ lengths: shape.lengths, lead: shape.lead, rotate: (index - 8) % 4 })
      program = built.program
      blocks = ['move_forward', 'turn_right', 'repeat', 'if_wall_ahead']
      maxBlocks = countBlocks(program)
      // 走廊总步数和拐角数：提示里要讲清「自己走的那段 + 交给条件的那段」。
      facts = { moves: built.moves, corners: built.corners }
      tags = ['project', 'sequence', 'loop', 'condition']
      estimatedMinutes = 20
      levelType = index === 15 ? 'project' : phase === 3 ? 'practice' : 'new'
      if (index === 15) milestoneBadge = 'term1_master'
      const scene = corridorScene(built.cells)
      room = {
        scene: gridScene({
          width: scene.width,
          height: scene.height,
          start: { x: scene.start.x, y: scene.start.y, heading: built.heading },
          goal: { x: scene.goal.x, y: scene.goal.y },
          obstacles: scene.obstacles,
          entities: placeCollectibles(scene.path, 3, `coin-${index + 65}`),
        }),
      }
    }

    levels.push({
      levelId: `blk-${String(index + 65).padStart(3, '0')}`,
      sortOrder: index + 65,
      unitId: UNIT_IDS.U5,
      title: U5_TITLES[index],
      levelType,
      knowledgeTags: tags,
      milestoneBadge,
      estimatedMinutes,
      facts,
      // 后 8 关前半段是「自己走一段」，次数调大就会多出撞墙的步数，留点余量。
      maxStepsSlack: index >= 8 ? 8 : 0,
      solution: program,
      body: buildBody({
        scene: room.scene,
        blocks: palette(blocks, program),
        maxBlocks,
        maxSteps: countActions(program) + 6,
        visuals: { show_trail: true },
        activities:
          phase === 4
            ? { typing: { targets: [TYPING_WORDS[(index + 2) % TYPING_WORDS.length], TYPING_KEYS[index % TYPING_KEYS.length]], required: false } }
            : undefined,
        successText: milestoneBadge ? '学期大挑战通关！' : '闯关成功！',
      }),
    })
  }
  return levels
}

// ---------------------------------------------------------------------------
// 组装全部关卡
// ---------------------------------------------------------------------------

function buildAllLevels() {
  const levels = [...unit1Levels(), ...unit2Levels(), ...unit3Levels(), ...unit4Levels(), ...unit5Levels()]

  // 先把目标文案定下来：目标里的每段格数、循环次数、拐角数都从最终标准解反推，
  // 不能用造关卡前的原始 plan——镜像和反向会改变段序，原 plan 的数字会错位。
  const withGoals = levels.map((level) => ({ ...level, goal: analyzeLevel(level).goal }))

  // 提示和绘本也从同一份推导结果生成。复习卡要引用上一关，所以按关卡顺序来，
  // 而且必须在 sealLevel 之前装进正文——sealLevel 会用生产解析器校验正文，
  // 文案或 schema 写错了这里就会炸，不会带着坏数据落库。
  const withTeaching = withGoals.map((level, index) => {
    const previous = index > 0 ? withGoals[index - 1] : null
    return {
      ...level,
      body: { ...level.body, hints: buildHints(level), ...buildStoryFor(level, previous) },
    }
  })

  return withTeaching.map((level) => {
    const sealed = sealLevel(level)
    const parsed = parseModuleLevelBody(sealed.body)
    return {
      ...sealed,
      maxSteps: parsed.runtime.max_steps,
      steps: sealed.steps,
    }
  })
}

// ---------------------------------------------------------------------------
// SQL 输出
// ---------------------------------------------------------------------------

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function sqlArray(values) {
  return `array[${values.map((value) => sqlString(value)).join(', ')}]`
}

function levelSql(level) {
  const body = JSON.stringify(level.body, null, 2)
  return `-- ${level.levelId} ${level.title}
-- ${level.goal}
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', ${sqlString(level.levelId)}, ${level.sortOrder},
   ${sqlString(level.title)},
   ${sqlString(level.goal)},
   $body$
${body}
  $body$::jsonb,
   true, now(), now(),
   ${sqlString(TERM_ID)}, ${sqlString(level.unitId)}, 'grid', ${sqlString(level.levelType)},
   ${sqlArray(level.knowledgeTags)}, ${level.milestoneBadge ? sqlString(level.milestoneBadge) : 'null'},
   ${level.estimatedMinutes}, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();`
}

function buildSql(levels) {
  const parts = []
  parts.push(`-- Blockly 第一学期扩容到 80 关（blk-001 … blk-080），一次迁移落库。
--
-- 这个文件由 scripts/generate-blockly-80.mjs 生成，不要手工改：
--   npx tsx scripts/generate-blockly-80.mjs
-- 生成器用生产解析器和生产解释器把每关的标准解跑通一遍才写进来。
--
-- 迁移分四步：
--   1. 学期容量从 15 课改成 80 课，单元改成 5 个 × 16 课。
--   2. 后面三个学期的占位关卡挪到预留号段（081-095 / 161-175 / 241-255）。
--      第一学期要用掉 001-080，不挪就会撞号。占位行不删，只改编号。
--   3. learning_record 里的旧编号同步改名，进度不丢。
--   4. 写入 80 关正文。
--
-- Neon 跨语句没有事务，每条语句都写成幂等的固定值，重跑即可。
-- 迁移前请确认已经备份；本文件不执行任何 delete。
`)
  parts.push(`-- 1. 学期容量
update public.module_term
set
  weeks = 16,
  level_cap = 80,
  summary = '计算思维启蒙：顺序、转弯、循环、条件。80 课，每天一课。',
  updated_at = now()
where module_id = 'blockly'
  and term_id = ${sqlString(TERM_ID)};`)

  parts.push(`-- 2. 单元：5 个单元，每单元 16 课
insert into public.module_unit
  (module_id, unit_id, term_id, title, summary, scene_form, knowledge_tags, level_cap, sort_order)
values
${UNIT_META.map(
  (unit) => `  ('blockly', ${sqlString(unit.unitId)}, ${sqlString(TERM_ID)}, ${sqlString(unit.title)},
   ${sqlString(unit.summary)}, 'grid',
   ${sqlArray(unit.knowledgeTags)}, 16, ${unit.sortOrder})`,
).join(',\n')}
on conflict (module_id, unit_id) do update set
  term_id = excluded.term_id,
  title = excluded.title,
  summary = excluded.summary,
  scene_form = excluded.scene_form,
  knowledge_tags = excluded.knowledge_tags,
  level_cap = excluded.level_cap,
  sort_order = excluded.sort_order,
  updated_at = now();`)

  // 2.5 先把要挪的占位行 sort_order 挪进临时号段，避开唯一约束。
  const moved = RESERVED_RANGES.flatMap((range) =>
    Array.from({ length: range.to - range.from + 1 }, (_, index) => {
      const oldId = `blk-${String(range.from + index).padStart(3, '0')}`
      const newId = `blk-${String(range.target + index).padStart(3, '0')}`
      return { oldId, newId, oldOrder: range.from + index, newOrder: range.target + index, termId: range.termId }
    }),
  )
  parts.push(`-- 3. 后面三个学期的占位关卡换号（先挪到临时号段，再换正式号段）
--
-- sort_order 上有唯一约束 (module_id, sort_order)，直接换号会撞车。
-- 先把三组行挪到 10000+ 的临时号段，再一条一条换到预留号段。
-- 每条 update 都带 term_id 守卫：重跑时旧编号已经不存在，条件不匹配，什么也不做。
update public.module_level
set sort_order = sort_order + 10000
where module_id = 'blockly'
  and (
    (term_id = 'blk-g1-spring' and level_id between 'blk-016' and 'blk-030')
    or (term_id = 'blk-g2-fall' and level_id between 'blk-031' and 'blk-045')
    or (term_id = 'blk-g2-spring' and level_id between 'blk-046' and 'blk-060')
  );`)

  parts.push(
    moved
      .map(
        (row) => `-- ${row.oldId} → ${row.newId}
update public.module_level
set
  level_id = ${sqlString(row.newId)},
  sort_order = ${row.newOrder},
  updated_at = now()
where module_id = 'blockly'
  and level_id = ${sqlString(row.oldId)}
  and term_id = ${sqlString(row.termId)};`,
      )
      .join('\n\n'),
  )

  parts.push(`-- 4. 学习记录跟着改编号，进度不丢
--
-- learning_record 的主键是 (student_id, level_id)，目标编号已经存在时跳过，
-- 避免主键冲突把整条 update 打断。
--
-- 再加一道守卫：旧编号在 module_level 里已经查不到，才说明它是「被换号换走的
-- 后面几个学期的关卡」。第一次跑迁移时旧编号已经被步骤 3 换掉，这条守卫放行；
-- 以后再重跑这个文件时，第一学期已经占了 blk-016…blk-060，这些编号在
-- module_level 里查得到，守卫会挡住，不会把学生刚做完的一上关卡记录改错号。
with remap(old_id, new_id) as (
  values
${moved.map((row) => `    (${sqlString(row.oldId)}, ${sqlString(row.newId)})`).join(',\n')}
)
update public.learning_record lr
set level_id = r.new_id
from remap r
where lr.module_id = 'blockly'
  and lr.level_id = r.old_id
  and not exists (
    select 1 from public.learning_record t
    where t.student_id = lr.student_id
      and t.level_id = r.new_id
  )
  and not exists (
    select 1 from public.module_level ml
    where ml.module_id = 'blockly'
      and ml.level_id = r.old_id
  );`)

  parts.push(`-- 5. 第一学期 80 关正文
--
-- workspace.max_blocks 的语义是「工作区积木总数（含嵌套子块）」，不是展开后的执行步数。
-- U3 的关卡把上限卡死在循环解的积木数上，逼学生必须用循环；U4 同理必须用条件。`)
  parts.push(levels.map((level) => levelSql(level)).join('\n\n'))

  parts.push(`-- 验收 SQL（迁移后逐条跑）
--
-- A. 第一学期 80 关，都是真实正文
-- select count(*) from public.module_level
-- where module_id = 'blockly' and term_id = 'blk-g1-fall' and is_placeholder = false;
--
-- B. 编号连续 1-80，没有重复也没有占位
-- select min(sort_order), max(sort_order), count(*)
-- from public.module_level where module_id = 'blockly' and term_id = 'blk-g1-fall';
--
-- C. 后面三个学期换号成功，号段互不重叠
-- select term_id, min(sort_order), max(sort_order), count(*)
-- from public.module_level where module_id = 'blockly'
-- group by term_id order by min(sort_order);
--
-- D. 没有关卡游离在单元之外
-- select count(*) from public.module_level
-- where module_id = 'blockly' and (term_id is null or unit_id is null);
--
-- E. 正文里的 scene_type 与列一致
-- select level_id from public.module_level ml
-- where ml.module_id = 'blockly' and ml.scene_type <> ml.body->>'scene_type';
--
-- F. 学习记录没有指向不存在关卡的行（换号失败会在这里露出来）
-- select lr.level_id, count(*) from public.learning_record lr
-- where lr.module_id = 'blockly'
--   and not exists (select 1 from public.module_level ml
--                   where ml.module_id = 'blockly' and ml.level_id = lr.level_id)
-- group by lr.level_id;`)
  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// 绘本样板迁移
// ---------------------------------------------------------------------------

/**
 * 单独给前 5 关出一份「只加绘本」的迁移。
 *
 * 用 body || jsonb 只往正文里补 intro_story 和 review 两个键，
 * 不碰场景、积木、提示这些已经调好的内容，重跑也不会把别的地方改坏。
 * 教研老师照着这一份就能看懂绘本正文长什么样。
 */
function buildSampleSql(levels) {
  const picked = levels.filter((level) => SAMPLE_LEVEL_IDS.includes(level.levelId))
  if (picked.length !== SAMPLE_LEVEL_IDS.length) {
    throw new Error(`样板迁移要 ${SAMPLE_LEVEL_IDS.length} 关，实际找到 ${picked.length} 关`)
  }

  const parts = []
  parts.push(`-- Blockly 绘本情境导入样板：blk-001 … blk-005
--
-- 这个文件由 scripts/generate-blockly-80.mjs 生成，不要手工改：
--   npx tsx scripts/generate-blockly-80.mjs
--
-- 正文（body）里多两个可选字段：
--   intro_story —— 绘本体数组，3 到 5 页，每页一句说明。
--                  type 取 text（纯文字）或 image_text（文字配图），
--                  image 是插画标识；现在是占位符，教研老师换成真实图片路径即可。
--   review      —— 课前复习卡，内容是上一关的核心知识点。
--
-- 两个字段都是可选的：没配的关卡进关时直接进工作区，老流程一点不变。
--
-- 这里用 body || jsonb 只补这两个键，场景、积木、提示一概不动；
-- 固定值写入，重跑即可。`)
  for (const level of picked) {
    const story = {}
    if (level.body.intro_story) story.intro_story = level.body.intro_story
    if (level.body.review) story.review = level.body.review
    parts.push(`-- ${level.levelId} ${level.title}
-- ${level.goal}
update public.module_level
set
  body = body || $story$${JSON.stringify(story, null, 2)}$story$::jsonb,
  updated_at = now()
where module_id = 'blockly'
  and level_id = ${sqlString(level.levelId)};`)
  }
  parts.push(`-- 验收 SQL（迁移后逐条跑）
--
-- A. 前 5 关都写上了绘本
-- select level_id, jsonb_array_length(body->'intro_story') as pages, body->'review'->>'question' as question
-- from public.module_level
-- where module_id = 'blockly' and level_id in ('blk-001','blk-002','blk-003','blk-004','blk-005')
-- order by level_id;
--
-- B. 没有绘本的老关卡不受影响（intro_story 为空）
-- select count(*) from public.module_level
-- where module_id = 'blockly' and body->'intro_story' is null;`)
  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

const levels = buildAllLevels()
if (levels.length !== 80) throw new Error(`应该生成 80 关，实际生成了 ${levels.length} 关`)

const unitCounts = new Map()
for (const level of levels) unitCounts.set(level.unitId, (unitCounts.get(level.unitId) ?? 0) + 1)
for (const unit of UNIT_META) {
  const count = unitCounts.get(unit.unitId) ?? 0
  if (count !== 16) throw new Error(`单元 ${unit.unitId} 应该是 16 关，实际 ${count} 关`)
}

mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true })
writeFileSync(MANIFEST_PATH, `${JSON.stringify({ termId: TERM_ID, levels }, null, 2)}\n`, 'utf8')
writeFileSync(SQL_PATH, `${buildSql(levels)}\n`, 'utf8')
writeFileSync(SAMPLE_SQL_PATH, `${buildSampleSql(levels)}\n`, 'utf8')

console.log(`已生成 80 关：`)
console.log(`  迁移 SQL  ${path.relative(ROOT, SQL_PATH)}`)
console.log(`  绘本样板  ${path.relative(ROOT, SAMPLE_SQL_PATH)}`)
console.log(`  标准解清单 ${path.relative(ROOT, MANIFEST_PATH)}`)
for (const unit of UNIT_META) {
  const unitLevels = levels.filter((level) => level.unitId === unit.unitId)
  const totalBlocks = unitLevels.reduce((sum, level) => sum + countBlocks(level.solution), 0)
  console.log(`  ${unit.title.padEnd(6, '　')} ${unitLevels.length} 关，标准解共 ${totalBlocks} 块积木`)
}
