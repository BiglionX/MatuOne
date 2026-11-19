import { useLayoutEffect, useRef, useState } from 'react'
import type { PixelTemplate } from './templates'

type PixelInspirationProps = {
  templates: readonly PixelTemplate[]
  pendingId: string | null
  onPick: (id: string) => void
}

const FAQ = [
  {
    question: '可以在手机或平板上使用吗？',
    answer: '可以。用手指点按和拖动就能填格。',
  },
  {
    question: '网格可以有多大？',
    answer: '可以选 8×8 到 128×128，每 8 格一档。',
  },
  {
    question: '如何保存我的像素画？',
    answer: '下载会得到一张 PNG。草稿会自动留在这台设备上，清除草稿会删掉它。',
  },
  {
    question: '使用模板会怎样？',
    answer: '会清空当前画布上的颜色，尺寸保持现在这一档，并按编号涂色。画布上已经有颜色时会先确认。撤销可以回到使用之前。',
  },
  {
    question: '可以导出视频吗？',
    answer: '画了两张以上时，可以保存动画，得到 GIF。只有一张时，保存得到 PNG。',
  },
] as const

function TemplatePreview({ pixels }: { pixels: (string | null)[][] }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const sourceSize = pixels[0]?.length || pixels.length || 1
    const scale = 32 / sourceSize
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, 32, 32)
    for (let y = 0; y < pixels.length; y += 1) {
      const row = pixels[y]
      if (!row) continue
      for (let x = 0; x < row.length; x += 1) {
        const color = row[x]
        if (!color) continue
        ctx.fillStyle = color
        ctx.fillRect(x * scale, y * scale, scale, scale)
      }
    }
  }, [pixels])

  return (
    <canvas
      ref={ref}
      width={32}
      height={32}
      aria-hidden="true"
      className="h-8 w-8 shrink-0 bg-canvas"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

export function TemplateChoices({ templates, pendingId, onPick }: PixelInspirationProps) {
  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {templates.map((template) => {
        const pending = pendingId === template.id
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onPick(template.id)}
            className={`inline-flex max-w-full items-center gap-2 rounded-2xl border border-slate-300 bg-white px-2.5 py-1.5 text-base font-semibold text-slate-900 shadow-[0_4px_0_0_var(--tw-shadow-color)] shadow-slate-300 transition-[transform,box-shadow] duration-100 hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:translate-y-0.5 active:shadow-[0_2px_0_0_var(--tw-shadow-color)] ${
              pending ? 'ring-2 ring-brand ring-offset-2' : ''
            }`}
          >
            <TemplatePreview pixels={template.pixels} />
            <span className="min-w-0">{template.name}</span>
          </button>
        )
      })}
    </div>
  )
}

export function PixelInspiration({ templates, pendingId, onPick }: PixelInspirationProps) {
  return (
    <section id="templates" aria-labelledby="pixel-inspiration-title" className="flex min-w-0 scroll-mt-6 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-2">
        <h2 id="pixel-inspiration-title" className="text-2xl font-bold leading-[1.2] text-slate-900 md:text-[28px]">
          下一幅画的灵感
        </h2>
        <p className="text-[17px] font-normal leading-[1.6] text-slate-700">没有灵感？试试这些免费模板，点一下就会在网格上打开。</p>
      </div>
      <TemplateChoices templates={templates} pendingId={pendingId} onPick={onPick} />
      {pendingId ? (
        <button
          type="button"
          onClick={() => onPick(pendingId)}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-danger px-5 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          使用模板会替换当前画布，确认？
        </button>
      ) : null}
    </section>
  )
}

export function PixelFaq() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section aria-labelledby="pixel-faq-title" className="flex min-w-0 flex-col gap-3">
      <h2 id="pixel-faq-title" className="text-2xl font-bold leading-[1.2] text-slate-900 md:text-[28px]">
        常见问题
      </h2>
      <ul className="flex min-w-0 flex-col gap-2">
        {FAQ.map((item, index) => {
          const expanded = open === index
          const panelId = `pixel-faq-panel-${index}`
          return (
            <li
              key={item.question}
              className="min-w-0 rounded-2xl border border-slate-300 bg-white shadow-[0_4px_0_0_var(--tw-shadow-color)] shadow-slate-300 transition-[transform,box-shadow] duration-100 has-[:active]:translate-y-0.5 has-[:active]:shadow-[0_2px_0_0_var(--tw-shadow-color)]"
            >
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : index)}
                className="flex min-h-11 w-full min-w-0 items-start gap-2 rounded-2xl px-4 py-3 text-left text-lg font-bold leading-[1.3] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <span aria-hidden="true" className="mt-0.5 w-5 shrink-0 text-slate-500">
                  {expanded ? '▼' : '▶'}
                </span>
                <span className="min-w-0 flex-1">{item.question}</span>
              </button>
              {expanded ? (
                <p id={panelId} className="px-4 pb-3 pl-10 text-[17px] font-normal leading-[1.6] text-slate-700">
                  {item.answer}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
