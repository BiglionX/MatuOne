import { useEffect, useState } from 'react'
import { ApiError, getOrgCourse, listOrgStudents, saveOrgCourse, saveOrgStudentPrice } from '@/api/orgPortal'
import { OrgAccessNotice } from '@/components/OrgAccessNotice'
import { listOrgGroups } from '@/api/orgPortal'
import type { Group } from '@/types'
import { formatDay } from '@/lib/format'

function authorizedStageText(maxLevel: number): string {
  if (maxLevel < 1) return '已授权课程阶段：尚未开通'
  return `已授权课程阶段：Level 1 至 Level ${maxLevel}`
}

export function OrgCourses() {
  const [groups, setGroups] = useState<Group[]>([])
  const [levelCount, setLevelCount] = useState(0)
  const [students, setStudents] = useState<{ id: string; groupId: string }[]>([])
  const [activation, setActivation] = useState({ groupId: 'all', seats: 0, expiresAt: '', activatedAt: '', maxLevel: 0 })
  const [courseReady, setCourseReady] = useState(false)
  const [notice, setNotice] = useState('')

  const [seats, setSeats] = useState(0)
  const [expiresAt, setExpiresAt] = useState('')
  const [groupId, setGroupId] = useState('all')
  const [saved, setSaved] = useState(false)
  const [studentPrice, setStudentPrice] = useState('')
  const [baseSeatPrice, setBaseSeatPrice] = useState(0)
  const [priceSaved, setPriceSaved] = useState(false)
  const [priceError, setPriceError] = useState('')

  useEffect(() => {
    listOrgGroups().then(setGroups).catch(() => setGroups([]))
    getOrgCourse()
      .then((next) => {
        setActivation(next)
        setSeats(next.seats)
        setExpiresAt(next.expiresAt.slice(0, 10))
        setGroupId(next.groupId)
        setLevelCount(next.levelCount)
        setStudentPrice(String(next.studentMonthlyPrice))
        setBaseSeatPrice(next.baseSeatPrice)
        setCourseReady(true)
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError) setNotice(error.message)
      })
    listOrgStudents()
      .then(setStudents)
      .catch((error: unknown) => {
        if (error instanceof ApiError) setNotice(error.message)
      })
  }, [])

  const scopedStudents = groupId === 'all' ? students : students.filter((s) => s.groupId === groupId)
  const typedPrice = Number(studentPrice)
  const priceReady = Number.isInteger(typedPrice) && typedPrice >= 150 && typedPrice <= 500 && baseSeatPrice > 0
  const monthlyProfit = priceReady ? (typedPrice - baseSeatPrice) * activation.seats : null

  const savePrice = async () => {
    setPriceError('')
    setPriceSaved(false)
    if (!priceReady) {
      setPriceError('家长定价需要在 150 到 500 元之间')
      return
    }
    try {
      const next = await saveOrgStudentPrice(typedPrice)
      setActivation(next)
      setStudentPrice(String(next.studentMonthlyPrice))
      setBaseSeatPrice(next.baseSeatPrice)
      setPriceSaved(true)
    } catch (error: unknown) {
      setPriceError(error instanceof ApiError ? error.message : '保存失败')
    }
  }

  const save = async () => {
    setNotice('')
    setSaved(false)
    try {
      const next = await saveOrgCourse({ seats: Number(seats), expiresAt, groupId })
      setActivation(next)
      setBaseSeatPrice(next.baseSeatPrice)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2400)
    } catch (error: unknown) {
      setNotice(error instanceof ApiError ? error.message : '保存失败')
    }
  }

  return (
    <div className="px-8 py-8">
      <OrgAccessNotice message={notice} />
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">课程开通</h1>
        <p className="mt-1 text-sm text-ink-soft">给分组开通课程，设置名额与有效期。</p>
      </header>

      <section className="card max-w-3xl p-7">
        <div className="flex items-start justify-between gap-6">
          <div>
            <span className="chip bg-brand-soft text-brand-strong">Python 编程课外课</span>
            <h2 className="mt-3 text-2xl font-bold text-ink">代码闯关 · 1.0</h2>
            <p className="mt-2 text-ink-soft">
              {levelCount} 关 · 每节约 20 分钟 · 从 Level 1 开始 · 纯浏览器运行，无需硬件
            </p>
            {courseReady && (
              <div className="mt-4 rounded-card bg-brand-soft px-4 py-3">
                <p className="text-base font-semibold text-ink">{authorizedStageText(activation.maxLevel)}</p>
                {activation.maxLevel < 8 && <p className="mt-1 text-sm text-ink">更高阶段尚未开通。请联系平台升级课程包。</p>}
              </div>
            )}
          </div>
          <div className="rounded-card bg-canvas px-5 py-4 text-center">
            <p className="text-sm text-ink-soft">已开通</p>
            <p className="mt-1 text-2xl font-bold text-ink">{activation.seats} 人</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5 text-sm">
          <div>
            <dt className="text-ink-soft">开通范围</dt>
            <dd className="mt-1 font-medium text-ink">
              {activation.groupId === 'all'
                ? '全机构'
                : groups.find((g) => g.id === activation.groupId)?.name ?? '全机构'}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">有效期至</dt>
            <dd className="mt-1 font-medium text-ink">{activation.expiresAt}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">最近开通</dt>
            <dd className="mt-1 font-medium text-ink">{formatDay(activation.activatedAt)}</dd>
          </div>
        </dl>

        <div className="mt-7 border-t border-line pt-6">
          <h3 className="text-lg font-semibold text-ink">调整开通</h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm text-ink-soft">开通分组</span>
              <select className="field mt-2" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="all">全机构（{students.length} 人）</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}（{students.filter((s) => s.groupId === g.id).length} 人）
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm text-ink-soft">名额</span>
              <input
                type="number"
                min={1}
                className="field mt-2"
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
              />
            </label>

            <label className="block">
              <span className="text-sm text-ink-soft">有效期至</span>
              <input
                type="date"
                className="field mt-2"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </label>
          </div>

          <p className="mt-3 text-sm text-ink-soft">
            当前选择的分组下共有 {scopedStudents.length} 名学生。
          </p>

          <div className="mt-5 flex items-center gap-4">
            <button type="button" className="btn-primary px-8" onClick={save}>
              保存开通设置
            </button>
            {saved && <span className="text-sm text-success">已更新，学生端重新进入即可看到课程</span>}
          </div>
        </div>
      </section>

      {courseReady && (
        <section className="card mt-6 max-w-3xl p-7">
          <h2 className="text-lg font-semibold text-ink">家长定价与收益测算</h2>
          <p className="mt-2 text-sm text-ink-soft">
            平台按底价 {baseSeatPrice} 元/席/月收取服务费，差价归机构所有。
          </p>
          <label className="mt-5 block max-w-xs text-sm text-ink-soft">
            向家长收取（元/月）
            <input
              className="field mt-2"
              inputMode="numeric"
              value={studentPrice}
              onChange={(event) => {
                setStudentPrice(event.target.value)
                setPriceSaved(false)
                setPriceError('')
              }}
            />
            <span className="mt-1 block text-xs">可设置范围 150–500 元。</span>
          </label>
          <div className="mt-5 rounded-card bg-canvas px-5 py-4">
            <p className="text-sm text-ink-soft">每月预估毛利</p>
            <p className="mt-1 text-2xl font-bold text-ink">
              {monthlyProfit === null ? '—' : `${monthlyProfit.toLocaleString('zh-CN')} 元`}
            </p>
            <p className="mt-2 text-sm text-ink">
              （{studentPrice || '—'} − {baseSeatPrice}）× {activation.seats} 个已开通席位
            </p>
          </div>
          {priceError && <p className="mt-4 rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{priceError}</p>}
          <div className="mt-5 flex items-center gap-4">
            <button type="button" className="btn-primary px-8" onClick={savePrice}>
              保存家长定价
            </button>
            {priceSaved && <span className="text-sm text-success">已保存</span>}
          </div>
        </section>
      )}

      <p className="mt-6 max-w-3xl text-xs text-ink-soft">
        1.0 不支持机构自定义课程内容，课程内容由平台侧统一配置（JSON 课程包导入）。
      </p>
    </div>
  )
}
