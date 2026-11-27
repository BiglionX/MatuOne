/**
 * Blockly 二年级 80 关自由舞台关卡生成器（Level 2 = blk-161…200，Level 3 = blk-201…240）。
 *
 * 用法：npx tsx scripts/generate-stage-levels.mjs
 *
 * 产出三样东西：
 *   1. supabase/migrations/20261127100000_blockly_level_2_3_80_stage_generated.sql
 *      —— 一次把二年级两个学期落库的迁移（含旧占位关卡的换号）。
 *   2. scripts/generated/blockly-stage-80.manifest.json
 *      —— 每关的标准解和正文，测试直接读它，不连数据库。
 *   3. scripts/generated/blockly-stage-80.pending.json
 *      —— 这学期还差哪些积木的待办清单，教研老师照着排下一轮开发。
 *
 * 关键约束（和第一学期的生成器一样）：
 *   - 每关都用生产解析器（parseModuleLevelBody）和生产解释器
 *     （compileStageProgram / createStageWorld / tick）自校验，
 *     标准解必须真的能通关，不合格就换一组候选参数，绝不把半成品写进 SQL。
 *   - 只生成文件，不连数据库。迁移要人工确认后再执行。
 *
 * 舞台关卡的特别之处：
 *   角色只会沿一个方向走，不会反弹。所以每一关的玩法都是
 *   「角色沿一条直线扫过去 + 什么东西在什么时刻落进碰撞带」。
 *   规则层（blockly-stage-recipes.mjs）里的几何工具负责排这个时间表，
 *   解释器负责最后拍板。
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseModuleLevelBody } from '../src/modules/curriculum/moduleLevelBody.ts'
import { compileStageProgram, createStageWorld, evaluateStageSuccess, tick } from '../src/modules/curriculum/moduleStageInterpreter.ts'
import {
  PLAYER_Y,
  RIGHT_EDGE,
  STAGE_BLOCK_DEFS,
  STAGE_BLOCK_SUPPORT,
  STAGE_PENDING_BLOCKS,
  STAGE_TERMS,
  STAGE_UNITS,
  chain,
  changeVar,
  cloneBlock,
  cloneTemplate,
  countBlocks,
  fallStartY,
  forever,
  ifTouch,
  initialScript,
  move,
  rep,
  setVar,
  sprite,
  stageScene,
  sweepWindow,
  variable,
} from './blockly-stage-recipes.mjs'
import { buildStageHints, buildStageStoryFor } from './blockly-story-recipes.mjs'

const ROOT = process.cwd()
const SQL_PATH = path.join(ROOT, 'supabase/migrations/20261127100000_blockly_level_2_3_80_stage_generated.sql')
const MANIFEST_PATH = path.join(ROOT, 'scripts/generated/blockly-stage-80.manifest.json')
const PENDING_PATH = path.join(ROOT, 'scripts/generated/blockly-stage-80.pending.json')

/** 角色的起始位置。 */
const PLAYER_X = 40
/** 探测用的步数上限：先放开跑一遍，量出真实步数再回填。 */
const PROBE_MAX_STEPS = 4000

/** 四个单元的教学定位。 */
const UNIT_META = [
  {
    unitId: STAGE_UNITS.L2U1,
    termId: STAGE_TERMS.L2,
    sortOrder: 1,
    levelCap: 20,
    title: '舞台上的移动与计分',
    summary: '认识自由舞台：角色沿一个方向走，用「移动」「如果碰到」和变量把分数记起来。',
    knowledgeTags: ['stage', 'move', 'variable', 'score'],
  },
  {
    unitId: STAGE_UNITS.L2U2,
    termId: STAGE_TERMS.L2,
    sortOrder: 2,
    levelCap: 20,
    title: '躲避与计分',
    summary: '路上有会掉下来的障碍，碰到要扣分；一边躲开一边把目标接住。',
    knowledgeTags: ['stage', 'collision', 'score', 'lives'],
  },
  {
    unitId: STAGE_UNITS.L3U1,
    termId: STAGE_TERMS.L3,
    sortOrder: 1,
    levelCap: 20,
    title: '克隆与事件',
    summary: '用「克隆」造出子弹和敌人，多个角色同时在舞台上跑起来。',
    knowledgeTags: ['stage', 'clone', 'projectile'],
  },
  {
    unitId: STAGE_UNITS.L3U2,
    termId: STAGE_TERMS.L3,
    sortOrder: 2,
    levelCap: 20,
    title: '多角色与复杂逻辑',
    summary: '两个角色一起上场，条件里再套条件，判断写得又细又准。',
    knowledgeTags: ['stage', 'concurrency', 'condition', 'nested'],
  },
]

/** 旧学期占位关卡的换号表：占位行不删，只改编号。 */
const RENUMBER = [
  // Level 2 的旧 u3/u4/u5 占位关（blk-167…175）挪到 901 号段。
  ...Array.from({ length: 9 }, (_, index) => ({
    oldId: `blk-${String(167 + index).padStart(3, '0')}`,
    newId: `blk-${String(901 + index).padStart(3, '0')}`,
    oldOrder: 167 + index,
    newOrder: 901 + index,
    termId: STAGE_TERMS.L2,
    unitId: ['blk-g2-fall-u3-legacy', 'blk-g2-fall-u4-legacy', 'blk-g2-fall-u5-legacy'][Math.floor(index / 3)],
  })),
  // Level 3 的旧占位关（blk-241…255）全部挪到 941 号段。
  ...Array.from({ length: 15 }, (_, index) => ({
    oldId: `blk-${String(241 + index).padStart(3, '0')}`,
    newId: `blk-${String(941 + index).padStart(3, '0')}`,
    oldOrder: 241 + index,
    newOrder: 941 + index,
    termId: STAGE_TERMS.L3,
    unitId: `blk-g2-spring-u${Math.floor(index / 3) + 1}-legacy`,
  })),
]

// ---------------------------------------------------------------------------
// 关卡组装
// ---------------------------------------------------------------------------

/** 关卡正文。提示和绘本由 blockly-story-recipes.mjs 从标准解反推后填进来。 */
function buildBody({ scene, blocks, maxBlocks, maxSteps, successCheck, successText }) {
  return {
    schema_version: 2,
    scene_type: 'stage',
    scene,
    available_blocks: blocks,
    success_check: successCheck,
    workspace: { initial_blocks: [], max_blocks: maxBlocks, require_connected: false },
    runtime: { out_of_bounds: 'blocked', max_steps: maxSteps, stop_on_success: true, move_duration_ms: 0 },
    hints: [],
    completion: { stars: 3, success_text: successText },
  }
}

/** 积木盘：动作 → 变量 → 控制，和工具箱分类顺序一致。 */
function stageBlocks({ variables, spriteOptions, cloneOptions = null, withRepeat = false }) {
  const blocks = []
  blocks.push(STAGE_BLOCK_DEFS.move_steps)
  blocks.push({
    ...STAGE_BLOCK_DEFS.set_variable,
    args: STAGE_BLOCK_DEFS.set_variable.args.map((arg) =>
      arg.name === 'variable_id' ? { ...arg, default: variables[0] } : arg),
  })
  blocks.push({
    ...STAGE_BLOCK_DEFS.change_variable,
    args: STAGE_BLOCK_DEFS.change_variable.args.map((arg) =>
      arg.name === 'variable_id' ? { ...arg, default: variables[0] } : arg),
  })
  blocks.push({
    type: 'if_touching',
    label: '如果碰到',
    category: '控制',
    kind: 'control',
    args: [
      {
        name: 'target_sprite_id',
        label: '精灵',
        type: 'select',
        default: spriteOptions[0]?.value,
        options: spriteOptions,
      },
    ],
  })
  blocks.push(STAGE_BLOCK_DEFS.forever)
  if (withRepeat) blocks.push(STAGE_BLOCK_DEFS.repeat)
  if (cloneOptions) {
    blocks.push({
      type: 'clone',
      label: '克隆',
      category: '控制',
      kind: 'control',
      args: [
        {
          name: 'clone_id',
          label: '克隆谁',
          type: 'select',
          default: cloneOptions[0].value,
          options: cloneOptions,
        },
      ],
    })
  }
  return blocks
}

/** 精灵下拉选项：只放「可以被碰到」的目标，不放角色自己和终点旗。 */
function touchOptions(entries) {
  return entries.map((entry) => ({ value: entry.id, label: entry.label ?? entry.id }))
}

/** 角色的初始位置。 */
function playerSprite(x, asset = 'player') {
  return sprite({ id: 'player', asset, x, y: PLAYER_Y, direction: 90, size: 100 })
}

/** 下落物的课程隐藏脚本：让它自己往下掉。 */
function fallingScript(target) {
  return initialScript({
    id: `${target.id}-fall`,
    targetSpriteId: target.id,
    block: forever([move(target.fallSpeed)]),
  })
}

