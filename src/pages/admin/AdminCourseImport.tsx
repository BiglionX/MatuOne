import { useEffect, useRef, useState } from 'react'
import type { ImportReport } from '@/types'
import { importCoursePackage, listPublishedLevels, validateCoursePackage } from '@/api/catalog'
import type { PublishedLevel } from '@/api/catalog'

const SAMPLE = JSON.stringify(
  [
    {
      level_id: 'L13',
      order: 13,
      title: '画一个小房子',
      goal: '用已学的循环和变量拼出一个房子',
      grade_range: '3-5',
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

/** 平台后台：1.0 只做 JSON 课程包导入 + 校验报告，不做可视化编辑器 */
export function AdminCourseImport() {
  const [text, setText] = useState('')
  const [report, setReport] = useState<ImportReport | null>(null)
  const [preview, setPreview] = useState<{ ok: boolean; count: number } | null>(null)
  const [imported, setImported] = useState<PublishedLevel[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    listPublishedLevels().then(setImported).catch(() => setImported([]))
  }, [])
  const fileRef = useRef<HTMLInputElement>(null)

  const check = async () => {
    setError('')
    try {
      const result = await validateCoursePackage(text)
      setReport(result.report)
      setPreview({ ok: result.report.ok, count: result.report.imported })
    } catch (err) {
      setError(err instanceof Error ? err.message : '校验失败')
    }
  }

  const doImport = async () => {
    setError('')
    try {
      const result = await importCoursePackage(text)
      setReport(result)
      const next = await listPublishedLevels()
      setImported(next)
      setPreview({ ok: result.ok, count: next.length })
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    }
  }

  return (
    <div className="px-8 py-8">
      <div className="mx-auto max-w-5xl">
        {error && <p className="mb-4 text-sm text-danger">{error}</p>}
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">课程包导入</h1>
            <p className="mt-1 text-sm text-ink-soft">
              1.0 通过结构化 JSON 配置文件录入关卡，导入时逐字段校验；不提供可视化编辑器。
            </p>
          </div>
          <span className="chip bg-brand-soft text-brand-strong">平台后台</span>
        </header>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">课程 JSON</h2>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost text-sm" onClick={() => setText(SAMPLE)}>
                  填入示例
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setText(await file.text())
                      setReport(null)
                    }
                    e.target.value = ''
                  }}
                />
                <button type="button" className="btn-ghost text-sm" onClick={() => fileRef.current?.click()}>
                  选择 JSON 文件
                </button>
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setReport(null)
              }}
              spellCheck={false}
              placeholder="把课程包 JSON 粘贴到这里，或选择一个 .json 文件"
              className="code-font mt-4 h-[420px] w-full resize-y rounded-card border border-line bg-code-bg p-4 text-sm outline-none focus:border-brand"
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" className="btn-secondary" onClick={check} disabled={!text.trim()}>
                校验
              </button>
              <button
                type="button"
                className="btn-primary px-7"
                onClick={doImport}
                disabled={!text.trim()}
              >
                导入课程包
              </button>
              {preview && (
                <span className={`text-sm ${preview.ok ? 'text-success' : 'text-danger'}`}>
                  {preview.ok ? `可以导入，识别到 ${preview.count} 关` : '还有字段不通过，先按下面的报告改一改'}
                </span>
              )}
            </div>
          </section>

          <section className="card flex flex-col p-5">
            <h2 className="text-lg font-semibold text-ink">校验报告</h2>

            {!report ? (
              <p className="mt-4 text-sm text-ink-soft">还没有校验结果。点「校验」先看看字段有没有问题。</p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-field bg-canvas py-3">
                    <p className="text-xl font-bold text-ink">{report.imported}</p>
                    <p className="text-ink-soft">通过</p>
                  </div>
                  <div className="rounded-field bg-canvas py-3">
                    <p className="text-xl font-bold text-ink">{report.skipped}</p>
                    <p className="text-ink-soft">跳过</p>
                  </div>
                  <div className="rounded-field bg-canvas py-3">
                    <p className="text-xl font-bold text-ink">{report.issues.length}</p>
                    <p className="text-ink-soft">问题</p>
                  </div>
                </div>

                {report.issues.length === 0 ? (
                  <p className="mt-4 rounded-field bg-success-soft px-4 py-3 text-sm text-success">
                    全部字段通过，可以导入。
                  </p>
                ) : (
                  <ul className="mt-4 max-h-[360px] space-y-2 overflow-auto">
                    {report.issues.map((issue, index) => (
                      <li
                        key={index}
                        className={`rounded-field px-3 py-2.5 text-sm ${
                          issue.severity === 'error' ? 'bg-danger-soft' : 'bg-warning-soft'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-ink">{issue.levelId}</span>
                          <span className="code-font text-xs text-ink-soft">{issue.field}</span>
                        </div>
                        <p className={`mt-1 ${issue.severity === 'error' ? 'text-danger' : 'text-warning'}`}>
                          {issue.message}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <div className="mt-auto border-t border-line pt-4">
              <h3 className="text-sm font-semibold text-ink">已导入的课程包</h3>
              {imported.length === 0 ? (
                <p className="mt-2 text-sm text-ink-soft">还没有导入过课程包。</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                  {imported.map((level) => (
                    <li key={level.level_id}>
                      第 {level.sort_order} 关 · {level.title}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-ink-soft">
                报错映射（error_mappings）同样走配置文件维护，1.0 不提供可视化编辑。
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
