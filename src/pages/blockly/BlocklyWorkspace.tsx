import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Block, Field, FieldDropdown, Flyout, MenuOption, Workspace, WorkspaceSvg } from 'blockly'
import type {
  ModuleAvailableBlock,
  ModuleBlockArgDefinition,
  ModuleBlockInstance,
  ModuleBlockKind,
  ModuleScalar,
  ModuleStageVariable,
} from '@/modules/curriculum/moduleLevelBody'
import type { BlockExecutionNode } from '@/modules/curriculum/moduleLevelInterpreter'

export interface BlocklyWorkspaceHandle {
  /** 工作区当前的积木树（含嵌套），解释器按这棵树执行。 */
  getExecutionTree(): BlockExecutionNode[]
  /** 工作区积木总数（含嵌套子块），和 body.workspace.max_blocks 是同一个口径。 */
  getBlockCount(): number
  /** Stage 工作区当前变量定义；新建变量只保存在本次工作区。 */
  getVariables(): ModuleStageVariable[]
  reset(): void
}

interface BlocklyWorkspaceProps {
  availableBlocks: ModuleAvailableBlock[]
  initialBlocks: ModuleBlockInstance[]
  maxBlocks: number
  /** Stage 关卡传入场景变量；Grid 不传，因此不会显示创建变量 UI。 */
  initialVariables?: readonly ModuleStageVariable[]
  onVariablesChange?: (variables: ModuleStageVariable[]) => void
  onReadyChange?: (ready: boolean) => void
  /** 积木数量变化时回调；studentChanged 为 false 表示只同步初始/重置后的数量。 */
  onBlocksChange?: (blockCount: number, studentChanged?: boolean) => void
  /** 要闪一下的积木类型；小精灵点名要拖哪一块时用。 */
  highlightBlockType?: string | null
  /** 工作区整体要闪烁时为 true。 */
  focusWorkspace?: boolean
}

type BlocklyRuntime = typeof import('blockly')

/** 控制积木的嵌套体输入名，和解释器里的 children 一一对应。 */
const BODY_INPUT = 'BODY'
/** then_else 形状控制积木的「不成立时」分支输入名，对应 children[1]。 */
const ELSE_INPUT = 'ELSE'

/** 变量下拉菜单打开时按工作区读取，避免全局积木定义缓存住旧关卡选项。 */
const workspaceVariableDefinitions = new WeakMap<Workspace, readonly ModuleStageVariable[]>()

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
    case 'variable': {
      const fallback: MenuOption[] = typeof arg.default === 'string' ? [[arg.default, arg.default]] : []
      const field = new blockly.FieldDropdown(function (this: FieldDropdown) {
        const workspace = this.getSourceBlock()?.workspace
        const variables = workspace ? workspaceVariableDefinitions.get(workspace) : undefined
        const options: MenuOption[] = (variables ?? []).map((variable) => [variable.name, variable.id])
        return options.length ? options : fallback.length ? fallback : [['请选择变量', '']]
      }, (value) => value || null)
      if (typeof arg.default === 'string') field.setValue(arg.default)
      return field
    }
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
 * kind 决定积木形状：动作/传感器积木是一条语句，控制积木额外带一个嵌套体输入。
 * branches 决定控制积木有几支：then 只有「成立时」，then_else 还有「不成立时」。
 */
