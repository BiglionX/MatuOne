type BrickGuideBarProps = {
  step: number
  total: number
  label: string
  showFinished: boolean
  onPrev: () => void
  onNext: () => void
  onToggleFinished: () => void
  onClose: () => void
}

export function BrickGuideBar({ step, total, label, showFinished, onPrev, onNext, onToggleFinished, onClose }: BrickGuideBarProps) {
  const done = step >= total
  const shown = done ? total : step + 1
  const progress = total === 0 ? 0 : Math.min(100, (step / total) * 100)
  return (
    <section className="-mx-1.5 rounded-2xl border border-line bg-white px-3 py-3 shadow-[0_8px_18px_rgba(20,40,60,0.06)]" aria-label="拼搭指南">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[18px] font-bold leading-7">
          <GuideMark />
          拼搭指南
        </p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-full border border-[#E4E7EC] bg-white px-2.5 py-1 text-[14px] font-semibold leading-5 text-ink-soft"
        >
          × 关闭
        </button>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-1">
        <button
          type="button"
          aria-label="上一步"
          disabled={step <= 0}
          onClick={onPrev}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-[22px] font-bold leading-none disabled:opacity-40"
        >
          ‹
        </button>
        <p className="whitespace-nowrap text-[18px] font-bold leading-6">步骤 {shown} / {total}</p>
        <button
          type="button"
          aria-label="下一步"
          disabled={done}
          onClick={onNext}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-[22px] font-bold leading-none disabled:opacity-40"
        >
          ›
        </button>
        <button
          type="button"
          aria-pressed={showFinished}
          aria-label={showFinished ? '藏起成品' : '看看成品'}
          onClick={onToggleFinished}
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border leading-none ${showFinished ? 'border-[#E23D3D] text-[#E23D3D]' : 'border-line text-ink-soft'}`}
        >
          <EyeMark off={showFinished} />
        </button>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#EEF1F4]">
        <div className="h-full rounded-full bg-[#2F6FED]" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2.5 text-[16px] font-semibold leading-6">{done ? '完成了！这是你的完整模型' : label}</p>
      <p className="mt-0.5 text-[13px] leading-5 text-ink-soft">左右方向键切换步骤 · Esc 退出指南</p>
    </section>
  )
}

function GuideMark() {
  return (
    <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <rect x="2" y="1.5" width="12" height="13" rx="2" fill="#2F6FED" />
      <path d="M5 5h6M5 8h6M5 11h4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function EyeMark({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
      {off ? <path d="M4 20 20 4" /> : null}
    </svg>
  )
}
