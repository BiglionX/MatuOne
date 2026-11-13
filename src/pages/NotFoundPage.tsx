import { Link } from 'react-router-dom'
import { BrandMark } from '@/components/BrandMark'
import { SiteFooter } from '@/components/SiteFooter'
import { usePageMeta } from '@/lib/usePageMeta'

export function NotFoundPage() {
  usePageMeta('页面不存在', '这个地址没有对应的页面。可以回到首页、查看课程体系，或直接申请试用。')
  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <BrandMark size={32} />
            <span className="text-lg font-semibold text-ink">代码闯关</span>
          </Link>
          <Link to="/apply" className="btn-primary px-4 text-sm">
            申请试用
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-16">
        <p className="code-font text-sm text-ink-soft">404 Not Found</p>
        <h1 className="mt-3 text-3xl font-bold text-ink">这个地址没有页面</h1>
        <p className="mt-3 leading-relaxed text-ink-soft">
          可能是链接输错了、页面改名了，或者这个地址从来就不存在。别急，下面这几条都还能走。
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className="btn-primary">
            回首页
          </Link>
          <Link to="/curriculum" className="btn-secondary">
            看课程体系
          </Link>
          <Link to="/faq" className="btn-secondary">
            常见问题
          </Link>
          <Link to="/enter" className="btn-ghost">
            进入系统
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
