import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  parseModuleLevelBody,
  gridSceneOf,
  hasIntroMaterial,
} from '../src/modules/curriculum/moduleLevelBody.ts'
import { checkTeachingStep, hasDifferentParam } from '../src/modules/curriculum/teachingSteps.ts'
import type { BlockExecutionNode } from '../src/modules/curriculum/moduleLevelInterpreter.ts'

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
      sprites: [{ id: 'hero', asset: 'hero', x: 10, y: 20, collectible: true }],
      clones: [],
      variables: [{ id: 'score', name: 'score', initial: 3 }],
      broadcasts: [],
    },
    success_check: {
      type: 'all',
      conditions: [
        { type: 'sprite_at', sprite_id: 'hero', x: 10, y: 20 },
        { type: 'sprite_hidden', sprite_id: 'hero' },
        { type: 'variable_value', variable_id: 'score', op: '>=', value: 3 },
      ],
    },
  }
  const parsed = parseModuleLevelBody(raw)
  assert.equal(parsed.success_check.type, 'all')
  assert.equal(parsed.scene.type === 'stage' && parsed.scene.sprites[0]?.collectible, true)

  const bad = {
    ...raw,
    success_check: { type: 'sprite_at', sprite_id: 'ghost', x: 0, y: 0 },
  }
  assert.throws(() => parseModuleLevelBody(bad), /精灵 ghost 不存在/)
  assert.throws(() => parseModuleLevelBody({ ...raw, success_check: { type: 'sprite_hidden', sprite_id: 'ghost' } }), /精灵 ghost 不存在/)
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

// ---------------------------------------------------------------------------
// 绘本情境导入与课前复习
// ---------------------------------------------------------------------------

test('没配绘本和复习卡的旧关卡照常解析', () => {
  const parsed = parseModuleLevelBody(validBody())
  assert.equal(parsed.intro_story, undefined)
  assert.equal(parsed.review, undefined)
  assert.equal(hasIntroMaterial(parsed), false)
})

test('绘本和复习卡都能从正文读出来', () => {
  const raw = {
    ...validV2Body(),
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '欢迎来到第一关！' },
      { type: 'image_text', image: 'robot_wave', content: '点这个绿色按钮，机器人就会动起来哦！' },
    ],
    review: { question: '还记得上节课我们学了什么积木吗？', answer: '前进积木！', hint: '就是那个绿色的箭头哦。' },
  }
  const parsed = parseModuleLevelBody(raw)
  assert.equal(parsed.intro_story?.length, 2)
  assert.equal(parsed.intro_story?.[0]?.type, 'text')
  assert.equal(parsed.intro_story?.[0]?.speaker, '小精灵')
  assert.equal(parsed.intro_story?.[1]?.type, 'image_text')
  assert.equal(parsed.intro_story?.[1]?.image, 'robot_wave')
  // 说话人和提示都是可选的。
  assert.equal(parsed.intro_story?.[1]?.speaker, undefined)
  assert.equal(parsed.review?.question, '还记得上节课我们学了什么积木吗？')
  assert.equal(parsed.review?.answer, '前进积木！')
  assert.equal(parsed.review?.hint, '就是那个绿色的箭头哦。')
  assert.equal(hasIntroMaterial(parsed), true)
})

test('只配了复习卡也算有进关引导', () => {
  const parsed = parseModuleLevelBody({
    ...validV2Body(),
    review: { question: '上一关学了什么？', answer: '前进积木。' },
  })
  assert.equal(parsed.intro_story, undefined)
  assert.equal(parsed.review?.hint, undefined)
  assert.equal(hasIntroMaterial(parsed), true)
})

test('绘本页类型非法时拒绝解析', () => {
  const raw = {
    ...validV2Body(),
    intro_story: [{ type: 'comic', content: '画得好看一点' }],
  }
  assert.throws(() => parseModuleLevelBody(raw), /intro_story\[0\].type 必须是 text 或 image_text/)
})

test('绘本页缺正文时拒绝解析', () => {
  const raw = {
    ...validV2Body(),
    intro_story: [{ type: 'text', speaker: '小精灵' }],
  }
  assert.throws(() => parseModuleLevelBody(raw), /intro_story\[0\].content 必须是非空字符串/)
})

test('配图页没给插画时拒绝解析', () => {
  const raw = {
    ...validV2Body(),
    intro_story: [{ type: 'image_text', content: '看这个机器人' }],
  }
  assert.throws(() => parseModuleLevelBody(raw), /intro_story\[0\].image image_text 必须指定插画/)
})

test('空绘本数组拒绝解析', () => {
  const raw = { ...validV2Body(), intro_story: [] }
  assert.throws(() => parseModuleLevelBody(raw), /intro_story 不能为空/)
})

test('复习卡缺答案时拒绝解析', () => {
  const raw = {
    ...validV2Body(),
    review: { question: '上一关学了什么？' },
  }
  assert.throws(() => parseModuleLevelBody(raw), /review.answer 必须是非空字符串/)
})

test('复习卡必须是对象', () => {
  const raw = { ...validV2Body(), review: '上一关学了什么？' }
  assert.throws(() => parseModuleLevelBody(raw), /review 必须是对象/)
})

const stageManifest = JSON.parse(
  readFileSync(new URL('./generated/blockly-stage-80.manifest.json', import.meta.url), 'utf8'),
) as { levels: { levelId: string; body: unknown; solution: BlockExecutionNode[] }[] }
const level161 = stageManifest.levels.find((level) => level.levelId === 'blk-161')!
const steps161 = parseModuleLevelBody(level161.body).teaching_steps!

