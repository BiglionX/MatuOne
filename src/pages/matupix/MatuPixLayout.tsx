import { useEffect, type CSSProperties } from 'react'
import { Outlet } from 'react-router-dom'

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

export function MatuPixLayout() {
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
      <Outlet />
    </div>
  )
}
