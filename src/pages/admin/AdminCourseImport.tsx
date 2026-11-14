import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { ImportReport, Level } from '@/types'
import { importCoursePackage, listCourseCopyHistory, listCourseTree, setPreviewFrozen, validateCoursePackage } from '@/api/catalog'
import { CommandStory } from '@/components/CommandStory'
import { CourseCopyDrawer } from '@/components/CourseCopyDrawer'
import { badgeTitle, LEVEL_KIND_LABEL } from '@/data/grade3Fall'
import { buildPlayableLevel } from '@/lib/lessonMaterial'
import { storyOutlineMarkdown } from '@/lib/storyOutline'
import type { CourseCopyField, CourseCopyHistory, CourseTree, CourseTreeLevel, CourseTreeStage, CourseTreeUnit } from '@/types/courseAdmin'

const COPY_FIELDS: { field: CourseCopyField; label: string; hint?: string }[] = [
  { field: 'goal', label: '学习目标', hint: '这一句会写进绘本第一页，试课预览里的朗读会跟着变。' },
  { field: 'teaching_intent', label: '教学设计意图' },
  { field: 'parent_brief', label: '家长端解读' },
  { field: 'teacher_guide', label: '上课引导' },
]

const COPY_LABEL: Record<CourseCopyField, string> = {
  goal: '学习目标',
  teaching_intent: '教学设计意图',
  parent_brief: '家长端解读',
  teacher_guide: '上课引导',
}

const SAMPLE = JSON.stringify(
  [
    {
      level_id: 'L13',
      order: 13,
      title: '画一个小房子',
      goal: '用已学的循环和变量拼出一个房子',
      teaching_intent: '用已经会的循环和变量拼出一座小房子，这一节不讲新语法。',
      parent_brief: '孩子用循环画出房子的轮廓，改一个数字，房子就变大变小。',
      teacher_guide: '先问房子有几条边，再让学生只改 size，运行后看房子有没有跟着变。',
      demo_code: 'size = 100\nfor i in range(4):\n    t.forward(size)\n    t.right(90)',
      expected_output: '一个方形房身',
      preview_kind: 'turtle',
      teach_code_lines: ['size = 100', 'for i in range(4):', '    t.forward(size)', '    t.right(90)'],
      keywords: ['for', 'range', 'size'],
      challenge_params: [
        { name: 'size', label: '房子大小', type: 'number', min: 60, max: 160, step: 10, default: 100, apply: { kind: 'assign', variable: 'size' } },
      ],
      error_mappings: [{ pattern: 'indent', friendlyMessage: 'for 下面的行要缩进 4 个空格。' }],
      estimated_minutes: 20,
    },
  ],
  null,
  2,
)

const PREVIEW_LABEL = { text: '文字', turtle: '海龟画布' }
const EXERCISE_LABEL = { normal: '全抄', fill_blank: '挖空', debug: '找茬' }

const LevelButton = memo(function LevelButton({
  level,
  selected,
  onSelect,
}: {
  level: CourseTreeLevel
  selected: boolean
  onSelect: (levelId: string) => void
}) {
  return (
    <button
      type="button"
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect(level.levelId)}
      className={`flex w-full items-center gap-2 rounded-field px-2 py-1.5 text-left text-sm ${
        selected ? 'bg-brand-soft text-brand-strong' : 'text-ink hover:bg-canvas'
      }`}
    >
      <span className="shrink-0 font-mono text-xs">{level.catalogId}</span>
      <span className="truncate">{level.title}</span>
      {level.previewFrozen && <span className="shrink-0 text-xs text-warning">冻结</span>}
    </button>
  )
})

