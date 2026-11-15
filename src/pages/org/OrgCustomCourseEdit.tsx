import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, listOrgMaterials } from '@/api/orgMaterials'
import { readOrgCustomCourse, saveOrgCustomCourse } from '@/api/orgCustomCourses'
import { OrgAccessNotice } from '@/components/OrgAccessNotice'
import type { OrgCustomSectionType, OrgMaterial, OrgPlatformLevel } from '@/types/orgMaterial'

interface DraftSection {
  key: string
  type: OrgCustomSectionType
  platformLevelId: string | null
  materialId: string | null
  title: string
}

type DragPayload =
  | { kind: 'outline'; index: number }
  | { kind: 'platform'; level: OrgPlatformLevel }
  | { kind: 'material'; material: OrgMaterial }

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = list.slice()
  const [item] = next.splice(from, 1)
  if (!item) return list
  next.splice(to, 0, item)
  return next
}

function insertItem<T>(list: T[], index: number, item: T): T[] {
  const next = list.slice()
  next.splice(index, 0, item)
  return next
}

export function OrgCustomCourseEdit() {
  const { courseId = '' } = useParams()
  const [title, setTitle] = useState('')
  const [levels, setLevels] = useState<OrgPlatformLevel[]>([])
  const [materials, setMaterials] = useState<OrgMaterial[]>([])
  const [sections, setSections] = useState<DraftSection[]>([])
  const [query, setQuery] = useState('')
  const [openUnits, setOpenUnits] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const dragRef = useRef<DragPayload | null>(null)

  useEffect(() => {
    let active = true
    setReady(false)
    setNotice('')
    Promise.all([readOrgCustomCourse(courseId), listOrgMaterials()])
      .then(([course, library]) => {
        if (!active) return
        setTitle(course.title)
        setLevels(course.levels)
        setMaterials(library)
        setSections(
          course.sections.map((section) => ({
            key: section.id,
            type: section.type,
            platformLevelId: section.platformLevelId,
            materialId: section.materialId,
            title: section.title,
          })),
        )
        const first = course.levels[0]
        setOpenUnits(first ? [first.unitId] : [])
        setReady(true)
      })
      .catch((error: unknown) => {
        if (!active) return
        setReady(true)
        setNotice(error instanceof ApiError ? error.message : '读取失败')
      })
    return () => {
      active = false
    }
  }, [courseId])

  const tree = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const stages = new Map<number, Map<string, { title: string; sort: number; levels: OrgPlatformLevel[] }>>()
    for (const level of levels) {
      if (keyword && !level.title.toLowerCase().includes(keyword) && !String(level.order).includes(keyword)) continue
      const units = stages.get(level.stageLevel) ?? new Map()
      const unit = units.get(level.unitId) ?? { title: level.unitTitle, sort: level.unitSort, levels: [] }
      unit.levels.push(level)
      units.set(level.unitId, unit)
      stages.set(level.stageLevel, units)
    }
    return [...stages.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([stageLevel, units]) => ({
        stageLevel,
        units: [...units.values()].sort((a, b) => a.sort - b.sort),
      }))
  }, [levels, query])

  const addLevel = (level: OrgPlatformLevel) => {
    setSaved(false)
    setSections((current) => [
      ...current,
      { key: crypto.randomUUID(), type: 'platform_level', platformLevelId: level.levelId, materialId: null, title: level.title },
    ])
  }

  const addMaterial = (material: OrgMaterial) => {
    setSaved(false)
    setSections((current) => [
      ...current,
      { key: crypto.randomUUID(), type: 'material', platformLevelId: null, materialId: material.id, title: material.name },
    ])
  }

  const applyDrop = (index: number) => {
    const drag = dragRef.current
    dragRef.current = null
    setDropIndex(null)
    if (!drag) return
    setSaved(false)
    if (drag.kind === 'outline') {
      setSections((current) => moveItem(current, drag.index, Math.min(index, current.length - 1)))
      return
    }
    const item: DraftSection =
      drag.kind === 'platform'
        ? {
            key: crypto.randomUUID(),
            type: 'platform_level',
            platformLevelId: drag.level.levelId,
            materialId: null,
            title: drag.level.title,
          }
        : {
            key: crypto.randomUUID(),
            type: 'material',
            platformLevelId: null,
            materialId: drag.material.id,
            title: drag.material.name,
          }
    setSections((current) => insertItem(current, index, item))
  }

  const save = async () => {
    setNotice('')
    setSaved(false)
    setSaving(true)
    try {
      const savedCourse = await saveOrgCustomCourse({
        courseId,
        title,
        sections: sections.map((section) => ({
          type: section.type,
          platformLevelId: section.platformLevelId,
          materialId: section.materialId,
        })),
      })
      setTitle(savedCourse.title)
      setSections(
        savedCourse.sections.map((section) => ({
          key: section.id,
          type: section.type,
          platformLevelId: section.platformLevelId,
          materialId: section.materialId,
          title: section.title,
        })),
      )
      setSaved(true)
    } catch (error: unknown) {
      setNotice(error instanceof ApiError ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-4 border-b border-line bg-white px-6 py-4">
        <Link to="/org/courses" className="text-sm text-ink-soft">
          ← 课程管理
        </Link>
        <label className="min-w-[16rem] flex-1 text-sm text-ink-soft">
          课程名称
          <input
            className="field mt-1"
            value={title}
            maxLength={80}
            onChange={(event) => {
              setTitle(event.target.value)
              setSaved(false)
            }}
          />
        </label>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-soft">{sections.length} 个环节</span>
          <button type="button" className="btn-primary px-8" disabled={!ready || saving} onClick={() => void save()}>
            {saving ? '正在保存…' : '保存'}
          </button>
        </div>
      </header>
      <div className="px-6 pt-4">
        <OrgAccessNotice message={notice} />
        {saved && <p className="mb-4 text-sm text-success">已保存，回到课程管理就能看到这门课。</p>}
      </div>
      {!ready ? (
        <p className="px-6 text-sm text-ink-soft">正在准备课程大纲…</p>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 px-6 pb-6 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
          <aside className="card flex min-h-[24rem] flex-col overflow-hidden lg:min-h-0">
            <div className="border-b border-line px-4 py-3">
              <h2 className="font-semibold text-ink">平台素材库</h2>
              <input
                className="field mt-3"
                value={query}
                placeholder="搜索关卡"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {tree.length === 0 && <p className="px-2 py-3 text-sm text-ink-soft">当前没有可加入的关卡。</p>}
              {tree.map((stage) => (
                <section key={stage.stageLevel} className="mb-3">
                  <h3 className="px-2 py-2 text-sm font-semibold text-ink">Level {stage.stageLevel}</h3>
                  {stage.units.map((unit) => {
                    const open = query.trim() !== '' || openUnits.includes(unit.levels[0]?.unitId ?? '')
                    const unitId = unit.levels[0]?.unitId ?? unit.title
                    return (
                      <div key={unitId} className="mb-1">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-field px-2 py-2 text-left text-sm text-ink-soft hover:bg-canvas"
                          onClick={() =>
                            setOpenUnits((current) => (current.includes(unitId) ? current.filter((id) => id !== unitId) : [...current, unitId]))
                          }
                        >
                          <span className="truncate">{unit.title}</span>
                          <span>{open ? '▾' : '▸'} {unit.levels.length}</span>
                        </button>
                        {open &&
                          unit.levels.map((level) => (
                            <button
                              key={level.levelId}
                              type="button"
                              draggable
                              className="block w-full truncate rounded-field px-3 py-2 text-left text-sm text-ink hover:bg-brand-soft"
                              onClick={() => addLevel(level)}
                              onDragStart={() => {
                                dragRef.current = { kind: 'platform', level }
                              }}
                              onDragEnd={() => {
                                dragRef.current = null
                                setDropIndex(null)
                              }}
                            >
                              🎮 {level.title}
                            </button>
                          ))}
                      </div>
                    )
                  })}
                </section>
              ))}
            </div>
          </aside>

          <main
            className="card flex min-h-[24rem] flex-col overflow-hidden lg:min-h-0"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              applyDrop(sections.length)
            }}
          >
            <div className="border-b border-line px-5 py-3">
              <h2 className="font-semibold text-ink">课程大纲</h2>
              <p className="mt-1 text-sm text-ink-soft">点击或拖进中间。拖动环节可以改顺序。</p>
            </div>
            <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {sections.length === 0 && <li className="px-2 py-6 text-sm text-ink-soft">还没有环节。从左右两侧加关卡或素材。</li>}
              {sections.map((section, index) => (
                <li
                  key={section.key}
                  draggable
                  className={`rounded-card border bg-white px-4 py-3 ${dropIndex === index ? 'border-brand' : 'border-line'}`}
                  onDragStart={() => {
                    dragRef.current = { kind: 'outline', index }
                  }}
                  onDragEnd={() => {
                    dragRef.current = null
                    setDropIndex(null)
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setDropIndex(index)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    applyDrop(index)
                  }}
                >
                  <div className="flex items-center gap-3">
                    {section.type === 'material' ? (
                      <MaterialThumb material={materials.find((item) => item.id === section.materialId)} />
                    ) : (
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-field bg-brand-soft text-xs text-brand-strong">关卡</span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{section.title}</span>
                  </div>
                  <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    className="btn-ghost px-2"
                    disabled={index === 0}
                    onClick={() => {
                      setSaved(false)
                      setSections((current) => moveItem(current, index, index - 1))
                    }}
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-2"
                    disabled={index === sections.length - 1}
                    onClick={() => {
                      setSaved(false)
                      setSections((current) => moveItem(current, index, index + 1))
                    }}
                  >
                    下移
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-2 text-danger"
                    onClick={() => {
                      setSaved(false)
                      setSections((current) => current.filter((item) => item.key !== section.key))
                    }}
                  >
                    删除
                  </button>
                  </div>
                </li>
              ))}
            </ol>
          </main>

          <aside className="card flex min-h-[24rem] flex-col overflow-hidden lg:min-h-0">
            <div className="border-b border-line px-4 py-3">
              <h2 className="font-semibold text-ink">机构自有素材库</h2>
              <p className="mt-1 text-sm text-ink-soft">
                <Link to="/org/materials" className="text-brand-strong">
                  去素材库上传
                </Link>
              </p>
            </div>
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2">
              {materials.length === 0 && <li className="px-2 py-3 text-sm text-ink-soft">还没有上传的素材。</li>}
              {materials.map((material) => (
                <li key={material.id}>
                  <button
                    type="button"
                    draggable
                    className="flex w-full items-center gap-3 rounded-field px-3 py-2 text-left text-sm text-ink hover:bg-brand-soft"
                    onClick={() => addMaterial(material)}
                    onDragStart={() => {
                      dragRef.current = { kind: 'material', material }
                    }}
                    onDragEnd={() => {
                      dragRef.current = null
                      setDropIndex(null)
                    }}
                  >
                    <MaterialThumb material={material} />
                    <span className="min-w-0 flex-1 truncate">{material.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </div>
  )
}

function MaterialThumb({ material }: { material: OrgMaterial | undefined }) {
  const [broken, setBroken] = useState(false)
  if (!material?.fileUrl || broken || (material.fileType !== 'image' && material.fileType !== 'pdf')) {
    return <span className="grid h-12 w-12 shrink-0 place-items-center rounded-field bg-canvas px-1 text-center text-[10px] leading-tight text-ink-soft">无法加载</span>
  }
  if (material.fileType === 'pdf') {
    return (
      <iframe
        title={material.name}
        src={`${material.fileUrl}#toolbar=0&navpanes=0&view=FitH`}
        className="pointer-events-none h-12 w-12 shrink-0 rounded-field border border-line bg-white"
      />
    )
  }
  return <img src={material.fileUrl} alt="" className="h-12 w-12 shrink-0 rounded-field object-cover" onError={() => setBroken(true)} />
}
