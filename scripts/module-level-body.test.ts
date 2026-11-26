import assert from 'node:assert/strict'
import test from 'node:test'
import { parseModuleLevelBody } from '../src/modules/curriculum/moduleLevelBody.ts'

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

test('合法 body 解析为共享关卡模型', () => {
  const parsed = parseModuleLevelBody(validBody())
  assert.equal(parsed.schema_version, 1)
  assert.equal(parsed.map.width, 5)
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
  const raw = { ...validBody(), schema_version: 2 }
  assert.throws(() => parseModuleLevelBody(raw), /schema_version 必须是 1/)
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
