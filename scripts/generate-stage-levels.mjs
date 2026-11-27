/**
 * Blockly 二年级 160 关自由舞台关卡生成器（Level 2 = blk-161…240，Level 3 = blk-241…320）。
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
    levelCap: 40,
    title: '基础移动与变量',
    summary: '从低速少目标开始，逐步加速、加入干扰与扣分，最后完成接取小游戏。',
    knowledgeTags: ['stage', 'move', 'variable', 'score', 'variant'],
  },
  {
    unitId: STAGE_UNITS.L2U2,
    termId: STAGE_TERMS.L2,
    sortOrder: 2,
    levelCap: 40,
    title: '随机节奏与计分',
    summary: '用固定伪随机节奏排布地鼠与障碍，在躲避、接取和扣分中完成综合挑战。',
    knowledgeTags: ['stage', 'collision', 'score', 'lives', 'variant'],
  },
  {
    unitId: STAGE_UNITS.L3U1,
    termId: STAGE_TERMS.L3,
    sortOrder: 1,
    levelCap: 40,
    title: '克隆与子弹变体',
    summary: '从单发克隆到双重火力、三向散弹和定位星星驱动的折线追踪弹。',
    knowledgeTags: ['stage', 'clone', 'projectile', 'spread', 'tracking'],
  },
  {
    unitId: STAGE_UNITS.L3U2,
    termId: STAGE_TERMS.L3,
    sortOrder: 2,
    levelCap: 40,
    title: '塔防与怪物编队',
    summary: '用单怪、重甲怪和多怪重叠编队练习嵌套判断，并让两座塔协同防守。',
    knowledgeTags: ['stage', 'clone', 'tower', 'monster', 'nested'],
  },
]

/**
 * 旧关卡换号表：正式行和占位行都不删，统一归档到 legacy 号段。
 *
 * - 旧 Level 2 正式关 blk-161…200 → blk-811…850
 * - 旧 Level 3 正式关 blk-201…240 → blk-961…1000
 * - 旧 Level 2 占位关 blk-167…175 若仍在旧编号 → blk-817…825
 * - 旧 Level 3 占位关 blk-241…255 → blk-941…955
 *
 * blk-167…175 在旧版正式关卡和旧占位关卡中指向不同单元，因此各有一条映射；
 * 两类行主键相同、不会同时存在，归档后也共用同一个 legacy 编号。
 * 旧版迁移已经生成的 blk-901…909 / blk-941…955 保留不动；新迁移只处理仍停在旧编号上的行。
 */
