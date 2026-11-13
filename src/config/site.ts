/**
 * 站点对外信息单点配置。
 * 只有这里出现的公司主体、备案号、联系方式才会被页脚、法务页、关于页引用，
 * 避免同一句话在 5 个文件里各写一遍、改的时候漏一处。
 *
 * 备案号为空时，页脚不会显示任何备案编号（未取得的备案号不能先挂占位），
 * 只显示主体名称与版权。
 */
export const SITE = {
  productName: '代码闯关',
  tagline: 'Python 编程课外课',
  companyName: '泽宝科技（福建三明）有限责任公司',

  /** ICP 备案号，格式如「闽ICP备2026XXXXXX号-1」。未取得前保持空字符串 */
  icpLicense: '',
  icpQueryUrl: 'https://beian.miit.gov.cn/',

  /** 公安联网备案号，格式如「闽公网安备 3504XXXXXXXXXXX号」 */
  policeLicense: '',

  /** 客服邮箱。为空则页脚不显示邮箱 */
  contactEmail: '',
  /** 客服微信（可填微信号或手机号）。为空则不显示 */
  contactWechat: '',
  /** 服务时间文案 */
  serviceHours: '工作日 9:00–18:00',

  /** 部署域名（如 https://www.example.com）。为空时不生成 canonical 与 sitemap */
  siteUrl: '',

  /** 法务文本最后更新日 */
  legalUpdatedAt: '2026-11-13',
} as const

export const HAS_DIRECT_CONTACT = Boolean(SITE.contactEmail || SITE.contactWechat)
