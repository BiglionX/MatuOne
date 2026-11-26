export type GridHeading = 'N' | 'E' | 'S' | 'W'
export type ModuleBlockKind = 'action' | 'sensor' | 'control'
export type ModuleBlockArgType = 'number' | 'string' | 'boolean' | 'select'
export type ModuleComparisonOperator = '==' | '!=' | '<' | '<=' | '>' | '>='
export type ModuleScalar = string | number | boolean

/** 场景形态：grid 网格闯关 / stage 自由舞台。 */
export type ModuleSceneType = 'grid' | 'stage'

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

/** 网格场景。字段和早期的 body.map 完全一致，只是换了位置。 */
export interface ModuleGridScene {
  type: 'grid'
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

export interface ModuleStageSprite {
  id: string
  asset: string
  x: number
  y: number
  direction?: number
  size?: number
  visible?: boolean
  costumes?: string[]
}

export interface ModuleStageClone {
  id: string
  asset: string
  spawn: { x: number | 'random'; y: number | 'random' }
  lifetime_steps?: number
}

export interface ModuleStageVariable {
  id: string
  name: string
  initial: ModuleScalar
  scope?: 'global' | 'local'
}

/** 舞台场景。二年级上开始用，现在只落数据结构，不做渲染和运行。 */
export interface ModuleStageScene {
  type: 'stage'
  backdrop: string
  stage_size: { width: number; height: number }
  sprites: ModuleStageSprite[]
  clones: ModuleStageClone[]
  variables: ModuleStageVariable[]
  broadcasts: string[]
}

export type ModuleScene = ModuleGridScene | ModuleStageScene

export type ModuleSuccessCheck =
  | { type: 'actor_at_goal'; actor_id: string }
  | {
      type: 'entity_state'
      entity_id: string
      property: string
      op: ModuleComparisonOperator
      value: ModuleScalar
    }
  | { type: 'sprite_at'; sprite_id: string; x: number; y: number }
  | { type: 'variable_value'; variable_id: string; op: ModuleComparisonOperator; value: ModuleScalar }
  | { type: 'all' | 'any'; conditions: ModuleSuccessCheck[] }

export interface ModuleBlockInstance {
  id: string
  type: string
  args: Record<string, ModuleScalar>
  next?: ModuleBlockInstance | null
  children?: ModuleBlockInstance[]
}

export interface ModuleLevelBody {
  /** 1 是旧格式（场景数据在 body.map），2 是当前格式（场景数据在 body.scene）。 */
  schema_version: 1 | 2
  scene_type: ModuleSceneType
  scene: ModuleScene
  available_blocks: ModuleAvailableBlock[]
  success_check: ModuleSuccessCheck
  workspace: {
    initial_blocks: ModuleBlockInstance[]
    /** 工作区积木总数（含嵌套子块），不是展开后的执行步数。 */
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

function number(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, '必须是有限数字')
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

function parseGridScene(value: unknown, path: string): ModuleGridScene {
  const row = record(value, path)
  const width = integer(row.width, `${path}.width`, 1)
  const height = integer(row.height, `${path}.height`, 1)
  const startRow = record(row.start, `${path}.start`)
  const start = {
    ...position(startRow, `${path}.start`, width, height),
    heading: string(startRow.heading, `${path}.start.heading`) as GridHeading,
  }
  if (!['N', 'E', 'S', 'W'].includes(start.heading)) fail(`${path}.start.heading`, '必须是 N、E、S 或 W')
  const goal = position(row.goal, `${path}.goal`, width, height)
  const actorRow = record(row.actor, `${path}.actor`)
  const actor = { id: string(actorRow.id, `${path}.actor.id`), asset: string(actorRow.asset, `${path}.actor.asset`) }
  const obstacleKeys = new Set<string>()
  const obstacles = array(row.obstacles, `${path}.obstacles`).map((item, index) => {
    const obstacle = position(item, `${path}.obstacles[${index}]`, width, height)
    const key = `${obstacle.x},${obstacle.y}`
    if (obstacleKeys.has(key)) fail(`${path}.obstacles[${index}]`, '障碍物坐标重复')
    obstacleKeys.add(key)
    if (samePosition(obstacle, start) || samePosition(obstacle, goal)) fail(`${path}.obstacles[${index}]`, '不能覆盖起点或终点')
    return obstacle
  })
  const entityIds = new Set<string>([actor.id])
  const entities = array(row.entities, `${path}.entities`).map((item, index) => {
    const itemPath = `${path}.entities[${index}]`
    const entityRow = record(item, itemPath)
    const id = string(entityRow.id, `${itemPath}.id`)
    if (entityIds.has(id)) fail(`${itemPath}.id`, `实体 ID ${id} 重复`)
    entityIds.add(id)
    const entity: ModuleLevelEntity = {
      id,
      type: string(entityRow.type, `${itemPath}.type`),
      ...position(entityRow, itemPath, width, height),
    }
    if (entityRow.initial_state !== undefined) {
      const state = record(entityRow.initial_state, `${itemPath}.initial_state`)
      entity.initial_state = Object.fromEntries(
        Object.entries(state).map(([key, stateValue]) => [key, scalar(stateValue, `${itemPath}.initial_state.${key}`)]),
      )
    }
    return entity
  })
  return { type: 'grid', width, height, start, goal, actor, obstacles, entities }
}

function parseStageCoordinate(value: unknown, path: string): number | 'random' {
  if (value === 'random') return 'random'
  return number(value, path)
}

function parseStageScene(value: unknown, path: string): ModuleStageScene {
  const row = record(value, path)
  const sizeRow = record(row.stage_size, `${path}.stage_size`)
  const stageSize = {
    width: integer(sizeRow.width, `${path}.stage_size.width`, 1),
    height: integer(sizeRow.height, `${path}.stage_size.height`, 1),
  }
  const spriteIds = new Set<string>()
  const sprites = array(row.sprites, `${path}.sprites`).map((item, index) => {
    const itemPath = `${path}.sprites[${index}]`
    const spriteRow = record(item, itemPath)
    const id = string(spriteRow.id, `${itemPath}.id`)
    if (spriteIds.has(id)) fail(`${itemPath}.id`, `精灵 ID ${id} 重复`)
    spriteIds.add(id)
    const sprite: ModuleStageSprite = {
      id,
      asset: string(spriteRow.asset, `${itemPath}.asset`),
      x: number(spriteRow.x, `${itemPath}.x`),
      y: number(spriteRow.y, `${itemPath}.y`),
    }
    if (spriteRow.direction !== undefined) sprite.direction = number(spriteRow.direction, `${itemPath}.direction`)
    if (spriteRow.size !== undefined) sprite.size = number(spriteRow.size, `${itemPath}.size`)
    if (spriteRow.visible !== undefined) sprite.visible = boolean(spriteRow.visible, `${itemPath}.visible`)
    if (spriteRow.costumes !== undefined) {
      sprite.costumes = array(spriteRow.costumes, `${itemPath}.costumes`).map((costume, costumeIndex) =>
        string(costume, `${itemPath}.costumes[${costumeIndex}]`),
      )
    }
    return sprite
  })
  const cloneIds = new Set<string>(spriteIds)
  const clones = array(row.clones, `${path}.clones`).map((item, index) => {
    const itemPath = `${path}.clones[${index}]`
    const cloneRow = record(item, itemPath)
    const id = string(cloneRow.id, `${itemPath}.id`)
    if (cloneIds.has(id)) fail(`${itemPath}.id`, `克隆 ID ${id} 重复`)
    cloneIds.add(id)
    const spawnRow = record(cloneRow.spawn, `${itemPath}.spawn`)
    const clone: ModuleStageClone = {
      id,
      asset: string(cloneRow.asset, `${itemPath}.asset`),
      spawn: {
        x: parseStageCoordinate(spawnRow.x, `${itemPath}.spawn.x`),
        y: parseStageCoordinate(spawnRow.y, `${itemPath}.spawn.y`),
      },
    }
    if (cloneRow.lifetime_steps !== undefined) {
      clone.lifetime_steps = integer(cloneRow.lifetime_steps, `${itemPath}.lifetime_steps`, 0)
    }
    return clone
  })
  const variableIds = new Set<string>()
  const variables = array(row.variables, `${path}.variables`).map((item, index) => {
    const itemPath = `${path}.variables[${index}]`
    const variableRow = record(item, itemPath)
    const id = string(variableRow.id, `${itemPath}.id`)
    if (variableIds.has(id)) fail(`${itemPath}.id`, `变量 ID ${id} 重复`)
    variableIds.add(id)
    const variable: ModuleStageVariable = {
      id,
      name: string(variableRow.name, `${itemPath}.name`),
      initial: scalar(variableRow.initial, `${itemPath}.initial`),
    }
    if (variableRow.scope !== undefined) {
      const scope = string(variableRow.scope, `${itemPath}.scope`)
      if (scope !== 'global' && scope !== 'local') fail(`${itemPath}.scope`, '必须是 global 或 local')
      variable.scope = scope
    }
    return variable
  })
  const broadcasts = array(row.broadcasts, `${path}.broadcasts`).map((item, index) =>
    string(item, `${path}.broadcasts[${index}]`),
  )
  return {
    type: 'stage',
    backdrop: string(row.backdrop, `${path}.backdrop`),
    stage_size: stageSize,
    sprites,
    clones,
    variables,
    broadcasts,
  }
}

function parseScene(value: unknown, sceneType: ModuleSceneType, path = 'scene'): ModuleScene {
  if (sceneType === 'grid') return parseGridScene(value, path)
  return parseStageScene(value, path)
}

function parseSuccessCheck(value: unknown, scene: ModuleScene, path = 'success_check'): ModuleSuccessCheck {
  const row = record(value, path)
  const type = string(row.type, `${path}.type`)
  if (type === 'actor_at_goal') {
    const actorId = string(row.actor_id, `${path}.actor_id`)
    if (scene.type !== 'grid') fail(`${path}.actor_id`, '只有网格场景才有角色终点')
    if (actorId !== scene.actor.id) fail(`${path}.actor_id`, '必须引用 scene.actor.id')
    return { type, actor_id: actorId }
  }
  if (type === 'entity_state') {
    const entityId = string(row.entity_id, `${path}.entity_id`)
    if (scene.type !== 'grid') fail(`${path}.entity_id`, '只有网格场景才有实体')
    if (!scene.entities.some((entity) => entity.id === entityId)) fail(`${path}.entity_id`, `实体 ${entityId} 不存在`)
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
  if (type === 'sprite_at') {
    if (scene.type !== 'stage') fail(`${path}.type`, '只有舞台场景才有精灵位置判定')
    const spriteId = string(row.sprite_id, `${path}.sprite_id`)
    if (!scene.sprites.some((sprite) => sprite.id === spriteId)) fail(`${path}.sprite_id`, `精灵 ${spriteId} 不存在`)
    return { type, sprite_id: spriteId, x: number(row.x, `${path}.x`), y: number(row.y, `${path}.y`) }
  }
  if (type === 'variable_value') {
    if (scene.type !== 'stage') fail(`${path}.type`, '只有舞台场景才有变量判定')
    const variableId = string(row.variable_id, `${path}.variable_id`)
    if (!scene.variables.some((variable) => variable.id === variableId)) fail(`${path}.variable_id`, `变量 ${variableId} 不存在`)
    const op = string(row.op, `${path}.op`)
    if (!['==', '!=', '<', '<=', '>', '>='].includes(op)) fail(`${path}.op`, '不是支持的比较运算符')
    return { type, variable_id: variableId, op: op as ModuleComparisonOperator, value: scalar(row.value, `${path}.value`) }
  }
  if (type === 'all' || type === 'any') {
    const conditions = array(row.conditions, `${path}.conditions`)
    if (!conditions.length) fail(`${path}.conditions`, '不能为空')
    return { type, conditions: conditions.map((condition, index) => parseSuccessCheck(condition, scene, `${path}.conditions[${index}]`)) }
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

/**
 * 新模块关卡正文只有一个解析入口；不按 blockly / easy-robot 分叉。
 *
 * schema_version 1 是旧格式，场景数据在 body.map；
 * schema_version 2 是当前格式，场景数据在 body.scene，由 scene_type 决定怎么解析。
 */
export function parseModuleLevelBody(raw: unknown): ModuleLevelBody {
  const row = record(raw, 'body')
  const version = row.schema_version
  if (version !== 1 && version !== 2) fail('schema_version', '必须是 1 或 2')

  const availableBlocks = parseAvailableBlocks(row.available_blocks)

  let sceneType: ModuleSceneType
  let scene: ModuleScene
  if (version === 1) {
    // 旧格式退化：body.map 当成网格场景。
    sceneType = 'grid'
    scene = parseGridScene(row.map, 'map')
  } else {
    sceneType = string(row.scene_type, 'scene_type') as ModuleSceneType
    if (sceneType !== 'grid' && sceneType !== 'stage') fail('scene_type', '必须是 grid 或 stage')
    scene = parseScene(row.scene, sceneType)
  }

  return {
    schema_version: version,
    scene_type: sceneType,
    scene,
    available_blocks: availableBlocks,
    success_check: parseSuccessCheck(row.success_check, scene),
    workspace: parseWorkspace(row.workspace, availableBlocks),
    runtime: parseRuntime(row.runtime),
    hints: parseHints(row.hints),
    completion: parseCompletion(row.completion),
  }
}

/** 网格关卡取场景；舞台关卡没有网格场景时直接报错。 */
export function gridSceneOf(body: ModuleLevelBody): ModuleGridScene {
  if (body.scene.type !== 'grid') throw new Error('这一关是舞台场景，没有网格地图')
  return body.scene
}