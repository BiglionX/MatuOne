import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandMark } from '@/components/BrandMark'
import { DemoLoginButton } from '@/dev/DemoLoginButton'
import type { DemoRole } from '@/dev/demoAccounts'

const ROLES: Array<{
  key: DemoRole
  title: string
  desc: string
  to: string
  note: string
}> = [
  {
    key: 'student',
    title: '学生端',
    desc: '打开就能学，抄代码、跑出图形',
    to: '/student/login',
    note: '电脑浏览器 · 全屏单任务',
  },
  {
    key: 'org',
    title: '机构端',
    desc: '建号分组、开通课程、看进度',
    to: '/org/login',
    note: '使用开户发放的管理员账号',
  },
  {
    key: 'parent',
    title: '家长端',
    desc: '绑定孩子，看本周学习与打字成长',
    to: '/parent/login',
    note: '手机 H5 · 用户名和密码登录',
  },
  {
    key: 'platform',
    title: '平台后台',
    desc: '机构开户与课程包 JSON 导入',
    to: '/admin/login',
    note: '内部使用',
  },
]

export function EntryPage() {
  return (
    <div className="min-h-screen bg-canvas px-8 py-14">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-4">
          <BrandMark size={56} />
          <div>
            <h1 className="text-3xl font-bold text-ink">代码闯关</h1>
            <p className="mt-1 text-ink-soft">Python 编程课外课</p>
          </div>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {ROLES.map((role) => (
            <RoleCard key={role.key} role={role} />
          ))}
        </div>

        <p className="mt-10 text-sm text-ink-soft">
          先在平台后台开户，再用当次显示的管理员账号登录机构端。学生、进度和打字记录都在服务端。
        </p>
      </div>
    </div>
  )
}

function RoleCard({ role }: { role: (typeof ROLES)[number] }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  return (
    <article className="card p-7">
      <Link to={role.to} className="group block">
        <div className="flex items-start justify-between">
          <h2 className="text-2xl font-semibold text-ink">{role.title}</h2>
          <span className="text-brand transition group-hover:translate-x-1">→</span>
        </div>
        <p className="mt-3 text-ink-soft">{role.desc}</p>
        <p className="mt-6 text-sm text-ink-soft/80">{role.note}</p>
      </Link>
      <DemoLoginButton role={role.key} onDone={(path) => navigate(path)} onError={setError} />
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </article>
  )
}