/**
 * 排一排道具。
 *
 * 所有东西共用一条横向网格，谁也不和谁站同一个 x。
 * 这不是讲究，是必须的：落下来的东西要等它掉进碰撞带才碰得到，
 * 而站在地上的东西一直就在碰撞带里。两样东西 x 一样的话，
 * 角色路过时可能先把地上的碰掉、把落下来的漏掉。
 *
 * 往下掉的东西（写了 fallSpeed）会按角色的速度算出
 * 「该在第几帧掉进碰撞带」：
 *   mode = 'hit'  ：角色赶到之前就掉进来，一定会碰到；
 *   mode = 'avoid'：角色走远了才掉下来，能躲开。
 */
function planItems({ items, x0 = PLAYER_X, speed, startGap = 70, endGap = 60 }) {
  const span = RIGHT_EDGE - endGap - (x0 + startGap)
  const gap = items.length > 1 ? span / (items.length - 1) : 0
  return items.map((item, index) => {
    const x = Math.round(x0 + startGap + index * gap)
    const planned = { ...item, x }
    if (item.fallSpeed) {
      const window = sweepWindow(x, x0, speed)
      if (item.mode === 'avoid') {
        // 躲得开的障碍：从最上面慢慢掉，等角色走远了才进碰撞带。
        //
        // 这里不能用「落下来正好赶在角色走后」那种掐时间的排法：
        // 角色每接住一个东西就要多花一帧，后面的判定会整体往后挪，
        // 掐得再准也会被抳过去。所以它干脆掉得很慢，角色肯定已经走远了。
        planned.fallSpeed = Math.min(item.fallSpeed, 3)
        planned.y = 0
        planned.mode = 'avoid'
      } else {
        const entry = Math.max(1, window.enter - 3)
        planned.y = fallStartY(item.fallSpeed, entry)
        planned.entryTick = entry
        planned.mode = 'hit'
      }
    } else {
      planned.y = item.y ?? PLAYER_Y
      planned.mode = item.mode ?? 'static'
    }
    return planned
  })
}

/** 两排东西交错着排：先左边一个、再右边一个，轮流来。 */
function interleave(left, right) {
  const out = []
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if (left[index]) out.push(left[index])
    if (right[index]) out.push(right[index])
  }
  return out
}

/** 连着编号的一串道具：地鼠-1、地鼠-2…… */
function series(prefix, count, extra = {}) {
  return Array.from({ length: count }, (_, index) => ({ id: `${prefix}-${index + 1}`, ...extra }))
}

/**
 * 终点旗放在舞台的最右边。
 *
 * 不能写成「站到某个具体的坐标上」：舞台上的角色只会一直往前走，
 * 走到边缘就被夹住不动了。学生换一个步长，就再也踩不到那个点，
 * 这一关就永远通不了——这种判定是专门坑学生的。
 *
 * 放在最边上就不一样了：不管学生用几步，角色最后都会停在最右边，
 * 「开到终点」自然就成立了。
 */
function goalAtFinishLine() {
  return RIGHT_EDGE
}

/** 终点旗子：放在角色上方，不挡路。 */
function goalSprite(goalX) {
  return sprite({ id: 'goal', asset: 'goal', x: goalX, y: 236, direction: 0, size: 100 })
}

// ---------------------------------------------------------------------------
// 自校验
// ---------------------------------------------------------------------------

/** 用生产解释器跑一遍标准解。 */
function runStage(parsed, solution) {
  const program = compileStageProgram(parsed, solution)
  let world = createStageWorld(program)
  let ticks = 0
  const history = []
  while (world.status === 'running' && ticks < PROBE_MAX_STEPS) {
    world = tick(world)
    ticks += 1
    if (ticks <= 30) {
      const player = world.sprites.find((sprite) => sprite.id === 'player')
      history.push(`${ticks}:${player?.x}`)
    }
  }
  return { world, ticks, history }
}

/** 逐条展开成功判定，报错时能一眼看出是哪一条没过。 */
function describeCheck(check, world) {
  const parts = []
  const walk = (condition, path) => {
    if (condition.type === 'all' || condition.type === 'any') {
      condition.conditions.forEach((child, index) => walk(child, `${path}.${condition.type}[${index}]`))
      return
    }
    const ok = evaluateStageSuccess(condition, world)
    const detail = condition.type === 'sprite_at'
      ? `(x=${condition.x},y=${condition.y})`
      : condition.type === 'variable_value'
        ? `(${condition.variable_id} ${condition.op} ${condition.value})`
        : condition.type === 'sprite_hidden'
          ? `(${condition.sprite_id})`
          : ''
    parts.push(`${path}:${ok ? '✓' : '✗'}${condition.type}${detail}`)
  }
  walk(check, 'ok')
  return parts.join(' ')
}

/**
 * 自校验：标准解必须真的通关，而且步数和积木数都在上限内。
 *
 * 走生产解析器是为了连正文 schema 一起验，正文写错了这里就会炸。
 */
function verifyStage(level, maxSteps) {
  const probeBody = { ...level.body, runtime: { ...level.body.runtime, max_steps: PROBE_MAX_STEPS } }
  const parsed = parseModuleLevelBody(probeBody)
  const blocks = countBlocks(level.solution)
  if (blocks > parsed.workspace.max_blocks) {
    throw new Error(`${level.levelId} 标准解用了 ${blocks} 块积木，超过上限 ${parsed.workspace.max_blocks}`)
  }
  const { world, ticks, history } = runStage(parsed, level.solution)
  if (!world.completed) {
    const reason = world.failure ? `（${world.failure.type}：${world.failure.message}）` : ''
    const sprites = world.sprites
      .filter((sprite) => sprite.id === 'player' || sprite.id.startsWith('enemy'))
      .map((sprite) => `${sprite.id}@(${sprite.x},${sprite.y})${sprite.visible ? '' : '[隐]'}`)
      .join(' ')
    // 落盘一份，方便单独跑这一关定位问题。
    writeFileSync(
      path.join(ROOT, 'scripts/generated/debug-fail.json'),
      `${JSON.stringify({ levelId: level.levelId, body: level.body, solution: level.solution }, null, 2)}\n`,
      'utf8',
    )
    throw new Error(
      `${level.levelId} 标准解没有通关：状态 ${world.status}${reason}，变量 ${JSON.stringify(world.variables)}；${describeCheck(parsed.success_check, world)}；${sprites}；轨迹 ${history.join(' ')}`,
    )
  }
  if (ticks >= PROBE_MAX_STEPS) throw new Error(`${level.levelId} 标准解跑不完（超过 ${PROBE_MAX_STEPS} 步）`)
  if (maxSteps !== undefined && ticks > maxSteps) {
    throw new Error(`${level.levelId} 标准解走了 ${ticks} 步，超过上限 ${maxSteps}`)
  }
  return { parsed, world, ticks, blocks }
}

/**
 * 用真实步数回填 max_steps，再验一次。
 *
 * maxStepsSlack 是留给学生的余量：步数调大一点会多出几步，
 * 余量不够的话运行会被截断，学生明明做对了却看到失败。
 */
function sealLevel(level) {
  const first = verifyStage(level)
  const maxSteps = Math.max(first.ticks + 2 + (level.maxStepsSlack ?? 60), 8)
  const sealed = { ...level, body: { ...level.body, runtime: { ...level.body.runtime, max_steps: maxSteps } } }
  const second = verifyStage(sealed, maxSteps)
  return { ...sealed, maxSteps, ticks: second.ticks, blocks: second.blocks }
}

// ---------------------------------------------------------------------------
// Level 2 · 单元 1：舞台上的移动与计分（blk-161 … blk-180）
// ---------------------------------------------------------------------------

const L2U1_TITLES = [
  '第一个苹果', '三个苹果', '苹果落得更快', '四个苹果', '苹果雨',
  '第一只地鼠', '三只地鼠', '地鼠排排站', '五只地鼠', '地鼠大扫荡',
  '星星和宝石', '双倍星星', '宝石加倍', '星光大道', '满地宝石',
  '接苹果：拆解', '接苹果：多一关', '接苹果：加速', '接苹果：终点', '接苹果：完整作品',
]

/**
 * 接东西的一关：角色一路扫过去，碰到目标就加分。
 *
 * points 为 2 的目标用「重复执行」加分，顺便把「条件里还能再放积木」教了。
 */
