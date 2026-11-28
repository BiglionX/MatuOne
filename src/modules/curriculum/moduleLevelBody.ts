export type GridHeading = 'N' | 'E' | 'S' | 'W'
export type ModuleBlockKind = 'action' | 'sensor' | 'control'
export type ModuleBlockArgType = 'number' | 'string' | 'boolean' | 'select' | 'variable'
export type ModuleComparisonOperator = '==' | '!=' | '<' | '<=' | '>' | '>='
export type ModuleScalar = string | number | boolean

/**
 * 控制积木的分支形状。
 *
 * then：只有「成立时」一支，嵌套体放在 BODY 输入里。
 * then_else：还有「不成立时」一支，成立分支放 BODY，不成立分支放 ELSE。
 */
export type ModuleBlockBranchShape = 'then' | 'then_else'

/**
 * 控制积木的分支形状登记表，按积木类型固定。
 *
 * 形状不能由关卡正文随意改：Blockly 的积木定义按类型全局缓存，
 * 同一个类型在两关里形状不一致，工作区的插槽就会对不上。
 */
const BLOCK_BRANCH_SHAPES: Record<string, ModuleBlockBranchShape> = {
  repeat: 'then',
  if_wall_ahead: 'then',
  if_path_ahead: 'then_else',
  if_else: 'then_else',
  if_touching: 'then',
  forever: 'then',
  // 「克隆」自带一个嵌套体：克隆出来的新角色要做的事写在里面。
  clone: 'then',
}

/** 取控制积木的分支形状；没登记过的类型按单分支处理。 */
export function branchShapeOf(blockType: string): ModuleBlockBranchShape {
  return BLOCK_BRANCH_SHAPES[blockType] ?? 'then'
}

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
  /** 控制积木的分支形状，由积木类型固定；动作积木恒为 then。 */
  branches: ModuleBlockBranchShape
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

/**
 * 提示的引导目标。
 *
 * workspace 盯着工作区，run 盯着运行按钮，block 盯着某种积木。
 * 小精灵弹提示时按这个字段高亮，不用在前端写死「该拖哪一块」。
 */
export interface ModuleHintFocus {
  target: 'workspace' | 'run' | 'block'
  /** target 为 block 时必填：积木类型，例如 move_forward。 */
  blockType?: string
}

/**
 * 分步引导的检查条件。
 *
 * type/args 描述要找的积木；within 限定它必须嵌在哪类积木里面；
 * contains 要求它的子树里还得有另一块积木。
 * 数据来自关卡 body，所以这里用声明式条件，不下发可执行代码。
 */
export interface ModuleTeachingCheck {
  /** 单块积木条件；和 all 二选一。 */
  type?: string
  /** 多个条件同时满足，用于「这一步要把两三个目标都配好」。 */
  all?: ModuleTeachingCheck[]
  args?: Record<string, ModuleScalar>
  within?: string[]
  contains?: ModuleTeachingCheck[]
  /** 按数量判定，例如折线关「一共 3 块前进、2 次转弯」。 */
  count?: { type: string; value: number; atLeast?: boolean }
}

/**
 * 通关后的拓展提问。
 *
 * 过关只说明学生照着搭对了，不代表他理解参数的作用。
 * 这里让小精灵指着一个参数问「改成 X 会怎样」，学生改完再跑一次，
 * 看到结果差异之后才算真正完成这一关。
 */
export interface ModuleReflection {
  /** 精灵问学生的问题。 */
  question: string
  /** 要学生改哪一块的哪个参数；current 是标准解里的值。 */
  target: {
    type: string
    arg: string
    current: ModuleScalar
    suggested: ModuleScalar
    /** 积木所在的祖先类型；克隆关要用它区分玩家移动和子弹移动。 */
    within?: string[]
    /** 再按祖先的参数定位，例如克隆编号；多子弹关卡靠它认准同一颗子弹。 */
    ancestorArgs?: { type: string; arg: string; value: ModuleScalar }[]
    /** 同类积木的第几块（从 1 开始）；网格关有多个循环时用它认准目标。 */
    nth?: number
  }
  /** 点「我来试试」后，提醒去哪一块改。 */
  try_text: string
  /** 学生改完并运行过一次后的追问与总结。 */
  ran_text: string
  /** 学生没改参数就运行时的提醒。 */
  fail_text: string
}

