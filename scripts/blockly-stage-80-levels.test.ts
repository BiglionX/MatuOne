import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { parseModuleLevelBody, type ModuleLevelBody } from '../src/modules/curriculum/moduleLevelBody.ts'
import { countBlockNodes, type BlockExecutionNode } from '../src/modules/curriculum/moduleLevelInterpreter.ts'
import { compileStageProgram, createStageWorld, tick } from '../src/modules/curriculum/moduleStageInterpreter.ts'
import { analyzeStageLevel } from './blockly-story-recipes.mjs'
import { STAGE_BLOCK_DEFS, STAGE_PENDING_BLOCKS, STAGE_TERMS, STAGE_UNITS } from './blockly-stage-recipes.mjs'

/**
 * 二年级 160 关自由舞台（Level 2 = blk-161 … blk-240，Level 3 = blk-241 … blk-320）的回归测试。
 *
 * 正文和标准解都来自生成器留下的 manifest：scripts/generate-stage-levels.mjs
 * 每写一关之前都用生产解析器和生产解释器跑过一遍，这里再用生产代码复跑一次，
 * 顺便把迁移文件里的 JSON 也读出来验一遍，防止生成物和落库内容脱节。
 */
const MANIFEST_FILE = 'scripts/generated/blockly-stage-80.manifest.json'
const MIGRATION_FILE = 'supabase/migrations/20261127100000_blockly_level_2_3_80_stage_generated.sql'
const PENDING_FILE = 'scripts/generated/blockly-stage-80.pending.json'

/** 四个单元和它们的学期、编号区间。 */
const UNIT_PLAN = [
  { unitId: STAGE_UNITS.L2U1, termId: STAGE_TERMS.L2, from: 161, to: 200 },
  { unitId: STAGE_UNITS.L2U2, termId: STAGE_TERMS.L2, from: 201, to: 240 },
  { unitId: STAGE_UNITS.L3U1, termId: STAGE_TERMS.L3, from: 241, to: 280 },
  { unitId: STAGE_UNITS.L3U2, termId: STAGE_TERMS.L3, from: 281, to: 320 },
]

interface ManifestLevel {
  levelId: string
  sortOrder: number
  unitId: string
  title: string
  goal: string
  goalText: string
  levelType: string
  knowledgeTags: string[]
  estimatedMinutes: number
  facts: Record<string, unknown>
  solution: BlockExecutionNode[]
  body: unknown
  maxSteps: number
  ticks: number
  blocks: number
}

interface Manifest {
  levels: ManifestLevel[]
}

const manifest = JSON.parse(readFileSync(path.join(process.cwd(), MANIFEST_FILE), 'utf8')) as Manifest

/**
 * 迁移文件里每关的 v2 正文，顺带验证迁移里的 JSON 真的能被解析器读懂。
 *
 * 迁移是 insert … on conflict 写法，所以按 insert 语句分块，
 * 每块里取关卡号和 $body$ 之间的 JSON。
 */
