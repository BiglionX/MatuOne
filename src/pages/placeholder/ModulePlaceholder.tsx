import { Link, Navigate } from 'react-router-dom'
import { getCurrentStudent } from '@/api/studentAuth'
import { usePageMeta } from '@/lib/usePageMeta'

export interface ModulePlaceholderProps {
  /** 模块名，显示在标题与文案里 */
  moduleName: string
  /**
   * 是否需要登录才能进入。默认按学生端口径校验：
   * 与学生端其他页面一致，没登录就跳登录页，不绕过模块的 requires_auth。
   */
  requiresAuth?: boolean
}

/**
 * 新模块占位页：只显示模块名与「课程准备中」。
 * 不接任何 API、不查进度、不渲染关卡，等真实课程上线再换掉。
 */
export function ModulePlaceholder({ moduleName, requiresAuth = true }: ModulePlaceholderProps) {
  usePageMeta(moduleName, `${moduleName}课程正在准备中，开通后即可进入学习。`)

  if (requiresAuth && !getCurrentStudent()) return <Navigate to="/student/login" replace />

  return (
    <div className="student-shell flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="card w-full max-w-md p-9">
        <Link to="/enter" className="text-sm text-ink-soft">
          ← 返回入口
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-ink">{moduleName}</h1>
        <p className="mt-3 text-ink-soft">课程准备中，敬请期待。</p>
      </div>
    </div>
  )
}