function collectLevel({
  levelId, sortOrder, unitId, title, levelType, tags, badge, minutes,
  x0 = PLAYER_X, speed, targets, goalX = null, backdrop = 'sky',
  targetName = '苹果', scoreVar = 'score', facts, goalText, successText,
}) {
  const points = targets.reduce((sum, target) => sum + (target.points ?? 1), 0)
  const sceneSprites = [
    playerSprite(x0),
    ...targets.map((target) => sprite({
      id: target.id,
      asset: target.asset,
      x: target.x,
      y: target.y,
      direction: target.fallSpeed ? 180 : 90,
      size: 100,
      collectible: true,
    })),
  ]
  if (goalX !== null) sceneSprites.push(goalSprite(goalX))

  const solution = chain([
    setVar(scoreVar, 0),
    forever([
      move(speed),
      ...targets.map((target) => ifTouch(target.id, [
        target.points && target.points > 1
          ? rep(target.points, [changeVar(scoreVar, 1)])
          : changeVar(scoreVar, 1),
      ])),
    ]),
  ])

  const conditions = [
    { type: 'variable_value', variable_id: scoreVar, op: '==', value: points },
    ...targets.map((target) => ({ type: 'sprite_hidden', sprite_id: target.id })),
  ]
  if (goalX !== null) conditions.push({ type: 'sprite_at', sprite_id: 'player', x: goalX, y: PLAYER_Y })

  const scene = stageScene({
    backdrop,
    sprites: sceneSprites,
    variables: [variable(scoreVar, 0)],
    initialScripts: targets.filter((target) => target.fallSpeed).map(fallingScript),
  })

  return {
    levelId,
    sortOrder,
    unitId,
    title,
    levelType,
    knowledgeTags: tags,
    milestoneBadge: badge ?? null,
    estimatedMinutes: minutes ?? 15,
    goalText,
    facts: { kind: 'collect', targetCount: targets.length, scoreTotal: points, speed, targetName, ...facts },
    solution: [solution],
    body: buildBody({
      scene,
      blocks: stageBlocks({
        variables: [scoreVar],
        spriteOptions: touchOptions(targets),
        withRepeat: targets.some((target) => (target.points ?? 1) > 1),
      }),
      maxBlocks: countBlocks([solution]) + 2,
      maxSteps: 200,
      successCheck: { type: 'all', conditions },
      successText: successText ?? '接住啦！',
    }),
  }
}

function l2u1Levels() {
  const levels = []
  const unitId = STAGE_UNITS.L2U1

  // 161-165：会往下掉的苹果。
  const g1 = [
    { count: 2, speed: 8, fall: 5 },
    { count: 3, speed: 8, fall: 5 },
    { count: 3, speed: 10, fall: 7 },
    { count: 4, speed: 10, fall: 6 },
    { count: 4, speed: 12, fall: 8 },
  ]
  g1.forEach((spec, index) => {
    const levelId = `blk-${String(161 + index).padStart(3, '0')}`
    const targets = planItems({
      items: series('apple', spec.count, { asset: 'apple', fallSpeed: spec.fall }),
      x0: PLAYER_X,
      speed: spec.speed,
    })
    levels.push(collectLevel({
      levelId,
      sortOrder: 161 + index,
      unitId,
      title: L2U1_TITLES[index],
      levelType: index === 3 ? 'practice' : 'new',
      tags: ['stage', 'move', 'variable', 'collision'],
      speed: spec.speed,
      targets,
      goalText: `接住 ${spec.count} 个往下掉的苹果，把 score 加到 ${spec.count}`,
      successText: '苹果接住啦！',
    }))
  })

  // 166-170：脚下的地鼠，不动，等着被敲。
  const g2 = [
    { count: 2, speed: 8 },
    { count: 3, speed: 10 },
    { count: 4, speed: 10 },
    { count: 5, speed: 12 },
    { count: 5, speed: 14 },
  ]
  g2.forEach((spec, index) => {
    const levelId = `blk-${String(166 + index).padStart(3, '0')}`
    const targets = planItems({
      items: series('mole', spec.count, { asset: 'mole' }),
      x0: PLAYER_X,
      speed: spec.speed,
    })
    levels.push(collectLevel({
      levelId,
      sortOrder: 166 + index,
      unitId,
      title: L2U1_TITLES[5 + index],
      levelType: index === 3 ? 'practice' : 'new',
      tags: ['stage', 'move', 'variable', 'collision'],
      speed: spec.speed,
      targets,
      targetName: '地鼠',
      goalText: `用小猫走过 ${spec.count} 只地鼠，把 score 加到 ${spec.count}`,
      successText: '地鼠全敲到了！',
    }))
  })

  // 171-175：星星 1 分、宝石 2 分，条件里套一层「重复执行」。
  const g3 = [
    { stars: 2, gems: 1, speed: 8 },
    { stars: 3, gems: 1, speed: 10 },
    { stars: 2, gems: 2, speed: 10 },
    { stars: 3, gems: 2, speed: 12 },
    { stars: 4, gems: 2, speed: 12 },
  ]
  g3.forEach((spec, index) => {
    const levelId = `blk-${String(171 + index).padStart(3, '0')}`
    const targets = planItems({
      items: interleave(
        series('star', spec.stars, { asset: 'star', points: 1 }),
        series('gem', spec.gems, { asset: 'gem', points: 2 }),
      ),
      x0: PLAYER_X,
      speed: spec.speed,
    })
    levels.push(collectLevel({
      levelId,
      sortOrder: 171 + index,
      unitId,
      title: L2U1_TITLES[10 + index],
      levelType: index === 3 ? 'practice' : 'new',
      tags: ['stage', 'variable', 'condition', 'nested'],
      speed: spec.speed,
      targets,
      targetName: '星星和宝石',
      facts: { bonusTargets: spec.gems },
      goalText: `接住 ${spec.stars} 颗星星（1 分）和 ${spec.gems} 颗宝石（2 分），把 score 加到 ${spec.stars + spec.gems * 2}`,
      successText: '星星宝石全收齐！',
    }))
  })

  // 176-180：项目关，苹果 + 地鼠一起上，最后还要踩到终点旗。
  const g4 = [
    { apples: 3, moles: 2, speed: 8 },
    { apples: 3, moles: 3, speed: 10 },
    { apples: 4, moles: 2, speed: 10 },
    { apples: 4, moles: 3, speed: 12 },
    { apples: 5, moles: 3, speed: 12 },
  ]
  g4.forEach((spec, index) => {
    const levelId = `blk-${String(176 + index).padStart(3, '0')}`
    const targets = planItems({
      items: interleave(
        series('apple', spec.apples, { asset: 'apple', fallSpeed: 5 }),
        series('mole', spec.moles, { asset: 'mole' }),
      ),
      x0: PLAYER_X,
      speed: spec.speed,
    })
    const goalX = goalAtFinishLine()
    levels.push(collectLevel({
      levelId,
      sortOrder: 176 + index,
      unitId,
      title: L2U1_TITLES[15 + index],
      levelType: index === 4 ? 'project' : index === 3 ? 'practice' : 'new',
      tags: ['project', 'stage', 'move', 'variable', 'collision'],
      badge: index === 4 ? 'term3_project' : null,
      minutes: index >= 3 ? 20 : 15,
      speed: spec.speed,
      targets,
      goalX,
      targetName: '苹果和地鼠',
      goalText: `接住 ${spec.apples} 个苹果、敲到 ${spec.moles} 只地鼠，把 score 加到 ${spec.apples + spec.moles}，再踩到右边的小旗子`,
      successText: '项目完成，小精灵给你发徽章！',
    }))
  })

  return levels
}

// ---------------------------------------------------------------------------
// Level 2 · 单元 2：躲避与计分（blk-181 … blk-200）
// ---------------------------------------------------------------------------

const L2U2_TITLES = [
  '第一颗炸弹', '躲过炸弹', '掉下来的石头', '三颗炸弹', '炸弹排排站',
  '跑得更快', '提前出发', '擦肩而过', '闪电跑', '完美闪避',
  '一边躲一边接', '金币和炸弹', '限时冲刺', '又躲又接', '双重挑战',
  '跑酷：拆解', '跑酷：多一段', '跑酷：多两段', '跑酷：终点', '跑酷：完整作品',
]

/**
 * 躲避与计分的一关：障碍会掉下来，碰到扣一条命，目标照接不误。
 *
 * items 里每件东西都标了 kind：
 *   hazard：掉下来的障碍，碰到就扣一条命（碰到一次就消失，不会连扣）。
 *   coin  ：站在地上的金币，碰到加 1 分。
 * mode = 'avoid' 的障碍是「躲得开」的：角色走远了它才掉下来。
 */
