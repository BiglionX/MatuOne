import { useState, type ReactNode } from 'react'
import { videoPlan, type ShotFps, type ShotStyle } from './brickVideo'

type BrickVideoDialogProps = {
  count: number
  busy: boolean
  onClose: () => void
  onGenerate: (choice: { style: ShotStyle; fps: ShotFps; orientation: 'portrait' | 'landscape' }) => void
}

export function BrickVideoDialog({ count, busy, onClose, onGenerate }: BrickVideoDialogProps) {
  const [style, setStyle] = useState<ShotStyle>('quick')
  const [fps, setFps] = useState<ShotFps>(30)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const plan = videoPlan(style, count)
  const blurb = style === 'quick'
    ? '镜头绕着当前模型缓慢转一圈。WebM 文件，没有声音。'
    : '按现有积木顺序一块一块出现。WebM 文件，没有声音。'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#163044]/35 p-3" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="brick-video-title"
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-[420px] overflow-y-auto rounded-[28px] bg-white px-4 py-4 text-ink shadow-[0_24px_60px_rgba(16,36,52,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="brick-video-title" className="flex items-center gap-2 text-[20px] font-extrabold leading-6">
            <FilmMark />
            拼搭视频
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-full border border-[#E4E7EC] bg-white px-3 py-1.5 text-[13px] font-semibold text-ink-soft"
          >
            × 关闭
          </button>
        </div>
        <p className="mt-3 rounded-2xl bg-[#FFF6D8] px-3 py-2 text-[13px] font-semibold leading-5 text-[#8A5A00]">
          免费：把你的作品变成抖音、视频号和小红书视频。
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ChoiceCard
            selected={style === 'quick'}
            title="快速展示"
            subtitle="绕着成品转一圈"
            onClick={() => setStyle('quick')}
            icon={<SparkMark />}
          />
          <ChoiceCard
            selected={style === 'hand'}
            title="像手工搭建"
            subtitle="一块一块出现"
            onClick={() => setStyle('hand')}
            icon={<HandMark />}
          />
        </div>
        <p className="mt-3 text-[13px] leading-5 text-ink-soft">{blurb}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ChoiceCard selected={orientation === 'portrait'} title="竖屏" subtitle="抖音 · 视频号 · 小红书" onClick={() => setOrientation('portrait')} icon={<PhoneMark tall />} />
          <ChoiceCard selected={orientation === 'landscape'} title="横屏" subtitle="哔哩哔哩 · 西瓜视频" onClick={() => setOrientation('landscape')} icon={<PhoneMark tall={false} />} />
          <ChoiceCard selected={fps === 30} title="30 帧/秒" subtitle="推荐" onClick={() => setFps(30)} icon={null} />
          <ChoiceCard selected={fps === 60} title="60 帧/秒" subtitle="更流畅" onClick={() => setFps(60)} icon={null} />
        </div>
        <p className="mt-3 text-[12px] leading-5 text-ink-soft">
          大多数视频用 30 帧/秒就够了。60 帧会让旋转更流畅，但文件大约重 40%，制作时间也大约翻倍。
        </p>
        <p className="mt-3 text-center text-[13px] text-ink-soft">时长 ≈ {plan.seconds} s · {plan.steps} 步</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => onGenerate({ style, fps, orientation })}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-gradient-to-b from-[#FF5A4A] to-[#E01818] text-[16px] font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_3px_0_#B10E0E,0_8px_16px_rgba(180,20,20,0.28)] disabled:opacity-70"
        >
          <FilmMark light />
          {busy ? '正在拍摄…' : '生成视频'}
        </button>
      </div>
    </div>
  )
}

function ChoiceCard({
  selected,
  title,
  subtitle,
  onClick,
  icon,
}: {
  selected: boolean
  title: string
  subtitle: string
  onClick: () => void
  icon: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex min-h-[76px] flex-col items-center justify-center rounded-2xl border-2 bg-white px-2 py-2 text-center ${
        selected ? 'border-[#E23D3D]' : 'border-[#E6E8EC]'
      }`}
    >
      {icon}
      <span className="text-[15px] font-extrabold leading-5">{title}</span>
      <span className="text-[12px] leading-4 text-ink-soft">{subtitle}</span>
    </button>
  )
}

function FilmMark({ light = false }: { light?: boolean }) {
  const ink = light ? '#fff' : '#243140'
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" fill={light ? 'none' : '#E23D3D'} stroke={ink} strokeWidth="1.6" />
      <path d="M10 9.5v5l4.5-2.5L10 9.5Z" fill={light ? '#fff' : '#fff'} />
    </svg>
  )
}

function SparkMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 2.5 13.8 8h5.7l-4.6 3.4 1.8 5.6L12 13.8 7.3 17l1.8-5.6L4.5 8h5.7L12 2.5Z" fill="#F5C518" />
    </svg>
  )
}

function HandMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="#FE8A18" strokeWidth="1.8" strokeLinecap="round">
      <path d="M8 11V6.5a1.3 1.3 0 0 1 2.6 0V11" />
      <path d="M10.6 10.2V5.2a1.3 1.3 0 0 1 2.6 0v5" />
      <path d="M13.2 10.5V6.8a1.3 1.3 0 0 1 2.6 0V13" />
      <path d="M8 11.5 6.2 13a3 3 0 0 0 0 4.2L8 19h6.2A4 4 0 0 0 18 15.2V12" />
    </svg>
  )
}

function PhoneMark({ tall }: { tall: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <rect x={tall ? 8 : 4} y={tall ? 3 : 7} width={tall ? 8 : 16} height={tall ? 18 : 10} rx="2" fill="none" stroke="#243140" strokeWidth="1.6" />
    </svg>
  )
}
