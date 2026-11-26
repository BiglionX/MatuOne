import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Block, WorkspaceSvg } from 'blockly'
import type { ModuleAvailableBlock, ModuleBlockInstance, ModuleScalar } from '@/modules/curriculum/moduleLevelBody'
import type { BlockExecutionCommand } from '@/modules/curriculum/moduleLevelInterpreter'

/** Blockly 的删除光标默认指向 .cur 二进制资源；本地只提供精灵图，改用系统光标避免请求不存在的文件。 */
const BLOCKLY_CURSOR_CSS = `
  .blockly-workspace .blocklyDraggingDelete,
  .blockly-workspace .blocklyDraggingDelete .blocklyField {
    cursor: grabbing !important;
  }
`

export interface BlocklyWorkspaceHandle {
  getExecutionSequence(): BlockExecutionCommand[]
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

function defineAvailableBlocks(blockly: BlocklyRuntime, availableBlocks: ModuleAvailableBlock[]) {
  for (const definition of availableBlocks) {
    if (blockly.Blocks[definition.type]) continue
    if (definition.type !== 'move_forward') {
      throw new Error(`当前 Blockly 工作区尚未注册积木类型 ${definition.type}`)
    }
    blockly.Blocks[definition.type] = {
      init(this: Block) {
        this.setColour(definition.color ?? '#34D399')
        this.appendDummyInput().appendField(definition.label)
        this.setPreviousStatement(true)
        this.setNextStatement(true)
      },
    }
  }
}

function readArgs(block: Block, definition: ModuleAvailableBlock): Record<string, ModuleScalar> {
  const args: Record<string, ModuleScalar> = {}
  for (const arg of definition.args) {
    const value = block.getFieldValue(arg.name)
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') args[arg.name] = value
  }
  return args
}

function loadInitialBlocks(workspace: WorkspaceSvg, initialBlocks: ModuleBlockInstance[], availableBlocks: ModuleAvailableBlock[]) {
  let previous: Block | null = null
  for (const initial of initialBlocks) {
    const block = workspace.newBlock(initial.type)
    const definition = availableBlocks.find((item) => item.type === initial.type)
    if (definition) {
      for (const [name, value] of Object.entries(initial.args)) block.setFieldValue(value, name)
    }
    const previousConnection = block.previousConnection
    if (previous?.nextConnection && previousConnection) previous.nextConnection.connect(previousConnection)
    previous = block
  }
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
    getExecutionSequence() {
      const workspace = workspaceRef.current
      if (!workspace) throw new Error('积木工作区还在加载，请稍候')
      const sequence: BlockExecutionCommand[] = []
      for (const topBlock of workspace.getTopBlocks(true)) {
        let block: Block | null = topBlock
        while (block) {
          const definition = definitionsRef.current.find((item) => item.type === block?.type)
          if (!definition) throw new Error(`工作区出现未注册积木 ${block.type}`)
          sequence.push({ type: block.type, args: readArgs(block, definition) })
          block = block.getNextBlock()
        }
      }
      return sequence
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
          // 全站 COEP require-corp 会拦截 Blockly 默认的远程 media，精灵图必须走同源。
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
