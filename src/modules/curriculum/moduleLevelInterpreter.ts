import type { GridHeading, ModuleComparisonOperator, ModuleLevelBody, ModuleLevelEntity, ModuleScalar, ModuleSuccessCheck } from './moduleLevelBody'

export interface BlockExecutionCommand {
  type: string
  args: Record<string, ModuleScalar>
}

export interface ActorState {
  x: number
  y: number
  heading: GridHeading
  completed: boolean
}

export interface ExecutionFrame {
  step: number
  command: BlockExecutionCommand
  state: ActorState
  moved: boolean
  blocked: boolean
}

export interface ModuleExecutionResult {
  steps: ExecutionFrame[]
  final: ActorState
  completed: boolean
  blocked: boolean
  truncated: boolean
  failure?: 'out_of_bounds' | 'max_steps'
}

const VECTORS: Record<GridHeading, { x: number; y: number }> = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
}

function compare(actual: ModuleScalar, op: ModuleComparisonOperator, expected: ModuleScalar): boolean {
  switch (op) {
    case '==': return actual === expected
    case '!=': return actual !== expected
    case '<': return actual < expected
    case '<=': return actual <= expected
    case '>': return actual > expected
    case '>=': return actual >= expected
  }
}

function entityValue(entity: ModuleLevelEntity | undefined, property: string): ModuleScalar | undefined {
  return entity?.initial_state?.[property]
}

export function evaluateModuleSuccess(check: ModuleSuccessCheck, body: ModuleLevelBody, state: ActorState): boolean {
  if (check.type === 'actor_at_goal') {
    return state.x === body.map.goal.x && state.y === body.map.goal.y
  }
  if (check.type === 'entity_state') {
    const actual = entityValue(body.map.entities.find((entity) => entity.id === check.entity_id), check.property)
    return actual !== undefined && compare(actual, check.op, check.value)
  }
  if (check.type === 'all') return check.conditions.every((condition) => evaluateModuleSuccess(condition, body, state))
  return check.conditions.some((condition) => evaluateModuleSuccess(condition, body, state))
}

function copyState(state: ActorState): ActorState {
  return { ...state }
}

export function createInitialActorState(body: ModuleLevelBody): ActorState {
  const state: ActorState = {
    x: body.map.start.x,
    y: body.map.start.y,
    heading: body.map.start.heading,
    completed: false,
  }
  state.completed = evaluateModuleSuccess(body.success_check, body, state)
  return state
}

/** 纯函数解释器：只消费关卡正文和积木执行序列，不接触 React 或 DOM。 */
export function interpretModuleLevel(body: ModuleLevelBody, sequence: BlockExecutionCommand[]): ModuleExecutionResult {
  if (!Array.isArray(sequence)) throw new Error('积木执行序列必须是数组')
  if (sequence.length > body.workspace.max_blocks) {
    throw new Error(`积木数量超过本关上限 ${body.workspace.max_blocks}`)
  }

  let state = createInitialActorState(body)
  const steps: ExecutionFrame[] = []
  let cursor = 0
  let failure: ModuleExecutionResult['failure']

  while (cursor < sequence.length && steps.length < body.runtime.max_steps) {
    if (state.completed && body.runtime.stop_on_success) break
    const command = sequence[cursor]
    if (!command || typeof command.type !== 'string') throw new Error(`第 ${cursor + 1} 条指令缺少积木类型`)
    if (!body.available_blocks.some((block) => block.type === command.type)) {
      throw new Error(`积木类型 ${command.type} 不在本关 available_blocks 中`)
    }
    if (command.type !== 'move_forward') throw new Error(`当前解释器不支持积木类型 ${command.type}`)

    const vector = VECTORS[state.heading]
    const next = { x: state.x + vector.x, y: state.y + vector.y }
    const outside = next.x < 0 || next.y < 0 || next.x >= body.map.width || next.y >= body.map.height
    const obstacle = body.map.obstacles.some((item) => item.x === next.x && item.y === next.y)
    let moved = false
    let blocked = false

    if (outside || obstacle) {
      blocked = true
      if (outside && body.runtime.out_of_bounds === 'fail') {
        failure = 'out_of_bounds'
        steps.push({ step: steps.length + 1, command, state: copyState(state), moved, blocked })
        cursor += 1
        break
      }
    } else {
      state = { ...state, x: next.x, y: next.y }
      moved = true
    }

    state.completed = evaluateModuleSuccess(body.success_check, body, state)
    steps.push({ step: steps.length + 1, command, state: copyState(state), moved, blocked })
    cursor += 1
  }

  const truncated = !failure && cursor < sequence.length && !state.completed
  if (truncated) failure = 'max_steps'
  return {
    steps,
    final: copyState(state),
    completed: state.completed,
    blocked: steps.some((frame) => frame.blocked),
    truncated,
    failure,
  }
}
