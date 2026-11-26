import type {
  GridHeading,
  ModuleComparisonOperator,
  ModuleGridScene,
  ModuleLevelBody,
  ModuleLevelEntity,
  ModuleScalar,
  ModuleSuccessCheck,
} from './moduleLevelBody'

/** 积木执行树的一个节点。next 是同一层的下一块，children 是控制积木的嵌套内容。 */
export interface BlockExecutionNode {
  type: string
  args: Record<string, ModuleScalar>
  next?: BlockExecutionNode | null
  children?: BlockExecutionNode[]
}

export interface ActorState {
  x: number
  y: number
  heading: GridHeading
  completed: boolean
}

export interface ExecutionFrame {
  step: number
  command: { type: string; args: Record<string, ModuleScalar> }
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

/** 顺时针转一格：E → S → W → N → E。 */
const TURN_RIGHT: Record<GridHeading, GridHeading> = { E: 'S', S: 'W', W: 'N', N: 'E' }
/** 逆时针转一格。 */
const TURN_LEFT: Record<GridHeading, GridHeading> = { E: 'N', N: 'W', W: 'S', S: 'E' }

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
    if (body.scene.type !== 'grid') return false
    return state.x === body.scene.goal.x && state.y === body.scene.goal.y
  }
  if (check.type === 'entity_state') {
    if (body.scene.type !== 'grid') return false
    const actual = entityValue(body.scene.entities.find((entity) => entity.id === check.entity_id), check.property)
    return actual !== undefined && compare(actual, check.op, check.value)
  }
  if (check.type === 'sprite_at') {
    if (body.scene.type !== 'stage') return false
    const sprite = body.scene.sprites.find((item) => item.id === check.sprite_id)
    return sprite ? sprite.x === check.x && sprite.y === check.y : false
  }
  if (check.type === 'variable_value') {
    if (body.scene.type !== 'stage') return false
    const variable = body.scene.variables.find((item) => item.id === check.variable_id)
    return variable ? compare(variable.initial, check.op, check.value) : false
  }
  if (check.type === 'all') return check.conditions.every((condition) => evaluateModuleSuccess(condition, body, state))
  return check.conditions.some((condition) => evaluateModuleSuccess(condition, body, state))
}

function copyState(state: ActorState): ActorState {
  return { ...state }
}

/** 工作区积木总数：顶层积木 + next 链 + 嵌套子块。和 Blockly 自己的 maxBlocks 口径一致。 */
export function countBlockNodes(nodes: readonly (BlockExecutionNode | null | undefined)[]): number {
  let total = 0
  for (const node of nodes) {
    if (!node) continue
    total += 1
    total += countBlockNodes(node.children ?? [])
    if (node.next) total += countBlockNodes([node.next])
  }
  return total
}

/** 重复次数允许来自 Blockly 字段的字符串。 */
function coerceCount(value: ModuleScalar | undefined, path: string): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim())
  throw new Error(`关卡 body 校验失败：${path} 重复次数必须是非负整数`)
}

function gridScene(body: ModuleLevelBody): ModuleGridScene {
  if (body.scene.type !== 'grid') throw new Error('当前解释器只支持网格场景')
  return body.scene
}

