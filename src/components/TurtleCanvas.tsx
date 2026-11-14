import type { RunCursor, TurtleArt } from '@/types'

interface Props {
  art?: TurtleArt
  /** 锁定的坐标系。传入后不再按当前图形自适应，改边长才能看出来。 */
  frame?: { minX: number; minY: number; maxX: number; maxY: number }
  /** 运行成功后画布边框闪绿 */
  flash?: boolean
  /** 嵌进带打印文字的结果卡时，不再自己画边框。 */
  embedded?: boolean
  /** 分步执行时的当前位置。跑完后不要传，点会消失。 */
  cursor?: RunCursor
  className?: string
  placeholder?: string
}

/** Turtle 画布：把执行结果画成 SVG（不引入图表库） */
export function TurtleCanvas({
  art,
  frame,
  flash = false,
  embedded = false,
  cursor,
  className = '',
  placeholder = '画布还空着',
}: Props) {
  const strokes = art?.strokes ?? []
  const raw = frame ?? art?.bounds ?? { minX: 0, minY: 0, maxX: 1, maxY: 1 }
  const rawSpan = Math.max(raw.maxX - raw.minX, raw.maxY - raw.minY)
  const bounds =
    cursor && rawSpan < 40
      ? { minX: cursor.x - 40, minY: cursor.y - 40, maxX: cursor.x + 40, maxY: cursor.y + 40 }
      : raw

  const width = Math.max(1, bounds.maxX - bounds.minX)
  const height = Math.max(1, bounds.maxY - bounds.minY)
  const pad = Math.max(width, height) * 0.08
  const viewMinX = bounds.minX - pad
  const viewMinY = bounds.minY - pad
  const viewW = width + pad * 2
  const viewH = height + pad * 2

  const toY = (y: number) => -y

  return (
    <div
      className={`relative bg-white transition-colors ${
        embedded ? 'min-h-0 flex-1' : `rounded-card border-2 ${flash ? 'flash-green border-success' : 'border-line'}`
      } ${className}`}
    >
      <svg
        viewBox={`${viewMinX} ${toY(viewMinY + viewH)} ${viewW} ${viewH}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="程序运行结果"
      >
        {strokes.map((stroke, i) => (
          <polyline
            key={i}
            points={stroke.points.map(([x, y]) => `${x},${toY(y)}`).join(' ')}
            fill="none"
            stroke={stroke.color}
            strokeWidth={Math.max(1.6, Math.max(width, height) / 90)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {cursor && (
          <circle cx={cursor.x} cy={toY(cursor.y)} r={Math.max(width, height) * 0.032} fill="var(--art-purple)" />
        )}
      </svg>
      {!strokes.length && !cursor && (
        <div className="absolute inset-0 flex items-center justify-center text-ink-soft">{placeholder}</div>
      )}
      {flash && !embedded && (
        <div className="absolute right-4 top-4 rounded-full bg-success px-4 py-1.5 text-sm font-semibold text-white">
          跑通了！
        </div>
      )}
    </div>
  )
}
