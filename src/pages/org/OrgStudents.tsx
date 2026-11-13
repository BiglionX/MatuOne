import { useEffect, useRef, useState } from 'react'
import type { ImportRowResult } from '@/types'
import {
  ApiError,
  createOrgGroup,
  importOrgStudents,
  importTemplate,
  listOrgGroups,
  listOrgStudents,
  unbindOrgStudent,
  type OrgStudentListItem,
} from '@/api/orgPortal'
import { OrgAccessNotice } from '@/components/OrgAccessNotice'
import type { Group } from '@/types'
import { formatDate } from '@/lib/format'

/**
 * 学生管理：1.0 只保留「批量导入」建号入口。
 * 按决策 A-3，页面不出现「生成邀请码」按钮（也不做灰显占位）。
 */
export function OrgStudents() {
  const [students, setStudents] = useState<OrgStudentListItem[]>([])
  const [pendingUnbind, setPendingUnbind] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [groupNameInput, setGroupNameInput] = useState('')
  const [notice, setNotice] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [rows, setRows] = useState<ImportRowResult[] | null>(null)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([listOrgStudents(), listOrgGroups()])
      .then(([nextStudents, nextGroups]) => {
        setStudents(nextStudents)
        setGroups(nextGroups)
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError) setNotice(error.message)
      })
  }, [])

  const downloadTemplate = () => {
    const blob = new Blob([importTemplate(groups)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '学生导入模板.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const onFile = async (file: File) => {
    setFileName(file.name)
    setNotice('')
    try {
      const text = await file.text()
      const result = await importOrgStudents(text)
      setRows(result.rows)
      setStudents(await listOrgStudents())
    } catch (error: unknown) {
      setRows(null)
      setNotice(error instanceof ApiError ? error.message : '导入失败')
    }
  }

  const okCount = rows?.filter((r) => r.ok).length ?? 0
  const failCount = rows ? rows.length - okCount : 0

  return (
    <div className="px-8 py-8">
      <OrgAccessNotice message={notice} />
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">学生管理</h1>
          <p className="mt-1 text-sm text-ink-soft">
            共 {students.length} 名学生 · 分组 {groups.length} 个
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setPanelOpen((v) => !v)}>
          批量导入
        </button>
      </header>

      {panelOpen && (
        <section className="card mb-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Excel / CSV 批量建号</h2>
              <p className="mt-1 text-sm text-ink-soft">
                表头需要「姓名、账号、分组」，分组名要和已有分组一致。导入后会逐行告诉你哪一条没成功、为什么。
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={downloadTemplate}>
              下载模板
            </button>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                createOrgGroup(groupNameInput)
                  .then((next) => {
                    setGroups(next)
                    setGroupNameInput('')
                  })
                  .catch((error: unknown) => setNotice(error instanceof ApiError ? error.message : '创建分组失败'))
              }}
            >
              <input className="field w-40" value={groupNameInput} placeholder="新分组名" onChange={(e) => setGroupNameInput(e.target.value)} />
              <button type="submit" className="btn-secondary">
                新建分组
              </button>
            </form>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onFile(file)
                e.target.value = ''
              }}
            />
            <button type="button" className="btn-primary" onClick={() => fileRef.current?.click()}>
              选择文件
            </button>
            <span className="text-sm text-ink-soft">{fileName || '还没有选择文件'}</span>
          </div>

          {rows && (
            <div className="mt-5">
              <div className="mb-3 flex flex-wrap gap-4 text-sm">
                <span className="text-success">成功 {okCount} 条</span>
                <span className="text-danger">失败 {failCount} 条</span>
                <span className="text-ink-soft">初始密码只显示一次，请及时保存。</span>
              </div>
              <div className="overflow-hidden rounded-field border border-line">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-canvas text-left text-ink-soft">
                      <th className="px-4 py-2 font-medium">行</th>
                      <th className="px-4 py-2 font-medium">姓名</th>
                      <th className="px-4 py-2 font-medium">账号</th>
                      <th className="px-4 py-2 font-medium">初始密码</th>
                      <th className="px-4 py-2 font-medium">结果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.row} className="border-t border-line">
                        <td className="px-4 py-2 text-ink-soft">{row.row}</td>
                        <td className="px-4 py-2 text-ink">{row.name || '—'}</td>
                        <td className="px-4 py-2 text-ink-soft">{row.account || '—'}</td>
                        <td className="px-4 py-2">
                          {row.ok && row.initialPassword ? (
                            <span className="code-font text-ink">{row.initialPassword}</span>
                          ) : (
                            <span className="text-ink-soft">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {row.ok ? (
                            <span className="text-success">已建号</span>
                          ) : (
                            <span className="text-danger">{row.reason}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas text-left text-ink-soft">
                <th className="px-6 py-3 font-medium">姓名</th>
                <th className="px-6 py-3 font-medium">分组</th>
                <th className="px-6 py-3 font-medium">账号状态</th>
                <th className="px-6 py-3 font-medium">当前关卡</th>
                <th className="px-6 py-3 font-medium">最近学习时间</th>
                <th className="px-6 py-3 font-medium">已绑定家长</th>
                <th className="px-6 py-3 font-medium">家长绑定码</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-line last:border-0 hover:bg-canvas/60">
                  <td className="px-6 py-3.5 font-medium text-ink">{student.name}</td>
                  <td className="px-6 py-3.5 text-ink-soft">{groups.find((group) => group.id === student.groupId)?.name ?? '未分组'}</td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`chip ${
                        student.status === 'active' ? 'bg-success-soft text-success' : 'bg-canvas text-ink-soft'
                      }`}
                    >
                      {student.status === 'active' ? '正常' : '已停用'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-ink-soft">第 {student.currentLevelOrder} 关</td>
                  <td className="px-6 py-3.5 text-ink-soft">{formatDate(student.lastActiveAt)}</td>
                  <td className="px-6 py-3.5 text-ink">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{student.boundParentCount}</span>
                      {student.boundParentCount > 0 && pendingUnbind !== student.id && (
                        <button type="button" className="text-sm text-brand-strong" onClick={() => setPendingUnbind(student.id)}>
                          代解除
                        </button>
                      )}
                      {pendingUnbind === student.id && (
                        <>
                          <span className="text-sm text-ink-soft">解除后家长将看不到这名学生。</span>
                          <button
                            type="button"
                            className="text-sm text-danger"
                            onClick={() => {
                              unbindOrgStudent(student.id)
                                .then(() => listOrgStudents())
                                .then((next) => {
                                  setStudents(next)
                                  setPendingUnbind('')
                                })
                                .catch((error: unknown) => setNotice(error instanceof ApiError ? error.message : '解除失败'))
                            }}
                          >
                            确认解除
                          </button>
                          <button type="button" className="text-sm text-ink-soft" onClick={() => setPendingUnbind('')}>
                            取消
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="code-font rounded-field bg-canvas px-2.5 py-1 text-ink-soft">
                      {student.bindCode}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-5 text-xs text-ink-soft">
        新导入的绑定码是 10 位字母数字。已绑定家长数只统计尚未解除的关系，代解除后家长首页不再显示这名学生。
      </p>
    </div>
  )
}
