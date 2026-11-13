import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getParentSession, loginParent, registerParent } from '@/api/parent'
import { BrandMark } from '@/components/BrandMark'
import { DemoLoginButton } from '@/dev/DemoLoginButton'
import { ApiError } from '@/lib/apiError'

const ACCOUNT = /^[a-z0-9][a-z0-9._]{2,31}$/i

export function ParentLogin() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (getParentSession()) return <Navigate to="/parent" replace />

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = account.trim()
    if (!ACCOUNT.test(name)) {
      setError('用户名需要 3–32 位，以字母或数字开头，只能包含字母、数字、点和下划线')
      return
    }
    if (password.length < 8 || password.length > 72) {
      setError('密码需要 8–72 位')
      return
    }
    if (mode === 'register' && password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    setPending(true)
    setError('')
    try {
      if (mode === 'register') await registerParent(name, password)
      else await loginParent(name, password)
      navigate('/parent')
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : mode === 'register' ? '注册失败' : '登录失败')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <form onSubmit={(event) => void submit(event)} className="card h5-shell p-6">
        <Link to="/enter" className="text-sm text-ink-soft">
          ← 返回入口
        </Link>
        <div className="mt-6 flex items-center gap-3">
          <BrandMark size={44} />
          <h1 className="text-2xl font-bold text-ink">{mode === 'register' ? '注册家长账号' : '家长端登录'}</h1>
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          {mode === 'register'
            ? '先注册用户名和密码。登录后，再用老师给的绑定码绑定孩子。'
            : '使用自己的用户名和密码。绑定码用来绑定孩子，不能代替登录。'}
        </p>

        <label className="mt-6 block text-sm font-medium text-ink-soft">
          用户名
          <input
            className="field mt-2"
            value={account}
            autoComplete="username"
            onChange={(e) => setAccount(e.target.value)}
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-ink-soft">
          密码
          <input
            className="field mt-2"
            type="password"
            value={password}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {mode === 'register' && (
          <label className="mt-4 block text-sm font-medium text-ink-soft">
            再输入一次密码
            <input
              className="field mt-2"
              type="password"
              value={confirm}
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
        )}

        {error && <p className="mt-4 rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

        <button type="submit" className="btn-primary mt-6 w-full" disabled={pending}>
          {pending ? '请稍候…' : mode === 'register' ? '注册并进入' : '进入家长端'}
        </button>
        {mode === 'login' && <DemoLoginButton role="parent" onDone={(path) => navigate(path)} onError={setError} />}

        <button
          type="button"
          className="mt-4 w-full text-sm text-brand-strong"
          onClick={() => {
            setMode((current) => (current === 'login' ? 'register' : 'login'))
            setError('')
            setConfirm('')
          }}
        >
          {mode === 'login' ? '没有账号？注册一个' : '已有账号？去登录'}
        </button>
      </form>
    </div>
  )
}
