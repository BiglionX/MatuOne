interface Point {
  label: string
  wpm: number | null
  accuracy: number | null
}

/**
 * 家长端极简折线：只画自己孩子的 WPM，准确率用一行文字。
 * 有效数据点少于 2 个时显示「数据积累中」，不画空图。
 */
export function WpmChart({ series }: { series: Point[] }) {
  const valid = series.filter((p) => p.wpm !== null)
  const latestAccuracy = [...series].reverse().find((p) => p.accuracy !== null)?.accuracy ?? null

  if (valid.length < 2) {
    return (
      <div className="rounded-field border border-dashed border-line bg-canvas px-4 py-8 text-center text-ink-soft">
        数据积累中
        <div className="mt-1 text-sm">再练两次，就能看到成长曲线了。</div>
      </div>
    )
  }

  const values = valid.map((p) => p.wpm as number)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = Math.max(4, max - min)
  const width = 320
  const height = 96
  const padX = 22
  const padY = 16

  const x = (i: number) => padX + (i * (width - padX * 2)) / Math.max(1, series.length - 1)
  const y = (v: number) => height - padY - ((v - (min - span * 0.15)) / (span * 1.3)) * (height - padY * 2)

  const points = series
    .map((p, i) => ({ ...p, x: x(i), y: p.wpm === null ? null : y(p.wpm) }))
    .filter((p) => p.y !== null) as { label: string; wpm: number; x: number; y: number }[]

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="最近四周打字速度折线">
        {[0.25, 0.5, 0.75].map((r) => (
          <line
            key={r}
            x1={padX}
            x2={width - padX}
            y1={padY + r * (height - padY * 2)}
            y2={padY + r * (height - padY * 2)}
            stroke="var(--line)"
            strokeWidth={1}
          />
        ))}
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {points.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r={3.5} fill="var(--brand)" />
            <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize={9} fill="var(--ink-soft)">
              {p.wpm}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-xs text-ink-soft">
        {series.map((p) => (
          <span key={p.label}>{p.label}</span>
        ))}
      </div>
      {latestAccuracy !== null && (
        <p className="mt-3 text-sm text-ink-soft">
          最近一周准确率 <span className="font-semibold text-ink">{latestAccuracy}%</span>
        </p>
      )}
    </div>
  )
}

/** 星星（进度用，不用 emoji 当图标） */
export function Stars({ count, size = 14 }: { count: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${count} 颗星`}>
      {[0, 1, 2].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 17l-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"
            fill={i < count ? 'var(--brand)' : 'transparent'}
            stroke={i < count ? 'var(--brand)' : 'var(--line)'}
            strokeWidth={1.6}
          />
        </svg>
      ))}
    </span>
  )
}
