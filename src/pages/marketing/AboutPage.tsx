import { Link } from 'react-router-dom'
import { usePageMeta } from '@/lib/usePageMeta'
import { HAS_DIRECT_CONTACT, SITE } from '@/config/site'

export function AboutPage() {
  usePageMeta('关于我们', '代码闯关是谁做的、服务边界在哪：面向校外托辅机构的 Python 编程教学工具与内容服务。')
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold text-ink">关于代码闯关</h1>
      <p className="mt-4 text-ink-soft">
        代码闯关是给校外托辅用的 Python 编程课外课。学生在浏览器里抄代码、跑出图形；机构不需要编程老师，也不需要采购硬件；家长用自己的账号登录后，再用绑定码在手机上看进度。
      </p>
      <p className="mt-4 text-ink-soft">
        课程按「先看到效果、再抄代码、最后改一个参数」设计，每关自带逐行校验和人话报错，目标是让没有编程背景的机构也能把课开起来。
      </p>

      <section className="card mt-8 p-6">
        <h2 className="text-xl font-semibold text-ink">服务提供方</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap gap-x-3">
            <dt className="w-24 shrink-0 text-ink-soft">公司名称</dt>
            <dd className="text-ink">{SITE.companyName}</dd>
          </div>
          <div className="flex flex-wrap gap-x-3">
            <dt className="w-24 shrink-0 text-ink-soft">服务内容</dt>
            <dd className="text-ink">Python 编程课外课的内容与教学工具（SaaS）</dd>
          </div>
          <div className="flex flex-wrap gap-x-3">
            <dt className="w-24 shrink-0 text-ink-soft">联系渠道</dt>
            <dd className="text-ink">
              {HAS_DIRECT_CONTACT ? (
                <>
                  {SITE.contactWechat && <span>微信 {SITE.contactWechat}　</span>}
                  {SITE.contactEmail && <span>邮箱 {SITE.contactEmail}　</span>}
                  {SITE.serviceHours}
                </>
              ) : (
                <>
                  通过
                  <Link to="/apply" className="mx-1 text-brand-strong">
                    申请试用
                  </Link>
                  表单联系，{SITE.serviceHours} 回复
                </>
              )}
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-3">
            <dt className="w-24 shrink-0 text-ink-soft">备案信息</dt>
            <dd className="text-ink">{SITE.icpLicense || 'ICP 备案办理中'}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-ink-soft">
          本产品为教学工具与内容服务，不替代机构的办学资质与教学管理责任；涉及校外培训的备案与预收费要求，由机构按其所在地规定执行。
        </p>
      </section>

      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link to="/faq" className="text-brand-strong">
          常见问题
        </Link>
        <Link to="/privacy" className="text-brand-strong">
          隐私政策
        </Link>
        <Link to="/terms" className="text-brand-strong">
          服务条款
        </Link>
      </div>

      <Link to="/apply" className="btn-primary mt-8">
        申请试用
      </Link>
    </main>
  )
}