/** 小精灵的一次「我已完成，下一步」引导。 */
export interface ModuleTeachingStep {
  /** 这一步要学生做什么，直接显示在气泡里。 */
  text: string
  /** 点按钮时按这个条件检查工作区。 */
  check: ModuleTeachingCheck
  /** 检查没过时的提醒，明确告诉学生差哪一块。 */
  fail_text: string
  /** 检查通过后的夸奖；缺省时用「做得好！」。 */
  done_text?: string
}

/** 关卡视觉开关。 */
export interface ModuleLevelVisuals {
  /** 画出机器人走过的轨迹，用来做「画直线」这类任务。 */
  show_trail?: boolean
}

/** 课内打字活动；目标串由 TypingTrainer 逐组结算。 */
export interface ModuleTypingActivity {
  targets: string[]
  /** true 表示打字没完成前不进入积木挑战。 */
  required?: boolean
}

/** 课前/课后的附加活动，目前只有打字一种。 */
export interface ModuleLevelActivities {
  typing?: ModuleTypingActivity
}

/**
 * 绘本页的类型。
 *
 * text：纯文字气泡。
 * image_text：文字配一张插画，插画由 image 指定。
 */
export type ModuleStoryPageType = 'text' | 'image_text'

/**
 * 绘本（漫画）的一页。
 *
 * 无师化场景下老师不讲课，学生进关前先靠这几页图理解概念，
 * 所以正文必须能完整描述「这一关要做什么、用哪块积木」。
 */
export interface ModuleStoryPage {
  type: ModuleStoryPageType
  /** 说话人；不写时由前端用默认的小精灵。 */
  speaker?: string
  /**
   * 插画占位符。
   *
   * 现在是一段短标识（例如 robot_wave），前端画成 Emoji 占位图；
   * 教研老师换成真实插画路径（例如 /stories/blk-002/p1.webp）后前端直接渲染图片，
   * 数据结构不用动。
   */
  image?: string
  content: string
}

/**
 * 课前复习卡：把上一关的核心知识点拎出来问一句。
 *
 * 和绘本一样是可选字段，旧关卡没有它就直接进工作区。
 */
export interface ModuleLevelReview {
  question: string
  answer: string
  /** 给学生的额外提示，可以不写。 */
  hint?: string
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
  /** 被 if_touching 命中后消失，适合苹果、金币等一次性收集物。 */
  collectible?: boolean
  costumes?: string[]
}

/**
 * 克隆模板。
 *
 * 「克隆」积木按 id 引用这里的模板：模板决定新角色的样子、出生位置和能活多久。
 * 模板本身不规定新角色做什么——做什么写在「克隆」积木的嵌套体里，由学生自己拼。
 */
export interface ModuleStageClone {
  id: string
  asset: string
  /**
   * 出生位置。
   *
   * 数字是固定坐标；'random' 是伪随机（同一个关卡跑出来的结果一样，保证可复现）；
   * 'self' 表示「跟着当前控制的那个角色走」，也就是子弹从飞船身上飞出去。
   */
  spawn: { x: number | 'random' | 'self'; y: number | 'random' | 'self' }
  /** 活多久（单位是运行步）。不写就一直在舞台上。 */
  lifetime_steps?: number
  size?: number
  direction?: number
}

export interface ModuleStageVariable {
  id: string
  name: string
  initial: ModuleScalar
  scope?: 'global' | 'local'
}

