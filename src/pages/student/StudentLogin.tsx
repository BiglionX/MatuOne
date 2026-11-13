import { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { getCurrentStudent, loginStudentAccount } from '@/api/studentAuth'
import { BrandMark } from '@/components/BrandMark'
import { DemoLoginButton } from '@/dev/DemoLoginButton'

export function StudentLogin() {
  const navigate = useNavigate()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await loginStudentAccount(account, password)
    if (!result.ok) {
      setError(result.message)
      return
    }
    navigate('/student')
  }

  if (getCurrentStudent()) return <Navigate to="/student" replace />

  return (
    <div className="student-shell flex min-h-screen items-center justify-center bg-canvas px-6">
      <form onSubmit={submit} className="card w-full max-w-md p-9">
        <Link to="/enter" className="text-sm text-ink-soft">
          ← 返回入口
        </Link>
        <div className="mt-6 flex items-center gap-3">
          <BrandMark size={48} />
          <h1 className="text-3xl font-bold text-ink">登录代码闯关</h1>
        </div>
        <p className="mt-3 text-ink-soft">用老师给你的账号登录，今天的关卡已经准备好了。</p>

        <label className="mt-7 block text-sm font-medium text-ink-soft">账号</label>
        <input
          className="field mt-2"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="例如 chenxiaoman"
          autoComplete="off"
        />

        <label className="mt-5 block text-sm font-medium text-ink-soft">密码</label>
        <input
          className="field mt-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="mt-4 rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

        <button type="submit" className="btn-primary mt-7 w-full text-lg">
          进入课程地图
        </button>
        <DemoLoginButton role="student" onDone={(path) => navigate(path)} onError={setError} />
      </form>
    </div>
  )
}
