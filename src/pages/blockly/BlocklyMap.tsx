import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getCurrentStudent } from '@/api/studentAuth'
import { loadBlocklyMap, type BlocklyMap, type BlocklyMapLevel, type BlocklyMapTerm, type BlocklyMapUnit } from '@/api/blocklyMap'
import { BrandMark } from '@/components/BrandMark'
import { FormError } from '@/components/FormError'
import { ListSkeleton } from '@/components/Skeleton'
import { LEVEL_KIND_LABEL } from '@/data/grade3Fall'
import type { CurriculumLevelKind } from '@/types/curriculum'

/** 关卡类型的中文标签；后端只给英文枚举，未知值退回「新课」。 */
function kindLabel(levelType: string): string {
  return LEVEL_KIND_LABEL[levelType as CurriculumLevelKind] ?? '新课'
}

export function BlocklyMap() {
  const navigate = useNavigate()
  const student = getCurrentStudent()
  const [map, setMap] = useState<BlocklyMap | null>(null)
  const [termId, setTermId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!student) return
    let alive = true
    loadBlocklyMap()
      .then((next) => {
        if (!alive) return
        setMap(next)
        // 默认落在第一个还没通关的学期上。
        setTermId(next.currentTermId || next.terms[0]?.termId || '')
      })
      .catch((err: unknown) => {
        if (!alive) return
        setError(err instanceof Error ? err.message : '课程地图加载失败')
      })
    return () => {
      alive = false
    }
  }, [student?.id])

  if (!student) return <Navigate to="/student/login" replace />

  const terms = map?.terms ?? []
  const activeTerm = terms.find((term) => term.termId === termId) ?? terms[0] ?? null

  return (
    <div className="student-shell min-h-screen bg-canvas pb-16">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/enter" className="btn-ghost px-2" aria-label="返回启动器">
              ←
            </Link>
            <BrandMark size={40} />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-ink">Blockly 积木编程</h1>
              <p className="truncate text-sm text-ink-soft">
                {student.name} · 已通关 {map?.completedCount ?? 0}/{map?.totalCount ?? 0} 关
              </p>
            </div>
          </div>
          <div className="w-56 shrink-0">
            <div className="mb-1 flex justify-between text-sm text-ink-soft">
              <span>课程进度</span>
              <span>{progressPercent(map?.completedCount ?? 0, map?.totalCount ?? 0)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-brand-soft">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progressPercent(map?.completedCount ?? 0, map?.totalCount ?? 0)}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-8 pt-8">
        {error && <FormError className="mb-6">{error}</FormError>}
        {!map && !error && <ListSkeleton rows={3} />}

        {terms.length > 0 && (
          <>
            <nav className="flex flex-wrap gap-2" aria-label="选择学期">
              {terms.map((term) => {
                const active = term.termId === activeTerm?.termId
                const done = countTerm(term)
                return (
                  <button
                    key={term.termId}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTermId(term.termId)}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-field px-4 text-sm font-semibold transition ${
                      active ? 'bg-brand-action text-white' : 'bg-white text-ink shadow-card hover:bg-brand-soft'
                    }`}
                  >
                    {term.title}
                    <span className={active ? 'text-white/80' : 'text-ink-soft'}>
                      {done.completed}/{done.total}
                    </span>
                  </button>
                )
              })}
            </nav>

            {activeTerm && (
              <>
                <p className="mt-6 text-sm font-semibold text-brand-strong">{activeTerm.stageLabel}</p>
                <h2 className="mt-1 text-3xl font-bold text-ink">{activeTerm.title}</h2>
                <p className="mt-2 text-ink-soft">{activeTerm.summary}</p>

                <div className="mt-6 space-y-6">
                  {activeTerm.units.map((unit) => (
                    <UnitCard key={unit.unitId} unit={unit} onOpen={(levelId) => navigate(`/blockly/lesson/${levelId}`)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function UnitCard({ unit, onOpen }: { unit: BlocklyMapUnit; onOpen: (levelId: string) => void }) {
  const completed = unit.levels.filter((level) => level.completed).length
  return (
    <section className="card p-6" aria-labelledby={`unit-${unit.unitId}`}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 id={`unit-${unit.unitId}`} className="text-xl font-semibold text-ink">
          {unit.sortOrder}. {unit.title}
        </h3>
        <p className="shrink-0 text-sm text-ink-soft">
          {completed}/{unit.levels.length} 关
        </p>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{unit.summary}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {unit.levels.map((level) => (
          <LevelCard key={level.levelId} level={level} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}

function LevelCard({ level, onOpen }: { level: BlocklyMapLevel; onOpen: (levelId: string) => void }) {
  const playable = level.unlocked && !level.isPlaceholder
  const state = level.completed ? '已完成' : level.isPlaceholder ? '内容制作中' : level.unlocked ? '可挑战' : '未解锁'
  return (
    <button
      type="button"
      disabled={!playable}
      onClick={() => onOpen(level.levelId)}
      className={`relative rounded-card px-2 py-3 text-center transition ${
        level.completed
          ? 'bg-success-soft text-success'
          : level.unlocked
            ? 'bg-white text-ink shadow-card hover:bg-brand-soft'
            : 'cursor-not-allowed bg-canvas text-ink-soft'
      }`}
      aria-label={`${level.title}，${kindLabel(level.levelType)}，${state}`}
    >
      <span
        className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${
          level.completed
            ? 'bg-success text-white'
            : level.unlocked
              ? 'bg-brand-action text-white'
              : 'bg-line text-ink-soft'
        }`}
      >
        {level.completed ? '✓' : level.unlocked ? level.sortOrder : <LockIcon />}
      </span>
      <span className="mt-2 block truncate text-sm font-medium">{level.title}</span>
      <span className="mt-1 block text-xs text-ink-soft">
        {level.isPlaceholder ? '内容制作中' : kindLabel(level.levelType)}
      </span>
    </button>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
      <rect x="3" y="7" width="10" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 一个学期的通关数与关卡总数。 */
function countTerm(term: BlocklyMapTerm): { completed: number; total: number } {
  const levels = term.units.flatMap((unit) => unit.levels)
  return { completed: levels.filter((level) => level.completed).length, total: levels.length }
}

function progressPercent(done: number, total: number): number {
  if (!total) return 0
  return Math.round((done / total) * 100)
}