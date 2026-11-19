import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrgSession } from '@/api/orgAuth'
import { ApiError, getOrgCourse, listOrgGroups, listOrgStudents } from '@/api/orgPortal'
import { OrgAccessNotice } from '@/components/OrgAccessNotice'
import { OrgCustomCourseList } from '@/components/OrgCustomCourseList'
import type { Group } from '@/types'

export function OrgCourses() {
  const session = getOrgSession()
  const readOnly = session?.readOnly === true
  const [groups, setGroups] = useState<Group[]>([])
  const [students, setStudents] = useState<{ id: string; name: string; groupId: string }[]>([])
  const [maxLevel, setMaxLevel] = useState(0)
  const [courseReady, setCourseReady] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    listOrgGroups().then(setGroups).catch(() => setGroups([]))
    getOrgCourse()
      .then((next) => {
        setMaxLevel(next.maxLevel)
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

  const accessText = session?.status === 'trial' ? 'Level 1（完整免费）' : stageText(maxLevel)

  return (
    <div className="px-8 py-8">
      <OrgAccessNotice message={notice} />
      <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">课程管理</h1>
          <p className="mt-1 text-sm text-ink-soft">管理自定义课程：新建、编辑、删除，再分给分组或学生。</p>
        </div>
        <Link to="/org/materials" className="btn-secondary">
          素材库
        </Link>
      </header>

      <dl className="mb-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <div>
          <dt className="text-ink-soft">可进入</dt>
          <dd className="mt-1 font-medium text-ink">{courseReady ? accessText : '…'}</dd>
        </div>
        {session?.status === 'trial' && (
          <div>
            <dt className="text-ink-soft">合同阶段</dt>
            <dd className="mt-1 font-medium text-ink">{courseReady ? stageText(maxLevel) : '…'}</dd>
          </div>
        )}
      </dl>

      <OrgCustomCourseList groups={groups} students={students} readOnly={readOnly} />
    </div>
  )
}

function stageText(maxLevel: number): string {
  if (maxLevel < 1) return '尚未开通'
  return `Level 1 至 Level ${maxLevel}`
}
