import { lazy, Suspense } from 'react'
import type { DemoRole } from './demoAccounts'

const DevQuickLogin = import.meta.env.DEV
  ? lazy(() => import('./DevQuickLogin').then((mod) => ({ default: mod.DevQuickLogin })))
  : null

/** 生产构建里是空节点，演示账号不会打进正式包。 */
export function DemoLoginButton({
  role,
  onDone,
  onError,
}: {
  role: DemoRole
  onDone: (path: string) => void
  onError: (message: string) => void
}) {
  if (!DevQuickLogin) return null
  return (
    <Suspense fallback={null}>
      <DevQuickLogin role={role} onDone={onDone} onError={onError} />
    </Suspense>
  )
}
