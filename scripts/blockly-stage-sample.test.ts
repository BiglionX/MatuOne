import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { parseModuleLevelBody } from '../src/modules/curriculum/moduleLevelBody.ts'
import type { BlockExecutionNode } from '../src/modules/curriculum/moduleLevelInterpreter.ts'
import { compileStageProgram, createStageWorld, tick } from '../src/modules/curriculum/moduleStageInterpreter.ts'

const MIGRATION_FILE = 'supabase/migrations/20261126180000_blockly_stage_blk_031_apple_sample.sql'
const sql = readFileSync(path.join(process.cwd(), MIGRATION_FILE), 'utf8')
const bodyMatch = sql.match(/\$body\$([\s\S]*?)\$body\$::jsonb/)
assert.ok(bodyMatch?.[1], '接苹果迁移里应该有完整正文')
const body = parseModuleLevelBody(JSON.parse(bodyMatch[1]))

test('接苹果迁移兼容旧 blk-031 和改号后的 blk-161，且不碰第一学期关卡', () => {
  assert.match(sql, /level_id in \('blk-031', 'blk-161'\)/)
  assert.match(sql, /term_id = 'blk-g2-fall'/)
  assert.match(sql, /is_placeholder = false/)
})

test('blk-031 样板是带 score、player 和 3 个可收集苹果的 Stage 正文', () => {
  assert.equal(body.schema_version, 2)
  assert.equal(body.scene_type, 'stage')
  assert.equal(body.scene.type, 'stage')
  if (body.scene.type !== 'stage') assert.fail('样板应该是舞台场景')

  assert.deepEqual(body.scene.stage_size, { width: 480, height: 360 })
  assert.deepEqual(body.scene.variables.map((variable) => ({ id: variable.id, name: variable.name, initial: variable.initial })), [
    { id: 'score', name: 'score', initial: 0 },
  ])
  const player = body.scene.sprites.find((sprite) => sprite.id === 'player')
  const apples = body.scene.sprites.filter((sprite) => sprite.asset === 'apple')
  assert.ok(player, '舞台上要有 player')
  assert.equal(player.direction, 90, '小猫默认向右，步数改成负数即可向左')
  assert.equal(apples.length, 3)
  assert.ok(apples.every((apple) => apple.collectible), '每个苹果都只能收集一次')
  assert.ok(apples.every((apple) => apple.direction === 180), '苹果默认朝下')
  assert.ok(apples.every((apple) => player.y > apple.y), 'player 要在底部，苹果在上面')
  assert.deepEqual(body.scene.initial_scripts?.map((script) => script.target_sprite_id), ['apple', 'apple-2', 'apple-3'])
  assert.ok(body.scene.initial_scripts?.every((script) => script.block.type === 'forever' && script.block.children?.[0]?.type === 'move_steps'))
  assert.deepEqual(body.success_check, {
    type: 'all',
    conditions: [
      { type: 'variable_value', variable_id: 'score', op: '==', value: 3 },
      { type: 'sprite_hidden', sprite_id: 'apple' },
      { type: 'sprite_hidden', sprite_id: 'apple-2' },
      { type: 'sprite_hidden', sprite_id: 'apple-3' },
    ],
  })
  assert.deepEqual(
    body.available_blocks.map((block) => block.type),
    ['move_steps', 'change_variable', 'if_touching', 'forever'],
  )
})

test('接苹果绘本和复习卡讲了变量与计分', () => {
  assert.equal(body.intro_story?.length, 4)
  const storyText = body.intro_story?.map((page) => page.content).join(' ') ?? ''
  assert.match(storyText, /变量/)
  assert.match(storyText, /score/)
  assert.match(storyText, /加 1/)
  assert.match(body.review?.question ?? '', /score/)
  assert.match(body.review?.answer ?? '', /score/)
})

test('接苹果标准解在 forever 中分别碰撞 3 个苹果，score 到 3 后停止', () => {
  const changeScore: BlockExecutionNode = { type: 'change_variable', args: { variable_id: 'score', value: 1 } }
  const solution: BlockExecutionNode = {
    type: 'forever',
    args: {},
    children: [{
      type: 'move_steps',
      args: { steps: 10 },
      next: {
        type: 'if_touching',
        args: { target_sprite_id: 'apple' },
        children: [changeScore],
        next: {
          type: 'if_touching',
          args: { target_sprite_id: 'apple-2' },
          children: [changeScore],
          next: {
            type: 'if_touching',
            args: { target_sprite_id: 'apple-3' },
            children: [changeScore],
          },
        },
      },
    }],
  }
  const program = compileStageProgram(body, [solution])
  let world = createStageWorld(program)
  for (let index = 0; index < 200 && world.status === 'running'; index += 1) world = tick(world)

  assert.equal(world.variables.score, 3)
  assert.equal(world.completed, true)
  assert.equal(world.status, 'completed')
  assert.ok(world.sprites.filter((sprite) => sprite.asset === 'apple').every((sprite) => !sprite.visible))
  assert.ok(world.frame < 200, '标准解应该在 200 Tick 内完成')
})

test('苹果自动向下落，没接住时停在底部且不会重复计分', () => {
  const program = compileStageProgram(body, [{
    type: 'forever',
    args: {},
    children: [{ type: 'move_steps', args: { steps: -10 } }],
  }])
  const initial = createStageWorld(program)
  const first = tick(initial)
  assert.equal(first.sprites.find((sprite) => sprite.id === 'player')?.x, 150)
  assert.deepEqual(
    first.sprites.filter((sprite) => sprite.asset === 'apple').map((sprite) => sprite.y),
    [254, 234, 214],
  )

  let world = first
  for (let index = 0; index < 34; index += 1) world = tick(world)
  assert.equal(world.sprites.find((sprite) => sprite.id === 'player')?.x, 0)
  assert.ok(world.sprites.filter((sprite) => sprite.asset === 'apple').every((sprite) => sprite.y === 328 && sprite.visible))
  assert.equal(world.variables.score, 0)
  assert.ok(world.threads.filter((thread) => thread.id.startsWith('initial-')).every((thread) => thread.status === 'running'))
  assert.equal(world.status, 'running')
})

test('直接改 score 不能绕过接苹果目标', () => {
  const program = compileStageProgram(body, [
    { type: 'change_variable', args: { variable_id: 'score', value: 3 } },
  ])
  let world = createStageWorld(program)
  for (let index = 0; index < 5 && world.status === 'running'; index += 1) world = tick(world)

  assert.equal(world.variables.score, 3)
  assert.equal(world.completed, false)
  assert.equal(world.status, 'running')
  assert.equal(world.threads.find((thread) => thread.id === 'script-1')?.status, 'done')
  assert.ok(world.sprites.filter((sprite) => sprite.asset === 'apple').every((sprite) => sprite.visible))
})
