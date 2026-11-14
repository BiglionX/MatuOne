import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError, getAgentSession, loginAgent } from '@/api/agentAuth'
import { BrandMark } from '@/components/BrandMark'
import { DemoLoginButton } from '@/dev/DemoLoginButton'

export function AgentLogin() {
  const navigate = useNavigate()
  const existing = getAgentSession()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (existing) return <Navigate to="/agent" replace />

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      await loginAgent(account, password)
      navigate('/agent')
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
        <div className="mt-6 flex items-center gap-3">
          <BrandMark size={44} />
          <h1 className="text-2xl font-bold text-ink">区域服务商登录</h1>
        </div>
        <p className="mt-2 text-sm text-ink-soft">使用平台发放的服务商账号。初始密码只在发放成功时显示一次。</p>

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
          {pending ? '正在登录…' : '进入服务商端'}
        </button>
        <DemoLoginButton role="agent" onDone={(path) => navigate(path)} onError={setError} />
      </form>
    </div>
  )
}
