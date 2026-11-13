import { usePageMeta } from '@/lib/usePageMeta'

const LESSONS = [
  ['1', 'print 出图案', '控制台文字'],
  ['2', '前进、转向，画一条线', '线条'],
  ['3', '用重复的语句画正方形', '正方形'],
  ['4', '用变量控制边长', '大小可变的正方形'],
  ['5', '综合：变量和海龟', '可调图形'],
  ['6', '把重复的边改成 for 循环', '同一图形，代码更短'],
  ['7', 'for 和 range 画多边形', '三角形、五边形'],
  ['8', 'if 让海龟选择颜色', '变色图形'],
  ['9', '综合：循环加条件', '彩色多边形'],
  ['10–11', '变量和运算组合', '参数化图形'],
  ['12', '阶段收束小作品', '完整图形'],
]

export function CurriculumPage() {
  usePageMeta('课程体系', '1.0 交付 12 节 Python 编程课：从 print 图案到 for、if 画多边形，每节 20 分钟，分看效果、抄代码、改一改三回合。')
  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="text-3xl font-bold text-ink">课程体系</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">1.0 先上 12 节。一节课大约 20 分钟，分成三回合：看效果、抄代码、改一改。</p>

      <section className="card mt-8 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-ink-soft">
            <tr className="border-b border-line">
              <th className="px-5 py-3 font-medium">节次</th>
              <th className="px-5 py-3 font-medium">学什么</th>
              <th className="px-5 py-3 font-medium">跑出来是什么</th>
            </tr>
          </thead>
          <tbody>
            {LESSONS.map((row) => (
              <tr key={row[0]} className="border-b border-line last:border-0">
                {row.map((cell) => (
                  <td key={cell} className="px-5 py-3 text-ink">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          ['看效果', '先猜这段代码会画出什么，再运行验证。'],
          ['抄代码', '一行一行照着打，回车就校验，错了只说人话。'],
          ['改一改', '改一个数字再跑一次，然后打几个本节关键词。'],
        ].map(([title, text]) => (
          <article key={title} className="card p-5">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-sm text-ink-soft">{text}</p>
          </article>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-ink">四年大约 850–920 个学习单元</h2>
        <p className="mt-3 max-w-2xl text-ink-soft">
          二年级到五年级，每年大约 60–80 节核心新课，其余是练习、复习和打字。1.0 只交付上面这 12 节，用来验证学生能不能自己学完。
        </p>
      </section>
    </main>
  )
}