const RENUMBER = [
  ...Array.from({ length: 80 }, (_, index) => {
    const oldOrder = 161 + index
    const termId = oldOrder <= 200 ? STAGE_TERMS.L2 : STAGE_TERMS.L3
    const termPrefix = oldOrder <= 200 ? 'blk-g2-fall' : 'blk-g2-spring'
    const unitIndex = oldOrder <= 180 || (oldOrder >= 201 && oldOrder <= 220) ? 1 : 2
    const newOrder = oldOrder <= 200 ? oldOrder + 650 : oldOrder + 760
    return {
      oldId: `blk-${String(oldOrder).padStart(3, '0')}`,
      newId: `blk-${String(newOrder).padStart(3, '0')}`,
      oldOrder,
      newOrder,
      termId,
      unitId: `${termPrefix}-u${unitIndex}-legacy`,
      isPlaceholder: false,
    }
  }),
  ...Array.from({ length: 9 }, (_, index) => ({
    oldId: `blk-${String(167 + index).padStart(3, '0')}`,
    newId: `blk-${String(817 + index).padStart(3, '0')}`,
    oldOrder: 167 + index,
    newOrder: 817 + index,
    termId: STAGE_TERMS.L2,
    unitId: `blk-g2-fall-u${Math.floor(index / 3) + 3}-legacy`,
    isPlaceholder: true,
  })),
  ...Array.from({ length: 15 }, (_, index) => ({
    oldId: `blk-${String(241 + index).padStart(3, '0')}`,
    newId: `blk-${String(941 + index).padStart(3, '0')}`,
    oldOrder: 241 + index,
    newOrder: 941 + index,
    termId: STAGE_TERMS.L3,
    unitId: `blk-g2-spring-u${Math.floor(index / 3) + 1}-legacy`,
    isPlaceholder: true,
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
// 参数矩阵：每个单元 4 个梯度 × 10 关，编号和绘本顺延生成
// ---------------------------------------------------------------------------

const VARIANT_NAMES = ['初试', '再来', '加速', '瞄准', '连击', '密集', '灵巧', '挑战', '冲刺']

function milestoneFor(start) {
  if (start === 161) return 'term3_project'
  if (start === 201) return 'term3_master'
  if (start === 241) return 'term4_project'
  return 'term4_master'
}

/** 把 4 组规格展开成 40 关；同一规格永远生成同一关卡。 */
function buildLevelMatrix({ start, unitId, phases, build }) {
  const levels = []
  phases.forEach((phase, gradientIndex) => {
    if (phase.specs.length !== 10) throw new Error(`${phase.title} 必须配置 10 个变体`)
    phase.specs.forEach((spec, index) => {
      const sortOrder = start + levels.length
      const levelId = `blk-${String(sortOrder).padStart(3, '0')}`
      const finalLevel = gradientIndex === phases.length - 1 && index === 9
      levels.push(build({
        ...spec,
        levelId,
        sortOrder,
        unitId,
        gradient: gradientIndex + 1,
        variant: index + 1,
        title: `${phase.title}·${finalLevel ? '完整作品' : VARIANT_NAMES[index]}`,
        levelType: finalLevel ? 'project' : index === 3 || index === 8 ? 'practice' : index === 4 ? 'typing' : 'new',
        tags: [...phase.tags, `gradient-${gradientIndex + 1}`, `variant-${index + 1}`],
        badge: finalLevel ? milestoneFor(start) : null,
        minutes: 15 + gradientIndex * 2 + (index >= 7 ? 2 : 0),
        facts: { ...(spec.facts ?? {}), gradient: gradientIndex + 1, variant: index + 1 },
      }))
    })
  })
  return levels
}

// ---------------------------------------------------------------------------
// Level 2 · 单元 1：基础移动与变量（blk-161 … blk-200）
// ---------------------------------------------------------------------------

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
  const phases = [
    {
      title: '苹果小径',
      tags: ['stage', 'move', 'variable', 'collision'],
      specs: Array.from({ length: 10 }, (_, index) => ({
        count: 2 + Math.floor(index / 4),
        speed: 6 + Math.floor(index / 2),
        fall: 4 + Math.floor(index / 3),
      })),
    },
    {
      title: '星星步道',
      tags: ['stage', 'variable', 'condition', 'nested'],
      specs: Array.from({ length: 10 }, (_, index) => ({
        count: 4 + Math.floor(index / 2),
        speed: 10 + Math.floor(index / 2),
        fall: 5 + Math.floor(index / 3),
      })),
    },
    {
      title: '炸弹间隙',
      tags: ['stage', 'collision', 'score', 'lives'],
      specs: Array.from({ length: 10 }, (_, index) => ({
        hazards: 1 + Math.floor(index / 3),
        avoid: Math.floor(index / 4),
        targets: 5 + Math.floor(index / 2),
        speed: 12 + Math.floor(index / 2),
        fall: 5 + Math.floor(index / 3),
      })),
    },
    {
      title: '果园闯关',
      tags: ['project', 'stage', 'collision', 'score', 'lives'],
      specs: Array.from({ length: 10 }, (_, index) => ({
        hazards: 2 + Math.floor(index / 3),
        avoid: 1 + Math.floor(index / 4),
        targets: 6 + Math.floor(index / 2),
        speed: 14 + Math.floor(index / 2),
        fall: 6 + Math.floor(index / 3),
      })),
    },
  ]

  return buildLevelMatrix({
    start: 161,
    unitId: STAGE_UNITS.L2U1,
    phases,
    build(spec) {
      if (spec.gradient <= 2) {
        const targets = planItems({
          items: Array.from({ length: spec.count }, (_, index) => ({
            id: spec.gradient === 1 ? `apple-${index + 1}` : `prize-${index + 1}`,
            asset: spec.gradient === 1 ? 'apple' : ['apple', 'star', 'gem'][index % 3],
            fallSpeed: spec.fall,
            points: spec.gradient === 2 && index % 3 === 2 ? 2 : 1,
          })),
          x0: PLAYER_X,
          speed: spec.speed,
        })
        const score = targets.reduce((sum, target) => sum + target.points, 0)
        const bonus = targets.filter((target) => target.points > 1).length
        return collectLevel({
          ...spec,
          speed: spec.speed,
          targets,
          targetName: spec.gradient === 1 ? '苹果' : '苹果、星星和宝石',
          backdrop: spec.gradient === 1 ? 'sky' : 'grass',
          facts: { ...spec.facts, bonusTargets: bonus, targetCount: targets.length, scoreTotal: score },
          goalText: spec.gradient === 1
            ? `接住 ${spec.count} 个往下掉的苹果，把 score 加到 ${score}`
            : `接住 ${spec.count} 个奖品，其中 ${bonus} 颗宝石加 2 分，把 score 加到 ${score}`,
          successText: spec.gradient === 1 ? '苹果接住啦！' : '星星宝石全收齐！',
        })
      }

      const hazards = series('bomb', spec.hazards, { asset: 'bomb', fallSpeed: spec.fall, kind: 'hazard' })
      for (const hazard of hazards.slice(-spec.avoid)) hazard.mode = 'avoid'
      const targets = series('prize', spec.targets, { asset: 'apple', kind: 'coin' })
      targets.forEach((target, index) => { target.asset = index % 2 ? 'mole' : 'apple' })
      const items = planItems({
        items: interleave(hazards, targets),
        x0: PLAYER_X,
        speed: spec.speed,
      })
      const hits = spec.hazards - spec.avoid
      return dodgeLevel({
        ...spec,
        speed: spec.speed,
        items,
        lives: 3,
        goalX: spec.gradient === 4 ? goalAtFinishLine() : null,
        backdrop: spec.gradient === 4 ? 'city' : 'sky',
        facts: { ...spec.facts, targetName: '苹果和地鼠', avoidHazards: spec.avoid },
        goalText: `接住 ${spec.targets} 个苹果或地鼠，撞到 ${hits} 次炸弹，lives 剩 ${3 - hits}${spec.gradient === 4 ? '，再踩到终点旗' : ''}`,
        successText: spec.gradient === 4 ? '果园综合挑战完成！' : '干扰与扣分处理成功！',
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Level 2 · 单元 2：随机节奏与计分（blk-201 … blk-240）
// ---------------------------------------------------------------------------

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
  const phases = [
    {
      title: '地鼠排雷',
      tags: ['stage', 'collision', 'lives', 'score'],
      specs: Array.from({ length: 10 }, (_, index) => ({
        count: 2 + Math.floor(index / 4),
        speed: 6 + Math.floor(index / 2),
        fall: 4 + Math.floor(index / 3),
        lives: 5,
      })),
    },
    {
      title: '闪避加速',
      tags: ['stage', 'collision', 'lives', 'speed'],
      specs: Array.from({ length: 10 }, (_, index) => {
        const count = 4 + Math.floor(index / 3)
        return { count, avoid: count - 2, speed: 10 + Math.floor(index / 2), fall: 5 + Math.floor(index / 3), lives: 3 }
      }),
    },
    {
      title: '接取混编',
      tags: ['stage', 'collision', 'score', 'lives'],
      specs: Array.from({ length: 10 }, (_, index) => {
        const bombs = 4 + Math.floor(index / 3)
        return { bombs, avoid: bombs - 2, targets: 4 + Math.floor(index / 2), speed: 12 + Math.floor(index / 2), fall: 6 + Math.floor(index / 3), lives: 3 }
      }),
    },
    {
      title: '跑酷收官',
      tags: ['project', 'stage', 'collision', 'score', 'lives'],
      specs: Array.from({ length: 10 }, (_, index) => {
        const bombs = 5 + Math.floor(index / 3)
        return { bombs, avoid: bombs - 2, targets: 6 + Math.floor(index / 2), speed: 14 + Math.floor(index / 2), fall: 6 + Math.floor(index / 3), lives: 3 }
      }),
    },
  ]

  return buildLevelMatrix({
    start: 201,
    unitId: STAGE_UNITS.L2U2,
    phases,
    build(spec) {
      const hazards = series('bomb', spec.count ?? spec.bombs, { asset: 'bomb', fallSpeed: spec.fall, kind: 'hazard' })
      for (const hazard of hazards.slice(-(spec.avoid ?? 0))) hazard.mode = 'avoid'
      const targets = spec.targets
        ? series('target', spec.targets, { asset: 'coin', kind: 'coin' })
        : []
      targets.forEach((target, index) => { target.asset = ['coin', 'mole', 'apple'][index % 3] })
      const items = planItems({
        items: targets.length ? interleave(hazards, targets) : hazards,
        x0: PLAYER_X,
        speed: spec.speed,
      })
      const hits = hazards.length - (spec.avoid ?? 0)
      const withTargets = targets.length > 0
      return dodgeLevel({
        ...spec,
        speed: spec.speed,
        items,
        lives: spec.lives,
        goalX: spec.gradient === 4 || (spec.gradient === 3 && spec.variant >= 8) ? goalAtFinishLine() : null,
        backdrop: spec.gradient >= 3 ? 'city' : 'sky',
        facts: { ...spec.facts, targetName: withTargets ? '金币、地鼠和苹果' : '障碍', avoidHazards: spec.avoid ?? 0 },
        goalText: withTargets
          ? `接住 ${targets.length} 个目标，撞到 ${hits} 次炸弹，lives 剩 ${spec.lives - hits}${spec.gradient === 4 || spec.variant >= 8 ? '，再踩到终点旗' : ''}`
          : `撞到 ${hits} 次炸弹，lives 从 ${spec.lives} 扣到 ${spec.lives - hits}`,
        successText: spec.gradient === 4 ? '跑酷综合项目完成！' : '躲避与计分成功！',
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Level 3 · 单元 1：克隆与子弹变体（blk-241 … blk-280）
// ---------------------------------------------------------------------------

/** 直线弹的敌人 x 对齐飞船的一次发射位置。 */
function planEnemies({ count, x0, speed, ys, prefix = 'enemy' }) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    x: x0 + speed * (3 + index * 2),
    y: ys[index % ys.length],
  }))
}

const SPREAD_LANES = [
  { direction: 315, offset: 1 },
  { direction: 0, offset: 2 },
  { direction: 45, offset: 3 },
]

/** 左、中、右三路子弹各取一条真实弹道上的敌人。 */
function planSpreadEnemies({ count, x0, shipSpeed, bulletSpeed }) {
  return Array.from({ length: count }, (_, index) => {
    const cycle = Math.floor(index / 3)
    const lane = SPREAD_LANES[index % 3]
    const spawnTick = cycle * 3 + lane.offset - 1
    // 首轮左散弹从 x = 40 出发，travel = 8 会落到舞台外；6 格仍留足碰撞距离。
    const travel = 6 + cycle * 2
    const radians = lane.direction * Math.PI / 180
    return {
      id: `spread-enemy-${index + 1}`,
      x: Math.round(x0 + shipSpeed * spawnTick + Math.sin(radians) * bulletSpeed * travel),
      y: Math.round(PLAYER_Y - Math.cos(radians) * bulletSpeed * travel),
    }
  })
}

/**
 * 定位星星 + 二级克隆组成折线追踪弹。
 * 父弹竖直向上，碰星星后从当前位置克隆一颗朝对应敌人转向的子弹。
 */
function planTrackingEnemies({ count, x0, shipSpeed, seekerSpeed = 8 }) {
  const enemies = []
  const guides = []
  for (let index = 0; index < count; index += 1) {
    const guideX = x0 + shipSpeed * (3 + index)
    const direction = index % 2 ? 30 : 330
    const radians = direction * Math.PI / 180
    const travel = 10 + Math.floor(index / 3) * 2
    const enemyId = `track-enemy-${index + 1}`
    enemies.push({
      id: enemyId,
      x: Math.round(guideX + Math.sin(radians) * seekerSpeed * travel),
      y: Math.round(264 - Math.cos(radians) * seekerSpeed * travel),
    })
    guides.push({
      id: `guide-${index + 1}`,
      x: guideX,
      y: 250,
      enemyId,
      templateId: direction === 30 ? 'seeker-right' : 'seeker-left',
      speed: seekerSpeed,
    })
  }
  return { enemies, guides }
}
/** 重叠怪物只在最外层计分，内层怪物负责嵌套判断。 */
function enemyScoreTotal(enemies) {
  const innerIds = new Set(enemies.map((enemy) => enemy.pair).filter(Boolean))
  return enemies.reduce((sum, enemy) => sum + (innerIds.has(enemy.id) ? 0 : (enemy.points ?? 1)), 0)
}

function makeEnemyCheck(enemy, byId, points = enemy.points ?? 1) {
  const action = points > 1 ? rep(points, [changeVar('score', 1)]) : changeVar('score', 1)
  if (!enemy.pair) return ifTouch(enemy.id, [action])
  const inner = byId.get(enemy.pair)
  if (!inner) throw new Error(`${enemy.id} 引用了不存在的配对怪物 ${enemy.pair}`)
  return ifTouch(enemy.id, [makeEnemyCheck(inner, byId, points)])
}

/**
 * 克隆关：飞船、散弹、折线追踪弹和塔防都复用这一套生产积木。
 *
 * tracking 模板先笔直向上飞，碰到定位星星后从当前位置克隆一颗
 * 预先朝向该敌人的转向弹；不需要新增方向传感或随机积木。
 */
function cloneLevel({
  levelId, sortOrder, unitId, title, levelType, tags, badge, minutes,
  x0 = PLAYER_X, shipSpeed, bulletSpeed, enemies, templates, goalX = null, backdrop = 'night',
  hazards = [], guides = [], helper = null, helperTemplateId = null, firing = 'parallel', lives = 3,
  facts, goalText, successText,
}) {
  const enemyById = new Map(enemies.map((enemy) => [enemy.id, enemy]))
  const innerIds = new Set(enemies.map((enemy) => enemy.pair).filter(Boolean))
  const outerEnemies = enemies.filter((enemy) => !innerIds.has(enemy.id))
  const scoreTotal = enemyScoreTotal(enemies)
  const makeEnemyChecks = () => outerEnemies.map((enemy) => makeEnemyCheck(enemy, enemyById))
  const firedTemplates = templates.filter((template) => template.fired !== false)
  const hits = hazards.filter((hazard) => hazard.mode !== 'avoid').length

  const sceneSprites = [
    playerSprite(x0, 'ship'),
    ...enemies.map((enemy) => sprite({
      id: enemy.id, asset: enemy.asset ?? 'enemy', x: enemy.x, y: enemy.y,
      direction: 0, size: enemy.size ?? 100, collectible: true,
    })),
    ...hazards.map((hazard) => sprite({
      id: hazard.id, asset: hazard.asset, x: hazard.x, y: hazard.y,
      direction: hazard.fallSpeed ? 180 : 90, size: hazard.size ?? 100, collectible: true,
    })),
    ...guides.map((guide) => sprite({
      id: guide.id, asset: guide.asset ?? 'star', x: guide.x, y: guide.y,
      direction: 0, size: guide.size ?? 60, collectible: true,
    })),
  ]
  if (helper) {
    sceneSprites.push(sprite({
      id: helper.id, asset: helper.asset, x: helper.x, y: helper.y, direction: 90, size: helper.size ?? 100,
    }))
  }
  if (goalX !== null) sceneSprites.push(goalSprite(goalX))

  const projectileBody = (template) => {
    if (template.behavior === 'tracker') {
      return forever([
        move(template.speed ?? bulletSpeed),
        ...guides.map((guide) => ifTouch(guide.id, [
          cloneBlock(guide.templateId, [
            forever([move(guide.speed), ifTouch(guide.enemyId, [changeVar('score', 1)])]),
          ]),
        ])),
      ])
    }
    return forever([move(template.speed ?? bulletSpeed), ...makeEnemyChecks()])
  }

  const solutions = [chain([
    ...(hazards.length ? [setVar('lives', lives)] : []),
    setVar('score', 0),
    forever([move(shipSpeed), ...hazards.map((hazard) => ifTouch(hazard.id, [changeVar('lives', -1)]))]),
  ])]
  if (firing === 'spread') {
    solutions.push(forever(firedTemplates.map((template) => cloneBlock(template.id, [projectileBody(template)]))))
  } else {
    for (const template of firedTemplates) {
      solutions.push(forever([cloneBlock(template.id, [projectileBody(template)])]))
    }
  }

  const conditions = [
    { type: 'variable_value', variable_id: 'score', op: '==', value: scoreTotal },
    ...enemies.map((enemy) => ({ type: 'sprite_hidden', sprite_id: enemy.id })),
  ]
  if (hazards.length) {
    conditions.push({ type: 'variable_value', variable_id: 'lives', op: '==', value: lives - hits })
  }
  if (goalX !== null) conditions.push({ type: 'sprite_at', sprite_id: 'player', x: goalX, y: PLAYER_Y })

  const initialScripts = hazards.filter((hazard) => hazard.fallSpeed).map(fallingScript)
  if (helper && helperTemplateId) {
    initialScripts.push(initialScript({
      id: `${helper.id}-fire`,
      targetSpriteId: helper.id,
      block: forever([
        ...(helper.speed ? [move(helper.speed)] : []),
        cloneBlock(helperTemplateId, [forever([move(helper.bulletSpeed ?? bulletSpeed), ...makeEnemyChecks()])]),
      ]),
    }))
  }

  const scene = stageScene({
    backdrop,
    sprites: sceneSprites,
    clones: templates.map((template) => cloneTemplate({
      id: template.id,
      asset: template.asset,
      spawn: { x: 'self', y: 'self' },
      direction: template.direction ?? 0,
      lifetimeSteps: template.lifetime,
      size: template.size ?? 50,
    })),
    variables: hazards.length ? [variable('lives', lives), variable('score', 0)] : [variable('score', 0)],
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
      kind: 'clone',
      enemyCount: enemies.length,
      enemyScore: scoreTotal,
      cloneCount: firedTemplates.length,
      cloneTemplateCount: templates.length,
      shotPattern: firing,
      speed: shipSpeed,
      hazardCount: hazards.length,
      hazardHits: hits,
      lives: hazards.length ? lives : 0,
      helper: Boolean(helper),
      ...facts,
    },
    solution: solutions,
    body: buildBody({
      scene,
      blocks: stageBlocks({
        variables: hazards.length ? ['lives', 'score'] : ['score'],
        spriteOptions: touchOptions([...enemies, ...hazards, ...guides]),
        cloneOptions: templates.map((template) => ({ value: template.id, label: template.label ?? template.id })),
        withRepeat: enemies.some((enemy) => (enemy.points ?? 1) > 1),
      }),
      maxBlocks: countBlocks(solutions) + 4,
      maxSteps: 360,
      successCheck: { type: 'all', conditions },
      successText: successText ?? '打中啦！',
    }),
  }
}

function l3u1Levels() {
  const phases = [
    {
      title: '单发航道',
      tags: ['stage', 'clone', 'collision'],
      specs: Array.from({ length: 10 }, (_, index) => ({
        pattern: 'straight', count: 1 + Math.floor(index / 2), speed: 8 + Math.floor(index / 2), bullet: 6 + Math.floor(index / 3),
      })),
    },
    {
      title: '双重火力',
      tags: ['stage', 'clone', 'loop', 'collision'],
      specs: Array.from({ length: 10 }, (_, index) => ({
        pattern: 'twin', count: 3 + Math.floor(index / 2), speed: 10 + Math.floor(index / 2), bullet: 8 + Math.floor(index / 3),
      })),
    },
    {
      title: '三向散弹',
      tags: ['stage', 'clone', 'spread', 'concurrency'],
      specs: Array.from({ length: 10 }, (_, index) => ({
        pattern: 'spread', count: 4 + Math.floor(index / 2), speed: 10 + Math.floor(index / 2), bullet: 8,
      })),
    },
    {
      title: '追踪决战',
      tags: ['project', 'stage', 'clone', 'tracking', 'spread'],
      specs: Array.from({ length: 10 }, (_, index) => ({
        pattern: index < 5 ? 'tracking' : 'mixed',
        speed: 10 + index,
        bullet: 8,
        trackingCount: index < 5 ? 4 + index : 3,
        spreadCount: index < 5 ? 0 : 3 + index - 5,
      })),
    },
  ]

  return buildLevelMatrix({
    start: 241,
    unitId: STAGE_UNITS.L3U1,
    phases,
    build(spec) {
      let enemies = []
      let guides = []
      let templates = []
      let firing = 'parallel'
      if (spec.pattern === 'straight' || spec.pattern === 'twin') {
        enemies = planEnemies({
          count: spec.count, x0: PLAYER_X, speed: spec.speed, ys: [200, 140, 250, 170, 110],
        })
        templates = [{ id: 'bullet', asset: 'bullet', label: '子弹', lifetime: 45, size: 50, speed: spec.bullet }]
        if (spec.pattern === 'twin') {
          templates.push({ id: 'shell', asset: 'bomb', label: '炮弹', lifetime: 60, size: 60, speed: spec.bullet + 2 })
        }
      } else if (spec.pattern === 'spread') {
        enemies = planSpreadEnemies({ count: spec.count, x0: PLAYER_X, shipSpeed: spec.speed, bulletSpeed: spec.bullet })
        templates = [
          { id: 'spread-left', asset: 'bullet', label: '左散弹', direction: 315, lifetime: 55, size: 50, speed: spec.bullet },
          { id: 'spread-center', asset: 'bullet', label: '中散弹', direction: 0, lifetime: 55, size: 50, speed: spec.bullet },
          { id: 'spread-right', asset: 'bullet', label: '右散弹', direction: 45, lifetime: 55, size: 50, speed: spec.bullet },
        ]
        firing = 'spread'
      } else {
        const tracked = planTrackingEnemies({
          count: spec.trackingCount, x0: PLAYER_X, shipSpeed: spec.speed, seekerSpeed: spec.bullet,
        })
        enemies = tracked.enemies
        guides = tracked.guides
        templates = [
          { id: 'tracker', asset: 'bullet', label: '追踪父弹', direction: 0, lifetime: 55, size: 50, speed: 6, behavior: 'tracker' },
          { id: 'seeker-left', asset: 'bullet', label: '左转向弹', direction: 330, lifetime: 45, size: 50, speed: spec.bullet, fired: false },
          { id: 'seeker-right', asset: 'bullet', label: '右转向弹', direction: 30, lifetime: 45, size: 50, speed: spec.bullet, fired: false },
        ]
        if (spec.pattern === 'mixed') {
          enemies = [
            ...planSpreadEnemies({ count: spec.spreadCount, x0: PLAYER_X, shipSpeed: spec.speed, bulletSpeed: spec.bullet }),
            ...enemies,
          ]
          templates = [
            { id: 'spread-left', asset: 'bullet', label: '左散弹', direction: 315, lifetime: 55, size: 50, speed: spec.bullet },
            { id: 'spread-center', asset: 'bullet', label: '中散弹', direction: 0, lifetime: 55, size: 50, speed: spec.bullet },
            { id: 'spread-right', asset: 'bullet', label: '右散弹', direction: 45, lifetime: 55, size: 50, speed: spec.bullet },
            ...templates,
          ]
          firing = 'spread'
        }
      }

      const goalX = spec.gradient === 4 ? goalAtFinishLine() : null
      const goalText = spec.pattern === 'spread'
        ? `在同一轮发射中克隆左、中、右三路散弹，打中 ${enemies.length} 个敌人`
        : spec.pattern === 'tracking'
          ? `释放追踪父弹，碰到定位星星后克隆转向弹，打中 ${enemies.length} 个敌人`
          : spec.pattern === 'mixed'
            ? `组合三向散弹和折线追踪弹，打中 ${enemies.length} 个敌人，再飞到终点旗`
            : `用${spec.pattern === 'twin' ? '两种' : ''}克隆火力打中 ${enemies.length} 个敌人，把 score 加到 ${enemies.length}`
      return cloneLevel({
        ...spec,
        shipSpeed: spec.speed,
        bulletSpeed: spec.bullet,
        enemies,
        templates,
        guides,
        firing,
        goalX,
        facts: {
          ...spec.facts,
          pattern: spec.pattern,
          spreadDirections: spec.pattern === 'spread' || spec.pattern === 'mixed' ? [315, 0, 45] : [],
          trackingGuides: guides.length,
        },
        goalText: `${goalText}${goalX !== null && spec.pattern !== 'mixed' ? '，再飞到终点旗' : ''}`,
        successText: spec.pattern === 'tracking' || spec.pattern === 'mixed' ? '追踪与散弹项目完成！' : '子弹全部命中！',
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Level 3 · 单元 2：塔防与怪物编队（blk-281 … blk-320）
// ---------------------------------------------------------------------------

const TOWER_YS = [170, 230, 120, 260, 90, 200, 140, 250, 110]

function towerGroupSize(mode, index) {
  if (mode === 'single') return 1
  if (mode === 'pair') return index % 2 ? 2 : 1
  if (mode === 'mixed') return [1, 2, 3][index % 3]
  return [2, 3][index % 2]
}

/**
 * 塔防编队：每组怪物共用一条真实弹道，组内重叠并通过 pair 链嵌套判断。
 * 外层重甲怪负责整组计分，内层怪物被同一颗子弹连续收集。
 */
function planTowerMonsters({ groups, speed, mode, ys = TOWER_YS }) {
  const enemies = []
  for (let groupIndex = 0; groupIndex < groups; groupIndex += 1) {
    const size = towerGroupSize(mode, groupIndex)
    const x = PLAYER_X + speed * (3 + groupIndex * 2)
    const y = ys[groupIndex % ys.length]
    for (let layer = 0; layer < size; layer += 1) {
      const id = layer === 0
        ? `tower-${groupIndex + 1}-outer`
        : `tower-${groupIndex + 1}-inner-${layer}`
      enemies.push({
        id,
        asset: layer === 0 && size > 1 ? 'rock' : 'enemy',
        x,
        y,
        pair: layer < size - 1 ? `tower-${groupIndex + 1}-inner-${layer + 1}` : null,
        points: layer === 0 && size > 1 && mode === 'pair' && groupIndex % 2 ? 2 : 1,
      })
    }
  }
  return enemies
}

function l3u2Levels() {
  const phases = [
    {
      title: '单怪阵列',
      tags: ['stage', 'clone', 'tower', 'collision'],
      specs: Array.from({ length: 10 }, (_, index) => ({
        mode: 'single', groups: 1 + Math.floor(index / 2), speed: 8 + Math.floor(index / 2), bullet: 6 + Math.floor(index / 3),
      })),
    },
    {
      title: '重甲编队',
      tags: ['stage', 'clone', 'tower', 'nested'],
      specs: Array.from({ length: 10 }, (_, index) => ({
        mode: 'pair', groups: 3 + Math.floor(index / 2), speed: 10 + Math.floor(index / 2), bullet: 7 + Math.floor(index / 3),
      })),
    },
    {
      title: '协同防守',
      tags: ['stage', 'clone', 'tower', 'helper', 'lives'],
      specs: Array.from({ length: 10 }, (_, index) => ({
        mode: 'mixed', groups: 4 + Math.floor(index / 2), speed: 12 + Math.floor(index / 2), bullet: 8,
        hazards: 1 + Math.floor(index / 3), avoid: Math.floor(index / 4), helper: true, lives: 5,
      })),
    },
    {
      title: '塔防决战',
      tags: ['project', 'stage', 'clone', 'tower', 'helper', 'lives'],
      specs: Array.from({ length: 10 }, (_, index) => ({
        mode: 'swarm', groups: 5 + Math.floor(index / 2), speed: 14 + Math.floor(index / 2), bullet: 9,
        hazards: 2 + Math.floor(index / 3), avoid: 1 + Math.floor(index / 4), helper: true, lives: 5,
      })),
    },
  ]

  return buildLevelMatrix({
    start: 281,
    unitId: STAGE_UNITS.L3U2,
    phases,
    build(spec) {
      const enemies = planTowerMonsters(spec)
      const templates = [{ id: 'bullet', asset: 'bullet', label: '防守子弹', lifetime: 55, size: 50, speed: spec.bullet }]
      let helper = null
      let helperTemplateId = null
      if (spec.helper) {
        helper = { id: 'bee-tower', asset: 'bee', x: PLAYER_X + spec.speed * 3, y: PLAYER_Y, speed: 0, bulletSpeed: spec.bullet + 2 }
        helperTemplateId = 'helper-shell'
        templates.push({ id: helperTemplateId, asset: 'bomb', label: '蜜蜂塔炮弹', lifetime: 60, size: 60, speed: spec.bullet + 2 })
      }

      const hazards = series('tower-hazard', spec.hazards ?? 0, { asset: 'bomb', fallSpeed: 6, kind: 'hazard' })
      hazards.forEach((hazard, index) => { hazard.asset = index % 2 ? 'ghost' : 'bomb' })
      for (const hazard of hazards.slice(-(spec.avoid ?? 0))) hazard.mode = 'avoid'
      const plannedHazards = planItems({ items: hazards, x0: PLAYER_X, speed: spec.speed })
      const hits = hazards.length - (spec.avoid ?? 0)
      const score = enemyScoreTotal(enemies)
      const monsterMix = { single: 0, pair: 0, triple: 0, armored: 0 }
      for (let group = 0; group < spec.groups; group += 1) {
        const size = towerGroupSize(spec.mode, group)
        if (size === 1) monsterMix.single += 1
        else if (size === 2) monsterMix.pair += 1
        else monsterMix.triple += 1
        if (size > 1) monsterMix.armored += 1
      }
      const mixText = `${monsterMix.single} 组单怪、${monsterMix.pair} 组双怪、${monsterMix.triple} 组三怪`
      const goalX = spec.gradient === 4 ? goalAtFinishLine() : null

      return cloneLevel({
        ...spec,
        shipSpeed: spec.speed,
        bulletSpeed: spec.bullet,
        enemies,
        templates,
        hazards: plannedHazards,
        helper,
        helperTemplateId,
        lives: spec.lives ?? 3,
        goalX,
        backdrop: spec.gradient >= 3 ? 'city' : 'night',
        facts: {
          ...spec.facts,
          kind: 'tower',
          pattern: 'tower',
          monsterGroups: spec.groups,
          monsterMix,
        },
        goalText: `守住塔防：${mixText}，把 score 加到 ${score}${spec.helper ? '，蜜蜂塔与你同时开火' : ''}${hazards.length ? `，撞到 ${hits} 个障碍` : ''}${goalX !== null ? '，再飞到终点旗' : ''}`,
        successText: spec.gradient === 4 ? '塔防综合项目完成！' : '怪物编队清理成功！',
      })
    },
  })
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

/** 每个单元 40 关：每 5 关安排一次练习/打字，最后一关是项目。 */
function levelTypeOf(_unitIndex, indexInUnit) {
  if (indexInUnit === 39) return 'project'
  const phase = indexInUnit % 5
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
-- 旧编号已在步骤 3 归档；on conflict 用于重跑时更新新正文，不存在时则新建。
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
  const remapValues = RENUMBER.map((row) =>
    `    (${sqlString(row.oldId)}, ${sqlString(row.newId)}, ${row.oldOrder}, ${row.newOrder}, ${sqlString(row.termId)}, ${sqlString(row.unitId)}, ${row.isPlaceholder ? 'true' : 'false'})`,
  ).join(',\n')
  parts.push(`-- Blockly 二年级 160 关自由舞台（blk-161 … blk-320），一次迁移落库。
--
-- 这个文件由 scripts/generate-stage-levels.mjs 生成，不要手工改：
--   npx tsx scripts/generate-stage-levels.mjs
-- 生成器用生产解析器和生产解释器把每关的标准解跑通一遍才写进来。
--
-- 迁移分五步：
--   1. 两个学期的容量和简介改成 16 周、80 课。
--   2. 单元：Level 2 的 u1…u5 和 Level 3 的 u1…u5 全部改成 -legacy，
--      新的 u1/u2 重新占 1、2 号。
--   3. 旧正式关卡归档：Level 2 blk-161…200 → blk-811…850，
--      Level 3 blk-201…240 → blk-961…1000；旧占位 blk-167…175 → blk-817…825，
--      旧 Level 3 占位 blk-241…255 → blk-941…955。
--   4. learning_record 同步迁到 legacy 编号；目标冲突时合并旧进度并重置新编号记录。
--   5. 写入 160 关正文。
--
-- Neon 跨语句没有事务，每条语句都写成幂等的固定值，重跑即可。
-- 迁移前请确认已经备份；本文件不执行任何 delete。
`)

  parts.push(`-- 1. 学期容量
update public.module_term
set
  weeks = 16,
  level_cap = 80,
  summary = case term_id
    when 'blk-g2-fall' then '自由舞台第一学期：舞台移动、变量计分、躲避危险。完成 2 个小游戏。'
    else '自由舞台第二学期：克隆、多角色协作、复杂条件。完成 1 个大游戏。'
  end,
  updated_at = now()
where module_id = 'blockly'
  and term_id in ('blk-g2-fall', 'blk-g2-spring');`)

  parts.push(`-- 2. 单元
--
-- 旧的 Level 2 u1…u5 和 Level 3 u1…u5 都不能删（表上有 forbid_business_delete 触发器），
-- 只能改成 -legacy 编号。父子表改号都会触发即时外键检查，因此放进单个 DO 原子块：
-- 先临时移除外键，父子表都改完后立即重加并校验；块内失败会整体回滚。
-- legacy 父单元不存在时改号并迁移全部子记录；已存在时保留新父单元，
-- 只把仍挂旧父单元、且归档目标尚不存在的旧行迁到 legacy，重跑不会误伤新关卡。
do $$
declare
  v_unit record;
  v_legacy_id text;
  v_legacy_order integer;
begin
  alter table public.module_level drop constraint if exists module_level_unit_fk;

  for v_unit in
    select module_id, unit_id, term_id, sort_order
    from public.module_unit
    where module_id = 'blockly'
      and unit_id in (
        'blk-g2-fall-u1', 'blk-g2-fall-u2', 'blk-g2-fall-u3', 'blk-g2-fall-u4', 'blk-g2-fall-u5',
        'blk-g2-spring-u1', 'blk-g2-spring-u2', 'blk-g2-spring-u3', 'blk-g2-spring-u4', 'blk-g2-spring-u5'
      )
    order by term_id, sort_order
  loop
    v_legacy_id := v_unit.unit_id || '-legacy';
    v_legacy_order := 90 + right(v_unit.unit_id, 1)::integer;

    if not exists (
      select 1 from public.module_unit legacy
      where legacy.module_id = v_unit.module_id
        and legacy.unit_id = v_legacy_id
    ) then
      update public.module_unit
      set unit_id = v_legacy_id,
          sort_order = v_legacy_order,
          updated_at = now()
      where module_id = v_unit.module_id
        and unit_id = v_unit.unit_id;

      update public.module_level
      set unit_id = v_legacy_id,
          updated_at = now()
      where module_id = v_unit.module_id
        and unit_id = v_unit.unit_id;
    else
      update public.module_level as child
      set unit_id = v_legacy_id,
          updated_at = now()
      where child.module_id = v_unit.module_id
        and child.unit_id = v_unit.unit_id
        and child.term_id = v_unit.term_id
        and child.level_id between 'blk-161' and 'blk-255'
        and not exists (
          select 1 from public.module_level archived
          where archived.module_id = child.module_id
            and archived.level_id = case
              when child.level_id between 'blk-161' and 'blk-200'
                then 'blk-' || lpad((substring(child.level_id from 5)::integer + 650)::text, 3, '0')
              when child.level_id between 'blk-201' and 'blk-240'
                then 'blk-' || lpad((substring(child.level_id from 5)::integer + 760)::text, 3, '0')
              else 'blk-' || lpad((substring(child.level_id from 5)::integer + 700)::text, 3, '0')
            end
        );
    end if;
  end loop;

  update public.module_unit
  set sort_order = case unit_id
        when 'blk-g2-fall-u1-legacy' then 91
        when 'blk-g2-fall-u2-legacy' then 92
        when 'blk-g2-fall-u3-legacy' then 93
        when 'blk-g2-fall-u4-legacy' then 94
        when 'blk-g2-fall-u5-legacy' then 95
        when 'blk-g2-spring-u1-legacy' then 91
        when 'blk-g2-spring-u2-legacy' then 92
        when 'blk-g2-spring-u3-legacy' then 93
        when 'blk-g2-spring-u4-legacy' then 94
        when 'blk-g2-spring-u5-legacy' then 95
      end,
    updated_at = now()
  where module_id = 'blockly'
    and unit_id in (
      'blk-g2-fall-u1-legacy', 'blk-g2-fall-u2-legacy', 'blk-g2-fall-u3-legacy', 'blk-g2-fall-u4-legacy', 'blk-g2-fall-u5-legacy',
      'blk-g2-spring-u1-legacy', 'blk-g2-spring-u2-legacy', 'blk-g2-spring-u3-legacy', 'blk-g2-spring-u4-legacy', 'blk-g2-spring-u5-legacy'
    );

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

  parts.push(`-- 3. 旧正式关卡与占位关卡归档（先挪到临时号段，再换 legacy 号段）
--
-- sort_order 上有唯一约束 (module_id, sort_order)，整个换号过程放进单个 DO 原子块。
-- 只迁移仍挂在 legacy 单元、且目标编号尚不存在的旧行；重跑时新舞台关卡挂在新单元，不会误挪。
-- 归档行保留正文和 is_placeholder，但 published 改为 false，课程地图不再展示旧内容。
do $$
declare
  r record;
begin
  for r in
    select * from (values
${remapValues}
    ) as remap(old_id, new_id, old_order, new_order, term_id, unit_id, is_placeholder)
  loop
    if exists (
      select 1 from public.module_level source
      where source.module_id = 'blockly'
        and source.level_id = r.old_id
        and source.term_id = r.term_id
        and source.unit_id = r.unit_id
        and source.is_placeholder = r.is_placeholder
    ) then
      if exists (
        select 1 from public.module_level target
        where target.module_id = 'blockly'
          and target.level_id = r.new_id
      ) then
        raise exception '旧关卡归档目标已存在：% → %', r.old_id, r.new_id;
      end if;

      if exists (
        select 1 from public.module_level occupied
        where occupied.module_id = 'blockly'
          and occupied.sort_order in (r.new_order, r.new_order + 10000)
      ) then
        raise exception '旧关卡归档序号被占用：% → %', r.old_id, r.new_id;
      end if;

      update public.module_level
      set sort_order = r.new_order + 10000,
          updated_at = now()
      where module_id = 'blockly'
        and level_id = r.old_id
        and term_id = r.term_id
        and unit_id = r.unit_id;

      update public.module_level
      set level_id = r.new_id,
          sort_order = r.new_order,
          unit_id = r.unit_id,
          published = false,
          updated_at = now()
      where module_id = 'blockly'
        and level_id = r.old_id
        and sort_order = r.new_order + 10000
        and term_id = r.term_id
        and unit_id = r.unit_id;
    end if;
  end loop;
end $$;`)

  parts.push(`-- 4. 学习记录同步迁到 legacy 编号，旧进度不丢且不污染新关卡
--
-- learning_record 的主键是 (student_id, level_id)，不能直接删除冲突行。
-- 目标记录不存在时直接换号；目标已存在时把旧记录合并进 legacy 记录，再把旧编号重置为未完成，
-- 这样随后写入的新关卡不会继承旧完成状态。整个处理在单个 DO 块内，失败可整体回滚。
do $$
declare
  src record;
begin
  for src in
    select distinct on (lr.student_id, lr.level_id) lr.*, r.new_id
    from public.learning_record lr
    join (values
${remapValues}
    ) as r(old_id, new_id, old_order, new_order, term_id, unit_id, is_placeholder) on r.old_id = lr.level_id
    where lr.module_id = 'blockly'
      and not exists (
        select 1 from public.module_level source
        where source.module_id = 'blockly'
          and source.level_id = r.old_id
      )
      and exists (
        select 1 from public.module_level target
        where target.module_id = 'blockly'
          and target.level_id = r.new_id
          and target.term_id = r.term_id
          and target.unit_id = r.unit_id
          and target.is_placeholder = r.is_placeholder
          and target.published = false
      )
    order by lr.student_id, lr.level_id
  loop
    if exists (
      select 1 from public.learning_record collision
      where collision.student_id = src.student_id
        and collision.level_id = src.new_id
    ) then
      if not exists (
        select 1 from public.learning_record target
        where target.student_id = src.student_id
          and target.level_id = src.new_id
          and target.module_id = 'blockly'
      ) then
        raise exception '学习记录归档目标被其他模块占用：学生 %，% → %', src.student_id, src.level_id, src.new_id;
      end if;

      update public.learning_record target
      set completed = target.completed or source.completed,
          stars = greatest(target.stars, source.stars),
          change_done = target.change_done or source.change_done,
          error_taps = target.error_taps + source.error_taps,
          runs = target.runs + source.runs,
          bonus_completed = target.bonus_completed or source.bonus_completed,
          bonus_reward = coalesce(target.bonus_reward, source.bonus_reward),
          drill_reps = target.drill_reps + source.drill_reps,
          drill_chunk = coalesce(target.drill_chunk, source.drill_chunk),
          updated_at = greatest(target.updated_at, source.updated_at)
      from public.learning_record source
      where target.student_id = src.student_id
        and target.level_id = src.new_id
        and target.module_id = 'blockly'
        and source.student_id = src.student_id
        and source.level_id = src.level_id
        and source.module_id = 'blockly';

      update public.learning_record
      set completed = false,
          stars = 0,
          change_done = false,
          error_taps = 0,
          runs = 0,
          bonus_completed = false,
          bonus_reward = null,
          drill_reps = 0,
          drill_chunk = null,
          updated_at = now()
      where student_id = src.student_id
        and level_id = src.level_id
        and module_id = 'blockly';
    else
      update public.learning_record
      set level_id = src.new_id
      where student_id = src.student_id
        and level_id = src.level_id
        and module_id = 'blockly';
    end if;
  end loop;
end $$;`)

  parts.push(`-- 5. 二年级 160 关正文
--
-- workspace.max_blocks 的语义是「工作区积木总数（含嵌套子块）」。
-- 舞台关卡卡得比较紧：写不出「无限循环 + 如果碰到」的关卡过不了。
-- runtime.max_steps 是舞台能跑的 Tick 数上限，写错了不会一直空转。`)
  parts.push(levels.map((level) => levelSql(level)).join('\n\n'))

  parts.push(`-- 验收 SQL（迁移后逐条跑）
--
-- A. 二年级两个学期各 80 关公开正文，旧归档行不混进课程地图
-- select term_id, count(*) from public.module_level
-- where module_id = 'blockly' and published = true and is_placeholder = false
--   and term_id in ('blk-g2-fall', 'blk-g2-spring')
-- group by term_id;
--
-- B. 新编号连续，场景类型都是 stage
-- select term_id, min(sort_order), max(sort_order), count(*)
-- from public.module_level where module_id = 'blockly'
--   and published = true and is_placeholder = false
--   and term_id in ('blk-g2-fall', 'blk-g2-spring')
-- group by term_id order by min(sort_order);
--
-- C. 旧正式关卡保留正文但已取消公开（存在旧正式数据时，两个号段合计 80 行）
-- select count(*) from public.module_level
-- where module_id = 'blockly' and published = false and is_placeholder = false
--   and (sort_order between 811 and 850 or sort_order between 961 and 1000);
--
-- D. 没有关卡游离在单元之外
-- select count(*) from public.module_level l
-- where l.module_id = 'blockly' and not exists (
--   select 1 from public.module_unit u
--   where u.module_id = l.module_id and u.unit_id = l.unit_id and u.term_id = l.term_id);
--
-- E. 正文里的 scene_type 与列一致
-- select level_id from public.module_level ml
-- where ml.module_id = 'blockly' and ml.scene_type <> ml.body->>'scene_type';
--
-- F. 每关都有复习卡
-- select count(*) from public.module_level
-- where module_id = 'blockly' and published = true and is_placeholder = false
--   and term_id in ('blk-g2-fall', 'blk-g2-spring')
--   and body->'review' is null;
--
-- G. 学习记录没有指向不存在关卡的行
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
if (levels.length !== 160) throw new Error(`应该生成 160 关，实际生成了 ${levels.length} 关`)

const unitCounts = new Map()
for (const level of levels) unitCounts.set(level.unitId, (unitCounts.get(level.unitId) ?? 0) + 1)
for (const unit of UNIT_META) {
  const count = unitCounts.get(unit.unitId) ?? 0
  if (count !== 40) throw new Error(`单元 ${unit.unitId} 应该是 40 关，实际 ${count} 关`)
}

// 编号必须连号：blk-161…320。
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

console.log('已生成 160 关自由舞台关卡（Level 2 / Level 3 各 80 关）：')
console.log(`  迁移 SQL  ${path.relative(ROOT, SQL_PATH)}`)
console.log(`  标准解清单 ${path.relative(ROOT, MANIFEST_PATH)}`)
console.log(`  待办积木  ${path.relative(ROOT, PENDING_PATH)}`)
for (const unit of UNIT_META) {
  const unitLevels = levels.filter((level) => level.unitId === unit.unitId)
  const totalBlocks = unitLevels.reduce((sum, level) => sum + level.blocks, 0)
  console.log(`  ${unit.title.padEnd(9, '　')} ${unitLevels.length} 关，标准解共 ${totalBlocks} 块积木`)
}