function dodgeLevel({
  levelId, sortOrder, unitId, title, levelType, tags, badge, minutes,
  x0 = PLAYER_X, speed, items, goalX = null, backdrop = 'sky',
  facts, goalText, successText, lives = 3,
}) {
  const hazards = items.filter((item) => item.kind === 'hazard')
  const coins = items.filter((item) => item.kind === 'coin')
  const hits = hazards.filter((hazard) => hazard.mode !== 'avoid').length
  const sceneSprites = [
    playerSprite(x0),
    ...items.map((item) => sprite({
      id: item.id,
      asset: item.asset,
      x: item.x,
      y: item.y,
      direction: item.fallSpeed ? 180 : 90,
      size: 100,
      collectible: true,
    })),
  ]
  if (goalX !== null) sceneSprites.push(goalSprite(goalX))

  const solution = chain([
    setVar('lives', lives),
    setVar('score', 0),
    forever([
      move(speed),
      ...hazards.map((hazard) => ifTouch(hazard.id, [changeVar('lives', -1)])),
      ...coins.map((coin) => ifTouch(coin.id, [changeVar('score', 1)])),
    ]),
  ])

  const conditions = [
    { type: 'variable_value', variable_id: 'lives', op: '==', value: lives - hits },
    { type: 'variable_value', variable_id: 'score', op: '==', value: coins.length },
    ...coins.map((coin) => ({ type: 'sprite_hidden', sprite_id: coin.id })),
  ]
  if (goalX !== null) conditions.push({ type: 'sprite_at', sprite_id: 'player', x: goalX, y: PLAYER_Y })

  const scene = stageScene({
    backdrop,
    sprites: sceneSprites,
    variables: [variable('lives', lives), variable('score', 0)],
    initialScripts: items.filter((item) => item.fallSpeed).map(fallingScript),
  })

  return {
    levelId,
    sortOrder,
    unitId,
    title,
    levelType,
    knowledgeTags: tags,
    milestoneBadge: badge ?? null,
    estimatedMinutes: minutes ?? 15,
    goalText,
    facts: {
      kind: 'dodge',
      hazardCount: hazards.length,
      hazardHits: hits,
      targetCount: coins.length,
      scoreTotal: coins.length,
      lives,
      speed,
      ...facts,
    },
    solution: [solution],
    body: buildBody({
      scene,
      blocks: stageBlocks({
        variables: ['lives', 'score'],
        spriteOptions: touchOptions(items),
      }),
      maxBlocks: countBlocks([solution]) + 2,
      maxSteps: 240,
      successCheck: { type: 'all', conditions },
      successText: successText ?? '躲过去啦！',
    }),
  }
}

function l2u2Levels() {
  const levels = []
  const unitId = STAGE_UNITS.L2U2

  // 181-185：躲不掉的炸弹，教会「碰到要扣分」。
  const g1 = [
    { count: 2, speed: 8, fall: 5 },
    { count: 2, speed: 10, fall: 6 },
    { count: 3, speed: 10, fall: 6 },
    { count: 3, speed: 12, fall: 7 },
    { count: 4, speed: 12, fall: 7 },
  ]
  g1.forEach((spec, index) => {
    const levelId = `blk-${String(181 + index).padStart(3, '0')}`
    const items = planItems({
      items: series('bomb', spec.count, { asset: 'bomb', fallSpeed: spec.fall, kind: 'hazard' }),
      x0: PLAYER_X,
      speed: spec.speed,
    })
    levels.push(dodgeLevel({
      levelId,
      sortOrder: 181 + index,
      unitId,
      title: L2U2_TITLES[index],
      levelType: index === 3 ? 'practice' : 'new',
      tags: ['stage', 'collision', 'lives'],
      speed: spec.speed,
      items,
      goalText: `撞到 ${spec.count} 次炸弹，lives 从 3 扣到 ${3 - spec.count}，别把命全撞光`,
      successText: '扣分规则学会啦！',
    }))
  })

  // 186-190：有一个障碍躲得开，走快一点就能从它底下钻过去。
  const g2 = [
    { count: 3, avoid: 1, speed: 10, fall: 5 },
    { count: 3, avoid: 1, speed: 12, fall: 5 },
    { count: 4, avoid: 2, speed: 12, fall: 6 },
    { count: 4, avoid: 2, speed: 14, fall: 6 },
    { count: 5, avoid: 2, speed: 14, fall: 7 },
  ]
  g2.forEach((spec, index) => {
    const levelId = `blk-${String(186 + index).padStart(3, '0')}`
    const bombs = series('bomb', spec.count, { asset: 'bomb', fallSpeed: spec.fall, kind: 'hazard' })
    for (const bomb of bombs.slice(-spec.avoid)) bomb.mode = 'avoid'
    const items = planItems({ items: bombs, x0: PLAYER_X, speed: spec.speed })
    levels.push(dodgeLevel({
      levelId,
      sortOrder: 186 + index,
      unitId,
      title: L2U2_TITLES[5 + index],
      levelType: index === 3 ? 'practice' : 'new',
      tags: ['stage', 'collision', 'lives', 'speed'],
      speed: spec.speed,
      items,
      goalText: `路上有 ${spec.count} 个炸弹，只要撞到 ${spec.count - spec.avoid} 次，lives 就要还剩 ${3 - (spec.count - spec.avoid)} 条`,
      successText: '躲得真准！',
    }))
  })

  // 191-195：一边躲炸弹一边接金币。
  const g3 = [
    { bombs: 2, avoid: 1, coins: 2, speed: 10, fall: 5 },
    { bombs: 2, avoid: 1, coins: 3, speed: 12, fall: 5 },
    { bombs: 3, avoid: 1, coins: 3, speed: 12, fall: 6 },
    { bombs: 3, avoid: 2, coins: 3, speed: 14, fall: 6 },
    { bombs: 4, avoid: 2, coins: 4, speed: 14, fall: 7 },
  ]
  g3.forEach((spec, index) => {
    const levelId = `blk-${String(191 + index).padStart(3, '0')}`
    const bombs = series('bomb', spec.bombs, { asset: 'bomb', fallSpeed: spec.fall, kind: 'hazard' })
    for (const bomb of bombs.slice(-spec.avoid)) bomb.mode = 'avoid'
    const items = planItems({
      items: interleave(bombs, series('coin', spec.coins, { asset: 'coin', kind: 'coin' })),
      x0: PLAYER_X,
      speed: spec.speed,
    })
    const goalX = goalAtFinishLine()
    levels.push(dodgeLevel({
      levelId,
      sortOrder: 191 + index,
      unitId,
      title: L2U2_TITLES[10 + index],
      levelType: index === 3 ? 'practice' : 'new',
      tags: ['stage', 'collision', 'score', 'lives'],
      speed: spec.speed,
      items,
      goalX,
      goalText: `接住 ${spec.coins} 枚金币（score 加到 ${spec.coins}），撞到 ${spec.bombs - spec.avoid} 次炸弹（lives 剩 ${3 - (spec.bombs - spec.avoid)}），再踩到终点旗`,
      successText: '又躲又接，成功！',
    }))
  })

  // 196-200：项目关，路更长、东西更多。
  const g4 = [
    { bombs: 3, avoid: 1, coins: 3, speed: 10, fall: 5 },
    { bombs: 3, avoid: 2, coins: 3, speed: 12, fall: 6 },
    { bombs: 4, avoid: 2, coins: 4, speed: 12, fall: 6 },
    { bombs: 4, avoid: 2, coins: 4, speed: 14, fall: 7 },
    { bombs: 5, avoid: 3, coins: 5, speed: 14, fall: 7 },
  ]
  g4.forEach((spec, index) => {
    const levelId = `blk-${String(196 + index).padStart(3, '0')}`
    const bombs = series('bomb', spec.bombs, { asset: 'bomb', fallSpeed: spec.fall, kind: 'hazard' })
    for (const bomb of bombs.slice(-spec.avoid)) bomb.mode = 'avoid'
    const items = planItems({
      items: interleave(bombs, series('coin', spec.coins, { asset: 'coin', kind: 'coin' })),
      x0: PLAYER_X,
      speed: spec.speed,
    })
    const goalX = goalAtFinishLine()
    levels.push(dodgeLevel({
      levelId,
      sortOrder: 196 + index,
      unitId,
      title: L2U2_TITLES[15 + index],
      levelType: index === 4 ? 'project' : index === 3 ? 'practice' : 'new',
      tags: ['project', 'stage', 'collision', 'score', 'lives'],
      badge: index === 4 ? 'term3_master' : null,
      minutes: index >= 3 ? 20 : 15,
      speed: spec.speed,
      items,
      goalX,
      goalText: `接住 ${spec.coins} 枚金币，撞到 ${spec.bombs - spec.avoid} 次炸弹，最后踩到终点旗`,
      successText: '跑酷项目完成！',
    }))
  })

  return levels
}

// ---------------------------------------------------------------------------
// Level 3 · 单元 1：克隆与事件（blk-201 … blk-220）
// ---------------------------------------------------------------------------

const L3U1_TITLES = [
  '第一发子弹', '打中一个', '再打一个', '三发子弹', '子弹小队',
  '连续发射', '不停歇', '弹幕', '火力全开', '扫清航道',
  '两路夹击', '两种子弹', '双管', '交叉火力', '双重齐射',
  '飞机大战：拆解', '飞机大战：敌人', '飞机大战：多敌', '飞机大战：终点', '飞机大战：完整作品',
]

/**
 * 克隆关：角色一边飞一边造子弹，子弹自己往上飞，打中敌人就加分。
 *
 * 敌人的 x 一定落在角色步长的整倍数上——子弹就是角色每个 Tick 所在的位置，
 * 这样才保证有一发子弹正好从敌人身上穿过去。
 */
