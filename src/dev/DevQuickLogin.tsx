import { useState } from 'react'
import { DEMO_ACCOUNTS, type DemoRole } from './demoAccounts'
import { loginDemo } from './loginDemo'

const TITLE: Record<DemoRole, string> = {
  student: '学生',
  org: '机构',
  parent: '家长',
  platform: '平台',
  agent: '区域服务商',
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
  const demo = DEMO_ACCOUNTS[role]

  return (
    <div className="mt-4 rounded-field bg-canvas px-4 py-3 text-sm text-ink-soft">
      <p>
        {TITLE[role]}演示账号 <span className="break-all font-medium text-ink">{demo.account}</span>
      </p>
      <p className="mt-1">
        密码 <span className="font-medium text-ink">{demo.password}</span>
      </p>
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
        {pending ? '正在登录…' : '一键登录'}
      </button>
    </div>
  )
}
