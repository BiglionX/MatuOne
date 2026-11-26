import assert from 'node:assert/strict'
import test from 'node:test'
import { parseModuleLevelBody, gridSceneOf } from '../src/modules/curriculum/moduleLevelBody.ts'

function validBody() {
  return {
    schema_version: 1,
    available_blocks: [
      { type: 'move_forward', label: '前进', category: '动作', kind: 'action', args: [] },
    ],
    map: {
      width: 5,
      height: 1,
      start: { x: 0, y: 0, heading: 'E' },
      goal: { x: 1, y: 0 },
      actor: { id: 'player', asset: 'grid_robot' },
      obstacles: [],
      entities: [],
    },
    success_check: { type: 'actor_at_goal', actor_id: 'player' },
    workspace: { initial_blocks: [], max_blocks: 1, require_connected: true },
    runtime: { out_of_bounds: 'blocked', max_steps: 8, stop_on_success: true, move_duration_ms: 450 },
    hints: [{ trigger: 'initial', text: '把“前进”拖到工作区，再点运行。' }],
    completion: { stars: 3, success_text: '到达终点，完成！' },
  }
}

function validV2Body() {
  return {
    schema_version: 2,
    scene_type: 'grid',
    scene: {
      width: 6,
      height: 1,
      start: { x: 0, y: 0, heading: 'E' },
      goal: { x: 5, y: 0 },
      actor: { id: 'player', asset: 'grid_robot' },
      obstacles: [],
      entities: [],
    },
    available_blocks: [
      { type: 'move_forward', label: '前进', category: '动作', kind: 'action', args: [] },
      {
        type: 'repeat',
        label: '重复执行',
        category: '控制',
        kind: 'control',
        args: [{ name: 'times', label: '次数', type: 'number', default: 2, min: 1, max: 20, step: 1 }],
      },
    ],
    success_check: { type: 'actor_at_goal', actor_id: 'player' },
    workspace: { initial_blocks: [], max_blocks: 4, require_connected: true },
    runtime: { out_of_bounds: 'blocked', max_steps: 12, stop_on_success: true, move_duration_ms: 450 },
    hints: [{ trigger: 'initial', text: '把“前进”放进“重复执行”里。' }],
    completion: { stars: 3, success_text: '走到终点啦！' },
  }
}

test('合法 body 解析为共享关卡模型', () => {
  const parsed = parseModuleLevelBody(validBody())
  assert.equal(parsed.schema_version, 1)
  assert.equal(parsed.scene_type, 'grid')
  assert.equal(parsed.scene.type, 'grid')
  assert.equal(gridSceneOf(parsed).width, 5)
  assert.equal(parsed.available_blocks[0]?.type, 'move_forward')
  assert.equal(parsed.workspace.max_blocks, 1)
  assert.equal(parsed.completion.stars, 3)
})

test('缺少必需字段时抛出明确错误', () => {
  const raw = validBody()
  delete (raw as Partial<ReturnType<typeof validBody>>).map
  assert.throws(() => parseModuleLevelBody(raw), /map 必须是对象/)
})

test('schema_version 不匹配时拒绝解析', () => {
  const raw = { ...validBody(), schema_version: 3 }
  assert.throws(() => parseModuleLevelBody(raw), /schema_version 必须是 1 或 2/)
})

test('起点坐标越界时拒绝解析', () => {
  const raw = validBody()
  raw.map.start.x = 5
  assert.throws(() => parseModuleLevelBody(raw), /超出 5×1 地图/)
})

test('终点坐标越界时拒绝解析', () => {
  const raw = validBody()
  raw.map.goal.y = 1
  assert.throws(() => parseModuleLevelBody(raw), /超出 5×1 地图/)
})

test('v2 正文从 scene 字段读场景', () => {
  const parsed = parseModuleLevelBody(validV2Body())
  assert.equal(parsed.schema_version, 2)
  assert.equal(parsed.scene_type, 'grid')
  assert.equal(gridSceneOf(parsed).width, 6)
  assert.equal(gridSceneOf(parsed).goal.x, 5)
  assert.equal(parsed.available_blocks.length, 2)
  assert.equal(parsed.available_blocks[1]?.kind, 'control')
  assert.equal(parsed.available_blocks[1]?.args[0]?.name, 'times')
})

