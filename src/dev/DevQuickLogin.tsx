import { useState } from 'react'
import type { DemoRole } from './demoAccounts'
import { loginDemo } from './loginDemo'

const LABEL: Record<DemoRole, string> = {
  student: '学生 chenxiaoman',
  org: '机构 adminorg0001',
  parent: '家长 parent.demo',
  platform: '平台 ops',
}

export function DevQuickLogin({
  role,
  onDone,
  onError,
}: {
  role: DemoRole
  onDone: (path: string) => void
  onError: (message: string) => void
}) {
  const [pending, setPending] = useState(false)

  return (
    <button
      type="button"
      className="btn-secondary mt-3 w-full text-sm"
      disabled={pending}
      onClick={() => {
        setPending(true)
        onError('')
        void loginDemo(role)
          .then(onDone)
          .catch((error: unknown) => onError(error instanceof Error ? error.message : '登录失败'))
          .finally(() => setPending(false))
      }}
    >
      {pending ? '正在登录…' : `一键登录 · ${LABEL[role]}`}
    </button>
  )
}
