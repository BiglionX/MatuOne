import { useEffect, useRef, useState } from 'react'
import type { CanvasCommand, RunCursor, RunResult } from '@/types'
import { CanvasPreview } from './CanvasPreview'

/** 左边的输出区：一块屏幕。字和线都直接出现在画面上，不再加说明。 */
function OutputScreen({ flash, children }: { flash?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex h-full min-h-[280px] flex-col overflow-hidden rounded-card bg-ink p-2.5 ${flash ? 'ring-2 ring-success' : ''}`}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md bg-white">{children}</div>
    </div>
  )
}

/** 分步走到 print 时，新打出来的字逐个出现。整段运行一次时直接给出全文。 */
function usePrinted(text: string, typewrite: boolean): string {
  const [shown, setShown] = useState(text)
  const previous = useRef(text)

  useEffect(() => {
    if (!typewrite) {
      previous.current = text
      setShown(text)
      return
    }
    const base = text.startsWith(previous.current) ? previous.current : ''
    const extra = text.slice(base.length)
    if (!extra) {
      previous.current = text
      setShown(text)
      return
    }
    let index = 0
    setShown(base)
    const timer = window.setInterval(() => {
      index += 1
      setShown(base + extra.slice(0, index))
      if (index >= extra.length) {
        window.clearInterval(timer)
        previous.current = text
      }
    }, 35)
    return () => {
      window.clearInterval(timer)
      previous.current = text
      setShown(text)
    }
  }, [text, typewrite])

  return shown
}

function commandsOf(result: RunResult & { ok: true }): CanvasCommand[] {
  return result.output.commands
}

/** 运行结果的统一展示。print 在上方的台词框，海龟线段在下面的画布，文字不把画布挤扁。 */
export function RunPreview({
  result,
  flash = false,
  frame,
  cursor,
  blank = false,
  typewrite = false,
}: {
  result: RunResult | null
  flash?: boolean
  frame?: { minX: number; minY: number; maxX: number; maxY: number }
  cursor?: RunCursor
  /** 还没开始走时，左边保持一块空屏幕 */
  blank?: boolean
  /** 分步执行时，新出现的 print 逐字进入台词框 */
  typewrite?: boolean
}) {
  const text = result?.ok ? result.output.text : ''
  const printed = usePrinted(text, typewrite && !!result?.ok)

  if (!result) {
    if (blank) return <OutputScreen>{null}</OutputScreen>
    return (
      <div className="flex h-full items-center justify-center rounded-card border-2 border-dashed border-line text-ink-soft">
        还没有运行
      </div>
    )
  }

  if (!result.ok) {
    if (!result.loading) return null
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-line text-ink-soft">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" aria-hidden="true" />
        <span>引擎准备中...</span>
        <span className="h-1 w-40 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <span className="engine-bar block h-full w-1/3 bg-brand" />
        </span>
      </div>
    )
  }

  const commands = commandsOf(result)
  const drawn = commands.length > 0
  const spoken = printed.trim()

  return (
    <OutputScreen flash={flash}>
      {spoken ? (
        <pre
          aria-label="控制台输出"
          className={`code-font shrink-0 overflow-auto whitespace-pre-wrap px-5 py-3 text-lg text-ink ${
            drawn ? 'max-h-24 border-b border-line' : 'min-h-0 flex-1'
          }`}
        >
          {printed}
        </pre>
      ) : null}
      {drawn ? (
        <CanvasPreview
          commands={commands}
          frame={frame}
          cursor={cursor}
          className="min-h-[200px] flex-1"
          placeholder=""
        />
      ) : null}
      {!spoken && !drawn ? (
        <pre className="code-font flex min-h-0 flex-1 items-center justify-center text-lg text-ink-soft">（没有输出）</pre>
      ) : null}
      {flash && <DoneBadge />}
    </OutputScreen>
  )
}

function DoneBadge() {
  return (
    <div className="absolute right-4 top-4 rounded-full bg-success px-4 py-1.5 text-sm font-semibold text-white">跑通了！</div>
  )
}