/** 纯函数解释器：只消费关卡正文和积木执行树，不接触 React 或 DOM。 */
export function interpretModuleLevel(body: ModuleLevelBody, blocks: readonly (BlockExecutionNode | null | undefined)[]): ModuleExecutionResult {
  const scene = gridScene(body)

  // max_blocks 是工作区积木总数（含嵌套），不是展开后的执行步数。
  const blockCount = countBlockNodes(blocks)
  if (blockCount > body.workspace.max_blocks) {
    throw new Error(`积木数量超过本关上限 ${body.workspace.max_blocks}`)
  }

  const availableTypes = new Set(body.available_blocks.map((block) => block.type))
  const steps: ExecutionFrame[] = []
  let state = createInitialActorState(body)
  let failure: ModuleExecutionResult['failure']
  let truncated = false
  let blocked = false

  const stopOnSuccess = () => state.completed && body.runtime.stop_on_success
  const outOfSteps = () => steps.length >= body.runtime.max_steps

  const pushFrame = (command: { type: string; args: Record<string, ModuleScalar> }, moved: boolean, wasBlocked: boolean) => {
    steps.push({ step: steps.length + 1, command, state: copyState(state), moved, blocked: wasBlocked })
  }

  const moveForward = (node: BlockExecutionNode) => {
    const vector = VECTORS[state.heading]
    const next = { x: state.x + vector.x, y: state.y + vector.y }
    const outside = next.x < 0 || next.y < 0 || next.x >= scene.width || next.y >= scene.height
    const obstacle = scene.obstacles.some((item) => item.x === next.x && item.y === next.y)

    if (outside || obstacle) {
      blocked = true
      if (outside && body.runtime.out_of_bounds === 'fail') {
        failure = 'out_of_bounds'
        pushFrame({ type: node.type, args: node.args }, false, true)
        return
      }
    } else {
      state = { ...state, x: next.x, y: next.y }
    }

    state.completed = evaluateModuleSuccess(body.success_check, body, state)
    pushFrame({ type: node.type, args: node.args }, !outside && !obstacle, outside || obstacle)
  }

  const turn = (node: BlockExecutionNode, next: GridHeading) => {
    state = { ...state, heading: next }
    state.completed = evaluateModuleSuccess(body.success_check, body, state)
    pushFrame({ type: node.type, args: node.args }, false, false)
  }

  const wallAhead = (): boolean => {
    const vector = VECTORS[state.heading]
    const next = { x: state.x + vector.x, y: state.y + vector.y }
    if (next.x < 0 || next.y < 0 || next.x >= scene.width || next.y >= scene.height) return true
    return scene.obstacles.some((item) => item.x === next.x && item.y === next.y)
  }

  const executeChain = (first: BlockExecutionNode | null | undefined) => {
    let node = first
    while (node) {
      if (failure || truncated || stopOnSuccess()) return
      executeNode(node)
      node = node.next ?? undefined
    }
  }

  /**
   * 执行控制积木的嵌套体。
   *
   * children 是「嵌套链的链头列表」：每一项自己带一条 next 链，按顺序依次执行。
   * 数据库里 children 是平铺数组，工作区读出来的树里 children 只有链头一项，
   * 两种写法在这里都能正确跑。
   */
  const executeChildren = (node: BlockExecutionNode) => {
    for (const child of node.children ?? []) {
      executeChain(child)
      if (failure || truncated || stopOnSuccess()) return
    }
  }

  const executeNode = (node: BlockExecutionNode) => {
    if (!availableTypes.has(node.type)) {
      throw new Error(`积木类型 ${node.type} 不在本关 available_blocks 中`)
    }
    // 控制积木本身不计步，步数只算动作积木。
    if (node.type === 'repeat') {
      const times = coerceCount(node.args.times, 'repeat.times')
      for (let index = 0; index < times; index += 1) {
        executeChildren(node)
        if (failure || truncated || stopOnSuccess()) return
      }
      return
    }
    if (node.type === 'if_wall_ahead') {
      if (wallAhead()) executeChildren(node)
      return
    }
    if (outOfSteps()) {
      truncated = true
      failure = 'max_steps'
      return
    }
    if (node.type === 'move_forward') {
      moveForward(node)
      return
    }
    if (node.type === 'turn_left') {
      turn(node, TURN_LEFT[state.heading])
      return
    }
    if (node.type === 'turn_right') {
      turn(node, TURN_RIGHT[state.heading])
      return
    }
    throw new Error(`当前解释器不支持积木类型 ${node.type}`)
  }

  for (const top of blocks) {
    if (failure || truncated || stopOnSuccess()) break
    executeChain(top)
  }

  // 步数用完还有积木没跑完，就是被截断。
  if (!failure && !truncated && !state.completed && steps.length >= body.runtime.max_steps) {
    truncated = true
    failure = 'max_steps'
  }

  return {
    steps,
    final: copyState(state),
    completed: state.completed,
    blocked,
    truncated,
    failure,
  }
}

export function createInitialActorState(body: ModuleLevelBody): ActorState {
  const scene = gridScene(body)
  const state: ActorState = {
    x: scene.start.x,
    y: scene.start.y,
    heading: scene.start.heading,
    completed: false,
  }
  state.completed = evaluateModuleSuccess(body.success_check, body, state)
  return state
}