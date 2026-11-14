import type { RunCursor, RunResult } from '@/types'
import { TurtleCanvas } from './TurtleCanvas'

/** 左边的输出区：一块屏幕。字和线都直接出现在画面上，不再加说明。 */
function OutputScreen({ flash, children }: { flash?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex h-full min-h-[280px] flex-col overflow-hidden rounded-card bg-ink p-2.5 ${flash ? 'ring-2 ring-success' : ''}`}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md bg-white">{children}</div>
    </div>
  )
}

/** 运行结果的统一展示：成功出图 / print 文本 / 失败的人话面板 */
export function RunPreview({
  result,
  flash = false,
  frame,
  cursor,
  blank = false,
}: {
  result: RunResult | null
  flash?: boolean
  frame?: { minX: number; minY: number; maxX: number; maxY: number }
  cursor?: RunCursor
  /** 还没开始走时，左边保持一块空屏幕 */
  blank?: boolean
}) {
  if (!result) {
    if (blank) return <OutputScreen>{null}</OutputScreen>
    return (
      <div className="flex h-full items-center justify-center rounded-card border-2 border-dashed border-line text-ink-soft">
        还没有运行
      </div>
    )
  }

  if (!result.ok) return null

  const printed = result.kind === 'text' || result.text?.trim() ? result.text?.trim() ?? '' : ''

  if (result.kind === 'text') {
    return (
      <OutputScreen flash={flash}>
        <pre className="code-font h-full overflow-auto whitespace-pre-wrap px-5 py-5 text-lg text-ink">
          {printed || '（没有输出）'}
        </pre>
        {flash && <DoneBadge />}
      </OutputScreen>
    )
  }

  return (
    <OutputScreen flash={flash}>
      {printed && <pre className="code-font shrink-0 whitespace-pre-wrap px-5 pt-5 text-lg text-ink">{printed}</pre>}
      <TurtleCanvas
        art={result.art}
        frame={frame}
        cursor={cursor}
        embedded
        className="min-h-0 flex-1"
        placeholder={printed || cursor ? '' : '这条代码还没有画出线来'}
      />
      {flash && <DoneBadge />}
    </OutputScreen>
  )
}

function DoneBadge() {
  return (
    <div className="absolute right-4 top-4 rounded-full bg-success px-4 py-1.5 text-sm font-semibold text-white">跑通了！</div>
  )
}
