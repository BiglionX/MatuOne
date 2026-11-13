import { Link } from 'react-router-dom'
import { BrandMark } from '@/components/BrandMark'
import { usePageMeta } from '@/lib/usePageMeta'

const CARDS = [
  { title: '机构', text: '零师资、零硬件即可开设 Python 编程课外课，有后台可管学生、看进度。' },
  { title: '学生', text: '打开就能学，抄代码有逐行校验和友好报错，跑通即出图形。' },
  { title: '家长', text: '用自己的用户名和密码登录，手机上免费看孩子的学习进度和打字成长。' },
]

export function HomePage() {
  usePageMeta(undefined, '面向儿童的 Python 编程课外课：学生自己抄代码、逐行校验、跑出图形。机构零师资、零硬件开课，14 天试用。')
  return (
    <main>
      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="flex items-center gap-2.5">
          <BrandMark size={32} />
          <span className="text-sm font-medium text-brand-strong">代码闯关</span>
        </div>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-ink">学生自己就能上的 Python 编程课，机构零师资零硬件开课</h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-soft">托辅空档里的 15–30 分钟。学生抄代码、跑出图形、改一个参数。机构只负责建号和看进度。</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/apply" className="btn-primary px-8">
            申请 14 天试用
          </Link>
          <Link to="/pricing" className="btn-secondary">
            看席位年费
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-5 sm:grid-cols-3">
        {CARDS.map((card) => (
          <article key={card.title} className="card p-6">
            <h2 className="text-xl font-semibold text-ink">{card.title}</h2>
            <p className="mt-3 text-ink-soft">{card.text}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto mt-12 max-w-5xl px-5 pb-20">
        <h2 className="text-2xl font-bold text-ink">抄下来，图形就出来了</h2>
        <div className="card mt-5 grid items-center gap-6 p-6 md:grid-cols-2">
          <pre className="code-font overflow-x-auto rounded-card bg-canvas p-5 text-sm leading-8 text-ink">{`for i in range(4):
    t.forward(120)
    t.right(90)`}</pre>
          <div className="flex justify-center">
            <svg viewBox="0 0 160 160" className="h-40 w-40 text-brand" aria-hidden="true">
              <rect x="28" y="28" width="104" height="104" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </section>
    </main>
  )
}
