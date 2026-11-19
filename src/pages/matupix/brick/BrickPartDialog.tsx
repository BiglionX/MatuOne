import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { brickColorName, BRICK_PARTS, categoriesInUse, type Brick, type BrickCategory, type BrickPartInfo, type BrickType } from './brickTypes'
import { loadPartMemory, subscribePartMemory, togglePartFavorite, type BrickPartMemory } from './brickPartMemory'

type PartTab = 'all' | 'favorites' | 'recent'
type DialogMode = 'catalog' | 'bill'

type BrickPartDialogProps = {
  part: BrickType
  color: string
  bricks: Brick[]
  onClose: () => void
  onSelect: (type: BrickType) => void
}

type ChipTone = {
  from: string
  to: string
  lip: string
  glow: string
  border: string
  text: string
}

const TABS: { id: PartTab; label: string }[] = [
  { id: 'all', label: '全部零件' },
  { id: 'favorites', label: '收藏' },
  { id: 'recent', label: '最近用过' },
]

const TAB_ON: ChipTone = {
  from: '#5C97FF',
  to: '#1E5FDF',
  lip: '#154BB6',
  glow: 'rgba(24,82,210,0.42)',
  border: 'transparent',
  text: '#ffffff',
}

const TAB_OFF: ChipTone = {
  from: '#FFFFFF',
  to: '#F4F7F9',
  lip: '#E4E8EC',
  glow: 'rgba(30,42,50,0.09)',
  border: '#E1E6EB',
  text: '#2C353C',
}

const BILL_TONE: ChipTone = {
  from: '#F7FBFF',
  to: '#D4E9FF',
  lip: '#B5D2F3',
  glow: 'rgba(47,111,237,0.16)',
  border: '#C7E0F8',
  text: '#2F6FED',
}

const CLOSE_TONE: ChipTone = {
  from: '#FFFFFF',
  to: '#F2F4F6',
  lip: '#E2E6EA',
  glow: 'rgba(30,42,50,0.08)',
  border: '#E0E5EA',
  text: '#5E6A75',
}

const CATEGORY_LOOK: Record<BrickCategory, { on: ChipTone; off: ChipTone; edge: string }> = {
  基础积木: {
    on: { from: '#F4473C', to: '#C10D16', lip: '#8C090F', glow: 'rgba(176,16,24,0.46)', border: 'transparent', text: '#ffffff' },
    off: { from: '#FFF7F6', to: '#FFD6D2', lip: '#F0B6B2', glow: 'rgba(210,60,60,0.15)', border: '#F6C2BE', text: '#D2262F' },
    edge: '#F3C3C8',
  },
  斜面: {
    on: { from: '#FFB15A', to: '#E26608', lip: '#B04C00', glow: 'rgba(190,90,10,0.42)', border: 'transparent', text: '#ffffff' },
    off: { from: '#FFF9F3', to: '#FFE3C4', lip: '#F0C69C', glow: 'rgba(200,120,40,0.16)', border: '#F6D2AA', text: '#C56A12' },
    edge: '#F6D2AA',
  },
  曲面: {
    on: { from: '#B197FF', to: '#6A42E2', lip: '#4A2AB4', glow: 'rgba(90,50,200,0.42)', border: 'transparent', text: '#ffffff' },
    off: { from: '#F8F5FF', to: '#E5DAFF', lip: '#D0C2F2', glow: 'rgba(110,70,200,0.14)', border: '#DCCFF6', text: '#6846D2' },
    edge: '#DDD0F6',
  },
  房子: {
    on: { from: '#F0C24C', to: '#C4840A', lip: '#8C5E06', glow: 'rgba(160,110,10,0.4)', border: 'transparent', text: '#3F2A08' },
    off: { from: '#FFFBF2', to: '#FFE9B4', lip: '#F0D296', glow: 'rgba(180,140,30,0.15)', border: '#F3DFAD', text: '#9A7416' },
    edge: '#F0DFB2',
  },
  车辆: {
    on: { from: '#58ACFF', to: '#146ED6', lip: '#0E4E9E', glow: 'rgba(20,90,190,0.42)', border: 'transparent', text: '#ffffff' },
    off: { from: '#F5FAFF', to: '#D5EBFF', lip: '#B7D4F2', glow: 'rgba(30,110,200,0.14)', border: '#C3DCF4', text: '#1870CC' },
    edge: '#C5DEF6',
  },
  自然: {
    on: { from: '#4ECE6E', to: '#168838', lip: '#0C6428', glow: 'rgba(16,120,48,0.4)', border: 'transparent', text: '#ffffff' },
    off: { from: '#F4FCF6', to: '#D2F1DC', lip: '#B2DEC2', glow: 'rgba(30,140,60,0.14)', border: '#C4E6D2', text: '#1A863C' },
    edge: '#C6E8D2',
  },
  人物: {
    on: { from: '#FF7CBA', to: '#DE3284', lip: '#AE1864', glow: 'rgba(200,30,110,0.4)', border: 'transparent', text: '#ffffff' },
    off: { from: '#FFF6FA', to: '#FFD4E8', lip: '#F2BED6', glow: 'rgba(210,50,120,0.14)', border: '#F5CCE0', text: '#D23884' },
    edge: '#F6CEE0',
  },
  物件: {
    on: { from: '#36D2C2', to: '#0C9082', lip: '#086860', glow: 'rgba(8,130,120,0.4)', border: 'transparent', text: '#ffffff' },
    off: { from: '#F3FCFB', to: '#D0F3EE', lip: '#B2E2DC', glow: 'rgba(10,140,130,0.14)', border: '#C2E8E2', text: '#0C8A80' },
    edge: '#C4E8E2',
  },
}

