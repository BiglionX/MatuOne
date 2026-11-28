import type { Block, Workspace } from 'blockly'
import type { PythonGenerator } from 'blockly/python'
import type { ModuleAvailableBlock, ModuleScalar, ModuleStageVariable } from '@/modules/curriculum/moduleLevelBody'

/** 控制积木的嵌套体输入名，和 BlocklyWorkspace 保持一致。 */
const BODY_INPUT = 'BODY'
const ELSE_INPUT = 'ELSE'

export interface PythonCodeSnapshot {
  code: string
  error: string | null
}

interface PythonWorkspaceContext {
  definitions: readonly ModuleAvailableBlock[]
  variables: readonly ModuleStageVariable[]
}

/** 生成器函数按工作区取关卡元数据，避免全局单例缓存住上一关的变量或选项。 */
const workspaceContexts = new WeakMap<Workspace, PythonWorkspaceContext>()

function contextOf(workspace: Workspace): PythonWorkspaceContext {
  const context = workspaceContexts.get(workspace)
  if (!context) throw new Error('积木工作区还没有注册 Python 生成规则')
  return context
}

function fieldValue(block: Block, name: string): ModuleScalar {
  const value = block.getFieldValue(name)
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return ''
}

function pythonLiteral(value: ModuleScalar, generator: PythonGenerator): string {
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '0'
  return generator.quote_(value)
}

function pythonIdentifier(value: string): string {
  const normalized = value.replace(/[^\p{L}\p{N}_]/gu, '_') || 'variable'
  return /^\d/.test(normalized) ? `_${normalized}` : normalized
}

function variableName(block: Block, generator: PythonGenerator): string {
  const variableId = String(fieldValue(block, 'variable_id'))
  const variable = contextOf(block.workspace).variables.find((item) => item.id === variableId)
  return pythonIdentifier(variable?.name ?? variableId)
}

function statementBody(block: Block, generator: PythonGenerator, inputName = BODY_INPUT): string {
  return generator.statementToCode(block, inputName) || generator.PASS
}

function gridCondition(condition: ModuleScalar): string {
  return condition === 'wall_ahead' ? 'wall_ahead()' : 'path_ahead()'
}

/**
 * 注册项目自定义积木的 Python 生成器。
 *
 * 这些积木是按关卡正文动态定义的，Blockly 官方生成器不认识；
 * 标准积木继续使用 blockly/python 自带的规则，这里不覆盖。
 */
export function definePythonGenerators(generator: PythonGenerator): void {
  generator.forBlock.move_forward = () => 'move_forward()\n'
  generator.forBlock.move_steps = (block) =>
    `move_steps(${pythonLiteral(fieldValue(block, 'steps'), generator)})\n`
  generator.forBlock.turn_left = () => 'turn_left()\n'
  generator.forBlock.turn_right = () => 'turn_right()\n'

  generator.forBlock.set_variable = (block) =>
    `${variableName(block, generator)} = ${pythonLiteral(fieldValue(block, 'value'), generator)}\n`
  generator.forBlock.change_variable = (block) =>
    `${variableName(block, generator)} += ${pythonLiteral(fieldValue(block, 'value'), generator)}\n`

  generator.forBlock.repeat = (block) => {
    const times = fieldValue(block, 'times')
    const count = typeof times === 'number' && Number.isFinite(times) ? Math.max(0, Math.trunc(times)) : 0
    return `for _ in range(${count}):\n${statementBody(block, generator)}`
  }
  generator.forBlock.forever = (block) =>
    `while True:\n${statementBody(block, generator)}`
  generator.forBlock.if_touching = (block) => {
    const target = pythonLiteral(fieldValue(block, 'target_sprite_id'), generator)
    return `if is_touching(${target}):\n${statementBody(block, generator)}`
  }

  generator.forBlock.if_wall_ahead = (block) =>
    `if wall_ahead():\n${statementBody(block, generator)}`
  generator.forBlock.if_path_ahead = (block) =>
    `if path_ahead():\n${statementBody(block, generator)}else:\n${statementBody(block, generator, ELSE_INPUT)}`
  generator.forBlock.if_else = (block) =>
    `if ${gridCondition(fieldValue(block, 'condition'))}:\n${statementBody(block, generator)}else:\n${statementBody(block, generator, ELSE_INPUT)}`

  // 克隆体在克隆启动时执行；预览里用独立函数表达，保持 Python 语法完整。
  generator.forBlock.clone = (block) => {
    const cloneId = String(fieldValue(block, 'clone_id'))
    const definition = contextOf(block.workspace).definitions.find((item) => item.type === 'clone')
    const label = definition?.label.replace(/[\r\n]+/g, ' ') ?? cloneId
    return `# ${label}「${cloneId}」启动时执行\ndef on_clone_${pythonIdentifier(cloneId)}():\n${statementBody(block, generator)}`
  }
}

/** 生成工作区当前积木对应的只读 Python 预览。 */
export function generatePythonCode(
  generator: PythonGenerator,
  workspace: Workspace,
  definitions: readonly ModuleAvailableBlock[],
  variables: readonly ModuleStageVariable[] = [],
): string {
  workspaceContexts.set(workspace, { definitions, variables })
  const program = generator.workspaceToCode(workspace).trimEnd()
  const header = [
    '# 由 MatuOne 积木自动生成，可在这里预览 Python 写法',
    'import robot',
  ]
  const initialVariables = variables.map((variable) =>
    `${pythonIdentifier(variable.name)} = ${pythonLiteral(variable.initial, generator)}`,
  )
  const emptyHint = '# 工作区还是空的，拖入积木后这里会自动更新。'
  return [...header, '', ...(initialVariables.length ? [...initialVariables, ''] : []), program || emptyHint, ''].join('\n')
}
