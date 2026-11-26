import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {
  parseModuleLevelBody,
  hasIntroMaterial,
  type ModuleLevelBody,
} from '../src/modules/curriculum/moduleLevelBody.ts'
import { countBlockNodes, interpretModuleLevel, type BlockExecutionNode } from '../src/modules/curriculum/moduleLevelInterpreter.ts'

/** Level 0 的 15 关正文分两个迁移文件写，这里一起读进来。 */
const MIGRATION_FILES = [
  'supabase/migrations/20261126130000_blockly_level_1_6_body_v2.sql',
  'supabase/migrations/20261126150000_blockly_level_7_15_body.sql',
]

/** 从迁移文件里抠出每关的 v2 正文，顺带验证迁移里的 JSON 真的能被解析器读懂。 */
function readMigrationBodies(): Map<string, unknown> {
  const bodies = new Map<string, unknown>()
  const pattern = /\$body\$([\s\S]*?)\$body\$::jsonb\s*where module_id = 'blockly'\s*and level_id = '(blk-\d+)'/g
  for (const file of MIGRATION_FILES) {
    const sql = readFileSync(path.join(process.cwd(), file), 'utf8')
    for (const match of sql.matchAll(pattern)) {
      const json = match[1]
      const levelId = match[2]
      assert.ok(json && levelId, '迁移文件里的正文块要同时带 JSON 和关卡号')
      bodies.set(levelId, JSON.parse(json))
    }
  }
  return bodies
}

const forward = (): BlockExecutionNode => ({ type: 'move_forward', args: {} })
const turnRight = (): BlockExecutionNode => ({ type: 'turn_right', args: {} })
const turnLeft = (): BlockExecutionNode => ({ type: 'turn_left', args: {} })
const repeat = (times: number, children: BlockExecutionNode[]): BlockExecutionNode => ({
  type: 'repeat',
  args: { times },
  children,
})
const ifWallAhead = (children: BlockExecutionNode[]): BlockExecutionNode => ({
  type: 'if_wall_ahead',
  args: {},
  children,
})
/** 如果前面有路：children[0] 是有路时的分支，children[1] 是没路时的分支。 */
const ifPathAhead = (thenBranch: BlockExecutionNode[], elseBranch: BlockExecutionNode[] = []): BlockExecutionNode => ({
  type: 'if_path_ahead',
  args: {},
  children: [thenBranch[0] ?? null, elseBranch[0] ?? null],
})
/** 通用条件积木：条件只能是 wall_ahead 或 path_ahead。 */
const ifElse = (condition: 'wall_ahead' | 'path_ahead', thenBranch: BlockExecutionNode[], elseBranch: BlockExecutionNode[] = []): BlockExecutionNode => ({
  type: 'if_else',
  args: { condition },
  children: [thenBranch[0] ?? null, elseBranch[0] ?? null],
})

/** 把同层的积木串成一条 next 链。 */
function chain(nodes: BlockExecutionNode[]): BlockExecutionNode | null {
  if (!nodes.length) return null
  const [head, ...rest] = nodes
  head.next = chain(rest)
  return head
}

const bodies = readMigrationBodies()

function bodyOf(levelId: string): ModuleLevelBody {
  const raw = bodies.get(levelId)
  assert.ok(raw, `迁移文件里应该有 ${levelId} 的正文`)
  return parseModuleLevelBody(raw)
}