function readMigrationBodies(): Map<string, unknown> {
  const sql = readFileSync(path.join(process.cwd(), MIGRATION_FILE), 'utf8')
  const bodies = new Map<string, unknown>()
  for (const block of sql.split(/insert into public\.module_level/).slice(1)) {
    const levelMatch = block.match(/values\s*\(\s*'blockly',\s*'(blk-\d+)'/)
    const bodyMatch = block.match(/\$body\$([\s\S]*?)\$body\$::jsonb/)
    if (!levelMatch || !bodyMatch) continue
    assert.ok(bodyMatch[1], `${levelMatch[1]} 的正文块是空的`)
    bodies.set(levelMatch[1], JSON.parse(bodyMatch[1]))
  }
  return bodies
}

const migrationBodies = readMigrationBodies()
const migrationSql = readFileSync(path.join(process.cwd(), MIGRATION_FILE), 'utf8')

function bodyOf(level: ManifestLevel): ModuleLevelBody {
  return parseModuleLevelBody(level.body)
}

/** 关卡正文里的舞台场景；不是舞台场景就直接失败。 */
function stageSceneOf(level: ManifestLevel) {
  const body = bodyOf(level)
  if (body.scene.type !== 'stage') assert.fail(`${level.levelId} 应该是舞台场景`)
  return body.scene
}

/** 摊平一条 next 链，但不递归展开 children。 */
function linkedNodes(first: BlockExecutionNode | null | undefined): BlockExecutionNode[] {
  const out: BlockExecutionNode[] = []
  let current = first
  while (current) {
    out.push(current)
    current = current.next ?? undefined
  }
  return out
}

/** 标准解里用到的所有积木类型。 */
function solutionTypes(level: ManifestLevel): Set<string> {
  const types = new Set<string>()
  const walk = (nodes: (BlockExecutionNode | null | undefined)[]) => {
    for (const node of nodes) {
      if (!node) continue
      types.add(node.type)
      walk(node.children ?? [])
      if (node.next) walk([node.next])
    }
  }
  walk(level.solution)
  return types
}

/** 会带分支的积木。 */
const CONTROL_BLOCKS = new Set(['forever', 'repeat', 'if_touching', 'clone', 'if_else', 'if_wall_ahead', 'if_path_ahead'])

/**
 * 标准解里「分支体里还有积木」的最深层数。
 *
 * 1 = 只有顶层积木；2 = 条件体里还放了积木；3 = 条件体里还套了一个条件。
 */
function maxBranchDepth(level: ManifestLevel): number {
  let deepest = 0
  const walk = (nodes: (BlockExecutionNode | null | undefined)[], depth: number) => {
    for (const node of nodes) {
      if (!node) continue
      const childDepth = CONTROL_BLOCKS.has(node.type) ? depth + 1 : depth
      if (childDepth > deepest) deepest = childDepth
      walk(node.children ?? [], childDepth)
      if (node.next) walk([node.next], depth)
    }
  }
  walk(level.solution, 0)
  return deepest
}

/** 「如果碰到」套「如果碰到」的层数。 */
function maxTouchingDepth(level: ManifestLevel): number {
  let deepest = 0
  const walk = (nodes: (BlockExecutionNode | null | undefined)[], depth: number) => {
    for (const node of nodes) {
      if (!node) continue
      const nextDepth = node.type === 'if_touching' ? depth + 1 : depth
      if (nextDepth > deepest) deepest = nextDepth
      walk(node.children ?? [], nextDepth)
      if (node.next) walk([node.next], depth)
    }
  }
  walk(level.solution, 0)
  return deepest
}

/** 正文里的成功判定点名的变量。 */
function checkVariables(level: ManifestLevel): string[] {
  const body = bodyOf(level)
  const out: string[] = []
  const walk = (check: unknown) => {
    if (!check || typeof check !== 'object') return
    const row = check as Record<string, unknown>
    if (row.type === 'variable_value' && typeof row.variable_id === 'string') out.push(row.variable_id)
    if (row.type === 'all' || row.type === 'any') {
      for (const child of (row.conditions as unknown[]) ?? []) walk(child)
    }
  }
  walk(body.success_check)
  return out
}

test('manifest 里是 160 关，编号 blk-161 … blk-320 连号', () => {
  assert.equal(manifest.levels.length, 160)
  assert.deepEqual(
    manifest.levels.map((level) => level.levelId),
    Array.from({ length: 160 }, (_, index) => `blk-${161 + index}`),
  )
  assert.deepEqual(
    manifest.levels.map((level) => level.sortOrder),
    Array.from({ length: 160 }, (_, index) => 161 + index),
  )
  assert.equal(manifest.levels.filter((level) => level.sortOrder <= 240).length, 80)
  assert.equal(manifest.levels.filter((level) => level.sortOrder >= 241).length, 80)
})

test('关卡标题完整，每十个变体的收官关都叫“完整作品”', () => {
  for (const level of manifest.levels) {
    assert.ok(level.title.trim().length > 0, `${level.levelId} 缺少标题`)
    assert.doesNotMatch(level.title, /undefined/i, `${level.levelId} 的标题包含 undefined`)
    if (level.sortOrder % 10 === 0) assert.match(level.title, /·完整作品$/, `${level.levelId} 的收官标题不完整`)
  }
})

test('四个单元各 40 关，编号区间和学期都对得上', () => {
  assert.equal(new Set(manifest.levels.map((level) => level.unitId)).size, 4)
  for (const plan of UNIT_PLAN) {
    const levels = manifest.levels.filter((level) => level.unitId === plan.unitId)
    assert.equal(levels.length, 40, `单元 ${plan.unitId} 应该是 40 关`)
    assert.deepEqual(
      levels.map((level) => level.sortOrder),
      Array.from({ length: 40 }, (_, index) => plan.from + index),
      `单元 ${plan.unitId} 的编号应该是 ${plan.from} … ${plan.to}`,
    )
    for (const level of levels) {
      assert.ok(level.title.trim(), `${level.levelId} 缺标题`)
      assert.ok(level.goal.trim(), `${level.levelId} 缺目标`)
      assert.equal(level.goal, level.goalText, `${level.levelId} 的目标文案对不上`)
      assert.ok(['new', 'practice', 'typing', 'project'].includes(level.levelType), `${level.levelId} 的关卡类型不对`)
    }
  }
})

test('迁移文件里写全了 160 关正文，且和 manifest 一致', () => {
  assert.equal(migrationBodies.size, 160)
  for (const level of manifest.levels) {
    const migrated = migrationBodies.get(level.levelId)
    assert.ok(migrated, `迁移文件里应该有 ${level.levelId} 的正文`)
    assert.deepEqual(migrated, level.body, `${level.levelId} 的迁移正文和 manifest 不一致`)
  }
})

test('迁移文件把单元、学期和场景类型写对了', () => {
  for (const plan of UNIT_PLAN) {
    assert.match(migrationSql, new RegExp(`'blockly', '${plan.unitId}', '${plan.termId}'`))
  }
  assert.match(migrationSql, /'stage', 'new'/)
  assert.match(migrationSql, /insert into public\.module_unit/)
  assert.match(migrationSql, /weeks = 16/)
  assert.match(migrationSql, /level_cap = 80/)
  const unitInsert = migrationSql.slice(migrationSql.indexOf('insert into public.module_unit'), migrationSql.indexOf('on conflict (module_id, unit_id)'))
  assert.equal((unitInsert.match(/, 40, [12]\)/g) ?? []).length, 4, '四个单元的 level_cap 都应该是 40')
})