/** 平台后台课程管理：左树按 Level / 单元 / 关卡展开。结构和代码只走 JSON，教学文案可以就地改。 */
export function AdminCourseImport() {
  const [text, setText] = useState('')
  const [report, setReport] = useState<ImportReport | null>(null)
  const [preview, setPreview] = useState<{ ok: boolean; count: number } | null>(null)
  const [tree, setTree] = useState<CourseTree | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [importError, setImportError] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [openStages, setOpenStages] = useState<Set<number>>(() => new Set([1]))
  const [openUnits, setOpenUnits] = useState<Set<string>>(() => new Set(['L1_U01']))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showFrozen, setShowFrozen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    listCourseTree()
      .then((next) => {
        if (!cancelled) setTree(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '课程树读取失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  useEffect(() => {
    if (!tree || selectedId) return
    const stage = tree.stages.find((item) => item.stageLevel === 1) ?? tree.stages[0]
    const unit = stage?.units.find((item) => item.unitId === 'L1_U01') ?? stage?.units[0]
    const level = unit?.levels[0]
    if (stage) setOpenStages(new Set([stage.stageLevel]))
    if (unit) setOpenUnits(new Set([unit.unitId]))
    if (level) setSelectedId(level.levelId)
  }, [tree, selectedId])

  const indexed = useMemo(() => {
    const map = new Map<string, { stage: CourseTreeStage; unit: CourseTreeUnit; level: CourseTreeLevel }>()
    for (const stage of tree?.stages ?? []) {
      for (const unit of stage.units) {
        for (const level of unit.levels) map.set(level.levelId, { stage, unit, level })
      }
    }
    return map
  }, [tree])

  const selected = selectedId ? indexed.get(selectedId) ?? null : null

  const selectLevel = useCallback((levelId: string) => {
    setSelectedId(levelId)
    setShowImport(false)
  }, [])

  const markCopy = useCallback((levelId: string, field: CourseCopyField, text: string | null) => {
    setTree((current) => {
      if (!current) return current
      return {
        stages: current.stages.map((stage) => ({
          ...stage,
          units: stage.units.map((unit) => ({
            ...unit,
            levels: unit.levels.map((level) => (level.levelId === levelId ? applyCopy(level, field, text) : level)),
          })),
        })),
      }
    })
  }, [])

  const markFrozen = useCallback((levelId: string, frozen: boolean) => {
    setTree((current) => {
      if (!current) return current
      return {
        stages: current.stages.map((stage) => ({
          ...stage,
          units: stage.units.map((unit) => ({
            ...unit,
            levels: unit.levels.map((level) => (level.levelId === levelId ? { ...level, previewFrozen: frozen } : level)),
          })),
        })),
      }
    })
  }, [])

  const toggleStage = useCallback((stageLevel: number) => {
    setOpenStages((current) => {
      const next = new Set(current)
      if (next.has(stageLevel)) next.delete(stageLevel)
      else next.add(stageLevel)
      return next
    })
  }, [])

  const toggleUnit = useCallback((unitId: string) => {
    setOpenUnits((current) => {
      const next = new Set(current)
      if (next.has(unitId)) next.delete(unitId)
      else next.add(unitId)
      return next
    })
  }, [])

  const check = async () => {
    setImportError('')
    try {
      const result = await validateCoursePackage(text)
      setReport(result.report)
      setPreview({ ok: result.report.ok, count: result.report.imported })
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '校验失败')
    }
  }

  const doImport = async () => {
    setImportError('')
    try {
      const result = await importCoursePackage(text)
      setReport(result)
      setPreview({ ok: result.ok, count: result.imported })
      if (result.ok) setReloadKey((key) => key + 1)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '导入失败')
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-6 py-6">
      <header className="flex shrink-0 items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">课程管理</h1>
          <p className="mt-1 text-sm text-ink-soft">
            按 Level、单元和关卡查看课程包。录入仍只走 JSON 课程包，不提供可视化编辑器。
          </p>
        </div>
        <button type="button" className="btn-secondary shrink-0" onClick={() => setShowImport((open) => !open)}>
          {showImport ? '返回关卡' : '导入课程包'}
        </button>
      </header>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-5 grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <nav aria-label="课程目录" className="card min-h-[420px] overflow-y-auto p-3 lg:max-h-[calc(100vh-11rem)]">
          <div className="mb-2 flex justify-end px-1">
            <button type="button" className="text-xs text-brand-strong" onClick={() => setShowFrozen((open) => !open)}>
              {showFrozen ? '隐藏冻结关卡' : '显示冻结关卡'}
            </button>
          </div>
          {loading && !tree && <p className="px-2 py-3 text-sm text-ink-soft">正在读取课程树…</p>}
          {!loading && (tree?.stages.length ?? 0) === 0 && <p className="px-2 py-3 text-sm text-ink-soft">还没有课程。</p>}
          {tree?.stages.map((stage) => {
            const stageOpen = openStages.has(stage.stageLevel)
            return (
              <div key={stage.stageLevel} className="mb-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-field px-2 py-2 text-left text-sm font-semibold text-ink hover:bg-canvas"
                  aria-expanded={stageOpen}
                  onClick={() => toggleStage(stage.stageLevel)}
                >
                  <span>
                    {stage.title}
                    {stage.subtitle ? <span className="ml-2 font-normal text-ink-soft">{stage.subtitle}</span> : null}
                  </span>
                  <span className="text-xs text-ink-soft">{stageOpen ? '▾' : '▸'}</span>
                </button>
                {stageOpen &&
                  stage.units.map((unit) => {
                    const unitOpen = openUnits.has(unit.unitId)
                    const visible = showFrozen ? unit.levels : unit.levels.filter((level) => !level.previewFrozen)
                    const hiddenCount = unit.levels.length - visible.length
                    return (
                      <div key={unit.unitId} className="ml-3">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-field px-2 py-1.5 text-left text-sm text-ink hover:bg-canvas"
                          aria-expanded={unitOpen}
                          onClick={() => toggleUnit(unit.unitId)}
                        >
                          <span>{unit.label}</span>
                          <span className="text-xs text-ink-soft">
                            {visible.length}
                            {hiddenCount > 0 ? `，${hiddenCount} 冻结` : ''}
                            {unitOpen ? ' ▾' : ' ▸'}
                          </span>
                        </button>
                        {unitOpen && (
                          <div className="ml-2">
                            {visible.length === 0 && <p className="px-2 py-1 text-xs text-ink-soft">这一单元已冻结。</p>}
                            {visible.map((level) => (
                              <LevelButton
                                key={level.levelId}
                                level={level}
                                selected={level.levelId === selectedId}
                                onSelect={selectLevel}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )
          })}
        </nav>

        <section aria-label="关卡详情" className="card min-h-[420px] overflow-y-auto p-5 lg:max-h-[calc(100vh-11rem)]">
          {showImport ? (
            <ImportPanel
              text={text}
              report={report}
              preview={preview}
              error={importError}
              fileRef={fileRef}
              onText={setText}
              onClearReport={() => setReport(null)}
              onCheck={check}
              onImport={doImport}
              onFillSample={() => setText(SAMPLE)}
            />
          ) : selected ? (
            <LevelDetail stage={selected.stage} unit={selected.unit} level={selected.level} onFrozen={markFrozen} onCopy={markCopy} />
          ) : (
            <p className="text-sm text-ink-soft">{loading ? '正在读取…' : '在左侧选一节课。'}</p>
          )}
        </section>
      </div>
    </div>
  )
}

function LevelDetail({
  stage,
  unit,
  level,
  onFrozen,
  onCopy,
}: {
  stage: CourseTreeStage
  unit: CourseTreeUnit
  level: CourseTreeLevel
  onFrozen: (levelId: string, frozen: boolean) => void
  onCopy: (levelId: string, field: CourseCopyField, text: string | null) => void
}) {
  const [pending, setPending] = useState(false)
  const [lockError, setLockError] = useState('')
  const [editing, setEditing] = useState<CourseCopyField | null>(null)
  const [history, setHistory] = useState<CourseCopyHistory | null>(null)
  const [historyError, setHistoryError] = useState('')
  const [storyLevel, setStoryLevel] = useState<Level | null>(null)
  const [outlineError, setOutlineError] = useState('')
  const previewHref = `/student/lesson/${encodeURIComponent(level.catalogId)}?preview=true`
  const playable = useMemo(() => lessonForStory(level), [level])
  const editingField = COPY_FIELDS.find((item) => item.field === editing) ?? null

  useEffect(() => {
    let alive = true
    setHistory(null)
    setHistoryError('')
    listCourseCopyHistory(level.levelId)
      .then((next) => {
        if (alive) setHistory(next)
      })
      .catch((err: unknown) => {
        if (alive) setHistoryError(err instanceof Error ? err.message : '修改记录没有读到')
      })
    return () => {
      alive = false
    }
  }, [level.levelId, level.goal, level.teachingIntent, level.parentBrief, level.teacherGuide])

  const toggleFrozen = () => {
    const next = !level.previewFrozen
    setPending(true)
    setLockError('')
    setPreviewFrozen(level.levelId, next)
      .then((result) => onFrozen(level.levelId, result.previewFrozen))
      .catch((err: unknown) => setLockError(err instanceof Error ? err.message : '冻结状态没有保存'))
      .finally(() => setPending(false))
  }

  const exportOutline = () => {
    if (!playable) {
      setOutlineError('这一关还没有绘本。')
      return
    }
    setOutlineError('')
    const markdown = storyOutlineMarkdown(playable, level.catalogId)
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${level.catalogId}-绘本大纲.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="code-font text-sm text-brand-strong">{level.catalogId}</span>
            <span className="chip bg-canvas text-ink">{LEVEL_KIND_LABEL[level.levelType]}</span>
            {!level.published && <span className="chip bg-warning-soft text-warning">未发布</span>}
          </div>
          <h2 className="mt-3 text-xl font-bold text-ink">
            {level.catalogId} {level.title}
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            {stage.title}
            {stage.subtitle ? `（${stage.subtitle}）` : ''} · {unit.title}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {level.previewFrozen ? (
            <span className="btn-primary cursor-not-allowed opacity-60" aria-disabled="true">
              试课已冻结
            </span>
          ) : (
            <a className="btn-primary" href={previewHref} target="_blank" rel="noreferrer">
              试课预览
            </a>
          )}
          <button type="button" className="btn-primary" onClick={() => playable && setStoryLevel(playable)} disabled={!playable}>
            查看绘本预览
          </button>
          <button type="button" className="btn-secondary" onClick={exportOutline} disabled={!playable}>
            导出绘本大纲
          </button>
        </div>
      </div>
      {outlineError && <p className="mt-3 text-sm text-danger">{outlineError}</p>}
      <div className="mt-4 flex items-center justify-between gap-3 rounded-field bg-canvas px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">冻结预览</p>
          <p className="mt-1 text-xs text-ink-soft">打开后不能试课。占位课默认冻结，避免看到还没做完的空白课文。绘本预览和大纲导出仍然可用。</p>
          {lockError && <p className="mt-1 text-xs text-danger">{lockError}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={level.previewFrozen}
          aria-label="冻结预览"
          disabled={pending}
          onClick={toggleFrozen}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${level.previewFrozen ? 'bg-warning' : 'bg-line'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${level.previewFrozen ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      <div className="mt-6 space-y-5">
        {COPY_FIELDS.map((item) => (
          <CopyBlock
            key={item.field}
            label={item.label}
            text={copyText(level, item.field)}
            onEdit={() => setEditing(item.field)}
          />
        ))}
      </div>

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-ink">修改记录</h3>
        <p className="mt-1 text-xs text-ink-soft">
          {history ? `文案版本 ${history.revisionCount}` : '正在读取修改记录…'}
          。只记录这四段文案，不记录代码。
        </p>
        {historyError && <p className="mt-2 text-sm text-danger">{historyError}</p>}
        {history && history.entries.length === 0 && <p className="mt-2 text-sm text-ink-soft">还没有就地修改。</p>}
        {history && history.entries.length > 0 && (
          <ul className="mt-3 space-y-2">
            {history.entries.map((entry) => (
              <li key={`${entry.editedAt}-${entry.field}-${entry.revisionCount}`} className="rounded-field bg-canvas px-3 py-2 text-sm">
                <p className="text-ink">
                  {entry.editorName} · {COPY_LABEL[entry.field]} · {formatEditedAt(entry.editedAt)} · 版本 {entry.revisionCount}
                </p>
                <p className="mt-1 text-ink-soft">之前：{entry.previousText || '空'}</p>
                <p className="text-ink">改成：{entry.nextText || '空'}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h3 className="mt-6 text-sm font-semibold text-ink">配置</h3>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <ConfigItem label="关卡编号" value={level.levelId} hint={level.levelId === level.catalogId ? undefined : '写入课程包 JSON 时用这个编号'} />
        <ConfigItem label="目录编号" value={level.catalogId} />
        <ConfigItem label="课型" value={LEVEL_KIND_LABEL[level.levelType]} />
        <ConfigItem label="知识点" value={level.knowledgeTags.length ? level.knowledgeTags.join('、') : '还没有'} />
        <ConfigItem label="里程碑徽章" value={level.milestoneBadge ? badgeTitle(level.milestoneBadge) : '不颁发'} />
        <ConfigItem label="预览" value={level.previewKind ? PREVIEW_LABEL[level.previewKind] : '还没有'} />
        <ConfigItem label="回合" value={level.exercise ? EXERCISE_LABEL[level.exercise] : '还没有'} />
        <ConfigItem label="预计分钟" value={level.estimatedMinutes == null ? '还没有' : String(level.estimatedMinutes)} />
      </dl>
      <div className="mt-4">
        <p className="text-sm text-ink-soft">关键词</p>
        {level.keywords.length === 0 ? (
          <p className="mt-1 text-sm text-ink-soft">课文还在编写。</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {level.keywords.map((keyword) => (
              <li key={keyword} className="code-font rounded-field bg-canvas px-2 py-1 text-xs text-ink">
                {keyword}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-6 text-xs text-ink-soft">课文、代码和报错映射仍走 JSON 课程包。上面四段文案可以在这里改；下次导入如果带了同一字段，会覆盖这里的内容。</p>
      {storyLevel && (
        <CommandStory
          level={storyLevel}
          finishLabel="关闭预览"
          dismissLabel="关闭"
          onClose={() => setStoryLevel(null)}
        />
      )}
      {editingField && (
        <CourseCopyDrawer
          levelId={level.levelId}
          field={editingField.field}
          label={editingField.label}
          hint={editingField.hint}
          value={copyText(level, editingField.field) ?? ''}
          onClose={() => setEditing(null)}
          onSaved={(result) => onCopy(level.levelId, result.field, result.text)}
        />
      )}
    </div>
  )
}

function CopyBlock({ label, text, onEdit }: { label: string; text: string | null; onEdit: () => void }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{label}</h3>
        <button type="button" className="btn-ghost px-3 py-1 text-sm" aria-label={`编辑${label}`} onClick={onEdit}>
          编辑
        </button>
      </div>
      <p className={`mt-2 text-sm leading-6 ${text ? 'text-ink' : 'text-ink-soft'}`}>{text ?? '尚未填写。'}</p>
    </section>
  )
}

function copyText(level: CourseTreeLevel, field: CourseCopyField): string | null {
  if (field === 'goal') return level.goal || null
  if (field === 'teaching_intent') return level.teachingIntent
  if (field === 'parent_brief') return level.parentBrief
  return level.teacherGuide
}

function applyCopy(level: CourseTreeLevel, field: CourseCopyField, text: string | null): CourseTreeLevel {
  if (field === 'goal') return { ...level, goal: text ?? '' }
  if (field === 'teaching_intent') return { ...level, teachingIntent: text }
  if (field === 'parent_brief') return { ...level, parentBrief: text }
  return { ...level, teacherGuide: text }
}

function lessonForStory(level: CourseTreeLevel): Level | null {
  const built = buildPlayableLevel(level.catalogId) ?? buildPlayableLevel(level.levelId)
  if (!built) return null
  return { ...built, title: level.title || built.title, goal: level.goal.trim() || built.goal }
}

function formatEditedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

function ConfigItem({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-field bg-canvas px-3 py-2">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="mt-1 font-medium text-ink">{value}</dd>
      {hint && <dd className="mt-1 text-xs text-ink-soft">{hint}</dd>}
    </div>
  )
}

function ImportPanel({
  text,
  report,
  preview,
  error,
  fileRef,
  onText,
  onClearReport,
  onCheck,
  onImport,
  onFillSample,
}: {
  text: string
  report: ImportReport | null
  preview: { ok: boolean; count: number } | null
  error: string
  fileRef: RefObject<HTMLInputElement>
  onText: (value: string) => void
  onClearReport: () => void
  onCheck: () => void
  onImport: () => void
  onFillSample: () => void
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">课程包导入</h2>
          <p className="mt-1 text-sm text-ink-soft">通过结构化 JSON 录入关卡，导入时逐字段校验，不提供可视化编辑器。</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost text-sm" onClick={onFillSample}>
            填入示例
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (file) {
                onText(await file.text())
                onClearReport()
              }
              event.target.value = ''
            }}
          />
          <button type="button" className="btn-ghost text-sm" onClick={() => fileRef.current?.click()}>
            选择 JSON 文件
          </button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <textarea
        value={text}
        onChange={(event) => {
          onText(event.target.value)
          onClearReport()
        }}
        spellCheck={false}
        placeholder="把课程包 JSON 粘贴到这里，或选择一个 .json 文件"
        className="code-font mt-4 h-64 w-full resize-y rounded-card border border-line bg-code-bg p-4 text-sm outline-none focus:border-brand"
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-secondary" onClick={onCheck} disabled={!text.trim()}>
          校验
        </button>
        <button type="button" className="btn-primary px-7" onClick={onImport} disabled={!text.trim()}>
          导入课程包
        </button>
        {preview && (
          <span className={`text-sm ${preview.ok ? 'text-success' : 'text-danger'}`}>
            {preview.ok ? `可以导入，识别到 ${preview.count} 关` : '还有字段不通过，先按下面的报告改一改'}
          </span>
        )}
      </div>
      <details className="mt-5 rounded-field bg-canvas px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          校验报告{report ? `（${report.issues.length} 个问题）` : ''}
        </summary>
        <div className="mt-3">
          {!report ? (
            <p className="text-sm text-ink-soft">还没有校验结果。点「校验」先看看字段有没有问题。</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-field bg-white py-3">
                  <p className="text-xl font-bold text-ink">{report.imported}</p>
                  <p className="text-ink-soft">通过</p>
                </div>
                <div className="rounded-field bg-white py-3">
                  <p className="text-xl font-bold text-ink">{report.skipped}</p>
                  <p className="text-ink-soft">跳过</p>
                </div>
                <div className="rounded-field bg-white py-3">
                  <p className="text-xl font-bold text-ink">{report.issues.length}</p>
                  <p className="text-ink-soft">问题</p>
                </div>
              </div>
              {report.issues.length === 0 ? (
                <p className="mt-4 rounded-field bg-success-soft px-4 py-3 text-sm text-success">全部字段通过，可以导入。</p>
              ) : (
                <ul className="mt-4 max-h-60 space-y-2 overflow-auto">
                  {report.issues.map((issue, index) => (
                    <li
                      key={`${issue.levelId}-${issue.field}-${index}`}
                      className={`rounded-field px-3 py-2.5 text-sm ${issue.severity === 'error' ? 'bg-danger-soft' : 'bg-warning-soft'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink">{issue.levelId}</span>
                        <span className="code-font text-xs text-ink-soft">{issue.field}</span>
                      </div>
                      <p className={`mt-1 ${issue.severity === 'error' ? 'text-danger' : 'text-warning'}`}>{issue.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </details>
    </div>
  )
}
