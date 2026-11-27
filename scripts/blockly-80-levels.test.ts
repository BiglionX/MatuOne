import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { parseModuleLevelBody, type ModuleLevelBody } from '../src/modules/curriculum/moduleLevelBody.ts'
import { countBlockNodes, interpretModuleLevel, type BlockExecutionNode } from '../src/modules/curriculum/moduleLevelInterpreter.ts'
import { BLOCK_DEFS } from './blockly-level-recipes.mjs'
import { STORY_IMAGES } from './blockly-story-recipes.mjs'

/**
 * 第一学期 80 关的回归测试。
 *
 * 正文和标准解都来自生成器留下的 manifest：scripts/generate-blockly-80.mjs
 * 每写一关之前都用生产解析器和生产解释器跑过一遍，这里再用生产代码复跑一次，
 * 顺便把迁移文件里的 JSON 也读出来验一遍，防止生成物和落库内容脱节。
 */
const MANIFEST_FILE = 'scripts/generated/blockly-80.manifest.json'
const MIGRATION_FILE = 'supabase/migrations/20261126160000_blockly_level_1_80_generated.sql'
/** 绘本样板迁移：前 5 关的正文样例。 */
const SAMPLE_MIGRATION_FILE = 'supabase/migrations/20261126170000_blockly_intro_story_sample.sql'
const SAMPLE_LEVEL_IDS = ['blk-001', 'blk-002', 'blk-003', 'blk-004', 'blk-005']

interface ManifestLevel {
  levelId: string
  sortOrder: number
  unitId: string
  title: string
  goal: string
  levelType: string
  solution: BlockExecutionNode[]
  body: unknown
  maxSteps: number
  steps: number
  blocks: number
}

interface Manifest {
  termId: string
  levels: ManifestLevel[]
}

const manifest = JSON.parse(readFileSync(path.join(process.cwd(), MANIFEST_FILE), 'utf8')) as Manifest

/**
 * 迁移文件里每关的 v2 正文，顺带验证迁移里的 JSON 真的能被解析器读懂。
 *
 * 迁移是 insert … on conflict 写法（线上原本没有 blk-061…080，纯 update 会一关都写不进去），
 * 所以按 insert 语句分块，每块里取关卡号和 $body$ 之间的 JSON。
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

function bodyOf(level: ManifestLevel): ModuleLevelBody {
  return parseModuleLevelBody(level.body)
}

interface ProgramEntry {
  node: BlockExecutionNode
  depth: number
}

interface SolutionFacts {
  result: ReturnType<typeof interpretModuleLevel>
  nodes: ProgramEntry[]
  topNodes: BlockExecutionNode[]
  repeatTimes: number[]
  topRepeatTimes: number[]
  nestedTurnRepeatTimes: number[]
  moves: number
  turns: number
  legs: number[]
  blockCount: number
  repeatCount: number
  topRepeatCount: number
  maxControlDepth: number
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

/** 独立从标准解和生产解释器提取事实，不调用文案生成器的 analyzeLevel。 */
function solutionFacts(level: ManifestLevel): SolutionFacts {
  const body = bodyOf(level)
  const result = interpretModuleLevel(body, level.solution)
  assert.equal(result.completed, true, `${level.levelId} 的标准解应该能通关`)

  const nodes: ProgramEntry[] = []
  const walk = (first: BlockExecutionNode | null | undefined, depth: number) => {
    for (const node of linkedNodes(first)) {
      nodes.push({ node, depth })
      for (const child of node.children ?? []) walk(child, depth + 1)
    }
  }
  for (const top of level.solution) walk(top, 0)

  const topNodes = level.solution.flatMap((top) => linkedNodes(top))
  const repeats = nodes.filter(({ node }) => node.type === 'repeat')
  const topRepeats = topNodes.filter((node) => node.type === 'repeat')
  const repeatTimes = repeats.map(({ node }) => Number(node.args.times))
  const topRepeatTimes = topRepeats.map((node) => Number(node.args.times))
  const nestedTurnRepeatTimes = topRepeats.flatMap((node) => {
    const directBody = (node.children ?? []).flatMap((child) => linkedNodes(child))
    if (!directBody.some((item) => item.type === 'turn_left' || item.type === 'turn_right')) return []
    return directBody.filter((item) => item.type === 'repeat').map((item) => Number(item.args.times))
  })

  let currentLeg = 0
  let turns = 0
  const legs: number[] = []
  for (const frame of result.steps) {
    if (frame.command.type === 'move_forward') {
      assert.equal(frame.moved, true, `${level.levelId} 的标准解不应该撞墙`)
      currentLeg += 1
    } else if (frame.command.type === 'turn_left' || frame.command.type === 'turn_right') {
      legs.push(currentLeg)
      currentLeg = 0
      turns += 1
    }
  }
  legs.push(currentLeg)

  const moves = result.final.trail.length - 1
  assert.equal(legs.reduce((sum, leg) => sum + leg, 0), moves, `${level.levelId} 的轨迹分段对不上`)
  assert.ok(legs.every((leg) => leg > 0), `${level.levelId} 的轨迹里出现了空路段`)

  return {
    result,
    nodes,
    topNodes,
    repeatTimes,
    topRepeatTimes,
    nestedTurnRepeatTimes,
    moves,
    turns,
    legs,
    blockCount: countBlockNodes(level.solution),
    repeatCount: repeats.length,
    topRepeatCount: topRepeats.length,
    maxControlDepth: Math.max(0, ...nodes.map(({ depth }) => depth)),
  }
}

