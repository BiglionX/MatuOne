import assert from 'node:assert/strict'
import test from 'node:test'
import { parseModuleLevelBody } from '../src/modules/curriculum/moduleLevelBody.ts'
import {
  countBlockNodes,
  interpretModuleLevel,
  type BlockExecutionNode,
} from '../src/modules/curriculum/moduleLevelInterpreter.ts'

function body(overrides: {
  width?: number
  height?: number
  goalX?: number
  goalY?: number
  maxBlocks?: number
  maxSteps?: number
  stopOnSuccess?: boolean
  obstacles?: { x: number; y: number }[]
  startX?: number
  startY?: number
} = {}) {
  return parseModuleLevelBody({
    schema_version: 1,
    available_blocks: [
      { type: 'move_forward', label: '前进', category: '动作', kind: 'action', args: [] },
      { type: 'turn_left', label: '左转', category: '动作', kind: 'action', args: [] },
      { type: 'turn_right', label: '右转', category: '动作', kind: 'action', args: [] },
      {
        type: 'repeat',
        label: '重复执行',
        category: '控制',
        kind: 'control',
        args: [{ name: 'times', label: '次数', type: 'number', default: 2, min: 1, max: 20, step: 1 }],
      },
      { type: 'if_wall_ahead', label: '如果前面有墙', category: '控制', kind: 'control', args: [] },
    ],
    map: {
      width: overrides.width ?? 5,
      height: overrides.height ?? 1,
      start: { x: overrides.startX ?? 0, y: overrides.startY ?? 0, heading: 'E' },
      goal: { x: overrides.goalX ?? 1, y: overrides.goalY ?? 0 },
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

const forward = (): BlockExecutionNode => ({ type: 'move_forward', args: {} })
const turnRight = (): BlockExecutionNode => ({ type: 'turn_right', args: {} })
const turnLeft = (): BlockExecutionNode => ({ type: 'turn_left', args: {} })
const repeat = (times: number, children: BlockExecutionNode[]): BlockExecutionNode => ({
  type: 'repeat',
  args: { times },
  children,
})

test('一步到终点后立即完成', () => {
  const result = interpretModuleLevel(body(), [forward()])
  assert.equal(result.completed, true)
  assert.equal(result.final.x, 1)
  assert.equal(result.final.y, 0)
  assert.equal(result.final.heading, 'E')
  assert.equal(result.steps.length, 1)
  assert.equal(result.truncated, false)
})

test('越界移动被挡住，角色留在原位', () => {
  const result = interpretModuleLevel(body({ width: 1, goalX: 0, stopOnSuccess: false }), [forward()])
  assert.equal(result.completed, true)
  assert.equal(result.final.x, 0)
  assert.equal(result.blocked, true)
  assert.equal(result.steps[0]?.moved, false)
})

test('障碍物会挡住前进', () => {
  const result = interpretModuleLevel(body({ goalX: 2, obstacles: [{ x: 1, y: 0 }] }), [forward()])
  assert.equal(result.completed, false)
  assert.equal(result.final.x, 0)
  assert.equal(result.blocked, true)
})

test('max_steps 截断后续指令', () => {
  const result = interpretModuleLevel(body({ width: 10, goalX: 9, maxBlocks: 5, maxSteps: 2 }), [
    forward(),
    forward(),
    forward(),
    forward(),
    forward(),
  ])
  assert.equal(result.completed, false)
  assert.equal(result.final.x, 2)
  assert.equal(result.steps.length, 2)
  assert.equal(result.truncated, true)
  assert.equal(result.failure, 'max_steps')
})

test('右转改变朝向，顺时针转四格回到原方向', () => {
  const result = interpretModuleLevel(body({ width: 3, goalX: 0, stopOnSuccess: false, maxBlocks: 8 }), [
    turnRight(),
    turnRight(),
    turnRight(),
    turnRight(),
  ])
  assert.equal(result.final.heading, 'E')
  assert.equal(result.steps.length, 4)
})

test('左转改变朝向', () => {
  const result = interpretModuleLevel(body({ width: 3, goalX: 0, stopOnSuccess: false, maxBlocks: 8 }), [
    turnLeft(),
    turnLeft(),
  ])
  // E → N → W
  assert.equal(result.final.heading, 'W')
  assert.equal(result.steps.length, 2)
})

test('repeat 重复执行嵌套体，次数来自 times 参数', () => {
  const result = interpretModuleLevel(body({ width: 7, goalX: 6, maxBlocks: 4, maxSteps: 24 }), [
    repeat(6, [forward()]),
  ])
  assert.equal(result.completed, true)
  assert.equal(result.final.x, 6)
  assert.equal(result.steps.length, 6)
  // 控制积木本身不计步，只算里面的动作积木。
  assert.deepEqual(result.steps.map((step) => step.command.type), Array(6).fill('move_forward'))
})

test('repeat 支持嵌套循环', () => {
  // 外层 2 次，内层「前进 ×2 后右转」：走出一个边长 2 的正方形，停在 (2,2)，朝向 W。
  const result = interpretModuleLevel(
    body({ width: 6, height: 6, goalX: 5, goalY: 5, maxBlocks: 9, maxSteps: 30 }),
    [
      repeat(2, [
        repeat(2, [forward()]),
        turnRight(),
      ]),
    ],
  )
  assert.equal(result.final.x, 2)
  assert.equal(result.final.y, 2)
  assert.equal(result.final.heading, 'W')
  assert.equal(result.steps.length, 6)
  assert.equal(result.completed, false)
})

test('repeat 的次数支持 Blockly 字段返回的字符串', () => {
  const result = interpretModuleLevel(body({ width: 7, goalX: 6, maxBlocks: 4, maxSteps: 24 }), [
    { type: 'repeat', args: { times: '6' }, children: [forward()] },
  ])
  assert.equal(result.completed, true)
  assert.equal(result.steps.length, 6)
})

test('repeat 次数非法时报错', () => {
  assert.throws(
    () => interpretModuleLevel(body({ maxBlocks: 4 }), [{ type: 'repeat', args: { times: 'abc' }, children: [forward()] }]),
    /重复次数必须是非负整数/,
  )
})

test('if_wall_ahead 在前方有障碍时才执行嵌套体', () => {
  const scene = body({ width: 4, height: 1, goalX: 2, maxBlocks: 6, maxSteps: 24, obstacles: [{ x: 1, y: 0 }] })
  const result = interpretModuleLevel(scene, [
    { type: 'if_wall_ahead', args: {}, children: [turnRight()] },
    forward(),
  ])
  // 第一格就是墙，条件成立，右转后前进被挡住但朝向已变。
  assert.equal(result.final.heading, 'S')
  assert.equal(result.blocked, true)
})

test('if_wall_ahead 前方无墙时不执行嵌套体', () => {
  const scene = body({ width: 4, height: 1, goalX: 2, maxBlocks: 6, maxSteps: 24 })
  const result = interpretModuleLevel(scene, [
    { type: 'if_wall_ahead', args: {}, children: [turnRight()] },
    forward(),
  ])
  assert.equal(result.final.heading, 'E')
  assert.equal(result.final.x, 1)
})

test('if_wall_ahead 把越界也算成墙', () => {
  const scene = body({ width: 1, height: 1, goalX: 0, stopOnSuccess: false, maxBlocks: 6, maxSteps: 24 })
  const result = interpretModuleLevel(scene, [
    { type: 'if_wall_ahead', args: {}, children: [turnRight()] },
  ])
  assert.equal(result.final.heading, 'S')
})

test('if_wall_ahead 套在 repeat 里可以绕过障碍', () => {
  // 4×4 网格，(3,0) 有墙；重复 5 次「有墙就右转，然后前进」。
  const scene = body({
    width: 4,
    height: 4,
    goalX: 2,
    goalY: 3,
    maxBlocks: 6,
    maxSteps: 24,
    obstacles: [{ x: 3, y: 0 }, { x: 1, y: 3 }],
  })
  const result = interpretModuleLevel(scene, [
    repeat(5, [
      { type: 'if_wall_ahead', args: {}, children: [turnRight()] },
      forward(),
    ]),
  ])
  assert.equal(result.completed, true)
  assert.equal(result.final.x, 2)
  assert.equal(result.final.y, 3)
})

test('max_blocks 按工作区积木总数判定，嵌套块也算数', () => {
  const scene = body({ width: 9, goalX: 8, maxBlocks: 3, maxSteps: 24 })
  // repeat + 内层 repeat + 2 个前进 = 4 块，超过上限 3。
  const tree: BlockExecutionNode[] = [
    repeat(3, [repeat(2, [forward(), forward()])]),
  ]
  assert.equal(countBlockNodes(tree), 4)
  assert.throws(() => interpretModuleLevel(scene, tree), /积木数量超过本关上限 3/)
})

test('countBlockNodes 统计顶层、next 链和嵌套子块', () => {
  const tree: BlockExecutionNode[] = [
    {
      type: 'move_forward',
      args: {},
      next: { type: 'move_forward', args: {} },
      children: [{ type: 'turn_right', args: {} }],
    },
    { type: 'move_forward', args: {} },
  ]
  assert.equal(countBlockNodes(tree), 4)
  assert.equal(countBlockNodes([]), 0)
  assert.equal(countBlockNodes([null, undefined]), 0)
})

test('不在 available_blocks 里的积木会被拒绝', () => {
  const scene = body({ maxBlocks: 4 })
  assert.throws(
    () => interpretModuleLevel(scene, [{ type: 'jump', args: {} }]),
    /积木类型 jump 不在本关 available_blocks 中/,
  )
})