test('单元改号覆盖所有旧正式子记录，并在单个原子块内恢复外键', () => {
  const section = migrationSql.slice(migrationSql.indexOf('-- 2. 单元'), migrationSql.indexOf('-- 3. 旧正式关卡'))
  const dropIndex = section.indexOf('drop constraint if exists module_level_unit_fk')
  const parentIndex = section.indexOf('update public.module_unit')
  const childIndex = section.indexOf('update public.module_level')
  const addIndex = section.indexOf('add constraint module_level_unit_fk')
  assert.match(section, /do \$\$/)
  assert.ok(dropIndex >= 0 && parentIndex > dropIndex && childIndex > parentIndex && addIndex > childIndex)
  assert.match(section, /v_legacy_id := v_unit\.unit_id \|\| '-legacy'/)
  assert.match(section, /and unit_id = v_unit\.unit_id/)
  assert.match(section, /update public\.module_level as child/)
  assert.match(section, /child\.level_id between 'blk-161' and 'blk-255'/)
  assert.match(section, /and not exists \([\s\S]*archived\.level_id = case/)
  assert.match(section, /'blk-g2-fall-u1'/)
  assert.match(section, /'blk-g2-spring-u5'/)
  assert.doesNotMatch(section, /and is_placeholder = true/)
})

test('旧正式关卡归档和学习记录迁移不会误伤复用旧编号的新舞台关卡', () => {
  const renumber = migrationSql.slice(migrationSql.indexOf('-- 3. 旧正式关卡'), migrationSql.indexOf('-- 4. 学习记录'))
  const progress = migrationSql.slice(migrationSql.indexOf('-- 4. 学习记录'), migrationSql.indexOf('-- 5. 二年级'))
  assert.equal((renumber.match(/\('blk-\d+', 'blk-\d+', \d+, \d+,/g) ?? []).length, 104)
  assert.match(renumber, /\('blk-161', 'blk-811', 161, 811/)
  assert.match(renumber, /\('blk-200', 'blk-850', 200, 850/)
  assert.match(renumber, /\('blk-201', 'blk-961', 201, 961/)
  assert.match(renumber, /\('blk-240', 'blk-1000', 240, 1000/)
  assert.match(renumber, /\('blk-167', 'blk-817', 167, 817, 'blk-g2-fall', 'blk-g2-fall-u3-legacy', true\)/)
  assert.match(renumber, /\('blk-175', 'blk-825', 175, 825, 'blk-g2-fall', 'blk-g2-fall-u5-legacy', true\)/)
  assert.match(renumber, /\('blk-241', 'blk-941', 241, 941/)
  assert.match(renumber, /published = false/)
  assert.doesNotMatch(renumber, /and is_placeholder = true/)
  assert.match(progress, /not exists \([\s\S]*source\.level_id = r\.old_id/)
  assert.match(progress, /select distinct on \(lr\.student_id, lr\.level_id\)/)
  assert.match(progress, /target\.is_placeholder = r\.is_placeholder/)
  assert.match(progress, /target\.published = false/)
  assert.match(progress, /update public\.learning_record target/)
  assert.match(progress, /set completed = false/)
  assert.doesNotMatch(progress, /and target\.is_placeholder = true/)
})

test('160 关正文都是 schema_version 2 的舞台场景', () => {
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    assert.equal(body.schema_version, 2, `${level.levelId} 应该是 v2 正文`)
    assert.equal(body.scene_type, 'stage', `${level.levelId} 应该是自由舞台`)
    assert.equal(body.scene.type, 'stage')
    assert.deepEqual(body.scene.stage_size, { width: 480, height: 360 })
    assert.ok(body.available_blocks.length > 0, `${level.levelId} 没有可用积木`)
    assert.ok(body.workspace.max_blocks > 0, `${level.levelId} 没有积木上限`)
    assert.ok(body.runtime.max_steps > 0, `${level.levelId} 没有步数上限`)
    assert.equal(body.runtime.stop_on_success, true, `${level.levelId} 通关后应该停下来`)
    assert.equal(body.workspace.require_connected, false, `${level.levelId} 允许多条独立脚本`)
  }
})

test('标准解都能通关，步数和积木数都在上限内', () => {
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    const blockCount = countBlockNodes(level.solution)
    assert.equal(blockCount, level.blocks, `${level.levelId} 的标准解积木数对不上`)
    assert.ok(
      blockCount <= body.workspace.max_blocks,
      `${level.levelId} 的标准解用了 ${blockCount} 块积木，超过上限 ${body.workspace.max_blocks}`,
    )

    const program = compileStageProgram(body, level.solution)
    let world = createStageWorld(program)
    let ticks = 0
    while (world.status === 'running' && ticks < body.runtime.max_steps) {
      world = tick(world)
      ticks += 1
    }
    assert.equal(world.completed, true, `${level.levelId} 的标准解应该能通关`)
    assert.equal(world.status, 'completed', `${level.levelId} 通关后状态应该是 completed`)
    assert.equal(world.failure, undefined, `${level.levelId} 的标准解不应该失败`)
    assert.equal(ticks, level.ticks, `${level.levelId} 的标准解步数对不上`)
    assert.ok(ticks <= body.runtime.max_steps, `${level.levelId} 的标准解步数超上限`)
  }
})

test('标准解用到的积木都在本关的可用积木里', () => {
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    const available = new Set(body.available_blocks.map((block) => block.type))
    for (const type of solutionTypes(level)) {
      assert.ok(available.has(type), `${level.levelId} 用到了不可用的积木 ${type}`)
    }
  }
})

test('没有用到「待办积木」清单里的积木', () => {
  // 待办清单里的积木解释器还没实现，生成器一旦用上，
  // 这 160 关在学生的浏览器里就会跑到一半卡住。
  const pending = Object.keys(STAGE_PENDING_BLOCKS)
  assert.ok(pending.length > 0, '待办积木清单不该是空的')
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    const available = body.available_blocks.map((block) => block.type)
    for (const type of pending) {
      assert.ok(!available.includes(type), `${level.levelId} 的积木盘里出现了还没实现的 ${type}`)
      assert.ok(!solutionTypes(level).has(type), `${level.levelId} 的标准解用到了还没实现的 ${type}`)
    }
  }
})

test('待办清单落盘文件和生产规则层一致', () => {
  const pending = JSON.parse(readFileSync(path.join(process.cwd(), PENDING_FILE), 'utf8')) as {
    termIds: string[]
    pending: Record<string, string>
  }
  assert.deepEqual(pending.termIds, [STAGE_TERMS.L2, STAGE_TERMS.L3])
  assert.deepEqual(Object.keys(pending.pending).sort(), Object.keys(STAGE_PENDING_BLOCKS).sort())
})

test('单元一必须同时用到移动、设置变量和如果碰到', () => {
  for (const level of manifest.levels.filter((item) => item.unitId === STAGE_UNITS.L2U1)) {
    const types = solutionTypes(level)
    assert.ok(types.has('move_steps'), `${level.levelId} 没有用到「移动」`)
    assert.ok(types.has('set_variable'), `${level.levelId} 没有用到「设置变量」`)
    assert.ok(types.has('if_touching'), `${level.levelId} 没有用到「如果碰到」`)
    assert.ok(types.has('forever'), `${level.levelId} 没有用到「无限循环」`)
  }
})

test('单元二要扣分：场景里有扣命的变量，成功判定读它', () => {
  for (const level of manifest.levels.filter((item) => item.unitId === STAGE_UNITS.L2U2)) {
    const body = bodyOf(level)
    assert.ok(body.scene.variables.some((variable) => variable.id === 'lives'), `${level.levelId} 没有 lives 变量`)
    assert.ok(checkVariables(level).includes('lives'), `${level.levelId} 的成功判定没有读 lives`)
    const types = solutionTypes(level)
    assert.ok(types.has('if_touching'), `${level.levelId} 没有用到「如果碰到」`)
    // 障碍碰到要扣分：标准解里一定有负数的变量增加。
    const negative = collectChangeValues(level).some((value) => value < 0)
    assert.ok(negative, `${level.levelId} 没有扣分的动作`)
  }
})

test('单元三覆盖单发、双发、三向散弹、追踪与混合火力', () => {
  const levels = manifest.levels.filter((item) => item.unitId === STAGE_UNITS.L3U1)
  assert.equal(levels.length, 40)
  for (const level of levels) {
    const body = bodyOf(level)
    const scene = stageSceneOf(level)
    assert.ok(body.scene.clones.length > 0, `${level.levelId} 没有克隆模板`)
    assert.equal(body.scene.clones.length, Number(level.facts.cloneTemplateCount), `${level.levelId} 的克隆模板数对不上`)
    assert.ok(solutionTypes(level).has('clone'), `${level.levelId} 的标准解没有用到「克隆」`)
    const touching = body.available_blocks.find((block) => block.type === 'if_touching')
    assert.ok(touching, `${level.levelId} 的积木盘里没有「如果碰到」`)
  }

  assert.deepEqual(
    levels.filter((level) => level.facts.gradient === 1).map((level) => level.facts.pattern),
    Array.from({ length: 10 }, () => 'straight'),
  )
  assert.deepEqual(
    levels.filter((level) => level.facts.gradient === 2).map((level) => level.facts.pattern),
    Array.from({ length: 10 }, () => 'twin'),
  )
  const spread = levels.filter((level) => level.facts.pattern === 'spread')
  assert.equal(spread.length, 10)
  for (const level of spread) {
    assert.deepEqual(level.facts.spreadDirections, [315, 0, 45])
    const directions = stageSceneOf(level).clones
      .filter((clone) => clone.id.startsWith('spread-'))
      .map((clone) => clone.direction)
    assert.deepEqual(directions, [315, 0, 45], `${level.levelId} 的三路散弹方向不对`)
  }

  const tracking = levels.filter((level) => level.facts.gradient === 4)
  assert.equal(tracking.length, 10)
  for (const level of tracking) {
    assert.ok(['tracking', 'mixed'].includes(String(level.facts.pattern)))
    assert.ok(Number(level.facts.trackingGuides) >= 3, `${level.levelId} 没有定位星星`)
    const scene = stageSceneOf(level)
    const templateIds = scene.clones.map((clone) => clone.id)
    assert.ok(templateIds.includes('tracker'), `${level.levelId} 没有追踪父弹`)
    assert.ok(templateIds.includes('seeker-left') && templateIds.includes('seeker-right'), `${level.levelId} 没有左右转向弹`)
    assert.equal(
      scene.sprites.filter((sprite) => sprite.id.startsWith('guide-')).length,
      Number(level.facts.trackingGuides),
      `${level.levelId} 的定位星星数量对不上`,
    )
    assert.ok(scene.sprites.some((sprite) => sprite.id === 'goal'), `${level.levelId} 项目关没有终点旗`)
  }
})

test('单元四覆盖单怪、重甲、混合编队、辅助塔与塔防决战', () => {
  const levels = manifest.levels.filter((item) => item.unitId === STAGE_UNITS.L3U2)
  assert.equal(levels.length, 40)
  for (const level of levels) {
    assert.equal(level.facts.kind, 'tower', `${level.levelId} 应该标记为塔防关`)
    assert.ok(maxBranchDepth(level) >= 2, `${level.levelId} 的条件分支体是空的`)
    const scene = stageSceneOf(level)
    assert.ok(scene.sprites.length >= 2, `${level.levelId} 舞台上至少要有一位玩家和一只怪物`)
    assert.equal(
      scene.sprites.filter((sprite) => /^tower-\d+-/.test(sprite.id)).length,
      Number(level.facts.enemyCount),
      `${level.levelId} 的怪物精灵数和 facts 对不上`,
    )
    const mix = level.facts.monsterMix as Record<string, number>
    assert.equal(mix.single + mix.pair + mix.triple, Number(level.facts.monsterGroups), `${level.levelId} 的怪物组数对不上`)
    assert.equal(mix.armored, mix.pair + mix.triple, `${level.levelId} 的重甲组数对不上`)
    assert.ok(Number(level.facts.enemyCount) >= Number(level.facts.monsterGroups), `${level.levelId} 的怪物总数不对`)
  }

  const single = levels.filter((level) => level.facts.gradient === 1)
  assert.equal(single.length, 10)
  assert.ok(single.every((level) => {
    const mix = level.facts.monsterMix as Record<string, number>
    return mix.single === Number(level.facts.monsterGroups) && mix.pair === 0 && mix.triple === 0
  }), '梯度 1 应该只有单怪阵列')

  const nested = levels.filter((level) => maxTouchingDepth(level) >= 2)
  assert.equal(nested.length, 30, '梯度 2 到 4 都应有重叠怪物嵌套判断')

  const assisted = levels.filter((level) => Number(level.facts.gradient) >= 3)
  assert.equal(assisted.length, 20)
  for (const level of assisted) {
    const scene = stageSceneOf(level)
    assert.equal(level.facts.helper, true, `${level.levelId} 应该有辅助塔`)
    assert.ok(scene.initial_scripts?.some((script) => script.target_sprite_id === 'bee-tower'), `${level.levelId} 没有蜜蜂塔开火脚本`)
    assert.ok(checkVariables(level).includes('lives'), `${level.levelId} 的成功判定没有读 lives`)
    assert.ok(Number(level.facts.hazardCount) > 0, `${level.levelId} 没有塔防障碍`)
  }

  const finale = levels.filter((level) => level.facts.gradient === 4)
  assert.equal(finale.length, 10)
  assert.ok(finale.every((level) => stageSceneOf(level).sprites.some((sprite) => sprite.id === 'goal')), '塔防决战都应包含终点旗')
})

test('四个单元都按 4 梯度 × 10 变体展开，梯度内速度平滑上升', () => {
  for (const plan of UNIT_PLAN) {
    const levels = manifest.levels.filter((level) => level.unitId === plan.unitId)
    assert.deepEqual(
      levels.map((level) => level.facts.gradient),
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    )
    assert.deepEqual(
      levels.map((level) => level.facts.variant),
      Array.from({ length: 4 }, () => Array.from({ length: 10 }, (_, index) => index + 1)).flat(),
    )
    for (let gradient = 1; gradient <= 4; gradient += 1) {
      const phase = levels.filter((level) => level.facts.gradient === gradient)
      const speeds = phase.map((level) => Number(level.facts.speed))
      assert.ok(speeds.every((speed, index) => index === 0 || speed >= speeds[index - 1]), `${plan.unitId} 梯度 ${gradient} 的速度应平滑上升`)
    }
    assert.equal(levels[39].levelType, 'project', `${plan.unitId} 最后一关应是项目关`)
  }
})

/** 标准解里所有「变量增加」的数值。 */
function collectChangeValues(level: ManifestLevel): number[] {
  const out: number[] = []
  const walk = (nodes: (BlockExecutionNode | null | undefined)[]) => {
    for (const node of nodes) {
      if (!node) continue
      if (node.type === 'change_variable') out.push(Number(node.args.value))
      walk(node.children ?? [])
      if (node.next) walk([node.next])
    }
  }
  walk(level.solution)
  return out
}

test('舞台上的角色都在舞台范围内，玩家始终站在场景里', () => {
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    if (body.scene.type !== 'stage') continue
    const { width, height } = body.scene.stage_size
    assert.ok(body.scene.sprites.some((sprite) => sprite.id === 'player'), `${level.levelId} 舞台上没有 player`)
    for (const sprite of body.scene.sprites) {
      assert.ok(sprite.x >= 0 && sprite.x <= width, `${level.levelId} 的 ${sprite.id} 横坐标越界`)
      assert.ok(sprite.y >= 0 && sprite.y <= height, `${level.levelId} 的 ${sprite.id} 纵坐标越界`)
    }
    for (const clone of body.scene.clones) {
      assert.ok(clone.spawn.x === 'self' || clone.spawn.x === 'random' || Number.isFinite(clone.spawn.x))
      assert.ok(clone.spawn.y === 'self' || clone.spawn.y === 'random' || Number.isFinite(clone.spawn.y))
    }
  }
})

test('每关都配了绘本，页数在 3 到 5 页之间', () => {
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    const pages = body.intro_story
    assert.ok(pages, `${level.levelId} 没有绘本`)
    assert.ok(pages.length >= 3 && pages.length <= 5, `${level.levelId} 的绘本是 ${pages.length} 页，应该是 3 到 5 页`)
    for (const [index, page] of pages.entries()) {
      assert.ok(page.content.trim(), `${level.levelId} 的绘本第 ${index + 1} 页没有正文`)
      assert.ok(['text', 'image_text'].includes(page.type), `${level.levelId} 的绘本第 ${index + 1} 页类型不对`)
      if (page.type === 'image_text') {
        assert.ok(page.image, `${level.levelId} 的绘本第 ${index + 1} 页是配图页却没给插画`)
      }
    }
  }
})

test('每关都有复习卡，而且复习的是上一关的核心概念', () => {
  for (const [index, level] of manifest.levels.entries()) {
    const body = bodyOf(level)
    const review = body.review
    assert.ok(review, `${level.levelId} 没有复习卡`)
    assert.ok(review.question.trim(), `${level.levelId} 的复习卡没有问句`)
    assert.ok(review.answer.trim(), `${level.levelId} 的复习卡没有答案`)
    assert.ok(review.hint?.trim(), `${level.levelId} 的复习卡没有提示`)

    if (index === 0) {
      // 第一关之前是二年级的开篇，没有上一关，复习的是一年级的变量课。
      assert.match(review.question, /一年级/)
      continue
    }
    const previous = manifest.levels[index - 1]
    const previousConcept = analyzeStageLevel(previous).concept
    assert.ok(
      review.question.includes(previousConcept.name),
      `${level.levelId} 的复习卡问的是「${previousConcept.name}」吗`,
    )
    assert.ok(
      review.answer.includes(previousConcept.detail),
      `${level.levelId} 的复习卡答案没有复述上一关的核心概念`,
    )
    assert.notEqual(review.hint, review.answer, `${level.levelId} 的复习卡提示和答案写重了`)
  }
})

test('绘本和复习卡点名的积木都在本关积木盘中', () => {
  const labels: Record<string, string> = {
    ...Object.fromEntries(Object.entries(STAGE_BLOCK_DEFS).map(([type, def]) => [type, def.label])),
    if_touching: '如果碰到',
    clone: '克隆',
  }
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    const available = new Set(body.available_blocks.map((block) => block.type))
    const texts = [
      level.goal,
      ...body.hints.map((hint) => hint.text),
      ...(body.intro_story ?? []).map((page) => page.content),
      body.review?.question ?? '',
      body.review?.answer ?? '',
      body.review?.hint ?? '',
    ]
    for (const text of texts) {
      for (const [type, label] of Object.entries(labels)) {
        if (!text.includes(label)) continue
        assert.ok(available.has(type), `${level.levelId} 的文案提到了「${label}」，但本关积木盘没有 ${type}`)
      }
    }
  }
})

test('绘本用到的插画标识，前端占位表里都登记了', () => {
  const source = readFileSync(path.join(process.cwd(), 'src/pages/blockly/StoryPlayer.tsx'), 'utf8')
  const table = source.match(/const IMAGE_EMOJI: Record<string, string> = \{([\s\S]*?)\n\}/)
  assert.ok(table, 'StoryPlayer 里应该还有 IMAGE_EMOJI 占位表')
  const registered = new Set([...table[1].matchAll(/^\s{2}([a-z_]+):/gm)].map((match) => match[1]))
  assert.ok(registered.size > 0, 'IMAGE_EMOJI 占位表是空的')

  for (const level of manifest.levels) {
    const body = bodyOf(level)
    for (const page of body.intro_story ?? []) {
      if (!page.image) continue
      assert.ok(registered.has(page.image), `${level.levelId} 用了前端没登记的插画 ${page.image}`)
    }
  }
})

test('舞台上用到的精灵资产，前端字形表里都登记了', () => {
  const source = readFileSync(path.join(process.cwd(), 'src/pages/blockly/StageStage.tsx'), 'utf8')
  const table = source.match(/const SPRITE_GLYPHS: Record<string, string> = \{([\s\S]*?)\n\}/)
  assert.ok(table, 'StageStage 里应该还有 SPRITE_GLYPHS 字形表')
  const registered = new Set([...table[1].matchAll(/^\s{2}([a-z_]+):/gm)].map((match) => match[1]))
  assert.ok(registered.size > 0, 'SPRITE_GLYPHS 字形表是空的')

  for (const level of manifest.levels) {
    const body = bodyOf(level)
    if (body.scene.type !== 'stage') continue
    const assets = [
      ...body.scene.sprites.map((sprite) => sprite.asset),
      ...body.scene.clones.map((clone) => clone.asset),
    ]
    for (const asset of assets) {
      assert.ok(registered.has(asset), `${level.levelId} 用了前端没登记的精灵 ${asset}，舞台上会显示成方块`)
    }
  }
})