function cloneLevel({
  levelId, sortOrder, unitId, title, levelType, tags, badge, minutes,
  x0 = PLAYER_X, shipSpeed, bulletSpeed, enemies, templates, goalX = null, backdrop = 'night',
  facts, goalText, successText,
}) {
  const sceneSprites = [
    playerSprite(x0, 'ship'),
    ...enemies.map((enemy) => sprite({
      id: enemy.id, asset: 'enemy', x: enemy.x, y: enemy.y, direction: 0, size: 100, collectible: true,
    })),
  ]
  if (goalX !== null) sceneSprites.push(goalSprite(goalX))

  const enemyChecks = enemies.map((enemy) => ifTouch(enemy.id, [changeVar('score', 1)]))
  const solutions = [
    chain([setVar('score', 0), forever([move(shipSpeed)])]),
    ...templates.map((template) => chain([
      forever([cloneBlock(template.id, [forever([move(bulletSpeed), ...enemyChecks])])]),
    ])),
  ]

  const conditions = [
    { type: 'variable_value', variable_id: 'score', op: '==', value: enemies.length },
    ...enemies.map((enemy) => ({ type: 'sprite_hidden', sprite_id: enemy.id })),
  ]
  if (goalX !== null) conditions.push({ type: 'sprite_at', sprite_id: 'player', x: goalX, y: PLAYER_Y })

  const scene = stageScene({
    backdrop,
    sprites: sceneSprites,
    clones: templates.map((template) => cloneTemplate({
      id: template.id,
      asset: template.asset,
      spawn: { x: 'self', y: 'self' },
      direction: 0,
      lifetimeSteps: template.lifetime,
      size: template.size ?? 50,
    })),
    variables: [variable('score', 0)],
  })

  return {
    levelId,
    sortOrder,
    unitId,
    title,
    levelType,
    knowledgeTags: tags,
    milestoneBadge: badge ?? null,
    estimatedMinutes: minutes ?? 20,
    goalText,
    facts: {
      kind: 'clone',
      enemyCount: enemies.length,
      cloneCount: templates.length,
      speed: shipSpeed,
      ...facts,
    },
    solution: solutions,
    body: buildBody({
      scene,
      blocks: stageBlocks({
        variables: ['score'],
        spriteOptions: touchOptions(enemies),
        cloneOptions: templates.map((template) => ({ value: template.id, label: template.label ?? template.id })),
      }),
      maxBlocks: countBlocks(solutions) + 3,
      maxSteps: 300,
      successCheck: { type: 'all', conditions },
      successText: successText ?? '打中啦！',
    }),
  }
}

/** 敌人放在角色步长的整倍数上，保证有子弹能穿过去。 */
function planEnemies({ count, x0, speed, ys, prefix = 'enemy' }) {
  const out = []
  for (let index = 0; index < count; index += 1) {
    // 步数不能太大：敌人得留在舞台里（x 最大 448）。
    const step = 4 + index * 4
    out.push({
      id: `${prefix}-${index + 1}`,
      x: x0 + speed * step,
      y: ys[index % ys.length],
    })
  }
  return out
}

function l3u1Levels() {
  const levels = []
  const unitId = STAGE_UNITS.L3U1

  // 201-205：先学会「克隆」这一块积木。
  const g1 = [
    { enemies: 1, speed: 10, ys: [200] },
    { enemies: 1, speed: 10, ys: [180] },
    { enemies: 2, speed: 12, ys: [200, 140] },
    { enemies: 2, speed: 12, ys: [220, 160] },
    { enemies: 3, speed: 12, ys: [200, 150, 250] },
  ]
  g1.forEach((spec, index) => {
    const levelId = `blk-${String(201 + index).padStart(3, '0')}`
    const enemies = planEnemies({ count: spec.enemies, x0: PLAYER_X, speed: spec.speed, ys: spec.ys })
    levels.push(cloneLevel({
      levelId,
      sortOrder: 201 + index,
      unitId,
      title: L3U1_TITLES[index],
      levelType: index === 3 ? 'practice' : 'new',
      tags: ['stage', 'clone', 'collision'],
      shipSpeed: spec.speed,
      bulletSpeed: 8,
      enemies,
      templates: [{ id: 'bullet', asset: 'bullet', label: '子弹', lifetime: 45, size: 50 }],
      goalText: `用克隆造出子弹，打中 ${spec.enemies} 个敌人，把 score 加到 ${spec.enemies}`,
      successText: '子弹打中啦！',
    }))
  })

  // 206-210：敌人变多，克隆要放在循环里一直造。
  const g2 = [
    { enemies: 2, speed: 10, ys: [200, 140] },
    { enemies: 3, speed: 12, ys: [200, 140, 250] },
    { enemies: 3, speed: 12, ys: [180, 230, 120] },
    { enemies: 4, speed: 14, ys: [200, 140, 250, 170] },
    { enemies: 4, speed: 14, ys: [220, 160, 110, 260] },
  ]
  g2.forEach((spec, index) => {
    const levelId = `blk-${String(206 + index).padStart(3, '0')}`
    const enemies = planEnemies({ count: spec.enemies, x0: PLAYER_X, speed: spec.speed, ys: spec.ys })
    levels.push(cloneLevel({
      levelId,
      sortOrder: 206 + index,
      unitId,
      title: L3U1_TITLES[5 + index],
      levelType: index === 3 ? 'practice' : 'new',
      tags: ['stage', 'clone', 'loop', 'collision'],
      shipSpeed: spec.speed,
      bulletSpeed: 8,
      enemies,
      templates: [{ id: 'bullet', asset: 'bullet', label: '子弹', lifetime: 45, size: 50 }],
      goalText: `连着发射，把 ${spec.enemies} 个敌人全部打中，score 加到 ${spec.enemies}`,
      successText: '弹幕扫平啦！',
    }))
  })

  // 211-215：两种克隆模板，两条火力线。
  const g3 = [
    { enemies: 2, speed: 10, ys: [200, 140] },
    { enemies: 3, speed: 12, ys: [200, 140, 250] },
    { enemies: 3, speed: 12, ys: [180, 230, 120] },
    { enemies: 4, speed: 14, ys: [200, 140, 250, 170] },
    { enemies: 4, speed: 14, ys: [220, 160, 110, 260] },
  ]
  g3.forEach((spec, index) => {
    const levelId = `blk-${String(211 + index).padStart(3, '0')}`
    const enemies = planEnemies({ count: spec.enemies, x0: PLAYER_X, speed: spec.speed, ys: spec.ys })
    levels.push(cloneLevel({
      levelId,
      sortOrder: 211 + index,
      unitId,
      title: L3U1_TITLES[10 + index],
      levelType: index === 3 ? 'practice' : 'new',
      tags: ['stage', 'clone', 'collision', 'concurrency'],
      shipSpeed: spec.speed,
      bulletSpeed: 8,
      enemies,
      templates: [
        { id: 'bullet', asset: 'bullet', label: '子弹', lifetime: 45, size: 50 },
        { id: 'shell', asset: 'bomb', label: '炮弹', lifetime: 60, size: 60 },
      ],
      goalText: `用两种克隆火力，把 ${spec.enemies} 个敌人全部打中，score 加到 ${spec.enemies}`,
      successText: '交叉火力成功！',
    }))
  })

  // 216-220：飞机大战项目，敌人更多，还要飞到终点。
  const g4 = [
    { enemies: 3, speed: 10, ys: [200, 140, 250] },
    { enemies: 3, speed: 12, ys: [180, 230, 120] },
    { enemies: 4, speed: 12, ys: [200, 140, 250, 170] },
    { enemies: 4, speed: 14, ys: [220, 160, 110, 260] },
    { enemies: 5, speed: 14, ys: [200, 150, 240, 120, 260] },
  ]
  g4.forEach((spec, index) => {
    const levelId = `blk-${String(216 + index).padStart(3, '0')}`
    const enemies = planEnemies({ count: spec.enemies, x0: PLAYER_X, speed: spec.speed, ys: spec.ys })
    const goalX = goalAtFinishLine()
    levels.push(cloneLevel({
      levelId,
      sortOrder: 216 + index,
      unitId,
      title: L3U1_TITLES[15 + index],
      levelType: index === 4 ? 'project' : index === 3 ? 'practice' : 'new',
      tags: ['project', 'stage', 'clone', 'collision', 'score'],
      badge: index === 4 ? 'term4_project' : null,
      minutes: 25,
      shipSpeed: spec.speed,
      bulletSpeed: 8,
      enemies,
      templates: [{ id: 'bullet', asset: 'bullet', label: '子弹', lifetime: 45, size: 50 }],
      goalX,
      goalText: `用克隆打掉 ${spec.enemies} 个敌人（score 加到 ${spec.enemies}），再把飞船开到右边的小旗子`,
      successText: '飞机大战完成！',
    }))
  })

  return levels
}

// ---------------------------------------------------------------------------
// Level 3 · 单元 2：多角色与复杂逻辑（blk-221 … blk-240）
// ---------------------------------------------------------------------------

