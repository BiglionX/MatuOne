import { Link } from 'react-router-dom'

const ROLES = [
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
    to: '/parent',
    note: '手机 H5',
  },
  {
    key: 'admin',
    title: '平台后台',
    desc: '机构开户与课程包 JSON 导入',
    to: '/admin/orgs',
    note: '内部使用',
  },
]

export function EntryPage() {
  return (
    <div className="min-h-screen bg-canvas px-8 py-14">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-card bg-brand text-2xl font-bold text-white">
            关
          </div>
          <div>
            <h1 className="text-3xl font-bold text-ink">代码闯关</h1>
            <p className="mt-1 text-ink-soft">Python 编程课外课</p>
          </div>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {ROLES.map((role) => (
            <Link
              key={role.key}
              to={role.to}
              className="card group p-7 transition hover:-translate-y-0.5 hover:border-brand"
            >
              <div className="flex items-start justify-between">
                <h2 className="text-2xl font-semibold text-ink">{role.title}</h2>
                <span className="text-brand transition group-hover:translate-x-1">→</span>
              </div>
              <p className="mt-3 text-ink-soft">{role.desc}</p>
              <p className="mt-6 text-sm text-ink-soft/80">{role.note}</p>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-sm text-ink-soft">
          先在平台后台开户，再用当次显示的管理员账号登录机构端。学生、进度和打字记录都在服务端。
        </p>
      </div>
    </div>
  )
}
