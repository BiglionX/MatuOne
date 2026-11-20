import { BRICK_PARTS, type BrickType } from './brickTypes'
import { BrickPartThumb } from './BrickPartThumb'
import './brickCard.css'

type BrickPartBarProps = {
  part: BrickType
  emphasized?: boolean
  open?: boolean
  onOpen: () => void
}

/** 按钮底板是绿的，图形统一用白灰色，形状跟着当前零件走。 */
const PREVIEW_COLOR = '#F2F6F3'

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
          <span className="brick3d-part flex h-11 w-11 shrink-0 items-center justify-center">
            <BrickPartThumb type={current.type} color={PREVIEW_COLOR} className="h-full w-full" />
          </span>
          <span className="min-w-0 text-left">
            <span className="block text-[15px] font-bold leading-5">我的零件</span>
            <span className="block text-[13px] font-medium leading-4 text-white/80">{current.label}</span>
          </span>
        </span>
      </button>
    </section>
  )
}
