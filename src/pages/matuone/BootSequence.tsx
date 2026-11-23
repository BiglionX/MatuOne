import { useEffect, type CSSProperties } from 'react'
import { listLauncherRegistryModules } from '@/modules/registry'
import { BrandGlyph } from './BrandGlyph'

/**
 * 启动器开屏：菜单出现之前先播这一段。
 *
 * 节奏：标志描边点亮 → 各项模块自检 → 系统就绪 → 整体淡出，
 * 把画面交还给菜单入场（菜单各元素在 CSS 里用同一套延迟依次浮现）。
 * 背景的星空叙事由 StarfieldCanvas 同时在后面演，两段叠在一起就是完整的开机过程。
 */

/** 整段开屏的时长，与 matuone.css 里菜单入场的第一个延迟对齐 */
export const BOOT_DURATION = 2750

const SELF_CHECK = listLauncherRegistryModules().map((mod) => ({
  label: mod.boot_label,
  state: (mod.status === 'active' ? 'ok' : 'wait') as 'ok' | 'wait',
}))

export function BootSequence({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, BOOT_DURATION)
    return () => window.clearTimeout(timer)
  }, [onDone])

  return (
    <div className="matuone-boot" role="status" aria-live="polite">
      <div className="matuone-boot-core">
        <span className="matuone-boot-glyph">
          <BrandGlyph className="h-16 w-16" strokeClassName="matuone-boot-stroke" />
          <span className="matuone-boot-ring" aria-hidden="true" />
        </span>

        <p className="matuone-boot-title">MatuOne</p>
        <p className="matuone-boot-sub">STEM 课外课学习中枢</p>

        <ul className="matuone-boot-list">
          {SELF_CHECK.map((item, index) => (
            <li
              key={item.label}
              className="matuone-boot-item"
              style={{ '--boot-delay': `${880 + index * 280}ms` } as CSSProperties}
            >
              <span className={`matuone-boot-tag is-${item.state}`}>{item.state === 'ok' ? 'OK' : 'WAIT'}</span>
              <span className="matuone-boot-label">{item.label}</span>
            </li>
          ))}
        </ul>

        <p className="matuone-boot-ready">系统就绪</p>
      </div>
    </div>
  )
}