/** 标准解：教研写进关卡设计稿的那一版，用来回归「这一关确实能通」。 */
const SOLUTIONS: Record<string, { program: BlockExecutionNode[]; steps: number }> = {
  // 前进 ×5
  'blk-001': { program: [chain([forward(), forward(), forward(), forward(), forward()])!], steps: 5 },
  // 前进 ×3 → 右转 → 前进 ×3（转弯也算一步）
  'blk-002': {
    program: [chain([forward(), forward(), forward(), turnRight(), forward(), forward(), forward()])!],
    steps: 7,
  },
  // 重复 6 次 { 前进 }
  'blk-003': { program: [repeat(6, [forward()])], steps: 6 },
  // 重复 3 次 { 重复 2 次 { 前进 } + 右转 } → 重复 2 次 { 前进 } → 前进
  'blk-004': {
    program: [
      chain([
        repeat(3, [repeat(2, [forward()]), turnRight()]),
        repeat(2, [forward()]),
        forward(),
      ])!,
    ],
    steps: 12,
  },
  // 重复 5 次 { 如果前面有墙 { 右转 } + 前进 }
  'blk-005': {
    program: [repeat(5, [ifWallAhead([turnRight()]), forward()])],
    steps: 6,
  },
  // 重复 5 → 右转 → 重复 2 → 右转 → 重复 5 → 左转 → 重复 2 → 左转 → 重复 5 → 右转 → 前进
  'blk-006': {
    program: [
      chain([
        repeat(5, [forward()]),
        turnRight(),
        repeat(2, [forward()]),
        turnRight(),
        repeat(5, [forward()]),
        turnLeft(),
        repeat(2, [forward()]),
        turnLeft(),
        repeat(5, [forward()]),
        turnRight(),
        forward(),
      ])!,
    ],
    steps: 25,
  },
  // 重复 2 次 { 重复 5 次 { 前进 } + 右转 + 重复 3 次 { 前进 } + 右转 }：U 型大路
  'blk-007': {
    program: [repeat(2, [repeat(5, [forward()]), turnRight(), repeat(3, [forward()]), turnRight()])],
    steps: 15,
  },
  // 前进 → 重复 4 次 { 重复 3 次 { 前进 } + 右转 }：画正方形再回到原点
  'blk-008': {
    program: [chain([forward(), repeat(4, [repeat(3, [forward()]), turnRight()])])!],
    steps: 17,
  },
  // 重复 2 次 { 重复 2 次 { 前进 } + 右转 + 重复 2 次 { 前进 } + 左转 }：转角楼梯
  'blk-009': {
    program: [repeat(2, [repeat(2, [forward()]), turnRight(), repeat(2, [forward()]), turnLeft()])],
    steps: 11,
  },
  // 重复 7 次 { 如果前面有墙 { 右转 } + 前进 }：走到尽头
  'blk-010': {
    program: [repeat(7, [ifWallAhead([turnRight()]), forward()])],
    steps: 7,
  },
  // 重复 7 次 { 如果前面有路 { 前进 } 否则 { 左转 } }：岔路口
  'blk-011': {
    program: [repeat(7, [ifPathAhead([forward()], [turnLeft()])])],
    steps: 7,
  },
  // 重复 13 次 { 如果前面有路 { 前进 } 否则 { 右转 } }：陷阱通道
  'blk-012': {
    program: [repeat(13, [ifPathAhead([forward()], [turnRight()])])],
    steps: 13,
  },
  // 之字迷宫：长直道用重复，拐弯用条件，中间一段要左转
  'blk-013': {
    program: [
      chain([
        repeat(5, [forward()]),
        repeat(4, [ifWallAhead([turnRight()]), forward()]),
        forward(),
        turnLeft(),
        repeat(2, [forward()]),
        turnLeft(),
        repeat(2, [forward()]),
      ])!,
    ],
    steps: 18,
  },
  // 回字迷宫：先用“如果前面有路”拐一次弯，再按顺序走完剩下的路
  'blk-014': {
    program: [
      chain([
        repeat(4, [forward()]),
        repeat(3, [ifPathAhead([forward()], [turnRight()])]),
        turnRight(),
        repeat(3, [forward()]),
        turnLeft(),
        repeat(2, [forward()]),
        turnRight(),
        forward(),
      ])!,
    ],
    steps: 16,
  },
  // 期末大挑战：通用条件积木“如果…否则…”两支都用上
  'blk-015': {
    program: [
      chain([
        repeat(5, [forward()]),
        repeat(4, [ifElse('wall_ahead', [turnRight()], [forward()])]),
        turnRight(),
        repeat(5, [forward()]),
        turnLeft(),
        repeat(2, [forward()]),
      ])!,
    ],
    steps: 18,
  },
}

test('迁移文件里写全了 Level 0 的 15 关正文', () => {
  assert.deepEqual(
    [...bodies.keys()].sort(),
    Array.from({ length: 15 }, (_, index) => `blk-${String(index + 1).padStart(3, '0')}`),
  )
})

test('15 关的正文都是 schema_version 2 的网格场景', () => {
  for (const levelId of Object.keys(SOLUTIONS)) {
    const body = bodyOf(levelId)
    assert.equal(body.schema_version, 2, `${levelId} 应该是 v2 正文`)
    assert.equal(body.scene_type, 'grid', `${levelId} 应该是网格场景`)
    assert.equal(body.scene.type, 'grid')
    assert.ok(body.available_blocks.length > 0)
    assert.ok(body.workspace.max_blocks > 0)
  }
})

test('标准解都能走到终点，且积木数不超上限', () => {
  for (const [levelId, solution] of Object.entries(SOLUTIONS)) {
    const body = bodyOf(levelId)
    const blockCount = countBlockNodes(solution.program)
    assert.ok(
      blockCount <= body.workspace.max_blocks,
      `${levelId} 的标准解用了 ${blockCount} 块积木，超过上限 ${body.workspace.max_blocks}`,
    )

    const result = interpretModuleLevel(body, solution.program)
    assert.equal(result.completed, true, `${levelId} 的标准解应该能通关`)
    assert.equal(result.steps.length, solution.steps, `${levelId} 的标准解步数不对`)
    assert.equal(result.failure, undefined, `${levelId} 的标准解不应该失败`)
  }
})

