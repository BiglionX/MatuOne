export type GridHeading = 'N' | 'E' | 'S' | 'W'
export type ModuleBlockKind = 'action' | 'sensor' | 'control'
export type ModuleBlockArgType = 'number' | 'string' | 'boolean' | 'select'
export type ModuleComparisonOperator = '==' | '!=' | '<' | '<=' | '>' | '>='
export type ModuleScalar = string | number | boolean

export interface ModuleBlockArgDefinition {
  name: string
  label: string
  type: ModuleBlockArgType
  default?: ModuleScalar
  min?: number
  max?: number
  step?: number
  options?: { value: ModuleScalar; label: string }[]
}

export interface ModuleAvailableBlock {
  type: string
  label: string
  category: string
  kind: ModuleBlockKind
  color?: string
  args: ModuleBlockArgDefinition[]
}

export interface GridPosition {
  x: number
  y: number
}

export interface ModuleLevelEntity {
  id: string
  type: string
  x: number
  y: number
  initial_state?: Record<string, ModuleScalar>
}

export interface ModuleLevelMap {
  width: number
  height: number
  start: GridPosition & { heading: GridHeading }
  goal: GridPosition
  actor: {
    id: string
    asset: string
  }
  obstacles: GridPosition[]
  entities: ModuleLevelEntity[]
}

export type ModuleSuccessCheck =
  | { type: 'actor_at_goal'; actor_id: string }
  | {
      type: 'entity_state'
      entity_id: string
      property: string
      op: ModuleComparisonOperator
      value: ModuleScalar
    }
  | { type: 'all' | 'any'; conditions: ModuleSuccessCheck[] }

export interface ModuleBlockInstance {
  id: string
  type: string
  args: Record<string, ModuleScalar>
  next?: ModuleBlockInstance | null
  children?: ModuleBlockInstance[]
}

export interface ModuleLevelBody {
  schema_version: 1
  available_blocks: ModuleAvailableBlock[]
  map: ModuleLevelMap
  success_check: ModuleSuccessCheck
  workspace: {
    initial_blocks: ModuleBlockInstance[]
    max_blocks: number
    require_connected: boolean
  }
  runtime: {
    out_of_bounds: 'blocked' | 'fail'
    max_steps: number
    stop_on_success: boolean
    move_duration_ms: number
  }
  hints: { trigger: string; text: string }[]
  completion: {
    stars: 0 | 1 | 2 | 3
    success_text: string
  }
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(path: string, message: string): never {
  throw new Error(`关卡 body 校验失败：${path} ${message}`)
}

function record(value: unknown, path: string): UnknownRecord {
  if (!isRecord(value)) fail(path, '必须是对象')
  return value
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, '必须是数组')
  return value
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(path, '必须是非空字符串')
  return value
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail(path, '必须是布尔值')
  return value
}

function integer(value: unknown, path: string, min: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
    fail(path, `必须是大于等于 ${min} 的整数`)
  }
  return value
}

function scalar(value: unknown, path: string): ModuleScalar {
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return fail(path, '必须是字符串、有限数字或布尔值')
}

function position(value: unknown, path: string, width: number, height: number): GridPosition {
  const row = record(value, path)
  const x = integer(row.x, `${path}.x`, 0)
  const y = integer(row.y, `${path}.y`, 0)
  if (x >= width || y >= height) fail(path, `坐标 (${x},${y}) 超出 ${width}×${height} 地图`)
  return { x, y }
}

function samePosition(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y
}

function parseArgDefinition(value: unknown, path: string): ModuleBlockArgDefinition {
  const row = record(value, path)
  const type = string(row.type, `${path}.type`)
  if (!['number', 'string', 'boolean', 'select'].includes(type)) fail(`${path}.type`, '不是支持的参数类型')
  const result: ModuleBlockArgDefinition = {
    name: string(row.name, `${path}.name`),
    label: string(row.label, `${path}.label`),
    type: type as ModuleBlockArgType,
  }
  if (row.default !== undefined) result.default = scalar(row.default, `${path}.default`)
  if (row.min !== undefined) result.min = row.min as number
  if (row.max !== undefined) result.max = row.max as number
  if (row.step !== undefined) result.step = row.step as number
  for (const key of ['min', 'max', 'step'] as const) {
    const item = row[key]
    if (item !== undefined && (typeof item !== 'number' || !Number.isFinite(item))) {
      fail(`${path}.${key}`, '必须是有限数字')
    }
  }
  if (result.min !== undefined && result.max !== undefined && result.min > result.max) {
    fail(path, '的 min 不能大于 max')
  }
  if (row.options !== undefined) {
    result.options = array(row.options, `${path}.options`).map((option, index) => {
      const item = record(option, `${path}.options[${index}]`)
      return { value: scalar(item.value, `${path}.options[${index}].value`), label: string(item.label, `${path}.options[${index}].label`) }
    })
    if (!result.options.length) fail(`${path}.options`, '不能为空')
  }
  if (type === 'select' && !result.options) fail(`${path}.options`, 'select 参数必须提供选项')
  return result
}