function chipStyle(tone: ChipTone, pressed: boolean): CSSProperties {
  if (pressed) {
    return {
      backgroundImage: `linear-gradient(180deg, ${tone.from} 0%, ${tone.to} 100%)`,
      color: tone.text,
      border: '1px solid rgba(255,255,255,0.28)',
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5), inset 0 4px 7px rgba(0,0,0,0.2), 0 3px 0 ${tone.lip}, 0 8px 14px ${tone.glow}`,
    }
  }
  return {
    backgroundImage: `linear-gradient(180deg, ${tone.from} 0%, ${tone.to} 100%)`,
    color: tone.text,
    border: `1px solid ${tone.border}`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.96), 0 2px 0 ${tone.lip}, 0 4px 8px ${tone.glow}`,
  }
}

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--art-purple)]'

function usePartMemory() {
  const [memory, setMemory] = useState<BrickPartMemory>(loadPartMemory)
  useEffect(() => subscribePartMemory(() => setMemory(loadPartMemory())), [])
  return memory
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase().replace(/[x*]/g, '×').replace(/\s+/g, '')
}

function partHaystack(item: BrickPartInfo) {
  return normalizeQuery(`${item.name} ${item.label} ${item.footprint} ${item.ldraw} ${item.category}`)
}

function footprintLabel(value: string) {
  return value.replace(/\s*×\s*/g, ' × ')
}