interface TeachingText {
  source: string
  text: string
}

function teachingTexts(level: ManifestLevel, body: ModuleLevelBody): TeachingText[] {
  const texts: TeachingText[] = [
    { source: 'goal', text: level.goal },
    ...body.hints.map((hint) => ({ source: `hints.${hint.trigger}`, text: hint.text })),
    ...(body.intro_story ?? []).map((page, index) => ({ source: `intro_story[${index}]`, text: page.content })),
  ]
  if (body.review) {
    texts.push(
      { source: 'review.question', text: body.review.question },
      { source: 'review.answer', text: body.review.answer },
      { source: 'review.hint', text: body.review.hint ?? '' },
    )
  }
  return texts
}

const CHINESE_DIGITS: Record<string, number> = {
  零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4,
  五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
}

/** 文案只用到几十以内的小数，这里顺带支持百、千、万，避免以后扩关时误放行。 */
function chineseInteger(raw: string): number {
  if (!/[十百千万]/.test(raw)) return Number([...raw].map((char) => CHINESE_DIGITS[char]).join(''))
  let total = 0
  let section = 0
  let digit = 0
  for (const char of raw) {
    if (char in CHINESE_DIGITS) {
      digit = CHINESE_DIGITS[char]
    } else if (char === '十' || char === '百') {
      section += (digit || 1) * (char === '十' ? 10 : 100)
      digit = 0
    } else {
      total += (section + digit || 1) * (char === '千' ? 1000 : 10000)
      section = 0
      digit = 0
    }
  }
  return total + section + digit
}

/** 抽出阿拉伯数字和带数量单位的中文数字，如「12 块」「两段」「十条边」。 */
function numbersIn(text: string): Set<number> {
  const numbers = new Set<number>()
  for (const match of text.matchAll(/\d+/g)) numbers.add(Number(match[0]))
  const chinese = /[零〇一二两三四五六七八九十百千万]+(?=\s*(?:小段|位数|块|格|步|段|条|层|个|次|弯|边))/g
  for (const match of text.matchAll(chinese)) numbers.add(chineseInteger(match[0]))
  return numbers
}

function addFactNumbers(target: Set<number>, facts: SolutionFacts) {
  target.add(1)
  target.add(facts.moves)
  target.add(facts.turns)
  target.add(facts.legs.length)
  target.add(facts.blockCount)
  target.add(facts.repeatCount)
  target.add(facts.topRepeatCount)
  target.add(facts.maxControlDepth)
  for (const value of [...facts.repeatTimes, ...facts.legs]) target.add(value)
}

function allowedNumbers(level: ManifestLevel, facts: SolutionFacts, previousFacts: SolutionFacts | null): Set<number> {
  const allowed = new Set<number>()
  addFactNumbers(allowed, facts)
  if (previousFacts) addFactNumbers(allowed, previousFacts)
  // 前 15 关保留手写绘本，允许孩子按任意一格数数；仍由本关真实轨迹限定上界。
  if (level.sortOrder <= 15) {
    for (let value = 1; value <= facts.moves; value += 1) allowed.add(value)
  }
  return allowed
}

