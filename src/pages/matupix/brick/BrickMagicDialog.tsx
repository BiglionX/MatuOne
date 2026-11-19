import type { CSSProperties } from 'react'
import { MagicGlyph } from './brickMagicIcons'
import { MAGIC_LARGE, MAGIC_SMALL, type MagicModel } from './brickMagicModels'
import './brickMagicCard.css'

type BrickMagicDialogProps = {
  onClose: () => void
  onPick: (model: MagicModel) => void
}

type CardFace = {
  fill: string
  edge: string
}

const CARD_FACE: Record<string, CardFace> = {
  f1: { fill: '#FFECE5', edge: '#FFC4AE' },
  'fire-engine': { fill: '#F4DEDF', edge: '#DC999D' },
  plane: { fill: '#E2F4FD', edge: '#A7DCF9' },
  rocket: { fill: '#ECE8F7', edge: '#C3B9E5' },
  castle: { fill: '#F0F1F2', edge: '#D0D3D6' },
  house: { fill: '#FFF2E1', edge: '#FFD8A4' },
  robot: { fill: '#DEE9F7', edge: '#99BBE5' },
  heli: { fill: '#FEFBE1', edge: '#FCF3A2' },
  tree: { fill: '#E4F4E8', edge: '#ACDCB9' },
  train: { fill: '#F0EAE3', edge: '#D1BDAA' },
  crane: { fill: '#FEFBE1', edge: '#FCF3A2' },
  boat: { fill: '#EAE5E2', edge: '#BDB0A5' },
  tractor: { fill: '#E4F4E8', edge: '#ACDCB9' },
  lighthouse: { fill: '#FBDEDF', edge: '#F4999D' },
  dino: { fill: '#E4F4E8', edge: '#ACDCB9' },
  village: { fill: '#E4F4E8', edge: '#ACDCB9' },
  race: { fill: '#FBDEDF', edge: '#F4999D' },
  site: { fill: '#FFF2E1', edge: '#FFD8A4' },
  port: { fill: '#E2F4FD', edge: '#A7DCF9' },
  station: { fill: '#F0EAE3', edge: '#D1BDAA' },
  'dino-park': { fill: '#E4F4E8', edge: '#ACDCB9' },
  farm: { fill: '#FEFBE1', edge: '#FCF3A2' },
  airport: { fill: '#FBFBFC', edge: '#D8DEE6' },
  'fire-station': { fill: '#FBDEDF', edge: '#F4999D' },
  space: { fill: '#ECE8F7', edge: '#C3B9E5' },
  'big-castle': { fill: '#F0F1F2', edge: '#D0D3D6' },
  stadium: { fill: '#E4F4E8', edge: '#ACDCB9' },
  sport: { fill: '#FBDEDF', edge: '#F4999D' },
  eiffel: { fill: '#F0F1F2', edge: '#D0D3D6' },
  colosseum: { fill: '#FAF3EB', edge: '#F0D9C2' },
}

export function BrickMagicDialog({ onClose, onPick }: BrickMagicDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#163044]/35 p-3" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="brick-magic-title"
        className="max-h-[min(880px,calc(100dvh-1.5rem))] w-full max-w-[720px] overflow-y-auto rounded-[28px] bg-white px-5 pb-6 pt-5 text-ink shadow-[0_24px_60px_rgba(16,36,52,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="brick-magic-title" className="flex items-center gap-2 text-[22px] font-extrabold leading-7 text-ink">
            <WandMark />
            魔法模型
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-full border border-[#D5DCE3] bg-white px-3.5 py-2 text-[16px] font-bold leading-none text-ink"
          >
            × 关闭
          </button>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-3">
          {MAGIC_SMALL.map((item) => (
            <MagicCard key={item.id} model={item} onPick={onPick} />
          ))}
        </div>
        <div className="my-4 border-t border-dashed border-[#E4E7EC]" />
        <h3 className="mb-3 flex items-center gap-2 text-[18px] font-extrabold leading-6 text-ink">
          <SceneMark />
          大场景
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {MAGIC_LARGE.map((item) => (
            <MagicCard key={item.id} model={item} onPick={onPick} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MagicCard({ model, onPick }: { model: MagicModel; onPick: (model: MagicModel) => void }) {
  const face = CARD_FACE[model.id] ?? { fill: '#F4F7FB', edge: '#D5DCE3' }
  return (
    <button
      type="button"
      onClick={() => onPick(model)}
      style={
        {
          '--magic-fill': face.fill,
          '--magic-edge': face.edge,
          '--magic-press': pressColor(face.fill),
        } as CSSProperties
      }
      className="magic-model-card flex aspect-square w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[17px] px-1 py-2 text-center transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E2A2E]/25 focus-visible:ring-offset-2"
    >
      <MagicGlyph id={model.id} />
      <span className="text-[15px] font-bold leading-none text-[#17283A]">{model.name}</span>
    </button>
  )
}

function WandMark() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M3.4 20.4 14.2 9.6" stroke="#A86B32" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M5.1 18.8 12.8 11.1" stroke="#F0C27A" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11.6 12.2 14.4 15" stroke="#7A4E22" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M16.7 2.1 17.8 5.4 21.2 6.3 17.8 7.3 16.7 10.7 15.6 7.3 12.2 6.3 15.6 5.4Z"
        fill="#F5C518"
        stroke="#E09A12"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SceneMark() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <path d="M2 16V8l4-3 4 3v8H2Z" fill="#2F6FED" />
      <path d="M10 16V6l4-2 4 2v10h-8Z" fill="#E23D3D" />
    </svg>
  )
}

function pressColor(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16)
  const channel = (shift: number) => Math.round(((n >> shift) & 255) * 0.93).toString(16).padStart(2, '0')
  return `#${channel(16)}${channel(8)}${channel(0)}`
}
