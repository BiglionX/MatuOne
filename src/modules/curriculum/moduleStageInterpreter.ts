import type {
  ModuleComparisonOperator,
  ModuleLevelBody,
  ModuleScalar,
  ModuleStageScene,
  ModuleStageSprite,
  ModuleStageVariable,
  ModuleSuccessCheck,
} from './moduleLevelBody'
import type { BlockExecutionNode } from './moduleLevelInterpreter'

export const STAGE_BASE_SPRITE_SIZE = 32

const MAX_BLOCK_DEPTH = 64
const CONTROL_STEPS_PER_THREAD_TICK = 64
const COORDINATE_EPSILON = 0.000001

export type StageRunStatus = 'running' | 'completed' | 'finished' | 'stopped' | 'error'
export type StageThreadStatus = 'running' | 'done' | 'stopped' | 'error'

export type StageInstruction =
  | { kind: 'action'; type: 'move_steps'; steps: number }
  | { kind: 'action'; type: 'set_variable'; variableId: string; value: ModuleScalar }
  | { kind: 'action'; type: 'change_variable'; variableId: string; value: number }
  | { kind: 'if_touching'; targetSpriteId: string; body: StageSequence }
  | { kind: 'repeat'; times: number; body: StageSequence }
  | { kind: 'forever'; body: StageSequence }

export interface StageSequence {
  kind: 'sequence'
  instructions: StageInstruction[]
}

export interface StageScript {
  id: string
  /** 学生脚本默认控制第一个精灵；场景初始脚本可指定任意精灵。 */
  targetSpriteId: string | null
  root: StageSequence
}

export interface StageProgram {
  scene: ModuleStageScene
  scripts: StageScript[]
  variables: ModuleStageVariable[]
  successCheck: ModuleSuccessCheck
  stopOnSuccess: boolean
  outOfBounds: 'blocked' | 'fail'
}

export interface StageSpriteState {
  id: string
  asset: string
  x: number
  y: number
  direction: number
  size: number
  visible: boolean
  collectible: boolean
}

export interface StageSequenceFrame {
  kind: 'sequence'
  sequence: StageSequence
  index: number
}

export interface StageRepeatFrame {
  kind: 'repeat'
  body: StageSequence
  remaining: number
}

export interface StageForeverFrame {
  kind: 'forever'
  body: StageSequence
}

export type StageFrame = StageSequenceFrame | StageRepeatFrame | StageForeverFrame

export interface StageThread {
  id: string
  targetSpriteId: string | null
  frames: StageFrame[]
  status: StageThreadStatus
}

export interface StageFailure {
  type: 'out_of_bounds' | 'invalid_variable' | 'runtime'
  message: string
  threadId?: string
}

/** 运行时的不可变快照；program 和指令树在 Tick 之间共享，状态字段每次复制。 */
export interface StageWorld {
  program: StageProgram
  sprites: StageSpriteState[]
  variables: Record<string, ModuleScalar>
  threads: StageThread[]
  frame: number
  status: StageRunStatus
  completed: boolean
  failure?: StageFailure
}

export type StageSnapshot = StageWorld

interface CompileContext {
  availableTypes: Set<string>
  variableIds: Set<string>
  spriteIds: Set<string>
  targetSpriteId: string | null
  /** null 表示课程隐藏脚本，不受学生工作区积木上限约束。 */
  maxBlocks: number | null
  blockCount: number
  visiting: Set<BlockExecutionNode>
}

function stageSceneOf(body: ModuleLevelBody): ModuleStageScene {
  if (body.schema_version !== 2 || body.scene_type !== 'stage' || body.scene.type !== 'stage') {
    throw new Error('Stage 解释器只支持 schema_version 2 的 stage 场景')
  }
  return body.scene
}

function scalar(value: unknown, path: string): ModuleScalar {
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  throw new Error(`关卡 body 校验失败：${path} 必须是字符串、有限数字或布尔值`)
}

function finiteNumber(value: unknown, path: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  throw new Error(`关卡 body 校验失败：${path} 必须是有限数字`)
}

function count(value: unknown, path: string): number {
  const parsed = finiteNumber(value, path)
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`关卡 body 校验失败：${path} 必须是非负整数`)
  }
  return parsed
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`关卡 body 校验失败：${path} 必须是非空字符串`)
  }
  return value
}