function assertAvailableBlockMentions(level: ManifestLevel, body: ModuleLevelBody, texts: TeachingText[]) {
  const available = new Set(body.available_blocks.map((block) => block.type))
  for (const [type, definition] of Object.entries(BLOCK_DEFS)) {
    for (const { source, text } of texts) {
      if (!text.includes(definition.label)) continue
      assert.ok(
        available.has(type),
        `${level.levelId} 的 ${source} 提到了「${definition.label}」，但本关积木盘没有 ${type}`,
      )
    }
  }
}

test('manifest 里是 80 关，编号和顺序都对得上', () => {
  assert.equal(manifest.termId, 'blk-g1-fall')
  assert.equal(manifest.levels.length, 80)
  assert.deepEqual(
    manifest.levels.map((level) => level.levelId),
    Array.from({ length: 80 }, (_, index) => `blk-${String(index + 1).padStart(3, '0')}`),
  )
  assert.deepEqual(
    manifest.levels.map((level) => level.sortOrder),
    Array.from({ length: 80 }, (_, index) => index + 1),
  )
})

test('5 个单元各 16 关，标题和目标都不空', () => {
  const byUnit = new Map<string, ManifestLevel[]>()
  for (const level of manifest.levels) {
    const list = byUnit.get(level.unitId)
    if (list) list.push(level)
    else byUnit.set(level.unitId, [level])
  }
  assert.equal(byUnit.size, 5)
  for (const [unitId, levels] of byUnit) {
    assert.equal(levels.length, 16, `单元 ${unitId} 应该是 16 关`)
    for (const level of levels) {
      assert.ok(level.title.trim(), `${level.levelId} 缺标题`)
      assert.ok(level.goal.trim(), `${level.levelId} 缺目标`)
    }
  }
})

test('迁移文件里写全了 80 关正文，且和 manifest 一致', () => {
  assert.equal(migrationBodies.size, 80)
  for (const level of manifest.levels) {
    const migrated = migrationBodies.get(level.levelId)
    assert.ok(migrated, `迁移文件里应该有 ${level.levelId} 的正文`)
    assert.deepEqual(migrated, level.body, `${level.levelId} 的迁移正文和 manifest 不一致`)
  }
})

test('80 关正文都是 schema_version 2 的网格场景', () => {
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    assert.equal(body.schema_version, 2, `${level.levelId} 应该是 v2 正文`)
    assert.equal(body.scene_type, 'grid', `${level.levelId} 应该是网格场景`)
    assert.equal(body.scene.type, 'grid')
    assert.ok(body.available_blocks.length > 0, `${level.levelId} 没有可用积木`)
    assert.ok(body.workspace.max_blocks > 0, `${level.levelId} 没有积木上限`)
    assert.ok(body.runtime.max_steps > 0, `${level.levelId} 没有步数上限`)
  }
})

test('标准解都能走到终点，步数和积木数都在上限内', () => {
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    const blockCount = countBlockNodes(level.solution)
    assert.equal(blockCount, level.blocks, `${level.levelId} 的标准解积木数对不上`)
    assert.ok(
      blockCount <= body.workspace.max_blocks,
      `${level.levelId} 的标准解用了 ${blockCount} 块积木，超过上限 ${body.workspace.max_blocks}`,
    )

    const result = interpretModuleLevel(body, level.solution)
    assert.equal(result.completed, true, `${level.levelId} 的标准解应该能通关`)
    assert.equal(result.steps.length, level.steps, `${level.levelId} 的标准解步数对不上`)
    assert.ok(result.steps.length <= body.runtime.max_steps, `${level.levelId} 的标准解步数超上限`)
    assert.equal(result.failure, undefined, `${level.levelId} 的标准解不应该失败`)
  }
})

test('标准解用到的积木都在本关的可用积木里', () => {
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    const available = new Set(body.available_blocks.map((block) => block.type))
    const walk = (nodes: (BlockExecutionNode | null | undefined)[]) => {
      for (const node of nodes) {
        if (!node) continue
        assert.ok(available.has(node.type), `${level.levelId} 用到了不可用的积木 ${node.type}`)
        walk(node.children ?? [])
        if (node.next) walk([node.next])
      }
    }
    walk(level.solution)
  }
})

