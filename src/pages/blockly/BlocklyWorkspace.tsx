import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Block, Field, MenuOption, WorkspaceSvg } from 'blockly'
import type {
  ModuleAvailableBlock,
  ModuleBlockArgDefinition,
  ModuleBlockInstance,
  ModuleBlockKind,
  ModuleScalar,
} from '@/modules/curriculum/moduleLevelBody'
import type { BlockExecutionNode } from '@/modules/curriculum/moduleLevelInterpreter'

export interface BlocklyWorkspaceHandle {
  /** 工作区当前的积木树（含嵌套），解释器按这棵树执行。 */
  getExecutionTree(): BlockExecutionNode[]
  /** 工作区积木总数（含嵌套子块），和 body.workspace.max_blocks 是同一个口径。 */
  getBlockCount(): number
  reset(): void
}

interface BlocklyWorkspaceProps {
  availableBlocks: ModuleAvailableBlock[]
  initialBlocks: ModuleBlockInstance[]
  maxBlocks: number
  onReadyChange?: (ready: boolean) => void
}

type BlocklyRuntime = typeof import('blockly')

/** 控制积木的嵌套体输入名，和解释器里的 children 一一对应。 */
const BODY_INPUT = 'BODY'

/** Blockly 的删除光标默认指向 .cur 二进制资源；本地只提供精灵图，改用系统光标避
免请求不存在的文件。 */
const BLOCKLY_CURSOR_CSS = `
  .blockly-workspace .blocklyDraggingDelete,
  .blockly-workspace .blocklyDraggingDelete .blocklyField {
    cursor: grabbing !important;
  }
`

const KIND_COLORS: Record<ModuleBlockKind, string> = {
  action: '#34D399',
  sensor: '#38BDF8',
  control: '#FBBF24',
}

/**
 * 按积木定义生成可编辑字段。
 *
 * Blockly 的 `Input.appendField` 传字符串只会得到一个静态标签，
 * 所以可编辑参数必须传字段实例，再用第二个参数把字段名挂上去。
 */
function createArgField(blockly: BlocklyRuntime, arg: ModuleBlockArgDefinition): Field {
  switch (arg.type) {
    case 'number': {
      const min = arg.min ?? 0
      const max = arg.max ?? 100
      const precision = arg.step ?? 1
      const value = typeof arg.default === 'number' ? arg.default : min
      return new blockly.FieldNumber(value, min, max, precision)
    }
    case 'boolean':
      return new blockly.FieldCheckbox(arg.default === true)
    case 'select': {
      const options: MenuOption[] = (arg.options ?? []).map((option) => [option.label, String(option.value)])
      if (!options.length) return new blockly.FieldTextInput('')
      const field = new blockly.FieldDropdown(options)
      const wanted = typeof arg.default === 'string' ? arg.default : undefined
      if (wanted !== undefined && options.some((option) => option !== 'separator' && option[1] === wanted)) {
        field.setValue(wanted)
      }
      return field
    }
    default:
      return new blockly.FieldTextInput(typeof arg.default === 'string' ? arg.default : '')
  }
}

/**
 * 积木注册表：遍历本关 available_blocks 动态注册，不再写死 move_forward。
 *
 * kind 决定积木形状：动作/传感器积木是一条语句，制积木额外带一个嵌套体输入。
 */
export function defineAvailableBlocks(blockly: BlocklyRuntime, availableBlocks: ModuleAvailableBlock[]) {
  for (const definition of availableBlocks) {
    if (blockly.Blocks[definition.type]) continue
    blockly.Blocks[definition.type] = {
      init(this: Block) {
        this.setColour(definition.color ?? KIND_COLORS[definition.kind])
        if (definition.args.length) {
          const input = this.appendDummyInput()
          for (const arg of definition.args) {
            input.appendField(arg.label)
            input.appendField(createArgField(blockly, arg), arg.name)
          }
        } else {
          this.appendDummyInput().appendField(definition.label)
        }
        this.setPreviousStatement(true)
        this.setNextStatement(true)
        if (definition.kind === 'control') this.appendStatementInput(BODY_INPUT)
      },
    }
  }
}

function readArgs(block: Block, definition: ModuleAvailableBlock): Record<string, ModuleScalar> {
  const args: Record<string, ModuleScalar> = {}
  for (const arg of definition.args) {
    const raw = block.getFieldValue(arg.name)
    if (raw === 'TRUE') {
      args[arg.name] = true
      continue
    }
    if (raw === 'FALSE') {
      args[arg.name] = false
      continue
    }
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') args[arg.name] = raw
  }
  return args
}

/** 把一条 next 链连同控制积木的嵌套体读成执行树。 */
function readChain(block: Block | null, definitions: ModuleAvailableBlock[]): BlockExecutionNode | null {
  if (!block) return null
  const definition = definitions.find((item) => item.type === block.type)
  if (!definition) throw new Error(`工作区出现未注册积木 ${block.type}`)
  const node: BlockExecutionNode = { type: block.type, args: readArgs(block, definition) }
  const bodyInput = block.getInput(BODY_INPUT)
  const child = readChain(bodyInput?.connection?.targetBlock() ?? null, definitions)
  if (child) node.children = [child]
  node.next = readChain(block.getNextBlock(), definitions)
  return node
}

/** 把工作区当前状态读成执行树；顶层的 next 链和控制积木的嵌套体都在里面。 */
export function readTree(workspace: WorkspaceSvg, definitions: ModuleAvailableBlock[]): BlockExecutionNode[] {
  const roots: BlockExecutionNode[] = []
  for (const top of workspace.getTopBlocks(true)) {
    const node = readChain(top, definitions)
    if (node) roots.push(node)
  }
  return roots
}

