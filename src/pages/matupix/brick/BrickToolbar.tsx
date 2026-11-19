import type { ReactNode } from 'react'

type BrickToolbarProps = {
  canUndo: boolean
  canRedo: boolean
  canClear: boolean
  onUndo: () => void
  onRedo: () => void
  onExport: () => void
  onResetView: () => void
  onClear: () => void
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

function ToolButton({
  label,
  enabled,
  onClick,
  children,
}: {
  label: string
  enabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  const locked = enabled === false
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-disabled={locked ? true : undefined}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-white text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--art-purple)] focus-visible:ring-offset-2 ${
        locked ? 'cursor-not-allowed opacity-40' : ''
      }`}
    >
      {children}
    </button>
  )
}

export function BrickToolbar({ canUndo, canRedo, canClear, onUndo, onRedo, onExport, onResetView, onClear }: BrickToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-1" role="group" aria-label="编辑">
      <ToolButton label="撤销" enabled={canUndo} onClick={onUndo}>
        <Icon>
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H12" />
        </Icon>
      </ToolButton>
      <ToolButton label="重做" enabled={canRedo} onClick={onRedo}>
        <Icon>
          <path d="m15 14 5-5-5-5" />
          <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H12" />
        </Icon>
      </ToolButton>
      <ToolButton label="导出 LDraw" onClick={onExport}>
        <Icon>
          <path d="M12 4v10" />
          <path d="m8 10 4 4 4-4" />
          <path d="M5 19h14" />
        </Icon>
      </ToolButton>
      <ToolButton label="重置视角" onClick={onResetView}>
        <Icon>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2" />
          <path d="M12 19v2" />
          <path d="M3 12h2" />
          <path d="M19 12h2" />
        </Icon>
      </ToolButton>
      <ToolButton label="清空" enabled={canClear} onClick={onClear}>
        <Icon>
          <path d="M4 7h16" />
          <path d="M9 7V5h6v2" />
          <path d="M7 7l1 12h8l1-12" />
        </Icon>
      </ToolButton>
    </div>
  )
}