export function BrickPartDialog({ part, color, bricks, onClose, onSelect }: BrickPartDialogProps) {
  const memory = usePartMemory()
  const [tab, setTab] = useState<PartTab>('all')
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<DialogMode>('catalog')
  const [category, setCategory] = useState<BrickCategory>('基础积木')
  const categories = useMemo(() => categoriesInUse(), [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const visible = useMemo(() => {
    const needle = normalizeQuery(query)
    let items = BRICK_PARTS
    if (tab === 'favorites') items = BRICK_PARTS.filter((item) => memory.favorites.includes(item.type))
    if (tab === 'recent') {
      items = memory.recent.flatMap((type) => {
        const found = BRICK_PARTS.find((item) => item.type === type)
        return found ? [found] : []
      })
    }
    if (tab === 'all' && !needle) items = items.filter((item) => item.category === category)
    if (!needle) return items
    return items.filter((item) => partHaystack(item).includes(needle))
  }, [category, memory.favorites, memory.recent, query, tab])

  const bill = useMemo(() => summarizeBricks(bricks), [bricks])
  const showCategories = tab === 'all' && !normalizeQuery(query)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,32,48,0.32)] p-3 sm:p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="brick-part-dialog-title"
        className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-[28px] bg-white text-ink shadow-[0_28px_70px_rgba(16,36,52,0.28)] ${
          mode === 'bill' ? 'max-w-[32rem]' : 'max-w-[1080px]'
        }`}
      >
        {mode === 'bill' ? (
          <BillView bill={bill} onClose={onClose} />
        ) : (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 pb-1 pt-4 sm:px-5 sm:pt-5">
              <h2 id="brick-part-dialog-title" className="flex min-w-0 items-center gap-2 text-[22px] font-extrabold leading-none tracking-tight">
                <PartMark />
                <span className="truncate">我的零件</span>
              </h2>
              <button
                type="button"
                onClick={() => setMode('bill')}
                style={chipStyle(BILL_TONE, false)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold ${FOCUS_RING}`}
              >
                <ClipboardIcon />
                零件清单
              </button>
              <div className="justify-self-end">
                <CloseButton onClick={onClose} />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 sm:px-5">
              <div className="flex flex-wrap gap-2.5" role="group" aria-label="零件范围">
                {TABS.map((item) => {
                  const active = tab === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setTab(item.id)}
                      style={chipStyle(active ? TAB_ON : TAB_OFF, active)}
                      className={`inline-flex h-9 items-center gap-1 rounded-full px-3.5 text-[14px] font-bold whitespace-nowrap ${active ? 'translate-y-px' : ''} ${FOCUS_RING}`}
                    >
                      {item.id === 'favorites' ? (
                        <span className={active ? 'text-white' : 'text-[#B0BAC2]'}>
                          <StarIcon filled={active} size={15} />
                        </span>
                      ) : null}
                      {item.label}
                    </button>
                  )
                })}
              </div>
              <label className="mt-3.5 flex h-11 items-center gap-2 rounded-[14px] border-2 border-[#3C83F6] bg-white px-3 shadow-[inset_0_1px_2px_rgba(20,40,80,0.05)] focus-within:shadow-[0_0_0_4px_rgba(60,131,246,0.22),inset_0_1px_2px_rgba(20,40,80,0.05)]">
                <SearchIcon />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="找零件"
                  aria-label="找零件"
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#A0AAB4]"
                />
                {query ? (
                  <button
                    type="button"
                    aria-label="清除搜索"
                    onClick={() => setQuery('')}
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-ink-soft ${FOCUS_RING}`}
                  >
                    <CloseIcon />
                  </button>
                ) : null}
              </label>
              {showCategories ? (
                <div className="mt-3 flex flex-wrap gap-2 pb-1" role="group" aria-label="零件分类">
                  {categories.map((item) => {
                    const active = item === category
                    const look = CATEGORY_LOOK[item]
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setCategory(item)}
                        style={chipStyle(active ? look.on : look.off, active)}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-bold whitespace-nowrap ${active ? 'translate-y-px' : ''} ${FOCUS_RING}`}
                      >
                        <CategoryIcon category={item} />
                        {item}
                      </button>
                    )
                  })}
                </div>
              ) : null}
              {tab === 'all' ? <p className="mt-3 text-[13px] font-medium text-[#8B97A1]">{visible.length} 个零件</p> : null}
              {visible.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm leading-6 text-ink-soft">{emptyCopy(tab, query)}</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3 min-[640px]:grid-cols-3 min-[900px]:grid-cols-5">
                  {visible.map((item) => (
                    <PartCard
                      key={item.type}
                      item={item}
                      color={color}
                      edge={CATEGORY_LOOK[item.category].edge}
                      selected={item.type === part}
                      favorite={memory.favorites.includes(item.type)}
                      onSelect={() => onSelect(item.type)}
                      onToggleFavorite={() => togglePartFavorite(item.type)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function emptyCopy(tab: PartTab, query: string) {
  if (normalizeQuery(query)) return '没有找到零件。'
  if (tab === 'favorites') return '点一下零件上的星星，就能在这里找到它。'
  if (tab === 'recent') return '你用过的零件会出现在这里。'
  return '没有找到零件。'
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={chipStyle(CLOSE_TONE, false)}
      className={`inline-flex h-9 items-center gap-1 rounded-2xl px-3 text-sm font-bold ${FOCUS_RING}`}
    >
      <CloseIcon />
      关闭
    </button>
  )
}

function PartCard({
  item,
  color,
  edge,
  selected,
  favorite,
  onSelect,
  onToggleFavorite,
}: {
  item: BrickPartInfo
  color: string
  edge: string
  selected: boolean
  favorite: boolean
  onSelect: () => void
  onToggleFavorite: () => void
}) {
  return (
    <div className="relative rounded-[22px] border-2 bg-white shadow-[0_1px_2px_rgba(16,40,60,0.04)]" style={{ borderColor: edge }}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`flex min-h-[168px] w-full flex-col items-center justify-center rounded-[20px] px-2 pb-3 pt-6 text-center ${FOCUS_RING}`}
      >
        <span className="flex h-12 w-full items-center justify-center [&>svg]:h-auto [&>svg]:max-h-12 [&>svg]:max-w-[88%]">
          <PartGlyph item={item} color={color} />
        </span>
        <span className="mt-2 text-[13px] font-bold leading-4 text-ink">{item.name}</span>
        <span className="mt-1 text-[11px] font-medium leading-4 text-[#A7B1B8]">{footprintLabel(item.footprint)}</span>
      </button>
      <button
        type="button"
        aria-pressed={favorite}
        aria-label={favorite ? `取消收藏：${item.name}` : `加入收藏：${item.name}`}
        onClick={(event) => {
          event.stopPropagation()
          onToggleFavorite()
        }}
        className={`absolute right-1.5 top-1.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full ${FOCUS_RING} ${
          favorite ? 'text-[#F5B400]' : 'text-[#C5CED6]'
        }`}
      >
        <StarIcon filled={favorite} />
      </button>
    </div>
  )
}

function CategoryIcon({ category }: { category: BrickCategory }) {
  const common = { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true as const, className: 'shrink-0' }
  if (category === '基础积木') {
    return (
      <svg {...common}>
        <rect x="1.3" y="6.5" width="13.4" height="7.2" rx="1.3" fill="currentColor" />
        <rect x="3" y="2.2" width="3.6" height="3.7" rx="0.7" fill="currentColor" />
        <rect x="9.4" y="2.2" width="3.6" height="3.7" rx="0.7" fill="currentColor" />
      </svg>
    )
  }
  if (category === '斜面') {
    return (
      <svg {...common}>
        <path d="M8 1.7 14.5 13.7H1.5Z" fill="currentColor" />
      </svg>
    )
  }
  if (category === '曲面') {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="5.1" fill="currentColor" />
      </svg>
    )
  }
  if (category === '房子') {
    return (
      <svg {...common}>
        <path fill="currentColor" fillRule="evenodd" d="M1.5 7.2 8 2.1l6.5 5.1V14H1.5Zm5.1 6.8V9.3h2.8V14Z" />
      </svg>
    )
  }
  if (category === '车辆') {
    return (
      <svg {...common}>
        <path fill="currentColor" d="M3.2 9.1 4.5 6.4A1.3 1.3 0 0 1 5.7 5.5h4.1c.5 0 .9.3 1.1.8l1.4 2.8h.8c.4 0 .7.3.7.7v1.3c0 .4-.3.7-.7.7h-.6a1.45 1.45 0 0 1-2.85 0H6.15a1.45 1.45 0 0 1-2.85 0h-.5c-.4 0-.8-.3-.8-.7V9.8c0-.4.5-.7 1.2-.7Z" />
        <circle cx="4.75" cy="11.35" r="0.95" fill="rgba(0,0,0,0.45)" />
        <circle cx="11.15" cy="11.35" r="0.95" fill="rgba(0,0,0,0.45)" />
      </svg>
    )
  }
  if (category === '自然') {
    return (
      <svg {...common}>
        <path fill="currentColor" d="M8 1.2 12.7 7.1H10.5L13.1 10.8H2.9l2.6-3.7H3.3Z" />
        <rect x="6.7" y="10.8" width="2.6" height="3.1" rx="0.5" fill="currentColor" />
      </svg>
    )
  }
  if (category === '人物') {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="6.2" fill="currentColor" />
        <circle cx="5.7" cy="6.8" r="0.85" fill="rgba(0,0,0,0.45)" />
        <circle cx="10.3" cy="6.8" r="0.85" fill="rgba(0,0,0,0.45)" />
        <path d="M5.3 9.4c.8 1.45 4.6 1.45 5.4 0" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="2.05" fill="currentColor" />
      <circle cx="8" cy="3.15" r="1.8" fill="currentColor" />
      <circle cx="8" cy="12.85" r="1.8" fill="currentColor" />
      <circle cx="3.15" cy="8" r="1.8" fill="currentColor" />
      <circle cx="12.85" cy="8" r="1.8" fill="currentColor" />
    </svg>
  )
}

function PartGlyph({ item, color }: { item: BrickPartInfo; color: string }) {
  if (item.glyph === 'round' || item.glyph === 'disc') return <RoundMark color={color} stud={item.glyph === 'round'} />
  if (item.glyph === 'tile') return <StudPreview color={color} columns={item.studs[0]} rows={item.studs[1]} studs={false} />
  if (item.glyph === 'cone') return <ConeMark color={color} />
  if (item.glyph === 'jumper') return <JumperMark color={color} />
  if (item.glyph === 'slope') return <SlopeMark color={color} type={item.category === '斜面' ? item.type : ''} />
  if (item.glyph === 'corner') return <CornerMark color={color} />
  return <StudPreview color={color} columns={item.studs[0]} rows={item.studs[1]} />
}

function RoundMark({ color, stud }: { color: string; stud: boolean }) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="15.5" fill={color} stroke="rgba(20,30,40,0.18)" />
      {stud ? <circle cx="18" cy="18" r="5" fill="rgba(255,255,255,0.55)" stroke="rgba(20,30,40,0.22)" /> : null}
    </svg>
  )
}

