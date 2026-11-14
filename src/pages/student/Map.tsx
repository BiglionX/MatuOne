import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getCurrentStudent } from '@/api/studentAuth'
import { getLevelsByUnit, loadLearningHome, type LearningHome, type UnitLevel, type UnitSummary } from '@/api/learning'
import { LEVEL_KIND_LABEL } from '@/data/grade3Fall'
import { BrandMark } from '@/components/BrandMark'

export function Map() {
  const navigate = useNavigate()
  const student = getCurrentStudent()
  const [home, setHome] = useState<LearningHome | null>(null)
  const [error, setError] = useState('')
  const [openUnitId, setOpenUnitId] = useState<string | null>(null)
  const [levelsByUnit, setLevelsByUnit] = useState<Record<string, UnitLevel[]>>({})
  const [loadingUnit, setLoadingUnit] = useState('')

  useEffect(() => {
    if (!student) return
    loadLearningHome()
      .then(setHome)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '课程加载失败'))
  }, [student?.id])

  const openId = openUnitId === null ? home?.currentUnitId ?? '' : openUnitId

  useEffect(() => {
    if (!openId || levelsByUnit[openId]) return
    let alive = true
    setLoadingUnit(openId)
    getLevelsByUnit(openId)
      .then((result) => {
        if (!alive) return
        setLevelsByUnit((prev) => ({ ...prev, [openId]: result.levels }))
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : '单元加载失败')
      })
      .finally(() => {
        if (alive) setLoadingUnit('')
      })
    return () => {
      alive = false
    }
  }, [openId, levelsByUnit])

  if (!student) return <Navigate to="/student/login" replace />

  const units = home?.units ?? []
  const currentUnit = units.find((unit) => unit.unitId === home?.currentUnitId) ?? units[0]
  const grouped = groupUnits(units)

  return (
    <div className="student-shell min-h-screen min-w-[1024px] bg-canvas pb-16">
      <div className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/enter" className="btn-ghost px-2">
              ←
            </Link>
            <BrandMark size={44} />
            <Link to="/student/profile" className="rounded-field px-2 py-1 transition hover:bg-canvas" aria-label="打开用户中心">
              <h1 className="text-xl font-bold text-ink">代码闯关</h1>
              <p className="text-sm text-ink-soft">
                {student.name} · {home?.heading || '课程地图'}
                <span className="ml-2 text-brand">用户中心 ›</span>
              </p>
            </Link>
          </div>
          <div className="flex items-center gap-5">
            <div className="w-56">
              <div className="mb-1 flex justify-between text-sm text-ink-soft">
                <span>
                  本单元 {currentUnit?.completedCount ?? 0}/{currentUnit?.total ?? 20}
                </span>
                <span>{unitPercent(currentUnit?.completedCount ?? 0, currentUnit?.total ?? 0)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-brand-soft">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${unitPercent(currentUnit?.completedCount ?? 0, currentUnit?.total ?? 0)}%` }}
                />
              </div>
            </div>
            <Link to="/student/typing" className="btn-secondary">
              打字热身
              {home?.latestTyping && <span className="text-sm text-ink-soft">{home.latestTyping.wpm} WPM</span>}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-8 pt-8">
        <p className="text-sm text-ink-soft">当前阶段：{home?.stageTitle || 'Level 1'}</p>
        <h2 className="mt-1 text-3xl font-bold text-ink">{home?.heading || 'Level 1'}</h2>
        <p className="mt-2 text-ink-soft">每个阶段有 6 个单元。点开一个，里面是 20 节小课。</p>
        {error && <p className="mt-4 rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
        {!home && !error && <p className="mt-4 text-ink-soft">正在读取单元…</p>}

        <div className="mt-6 space-y-8">
          {grouped.map((group) => (
            <section key={group.stageLevel}>
              {grouped.length > 1 && <h3 className="mb-4 text-xl font-bold text-ink">Level {group.stageLevel}</h3>}
              <div className="space-y-4">
                {group.units.map((unit) => (
                  <UnitCard
                    key={unit.unitId}
                    unit={unit}
                    open={openId === unit.unitId}
                    levels={levelsByUnit[unit.unitId]}
                    loading={loadingUnit === unit.unitId}
                    onToggle={() => setOpenUnitId(openId === unit.unitId ? '' : unit.unitId)}
                    onOpenLevel={(levelId) => navigate(`/student/lesson/${levelId}`)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function UnitCard({
  unit,
  open,
  levels,
  loading,
  onToggle,
  onOpenLevel,
}: {
  unit: UnitSummary
  open: boolean
  levels: UnitLevel[] | undefined
  loading: boolean
  onToggle: () => void
  onOpenLevel: (levelId: string) => void
}) {
  const current = unit.state === 'current'
  return (
    <section className={`card overflow-hidden ${current ? 'border-brand ring-2 ring-brand/20' : ''}`}>
      <button type="button" className="flex w-full items-center gap-4 px-6 py-5 text-left" onClick={onToggle} aria-expanded={open}>
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
            current ? 'bg-brand text-white' : unit.state === 'past' ? 'bg-success-soft text-success' : 'bg-line text-ink-soft'
          }`}
        >
          {unit.sortOrder}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-3">
            <span className="truncate text-lg font-semibold text-ink">{unit.title}</span>
            {current && <span className="chip bg-brand-soft text-brand-strong">正在学</span>}
            {unit.state === 'past' && <span className="chip bg-success-soft text-success">已学过</span>}
          </span>
          <span className="mt-1 block text-sm text-ink-soft">
            {unit.completedCount}/{unit.total} 节
          </span>
        </span>
        <span className="text-sm text-ink-soft">{open ? '收起' : '展开'}</span>
      </button>
      <div className={`unit-fold ${open ? 'is-open' : ''}`}>
        <div
          className="unit-fold-inner"
          ref={(node) => {
            if (!node) return
            if (open) node.removeAttribute('inert')
            else node.setAttribute('inert', '')
          }}
        >
          <div className="border-t border-line px-6 py-5">
            {loading && !levels && <p className="text-sm text-ink-soft">正在读取这 20 节…</p>}
            {levels && (
              <div className="grid grid-cols-4 gap-3">
                {levels.map((level) => (
                  <LevelNode key={level.levelId} level={level} onOpen={() => onOpenLevel(level.levelId)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function LevelNode({ level, onOpen }: { level: UnitLevel; onOpen: () => void }) {
  const bright = level.unlocked
  const making = level.is_placeholder || level.placeholder
  const label = `${level.title}，${LEVEL_KIND_LABEL[level.levelType]}，${making ? '内容制作中，' : ''}${bright ? '已解锁' : '未解锁'}`
  return (
    <button
      type="button"
      className={`relative rounded-card px-2 text-center transition ${making ? 'pb-3 pt-7' : 'py-3'} ${
        bright ? 'bg-white shadow-card hover:bg-brand-soft' : 'bg-canvas text-ink-soft'
      } ${level.current ? 'ring-2 ring-brand' : ''}`}
      onClick={onOpen}
      aria-current={level.current ? 'step' : undefined}
      aria-label={label}
    >
      {making && <span className="absolute right-2 top-2 text-xs text-ink-soft">内容制作中</span>}
      <span
        className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${
          !bright
            ? 'bg-line text-ink-soft'
            : level.completed
              ? 'bg-success text-white'
              : level.current
                ? 'bg-brand text-white'
                : 'bg-brand-soft text-brand-strong'
        }`}
      >
        {level.completed ? '✓' : level.order}
      </span>
      <span className={`mt-2 block truncate text-sm font-medium ${bright ? 'text-ink' : 'text-ink-soft'}`}>{level.title}</span>
      <span className="mt-1 block text-xs text-ink-soft">{LEVEL_KIND_LABEL[level.levelType]}</span>
      {level.bonusCompleted && <span className="mt-1 block text-xs font-medium text-brand-strong">皇冠</span>}
    </button>
  )
}

function groupUnits(units: UnitSummary[]) {
  const groups: { stageLevel: number; units: UnitSummary[] }[] = []
  for (const unit of units) {
    const last = groups[groups.length - 1]
    if (!last || last.stageLevel !== unit.stageLevel) groups.push({ stageLevel: unit.stageLevel, units: [unit] })
    else last.units.push(unit)
  }
  return groups
}

function unitPercent(done: number, total: number): number {
  if (!total) return 0
  return Math.round((done / total) * 100)
}