function mergeVariables(
  sceneVariables: readonly ModuleStageVariable[],
  workspaceVariables: readonly ModuleStageVariable[],
): ModuleStageVariable[] {
  const byId = new Map<string, ModuleStageVariable>()
  for (const variable of [...sceneVariables, ...workspaceVariables]) {
    if (variable.scope === 'local') {
      throw new Error(`Stage 第一版只支持全局变量，变量 ${variable.name} 不能是 local`)
    }
    if (!variable.id.trim() || !variable.name.trim()) {
      throw new Error('Stage 变量的 id 和 name 都必须是非空字符串')
    }
    scalar(variable.initial, `scene.variables.${variable.id}.initial`)
    if (!byId.has(variable.id)) byId.set(variable.id, { ...variable, scope: 'global' })
  }
  return [...byId.values()]
}

function compileChildren(node: BlockExecutionNode, context: CompileContext, path: string, depth: number): StageInstruction[] {
  const instructions: StageInstruction[] = []
  for (const [index, child] of (node.children ?? []).entries()) {
    if (child) instructions.push(...compileChain(child, context, `${path}.children[${index}]`, depth + 1))
  }
  return instructions
}

function compileNode(node: BlockExecutionNode, context: CompileContext, path: string, depth: number): StageInstruction {
  const args = node.args ?? {}
  if (node.type === 'move_steps') {
    if (!context.targetSpriteId) throw new Error(`关卡 body 校验失败：${path} 需要至少一个可控制精灵`)
    return { kind: 'action', type: 'move_steps', steps: finiteNumber(args.steps, `${path}.args.steps`) }
  }
  if (node.type === 'set_variable') {
    const variableId = requiredString(args.variable_id, `${path}.args.variable_id`)
    if (!context.variableIds.has(variableId)) throw new Error(`关卡 body 校验失败：变量 ${variableId} 不存在`)
    return { kind: 'action', type: 'set_variable', variableId, value: scalar(args.value, `${path}.args.value`) }
  }
  if (node.type === 'change_variable') {
    const variableId = requiredString(args.variable_id, `${path}.args.variable_id`)
    if (!context.variableIds.has(variableId)) throw new Error(`关卡 body 校验失败：变量 ${variableId} 不存在`)
    return { kind: 'action', type: 'change_variable', variableId, value: finiteNumber(args.value, `${path}.args.value`) }
  }
  if (node.type === 'if_touching') {
    if (!context.targetSpriteId) throw new Error(`关卡 body 校验失败：${path} 需要至少一个可控制精灵`)
    const targetSpriteId = requiredString(args.target_sprite_id, `${path}.args.target_sprite_id`)
    if (!context.spriteIds.has(targetSpriteId)) throw new Error(`关卡 body 校验失败：精灵 ${targetSpriteId} 不存在`)
    const body: StageSequence = { kind: 'sequence', instructions: compileChildren(node, context, path, depth) }
    return { kind: 'if_touching', targetSpriteId, body }
  }
  if (node.type === 'repeat') {
    const body: StageSequence = { kind: 'sequence', instructions: compileChildren(node, context, path, depth) }
    return { kind: 'repeat', times: count(args.times, `${path}.args.times`), body }
  }
  if (node.type === 'forever') {
    const body: StageSequence = { kind: 'sequence', instructions: compileChildren(node, context, path, depth) }
    return { kind: 'forever', body }
  }
  throw new Error(`Stage 解释器不支持积木类型 ${node.type}`)
}

function compileChain(
  first: BlockExecutionNode | null | undefined,
  context: CompileContext,
  path: string,
  depth: number,
): StageInstruction[] {
  if (!first) return []
  if (depth > MAX_BLOCK_DEPTH) throw new Error(`关卡 body 校验失败：${path} 嵌套层数超过 ${MAX_BLOCK_DEPTH}`)

  const instructions: StageInstruction[] = []
  const chainNodes = new Set<BlockExecutionNode>()
  let node: BlockExecutionNode | null | undefined = first
  while (node) {
    if (chainNodes.has(node) || context.visiting.has(node)) {
      throw new Error(`关卡 body 校验失败：${path} 积木树不能形成循环引用`)
    }
    chainNodes.add(node)
    context.visiting.add(node)
    context.blockCount += 1
    if (context.maxBlocks !== null && context.blockCount > context.maxBlocks) {
      throw new Error(`积木数量超过本关上限 ${context.maxBlocks}`)
    }
    if (!context.availableTypes.has(node.type)) {
      throw new Error(`积木类型 ${node.type} 不在本关 available_blocks 中`)
    }
    instructions.push(compileNode(node, context, path, depth))
    context.visiting.delete(node)
    node = node.next ?? undefined
  }
  return instructions
}