const L3U2_TITLES = [
  '宝石加倍', '两颗宝石', '星星和宝石', '宝石大道', '满地宝石',
  '一碰两响', '上下夹击', '同时碰到', '两响合一', '双重回响',
  '两个角色', '小帮手上场', '一起得分', '分工合作', '合作拿分',
  '吃豆人：拆解', '吃豆人：金币', '吃豆人：幽灵', '吃豆人：终点', '吃豆人：完整作品',
]

/**
 * 复杂逻辑的一关：条件里再套条件。
 *
 * items 里每件东西都标了 kind：
 *   target：角色自己要接的，接到了加分。
 *   hazard：掉下来的危险，碰到了扣一条命。
 *   helper：小帮手自己要接的，帮手接到了也加分。
 *
 * nested = 'bonus'：碰到目标后用「重复执行」加 2 分。
 * nested = 'both' ：上下两个目标同一时刻碰到才算数（两个目标的 x 相同，
 *                   所以角色一定在同一帧同时碰到它们）。
 */
function nestedLevel({
  levelId, sortOrder, unitId, title, levelType, tags, badge, minutes,
  x0 = PLAYER_X, speed, items, goalX = null, backdrop = 'grass',
  facts, goalText, successText, helper = null,
}) {
  const targets = items.filter((item) => item.kind === 'target')
  const hazards = items.filter((item) => item.kind === 'hazard')
  const helperTargets = items.filter((item) => item.kind === 'helper')

  // 「一碰两响」：pair 指向配对的另一个目标。两个都碰到才 1 分，
  // 所以配对里靠下的那个不单独计分。
  const innerIds = new Set(targets.map((target) => target.pair).filter(Boolean))
  const ownPoints = targets.reduce(
    (sum, target) => sum + (innerIds.has(target.id) ? 0 : (target.points ?? 1)),
    0,
  )
  const helperPoints = helperTargets.reduce((sum, target) => sum + (target.points ?? 1), 0)
  const totalScore = ownPoints + helperPoints

  const sceneSprites = [
    playerSprite(x0),
    ...items.map((item) => sprite({
      id: item.id,
      asset: item.asset,
      x: item.x,
      y: item.y,
      direction: item.fallSpeed ? 180 : 90,
      size: 100,
      collectible: true,
    })),
  ]
  if (helper) {
    sceneSprites.push(sprite({ id: helper.id, asset: helper.asset, x: helper.x, y: helper.y, direction: 90, size: 100 }))
  }
  if (goalX !== null) sceneSprites.push(goalSprite(goalX))

  // 每个目标的分支体：加分 1 分、或者用「重复执行」加 2 分。
  // 配对的目标：先碰上面的，再看有没有同时碰到下面的。
  const checks = targets
    .filter((target) => !innerIds.has(target.id))
    .map((target) => {
      const inner = target.pair ? targets.find((item) => item.id === target.pair) : null
      if (inner) return ifTouch(target.id, [ifTouch(inner.id, [changeVar('score', 1)])])
      return ifTouch(target.id, [
        target.points && target.points > 1
          ? rep(target.points, [changeVar('score', 1)])
          : changeVar('score', 1),
      ])
    })

  const solution = chain([
    setVar('score', 0),
    forever([
      move(speed),
      ...checks,
      ...hazards.map((hazard) => ifTouch(hazard.id, [changeVar('lives', -1)])),
    ]),
  ])

  const initialScripts = items.filter((item) => item.fallSpeed).map(fallingScript)
  if (helper) {
    initialScripts.push(initialScript({
      id: `${helper.id}-work`,
      targetSpriteId: helper.id,
      block: forever([
        move(helper.speed),
        ...helperTargets.map((target) => ifTouch(target.id, [rep(target.points ?? 1, [changeVar('score', 1)])])),
      ]),
    }))
  }

  const conditions = [
    { type: 'variable_value', variable_id: 'score', op: '==', value: totalScore },
    ...targets.map((target) => ({ type: 'sprite_hidden', sprite_id: target.id })),
    ...helperTargets.map((target) => ({ type: 'sprite_hidden', sprite_id: target.id })),
  ]
  if (hazards.length) {
    conditions.push({
      type: 'variable_value',
      variable_id: 'lives',
      op: '==',
      value: 3 - hazards.filter((hazard) => hazard.mode !== 'avoid').length,
    })
  }
  if (goalX !== null) conditions.push({ type: 'sprite_at', sprite_id: 'player', x: goalX, y: PLAYER_Y })

  const scene = stageScene({
    backdrop,
    sprites: sceneSprites,
    variables: [variable('score', 0), ...(hazards.length ? [variable('lives', 3)] : [])],
    initialScripts,
  })

  return {
    levelId,
    sortOrder,
    unitId,
    title,
    levelType,
    knowledgeTags: tags,
    milestoneBadge: badge ?? null,
    estimatedMinutes: minutes ?? 20,
    goalText,
    facts: {
      kind: 'nested',
      targetCount: targets.length,
      scoreTotal: totalScore,
      speed,
      lives: hazards.length ? 3 : 0,
      ...facts,
    },
    solution: [solution],
    body: buildBody({
      scene,
      blocks: stageBlocks({
        variables: hazards.length ? ['lives', 'score'] : ['score'],
        spriteOptions: touchOptions(items),
        withRepeat: true,
      }),
      maxBlocks: countBlocks([solution]) + 3,
      maxSteps: 300,
      successCheck: { type: 'all', conditions },
      successText: successText ?? '闯关成功！',
    }),
  }
}

/**
 * 小帮手那一行的道具。
 *
 * x 必须落在帮手步长的整倍数上：帮手每步走固定的距离，
 * 只有站在它一定会踩到的位置上，才能保证接到。
 */
function planHelperItems({ count, x0 = PLAYER_X, speed, prefix, asset, points, y }) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    asset,
    points,
    kind: 'helper',
    x: x0 + speed * (4 + index * 4),
    y,
  }))
}