test('v2 正文缺 scene 时拒绝解析', () => {
  const raw = validV2Body()
  delete (raw as Partial<ReturnType<typeof validV2Body>>).scene
  assert.throws(() => parseModuleLevelBody(raw), /scene 必须是对象/)
})

test('v2 正文 scene_type 非法时拒绝解析', () => {
  const raw = { ...validV2Body(), scene_type: 'maze' }
  assert.throws(() => parseModuleLevelBody(raw), /scene_type 必须是 grid 或 stage/)
})

test('舞台场景也能解析，但取不到网格地图', () => {
  const raw = {
    ...validV2Body(),
    scene_type: 'stage',
    scene: {
      backdrop: 'city',
      stage_size: { width: 480, height: 360 },
      sprites: [{ id: 'hero', asset: 'hero', x: 0, y: 0, direction: 90 }],
      clones: [{ id: 'ball', asset: 'ball', spawn: { x: 'random', y: 'random' }, lifetime_steps: 10 }],
      variables: [{ id: 'score', name: 'score', initial: 0, scope: 'global' }],
      broadcasts: ['start'],
    },
    success_check: { type: 'sprite_at', sprite_id: 'hero', x: 0, y: 0 },
  }
  const parsed = parseModuleLevelBody(raw)
  assert.equal(parsed.scene_type, 'stage')
  assert.equal(parsed.scene.type, 'stage')
  assert.throws(() => gridSceneOf(parsed), /舞台场景/)
})

test('舞台场景不能配角色终点判定', () => {
  const raw = {
    ...validV2Body(),
    scene_type: 'stage',
    scene: {
      backdrop: 'city',
      stage_size: { width: 480, height: 360 },
      sprites: [],
      clones: [],
      variables: [],
      broadcasts: [],
    },
  }
  assert.throws(() => parseModuleLevelBody(raw), /只有网格场景才有角色终点/)
})

test('舞台场景的判定可以引用精灵和变量', () => {
  const raw = {
    ...validV2Body(),
    scene_type: 'stage',
    scene: {
      backdrop: 'city',
      stage_size: { width: 480, height: 360 },
      sprites: [{ id: 'hero', asset: 'hero', x: 10, y: 20 }],
      clones: [],
      variables: [{ id: 'score', name: 'score', initial: 3 }],
      broadcasts: [],
    },
    success_check: {
      type: 'all',
      conditions: [
        { type: 'sprite_at', sprite_id: 'hero', x: 10, y: 20 },
        { type: 'variable_value', variable_id: 'score', op: '>=', value: 3 },
      ],
    },
  }
  const parsed = parseModuleLevelBody(raw)
  assert.equal(parsed.success_check.type, 'all')

  const bad = {
    ...raw,
    success_check: { type: 'sprite_at', sprite_id: 'ghost', x: 0, y: 0 },
  }
  assert.throws(() => parseModuleLevelBody(bad), /精灵 ghost 不存在/)
})

test('v2 正文里的嵌套初始积木按 available_blocks 校验', () => {
  const nested = {
    ...validV2Body(),
    workspace: {
      ...validV2Body().workspace,
      initial_blocks: [
        {
          id: 'b1',
          type: 'repeat',
          args: { times: 6 },
          children: [{ id: 'b2', type: 'move_forward', args: {} }],
        },
      ],
    },
  }
  const parsed = parseModuleLevelBody(nested)
  assert.equal(parsed.workspace.initial_blocks.length, 1)
  assert.equal(parsed.workspace.initial_blocks[0]?.children?.[0]?.type, 'move_forward')

  const bad = {
    ...validV2Body(),
    workspace: {
      ...validV2Body().workspace,
      initial_blocks: [{ id: 'b1', type: 'turn_right', args: {} }],
    },
  }
  assert.throws(() => parseModuleLevelBody(bad), /积木类型 turn_right 不在 available_blocks 中/)
})
