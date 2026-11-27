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

test('Level 1 迁移与清单同源，并且只做增量 upsert', () => {
  const bodies = migrationBodies()
  assert.equal(bodies.size, 80)
  assert.equal((migrationSql.match(/on conflict \(module_id, level_id\) do update/g) ?? []).length, 80)
  assert.doesNotMatch(migrationSql, /\bdelete\s+from\b/i)
  for (const level of manifest.levels) {
    assert.deepEqual(bodies.get(level.levelId), level.body, `${level.levelId} 的迁移正文与清单不一致`)
  }
})
