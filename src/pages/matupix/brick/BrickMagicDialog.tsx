import { MagicGlyph } from './brickMagicIcons'
import { MAGIC_LARGE, MAGIC_SMALL, type MagicModel } from './brickMagicModels'
import { hexToRgba, mixHex, shadeHex, type Brick3dStyle } from './brickCardTone'
import './brickCard.css'

type BrickMagicDialogProps = {
  onClose: () => void
  onPick: (model: MagicModel) => void
}

/**
 * 模型与零件的来源说明。
 *
 * LDraw 官方模型库是 CC BY 2.0，官方零件库是 CC BY 4.0，两者都要求署名：
 * 写明作者、作品名、许可名、许可链接，并说明作品被修改过。
 * 官方 CAreadme.txt 把模型头部那行 “CCAL version 2.0” 明确解释为 CC BY 2.0。
 */
const ATTRIBUTION = {
  library: 'https://library.ldraw.org/',
  modelLicense: 'CC BY 2.0',
  modelLicenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  partLicense: 'CC BY 4.0',
  partLicenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
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
    skyscraper: { fill: '#FAF3EB', edge: '#F0D9C2' },
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
        <AttributionNote />
      </div>
    </div>
  )
}

function MagicCard({ model, onPick }: { model: MagicModel; onPick: (model: MagicModel) => void }) {
  const face = CARD_FACE[model.id] ?? { fill: '#F4F7FB', edge: '#D5DCE3' }
  const lip = shadeHex(face.fill, 0.74)
  // 套装号从官方套装名里取：形如 "7613-1 Track Racer" → "7613-1"。
  // 卡片上只写得下套装号，全名和作者放进 title，鼠标悬停能看全。
  const setNo = model.label.split(' ')[0]
  return (
    <button
      type="button"
      onClick={() => onPick(model)}
      title={`${model.label}｜作者：${model.author}｜${ATTRIBUTION.modelLicense}`}
      style={
        {
          '--brick3d-from': mixHex(face.fill, '#FFFFFF', 0.55),
          '--brick3d-to': face.fill,
          '--brick3d-edge': face.edge,
          '--brick3d-lip': lip,
          '--brick3d-glow': hexToRgba(lip, 0.3),
          '--brick3d-ring': hexToRgba(lip, 0.28),
          '--brick3d-radius': '17px',
        } as Brick3dStyle
      }
      className="brick3d-card flex aspect-square w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-1.5 px-1 py-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E2A2E]/25 focus-visible:ring-offset-2"
    >
      <MagicGlyph id={model.id} />
      <span className="text-[15px] font-bold leading-none text-[#17283A]">{model.name}</span>
      {/* 套装号只是视觉补充：完整署名（套装名 + 作者 + 许可）在 title 里，
          不进 accessible name，免得读屏把卡片名读成一串。 */}
      <span aria-hidden="true" className="text-[11px] font-medium leading-none text-[#17283A]/55">
        {setNo}
      </span>
    </button>
  )
}

/**
 * 底部的来源与许可说明。
 *
 * CC BY 要求把作者、作品、许可和「有没有被改过」写清楚，
 * 所以这里除了链接，还得说明模型被换过颜色、摆到底板中央。
 */
function AttributionNote() {
  return (
    <div className="mt-5 rounded-2xl bg-[#F6F8FB] px-4 py-3 text-[12px] leading-5 text-[#17283A]/70">
      <p className="font-bold text-[#17283A]/85">模型与零件来源</p>
      <p className="mt-1">
        魔法模型来自 LDraw 官方模型库（OMR）的{' '}
        <a className="underline decoration-dotted underline-offset-2 hover:text-[#2F6FED]" href={ATTRIBUTION.library} target="_blank" rel="noreferrer">
          LDraw.org Library
        </a>
        ，作者与套装名见每张卡片悬停提示；官方零件库同样来自 LDraw.org。
      </p>
      <p className="mt-1">
        模型按{' '}
        <a className="underline decoration-dotted underline-offset-2 hover:text-[#2F6FED]" href={ATTRIBUTION.modelLicenseUrl} target="_blank" rel="noreferrer">
          {ATTRIBUTION.modelLicense}
        </a>{' '}
        授权，零件按{' '}
        <a className="underline decoration-dotted underline-offset-2 hover:text-[#2F6FED]" href={ATTRIBUTION.partLicenseUrl} target="_blank" rel="noreferrer">
          {ATTRIBUTION.partLicense}
        </a>{' '}
        授权。
      </p>
      <p className="mt-1">这些模型已做修改：换用 MatuPix 的八色调色板、重新居中并贴到底板上、零件改为不吸附格子的精确摆放。</p>
    </div>
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