/** 顺着 next 链找到链尾。 */
function chainTail(block: Block): Block {
  let tail = block
  while (tail.getNextBlock()) tail = tail.getNextBlock()!
  return tail
}

/**
 * 按定义创建一块积木，并挂上嵌套体和 next 链。
 *
 * Blockly 13 的 `workspace.newBlock()` 只建模型不渲染，积木不会出现在画布上；
 * 必须自己调 `initSvg()`（内部有 initialized 保护，重复调安全）再 `queueRender()`。
 */
function createBlock(
  workspace: WorkspaceSvg,
  instance: ModuleBlockInstance,
  availableBlocks: ModuleAvailableBlock[],
): Block {
  const block = workspace.newBlock(instance.type)
  block.initSvg()
  block.queueRender()
  const definition = availableBlocks.find((item) => item.type === instance.type)
  if (definition) {
    for (const [name, value] of Object.entries(instance.args)) block.setFieldValue(value, name)
  }
  const children = instance.children ?? []
  if (children.length) {
    const bodyInput = block.getInput(BODY_INPUT)
    const childHead = buildChain(workspace, children, availableBlocks)
    if (bodyInput?.connection && childHead?.previousConnection) {
      bodyInput.connection.connect(childHead.previousConnection)
    }
  }
  if (instance.next) {
    const nextHead = buildChain(workspace, [instance.next], availableBlocks)
    if (nextHead?.previousConnection && block.nextConnection) {
      block.nextConnection.connect(nextHead.previousConnection)
    }
  }
  return block
}

/**
 * 连接一串同层积木，返回链头。
 *
 * 数组里的每一项自带一条 next 链（createBlock 内部建好），这些链按数组顺序首尾相接。
 * 这样 `children` 数组既能表示「控制积木里的几块积木」，`initial_blocks` 也能表示
 * 「工作区预置的一段程序」，两种写法都不会重复建块。
 */
function buildChain(
  workspace: WorkspaceSvg,
  instances: ModuleBlockInstance[],
  availableBlocks: ModuleAvailableBlock[],
): Block | null {
  let head: Block | null = null
  let tail: Block | null = null
  for (const instance of instances) {
    const block = createBlock(workspace, instance, availableBlocks)
    if (tail?.nextConnection && block.previousConnection) {
      tail.nextConnection.connect(block.previousConnection)
    } else if (!head) {
      head = block
    }
    tail = chainTail(block)
  }
  return head
}

/** 按 body.workspace.initial_blocks 把初始积木铺进工作区。 */
export function loadInitialBlocks(workspace: WorkspaceSvg, initialBlocks: ModuleBlockInstance[], availableBlocks: ModuleAvailableBlock[]) {
  const head = buildChain(workspace, initialBlocks, availableBlocks)
  // 新建的积木都堆在原点，挪开一点，别一上来就盖在一起。
  head?.moveBy(40, 40)
  workspace.scrollCenter()
}

/** Blockly 只在组件挂载后动态导入；类型导入会在构建时擦除。 */
export const BlocklyWorkspace = forwardRef<BlocklyWorkspaceHandle, BlocklyWorkspaceProps>(function BlocklyWorkspace(
  { availableBlocks, initialBlocks, maxBlocks, onReadyChange },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<WorkspaceSvg | null>(null)
  const definitionsRef = useRef(availableBlocks)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useImperativeHandle(ref, () => ({
    getExecutionTree() {
      const workspace = workspaceRef.current
      if (!workspace) throw new Error('积木工作区还在加载，请稍候')
      return readTree(workspace, definitionsRef.current)
    },
    getBlockCount() {
      return workspaceRef.current?.getAllBlocks(false).length ?? 0
    },
    reset() {
      const workspace = workspaceRef.current
      if (!workspace) return
      workspace.clear()
      loadInitialBlocks(workspace, initialBlocks, definitionsRef.current)
    },
  }), [initialBlocks])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    let workspace: WorkspaceSvg | null = null
    setReady(false)
    onReadyChange?.(false)
    setError('')

    void import('blockly')
      .then((blockly) => {
        if (cancelled) return
        definitionsRef.current = availableBlocks
        defineAvailableBlocks(blockly, availableBlocks)
        const categories = Array.from(new Set(availableBlocks.map((block) => block.category))).map((category) => ({
          kind: 'category',
          name: category,
          contents: availableBlocks.filter((block) => block.category === category).map((block) => ({ kind: 'block', type: block.type })),
        }))
        workspace = blockly.inject(host, {
          toolbox: { kind: 'categoryToolbox', contents: categories },
          trashcan: true,
          sounds: false,
          // 全站 COEP require-corp 会拦截 Blockly 默认的远程 media，精灵图必须同源。
          media: '/blockly/',
          maxBlocks,
          renderer: 'geras',
          zoom: { controls: true, startScale: 0.9, wheel: true },
          move: { scrollbars: true, drag: true, wheel: true },
        })
        workspaceRef.current = workspace
        loadInitialBlocks(workspace, initialBlocks, availableBlocks)
        setReady(true)
        onReadyChange?.(true)
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setError(reason instanceof Error ? reason.message : '积木工作区加载失败')
        onReadyChange?.(false)
      })

    return () => {
      cancelled = true
      workspace?.dispose()
      if (workspaceRef.current === workspace) workspaceRef.current = null
    }
  }, [availableBlocks, initialBlocks, maxBlocks, onReadyChange])

  return (
    <div className="blockly-workspace relative min-h-[360px] overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <style>{BLOCKLY_CURSOR_CSS}</style>
      <div ref={hostRef} className="h-[360px] w-full" />
      {!ready && !error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 text-sm text-slate-500" role="status">
          正在准备积木工作区…
        </div>
      ) : null}
      {error ? <p className="absolute inset-x-4 bottom-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p> : null}
    </div>
  )
})