/** 把 Blockly 执行树编译为 Stage 指令树；顶层每条链都是一个并发脚本。 */
export function compileStageProgram(
  body: ModuleLevelBody,
  blocks: readonly (BlockExecutionNode | null | undefined)[],
  workspaceVariables: readonly ModuleStageVariable[] = [],
): StageProgram {
  const scene = stageSceneOf(body)
  const variables = mergeVariables(scene.variables, workspaceVariables)
  const targetSpriteId = scene.sprites[0]?.id ?? null

  for (const sprite of scene.sprites) {
    if (!Number.isFinite(sprite.x) || !Number.isFinite(sprite.y)) {
      throw new Error(`关卡 body 校验失败：精灵 ${sprite.id} 坐标必须是有限数字`)
    }
    if (sprite.direction !== undefined && !Number.isFinite(sprite.direction)) {
      throw new Error(`关卡 body 校验失败：精灵 ${sprite.id} 方向必须是有限数字`)
    }
    if (sprite.size !== undefined && (!Number.isFinite(sprite.size) || sprite.size <= 0)) {
      throw new Error(`关卡 body 校验失败：精灵 ${sprite.id} 大小必须是正数`)
    }
  }

  const availableTypes = new Set(body.available_blocks.map((definition) => definition.type))
  const variableIds = new Set(variables.map((variable) => variable.id))
  const spriteIds = new Set(scene.sprites.map((sprite) => sprite.id))
  let totalBlockCount = 0
  const scripts: StageScript[] = blocks.map((block, index) => {
    const context: CompileContext = {
      availableTypes,
      variableIds,
      spriteIds,
      targetSpriteId,
      maxBlocks: body.workspace.max_blocks,
      blockCount: totalBlockCount,
      visiting: new Set(),
    }
    const script: StageScript = {
      id: `script-${index + 1}`,
      targetSpriteId,
      root: { kind: 'sequence', instructions: compileChain(block, context, `blocks[${index}]`, 0) },
    }
    totalBlockCount = context.blockCount
    return script
  })

  for (const [index, initialScript] of (scene.initial_scripts ?? []).entries()) {
    if (!spriteIds.has(initialScript.target_sprite_id)) {
      throw new Error(`关卡 body 校验失败：初始脚本 ${initialScript.id} 的精灵 ${initialScript.target_sprite_id} 不存在`)
    }
    const context: CompileContext = {
      availableTypes,
      variableIds,
      spriteIds,
      targetSpriteId: initialScript.target_sprite_id,
      maxBlocks: null,
      blockCount: 0,
      visiting: new Set(),
    }
    scripts.push({
      id: `initial-${initialScript.id}`,
      targetSpriteId: initialScript.target_sprite_id,
      root: {
        kind: 'sequence',
        instructions: compileChain(initialScript.block, context, `scene.initial_scripts[${index}].block`, 0),
      },
    })
  }

  return {
    scene,
    scripts,
    variables,
    successCheck: body.success_check,
    stopOnSuccess: body.runtime.stop_on_success,
    outOfBounds: body.runtime.out_of_bounds,
  }
}

function normalizeDirection(direction: number): number {
  const normalized = ((direction % 360) + 360) % 360
  return Math.abs(normalized) < COORDINATE_EPSILON || Math.abs(normalized - 360) < COORDINATE_EPSILON ? 0 : normalized
}

function cleanCoordinate(value: number): number {
  const rounded = Math.round(value * 1_000_000) / 1_000_000
  return Math.abs(rounded) < COORDINATE_EPSILON ? 0 : rounded
}