function ConeMark({ color }: { color: string }) {
  return (
    <svg width="36" height="32" viewBox="0 0 36 32" aria-hidden="true">
      <path d="M18 3 33 28 H3 Z" fill={color} stroke="rgba(20,30,40,0.28)" strokeLinejoin="round" />
    </svg>
  )
}

function SlopeMark({ color, type }: { color: string; type: string }) {
  const common = { fill: color, stroke: 'rgba(20,30,40,0.28)', strokeLinejoin: 'round' as const }
  let path = 'M4 24 H36 V8 L4 24 Z'
  if (type.startsWith('cheese') || type.includes('gentle')) path = 'M4 24 H36 V16 L4 24 Z'
  if (type.includes('inv')) path = 'M4 8 V24 H36 Z'
  if (type.includes('double') || type === 'slope-gentle-2x2') path = 'M4 24 L20 6 L36 24 Z'
  if (type.includes('curved') || type.includes('round')) path = 'M6 24 H34 V10 A28 16 0 0 1 6 24 Z'
  if (type.includes('wedge') && type.includes('left')) path = 'M34 5 L8 14 L34 23 Z'
  if (type.includes('wedge') && type.includes('right')) path = 'M6 5 L32 14 L6 23 Z'
  return (
    <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true">
      <path d={path} {...common} />
    </svg>
  )
}

