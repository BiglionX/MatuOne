import { useEffect, useState, type CSSProperties } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { listOrgEnabledModules, resolveLauncherOrg } from '@/api/orgModules'

/** 与 usePageMeta 同一套写法：og/twitter 标签共用一份文档，增量覆盖就行 */
function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * 只作用在 MatuPix 根节点。:root 上的实色不会跟着子节点的三元组变，
 * 所以三元组和实色要在这里一起写。
 */
const theme = {
  '--brand-rgb': '124 58 168',
  '--brand-strong-rgb': '78 32 112',
  '--brand-soft-rgb': '244 232 250',
  '--brand-action-rgb': '72 28 110',
  '--brand-action-strong-rgb': '54 18 86',
  '--success-rgb': '15 122 82',
  '--success-soft-rgb': '230 247 239',
  '--danger-rgb': '190 64 64',
  '--danger-soft-rgb': '253 236 237',
  '--warning-rgb': '138 90 0',
  '--warning-soft-rgb': '253 244 227',
  '--bg-rgb': '255 247 236',
  '--ink-rgb': '42 32 56',
  '--ink-soft-rgb': '108 96 124',
  '--line-rgb': '236 220 228',
  '--code-bg-rgb': '255 252 248',
  '--brand': 'rgb(124 58 168)',
  '--brand-strong': 'rgb(78 32 112)',
  '--brand-action': 'rgb(72 28 110)',
  '--brand-action-strong': 'rgb(54 18 86)',
  '--brand-soft': 'rgb(244 232 250)',
  '--success': 'rgb(15 122 82)',
  '--success-soft': 'rgb(230 247 239)',
  '--danger': 'rgb(190 64 64)',
  '--danger-soft': 'rgb(253 236 237)',
  '--warning': 'rgb(138 90 0)',
  '--warning-soft': 'rgb(253 244 227)',
  '--bg': 'rgb(255 247 236)',
  '--ink': 'rgb(42 32 56)',
  '--ink-soft': 'rgb(108 96 124)',
  '--line': 'rgb(236 220 228)',
  '--code-bg': 'rgb(255 252 248)',
} as CSSProperties

type GateState =
  | { status: 'checking' }
  | { status: 'allowed' }
  | { status: 'blocked'; reason: 'not_entitled' | 'check_failed' }

/**
 * MatuPix 入口门禁（阶段 2）：
 * - 游客（无学生/机构 session）：本机可用，直接放行
 * - 有业务 session：须机构已开通 matupix（org-modules）；未开通或校验失败均不静默放行
 */
function useMatuPixGate(): GateState {
  const [gate, setGate] = useState<GateState>(() =>
    resolveLauncherOrg() ? { status: 'checking' } : { status: 'allowed' },
  )

  useEffect(() => {
    const role = resolveLauncherOrg()
    if (!role) {
      setGate({ status: 'allowed' })
      return
    }

    let cancelled = false
    setGate({ status: 'checking' })
    void listOrgEnabledModules()
      .then((grants) => {
        if (cancelled) return
        const enabled = grants.some((g) => g.moduleId === 'matupix')
        setGate(enabled ? { status: 'allowed' } : { status: 'blocked', reason: 'not_entitled' })
      })
      .catch(() => {
        if (cancelled) return
        // 有 session 时校验失败不静默可用
        setGate({ status: 'blocked', reason: 'check_failed' })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return gate
}

function MatuPixBlocked({ reason }: { reason: 'not_entitled' | 'check_failed' }) {
  const title = reason === 'not_entitled' ? '该模块未开通' : '暂时无法确认开通状态'
  const detail =
    reason === 'not_entitled'
      ? '当前登录所属机构还没有开通 MatuPix 创意工坊。请联系老师或机构管理员开通后再来。'
      : '开通信息暂时读不到，请稍后再试。若多次出现，请联系老师。'

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-16">
      <p className="text-sm font-semibold tracking-wide text-brand">MatuPix</p>
      <h1 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
      <p className="mt-3 leading-relaxed text-ink-soft">{detail}</p>
      <div className="mt-8">
        <Link to="/" className="btn-primary inline-flex min-h-11 items-center px-5">
          返回启动器
        </Link>
      </div>
    </main>
  )
}

export function MatuPixLayout() {
  const gate = useMatuPixGate()

  useEffect(() => {
    const previous = document.title
    document.title = '免费在线像素画 | MatuPix'
    // og/twitter 也要跟着换，否则从启动器进来时分享卡还是 MatuOne 的文案
    setMeta('og:title', '免费在线像素画 | MatuPix', 'property')
    setMeta('og:description', '浏览器里就能画像素画、搭 3D 积木，不用装软件、不用注册账号。', 'property')
    setMeta('twitter:title', '免费在线像素画 | MatuPix')
    setMeta('twitter:description', '浏览器里就能画像素画、搭 3D 积木，不用装软件、不用注册账号。')
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink" style={theme}>
      {gate.status === 'checking' ? (
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-16">
          <p className="text-sm text-ink-soft">正在确认开通状态…</p>
        </main>
      ) : gate.status === 'blocked' ? (
        <MatuPixBlocked reason={gate.reason} />
      ) : (
        <Outlet />
      )}
    </div>
  )
}