test('起点和终点不重合，障碍物和收集物都落在地图里', () => {
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    if (body.scene.type !== 'grid') continue
    const { width, height, start, goal, obstacles, entities } = body.scene
    assert.ok(start.x < width && start.y < height, `${level.levelId} 起点越界`)
    assert.ok(goal.x < width && goal.y < height, `${level.levelId} 终点越界`)
    assert.notDeepEqual({ x: start.x, y: start.y }, goal, `${level.levelId} 的起点不能和终点重合`)
    for (const obstacle of obstacles) {
      assert.notDeepEqual(obstacle, { x: start.x, y: start.y }, `${level.levelId} 的障碍物压住了起点`)
      assert.notDeepEqual(obstacle, goal, `${level.levelId} 的障碍物压住了终点`)
    }
    for (const entity of entities) {
      assert.ok(entity.x < width && entity.y < height, `${level.levelId} 的收集物 ${entity.id} 越界`)
    }
  }
})

test('每关都带开场提示和没通关提示，而且都高亮本关可用的积木', () => {
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    const available = new Set(body.available_blocks.map((block) => block.type))
    const initial = body.hints.find((hint) => hint.trigger === 'initial')
    const notCompleted = body.hints.find((hint) => hint.trigger === 'not_completed')
    assert.ok(initial, `${level.levelId} 缺开场提示`)
    assert.ok(notCompleted, `${level.levelId} 缺没通关的提示`)
    assert.ok(initial.focus, `${level.levelId} 的开场提示没写高亮目标`)
    assert.ok(notCompleted.focus, `${level.levelId} 的没通关提示没写高亮目标`)
    assert.equal(initial.focus.target, 'block', `${level.levelId} 的开场提示应该指向积木`)
    assert.equal(notCompleted.focus.target, 'block', `${level.levelId} 的没通关提示应该指向积木`)
    assert.ok(initial.focus.blockType, `${level.levelId} 的开场提示没指定积木类型`)
    assert.ok(notCompleted.focus.blockType, `${level.levelId} 的没通关提示没指定积木类型`)
    assert.ok(available.has(initial.focus.blockType), `${level.levelId} 的开场提示指向了不可用积木`)
    assert.ok(available.has(notCompleted.focus.blockType), `${level.levelId} 的没通关提示指向了不可用积木`)
    assert.ok(initial.text.trim(), `${level.levelId} 的开场提示是空的`)
    assert.ok(notCompleted.text.trim(), `${level.levelId} 的没通关提示是空的`)
  }
})

test('目标、提示、绘本和复习卡点名的积木都在本关积木盘中', () => {
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    assertAvailableBlockMentions(level, body, teachingTexts(level, body))
  }
})

test('文案数字来自真实轨迹，循环次数写进了目标或失败提示', () => {
  const factsByLevel = manifest.levels.map(solutionFacts)
  for (const [index, level] of manifest.levels.entries()) {
    const body = bodyOf(level)
    const facts = factsByLevel[index]
    const previousFacts = index > 0 ? factsByLevel[index - 1] : null
    const allowed = allowedNumbers(level, facts, previousFacts)
    for (const { source, text } of teachingTexts(level, body)) {
      for (const value of numbersIn(text)) {
        assert.ok(
          allowed.has(value),
          `${level.levelId} 的 ${source} 写了 ${value}，但它不在本关或上一关的标准解事实里`,
        )
      }
    }

    const notCompleted = body.hints.find((hint) => hint.trigger === 'not_completed')
    assert.ok(notCompleted, `${level.levelId} 缺失败提示`)
    const goalAndCheckNumbers = numbersIn(`${level.goal}\n${notCompleted.text}`)
    for (const times of new Set(facts.repeatTimes)) {
      assert.ok(
        goalAndCheckNumbers.has(times),
        `${level.levelId} 的「重复执行」要设置 ${times} 次，但目标或失败提示没有写`,
      )
    }
  }
})