export function defineAvailableBlocks(blockly: BlocklyRuntime, availableBlocks: ModuleAvailableBlock[]) {
  for (const definition of availableBlocks) {
    if (blockly.Blocks[definition.type]) continue
    const shape = definition.branches ?? 'then'
    blockly.Blocks[definition.type] = {
      init(this: Block) {
        this.setColour(definition.color ?? KIND_COLORS[definition.kind])
        // 积木名一定要露出来。
        // 之前「有参数的积木就只显示参数」，结果工具箱里摆着「步数10」「精灵 苹果」，
        // 孩子根本认不出哪一块是「移动」、哪一块是「如果碰到」——积木名才是他认得的那个词。
        this.appendDummyInput().appendField(definition.label)
        if (definition.args.length) {
          const input = this.appendDummyInput()
          for (const arg of definition.args) {
            input.appendField(arg.label)
            input.appendField(createArgField(blockly, arg), arg.name)
          }
        }
        this.setPreviousStatement(true)
        this.setNextStatement(true)
        if (definition.kind === 'control') {
          this.appendStatementInput(BODY_INPUT)
          if (shape === 'then_else') {
            this.appendDummyInput().appendField('否则')
            this.appendStatementInput(ELSE_INPUT)
          }
        }
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
  if ((definition.branches ?? 'then') === 'then_else') {
    // children 固定两项：成立分支、不成立分支，空分支留 null。
    const elseInput = block.getInput(ELSE_INPUT)
    const elseChild = readChain(elseInput?.connection?.targetBlock() ?? null, definitions)
    node.children = [child, elseChild]
  } else if (child) {
    node.children = [child]
  }
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
    for (const arg of definition.args) {
      if (arg.type !== 'variable' || block.getFieldValue(arg.name)) continue
      const firstVariable = workspaceVariableDefinitions.get(workspace)?.[0]
      if (firstVariable) block.setFieldValue(firstVariable.id, arg.name)
    }
  }
  const children = instance.children ?? []
  if (children.length) {
    const bodyInput = block.getInput(BODY_INPUT)
    if ((definition?.branches ?? 'then') === 'then_else') {
      // 成立分支接 BODY，不成立分支接 ELSE，两支各自独立不串在一起。
      const thenHead = buildChain(workspace, children[0] ? [children[0]] : [], availableBlocks)
      if (bodyInput?.connection && thenHead?.previousConnection) {
        bodyInput.connection.connect(thenHead.previousConnection)
      }
      const elseInput = block.getInput(ELSE_INPUT)
      const elseHead = buildChain(workspace, children[1] ? [children[1]] : [], availableBlocks)
      if (elseInput?.connection && elseHead?.previousConnection) {
        elseInput.connection.connect(elseHead.previousConnection)
      }
    } else {
      const childHead = buildChain(workspace, children.filter((child): child is ModuleBlockInstance => child !== null), availableBlocks)
      if (bodyInput?.connection && childHead?.previousConnection) {
        bodyInput.connection.connect(childHead.previousConnection)
      }
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

/**
 * 在工作区或工具箱里找到指定类型的积木。
 *
 * 工作区里已经放过一块的话直接用它；否则去工具箱找——分类工具箱一次只展开一个分类，
 * 所以先把每个分类轮流选中，再在 flyout 工作区里翻积木，找到就停在那个分类。
 */
function findHighlightBlock(workspace: WorkspaceSvg, type: string): Block | null {
  const placed = workspace.getAllBlocks(false).find((block) => block.type === type)
  if (placed) return placed

  const toolbox = workspace.getToolbox()
  if (!toolbox) return null
  const original = toolbox.getSelectedItem()
  for (const item of toolbox.getToolboxItems()) {
    if (!item.isSelectable()) continue
    toolbox.setSelectedItem(item)
    const flyoutWorkspace = toolbox.getFlyout()?.getWorkspace()
    const match = flyoutWorkspace?.getAllBlocks(false).find((block) => block.type === type)
    if (match) return match
  }
  if (original) toolbox.setSelectedItem(original)
  return null
}

/** 工作区里的积木其实都是 BlockSvg，只有它才拿得到自己的 SVG 根节点。 */
function svgGroupOf(block: Block): SVGElement | null {
  const target = block as unknown as { getSvgRoot?: () => SVGGElement }
  return typeof target.getSvgRoot === 'function' ? target.getSvgRoot() : null
}

/** 给目标积木加上闪烁的类名；type 为空时把之前的高亮撤掉。 */
function applyBlockHighlight(workspace: WorkspaceSvg, type: string | null) {
  // 工具箱的 flyout 是另一个 SVG，得在整个注入容器里找。
  const host = workspace.getInjectionDiv()
  for (const group of host.querySelectorAll('.matu-block-highlight')) {
    group.classList.remove('matu-block-highlight')
  }
  if (!type) return
  try {
    const target = findHighlightBlock(workspace, type)
    if (target) svgGroupOf(target)?.classList.add('matu-block-highlight')
  } catch {
    // 工具箱还没准备好就下次再试，高亮失败不该把整个页面带崩。
  }
}

/** Blockly 只在组件挂载后动态导入；类型导入会在构建时擦除。 */
export const BlocklyWorkspace = forwardRef<BlocklyWorkspaceHandle, BlocklyWorkspaceProps>(function BlocklyWorkspace(
  { availableBlocks, initialBlocks, maxBlocks, initialVariables, onVariablesChange, onReadyChange, onBlocksChange, highlightBlockType, focusWorkspace },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<WorkspaceSvg | null>(null)
  const definitionsRef = useRef(availableBlocks)
  /** 铺初始积木和「重新开始」时不算学生操作，不往外抛变化通知。 */
  const suppressRef = useRef(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [variables, setVariables] = useState<ModuleStageVariable[]>(() => [...(initialVariables ?? [])])
  const variablesRef = useRef(variables)
  const [variableName, setVariableName] = useState('')
  const [variableError, setVariableError] = useState('')

  useEffect(() => {
    const next = [...(initialVariables ?? [])]
    variablesRef.current = next
    setVariables(next)
    setVariableName('')
    setVariableError('')
    const workspace = workspaceRef.current
    if (workspace) workspaceVariableDefinitions.set(workspace, next)
  }, [initialVariables])

  const createVariable = () => {
    const name = variableName.trim()
    if (!name) return
    if (variablesRef.current.some((variable) => variable.name === name)) {
      setVariableError('已经有同名变量了，换一个名字吧。')
      return
    }
    const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${variablesRef.current.length + 1}`
    const variable: ModuleStageVariable = { id: `var-${suffix}`, name, initial: 0, scope: 'global' }
    const next = [...variablesRef.current, variable]
    variablesRef.current = next
    setVariables(next)
    setVariableName('')
    setVariableError('')
    const workspace = workspaceRef.current
    if (workspace) workspaceVariableDefinitions.set(workspace, next)
    onVariablesChange?.(next)
  }

  useImperativeHandle(ref, () => ({
    getExecutionTree() {
      const workspace = workspaceRef.current
      if (!workspace) throw new Error('积木工作区还在加载，请稍候')
      return readTree(workspace, definitionsRef.current)
    },
    getBlockCount() {
      return workspaceRef.current?.getAllBlocks(false).length ?? 0
    },
    getVariables() {
      return variablesRef.current.map((variable) => ({ ...variable }))
    },
    reset() {
      const workspace = workspaceRef.current
      if (!workspace) return
      suppressRef.current = true
      workspace.clear()
      loadInitialBlocks(workspace, initialBlocks, definitionsRef.current)
      suppressRef.current = false
      onBlocksChange?.(workspace.getAllBlocks(false).length, false)
    },
  }), [initialBlocks, onBlocksChange])

  // 学生动了积木就通知外面一声，小精灵靠它判断「有人操作」还是「干等着」。
  useEffect(() => {
    const workspace = workspaceRef.current
    if (!workspace || !onBlocksChange) return
    const handleChange = (event: { type: string; isUiEvent?: boolean }) => {
      if (event.isUiEvent || suppressRef.current) return
      // Blockly 13 的事件类型值就是 create / delete / move 这三个短名。
      if (event.type !== 'create' && event.type !== 'delete' && event.type !== 'move') return
      onBlocksChange(workspace.getAllBlocks(false).length, true)
    }
    workspace.addChangeListener(handleChange)
    return () => workspace.removeChangeListener(handleChange)
  }, [onBlocksChange, ready])

  // 小精灵点名某一块积木时，让它在工具箱里闪起来。
  useEffect(() => {
    const workspace = workspaceRef.current
    if (!workspace || !ready) return
    applyBlockHighlight(workspace, highlightBlockType ?? null)
  }, [highlightBlockType, ready])

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
        workspaceVariableDefinitions.set(workspace, variablesRef.current)
        // Blockly 13 的焦点管理在拖拽开始时会把焦点移到拖拽层，toolbox 随之失焦，
        // Blockly 就把 flyout 自动收起来。结果是孩子拖走一块积木后工具箱空了，
        // 必须再点一次分类才能接着拖——托辅班的孩子多半直接放弃。
        // 关掉 autoClose 让工具箱常驻，积木随时能继续拖。
        // getFlyout() 的静态类型是 IFlyout，setAutoClose 只在 FlyoutBase 上有。
        const flyout = workspace.getToolbox()?.getFlyout() as Flyout | null
        flyout?.setAutoClose(false)
        // 铺初始积木不是学生操作，别把闲置计时白重置一次。
        suppressRef.current = true
        loadInitialBlocks(workspace, initialBlocks, availableBlocks)
        suppressRef.current = false
        onBlocksChange?.(workspace.getAllBlocks(false).length, false)
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
  }, [availableBlocks, initialBlocks, maxBlocks, onBlocksChange, onReadyChange])

  return (
    <div
      className={`blockly-workspace relative min-h-[360px] overflow-hidden rounded-3xl border bg-white ${
        focusWorkspace ? 'matu-focus-ring border-amber-400' : 'border-slate-200'
      }`}
    >
      <style>{BLOCKLY_CURSOR_CSS}</style>
      {initialVariables !== undefined ? (
        <div className="space-y-2 border-b border-emerald-100 bg-emerald-50/70 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-emerald-800">全局变量</span>
            {variables.map((variable) => (
              <span key={variable.id} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                {variable.name} = {String(variable.initial)}
              </span>
            ))}
            <form
              className="ml-auto flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                createVariable()
              }}
            >
              <input
                aria-label="新变量名"
                className="w-28 rounded-field border border-emerald-200 bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus:border-emerald-500"
                value={variableName}
                onChange={(event) => setVariableName(event.target.value)}
                placeholder="输入变量名"
                maxLength={12}
              />
              <button
                type="submit"
                className="btn-secondary px-3 py-1.5 text-sm"
                disabled={!ready || !variableName.trim()}
              >
                创建变量
              </button>
            </form>
          </div>
          {variableError ? <p className="text-xs text-red-700" role="alert">{variableError}</p> : null}
        </div>
      ) : null}
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
