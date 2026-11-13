import type { TurtleArt } from '@/types'

interface Props {
  art?: TurtleArt
  /** 锁定的坐标系。传入后不再按当前图形自适应，改边长才能看出来。 */
  frame?: { minX: number; minY: number; maxX: number; maxY: number }
  /** 运行成功后画布边框闪绿 */
  flash?: boolean
  className?: string
  placeholder?: string
}

/** Turtle 画布：把执行结果画成 SVG（不引入图表库） */
export function TurtleCanvas({ art, frame, flash = false, className = '', placeholder = '画布还空着' }: Props) {
  const strokes = art?.strokes ?? []
  const bounds = frame ?? art?.bounds ?? { minX: 0, minY: 0, maxX: 1, maxY: 1 }

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
      className={`relative rounded-card border-2 bg-white transition-colors ${
        flash ? 'flash-green border-success' : 'border-line'
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
      </svg>
      {!strokes.length && (
        <div className="absolute inset-0 flex items-center justify-center text-ink-soft">{placeholder}</div>
      )}
      {flash && (
        <div className="absolute right-4 top-4 rounded-full bg-success px-4 py-1.5 text-sm font-semibold text-white">
          跑通了！
        </div>
      )}
    </div>
  )
}
