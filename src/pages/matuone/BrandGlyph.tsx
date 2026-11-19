import { useId } from 'react'

/**
 * MatuOne 标志：渐变圆角方框 + M 折线 + 右上角亮点。
 * 折线带 pathLength 归一化，开屏动画要靠它做描边生长。
 */
export function BrandGlyph({
  className = '',
  strokeClassName,
}: {
  className?: string
  strokeClassName?: string
}) {
  const id = useId()
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`matuone-mark-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5EEAD4" />
          <stop offset="55%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#matuone-mark-${id})`} opacity="0.16" />
      <rect
        x="2.75"
        y="2.75"
        width="42.5"
        height="42.5"
        rx="12.25"
        fill="none"
        stroke={`url(#matuone-mark-${id})`}
        strokeWidth="1.6"
      />
      <path
        d="M12 33.5V14.5L24 25.5L36 14.5V33.5"
        pathLength="1"
        className={strokeClassName}
        fill="none"
        stroke={`url(#matuone-mark-${id})`}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="36" cy="14.5" r="2.6" fill="#5EEAD4" />
    </svg>
  )
}
