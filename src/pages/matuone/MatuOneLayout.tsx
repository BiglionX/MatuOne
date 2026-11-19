import { useEffect, useState, type CSSProperties } from 'react'
import { Outlet } from 'react-router-dom'
import { StarfieldCanvas } from './StarfieldCanvas'
import { BootSequence } from './BootSequence'
import { playLauncherSound } from '@/lib/launcherAudio'
import './matuone.css'

/**
 * MatuOne 是项目级总入口，视觉上是深色太空桌面，和代码闯关（浅色）、MatuPix（暖色）都不同。
 * 按 MatuPixLayout 的做法：在这个根节点上同时覆盖「三元组」与「实色」两组变量，
 * 不改 src/styles/tokens.css 的 :root，也不动 index.css 的全局底色。
 */
const theme = {
  '--brand-rgb': '45 212 191', // #2DD4BF 主色，深底上够亮
  '--brand-strong-rgb': '13 148 136',
  '--brand-soft-rgb': '8 47 47',
  '--brand-action-rgb': '13 148 136',
  '--brand-action-strong-rgb': '10 115 105',
  '--success-rgb': '52 211 153',
  '--success-soft-rgb': '8 40 32',
  '--danger-rgb': '248 113 113',
  '--danger-soft-rgb': '45 20 22',
  '--warning-rgb': '251 191 36',
  '--warning-soft-rgb': '45 35 8',
  '--bg-rgb': '7 11 20', // #070B14
  '--ink-rgb': '226 236 255',
  '--ink-soft-rgb': '148 163 190',
  '--line-rgb': '31 44 70',
  '--code-bg-rgb': '12 18 30',
  '--brand': 'rgb(45 212 191)',
  '--brand-strong': 'rgb(13 148 136)',
  '--brand-action': 'rgb(13 148 136)',
  '--brand-action-strong': 'rgb(10 115 105)',
  '--brand-soft': 'rgb(8 47 47)',
  '--success': 'rgb(52 211 153)',
  '--success-soft': 'rgb(8 40 32)',
  '--danger': 'rgb(248 113 113)',
  '--danger-soft': 'rgb(45 20 22)',
  '--warning': 'rgb(251 191 36)',
  '--warning-soft': 'rgb(45 35 8)',
  '--bg': 'rgb(7 11 20)',
  '--ink': 'rgb(226 236 255)',
  '--ink-soft': 'rgb(148 163 190)',
  '--line': 'rgb(31 44 70)',
  '--code-bg': 'rgb(12 18 30)',
} as CSSProperties

const TITLE = 'MatuOne · STEM 课外课学习中枢'
const DESCRIPTION =
  'MatuOne 是面向培训机构的 STEM 课外课总入口：Python 编程（3 年级以上）、MatuPix 创意搭建（1—2 年级）、Arduino 机器人探索（筹备中）。'

/** 这层页面不套 usePageMeta：那套标题会带上「代码闯关」后缀，与 MatuOne 品牌冲突。 */
function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** 系统开了「减少动态效果」时就不播开屏，直接给菜单 */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function MatuOneLayout() {
  const [booted, setBooted] = useState(prefersReducedMotion)

  useEffect(() => {
    const previous = document.title
    document.title = TITLE
    setMeta('description', DESCRIPTION)
    setMeta('og:title', TITLE, 'property')
    setMeta('og:description', DESCRIPTION, 'property')
    return () => {
      document.title = previous
    }
  }, [])

  /** 开屏结束：菜单可以入场了 */
  function handleBooted() {
    setBooted(true)
    playLauncherSound('boot')
  }

  return (
    <div className="matuone-shell relative flex min-h-screen flex-col overflow-hidden text-ink" style={theme}>
      {/* 背景叙事：黑色星空 → 蓝色星云穿越 → 金黄恒星定格 */}
      <StarfieldCanvas />
      <div className="matuone-shade pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="matuone-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="matuone-scan pointer-events-none absolute inset-0" aria-hidden="true" />
      <Outlet />
      {/* 开屏：菜单出现之前先播这一段 */}
      {!booted && <BootSequence onDone={handleBooted} />}
    </div>
  )
}
