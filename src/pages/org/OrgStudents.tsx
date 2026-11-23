import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ImportRowResult } from '@/types'
import { getOrgSession } from '@/api/orgAuth'
import {
  ApiError,
  createOrgGroup,
  importOrgStudents,
  importTemplate,
  listOrgGroups,
  listOrgStudents,
  resetOrgStudentPassword,
  setOrgStudentGroup,
  setOrgStudentStatus,
  unbindOrgStudent,
  type OrgStudentListItem,
} from '@/api/orgPortal'
import {
  dualReadOrgStudents,
  formatOrgPythonProgressLine,
  mapOrgStudentRowToPythonSummary,
} from '@/api/moduleProgress'
import { OrgAccessNotice } from '@/components/OrgAccessNotice'
import { TableSkeleton } from '@/components/Skeleton'
import { OrgStudentProgress } from '@/components/OrgStudentProgress'
import type { Group } from '@/types'
import { formatDate } from '@/lib/format'

/**
 * 学生管理：1.0 只保留「批量导入」建号入口。
 * 按决策 A-3，页面不出现「生成邀请码」按钮（也不做灰显占位）。
 */
export function OrgStudents() {
  const readOnly = getOrgSession()?.readOnly === true
  const [params, setParams] = useSearchParams()
  const [students, setStudents] = useState<OrgStudentListItem[]>([])
  const [detailId, setDetailId] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [groupFilter, setGroupFilter] = useState('all')
  const [groupNameInput, setGroupNameInput] = useState('')
  const [groupBusy, setGroupBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [ready, setReady] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [rows, setRows] = useState<ImportRowResult[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const [confirmReset, setConfirmReset] = useState<OrgStudentListItem | null>(null)
  const [issued, setIssued] = useState<{ name: string; account: string; password: string } | null>(null)
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [confirmUnbind, setConfirmUnbind] = useState<OrgStudentListItem | null>(null)
  const [unbinding, setUnbinding] = useState(false)
  const [confirmStatus, setConfirmStatus] = useState<OrgStudentListItem | null>(null)
  const [savingStatus, setSavingStatus] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([listOrgStudents(), listOrgGroups()])
      .then(([nextStudents, nextGroups]) => {
        setStudents(nextStudents)
        setGroups(nextGroups)
        dualReadOrgStudents(nextStudents)
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError) setNotice(error.message)
      })
      .finally(() => setReady(true))
  }, [])

  useEffect(() => {
    setDetailId(params.get('student') ?? '')
  }, [params])

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
      const nextStudents = await listOrgStudents()
      setStudents(nextStudents)
      dualReadOrgStudents(nextStudents)
    } catch (error: unknown) {
      setRows(null)
      setNotice(error instanceof ApiError ? error.message : '导入失败')
    }
  }

  const createGroup = () => {
    const name = groupNameInput.trim()
    if (!name || groupBusy || readOnly) return
    setGroupBusy(true)
    setNotice('')
    createOrgGroup(name)
      .then((next) => {
        setGroups(next)
        setGroupNameInput('')
      })
      .catch((error: unknown) => setNotice(error instanceof ApiError ? error.message : '创建分组失败'))
      .finally(() => setGroupBusy(false))
  }

  const resetPassword = (student: OrgStudentListItem) => {
    setResetting(true)
    setNotice('')
    resetOrgStudentPassword(student.id)
      .then((result) => {
        setConfirmReset(null)
        setPasswordCopied(false)
        setIssued({ name: student.name, account: student.account, password: result.password })
      })
      .catch((error: unknown) => {
        setConfirmReset(null)
        setNotice(error instanceof ApiError ? error.message : '重置失败')
      })
      .finally(() => setResetting(false))
  }

  const changeStatus = (student: OrgStudentListItem) => {
    const status = student.status === 'active' ? 'disabled' : 'active'
    setSavingStatus(true)
    setNotice('')
    setOrgStudentStatus(student.id, status)
      .then((result) => {
        setStudents((prev) => prev.map((item) => (item.id === student.id ? { ...item, status: result.status } : item)))
        setConfirmStatus(null)
      })
      .catch((error: unknown) => {
        setConfirmStatus(null)
        setNotice(error instanceof ApiError ? error.message : '更新状态失败')
      })
      .finally(() => setSavingStatus(false))
  }

  const unbind = (student: OrgStudentListItem) => {
    setUnbinding(true)
    setNotice('')
    unbindOrgStudent(student.id)
      .then(() => {
        setStudents((prev) => prev.map((item) => (item.id === student.id ? { ...item, boundParentCount: 0 } : item)))
        setConfirmUnbind(null)
      })
      .catch((error: unknown) => {
        setConfirmUnbind(null)
        setNotice(error instanceof ApiError ? error.message : '解除失败')
      })
      .finally(() => setUnbinding(false))
  }

  const copyBindCode = (student: OrgStudentListItem) => {
    void copyText(student.bindCode).then((ok) => {
      if (!ok) return
      setCopiedId(student.id)
      window.setTimeout(() => setCopiedId((current) => (current === student.id ? '' : current)), 1500)
    })
  }

  const knownGroupIds = new Set(groups.map((group) => group.id))
  const ungroupedCount = students.filter((student) => !knownGroupIds.has(student.groupId)).length
  const visible = students.filter((student) => {
    if (groupFilter === 'all') return true
    if (groupFilter === 'none') return !knownGroupIds.has(student.groupId)
    return student.groupId === groupFilter
  })
  const okCount = rows?.filter((row) => row.ok).length ?? 0
  const failCount = rows ? rows.length - okCount : 0
  const emptyLabel = students.length === 0 ? '还没有学生。先建好分组，再用 CSV 批量导入。' : '这个分组还没有学生。'

  return (
    <div className="p-8">
      <OrgAccessNotice message={notice} />
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">学生管理</h1>
          <p className="mt-1 text-sm text-ink-soft">
            共 {students.length} 名学生 · 分组 {groups.length} 个
          </p>
        </div>
        <button type="button" className="btn-primary" disabled={readOnly} onClick={() => setPanelOpen((open) => !open)}>
          批量导入
        </button>
      </header>

      <section className="card mb-6 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">分组</h2>
            <p className="mt-1 text-sm text-ink-soft">点一个分组，下面的名单只显示这一组。</p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              createGroup()
            }}
          >
            <input
              className="field w-40"
              value={groupNameInput}
              placeholder="新分组名"
              disabled={readOnly || groupBusy}
              onChange={(event) => setGroupNameInput(event.target.value)}
            />
            <button type="submit" className="btn-secondary" disabled={readOnly || groupBusy || !groupNameInput.trim()}>
              新建分组
            </button>
          </form>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={filterChip(groupFilter === 'all')} aria-pressed={groupFilter === 'all'} onClick={() => setGroupFilter('all')}>
            全部 {students.length}
          </button>
          {groups.map((group) => {
            const count = students.filter((student) => student.groupId === group.id).length
            const selected = groupFilter === group.id
            return (
              <button key={group.id} type="button" className={filterChip(selected)} aria-pressed={selected} onClick={() => setGroupFilter(group.id)}>
                {group.name} {count}
              </button>
            )
          })}
          {ungroupedCount > 0 && (
            <button
              type="button"
              className={filterChip(groupFilter === 'none')}
              aria-pressed={groupFilter === 'none'}
              onClick={() => setGroupFilter('none')}
            >
              未分组 {ungroupedCount}
            </button>
          )}
        </div>
      </section>

      {panelOpen && (
        <section className="card mb-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">CSV 批量建号</h2>
              <p className="mt-1 text-sm text-ink-soft">
                表头需要「姓名、账号、分组」，分组名要和已有分组一致。导入后会逐行告诉你哪一条没成功、为什么。
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={downloadTemplate}>
              下载模板
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void onFile(file)
                event.target.value = ''
              }}
            />
            <button type="button" className="btn-primary" disabled={readOnly} onClick={() => fileRef.current?.click()}>
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
                <button type="button" className="text-sm text-brand-strong" onClick={() => downloadImportResult(rows, students)}>
                  下载本次导入结果
                </button>
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
                          {row.ok ? <span className="text-success">已建号</span> : <span className="text-danger">{row.reason}</span>}
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
        {!ready ? (
          <TableSkeleton rows={6} cols={6} />
        ) : (
        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas text-left text-ink-soft">
                <th className="px-6 py-3 font-medium">姓名</th>
                <th className="px-6 py-3 font-medium">账号</th>
                <th className="px-6 py-3 font-medium">分组</th>
                <th className="px-6 py-3 font-medium">账号状态</th>
                <th className="px-6 py-3 font-medium">进度</th>
                <th className="px-6 py-3 font-medium">打字</th>
                <th className="px-6 py-3 font-medium">最近学习时间</th>
                <th className="px-6 py-3 font-medium">已绑定家长</th>
                <th className="px-6 py-3 font-medium">家长绑定码</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-ink-soft">
                    {emptyLabel}
                  </td>
                </tr>
              )}
              {visible.map((student) => (
                <tr key={student.id} className="border-b border-line last:border-0 hover:bg-canvas/60">
                  <td className="px-6 py-3.5 font-medium text-ink">
                    <button type="button" className="text-brand-strong hover:underline" title="查看学生档案" onClick={() => setParams({ student: student.id })}>
                      {student.name}
                    </button>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="code-font text-ink">{student.account}</span>
                      <button type="button" className="text-sm text-brand-strong disabled:cursor-not-allowed disabled:opacity-40" disabled={readOnly} onClick={() => setConfirmReset(student)}>
                        重置密码
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <select
                      className="field w-40 text-sm"
                      value={groups.some((group) => group.id === student.groupId) ? student.groupId : ''}
                      disabled={readOnly}
                      aria-label={`${student.name}的分组`}
                      onChange={(event) => {
                        const groupId = event.target.value
                        if (!groupId || groupId === student.groupId) return
                        setNotice('')
                        setOrgStudentGroup(student.id, groupId)
                          .then(() => {
                            setStudents((prev) => prev.map((item) => (item.id === student.id ? { ...item, groupId } : item)))
                          })
                          .catch((error: unknown) => setNotice(error instanceof ApiError ? error.message : '调整分组失败'))
                      }}
                    >
                      {!groups.some((group) => group.id === student.groupId) && <option value="">未分组</option>}
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`chip ${student.status === 'active' ? 'bg-success-soft text-success' : 'bg-canvas text-ink-soft'}`}>
                        {student.status === 'active' ? '正常' : '已停用'}
                      </span>
                      <button
                        type="button"
                        className="text-sm text-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={readOnly}
                        onClick={() => setConfirmStatus(student)}
                      >
                        {student.status === 'active' ? '停用' : '恢复'}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-ink-soft">
                    {formatOrgPythonProgressLine(mapOrgStudentRowToPythonSummary(student))}
                  </td>
                  <td className="px-6 py-3.5 text-ink-soft">
                    {student.typing ? `${student.typing.wpm} WPM · ${student.typing.accuracy}%` : '还没有记录'}
                  </td>
                  <td className="px-6 py-3.5 text-ink-soft">{formatDate(student.lastActiveAt)}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-ink">{student.boundParentCount}</span>
                      {student.boundParentCount > 0 && (
                        <button type="button" className="text-sm text-brand-strong" onClick={() => setConfirmUnbind(student)}>
                          代解除
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    {student.bindCode ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="code-font rounded-field bg-canvas px-2.5 py-1 text-ink-soft">{student.bindCode}</span>
                        <button type="button" className="text-sm text-brand-strong" onClick={() => copyBindCode(student)}>
                          {copiedId === student.id ? '已复制' : '复制'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </section>

      {detailId && (
        <OrgStudentProgress
          studentId={detailId}
          summary={summaryOf(students.find((student) => student.id === detailId), groups)}
          onClose={() => setParams({})}
        />
      )}

      {confirmReset && (
        <ConfirmDialog
          title="重置密码"
          body={`确认为 ${confirmReset.name}（${confirmReset.account}）重置密码？原密码会立即失效。`}
          confirmLabel="确认重置"
          busy={resetting}
          onCancel={() => setConfirmReset(null)}
          onConfirm={() => resetPassword(confirmReset)}
        />
      )}

      {issued && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIssued(null)
          }}
          role="presentation"
        >
          <div className="card w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="issued-password-title">
            <h2 id="issued-password-title" className="text-xl font-bold text-ink">
              新密码
            </h2>
            <p className="mt-2 rounded-field bg-warning-soft px-4 py-3 text-sm text-ink">
              已为 {issued.name}（{issued.account}）生成新密码。此密码只显示一次，关闭后无法再次查看。
            </p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="code-font text-lg font-semibold text-ink">{issued.password}</span>
              <button
                type="button"
                className="btn-secondary px-3 text-sm"
                onClick={() => {
                  void copyText(issued.password).then((ok) => {
                    if (ok) setPasswordCopied(true)
                  })
                }}
              >
                {passwordCopied ? '已复制' : '复制'}
              </button>
            </div>
            <button type="button" className="btn-primary mt-6 w-full" onClick={() => setIssued(null)}>
              我已记下
            </button>
          </div>
        </div>
      )}

      {confirmUnbind && (
        <ConfirmDialog
          title="代解除家长绑定"
          body={`解除后，已绑定 ${confirmUnbind.name} 的家长首页不再显示这名学生。学习记录仍保留。`}
          confirmLabel="确认解除"
          danger
          busy={unbinding}
          onCancel={() => setConfirmUnbind(null)}
          onConfirm={() => unbind(confirmUnbind)}
        />
      )}

      {confirmStatus && (
        <ConfirmDialog
          title={confirmStatus.status === 'active' ? '停用学生' : '恢复学生'}
          body={
            confirmStatus.status === 'active'
              ? `停用后，${confirmStatus.name} 无法登录。学习记录仍保留，可以随时恢复。`
              : `恢复后，${confirmStatus.name} 可以继续用原账号登录。`
          }
          confirmLabel={confirmStatus.status === 'active' ? '确认停用' : '确认恢复'}
          danger={confirmStatus.status === 'active'}
          busy={savingStatus}
          onCancel={() => setConfirmStatus(null)}
          onConfirm={() => changeStatus(confirmStatus)}
        />
      )}
    </div>
  )
}

function filterChip(selected: boolean): string {
  return `inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm font-medium ${selected ? 'bg-brand-soft text-brand-strong' : 'bg-canvas text-ink hover:text-brand-strong'}`
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
      role="presentation"
    >
      <div className="card w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="org-student-confirm-title">
        <h2 id="org-student-confirm-title" className="text-xl font-bold text-ink">
          {title}
        </h2>
        <p className="mt-2 text-sm text-ink">{body}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-ghost" disabled={busy} onClick={onCancel}>
            取消
          </button>
          <button type="button" className={danger ? 'btn-primary bg-danger hover:bg-danger' : 'btn-primary'} disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function summaryOf(student: OrgStudentListItem | undefined, groups: Group[]) {
  if (!student) return undefined
  const progress = mapOrgStudentRowToPythonSummary(student)
  return {
    account: student.account,
    groupName: groups.find((group) => group.id === student.groupId)?.name ?? '未分组',
    status: student.status,
    progressLine: formatOrgPythonProgressLine(progress),
    typing: student.typing,
    lastActiveAt: student.lastActiveAt,
    bindCode: student.bindCode,
    boundParentCount: student.boundParentCount,
  }
}

function downloadImportResult(rows: ImportRowResult[], students: OrgStudentListItem[]) {
  const bindByAccount = new Map(students.map((student) => [student.account, student.bindCode]))
  const lines = ['姓名,账号,初始密码,家长绑定码,结果']
  for (const row of rows) {
    lines.push(
      [
        row.name,
        row.account,
        row.ok ? row.initialPassword ?? '' : '',
        row.ok ? bindByAccount.get(row.account) ?? '' : '',
        row.ok ? '已建号' : row.reason ?? '失败',
      ]
        .map(csvCell)
        .join(','),
    )
  }
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '本次导入结果.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', 'true')
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}
