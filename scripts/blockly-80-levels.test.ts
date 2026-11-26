import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { parseModuleLevelBody, type ModuleLevelBody } from '../src/modules/curriculum/moduleLevelBody.ts'
import { countBlockNodes, interpretModuleLevel, type BlockExecutionNode } from '../src/modules/curriculum/moduleLevelInterpreter.ts'
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

test('每关都带开场提示和没通关提示，而且都写了高亮目标', () => {
  for (const level of manifest.levels) {
    const body = bodyOf(level)
    const initial = body.hints.find((hint) => hint.trigger === 'initial')
    const notCompleted = body.hints.find((hint) => hint.trigger === 'not_completed')
    assert.ok(initial, `${level.levelId} 缺开场提示`)
    assert.ok(notCompleted, `${level.levelId} 缺没通关的提示`)
    assert.ok(initial.focus, `${level.levelId} 的开场提示没写高亮目标`)
    assert.ok(notCompleted.focus, `${level.levelId} 的没通关提示没写高亮目标`)
    assert.ok(initial.text.trim(), `${level.levelId} 的开场提示是空的`)
    assert.ok(notCompleted.text.trim(), `${level.levelId} 的没通关提示是空的`)
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