function JumperMark({ color }: { color: string }) {
  return (
    <svg width="34" height="22" viewBox="0 0 34 22" aria-hidden="true">
      <rect x="0.5" y="0.5" width="33" height="21" rx="5" fill={color} stroke="rgba(20,30,40,0.18)" />
      <circle cx="17" cy="11" r="4" fill="rgba(255,255,255,0.55)" stroke="rgba(20,30,40,0.22)" />
    </svg>
  )
}

function CornerMark({ color }: { color: string }) {
  return <StudPreview color={color} columns={2} rows={2} skip={[1, 0]} />
}

function StudPreview({
  color,
  columns,
  rows,
  studs = true,
  skip,
}: {
  color: string
  columns: number
  rows: number
  studs?: boolean
  skip?: readonly [number, number]
}) {
  const stud = 7
  const gap = 3
  const padX = 7
  const padY = 6
  const width = padX * 2 + columns * stud + Math.max(0, columns - 1) * gap
  const height = padY * 2 + rows * stud + Math.max(0, rows - 1) * gap
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <rect x="0.5" y="0.5" width={width - 1} height={height - 1} rx="5" fill={color} stroke="rgba(20,30,40,0.18)" />
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: columns }, (_, column) => {
          const cx = padX + stud / 2 + column * (stud + gap)
          const cy = padY + stud / 2 + row * (stud + gap)
          if (!studs || (skip && skip[0] === column && skip[1] === row)) return null
          return (
            <circle
              key={`${column}-${row}`}
              cx={cx}
              cy={cy}
              r={stud / 2 - 1}
              fill="rgba(255,255,255,0.55)"
              stroke="rgba(20,30,40,0.22)"
            />
          )
        }),
      )}
    </svg>
  )
}