function parseAvailableBlocks(value: unknown): ModuleAvailableBlock[] {
  const rows = array(value, 'available_blocks')
  if (!rows.length) fail('available_blocks', '不能为空')
  const types = new Set<string>()
  return rows.map((item, index) => {
    const path = `available_blocks[${index}]`
    const row = record(item, path)
    const type = string(row.type, `${path}.type`)
    if (types.has(type)) fail(`${path}.type`, `积木类型 ${type} 重复`)
    types.add(type)
    const kind = string(row.kind, `${path}.kind`)
    if (!['action', 'sensor', 'control'].includes(kind)) fail(`${path}.kind`, '不是支持的积木类别')
    const args = array(row.args, `${path}.args`).map((arg, argIndex) => parseArgDefinition(arg, `${path}.args[${argIndex}]`))
    const argNames = new Set<string>()
    for (const arg of args) {
      if (argNames.has(arg.name)) fail(`${path}.args`, `参数名 ${arg.name} 重复`)
      argNames.add(arg.name)
    }
    const block: ModuleAvailableBlock = {
      type,
      label: string(row.label, `${path}.label`),
      category: string(row.category, `${path}.category`),
      kind: kind as ModuleBlockKind,
      args,
    }
    if (row.color !== undefined) block.color = string(row.color, `${path}.color`)
    return block
  })
}

function parseMap(value: unknown): ModuleLevelMap {
  const row = record(value, 'map')
  const width = integer(row.width, 'map.width', 1)
  const height = integer(row.height, 'map.height', 1)
  const startRow = record(row.start, 'map.start')
  const start = {
    ...position(startRow, 'map.start', width, height),
    heading: string(startRow.heading, 'map.start.heading') as GridHeading,
  }
  if (!['N', 'E', 'S', 'W'].includes(start.heading)) fail('map.start.heading', '必须是 N、E、S 或 W')
  const goal = position(row.goal, 'map.goal', width, height)
  const actorRow = record(row.actor, 'map.actor')
  const actor = { id: string(actorRow.id, 'map.actor.id'), asset: string(actorRow.asset, 'map.actor.asset') }
  const obstacleKeys = new Set<string>()
  const obstacles = array(row.obstacles, 'map.obstacles').map((item, index) => {
    const obstacle = position(item, `map.obstacles[${index}]`, width, height)
    const key = `${obstacle.x},${obstacle.y}`
    if (obstacleKeys.has(key)) fail(`map.obstacles[${index}]`, '障碍物坐标重复')
    obstacleKeys.add(key)
    if (samePosition(obstacle, start) || samePosition(obstacle, goal)) fail(`map.obstacles[${index}]`, '不能覆盖起点或终点')
    return obstacle
  })
  const entityIds = new Set<string>([actor.id])
  const entities = array(row.entities, 'map.entities').map((item, index) => {
    const path = `map.entities[${index}]`
    const entityRow = record(item, path)
    const id = string(entityRow.id, `${path}.id`)
    if (entityIds.has(id)) fail(`${path}.id`, `实体 ID ${id} 重复`)
    entityIds.add(id)
    const entity: ModuleLevelEntity = {
      id,
      type: string(entityRow.type, `${path}.type`),
      ...position(entityRow, path, width, height),
    }
    if (entityRow.initial_state !== undefined) {
      const state = record(entityRow.initial_state, `${path}.initial_state`)
      entity.initial_state = Object.fromEntries(
        Object.entries(state).map(([key, stateValue]) => [key, scalar(stateValue, `${path}.initial_state.${key}`)]),
      )
    }
    return entity
  })
  return { width, height, start, goal, actor, obstacles, entities }
}

function parseSuccessCheck(value: unknown, map: ModuleLevelMap, path = 'success_check'): ModuleSuccessCheck {
  const row = record(value, path)
  const type = string(row.type, `${path}.type`)
  if (type === 'actor_at_goal') {
    const actorId = string(row.actor_id, `${path}.actor_id`)
    if (actorId !== map.actor.id) fail(`${path}.actor_id`, '必须引用 map.actor.id')
    return { type, actor_id: actorId }
  }
  if (type === 'entity_state') {
    const entityId = string(row.entity_id, `${path}.entity_id`)
    if (!map.entities.some((entity) => entity.id === entityId)) fail(`${path}.entity_id`, `实体 ${entityId} 不存在`)
    const op = string(row.op, `${path}.op`)
    if (!['==', '!=', '<', '<=', '>', '>='].includes(op)) fail(`${path}.op`, '不是支持的比较运算符')
    return {
      type,
      entity_id: entityId,
      property: string(row.property, `${path}.property`),
      op: op as ModuleComparisonOperator,
      value: scalar(row.value, `${path}.value`),
    }
  }
  if (type === 'all' || type === 'any') {
    const conditions = array(row.conditions, `${path}.conditions`)
    if (!conditions.length) fail(`${path}.conditions`, '不能为空')
    return { type, conditions: conditions.map((condition, index) => parseSuccessCheck(condition, map, `${path}.conditions[${index}]`)) }
  }
  return fail(`${path}.type`, '不是支持的成功判定类型')
}

