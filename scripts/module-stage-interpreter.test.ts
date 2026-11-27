import assert from 'node:assert/strict'
import test from 'node:test'
import { parseModuleLevelBody, type ModuleStageInitialScript, type ModuleStageVariable } from '../src/modules/curriculum/moduleLevelBody.ts'
import type { BlockExecutionNode } from '../src/modules/curriculum/moduleLevelInterpreter.ts'
import {
  compileStageProgram,
  createStageWorld,
  spritesTouch,
  tick,
} from '../src/modules/curriculum/moduleStageInterpreter.ts'

function body(options: {
  playerX?: number
  playerY?: number
  appleX?: number
  appleY?: number
  appleDirection?: number
  direction?: number
  scoreTarget?: number
  stopOnSuccess?: boolean
  outOfBounds?: 'blocked' | 'fail'
  maxBlocks?: number
  maxSteps?: number
  appleCollectible?: boolean
  variables?: ModuleStageVariable[]
  initialScripts?: ModuleStageInitialScript[]
} = {}) {
  return parseModuleLevelBody({
    schema_version: 2,
    scene_type: 'stage',
    scene: {
      backdrop: 'sky',
      stage_size: { width: 480, height: 360 },
      sprites: [
        { id: 'player', asset: 'player', x: options.playerX ?? 100, y: options.playerY ?? 300, direction: options.direction ?? 90, size: 100 },
        { id: 'apple', asset: 'apple', x: options.appleX ?? 200, y: options.appleY ?? 300, direction: options.appleDirection ?? 90, size: 100, ...(options.appleCollectible ? { collectible: true } : {}) },
      ],
      clones: [],
      variables: options.variables ?? [{ id: 'score', name: 'score', initial: 0, scope: 'global' }],
      broadcasts: [],
      ...(options.initialScripts ? { initial_scripts: options.initialScripts } : {}),
    },
    available_blocks: [
      { type: 'move_steps', label: '移动', category: '动作', kind: 'action', args: [{ name: 'steps', label: '步数', type: 'number', default: 10 }] },
      {
        type: 'set_variable',
        label: '设置变量',
        category: '变量',
        kind: 'action',
        args: [
          { name: 'variable_id', label: '变量', type: 'string' },
          { name: 'value', label: '值', type: 'number', default: 0 },
        ],
      },
      {
        type: 'change_variable',
        label: '变量增加',
        category: '变量',
        kind: 'action',
        args: [
          { name: 'variable_id', label: '变量', type: 'string' },
          { name: 'value', label: '增加', type: 'number', default: 1 },
        ],
      },
      {
        type: 'if_touching',
        label: '如果碰到',
        category: '控制',
        kind: 'control',
        args: [{ name: 'target_sprite_id', label: '精灵', type: 'string' }],
      },
      { type: 'forever', label: '无限循环', category: '控制', kind: 'control', args: [] },
      {
        type: 'repeat',
        label: '重复执行',
        category: '控制',
        kind: 'control',
        args: [{ name: 'times', label: '次数', type: 'number', default: 2 }],
      },
    ],
    success_check: { type: 'variable_value', variable_id: 'score', op: '>=', value: options.scoreTarget ?? 3 },
    workspace: { initial_blocks: [], max_blocks: options.maxBlocks ?? 20, require_connected: true },
    // 舞台关卡的 runtime.max_steps 是「最多跑多少个 Tick」。
    // 默认给一个够大的数，让每个测试都能把程序跑完；
    // 想测步数上限的用例自己传小数字。
    runtime: { out_of_bounds: options.outOfBounds ?? 'blocked', max_steps: options.maxSteps ?? 5000, stop_on_success: options.stopOnSuccess ?? true, move_duration_ms: 0 },
    hints: [{ trigger: 'initial', text: '运行程序' }],
    completion: { stars: 3, success_text: '完成' },
  })
}

// compileStageProgram 当前接收共享的 BlockExecutionNode 结构；这里只保留测试需要的字段。
type StageBlock = BlockExecutionNode