function spriteSize(sprite: Pick<StageSpriteState, 'size'>): number {
  return STAGE_BASE_SPRITE_SIZE * (sprite.size / 100)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

function initialStateOf(sprite: ModuleStageSprite): StageSpriteState {
  return {
    id: sprite.id,
    asset: sprite.asset,
    x: sprite.x,
    y: sprite.y,
    direction: normalizeDirection(sprite.direction ?? 90),
    size: sprite.size ?? 100,
    visible: sprite.visible ?? true,
    collectible: sprite.collectible ?? false,
  }
}

function sequenceFrame(sequence: StageSequence): StageSequenceFrame {
  return { kind: 'sequence', sequence, index: 0 }
}

/** 从编译结果创建一份全新的运行状态，不修改关卡正文。 */
export function createStageWorld(program: StageProgram): StageWorld {
  const world: StageWorld = {
    program,
    sprites: program.scene.sprites.map(initialStateOf),
    variables: Object.fromEntries(program.variables.map((variable) => [variable.id, variable.initial])),
    threads: program.scripts.map((script) => ({
      id: script.id,
      targetSpriteId: script.targetSpriteId,
      frames: [sequenceFrame(script.root)],
      status: 'running',
    })),
    frame: 0,
    status: program.scripts.length ? 'running' : 'finished',
    completed: false,
  }
  world.completed = evaluateStageSuccess(program.successCheck, world)
  if (world.completed && program.stopOnSuccess) {
    world.status = 'completed'
    for (const thread of world.threads) thread.status = 'stopped'
  }
  return world
}

function cloneWorld(world: StageWorld): StageWorld {
  return {
    ...world,
    sprites: world.sprites.map((sprite) => ({ ...sprite })),
    variables: { ...world.variables },
    threads: world.threads.map((thread) => ({
      ...thread,
      frames: thread.frames.map((frame) => ({ ...frame })),
    })),
    failure: world.failure ? { ...world.failure } : undefined,
  }
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

/** Stage 成功判定只读取运行时快照，不读取 scene 上的初始值。 */
export function evaluateStageSuccess(check: ModuleSuccessCheck, world: StageWorld): boolean {
  if (check.type === 'sprite_at') {
    const sprite = world.sprites.find((item) => item.id === check.sprite_id)
    return Boolean(
      sprite &&
      Math.abs(sprite.x - check.x) <= COORDINATE_EPSILON &&
      Math.abs(sprite.y - check.y) <= COORDINATE_EPSILON,
    )
  }
  if (check.type === 'sprite_hidden') {
    const sprite = world.sprites.find((item) => item.id === check.sprite_id)
    return Boolean(sprite && !sprite.visible)
  }
  if (check.type === 'variable_value') {
    if (!Object.prototype.hasOwnProperty.call(world.variables, check.variable_id)) return false
    return compare(world.variables[check.variable_id], check.op, check.value)
  }
  if (check.type === 'all') return check.conditions.every((condition) => evaluateStageSuccess(condition, world))
  if (check.type === 'any') return check.conditions.some((condition) => evaluateStageSuccess(condition, world))
  return false
}

export function spritesTouch(a: StageSpriteState, b: StageSpriteState): boolean {
  if (!a.visible || !b.visible || a.id === b.id) return false
  const aSize = spriteSize(a)
  const bSize = spriteSize(b)
  return a.x < b.x + bSize && a.x + aSize > b.x && a.y < b.y + bSize && a.y + aSize > b.y
}

function failWorld(world: StageWorld, thread: StageThread, failure: StageFailure): void {
  thread.status = 'error'
  world.status = 'error'
  world.failure = { ...failure, threadId: thread.id }
  for (const item of world.threads) {
    if (item.status === 'running') item.status = 'stopped'
  }
}

function applyAction(world: StageWorld, thread: StageThread, instruction: Extract<StageInstruction, { kind: 'action' }>): void {
  if (instruction.type === 'set_variable') {
    world.variables[instruction.variableId] = instruction.value
    return
  }
  if (instruction.type === 'change_variable') {
    const current = world.variables[instruction.variableId]
    if (typeof current !== 'number' || !Number.isFinite(current)) {
      failWorld(world, thread, { type: 'invalid_variable', message: `变量 ${instruction.variableId} 当前不是数字，不能增加` })
      return
    }
    const next = current + instruction.value
    if (!Number.isFinite(next)) {
      failWorld(world, thread, { type: 'invalid_variable', message: `变量 ${instruction.variableId} 增加后不是有限数字` })
      return
    }
    world.variables[instruction.variableId] = next
    return
  }

  const sprite = world.sprites.find((item) => item.id === thread.targetSpriteId)
  if (!sprite) {
    failWorld(world, thread, { type: 'runtime', message: '当前脚本没有可移动的精灵' })
    return
  }
  const radians = (sprite.direction * Math.PI) / 180
  const nextX = cleanCoordinate(sprite.x + Math.sin(radians) * instruction.steps)
  const nextY = cleanCoordinate(sprite.y - Math.cos(radians) * instruction.steps)
  const size = spriteSize(sprite)
  const maxX = Math.max(0, world.program.scene.stage_size.width - size)
  const maxY = Math.max(0, world.program.scene.stage_size.height - size)
  const outside = nextX < 0 || nextY < 0 || nextX > maxX || nextY > maxY

  if (outside && world.program.outOfBounds === 'fail') {
    failWorld(world, thread, { type: 'out_of_bounds', message: '精灵移动到了舞台外面' })
    return
  }
  sprite.x = clamp(nextX, 0, maxX)
  sprite.y = clamp(nextY, 0, maxY)
}

function pushSequence(thread: StageThread, sequence: StageSequence): void {
  thread.frames.push(sequenceFrame(sequence))
}

/** 推进一个线程；控制指令不占原子动作名额，但每 Tick 有硬预算。 */
function advanceThread(world: StageWorld, thread: StageThread): void {
  let controlSteps = 0
  while (thread.status === 'running') {
    controlSteps += 1
    if (controlSteps > CONTROL_STEPS_PER_THREAD_TICK) return

    const frame = thread.frames[thread.frames.length - 1]
    if (!frame) {
      thread.status = 'done'
      return
    }
    if (frame.kind === 'sequence') {
      if (frame.index >= frame.sequence.instructions.length) {
        thread.frames.pop()
        continue
      }
      const instruction = frame.sequence.instructions[frame.index]
      frame.index += 1
      if (instruction.kind === 'action') {
        applyAction(world, thread, instruction)
        return
      }
      if (instruction.kind === 'if_touching') {
        const source = world.sprites.find((item) => item.id === thread.targetSpriteId)
        const target = world.sprites.find((item) => item.id === instruction.targetSpriteId)
        if (source && target && spritesTouch(source, target)) {
          pushSequence(thread, instruction.body)
          // 一次性收集物只在首次接触时执行分支，后续循环不能靠持续重叠反复计分。
          if (target.collectible) target.visible = false
        }
        continue
      }
      if (instruction.kind === 'repeat') {
        if (instruction.times > 0) thread.frames.push({ kind: 'repeat', body: instruction.body, remaining: instruction.times })
        continue
      }
      thread.frames.push({ kind: 'forever', body: instruction.body })
      continue
    }
    if (frame.kind === 'repeat') {
      if (frame.remaining <= 0) {
        thread.frames.pop()
      } else {
        frame.remaining -= 1
        pushSequence(thread, frame.body)
      }
      continue
    }
    pushSequence(thread, frame.body)
  }
}

/** 执行一个固定时间步：每个运行中的线程最多执行一个原子动作。 */
export function tick(world: StageWorld): StageWorld {
  const next = cloneWorld(world)
  if (next.status !== 'running') return next
  next.frame += 1

  for (const thread of next.threads) {
    if (next.status !== 'running') break
    if (thread.status === 'running') advanceThread(next, thread)
  }

  const success = evaluateStageSuccess(next.program.successCheck, next)
  if (success && !next.completed) next.completed = true
  if (success && next.program.stopOnSuccess) {
    next.status = 'completed'
    for (const thread of next.threads) {
      if (thread.status === 'running') thread.status = 'stopped'
    }
  } else if (next.threads.length > 0 && next.threads.every((thread) => thread.status === 'done')) {
    next.status = 'finished'
  }
  return next
}

/** 用户主动停止；保留当前舞台快照。 */
export function stopStageWorld(world: StageWorld): StageWorld {
  const next = cloneWorld(world)
  if (next.status === 'running') next.status = 'stopped'
  for (const thread of next.threads) {
    if (thread.status === 'running') thread.status = 'stopped'
  }
  return next
}
