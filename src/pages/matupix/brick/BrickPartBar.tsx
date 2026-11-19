import { BRICK_PARTS, type BrickType } from './brickTypes'

type BrickPartBarProps = {
  part: BrickType
  emphasized?: boolean
  open?: boolean
  onOpen: () => void
}

export function BrickPartBar({ part, emphasized = false, open = false, onOpen }: BrickPartBarProps) {
  const current = BRICK_PARTS.find((item) => item.type === part) ?? BRICK_PARTS[0]
  return (
    <section aria-label="零件">
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex min-h-[72px] w-full items-center justify-center rounded-[22px] bg-gradient-to-b from-[#4FCB6C] to-[#1F8C36] px-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_3px_0_#166C28,0_8px_16px_rgba(24,110,48,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1F8C36] ${
          emphasized ? 'ring-4 ring-white' : ''
        }`}
      >
        <span className="inline-flex max-w-full items-center gap-3">
          <BrickGlyph />
          <span className="min-w-0 text-left">
            <span className="block text-[15px] font-bold leading-5">我的零件</span>
            <span className="block text-[13px] font-medium leading-4 text-white/80">{current.label}</span>
          </span>
        </span>
      </button>
    </section>
  )
}

function BrickGlyph() {
  return (
    <svg viewBox="0 0 36 28" width="34" height="26" aria-hidden="true" className="block shrink-0">
      <path fill="currentColor" d="M2.5 13.4h31a2 2 0 0 1 2 2V24a2.2 2.2 0 0 1-2.2 2.2H2.7A2.2 2.2 0 0 1 .5 24v-8.6a2 2 0 0 1 2-2Z" />
      <path fill="currentColor" d="M7.2 4.6h7.4a1.6 1.6 0 0 1 1.6 1.6V14H5.6V6.2a1.6 1.6 0 0 1 1.6-1.6Z" />
      <path fill="currentColor" d="M21.4 4.6h7.4a1.6 1.6 0 0 1 1.6 1.6V14H19.8V6.2a1.6 1.6 0 0 1 1.6-1.6Z" />
    </svg>
  )
}
