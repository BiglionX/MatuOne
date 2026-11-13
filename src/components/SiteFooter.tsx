import { Link } from 'react-router-dom'
import { BrandMark } from '@/components/BrandMark'
import { HAS_DIRECT_CONTACT, SITE } from '@/config/site'

const LEGAL_LINKS = [
  { to: '/faq', label: '常见问题' },
  { to: '/privacy', label: '隐私政策' },
  { to: '/terms', label: '服务条款' },
  { to: '/about', label: '关于我们' },
]

/**
 * 对外站点页脚：主体信息、法务入口、联系方式、备案位。
 * 备案号未取得时不显示编号，只展示主体与版权；域名确定后由 SITE 单点补齐。
 */
export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`border-t border-line bg-white ${compact ? 'mt-10' : 'mt-16'}`}>
      <div className="mx-auto max-w-5xl px-5 py-8 text-sm text-ink-soft">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-[240px]">
            <Link to="/" className="flex items-center gap-2">
              <BrandMark size={24} />
              <span className="font-semibold text-ink">代码闯关</span>
            </Link>
            <p className="mt-3">{SITE.companyName}</p>
            {HAS_DIRECT_CONTACT ? (
              <p className="mt-1">
                {SITE.contactWechat && <span>微信 {SITE.contactWechat}</span>}
                {SITE.contactWechat && SITE.contactEmail && <span> · </span>}
                {SITE.contactEmail && <span>邮箱 {SITE.contactEmail}</span>}
                <span className="block">{SITE.serviceHours}</span>
              </p>
            ) : (
              <p className="mt-1">合作与试用请通过「申请试用」表单联系我们，{SITE.serviceHours} 回复。</p>
            )}
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="站点信息">
            {LEGAL_LINKS.map((item) => (
              <Link key={item.to} to={item.to} className="transition hover:text-brand-strong">
                {item.label}
              </Link>
            ))}
            <Link to="/apply" className="transition hover:text-brand-strong">
              申请试用
            </Link>
            <Link to="/enter" className="transition hover:text-brand-strong">
              进入系统
            </Link>
          </nav>
        </div>

        <div className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-ink-soft">
          <p>
            © {new Date().getFullYear()} {SITE.companyName}
            {SITE.icpLicense && (
              <>
                {' · '}
                <a href={SITE.icpQueryUrl} target="_blank" rel="noreferrer" className="transition hover:text-brand-strong">
                  {SITE.icpLicense}
                </a>
              </>
            )}
            {SITE.policeLicense && <span> · {SITE.policeLicense}</span>}
          </p>
          {!SITE.icpLicense && (
            <p className="mt-1">本站已完成主体信息公示，ICP 备案办理中，取得后在此展示备案号。</p>
          )}
          <p className="mt-2">
            本产品为面向校外托辅机构的教学工具与内容服务，不替代机构的办学资质与教学管理责任。
          </p>
        </div>
      </div>
    </footer>
  )
}