function l3u2Levels() {
  const levels = []
  const unitId = STAGE_UNITS.L3U2

  // 221-225：宝石加倍，条件里套一层「重复执行」。
  const g1 = [
    { stars: 2, gems: 1, speed: 8 },
    { stars: 3, gems: 1, speed: 10 },
    { stars: 2, gems: 2, speed: 10 },
    { stars: 3, gems: 2, speed: 12 },
    { stars: 4, gems: 3, speed: 12 },
  ]
  g1.forEach((spec, index) => {
    const levelId = `blk-${String(221 + index).padStart(3, '0')}`
    const items = planItems({
      items: interleave(
        series('star', spec.stars, { asset: 'star', points: 1, kind: 'target' }),
        series('gem', spec.gems, { asset: 'gem', points: 2, kind: 'target' }),
      ),
      x0: PLAYER_X,
      speed: spec.speed,
    })
    levels.push(nestedLevel({
      levelId,
      sortOrder: 221 + index,
      unitId,
      title: L3U2_TITLES[index],
      levelType: index === 3 ? 'practice' : 'new',
      tags: ['stage', 'condition', 'nested', 'variable'],
      speed: spec.speed,
      items,
      facts: { bonusTargets: spec.gems, nestedRule: '碰到宝石的时候，条件里面再放一块「重复执行」，让它加 2 分' },
      goalText: `接住 ${spec.stars} 颗星星（1 分）和 ${spec.gems} 颗宝石（2 分），把 score 加到 ${spec.stars + spec.gems * 2}`,
      successText: '宝石加倍成功！',
    }))
  })

  // 226-230：一碰两响，条件里再套一个条件。
  const g2 = [
    { pairs: 1, speed: 10 },
    { pairs: 2, speed: 10 },
    { pairs: 2, speed: 12 },
    { pairs: 3, speed: 12 },
    { pairs: 3, speed: 14 },
  ]
  g2.forEach((spec, index) => {
    const levelId = `blk-${String(226 + index).padStart(3, '0')}`
    // 上下两个目标同一个 x，角色一定同一帧同时碰到它们。
    const items = []
    for (let pairIndex = 0; pairIndex < spec.pairs; pairIndex += 1) {
      const x = Math.round(PLAYER_X + 80 + pairIndex * 110)
      const upperId = `pair-${pairIndex + 1}-up`
      const lowerId = `pair-${pairIndex + 1}-down`
      items.push({ id: upperId, asset: 'star', x, y: 272, points: 1, kind: 'target', pair: lowerId })
      items.push({ id: lowerId, asset: 'coin', x, y: 310, points: 1, kind: 'target', pair: null })
    }
    levels.push(nestedLevel({
      levelId,
      sortOrder: 226 + index,
      unitId,
      title: L3U2_TITLES[5 + index],
      levelType: index === 3 ? 'practice' : 'new',
      tags: ['stage', 'condition', 'nested'],
      speed: spec.speed,
      items,
      facts: { nestedRule: '先检查上面的目标有没有碰到，碰到了再看下面的目标是不是也碰到了，两个都碰到才加分' },
      goalText: `一上一下 ${spec.pairs} 对目标，要同时碰到才算数，把 score 加到 ${spec.pairs}`,
      successText: '一碰两响成功！',
    }))
  })

  // 231-235：小帮手和角色一起得分。
  const g3 = [
    { coins: 2, gems: 1, speed: 8 },
    { coins: 3, gems: 1, speed: 10 },
    { coins: 3, gems: 2, speed: 10 },
    { coins: 4, gems: 2, speed: 12 },
    { coins: 4, gems: 3, speed: 12 },
  ]
  g3.forEach((spec, index) => {
    const levelId = `blk-${String(231 + index).padStart(3, '0')}`
    const coins = planItems({
      items: series('coin', spec.coins, { asset: 'coin', points: 1, kind: 'target' }),
      x0: PLAYER_X,
      speed: spec.speed,
    })
    const gems = planHelperItems({
      count: spec.gems,
      x0: PLAYER_X,
      speed: 10,
      prefix: 'gem',
      asset: 'gem',
      points: 2,
      y: 240,
    })
    levels.push(nestedLevel({
      levelId,
      sortOrder: 231 + index,
      unitId,
      title: L3U2_TITLES[10 + index],
      levelType: index === 3 ? 'practice' : 'new',
      tags: ['stage', 'concurrency', 'condition', 'nested'],
      speed: spec.speed,
      items: [...coins, ...gems],
      helper: { id: 'helper', asset: 'bee', x: PLAYER_X, y: 240, speed: 10 },
      facts: {
        bonusTargets: spec.gems,
        nestedRule: '小帮手在上面的那一行跑，碰到宝石就加 2 分；你管下面那一行的硬币',
      },
      goalText: `你接住 ${spec.coins} 枚硬币（1 分），小帮手接住 ${spec.gems} 颗宝石（2 分），两人一起把 score 加到 ${spec.coins + spec.gems * 2}`,
      successText: '合作成功！',
    }))
  })

  // 236-240：吃豆人项目，金币 + 幽灵 + 终点。
  const g4 = [
    { coins: 3, ghosts: 2, avoid: 1, speed: 10 },
    { coins: 3, ghosts: 2, avoid: 1, speed: 12 },
    { coins: 4, ghosts: 3, avoid: 2, speed: 12 },
    { coins: 4, ghosts: 3, avoid: 2, speed: 14 },
    { coins: 5, ghosts: 4, avoid: 2, speed: 14 },
  ]
  g4.forEach((spec, index) => {
    const levelId = `blk-${String(236 + index).padStart(3, '0')}`
    const ghosts = series('ghost', spec.ghosts, { asset: 'ghost', fallSpeed: 5, kind: 'hazard' })
    for (const ghost of ghosts.slice(-spec.avoid)) ghost.mode = 'avoid'
    const items = planItems({
      items: interleave(
        series('coin', spec.coins, { asset: 'coin', points: 1, kind: 'target' }),
        ghosts,
      ),
      x0: PLAYER_X,
      speed: spec.speed,
    })
    const goalX = goalAtFinishLine()
    levels.push(nestedLevel({
      levelId,
      sortOrder: 236 + index,
      unitId,
      title: L3U2_TITLES[15 + index],
      levelType: index === 4 ? 'project' : index === 3 ? 'practice' : 'new',
      tags: ['project', 'stage', 'collision', 'lives', 'condition'],
      badge: index === 4 ? 'term4_master' : null,
      minutes: 25,
      speed: spec.speed,
      items,
      goalX,
      facts: { nestedRule: '碰到幽灵要扣一条命，幽灵掉下来的时间要算好' },
      goalText: `接住 ${spec.coins} 枚金币，撞到 ${spec.ghosts - spec.avoid} 次幽灵（lives 剩 ${3 - (spec.ghosts - spec.avoid)}），最后踩到终点旗`,
      successText: '吃豆人完成！',
    }))
  })

  return levels
}

// ---------------------------------------------------------------------------
// 组装全部关卡
// ---------------------------------------------------------------------------

/**
 * 二年级第一关的复习卡。
 *
 * 这一关之前是二年级的第一课，没有上一关可以复习，
 * 但课程线是有顺序的：上一关是二年级的开篇，
 * 这里复习的是一年级的「变量和计分」。
 */
const FIRST_REVIEW = {
  question: '一年级的最后一课我们学会了什么呀？',
  answer: '用变量记住分数：变量像一个小盒子，写进数字之后它就一直记着。',
  hint: '这一关也要用 score 这个小盒子记住接住了几个目标。',
}

/** 关卡类型按「12 新课 / 5 练习 / 2 打字 / 1 项目」的节奏排。 */
function levelTypeOf(unitIndex, indexInUnit) {
  const phase = indexInUnit % 5
  if (unitIndex === 1 && indexInUnit === 19) return 'project'
  if (phase === 3) return 'practice'
  if (phase === 4) return 'typing'
  return 'new'
}