/** 课程自带的隐藏脚本；运行时不占学生工作区的积木名额。 */
export interface ModuleStageInitialScript {
  id: string
  target_sprite_id: string
  block: ModuleBlockInstance
}

/** 舞台场景。二年级上开始用，由 Stage 组件渲染和解释器运行。 */
export interface ModuleStageScene {
  type: 'stage'
  backdrop: string
  stage_size: { width: number; height: number }
  sprites: ModuleStageSprite[]
  clones: ModuleStageClone[]
  variables: ModuleStageVariable[]
  broadcasts: string[]
  initial_scripts?: ModuleStageInitialScript[]
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
  | { type: 'sprite_hidden'; sprite_id: string }
  | { type: 'variable_value'; variable_id: string; op: ModuleComparisonOperator; value: ModuleScalar }
  | { type: 'all' | 'any'; conditions: ModuleSuccessCheck[] }

export interface ModuleBlockInstance {
  id: string
  type: string
  args: Record<string, ModuleScalar>
  next?: ModuleBlockInstance | null
  /**
   * 控制积木的分支体。
   *
   * then 形状：一串链头，按顺序依次执行。
   * then_else 形状：固定两项，[成立分支, 不成立分支]，空分支写 null。
   */
  children?: (ModuleBlockInstance | null)[]
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
  hints: { trigger: string; text: string; focus?: ModuleHintFocus }[]
  /** 视觉开关；旧关卡没有这一项时按默认值渲染。 */
  visuals?: ModuleLevelVisuals
  /** 附加活动；旧关卡没有这一项时只有积木挑战。 */
  activities?: ModuleLevelActivities
  /**
   * 进关前先看的绘本（漫画）；旧关卡没有这一项时直接进工作区。
   *
   * 无师化场景的关键：老师不教概念，学生靠这几页图先知道该拖哪块积木。
   */
  intro_story?: ModuleStoryPage[]
  /**
   * 进关前的课前复习卡，内容是上一关的核心知识点；旧关卡没有这一项时直接进工作区。
   */
  review?: ModuleLevelReview
  /**
   * 可选的分步引导：小精灵一步一步提示，学生点「我已完成，下一步」时
   * 检查工作区，通过了才讲下一步。旧关卡没有这一项时沿用原来的 hints。
   */
  teaching_steps?: ModuleTeachingStep[]
  /** 可选：通关后的拓展提问，让学生改参数再跑一次，把过关变成思考。 */
  reflection?: ModuleReflection
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
  if (!['number', 'string', 'boolean', 'select', 'variable'].includes(type)) fail(`${path}.type`, '不是支持的参数类型')
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
      branches: branchShapeOf(type),
    }
    if (row.branches !== undefined) {
      // 正文可以写明形状，但只能和登记表一致，写错了直接报错。
      const declared = string(row.branches, `${path}.branches`)
      if (declared !== block.branches) {
        fail(`${path}.branches`, `积木 ${type} 的分支形状固定为 ${block.branches}`)
      }
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

function parseStageCoordinate(value: unknown, path: string): number | 'random' | 'self' {
  if (value === 'random') return 'random'
  if (value === 'self') return 'self'
  return number(value, path)
}

function parseStageScene(value: unknown, path: string, availableBlocks: ModuleAvailableBlock[]): ModuleStageScene {
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
    if (spriteRow.collectible !== undefined) sprite.collectible = boolean(spriteRow.collectible, `${itemPath}.collectible`)
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
    if (cloneRow.size !== undefined) clone.size = number(cloneRow.size, `${itemPath}.size`)
    if (cloneRow.direction !== undefined) clone.direction = number(cloneRow.direction, `${itemPath}.direction`)
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
  const initialScriptIds = new Set<string>()
  const initialScripts = row.initial_scripts === undefined
    ? undefined
    : array(row.initial_scripts, `${path}.initial_scripts`).map((item, index) => {
        const itemPath = `${path}.initial_scripts[${index}]`
        const scriptRow = record(item, itemPath)
        const id = string(scriptRow.id, `${itemPath}.id`)
        if (initialScriptIds.has(id)) fail(`${itemPath}.id`, `初始脚本 ID ${id} 重复`)
        initialScriptIds.add(id)
        const targetSpriteId = string(scriptRow.target_sprite_id, `${itemPath}.target_sprite_id`)
        if (!spriteIds.has(targetSpriteId)) fail(`${itemPath}.target_sprite_id`, `精灵 ${targetSpriteId} 不存在`)
        return {
          id,
          target_sprite_id: targetSpriteId,
          block: parseBlockInstance(scriptRow.block, `${itemPath}.block`, availableBlocks),
        }
      })
  return {
    type: 'stage',
    backdrop: string(row.backdrop, `${path}.backdrop`),
    stage_size: stageSize,
    sprites,
    clones,
    variables,
    broadcasts,
    ...(initialScripts ? { initial_scripts: initialScripts } : {}),
  }
}

function parseScene(
  value: unknown,
  sceneType: ModuleSceneType,
  availableBlocks: ModuleAvailableBlock[],
  path = 'scene',
): ModuleScene {
  if (sceneType === 'grid') return parseGridScene(value, path)
  return parseStageScene(value, path, availableBlocks)
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
  if (type === 'sprite_hidden') {
    if (scene.type !== 'stage') fail(`${path}.type`, '只有舞台场景才有精灵显隐判定')
    const spriteId = string(row.sprite_id, `${path}.sprite_id`)
    if (!scene.sprites.some((sprite) => sprite.id === spriteId)) fail(`${path}.sprite_id`, `精灵 ${spriteId} 不存在`)
    return { type, sprite_id: spriteId }
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
    block.children = array(row.children, `${path}.children`).map((child, index) =>
      // then_else 形状的积木用 null 表示空分支。
      child === null ? null : parseBlockInstance(child, `${path}.children[${index}]`, available),
    )
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

function parseHintFocus(value: unknown, path: string): ModuleHintFocus {
  const row = record(value, path)
  const target = string(row.target, `${path}.target`)
  if (target !== 'workspace' && target !== 'run' && target !== 'block') {
    fail(`${path}.target`, '必须是 workspace、run 或 block')
  }
  const focus: ModuleHintFocus = { target }
  if (row.blockType !== undefined) focus.blockType = string(row.blockType, `${path}.blockType`)
  if (target === 'block' && !focus.blockType) fail(`${path}.blockType`, '目标是 block 时必须给出积木类型')
  return focus
}

function parseHints(value: unknown): ModuleLevelBody['hints'] {
  const triggers = new Set<string>()
  return array(value, 'hints').map((item, index) => {
    const path = `hints[${index}]`
    const row = record(item, path)
    const trigger = string(row.trigger, `${path}.trigger`)
    if (triggers.has(trigger)) fail(`${path}.trigger`, '提示触发条件重复')
    triggers.add(trigger)
    const hint: ModuleLevelBody['hints'][number] = { trigger, text: string(row.text, `${path}.text`) }
    if (row.focus !== undefined && row.focus !== null) hint.focus = parseHintFocus(row.focus, `${path}.focus`)
    return hint
  })
}

function parseVisuals(value: unknown): ModuleLevelVisuals | undefined {
  if (value === undefined || value === null) return undefined
  const row = record(value, 'visuals')
  const visuals: ModuleLevelVisuals = {}
  if (row.show_trail !== undefined) visuals.show_trail = boolean(row.show_trail, 'visuals.show_trail')
  return visuals
}

function parseActivities(value: unknown): ModuleLevelActivities | undefined {
  if (value === undefined || value === null) return undefined
  const row = record(value, 'activities')
  const activities: ModuleLevelActivities = {}
  if (row.typing !== undefined && row.typing !== null) {
    const typingRow = record(row.typing, 'activities.typing')
    const targets = array(typingRow.targets, 'activities.typing.targets').map((target, index) =>
      string(target, `activities.typing.targets[${index}]`),
    )
    if (!targets.length) fail('activities.typing.targets', '不能为空')
    const typing: ModuleTypingActivity = { targets }
    if (typingRow.required !== undefined) typing.required = boolean(typingRow.required, 'activities.typing.required')
    activities.typing = typing
  }
  return activities
}

function parseCompletion(value: unknown): ModuleLevelBody['completion'] {
  const row = record(value, 'completion')
  const stars = integer(row.stars, 'completion.stars', 0)
  if (stars > 3) fail('completion.stars', '必须是 0 到 3 的整数')
  return { stars: stars as 0 | 1 | 2 | 3, success_text: string(row.success_text, 'completion.success_text') }
}

function parseTeachingCheck(value: unknown, path: string): ModuleTeachingCheck {
  const row = record(value, path)
  const check: ModuleTeachingCheck = {}
  if (row.type !== undefined) check.type = string(row.type, `${path}.type`)
  if (row.all !== undefined) {
    check.all = array(row.all, `${path}.all`).map((item, index) => parseTeachingCheck(item, `${path}.all[${index}]`))
  }
  if (row.args !== undefined) {
    const args: Record<string, ModuleScalar> = {}
    for (const [key, item] of Object.entries(record(row.args, `${path}.args`))) {
      args[key] = scalar(item, `${path}.args.${key}`)
    }
    check.args = args
  }
  if (row.within !== undefined) {
    check.within = array(row.within, `${path}.within`).map((item, index) => string(item, `${path}.within[${index}]`))
  }
  if (row.contains !== undefined) {
    check.contains = array(row.contains, `${path}.contains`).map((item, index) =>
      parseTeachingCheck(item, `${path}.contains[${index}]`))
  }
  if (row.count !== undefined) {
    const countRow = record(row.count, `${path}.count`)
    check.count = {
      type: string(countRow.type, `${path}.count.type`),
      value: integer(countRow.value, `${path}.count.value`, 0),
      ...(countRow.atLeast === undefined ? {} : { atLeast: boolean(countRow.atLeast, `${path}.count.atLeast`) }),
    }
  }
  if (!check.type && !check.all?.length && !check.count) fail(path, '必须有 type、非空 all 或 count')
  return check
}

/** 通关后的拓展提问。缺省时返回 undefined，表示过关即结束。 */
function parseReflection(value: unknown): ModuleReflection | undefined {
  if (value === undefined || value === null) return undefined
  const path = 'reflection'
  const row = record(value, path)
  const target = record(row.target, `${path}.target`)
  return {
    question: string(row.question, `${path}.question`),
    target: {
      type: string(target.type, `${path}.target.type`),
      arg: string(target.arg, `${path}.target.arg`),
      current: scalar(target.current, `${path}.target.current`),
      suggested: scalar(target.suggested, `${path}.target.suggested`),
      ...(target.within === undefined
        ? {}
        : { within: array(target.within, `${path}.target.within`).map((item, index) => string(item, `${path}.target.within[${index}]`)) }),
      ...(target.ancestorArgs === undefined
        ? {}
        : {
            ancestorArgs: array(target.ancestorArgs, `${path}.target.ancestorArgs`).map((item, index) => {
              const rule = record(item, `${path}.target.ancestorArgs[${index}]`)
              return {
                type: string(rule.type, `${path}.target.ancestorArgs[${index}].type`),
                arg: string(rule.arg, `${path}.target.ancestorArgs[${index}].arg`),
                value: scalar(rule.value, `${path}.target.ancestorArgs[${index}].value`),
              }
            }),
          }),
      ...(target.nth === undefined ? {} : { nth: integer(target.nth, `${path}.target.nth`, 1) }),
    },
    try_text: string(row.try_text, `${path}.try_text`),
    ran_text: string(row.ran_text, `${path}.ran_text`),
    fail_text: string(row.fail_text, `${path}.fail_text`),
  }
}

/** 分步引导步骤。缺省时返回 undefined，表示这一关不用逐步检查。 */
function parseTeachingSteps(value: unknown): ModuleTeachingStep[] | undefined {
  if (value === undefined || value === null) return undefined
  const rows = array(value, 'teaching_steps')
  if (!rows.length) return undefined
  return rows.map((item, index) => {
    const path = `teaching_steps[${index}]`
    const row = record(item, path)
    const step: ModuleTeachingStep = {
      text: string(row.text, `${path}.text`),
      check: parseTeachingCheck(row.check, `${path}.check`),
      fail_text: string(row.fail_text, `${path}.fail_text`),
    }
    if (row.done_text !== undefined) step.done_text = string(row.done_text, `${path}.done_text`)
    return step
  })
}

/**
 * 绘本页列表。缺省时返回 undefined，表示这一关没有绘本，进关直接进工作区。
 */
function parseStoryPages(value: unknown): ModuleStoryPage[] | undefined {
  if (value === undefined || value === null) return undefined
  const rows = array(value, 'intro_story')
  if (!rows.length) fail('intro_story', '不能为空')
  return rows.map((item, index) => {
    const path = `intro_story[${index}]`
    const row = record(item, path)
    const type = string(row.type, `${path}.type`)
    if (type !== 'text' && type !== 'image_text') fail(`${path}.type`, '必须是 text 或 image_text')
    const page: ModuleStoryPage = { type, content: string(row.content, `${path}.content`) }
    if (row.speaker !== undefined && row.speaker !== null) page.speaker = string(row.speaker, `${path}.speaker`)
    if (row.image !== undefined && row.image !== null) page.image = string(row.image, `${path}.image`)
    // 配图页必须指明插画，否则前端只能画一个空白占位。
    if (type === 'image_text' && !page.image) fail(`${path}.image`, 'image_text 必须指定插画')
    return page
  })
}

/**
 * 课前复习卡。缺省时返回 undefined，表示这一关没有复习环节。
 */
function parseReview(value: unknown): ModuleLevelReview | undefined {
  if (value === undefined || value === null) return undefined
  const row = record(value, 'review')
  const review: ModuleLevelReview = {
    question: string(row.question, 'review.question'),
    answer: string(row.answer, 'review.answer'),
  }
  if (row.hint !== undefined && row.hint !== null) review.hint = string(row.hint, 'review.hint')
  return review
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
    scene = parseScene(row.scene, sceneType, availableBlocks)
  }

  const body: ModuleLevelBody = {
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
  const visuals = parseVisuals(row.visuals)
  if (visuals) body.visuals = visuals
  const activities = parseActivities(row.activities)
  if (activities) body.activities = activities
  // 绘本和复习卡都是可选的：旧关卡没配就直接进工作区，不影响原有流程。
  const introStory = parseStoryPages(row.intro_story)
  if (introStory) body.intro_story = introStory
  const review = parseReview(row.review)
  if (review) body.review = review
  const steps = parseTeachingSteps(row.teaching_steps)
  if (steps) body.teaching_steps = steps
  const reflection = parseReflection(row.reflection)
  if (reflection) body.reflection = reflection
  return body
}

/**
 * 这一关进关前要不要先看绘本或复习卡。
 *
 * 没有这两个字段的旧关卡直接进工作区。
 */
export function hasIntroMaterial(body: ModuleLevelBody): boolean {
  return Boolean(body.intro_story?.length || body.review)
}

/** 网格关卡取场景；舞台关卡没有网格场景时直接报错。 */
export function gridSceneOf(body: ModuleLevelBody): ModuleGridScene {
  if (body.scene.type !== 'grid') throw new Error('这一关是舞台场景，没有网格地图')
  return body.scene
}