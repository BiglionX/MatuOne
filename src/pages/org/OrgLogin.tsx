import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError, getOrgSession, loginOrgAdmin } from '@/api/orgAuth'

export function OrgLogin() {
  const navigate = useNavigate()
  const existing = getOrgSession()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (existing) return <Navigate to="/org/dashboard" replace />

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      await loginOrgAdmin(account, password)
      navigate('/org/dashboard')
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : '登录失败')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <form onSubmit={submit} className="card w-full max-w-md p-8">
        <Link to="/enter" className="text-sm text-ink-soft">
          ← 返回入口
        </Link>
        <h1 className="mt-5 text-2xl font-bold text-ink">机构端登录</h1>
        <p className="mt-2 text-sm text-ink-soft">使用平台开户时发放的管理员账号。初始密码只在开户成功时显示一次。</p>

        <label className="mt-6 block text-sm font-medium text-ink-soft">
          账号
          <input className="field mt-2" value={account} autoComplete="username" onChange={(e) => setAccount(e.target.value)} />
        </label>

        <label className="mt-4 block text-sm font-medium text-ink-soft">
          密码
          <input
            className="field mt-2"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="mt-4 rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

        <button type="submit" className="btn-primary mt-6 w-full" disabled={pending}>
          {pending ? '正在登录…' : '进入机构端'}
        </button>
      </form>
    </div>
  )
}
