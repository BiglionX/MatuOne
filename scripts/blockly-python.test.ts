import assert from 'node:assert/strict'
import test from 'node:test'
import * as blockly from 'blockly'
import * as python from 'blockly/python'
import type { ModuleAvailableBlock, ModuleStageVariable } from '../src/modules/curriculum/moduleLevelBody'
import { defineAvailableBlocks } from '../src/pages/blockly/BlocklyWorkspace'
import { definePythonGenerators, generatePythonCode } from '../src/pages/blockly/blocklyPython'

const DEFINITIONS: ModuleAvailableBlock[] = [
  {
    type: 'move_steps', label: '移动', category: '动作', kind: 'action', branches: 'then',
    args: [{ name: 'steps', label: '步数', type: 'number', default: 10, min: -100, max: 100, step: 1 }],
  },
  { type: 'turn_left', label: '左转', category: '动作', kind: 'action', branches: 'then', args: [] },
  { type: 'turn_right', label: '右转', category: '动作', kind: 'action', branches: 'then', args: [] },
  {
    type: 'set_variable', label: '设置变量', category: '变量', kind: 'action', branches: 'then',
    args: [
      { name: 'variable_id', label: '变量', type: 'variable', default: 'score-id' },
      { name: 'value', label: '设为', type: 'number', default: 0, min: -100, max: 100, step: 1 },
    ],
  },
  {
    type: 'change_variable', label: '变量增加', category: '变量', kind: 'action', branches: 'then',
    args: [
      { name: 'variable_id', label: '变量', type: 'variable', default: 'score-id' },
      { name: 'value', label: '增加', type: 'number', default: 1, min: -100, max: 100, step: 1 },
    ],
  },
  { type: 'forever', label: '无限循环', category: '控制', kind: 'control', branches: 'then', args: [] },
  {
    type: 'if_touching', label: '如果碰到', category: '控制', kind: 'control', branches: 'then',
    args: [{
      name: 'target_sprite_id', label: '精灵', type: 'select', default: 'apple',
      options: [{ value: 'apple', label: '苹果 1' }, { value: 'apple-2', label: '苹果 2' }],
    }],
  },
]

const VARIABLES: ModuleStageVariable[] = [
  { id: 'score-id', name: 'score', initial: 0, scope: 'global' },
]

function createWorkspace(): blockly.Workspace {
  const workspace = new blockly.Workspace()
  defineAvailableBlocks(blockly, DEFINITIONS)
  definePythonGenerators(python.pythonGenerator)
  return workspace
}

function addBlock(workspace: blockly.Workspace, type: string, args: Record<string, string | number | boolean> = {}): blockly.Block {
  const block = workspace.newBlock(type)
  for (const [name, value] of Object.entries(args)) block.setFieldValue(value, name)
  return block
}

function connectBody(parent: blockly.Block, child: blockly.Block): void {
  const connection = parent.getInput('BODY')?.connection
  assert.ok(connection)
  assert.ok(child.previousConnection)
  connection.connect(child.previousConnection)
}

function connectNext(parent: blockly.Block, child: blockly.Block): void {
  assert.ok(parent.nextConnection)
  assert.ok(child.previousConnection)
  parent.nextConnection.connect(child.previousConnection)
}

test('核心自定义积木都注册了 Python 生成器', () => {
  definePythonGenerators(python.pythonGenerator)
  for (const definition of DEFINITIONS) {
    assert.equal(typeof python.pythonGenerator.forBlock[definition.type], 'function', definition.type)
  }
  assert.equal(typeof python.pythonGenerator.forBlock.controls_if, 'function', '官方标准积木规则不被覆盖')
})

test('移动和左右转生成可直接阅读的 robot 函数调用', () => {
  const workspace = createWorkspace()
  const move = addBlock(workspace, 'move_steps', { steps: -10 })
  const left = addBlock(workspace, 'turn_left')
  const right = addBlock(workspace, 'turn_right')
  connectNext(move, left)
  connectNext(left, right)

  const code = generatePythonCode(python.pythonGenerator, workspace, DEFINITIONS)
  assert.ok(code.includes('import robot\n'))
  assert.ok(code.endsWith('move_steps(-10)\nturn_left()\nturn_right()\n'))
  workspace.dispose()
})

test('变量、无限循环和碰撞判断生成缩进正确的 Python', () => {
  const workspace = createWorkspace()
  const setScore = addBlock(workspace, 'set_variable', { variable_id: 'score-id', value: 0 })
  const forever = addBlock(workspace, 'forever')
  const move = addBlock(workspace, 'move_steps', { steps: 10 })
  const touching = addBlock(workspace, 'if_touching', { target_sprite_id: 'apple' })
  const change = addBlock(workspace, 'change_variable', { variable_id: 'score-id', value: 1 })
  connectNext(setScore, forever)
  connectBody(forever, move)
  connectNext(move, touching)
  connectBody(touching, change)

  const code = generatePythonCode(python.pythonGenerator, workspace, DEFINITIONS, VARIABLES)
  assert.ok(code.includes('score = 0\n\nscore = 0\nwhile True:\n'), code)
  assert.ok(code.endsWith("while True:\n  move_steps(10)\n  if is_touching('apple'):\n    score += 1\n"))
  workspace.dispose()
})

test('字段修改后再次生成会读取最新值，空循环也有合法 pass', () => {
  const workspace = createWorkspace()
  const move = addBlock(workspace, 'move_steps', { steps: 10 })
  const emptyLoop = addBlock(workspace, 'forever')
  connectNext(move, emptyLoop)

  const before = generatePythonCode(python.pythonGenerator, workspace, DEFINITIONS)
  assert.ok(before.includes('move_steps(10)'))
  move.setFieldValue(25, 'steps')
  const after = generatePythonCode(python.pythonGenerator, workspace, DEFINITIONS)
  assert.ok(after.includes('move_steps(25)'))
  assert.ok(after.endsWith('while True:\n  pass\n'))
  workspace.dispose()
})

test('空工作区返回带导入和操作提示的预览', () => {
  const workspace = createWorkspace()
  const code = generatePythonCode(python.pythonGenerator, workspace, DEFINITIONS)
  assert.ok(code.includes('import robot\n'))
  assert.ok(code.includes('工作区还是空的'))
  workspace.dispose()
})
