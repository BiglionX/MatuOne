import { Link } from 'react-router-dom'
import { usePageMeta } from '@/lib/usePageMeta'

const FAQ: { q: string; a: string }[] = [
  {
    q: '需要安装软件或买硬件吗？',
    a: '不需要。学生用机构现有电脑的浏览器打开网页就能学，推荐 Chrome 或 Edge 最新版本，学生端最小窗口宽度 1024px。不需要装客户端，不需要服务器，也不需要编程老师。',
  },
  {
    q: '孩子不会打字，能学吗？',
    a: '可以。每关先看小绘本、再看代码，抄写时逐行校验，错了只提示「第几行 + 一句人话」，不会出现英文报错。另有基准键位与编程关键词两档打字热身，一天 5 分钟。',
  },
  {
    q: '一节课多长时间？一次要看完吗？',
    a: '单节 15–30 分钟，中位约 20 分钟，正好卡在托辅作业后的空档。每关分三个回合：看效果、抄代码、改一改，中途关掉页面下次接着上次的回合继续。',
  },
  {
    q: '机构没有编程老师，怎么保证学生能学下去？',
    a: '课程本身就是按「无师自学」设计的：先给能跑的效果，再给出逐行解释的代码，最后让学生改一个参数看变化。机构只需要批量建号、分组、偶尔看一眼谁卡住了，不需要讲语法。',
  },
  {
    q: '家长端要另外收费吗？',
    a: '不收费。家长先用自己的用户名和密码注册登录，再用机构发放的绑定码绑定孩子，即可看到本周学习次数、课程进度和打字成长曲线，只显示自己孩子，不排名、不与其他孩子对比。',
  },
  {
    q: '试用多久？有什么限制？',
    a: '14 天，最多 10 个席位，课程只开放前 3 关。试用期内可以正常建号、看进度；到期后进入 30 天宽限期，仍可登录查看，但不能新增学生，也不能进入第 4 关及以后的课程。',
  },
  {
    q: '试用到期或停用后，数据会被删吗？',
    a: '不会。任何状态下我们都不删除机构数据：到期只是限制写入与关卡范围，数据保留以便续费后继续。需要导出名单与学习记录时可以联系我们。',
  },
  {
    q: '怎么收费？能开发票吗？',
    a: '按席位年费计费：整单落在哪个席位区间，就用该档单价，不做分段累进。1.0 不提供在线支付与自动扣费，收款方式、发票类型与开票流程按双方签署的服务合同执行。',
  },
  {
    q: '中途退费、增减席位怎么处理？',
    a: '退费与扩容口径以服务合同约定为准。扩容会新增一条收费记录，服务期与原服务期对齐，不重新起算。已用席位达到额度时，批量导入会被拒绝并提示联系扩容。',
  },
  {
    q: '一个机构多个校区、多个老师，能分开管吗？',
    a: '1.0 一个机构一个管理员账号，学生按分组管理；多校区以文本形式记录在校区字段，不做多校区独立建模。多管理员与多校区拆分在后续版本评估。',
  },
  {
    q: '学生在课上会不会切出去玩游戏？',
    a: '学生端是全屏单任务：输入框禁用粘贴、右键与拖拽，抄写时当前行高亮、其余操作不打断流程。它不锁定电脑，机构仍需按自己的课堂纪律管理。',
  },
  {
    q: '网络断了或者电脑很旧，还能用吗？',
    a: '首次打开需要联网加载运行环境，之后已加载的课程在短时断网下仍可查看；运行能力会降级提示。极旧的浏览器或内存很小的机器上，图形绘制可能较慢。',
  },
]

export function FaqPage() {
  usePageMeta('常见问题', '关于代码闯关的电脑要求、上课时长、试用规则、计费与数据保留的常见问题解答。')
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold text-ink">常见问题</h1>
      <p className="mt-3 text-ink-soft">
        先看这里，多半能自己找到答案。没覆盖到的，用 <Link to="/apply" className="text-brand-strong">申请试用</Link> 表单告诉我们。
      </p>

      <div className="mt-8 space-y-3">
        {FAQ.map((item, index) => (
          <details key={item.q} className="card group px-5 py-4" open={index === 0}>
            <summary className="flex cursor-pointer list-none items-start gap-3 text-base font-semibold text-ink">
              <span className="text-ink-soft">{String(index + 1).padStart(2, '0')}</span>
              <span className="flex-1">{item.q}</span>
              <span className="text-ink-soft transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 pl-8 leading-relaxed text-ink-soft">{item.a}</p>
          </details>
        ))}
      </div>

      <section className="card mt-8 p-6">
        <h2 className="text-xl font-semibold text-ink">还是想找人问？</h2>
        <p className="mt-2 text-ink-soft">
          1.0 阶段由运营人工开户与答疑：提交试用申请后，我们会在工作时间内回访，并在开户时发放机构管理员账号。
        </p>
        <Link to="/apply" className="btn-primary mt-5">
          申请 14 天试用
        </Link>
      </section>
    </main>
  )
}
