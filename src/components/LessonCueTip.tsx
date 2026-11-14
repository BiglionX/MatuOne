interface Props {
  title: string
  teachingIntent: string | null
  teacherGuide: string | null
}

/** 关卡名称旁的教学话术。悬停或聚焦「话术」时出现，不占文档流。 */
export function LessonCueTip({ title, teachingIntent, teacherGuide }: Props) {
  return (
    <span className="group relative inline-flex max-w-full items-center gap-2">
      <span className="truncate font-medium text-ink">{title}</span>
      <button
        type="button"
        className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-ink-soft hover:border-brand hover:text-brand-strong focus:border-brand focus:outline-none"
        aria-label={`${title}的教学话术`}
      >
        话术
      </button>
      <span
        role="tooltip"
        className="invisible absolute left-0 top-full z-30 mt-2 w-80 rounded-card border border-line bg-white p-3 text-left text-sm shadow-card group-hover:visible group-focus-within:visible"
      >
        <p className="font-medium text-ink">教学设计意图</p>
        <p className="mt-1 whitespace-pre-wrap text-ink-soft">{teachingIntent?.trim() || '尚未填写。'}</p>
        <p className="mt-3 font-medium text-ink">上课引导</p>
        <p className="mt-1 whitespace-pre-wrap text-ink-soft">{teacherGuide?.trim() || '尚未填写。'}</p>
      </span>
    </span>
  )
}
