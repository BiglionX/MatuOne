import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { parseModuleLevelBody, type ModuleLevelBody } from '../src/modules/curriculum/moduleLevelBody.ts'
import { countBlockNodes, interpretModuleLevel, type BlockExecutionNode } from '../src/modules/curriculum/moduleLevelInterpreter.ts'

const MIGRATION_FILE = 'supabase/migrations/20261126130000_blockly_level_1_6_body_v2.sql'

/** 从迁移文件里抠出每关的 v2 正文，顺带验证迁移里的 JSON 真的能被解析器读懂。 */
function readMigrationBodies(): Map<string, unknown> {
  const sql = readFileSync(path.join(process.cwd(), MIGRATION_FILE), 'utf8')
  const bodies = new Map<string, unknown>()
  const pattern = /\$body\$([\s\S]*?)\$body\$::jsonb\s*where module_id = 'blockly'\s*and level_id = '(blk-\d+)'/g
  for (const match of sql.matchAll(pattern)) {
    const json = match[1]
    const levelId = match[2]
    assert.ok(json && levelId, '迁移文件里的正文块要同时带 JSON 和关卡号')
    bodies.set(levelId, JSON.parse(json))
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
}

test('迁移文件里写全了前 6 关的 v2 正文', () => {
  assert.deepEqual([...bodies.keys()].sort(), ['blk-001', 'blk-002', 'blk-003', 'blk-004', 'blk-005', 'blk-006'])
})

test('前 6 关的正文都是 schema_version 2 的网格场景', () => {
  for (const levelId of Object.keys(SOLUTIONS)) {
    const body = bodyOf(levelId)
    assert.equal(body.schema_version, 2, `${levelId} 应该是 v2 正文`)
    assert.equal(body.scene_type, 'grid', `${levelId} 应该是网格场景`)
    assert.equal(body.scene.type, 'grid')
    assert.ok(body.available_blocks.length > 0)
    assert.ok(body.workspace.max_blocks > 0)
  }
})

test('前 6 关的标准解都能走到终点，且积木数不超上限', () => {
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
