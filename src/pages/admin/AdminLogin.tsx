import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getPlatformProfile, loginPlatform } from '@/api/adminOrgs'
import { ApiError } from '@/lib/apiError'
import { BrandMark } from '@/components/BrandMark'
import { DemoLoginButton } from '@/dev/DemoLoginButton'

export function AdminLogin() {
  const navigate = useNavigate()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (getPlatformProfile()) return <Navigate to="/admin/orgs" replace />

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      await loginPlatform(account, password)
      navigate('/admin/orgs')
    } catch (err) {
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
          <h1 className="text-2xl font-bold text-ink">平台后台登录</h1>
        </div>
        <label className="mt-6 block text-sm text-ink-soft">
          账号
          <input className="field mt-2" value={account} autoComplete="username" onChange={(e) => setAccount(e.target.value)} />
        </label>
        <label className="mt-4 block text-sm text-ink-soft">
          密码
          <input className="field mt-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="mt-4 rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
        <button type="submit" className="btn-primary mt-6 w-full" disabled={pending}>
          {pending ? '正在登录…' : '进入后台'}
        </button>
        <DemoLoginButton role="platform" onDone={(path) => navigate(path)} onError={setError} />
      </form>
    </div>
  )
}