const move = (steps: number): StageBlock => ({ type: 'move_steps', args: { steps } })
const setScore = (value: number): StageBlock => ({ type: 'set_variable', args: { variable_id: 'score', value } })
const changeScore = (value: number): StageBlock => ({ type: 'change_variable', args: { variable_id: 'score', value } })
const forever = (children: StageBlock[]): StageBlock => ({ type: 'forever', args: {}, children })
const ifTouchingApple = (children: StageBlock[]): StageBlock => ({
  type: 'if_touching',
  args: { target_sprite_id: 'apple' },
  children,
})

test('move_steps 按左上角坐标和当前方向移动，且不修改旧快照', () => {
  const lesson = body()
  const program = compileStageProgram(lesson, [move(10)])
  const initial = createStageWorld(program)
  const next = tick(initial)

  assert.equal(initial.sprites.find((sprite) => sprite.id === 'player')?.x, 100)
  assert.equal(next.sprites.find((sprite) => sprite.id === 'player')?.x, 110)
  assert.equal(next.sprites.find((sprite) => sprite.id === 'player')?.y, 300)
  assert.equal(next.frame, 1)
})

test('move_steps 支持向上移动并清理浮点误差', () => {
  const program = compileStageProgram(body({ direction: 0 }), [move(10)])
  const next = tick(createStageWorld(program))
  const player = next.sprites.find((sprite) => sprite.id === 'player')
  assert.equal(player?.x, 100)
  assert.equal(player?.y, 290)
})

test('舞台边界默认挡住精灵，fail 模式停止运行', () => {
  const blockedProgram = compileStageProgram(body({ playerX: 0, direction: 270 }), [move(10)])
  const blocked = tick(createStageWorld(blockedProgram))
  assert.equal(blocked.sprites.find((sprite) => sprite.id === 'player')?.x, 0)
  assert.equal(blocked.status, 'running')

  const failProgram = compileStageProgram(body({ playerX: 0, direction: 270, outOfBounds: 'fail' }), [move(10)])
  const failed = tick(createStageWorld(failProgram))
  assert.equal(failed.status, 'error')
  assert.equal(failed.failure?.type, 'out_of_bounds')
})

test('set_variable 和 change_variable 修改运行时值，成功判定不读 initial', () => {
  const lesson = body({ scoreTarget: 100, stopOnSuccess: false })
  const program = compileStageProgram(lesson, [{ ...setScore(5), next: changeScore(2) }])
  const initial = createStageWorld(program)
  const afterSet = tick(initial)
  const afterChange = tick(afterSet)

  assert.equal(initial.variables.score, 0)
  assert.equal(afterSet.variables.score, 5)
  assert.equal(afterChange.variables.score, 7)
  assert.equal(lesson.scene.type === 'stage' && lesson.scene.variables[0]?.initial, 0)
})

test('score 达到目标后停止所有并发线程', () => {
  const program = compileStageProgram(body(), [changeScore(3)])
  const next = tick(createStageWorld(program))
  assert.equal(next.variables.score, 3)
  assert.equal(next.completed, true)
  assert.equal(next.status, 'completed')
  assert.ok(next.threads.every((thread) => thread.status === 'stopped'))
})

test('AABB 检测重叠、边缘相接、自身和不可见精灵', () => {
  const program = compileStageProgram(body(), [])
  const world = createStageWorld(program)
  const player = world.sprites.find((sprite) => sprite.id === 'player')!
  const apple = world.sprites.find((sprite) => sprite.id === 'apple')!

  assert.equal(spritesTouch(player, { ...apple, x: 131 }), true)
  assert.equal(spritesTouch(player, { ...apple, x: 132 }), false)
  assert.equal(spritesTouch(player, player), false)
  assert.equal(spritesTouch(player, { ...apple, x: 131, visible: false }), false)
})

