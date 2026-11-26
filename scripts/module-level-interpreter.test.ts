import assert from 'node:assert/strict'
import test from 'node:test'
import { parseModuleLevelBody } from '../src/modules/curriculum/moduleLevelBody.ts'
import { interpretModuleLevel } from '../src/modules/curriculum/moduleLevelInterpreter.ts'

function body(overrides: {
  width?: number
  goalX?: number
  maxBlocks?: number
  maxSteps?: number
  stopOnSuccess?: boolean
  obstacles?: { x: number; y: number }[]
} = {}) {
  return parseModuleLevelBody({
    schema_version: 1,
    available_blocks: [
      { type: 'move_forward', label: '前进', category: '动作', kind: 'action', args: [] },
    ],
    map: {
      width: overrides.width ?? 5,
      height: 1,
      start: { x: 0, y: 0, heading: 'E' },
      goal: { x: overrides.goalX ?? 1, y: 0 },
      actor: { id: 'player', asset: 'grid_robot' },
      obstacles: overrides.obstacles ?? [],
      entities: [],
    },
    success_check: { type: 'actor_at_goal', actor_id: 'player' },
    workspace: { initial_blocks: [], max_blocks: overrides.maxBlocks ?? 1, require_connected: true },
    runtime: { out_of_bounds: 'blocked', max_steps: overrides.maxSteps ?? 8, stop_on_success: overrides.stopOnSuccess ?? true, move_duration_ms: 450 },
    hints: [{ trigger: 'initial', text: '把“前进”拖到工作区，再点运行。' }],
    completion: { stars: 3, success_text: '到达终点，完成！' },
  })
}

const forward = { type: 'move_forward', args: {} }

test('一步到终点后立即完成', () => {
  const result = interpretModuleLevel(body(), [forward])
  assert.equal(result.completed, true)
  assert.equal(result.final.x, 1)
  assert.equal(result.final.y, 0)
  assert.equal(result.final.heading, 'E')
  assert.equal(result.steps.length, 1)
  assert.equal(result.truncated, false)
})

test('越界移动被挡住，角色留在原位', () => {
  const result = interpretModuleLevel(body({ width: 1, goalX: 0, stopOnSuccess: false }), [forward])
  assert.equal(result.completed, true)
  assert.equal(result.final.x, 0)
  assert.equal(result.blocked, true)
  assert.equal(result.steps[0]?.moved, false)
})

test('障碍物会挡住前进', () => {
  const result = interpretModuleLevel(body({ goalX: 2, obstacles: [{ x: 1, y: 0 }] }), [forward])
  assert.equal(result.completed, false)
  assert.equal(result.final.x, 0)
  assert.equal(result.blocked, true)
})

test('max_steps 截断后续指令', () => {
  const result = interpretModuleLevel(body({ width: 10, goalX: 9, maxBlocks: 5, maxSteps: 2 }), [
    forward,
    forward,
    forward,
    forward,
    forward,
  ])
  assert.equal(result.completed, false)
  assert.equal(result.final.x, 2)
  assert.equal(result.steps.length, 2)
  assert.equal(result.truncated, true)
  assert.equal(result.failure, 'max_steps')
})
