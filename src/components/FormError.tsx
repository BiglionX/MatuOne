import type { ReactNode } from 'react'

/** 温和红底 + 图标，避免错误只靠变红的文字。 */
export function FormError({ children, className = '' }: { children: ReactNode; className?: string }) {
  if (children == null || children === false || children === '') return null
  return (
    <p role="alert" className={`flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger ${className}`}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 shrink-0">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4.6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11.15" r="0.8" fill="currentColor" />
      </svg>
      <span className="min-w-0">{children}</span>
    </p>
  )
}