test('标准解用到的积木都在本关的可用积木里', () => {
  for (const [levelId, solution] of Object.entries(SOLUTIONS)) {
    const body = bodyOf(levelId)
    const available = new Set(body.available_blocks.map((block) => block.type))
    const walk = (nodes: BlockExecutionNode[]) => {
      for (const node of nodes) {
        assert.ok(available.has(node.type), `${levelId} 用到了不可用的积木 ${node.type}`)
        walk(node.children ?? [])
        if (node.next) walk([node.next])
      }
    }
    walk(solution.program)
  }
})

test('blk-004 的嵌套循环确实算成多块积木', () => {
  const body = bodyOf('blk-004')
  const solution = SOLUTIONS['blk-004']
  assert.equal(countBlockNodes(solution.program), 7)
  assert.ok(countBlockNodes(solution.program) <= body.workspace.max_blocks)
})

test('工作区积木上限拦得住超量的嵌套程序', () => {
  const body = bodyOf('blk-003')
  // 上限 4 块：两层嵌套是 4 块（repeat + repeat + repeat + 前进），刚好塞得下；
  // 再多套一层就是 5 块，超限。
  assert.equal(countBlockNodes([repeat(6, [repeat(2, [repeat(2, [forward()])])])]), 4)
  assert.ok(countBlockNodes([repeat(6, [repeat(2, [repeat(2, [forward()])])])]) <= body.workspace.max_blocks)
  assert.ok(countBlockNodes([repeat(6, [repeat(2, [repeat(2, [repeat(2, [forward()])])])])]) > body.workspace.max_blocks)
})

test('新积木的两支分支和登记表一致', () => {
  // 「如果前面有路」用在 011、012、014 三关，通用条件积木留到最后一关才登场。
  for (const levelId of ['blk-011', 'blk-012', 'blk-014']) {
    const body = bodyOf(levelId)
    const pathAhead = body.available_blocks.find((block) => block.type === 'if_path_ahead')
    assert.ok(pathAhead, `${levelId} 应该能用“如果前面有路”`)
    assert.equal(pathAhead.branches, 'then_else')
    assert.equal(
      body.available_blocks.find((block) => block.type === 'if_else'),
      undefined,
      `${levelId} 还没到学通用条件积木的时候`,
    )
  }
  const finale = bodyOf('blk-015')
  const general = finale.available_blocks.find((block) => block.type === 'if_else')
  assert.ok(general, 'blk-015 应该能用通用条件积木')
  assert.equal(general.branches, 'then_else')
  assert.equal(general.args[0]?.name, 'condition')
  assert.equal(general.args[0]?.type, 'select')
  // 单分支的控制积木形状不变，前 6 关的老正文继续能用。
  assert.equal(bodyOf('blk-005').available_blocks.find((block) => block.type === 'if_wall_ahead')?.branches, 'then')
  assert.equal(bodyOf('blk-003').available_blocks.find((block) => block.type === 'repeat')?.branches, 'then')
})

test('每关的地图都能放下起点、终点和障碍物', () => {
  for (const levelId of Object.keys(SOLUTIONS)) {
    const body = bodyOf(levelId)
    if (body.scene.type !== 'grid') continue
    const { width, height, start, goal, obstacles } = body.scene
    assert.ok(start.x < width && start.y < height, `${levelId} 起点越界`)
    assert.ok(goal.x < width && goal.y < height, `${levelId} 终点越界`)
    assert.notDeepEqual({ x: start.x, y: start.y }, goal, `${levelId} 的起点不能和终点重合`)
    for (const obstacle of obstacles) {
      assert.notDeepEqual(obstacle, { x: start.x, y: start.y }, `${levelId} 的障碍物压住了起点`)
      assert.notDeepEqual(obstacle, goal, `${levelId} 的障碍物压住了终点`)
    }
  }
})

test('陷阱通道里走错岔路就过不去', () => {
  const body = bodyOf('blk-012')
  // 在最右边那个拐角往左（北）转就钻进 (4,1) 那个死胡同，机器人会一直卡到步数用完。
  const wrong = interpretModuleLevel(body, [
    repeat(20, [ifPathAhead([forward()], [turnLeft()])]),
  ])
  assert.equal(wrong.completed, false)
  assert.equal(wrong.failure, 'max_steps')
  assert.equal(wrong.final.x, 4)
  assert.equal(wrong.final.y, 1)
})

test('没配绘本的老正文照常解析，进关时直接进工作区', () => {
  // 这一批迁移写在「绘本情境导入」之前，正文里没有 intro_story 和 review。
  // 解析器不能报错，页面要能判断出「这一关没有绘本」，直接进工作区。
  for (const levelId of Object.keys(SOLUTIONS)) {
    const body = bodyOf(levelId)
    assert.equal(body.intro_story, undefined, `${levelId} 不该有绘本`)
    assert.equal(body.review, undefined, `${levelId} 不该有复习卡`)
    assert.equal(hasIntroMaterial(body), false, `${levelId} 应该直接进工作区`)
  }
})
