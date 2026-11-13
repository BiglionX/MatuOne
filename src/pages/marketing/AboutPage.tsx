import { Link } from 'react-router-dom'

export function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold text-ink">关于代码闯关</h1>
      <p className="mt-4 text-ink-soft">
        代码闯关是给校外托辅用的 Python 编程课外课。学生在浏览器里抄代码、跑出图形；机构不需要编程老师，也不需要采购硬件；家长用绑定码在手机上看进度。
      </p>
      <p className="mt-4 text-ink-soft">试用和合作请留下联系方式，我们会在 1 个工作日内回复。</p>
      <Link to="/apply" className="btn-primary mt-8">
        申请试用
      </Link>
    </main>
  )
}