test('目标里的路线段序、尺寸和条件循环算式与生产解释器轨迹一致', () => {
  for (const level of manifest.levels) {
    const facts = solutionFacts(level)
    const goal = level.goal
    const conditional = facts.nodes.find(({ node }) => node.type.startsWith('if_'))?.node

    if (conditional) {
      if (facts.topRepeatTimes.length === 2) {
        const match = goal.match(/先直走\s*(\d+)\s*格，再自动拐\s*(\d+)\s*个弯/)
        assert.ok(match, `${level.levelId} 的混合关目标缺少数值`)
        assert.equal(Number(match[1]), facts.legs[0], `${level.levelId} 的前段格数不对`)
        assert.equal(Number(match[2]), facts.turns, `${level.levelId} 的拐角数不对`)
        assert.equal(facts.topRepeatTimes[1], facts.moves - facts.legs[0], `${level.levelId} 的后段循环次数不对`)
      } else {
        const match = goal.match(/沿着走廊走\s*(\d+)\s*格，拐\s*(\d+)\s*个弯/)
        assert.ok(match, `${level.levelId} 的条件关目标缺少数值`)
        assert.equal(Number(match[1]), facts.moves, `${level.levelId} 的走廊格数不对`)
        assert.equal(Number(match[2]), facts.turns, `${level.levelId} 的走廊拐角数不对`)
        const needsCornerTurn = conditional.type === 'if_path_ahead' || conditional.type === 'if_else'
        const expectedTimes = facts.moves + (needsCornerTurn ? facts.turns : 0)
        assert.equal(facts.topRepeatTimes[0], expectedTimes, `${level.levelId} 的条件循环次数算式不对`)
      }
      continue
    }

    if (facts.nestedTurnRepeatTimes.length > 0) {
      const square = goal.match(/边长\s*(\d+)\s*的正方形/)
      if (square) {
        const sides = [...new Set(facts.nestedTurnRepeatTimes)]
        assert.equal(sides.length, 1, `${level.levelId} 的正方形边长应该只有一个`)
        assert.equal(Number(square[1]), sides[0], `${level.levelId} 的正方形边长不对`)
      } else {
        const rect = goal.match(/(\d+)\s*×\s*(\d+)\s*的长方形/)
        assert.ok(rect, `${level.levelId} 的长方形目标缺少数值`)
        assert.equal(Number(rect[1]), Math.max(...facts.nestedTurnRepeatTimes), `${level.levelId} 的长边长度不对`)
        assert.equal(Number(rect[2]), Math.min(...facts.nestedTurnRepeatTimes), `${level.levelId} 的短边长度不对`)
      }
      continue
    }

    if (facts.topRepeatTimes.length === 0 && facts.turns > 0) {
      const goalLegs = [...goal.matchAll(/(\d+)\s*步/g)].map((match) => Number(match[1]))
      assert.deepEqual(goalLegs, facts.legs, `${level.levelId} 的目标段序和最终标准解轨迹不一致`)
      continue
    }

    if (facts.topRepeatTimes.length > 1) {
      const match = goal.match(/分别走\s*([\d、]+)\s*格/)
      assert.ok(match, `${level.levelId} 的分段目标缺少数值`)
      const goalLegs = match[1].split('、').map(Number)
      assert.deepEqual(goalLegs, facts.topRepeatTimes, `${level.levelId} 的分段循环次数顺序不对`)
      assert.deepEqual(goalLegs, facts.legs, `${level.levelId} 的目标段序和最终标准解轨迹不一致`)
      continue
    }

    if (facts.topRepeatTimes.length === 1 && facts.turns === 0) {
      const match = goal.match(/一次走完\s*(\d+)\s*格/)
      assert.ok(match, `${level.levelId} 的直道循环目标缺少数值`)
      assert.equal(Number(match[1]), facts.moves, `${level.levelId} 的直道循环格数不对`)
      assert.equal(facts.topRepeatTimes[0], facts.moves, `${level.levelId} 的直道循环次数不对`)
    }
  }
})

test('复习卡提示不是上一关开场提示的原文复制', () => {
  for (const [index, level] of manifest.levels.entries()) {
    if (index === 0) continue
    const review = bodyOf(level).review
    const previousInitial = bodyOf(manifest.levels[index - 1]).hints.find((hint) => hint.trigger === 'initial')
    assert.ok(review?.hint?.trim(), `${level.levelId} 的复习卡缺提示`)
    assert.ok(previousInitial, `${manifest.levels[index - 1].levelId} 缺开场提示`)
    assert.notEqual(review.hint, previousInitial.text, `${level.levelId} 的复习卡提示复制了上一关开场提示`)
    assert.notEqual(review.hint.trim(), previousInitial.text.trim(), `${level.levelId} 的复习卡提示只改了空白`)
  }
})

