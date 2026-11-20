import { useEffect, useRef, useState } from 'react'
import { getPartThumb } from './brickThumbRenderer'
import type { BrickType } from './brickTypes'

type BrickPartThumbProps = {
  type: BrickType
  color: string
  className?: string
}

/**
 * 零件缩略图：官方 LDraw 模型离屏渲染出来的图。
 * 滚到附近才渲染，避免一次弹窗把几十个零件全排进队列。
 */
export function BrickPartThumb({ type, color, className = '' }: BrickPartThumbProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [near, setNear] = useState(false)
  const hostRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host || typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setNear(true)
        observer.disconnect()
      },
      { rootMargin: '240px' },
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!near) return
    let alive = true
    getPartThumb(type, color)
      .then((next) => {
        if (alive) setUrl(next)
      })
      .catch(() => {
        // 模型缺失时保持占位，不挡住选零件
      })
    return () => {
      alive = false
    }
  }, [near, type, color])

  return (
    <span ref={hostRef} className={`flex items-center justify-center ${className}`}>
      {url ? (
        <img src={url} alt="" draggable={false} className="h-full w-full object-contain" />
      ) : (
        <span className="h-[58%] w-[58%] animate-pulse rounded-xl bg-black/5" aria-hidden="true" />
      )}
    </span>
  )
}
