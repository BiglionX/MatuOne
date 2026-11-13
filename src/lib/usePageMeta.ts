import { useEffect } from 'react'
import { SITE } from '@/config/site'

const DEFAULT_TITLE = `${SITE.productName} · ${SITE.tagline}`
const DEFAULT_DESC = '面向儿童的 Python 编程课外课：学生自己抄代码、逐行校验、跑出图形。'
const DEFAULT_IMAGE = '/og-cover.png'

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

/**
 * 页面级 meta：SPA 共用一份 index.html，标题与描述必须由每个页面自己写。
 * 组件卸载时不回滚，下一层页面挂载时会立刻覆盖，避免闪回默认标题。
 */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE.productName}` : DEFAULT_TITLE
    const desc = description ?? DEFAULT_DESC
    document.title = fullTitle

    setMeta('description', desc)
    setMeta('og:title', fullTitle, 'property')
    setMeta('og:description', desc, 'property')
    setMeta('og:image', DEFAULT_IMAGE, 'property')
    setMeta('og:type', 'website', 'property')
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', fullTitle)
    setMeta('twitter:description', desc)
    setMeta('twitter:image', DEFAULT_IMAGE)

    if (SITE.siteUrl) setCanonical(`${SITE.siteUrl}${window.location.pathname}`)
  }, [title, description])
}
