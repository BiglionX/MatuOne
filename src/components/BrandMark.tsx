import type { ImgHTMLAttributes } from 'react'

type BrandMarkProps = {
  /** 显示边长（px），默认 32 */
  size?: number
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'>

/**
 * 品牌标识：唯一引用 /public/logo.png 的地方。
 * 图片本身是透明底的方形 3D 图形，不要加圆角、描边或背景色，否则会破坏原有立体边缘。
 */
export function BrandMark({ size = 32, className = '', alt = '代码闯关', ...rest }: BrandMarkProps) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 select-none ${className}`}
      {...rest}
    />
  )
}

/** 标识 + 产品名的横向组合，供页头、侧栏使用 */
export function BrandLockup({
  size = 32,
  textClass = 'text-lg font-bold text-ink',
  className = '',
}: {
  size?: number
  textClass?: string
  className?: string
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <BrandMark size={size} />
      <span className={textClass}>代码闯关</span>
    </span>
  )
}
