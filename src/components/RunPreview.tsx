import type { RunResult } from '@/types'
import { TurtleCanvas } from './TurtleCanvas'

/** 运行结果的统一展示：成功出图 / print 文本 / 失败的人话面板 */
export function RunPreview({
  result,
  flash = false,
  frame,
}: {
  result: RunResult | null
  flash?: boolean
  frame?: { minX: number; minY: number; maxX: number; maxY: number }
}) {
  if (!result) {
    return (
      <div className="flex h-full items-center justify-center rounded-card border-2 border-dashed border-line text-ink-soft">
        还没有运行
      </div>
    )
  }

  if (!result.ok) return null

  if (result.kind === 'text') {
    return (
      <div
        className={`relative h-full overflow-auto rounded-card border-2 bg-white p-6 ${
          flash ? 'flash-green border-success' : 'border-line'
        }`}
      >
        <pre className="code-font whitespace-pre-wrap text-ink">{result.text || '（没有输出）'}</pre>
        {flash && (
          <div className="absolute right-4 top-4 rounded-full bg-success px-4 py-1.5 text-sm font-semibold text-white">
            跑通了！
          </div>
        )}
      </div>
    )
  }

  return (
    <TurtleCanvas
      art={result.art}
      frame={frame}
      flash={flash}
      className="h-full"
      placeholder="这条代码还没有画出线来"
    />
  )
}