type BillRow = {
  key: string
  name: string
  ldraw: string
  color: string
  count: number
}

function summarizeBricks(bricks: Brick[]) {
  const rows = new Map<string, BillRow>()
  for (const brick of bricks) {
    const info = BRICK_PARTS.find((item) => item.type === brick.type)
    const key = `${brick.type}|${brick.color.toLowerCase()}`
    const existing = rows.get(key)
    if (existing) {
      existing.count += 1
      continue
    }
    rows.set(key, {
      key,
      name: info?.name ?? brick.type,
      ldraw: info?.ldraw ?? '',
      color: brick.color,
      count: 1,
    })
  }
  const list = [...rows.values()]
  const colors = new Set(bricks.map((brick) => brick.color.toLowerCase()))
  return { total: bricks.length, kinds: list.length, colors: colors.size, rows: list }
}

function BillView({ bill, onClose }: { bill: ReturnType<typeof summarizeBricks>; onClose: () => void }) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex items-center gap-2">
        <h2 id="brick-part-dialog-title" className="flex min-w-0 flex-1 items-center gap-2 text-[22px] font-extrabold leading-none tracking-tight">
          <ClipboardIcon />
          零件清单
        </h2>
        <CloseButton onClick={onClose} />
      </div>
      <p className="mt-3 border-t border-dashed border-line pt-3 text-sm font-semibold">构成模型的全部零件：编号、颜色和数量。</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <BillStat value={bill.total} label="零件" />
        <BillStat value={bill.kinds} label="种零件" />
        <BillStat value={bill.colors} label="颜色" />
      </div>
      {bill.rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-soft">还没有放下零件。</p>
      ) : (
        <ul className="mt-3 max-h-[40vh] space-y-1 overflow-y-auto">
          {bill.rows.map((row) => (
            <li key={row.key} className="flex items-center gap-2 rounded-xl px-1 py-1.5 text-sm">
              <span className="h-3.5 w-3.5 shrink-0 rounded-[4px] ring-1 ring-black/10" style={{ backgroundColor: row.color }} />
              <span className="w-10 shrink-0 font-semibold tabular-nums text-ink-soft">{row.ldraw}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{row.name}</span>
              <span className="shrink-0 text-ink-soft">{brickColorName(row.color)}</span>
              <span className="w-14 shrink-0 text-right font-bold tabular-nums">{row.count} 数量</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BillStat({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="rounded-2xl px-2 py-3 text-center"
      style={chipStyle(
        { from: '#FFFFFF', to: '#F4F7FB', lip: '#E6EBF1', glow: 'rgba(30,42,50,0.05)', border: '#E6ECF2', text: '#1E2A2E' },
        false,
      )}
    >
      <p className="text-xl font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-medium text-ink-soft">{label}</p>
    </div>
  )
}

function PartMark() {
  return (
    <svg viewBox="0 0 36 28" width="32" height="25" aria-hidden="true" className="shrink-0 text-[#E23D3D]">
      <path fill="currentColor" d="M2.5 13.4h31a2 2 0 0 1 2 2V24a2.2 2.2 0 0 1-2.2 2.2H2.7A2.2 2.2 0 0 1 .5 24v-8.6a2 2 0 0 1 2-2Z" />
      <path fill="currentColor" d="M7.2 4.6h7.4a1.6 1.6 0 0 1 1.6 1.6V14H5.6V6.2a1.6 1.6 0 0 1 1.6-1.6Z" />
      <path fill="currentColor" d="M21.4 4.6h7.4a1.6 1.6 0 0 1 1.6 1.6V14H19.8V6.2a1.6 1.6 0 0 1 1.6-1.6Z" />
    </svg>
  )
}

function StarIcon({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="m12 3.2 2.3 4.7 5.2.8-3.8 3.6.9 5.2L12 15.2 7.4 17.5l.9-5.2L4.5 8.7l5.2-.8L12 3.2Z" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="shrink-0 text-[#8B97A3]">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="shrink-0">
      <rect x="6" y="5" width="12" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="9" y="3" width="6" height="3.4" rx="1" fill="currentColor" />
      <path d="M9 11.2h6M9 14.6h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