function buildAllLevels() {
  const families = [l2u1Levels(), l2u2Levels(), l3u1Levels(), l3u2Levels()]
  const levels = []
  families.forEach((family, unitIndex) => {
    family.forEach((level, indexInUnit) => {
      levels.push({
        ...level,
        levelType: levelTypeOf(unitIndex, indexInUnit),
        knowledgeTags: level.knowledgeTags,
      })
    })
  })

  // 目标文案先定下来，绘本和提示都按同一份事实生成。
  const withGoals = levels.map((level) => ({ ...level, goal: level.goalText }))

  // 复习卡要引用上一关，所以按关卡顺序来，而且必须在自校验之前装进正文——
  // 自校验会用生产解析器校验正文，文案或 schema 写错了这里就会炸。
  const withTeaching = withGoals.map((level, index) => {
    const previous = index > 0 ? withGoals[index - 1] : null
    const story = buildStageStoryFor(level, previous)
    if (index === 0 && !story.review) story.review = FIRST_REVIEW
    return {
      ...level,
      body: { ...level.body, hints: buildStageHints(level), ...story },
    }
  })

  return withTeaching.map((level) => sealLevel(level))
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
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
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
   ${sqlString(level.termId ?? unitTermOf(level.unitId))}, ${sqlString(level.unitId)}, 'stage', ${sqlString(level.levelType)},
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

function unitTermOf(unitId) {
  const unit = UNIT_META.find((item) => item.unitId === unitId)
  if (!unit) throw new Error(`未知单元 ${unitId}`)
  return unit.termId
}

function buildSql(levels) {
  const parts = []
  parts.push(`-- Blockly 二年级 80 关自由舞台（blk-161 … blk-240），一次迁移落库。
--
-- 这个文件由 scripts/generate-stage-levels.mjs 生成，不要手工改：
--   npx tsx scripts/generate-stage-levels.mjs
-- 生成器用生产解析器和生产解释器把每关的标准解跑通一遍才写进来。
--
-- 迁移分五步：
--   1. 两个学期的容量和简介改成 40 课。
--   2. 单元：Level 2 复用 u1/u2、u3…u5 改成 -legacy；
--      Level 3 的 u1…u5 全部改成 -legacy，新的 u1/u2 重新占 1、2 号。
--   3. 旧的占位关卡换号（Level 2 的 blk-167…175 → blk-901…909，
--      Level 3 的 blk-241…255 → blk-941…955），占位行不删。
--   4. learning_record 里的旧编号同步改名，进度不丢。
--   5. 写入 80 关正文。
--
-- Neon 跨语句没有事务，每条语句都写成幂等的固定值，重跑即可。
-- 迁移前请确认已经备份；本文件不执行任何 delete。
`)

  parts.push(`-- 1. 学期容量
update public.module_term
set
  weeks = 20,
  level_cap = 40,
  summary = case term_id
    when 'blk-g2-fall' then '自由舞台第一学期：舞台移动、变量计分、躲避危险。完成 2 个小游戏。'
    else '自由舞台第二学期：克隆、多角色协作、复杂条件。完成 1 个大游戏。'
  end,
  updated_at = now()
where module_id = 'blockly'
  and term_id in ('blk-g2-fall', 'blk-g2-spring');`)

  parts.push(`-- 2. 单元
--
-- 旧的 u3…u5（Level 2）和 u1…u5（Level 3）不能删（表上有 forbid_business_delete 触发器），
-- 只能改成 -legacy 编号。父子表改号都会触发即时外键检查，因此放进单个 DO 原子块：
-- 先临时移除外键，父子表都改完后立即重加并校验；块内失败会整体回滚。
-- 父表仅在 legacy 行尚不存在时改号，子表只迁旧占位行，避免重跑误伤新舞台单元。
do $$
begin
  alter table public.module_level drop constraint if exists module_level_unit_fk;

  update public.module_unit
  set unit_id = case unit_id
        when 'blk-g2-fall-u3' then 'blk-g2-fall-u3-legacy'
        when 'blk-g2-fall-u4' then 'blk-g2-fall-u4-legacy'
        when 'blk-g2-fall-u5' then 'blk-g2-fall-u5-legacy'
      end,
    updated_at = now()
  where module_id = 'blockly'
    and unit_id in ('blk-g2-fall-u3', 'blk-g2-fall-u4', 'blk-g2-fall-u5')
    and not exists (
      select 1 from public.module_unit legacy
      where legacy.module_id = public.module_unit.module_id
        and legacy.unit_id = public.module_unit.unit_id || '-legacy'
    );

  update public.module_level
  set unit_id = case unit_id
        when 'blk-g2-fall-u3' then 'blk-g2-fall-u3-legacy'
        when 'blk-g2-fall-u4' then 'blk-g2-fall-u4-legacy'
        when 'blk-g2-fall-u5' then 'blk-g2-fall-u5-legacy'
      end,
    updated_at = now()
  where module_id = 'blockly'
    and unit_id in ('blk-g2-fall-u3', 'blk-g2-fall-u4', 'blk-g2-fall-u5')
    and is_placeholder = true;

  update public.module_unit
  set unit_id = 'blk-g2-spring-u' || (right(unit_id, 1)::int) || '-legacy',
    sort_order = 90 + right(unit_id, 1)::int,
    updated_at = now()
  where module_id = 'blockly'
    and unit_id in ('blk-g2-spring-u1', 'blk-g2-spring-u2', 'blk-g2-spring-u3', 'blk-g2-spring-u4', 'blk-g2-spring-u5')
    and not exists (
      select 1 from public.module_unit legacy
      where legacy.module_id = public.module_unit.module_id
        and legacy.unit_id = public.module_unit.unit_id || '-legacy'
    );

  update public.module_level
  set unit_id = 'blk-g2-spring-u' || (right(unit_id, 1)::int) || '-legacy',
    updated_at = now()
  where module_id = 'blockly'
    and unit_id in ('blk-g2-spring-u1', 'blk-g2-spring-u2', 'blk-g2-spring-u3', 'blk-g2-spring-u4', 'blk-g2-spring-u5')
    and is_placeholder = true;

  alter table public.module_level add constraint module_level_unit_fk
    foreign key (module_id, unit_id) references public.module_unit (module_id, unit_id);
end $$;

insert into public.module_unit
  (module_id, unit_id, term_id, title, summary, scene_form, knowledge_tags, level_cap, sort_order)
values
${UNIT_META.map(
  (unit) => `  ('blockly', ${sqlString(unit.unitId)}, ${sqlString(unit.termId)}, ${sqlString(unit.title)},
   ${sqlString(unit.summary)}, 'stage',
   ${sqlArray(unit.knowledgeTags)}, ${unit.levelCap}, ${unit.sortOrder})`,
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

  parts.push(`-- 3. 旧的占位关卡换号（先挪到临时号段，再换正式号段）
--
-- sort_order 上有唯一约束 (module_id, sort_order)，直接换号会撞车。
-- 先把两组行挪到 10000+ 的临时号段，再一条一条换到预留号段。
-- 每条 update 都带 term_id 和 is_placeholder 守卫：重跑时新舞台关卡即使复用旧编号，也不会被误挪。
update public.module_level
set sort_order = sort_order + 10000
where module_id = 'blockly'
  and is_placeholder = true
  and (
    (term_id = 'blk-g2-fall' and level_id between 'blk-167' and 'blk-175')
    or (term_id = 'blk-g2-spring' and level_id between 'blk-241' and 'blk-255')
  );`)

  parts.push(
    RENUMBER.map(
      (row) => `-- ${row.oldId} → ${row.newId}
update public.module_level
set
  level_id = ${sqlString(row.newId)},
  sort_order = ${row.newOrder},
  updated_at = now()
where module_id = 'blockly'
  and level_id = ${sqlString(row.oldId)}
  and term_id = ${sqlString(row.termId)}
  and is_placeholder = true;`,
    ).join('\n\n'),
  )

  parts.push(`-- 4. 学习记录跟着改编号，进度不丢
--
-- learning_record 的主键是 (student_id, level_id)，目标编号已经存在时跳过。
-- 只在旧编号已不存在、目标 legacy 行存在时迁移，避免重跑把新舞台关卡的进度改走。
with remap(old_id, new_id) as (
  values
${RENUMBER.map((row) => `    (${sqlString(row.oldId)}, ${sqlString(row.newId)})`).join(',\n')}
)
update public.learning_record lr
set level_id = r.new_id
from remap r
where lr.module_id = 'blockly'
  and lr.level_id = r.old_id
  and not exists (
    select 1 from public.module_level source
    where source.module_id = 'blockly'
      and source.level_id = r.old_id
  )
  and exists (
    select 1 from public.module_level target
    where target.module_id = 'blockly'
      and target.level_id = r.new_id
      and target.is_placeholder = true
  )
  and not exists (
    select 1 from public.learning_record t
    where t.student_id = lr.student_id
      and t.level_id = r.new_id
  );`)

  parts.push(`-- 5. 二年级 80 关正文
--
-- workspace.max_blocks 的语义是「工作区积木总数（含嵌套子块）」。
-- 舞台关卡卡得比较紧：写不出「无限循环 + 如果碰到」的关卡过不了。
-- runtime.max_steps 是舞台能跑的 Tick 数上限，写错了不会一直空转。`)
  parts.push(levels.map((level) => levelSql(level)).join('\n\n'))

  parts.push(`-- 验收 SQL（迁移后逐条跑）
--
-- A. 二年级两个学期各 40 关，都是真实正文
-- select term_id, count(*) from public.module_level
-- where module_id = 'blockly' and term_id in ('blk-g2-fall', 'blk-g2-spring') and is_placeholder = false
-- group by term_id;
--
-- B. 编号连续，场景类型都是 stage
-- select term_id, min(sort_order), max(sort_order), count(*)
-- from public.module_level where module_id = 'blockly'
--   and term_id in ('blk-g2-fall', 'blk-g2-spring')
-- group by term_id order by min(sort_order);
--
-- C. 没有关卡游离在单元之外
-- select count(*) from public.module_level
-- where module_id = 'blockly' and term_id in ('blk-g2-fall', 'blk-g2-spring')
--   and unit_id not like 'blk-g2-%';
--
-- D. 正文里的 scene_type 与列一致
-- select level_id from public.module_level ml
-- where ml.module_id = 'blockly' and ml.scene_type <> ml.body->>'scene_type';
--
-- E. 每关都有复习卡
-- select count(*) from public.module_level
-- where module_id = 'blockly' and term_id in ('blk-g2-fall', 'blk-g2-spring')
--   and body->'review' is null;
--
-- F. 学习记录没有指向不存在关卡的行
-- select lr.level_id, count(*) from public.learning_record lr
-- where lr.module_id = 'blockly'
--   and not exists (select 1 from public.module_level ml
--                   where ml.module_id = 'blockly' and ml.level_id = lr.level_id)
-- group by lr.level_id;`)
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
  if (count !== 20) throw new Error(`单元 ${unit.unitId} 应该是 20 关，实际 ${count} 关`)
}

// 编号必须连号：blk-161…240。
const sorted = [...levels].sort((left, right) => left.sortOrder - right.sortOrder)
sorted.forEach((level, index) => {
  const expected = 161 + index
  if (level.sortOrder !== expected) throw new Error(`第 ${index + 1} 关的 sort_order 是 ${level.sortOrder}，应该是 ${expected}`)
})

// 标准解用到的积木必须都在本关的积木盘上。
for (const level of levels) {
  const available = new Set(level.body.available_blocks.map((block) => block.type))
  for (const node of level.solution) {
    const stack = [node]
    while (stack.length) {
      const current = stack.pop()
      if (!current) continue
      if (!available.has(current.type)) {
        throw new Error(`${level.levelId} 的标准解用了积木 ${current.type}，但这一关的积木盘上没有`)
      }
      for (const child of current.children ?? []) if (child) stack.push(child)
      if (current.next) stack.push(current.next)
    }
  }
}

mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true })
writeFileSync(MANIFEST_PATH, `${JSON.stringify({ levels }, null, 2)}\n`, 'utf8')
writeFileSync(SQL_PATH, `${buildSql(levels)}\n`, 'utf8')
writeFileSync(PENDING_PATH, `${JSON.stringify({
  termIds: [STAGE_TERMS.L2, STAGE_TERMS.L3],
  ready: STAGE_BLOCK_SUPPORT,
  pending: STAGE_PENDING_BLOCKS,
}, null, 2)}\n`, 'utf8')

console.log('已生成 80 关自由舞台关卡：')
console.log(`  迁移 SQL  ${path.relative(ROOT, SQL_PATH)}`)
console.log(`  标准解清单 ${path.relative(ROOT, MANIFEST_PATH)}`)
console.log(`  待办积木  ${path.relative(ROOT, PENDING_PATH)}`)
for (const unit of UNIT_META) {
  const unitLevels = levels.filter((level) => level.unitId === unit.unitId)
  const totalBlocks = unitLevels.reduce((sum, level) => sum + level.blocks, 0)
  console.log(`  ${unit.title.padEnd(9, '　')} ${unitLevels.length} 关，标准解共 ${totalBlocks} 块积木`)
}