function parseBlockInstance(
  value: unknown,
  path: string,
  available: ModuleAvailableBlock[],
): ModuleBlockInstance {
  const row = record(value, path)
  const type = string(row.type, `${path}.type`)
  const definition = available.find((block) => block.type === type)
  if (!definition) fail(`${path}.type`, `积木类型 ${type} 不在 available_blocks 中`)
  const argsRow = record(row.args, `${path}.args`)
  const args: Record<string, ModuleScalar> = {}
  for (const [name, argValue] of Object.entries(argsRow)) {
    if (!definition.args.some((arg) => arg.name === name)) fail(`${path}.args.${name}`, '不是该积木定义的参数')
    args[name] = scalar(argValue, `${path}.args.${name}`)
  }
  const block: ModuleBlockInstance = { id: string(row.id, `${path}.id`), type, args }
  if (row.next !== undefined && row.next !== null) block.next = parseBlockInstance(row.next, `${path}.next`, available)
  if (row.children !== undefined) {
    block.children = array(row.children, `${path}.children`).map((child, index) => parseBlockInstance(child, `${path}.children[${index}]`, available))
  }
  return block
}

function parseWorkspace(value: unknown, available: ModuleAvailableBlock[]): ModuleLevelBody['workspace'] {
  const row = record(value, 'workspace')
  return {
    initial_blocks: array(row.initial_blocks, 'workspace.initial_blocks').map((block, index) =>
      parseBlockInstance(block, `workspace.initial_blocks[${index}]`, available),
    ),
    max_blocks: integer(row.max_blocks, 'workspace.max_blocks', 1),
    require_connected: boolean(row.require_connected, 'workspace.require_connected'),
  }
}

function parseRuntime(value: unknown): ModuleLevelBody['runtime'] {
  const row = record(value, 'runtime')
  const outOfBounds = string(row.out_of_bounds, 'runtime.out_of_bounds')
  if (outOfBounds !== 'blocked' && outOfBounds !== 'fail') fail('runtime.out_of_bounds', '必须是 blocked 或 fail')
  return {
    out_of_bounds: outOfBounds,
    max_steps: integer(row.max_steps, 'runtime.max_steps', 1),
    stop_on_success: boolean(row.stop_on_success, 'runtime.stop_on_success'),
    move_duration_ms: integer(row.move_duration_ms, 'runtime.move_duration_ms', 0),
  }
}

function parseHints(value: unknown): ModuleLevelBody['hints'] {
  const triggers = new Set<string>()
  return array(value, 'hints').map((item, index) => {
    const path = `hints[${index}]`
    const row = record(item, path)
    const trigger = string(row.trigger, `${path}.trigger`)
    if (triggers.has(trigger)) fail(`${path}.trigger`, '提示触发条件重复')
    triggers.add(trigger)
    return { trigger, text: string(row.text, `${path}.text`) }
  })
}

function parseCompletion(value: unknown): ModuleLevelBody['completion'] {
  const row = record(value, 'completion')
  const stars = integer(row.stars, 'completion.stars', 0)
  if (stars > 3) fail('completion.stars', '必须是 0 到 3 的整数')
  return { stars: stars as 0 | 1 | 2 | 3, success_text: string(row.success_text, 'completion.success_text') }
}

/** 新模块关卡正文只有一个解析入口；不按 blockly / easy-robot 分叉。 */
export function parseModuleLevelBody(raw: unknown): ModuleLevelBody {
  const row = record(raw, 'body')
  if (row.schema_version !== 1) fail('schema_version', '必须是 1')
  const availableBlocks = parseAvailableBlocks(row.available_blocks)
  const map = parseMap(row.map)
  return {
    schema_version: 1,
    available_blocks: availableBlocks,
    map,
    success_check: parseSuccessCheck(row.success_check, map),
    workspace: parseWorkspace(row.workspace, availableBlocks),
    runtime: parseRuntime(row.runtime),
    hints: parseHints(row.hints),
    completion: parseCompletion(row.completion),
  }
}