test('if_touching 命中时只执行分支体', () => {
  const hitProgram = compileStageProgram(body({ appleX: 131, scoreTarget: 100, stopOnSuccess: false }), [
    ifTouchingApple([changeScore(1)]),
  ])
  const hit = tick(createStageWorld(hitProgram))
  assert.equal(hit.variables.score, 1)

  const missProgram = compileStageProgram(body({ appleX: 132, scoreTarget: 100, stopOnSuccess: false }), [
    ifTouchingApple([changeScore(1)]),
  ])
  const miss = tick(createStageWorld(missProgram))
  assert.equal(miss.variables.score, 0)
})

test('可收集精灵持续接触只执行一次分支', () => {
  const program = compileStageProgram(body({ appleX: 131, appleCollectible: true, scoreTarget: 100, stopOnSuccess: false }), [
    forever([ifTouchingApple([changeScore(1)])]),
  ])
  let world = createStageWorld(program)
  for (let index = 0; index < 10; index += 1) world = tick(world)

  assert.equal(world.variables.score, 1)
  assert.equal(world.sprites.find((sprite) => sprite.id === 'apple')?.visible, false)
  assert.equal(world.status, 'running')
})

test('sprite_hidden 成功判定读取运行时显隐状态', () => {
  const lesson = body({ appleX: 131, appleCollectible: true, scoreTarget: 100, stopOnSuccess: false })
  const program = compileStageProgram(lesson, [ifTouchingApple([changeScore(1)])])
  program.successCheck = { type: 'sprite_hidden', sprite_id: 'apple' }
  const initial = createStageWorld(program)
  const next = tick(initial)

  assert.equal(initial.completed, false)
  assert.equal(next.completed, true)
})

test('两个顶层脚本每 Tick 并发推进，且顺序稳定', () => {
  const variables: ModuleStageVariable[] = [
    { id: 'score', name: 'score', initial: 0, scope: 'global' },
    { id: 'a', name: 'a', initial: 0, scope: 'global' },
    { id: 'b', name: 'b', initial: 0, scope: 'global' },
  ]
  const lesson = body({ variables, scoreTarget: 100, stopOnSuccess: false })
  const program = compileStageProgram(lesson, [
    { type: 'set_variable', args: { variable_id: 'a', value: 1 }, next: { type: 'change_variable', args: { variable_id: 'a', value: 1 } } },
    { type: 'set_variable', args: { variable_id: 'b', value: 1 }, next: { type: 'change_variable', args: { variable_id: 'b', value: 1 } } },
  ])
  const first = tick(createStageWorld(program))
  const second = tick(first)

  assert.equal(first.variables.a, 1)
  assert.equal(first.variables.b, 1)
  assert.equal(second.variables.a, 2)
  assert.equal(second.variables.b, 2)
  assert.equal(second.threads.length, 2)
})

test('场景初始脚本可控制不同精灵，且不占学生积木上限', () => {
  const lesson = body({
    maxBlocks: 1,
    appleY: 100,
    appleDirection: 180,
    initialScripts: [{
      id: 'apple-fall',
      target_sprite_id: 'apple',
      block: {
        id: 'initial-forever',
        type: 'forever',
        args: {},
        children: [{ id: 'initial-move', type: 'move_steps', args: { steps: 10 } }],
      },
    }],
  })
  const program = compileStageProgram(lesson, [move(10)])
  assert.deepEqual(program.scripts.map((script) => script.targetSpriteId), ['player', 'apple'])

  let world = createStageWorld(program)
  world = tick(world)
  assert.equal(world.sprites.find((sprite) => sprite.id === 'player')?.x, 110)
  assert.equal(world.sprites.find((sprite) => sprite.id === 'apple')?.y, 110)

  world = tick(world)
  assert.equal(world.sprites.find((sprite) => sprite.id === 'player')?.x, 110)
  assert.equal(world.sprites.find((sprite) => sprite.id === 'apple')?.y, 120)
  assert.equal(world.status, 'running')
})

