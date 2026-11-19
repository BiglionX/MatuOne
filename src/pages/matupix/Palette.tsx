export const COLORS = [
  { name: '红', hex: '#E23D3D' },
  { name: '橙', hex: '#F47B20' },
  { name: '黄', hex: '#F5C518' },
  { name: '绿', hex: '#2EAD4B' },
  { name: '青', hex: '#19B5C9' },
  { name: '蓝', hex: '#2F6FED' },
  { name: '紫', hex: '#7C3AA8' },
  { name: '粉', hex: '#E85A9B' },
  { name: '棕', hex: '#8B5A2B' },
  { name: '黑', hex: '#1A1A1A' },
  { name: '白', hex: '#FFFFFF' },
  { name: '灰', hex: '#9AA0A6' },
  { name: '深绿', hex: '#0F7A52' },
  { name: '浅蓝', hex: '#7EC8F0' },
  { name: '米色', hex: '#F0D3A0' },
  { name: '深红', hex: '#8E2430' },
] as const

type PaletteProps = {
  color: string
  onChange: (color: string) => void
  customColors?: readonly string[]
  onCustom: (hex: string) => void
}

export function swatchClass(selected: boolean, box = 'h-7 w-7 rounded-md') {
  return `${box} shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
    selected ? 'ring-2 ring-slate-900 ring-offset-1' : 'border border-slate-300'
  }`
}

export function Palette({ color, onChange, customColors = [] }: PaletteProps) {
  const current = color.toUpperCase()

  return (
    <div className="flex w-full min-w-0 justify-center">
      <div className="flex max-w-full flex-wrap items-center justify-center gap-1" role="listbox" aria-label="调色板">
        {COLORS.map((item) => {
          const selected = current === item.hex
          return (
            <button
              key={item.hex}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={item.name}
              onClick={() => onChange(item.hex)}
              className={swatchClass(selected)}
              style={{ backgroundColor: item.hex }}
            />
          )
        })}
        {customColors.map((hex) => {
          const selected = current === hex.toUpperCase()
          return (
            <button
              key={hex}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={`自定义 ${hex}`}
              onClick={() => onChange(hex)}
              className={swatchClass(selected)}
              style={{ backgroundColor: hex }}
            />
          )
        })}
      </div>
    </div>
  )
}