test('后两个单元必须用循环或条件，不能一路手写前进', () => {
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    if (!level.unitId.endsWith('-u3') && !level.unitId.endsWith('-u4') && !level.unitId.endsWith('-u5')) continue
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
    const hasControl = types.has('repeat') || types.has('if_wall_ahead') || types.has('if_path_ahead') || types.has('if_else')
    assert.ok(hasControl, `${level.levelId} 的标准解里没有循环或条件`)
  }
})

test('每一关都配了绘本，页数在 3 到 5 页之间', () => {
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    const pages = body.intro_story
    assert.ok(pages, `${level.levelId} 没有绘本`)
    assert.ok(pages.length >= 3 && pages.length <= 5, `${level.levelId} 的绘本是 ${pages.length} 页，应该是 3 到 5 页`)
    for (const [index, page] of pages.entries()) {
      assert.ok(page.content.trim(), `${level.levelId} 的绘本第 ${index + 1} 页没有正文`)
      assert.ok(['text', 'image_text'].includes(page.type), `${level.levelId} 的绘本第 ${index + 1} 页类型不对`)
      // 配图页必须指明插画，前端才有东西可画。
      if (page.type === 'image_text') {
        assert.ok(page.image, `${level.levelId} 的绘本第 ${index + 1} 页是配图页却没给插画`)
      }
    }
  }
})

test('除了第一关，每一关都配了复习卡', () => {
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    if (level.levelId === 'blk-001') {
      // 第一关没有上一关，复习卡问的是「上一关学了什么」，没得问。
      assert.equal(body.review, undefined)
      continue
    }
    const review = body.review
    assert.ok(review, `${level.levelId} 没有复习卡`)
    assert.ok(review.question.trim(), `${level.levelId} 的复习卡没有问句`)
    assert.ok(review.answer.trim(), `${level.levelId} 的复习卡没有答案`)
  }
})

test('样板迁移里的绘本和生成器产出的一致', () => {
  const sql = readFileSync(path.join(process.cwd(), SAMPLE_MIGRATION_FILE), 'utf8')
  for (const level of manifest.levels.filter((item) => SAMPLE_LEVEL_IDS.includes(item.levelId))) {
    const body = bodyOf(level)
    const block = sql.split(`and level_id = '${level.levelId}';`)[0].split('$story$').slice(-2)[0]
    assert.ok(block, `样板迁移里应该有 ${level.levelId} 的绘本`)
    const story = JSON.parse(block) as { intro_story?: unknown; review?: unknown }
    assert.deepEqual(story.intro_story, body.intro_story, `${level.levelId} 的样板绘本和生成器产出不一致`)
    assert.deepEqual(story.review, body.review, `${level.levelId} 的样板复习卡和生成器产出不一致`)
  }
})

/**
 * 绘本里的插画标识必须在前端登记过。
 *
 * 登记了才有占位图；没登记前端会退回书本图案，绘本就白画了。
 * 教研新增标识时，这条测试会挡住漏改前端的情况。
 */
test('绘本用到的插画标识，前端占位表里都登记了', () => {
  const source = readFileSync(path.join(process.cwd(), 'src/pages/blockly/StoryPlayer.tsx'), 'utf8')
  const table = source.match(/const IMAGE_EMOJI: Record<string, string> = \{([\s\S]*?)\n\}/)
  assert.ok(table, 'StoryPlayer 里应该还有 IMAGE_EMOJI 占位表')
  const registered = new Set([...table[1].matchAll(/^\s{2}([a-z_]+):/gm)].map((match) => match[1]))
  assert.ok(registered.size > 0, 'IMAGE_EMOJI 占位表是空的')

  // 教研登记的标识都要在前端有对应的占位图。
  for (const image of Object.keys(STORY_IMAGES)) {
    assert.ok(registered.has(image), `前端没登记插画 ${image}，绘本里画出来会变成书本图案`)
  }

  // 正文里真正用到的标识也要登记过。
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    for (const page of body.intro_story ?? []) {
      if (!page.image) continue
      assert.ok(registered.has(page.image), `${level.levelId} 用了前端没登记的插画 ${page.image}`)
    }
  }
})