test('苹果初始脚本向下移动，掉到底部后被边界挡住并正常结束', () => {
  const lesson = body({
    appleY: 300,
    appleDirection: 180,
    initialScripts: [{
      id: 'apple-fall',
      target_sprite_id: 'apple',
      block: {
        id: 'initial-repeat',
        type: 'repeat',
        args: { times: 20 },
        children: [{ id: 'initial-move', type: 'move_steps', args: { steps: 10 } }],
      },
    }],
  })
  const program = compileStageProgram(lesson, [])
  let world = createStageWorld(program)
  for (let index = 0; index < 3; index += 1) world = tick(world)
  assert.equal(world.sprites.find((sprite) => sprite.id === 'apple')?.y, 328)

  for (let index = 0; index < 18; index += 1) world = tick(world)
  assert.equal(world.status, 'finished')
  assert.ok(world.threads.every((thread) => thread.status === 'done'))
})

test('空 forever 连续运行 1000 Tick 不阻塞且正常返回', () => {
  const program = compileStageProgram(body({ scoreTarget: 100 }), [forever([])])
  let world = createStageWorld(program)
  for (let index = 0; index < 1000; index += 1) world = tick(world)

  assert.equal(world.frame, 1000)
  assert.equal(world.status, 'running')
  assert.equal(world.threads[0]?.status, 'running')
})

test('forever 会一直跑，直到主动停止或通关', () => {
  const program = compileStageProgram(body({ scoreTarget: 100 }), [forever([move(1)])])
  let world = createStageWorld(program)
  for (let index = 0; index < 20; index += 1) world = tick(world)

  assert.equal(world.frame, 20)
  assert.equal(world.sprites.find((sprite) => sprite.id === 'player')?.x, 120)
  assert.equal(world.status, 'running')
})

test('跑满步数上限就停下来，并把原因告诉前端', () => {
  // 学生写错了也不能一直空转：跑满 max_steps 就要停。
  const program = compileStageProgram(body({ scoreTarget: 100, maxSteps: 5 }), [forever([move(1)])])
  let world = createStageWorld(program)
  for (let index = 0; index < 5; index += 1) world = tick(world)

  assert.equal(world.frame, 5)
  assert.equal(world.status, 'error')
  assert.equal(world.failure?.type, 'max_steps')
  assert.match(world.failure?.message ?? '', /5 步/)
  assert.equal(world.completed, false)
})

test('repeat 保持有限循环语义', () => {
  const program = compileStageProgram(body({ scoreTarget: 100, stopOnSuccess: false }), [
    { type: 'repeat', args: { times: 3 }, children: [changeScore(1)] },
  ])
  let world = createStageWorld(program)
  world = tick(world)
  world = tick(world)
  world = tick(world)
  world = tick(world)

  assert.equal(world.variables.score, 3)
  assert.equal(world.status, 'finished')
})

test('积木总数上限跨所有顶层脚本累计', () => {
  const lesson = body({ maxBlocks: 1 })
  assert.throws(() => compileStageProgram(lesson, [move(1), move(1)]), /积木数量超过本关上限 1/)
})

test('Grid 关卡不能交给 Stage 编译器', () => {
  const grid = parseModuleLevelBody({
    schema_version: 1,
    available_blocks: [{ type: 'move_forward', label: '前进', category: '动作', kind: 'action', args: [] }],
    map: {
      width: 2,
      height: 1,
      start: { x: 0, y: 0, heading: 'E' },
      goal: { x: 1, y: 0 },
      actor: { id: 'player', asset: 'robot' },
      obstacles: [],
      entities: [],
    },
    success_check: { type: 'actor_at_goal', actor_id: 'player' },
    workspace: { initial_blocks: [], max_blocks: 1, require_connected: true },
    runtime: { out_of_bounds: 'blocked', max_steps: 2, stop_on_success: true, move_duration_ms: 0 },
    hints: [],
    completion: { stars: 3, success_text: '完成' },
  })
  assert.throws(() => compileStageProgram(grid, []), /只支持 schema_version 2/)
})
