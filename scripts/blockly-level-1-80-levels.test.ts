import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { parseModuleLevelBody } from '../src/modules/curriculum/moduleLevelBody.ts'
import { countBlockNodes, interpretModuleLevel, type BlockExecutionNode } from '../src/modules/curriculum/moduleLevelInterpreter.ts'

const MANIFEST_FILE = 'scripts/generated/blockly-level-1-80.manifest.json'
const MIGRATION_FILE = 'supabase/migrations/20261127110000_blockly_level_1_80_grid_generated.sql'

interface ManifestLevel {
  levelId: string
  sortOrder: number
  unitId: string
  title: string
  goal: string
  solution: BlockExecutionNode[]
  body: unknown
  maxSteps: number
  steps: number
  blocks: number
}

const manifest = JSON.parse(readFileSync(path.join(process.cwd(), MANIFEST_FILE), 'utf8')) as {
  termId: string
  levels: ManifestLevel[]
}
const migrationSql = readFileSync(path.join(process.cwd(), MIGRATION_FILE), 'utf8')

function migrationBodies(): Map<string, unknown> {
  const bodies = new Map<string, unknown>()
  for (const block of migrationSql.split(/insert into public\.module_level/).slice(1)) {
    const level = block.match(/values\s*\(\s*'blockly',\s*'(blk-\d+)'/)
    const body = block.match(/\$body\$([\s\S]*?)\$body\$::jsonb/)
    assert.ok(level?.[1] && body?.[1], '迁移里的关卡正文块必须完整')
    bodies.set(level[1], JSON.parse(body[1]))
  }
  return bodies
}

test('Level 1 恰好是 blk-081 到 blk-160 的 80 个正式关卡', () => {
  assert.equal(manifest.termId, 'blk-g1-spring')
  assert.equal(manifest.levels.length, 80)
  assert.deepEqual(manifest.levels.map((level) => level.levelId), Array.from({ length: 80 }, (_, index) =>
    `blk-${String(index + 81).padStart(3, '0')}`))
  assert.deepEqual(manifest.levels.map((level) => level.sortOrder), Array.from({ length: 80 }, (_, index) => index + 81))
  for (let unit = 1; unit <= 5; unit += 1) {
    assert.equal(manifest.levels.filter((level) => level.unitId === `blk-g1-spring-u${unit}`).length, 16)
  }
})

test('Level 1 每关标准解都能通过生产解析器和解释器', () => {
  for (const level of manifest.levels) {
    const body = parseModuleLevelBody(level.body)
    assert.equal(body.scene.type, 'grid')
    assert.equal(body.workspace.initial_blocks.length, 0)
    assert.ok(body.intro_story && body.intro_story.length >= 3, `${level.levelId} 缺少绘本`)
    const result = interpretModuleLevel(body, level.solution)
    assert.equal(result.completed, true, `${level.levelId} 没有通关`)
    assert.equal(result.blocked, false, `${level.levelId} 发生撞墙`)
    assert.equal(result.steps.length, level.steps)
    assert.equal(countBlockNodes(level.solution), level.blocks)
    assert.ok(level.blocks <= body.workspace.max_blocks)
    assert.ok(level.steps <= body.runtime.max_steps)
  }
})

test('两个 Grid 学期的标准解参数都落在积木字段范围内', () => {
  const files = [
    'scripts/generated/blockly-80.manifest.json',
    'scripts/generated/blockly-level-1-80.manifest.json',
  ]
  for (const file of files) {
    const gridManifest = JSON.parse(readFileSync(path.join(process.cwd(), file), 'utf8')) as { levels: ManifestLevel[] }
    for (const level of gridManifest.levels) {
      const body = parseModuleLevelBody(level.body)
      const definitions = new Map(body.available_blocks.map((block) => [block.type, block]))
      const visit = (node: BlockExecutionNode) => {
        const definition = definitions.get(node.type)
        assert.ok(definition, `${level.levelId} 使用了未提供的积木 ${node.type}`)
        for (const [name, value] of Object.entries(node.args)) {
          const arg = definition.args.find((item) => item.name === name)
          assert.ok(arg, `${level.levelId} 的 ${node.type} 没有字段 ${name}`)
          if (arg.type === 'number') {
            assert.equal(typeof value, 'number', `${level.levelId} 的 ${name} 必须是数字`)
            const numericValue = value as number
            if (arg.min !== undefined) assert.ok(numericValue >= arg.min, `${level.levelId} 的 ${name} 小于下限 ${arg.min}`)
            if (arg.max !== undefined) assert.ok(numericValue <= arg.max, `${level.levelId} 的 ${name} 超过上限 ${arg.max}`)
          }
          if (arg.type === 'select') {
            assert.ok(arg.options?.some((option) => String(option.value) === String(value)), `${level.levelId} 的 ${name} 不在选项内`)
          }
        }
        for (const child of node.children ?? []) if (child) visit(child)
        if (node.next) visit(node.next)
      }
      for (const node of level.solution) visit(node)
    }
  }
})

test('Level 1 迁移与清单同源，并且只做增量 upsert', () => {
  const bodies = migrationBodies()
  assert.equal(bodies.size, 80)
  assert.equal((migrationSql.match(/on conflict \(module_id, level_id\) do update/g) ?? []).length, 80)
  assert.doesNotMatch(migrationSql, /\bdelete\s+from\b/i)
  for (const level of manifest.levels) {
    assert.deepEqual(bodies.get(level.levelId), level.body, `${level.levelId} 的迁移正文与清单不一致`)
  }
})
