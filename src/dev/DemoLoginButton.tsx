import { lazy, Suspense } from 'react'
import type { DemoRole } from './demoAccounts'

const DevQuickLogin = lazy(() => import('./DevQuickLogin').then((mod) => ({ default: mod.DevQuickLogin })))

/** 试用阶段登录页展示演示账号。正式对外前再撤掉。 */
export function DemoLoginButton({
  role,
  onDone,
  onError,
}: {
  role: DemoRole
  onDone: (path: string) => void
  onError: (message: string) => void
}) {
  return (
    <Suspense fallback={null}>
      <DevQuickLogin role={role} onDone={onDone} onError={onError} />
    </Suspense>
  )
}