function allNodes(nodes: readonly (BlockExecutionNode | null)[]): BlockExecutionNode[] {
  const out: BlockExecutionNode[] = []
  for (const node of nodes) {
    if (!node) continue
    out.push(node)
    if (node.children) out.push(...allNodes(node.children))
    if (node.next) out.push(...allNodes([node.next]))
  }
  return out
}

test('161 关的分步引导条件都能被标准解满足', () => {
  assert.ok(steps161.length >= 4)
  for (const step of steps161) {
    assert.equal(checkTeachingStep(step, level161.solution).ok, true, step.text)
  }
})

test('漏掉 apple-2 的如果碰到时，最后一步不通过并点名 apple-2', () => {
  const tree = structuredClone(level161.solution)
  const forever = allNodes(tree).find((node) => node.type === 'forever')!
  const inner = allNodes(forever.children ?? [])
  const touch = inner.find((node) => node.args.target_sprite_id === 'apple-2')!
  const move = inner.find((node) => node.type === 'move_steps')!
  let cursor = move
  while (cursor.next && cursor.next !== touch) cursor = cursor.next
  assert.equal(cursor.next, touch)
  cursor.next = touch.next ?? null

  const last = steps161[steps161.length - 1]
  assert.match(last.text, /apple-2/)
  const result = checkTeachingStep(last, tree)
  assert.equal(result.ok, false)
  assert.match(result.message, /apple-2/)
})

test('苹果加分不对时最后一步也不通过', () => {
  const tree = structuredClone(level161.solution)
  const touch = allNodes(tree).find((node) => node.args.target_sprite_id === 'apple-2')!
  const change = allNodes(touch.children ?? []).find((node) => node.type === 'change_variable')!
  change.args.value = 2
  assert.equal(checkTeachingStep(steps161[steps161.length - 1], tree).ok, false)
})

test('通关后问的是改移动步数，只有真改了参数才算试过', () => {
  const reflection = parseModuleLevelBody(level161.body).reflection!
  assert.equal(reflection.target.type, 'move_steps')
  assert.equal(reflection.target.arg, 'steps')
  assert.equal(reflection.target.current, 6)
  assert.equal(reflection.target.suggested, 3)
  assert.match(reflection.question, /6 步改成 3 步/)

  assert.equal(hasDifferentParam(level161.solution, 'move_steps', 'steps', 6), false)
  const changed = structuredClone(level161.solution)
  allNodes(changed).find((node) => node.type === 'move_steps')!.args.steps = 3
  assert.equal(hasDifferentParam(changed, 'move_steps', 'steps', 6), true)
})

const gridManifests = [
  { name: 'Level 0', data: JSON.parse(readFileSync(new URL('./generated/blockly-80.manifest.json', import.meta.url), 'utf8')) },
  { name: 'Level 1', data: JSON.parse(readFileSync(new URL('./generated/blockly-level-1-80.manifest.json', import.meta.url), 'utf8')) },
] as { name: string; data: { levels: { levelId: string; body: unknown; solution: BlockExecutionNode[] }[] } }[]

test('网格关：纯直线保持原样，其余关卡的引导与思考题都被标准解通过', () => {
  for (const { name, data } of gridManifests) {
    assert.equal(data.levels.length, 80, `${name} 关数`)
    for (const level of data.levels) {
      const body = parseModuleLevelBody(level.body)
      const nodes = allNodes(level.solution)
      const pureStraight = nodes.every((node) => node.type === 'move_forward')
      const hasRepeat = nodes.some((node) => node.type === 'repeat')
      if (pureStraight) {
        assert.equal(body.teaching_steps, undefined, `${level.levelId} 纯直线不该拆步骤`)
        assert.equal(body.reflection, undefined, `${level.levelId} 纯直线没有可改参数`)
        continue
      }
      assert.ok(body.teaching_steps?.length, `${level.levelId} 缺分步引导`)
      for (const step of body.teaching_steps) {
        assert.equal(checkTeachingStep(step, level.solution).ok, true, `${level.levelId}: ${step.text}`)
      }
      if (hasRepeat) {
        assert.ok(body.reflection, `${level.levelId} 缺通关思考题`)
        const { type, arg, current, within, ancestorArgs, nth } = body.reflection.target
        assert.equal(hasDifferentParam(level.solution, type, arg, current, within, ancestorArgs, nth), false, `${level.levelId} 标准解不该触发思考题`)
      } else {
        assert.equal(body.reflection, undefined, `${level.levelId} 没有可改参数`)
      }
    }
  }
})

test('全部 160 关都有分步引导和通关思考题，且标准解通过每一步', () => {
  assert.equal(stageManifest.levels.length, 160)
  for (const level of stageManifest.levels) {
    const body = parseModuleLevelBody(level.body)
    assert.ok(body.teaching_steps?.length, `${level.levelId} 缺分步引导`)
    assert.ok(body.reflection, `${level.levelId} 缺通关思考题`)
    for (const step of body.teaching_steps) {
      assert.equal(checkTeachingStep(step, level.solution).ok, true, `${level.levelId}: ${step.text}`)
    }
    const { type, arg, current, within, ancestorArgs } = body.reflection.target
    assert.equal(hasDifferentParam(level.solution, type, arg, current, within, ancestorArgs), false, `${level.levelId} 标准解不该触发思考题`)
  }
})
