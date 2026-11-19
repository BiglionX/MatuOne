import type { PixelLayer } from './PixelCanvas'

type LayerBarProps = {
  layers: readonly PixelLayer[]
  activeLayer: number
  confirmDeleteIndex: number | null
  onSelect: (index: number) => void
  onToggleVisible: (index: number) => void
  onMove: (index: number, direction: 1 | -1) => void
  onDelete: (index: number) => void
  onAdd: () => void
  onOpacityBegin: () => void
  onOpacityInput: (percent: number) => void
  onOpacityCommit: () => void
}

const iconButton =
  'inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2'

export function LayerBar({
  layers,
  activeLayer,
  confirmDeleteIndex,
  onSelect,
  onToggleVisible,
  onMove,
  onDelete,
  onAdd,
  onOpacityBegin,
  onOpacityInput,
  onOpacityCommit,
}: LayerBarProps) {
  const active = layers[activeLayer]
  const percent = active ? Math.round(active.opacity * 100) : 100
  const ordered = layers.map((layer, index) => ({ layer, index })).reverse()

  return (
    <section className="flex w-full min-w-0 flex-col gap-1" aria-label="图层">
      <div className="flex min-w-0 flex-col gap-1">
        {layers.length > 1 ? (
          <div className="flex h-11 min-w-0 items-center gap-2">
            <span className="shrink-0 text-[15px] font-semibold leading-normal text-slate-700">透一点</span>
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              aria-label="透一点"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              value={percent}
              onPointerDown={onOpacityBegin}
              onChange={(event) => onOpacityInput(Number(event.target.value))}
              onPointerUp={onOpacityCommit}
              onPointerCancel={onOpacityCommit}
              onBlur={onOpacityCommit}
              className="h-11 min-w-0 flex-1 accent-brand-action"
            />
            <span className="shrink-0 text-[15px] font-semibold leading-normal text-slate-700">不透</span>
          </div>
        ) : null}
        <button type="button" onClick={onAdd} className="btn-secondary w-full text-base font-semibold">
          再叠一层
        </button>
        <div role="listbox" aria-label="图层列表">
          {ordered.map(({ layer, index }) => {
            const selected = index === activeLayer
            const confirming = confirmDeleteIndex === index
            const canDelete = layers.length > 1
            const canMoveUp = index < layers.length - 1
            const canMoveDown = index > 0
            return (
              <div
                key={layer.id}
                role="option"
                aria-selected={selected}
                data-layer-index={index}
                onClick={() => onSelect(index)}
                className={`flex h-11 min-w-0 items-center gap-1 rounded-lg px-1 ${selected ? 'bg-brand-soft' : ''}`}
              >
                {confirming ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete(index)
                    }}
                    className="inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-xl bg-danger px-2 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                  >
                    删除这个图层？
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-pressed={layer.visible}
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleVisible(index)
                      }}
                      className={`${iconButton} text-slate-800 hover:text-slate-950`}
                    >
                      {layer.visible ? '看得见' : '看不见'}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onSelect(index)
                      }}
                      className={`h-11 min-w-0 flex-1 truncate px-1 text-left text-base ${selected ? 'font-semibold text-slate-900' : 'font-normal text-slate-700'}`}
                    >
                      {`第 ${index + 1} 层`}
                    </button>
                    <button
                      type="button"
                      aria-label="上移"
                      aria-disabled={canMoveUp ? undefined : true}
                      onClick={(event) => {
                        event.stopPropagation()
                        if (!canMoveUp) return
                        onMove(index, 1)
                      }}
                      className={`${iconButton} border border-line bg-white text-slate-800 hover:border-brand ${canMoveUp ? '' : 'cursor-not-allowed opacity-50'}`}
                    >
                      上移
                    </button>
                    <button
                      type="button"
                      aria-label="下移"
                      aria-disabled={canMoveDown ? undefined : true}
                      onClick={(event) => {
                        event.stopPropagation()
                        if (!canMoveDown) return
                        onMove(index, -1)
                      }}
                      className={`${iconButton} border border-line bg-white text-slate-800 hover:border-brand ${canMoveDown ? '' : 'cursor-not-allowed opacity-50'}`}
                    >
                      下移
                    </button>
                    <button
                      type="button"
                      aria-label="删除"
                      aria-disabled={canDelete ? undefined : true}
                      onClick={(event) => {
                        event.stopPropagation()
                        if (!canDelete) return
                        onDelete(index)
                      }}
                      className={`${iconButton} border border-line bg-white text-slate-800 hover:border-brand ${canDelete ? '' : 'cursor-not-allowed opacity-50'}`}
                    >
                      删除
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
