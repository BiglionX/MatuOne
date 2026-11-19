const STEPS = [
  {
    title: '1. 选择网格',
    body: '可以换成 8×8 到 128×128，每 8 格一档。格子里已经有颜色时，切换会先让你确认，因为当前画布会被清空。',
    borderClass: 'border-brand/50 shadow-brand/60',
  },
  {
    title: '2. 填满格子',
    body: '先选一个颜色，再点击或拖动把格子填上。画错了可以用橡皮去掉，也可以撤销。滚轮用来缩放，小手可以拖动画布。',
    borderClass: 'border-danger/45 shadow-danger/60',
  },
  {
    title: '3. 保存作品',
    body: '下载会得到一张 PNG。草稿会自动留在这台设备上，关掉页面再打开，还能回到这次的画。清除草稿会删掉这份自动保存。',
    borderClass: 'border-success/50 shadow-success/60',
  },
] as const

export function PixelGuide() {
  return (
    <section aria-labelledby="pixel-guide-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <h2 id="pixel-guide-title" className="text-2xl font-bold leading-[1.2] text-slate-900 md:text-[28px]">
          画像素画
        </h2>
        <p className="text-[17px] font-normal leading-[1.6] text-slate-700">在浏览器里一格一格填色，就能画出像素画。</p>
        <p className="text-[17px] font-normal leading-[1.6] text-slate-700">选好网格和颜色就能开始。画完可以下载，关掉页面后草稿还留在这台设备上。</p>
      </div>
      <ol className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.title} className={`rounded-2xl border bg-white p-4 shadow-[0_4px_0_0_var(--tw-shadow-color)] ${step.borderClass}`}>
            <h3 className="text-xl font-bold leading-[1.25] text-slate-900">{step.title}</h3>
            <p className="mt-2 text-base font-normal leading-[1.6] text-slate-700">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
