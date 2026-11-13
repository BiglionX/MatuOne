import { Link } from 'react-router-dom'
import { usePageMeta } from '@/lib/usePageMeta'
import { SITE } from '@/config/site'

const SECTIONS: { title: string; body: string[]; table?: { head: string[]; rows: string[][] } }[] = [
  {
    title: '一、适用范围与个人信息处理者',
    body: [
      `本政策适用于「${SITE.productName}」网站、学生端、机构端、家长端页面以及相关接口。个人信息处理者为 ${SITE.companyName}。`,
      '本政策不适用于我们以外的第三方服务。机构在其自有校区内另行收集的信息，由机构自行负责。',
    ],
  },
  {
    title: '二、我们收集哪些信息',
    body: ['我们只收集完成服务所必需的信息，不收集与教学无关的信息，不采集学生的人脸、指纹、精确位置与通讯录。'],
    table: {
      head: ['对象', '收集的信息', '来源'],
      rows: [
        ['机构申请人', '机构名称、联系人姓名、手机号、所在城市/校区、预计学生数、备注', '申请试用表单'],
        ['机构管理员', '管理员账号、密码（以不可逆方式存储）、登录时间、操作记录', '平台开户时创建'],
        ['学生', '姓名、登录账号、所属机构与分组、关卡完成记录、抄写错误次数、运行次数、打字速度与准确率', '机构批量导入、学生在端内产生'],
        ['家长', '家长账号、密码（以不可逆方式存储）、绑定关系', '家长自行注册，再用绑定码绑定'],
      ],
    },
  },
  {
    title: '三、处理目的与方式',
    body: [
      '用于开通与维护账号、按关卡解锁课程、记录学习进度与打字成长、向家长展示其已绑定孩子的学习情况、排查故障与保障账号安全。',
      '我们不会将上述信息用于广告推送、用户画像营销或向无关第三方出售。',
      '学生代码在浏览器本地运行，代码内容不上传服务器；服务端只保存运行结果相关的进度与错误次数统计。',
    ],
  },
  {
    title: '四、儿童个人信息与监护人同意',
    body: [
      '本产品面向小学 2—5 年级学生，使用者多为未满十四周岁的儿童，其个人信息属于敏感个人信息。',
      '学生账号由机构创建，机构在创建账号前应取得其监护人同意，并告知本政策内容；监护人可通过机构或本政策末尾的方式联系我们，行使查阅、更正、删除与撤回同意的权利。',
      '家长需使用自己的用户名和密码登录。绑定码由机构发放，只有登录后的监护人可把对应孩子绑定到自己的账号；家长仅能查看自己已绑定的孩子，看不到同机构其他学生的数据。',
      '我们不会向儿童推送营销信息，也不会基于儿童信息进行自动化营销决策。',
    ],
  },
  {
    title: '五、存储地点、期限与安全',
    body: [
      '信息存储于我们使用的云服务商提供的数据库与对象存储中，具体存储位置以服务商当前配置为准。如发生向境外提供个人信息的情形，我们将另行告知并依法取得单独同意。',
      '账号与业务数据在服务期内持续保存；机构服务到期或停用后，数据仍保留以便恢复，我们不因到期而删除数据。机构可联系我们申请导出或删除。',
      '我们采用传输加密、按机构与角色隔离的行级权限、服务端校验身份等措施保护信息；员工访问遵循最小必要原则并留痕。',
    ],
  },
  {
    title: '六、共享、委托处理与披露',
    body: [
      '我们仅为提供服务之目的，向云基础设施服务商（数据库、对象存储、短信等，如实际启用）进行必要的委托处理，并要求其按我们的指示处理信息。',
      '除法律法规要求或有权机关依法调取外，我们不会向第三方提供个人信息。',
    ],
  },
  {
    title: '七、你的权利',
    body: [
      '你可以要求查阅、复制、更正、补充、删除你的个人信息，撤回已作出的同意，或注销账号。',
      '监护人代儿童行使上述权利时，我们可能要求提供监护关系证明。',
      '撤回同意或删除信息后，我们将无法继续提供相应功能，但不影响撤回前已进行的处理。',
    ],
  },
  {
    title: '八、政策更新与联系我们',
    body: [
      '本政策更新后将在本页面公布并标注更新日期；涉及处理目的、方式或信息类型的重要变更，我们会以醒目方式提示。',
      '如对本政策有疑问，或需行使上述权利，请通过「申请试用」页面提交，并在备注中注明「个人信息权利请求」，我们将在 15 个工作日内答复。',
    ],
  },
]

export function PrivacyPage() {
  usePageMeta('隐私政策', '代码闯关如何收集、使用、存储与保护机构、学生与家长的个人信息，以及儿童个人信息的监护人同意规则。')
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold text-ink">隐私政策</h1>
      <p className="mt-3 text-sm text-ink-soft">更新日期：{SITE.legalUpdatedAt} · 适用主体：{SITE.companyName}</p>

      <div className="card mt-6 border-warning/40 bg-warning-soft p-5 text-sm text-ink">
        <p className="font-semibold">草稿状态说明</p>
        <p className="mt-1 text-ink-soft">
          本文为产品侧起草的初稿，已按现有功能与数据流逐条对齐；正式对外前须经法务复核，并补齐公司注册地址、客服渠道与争议解决条款。
        </p>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.title} className="mt-9">
          <h2 className="text-xl font-bold text-ink">{section.title}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="mt-3 leading-relaxed text-ink-soft">
              {paragraph}
            </p>
          ))}
          {section.table && (
            <div className="card mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-ink-soft">
                  <tr className="border-b border-line">
                    {section.table.head.map((cell) => (
                      <th key={cell} className="px-4 py-3 font-medium">
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row) => (
                    <tr key={row[0]} className="border-b border-line last:border-0">
                      {row.map((cell) => (
                        <td key={cell} className="px-4 py-3 align-top text-ink">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <p className="mt-10 text-sm text-ink-soft">
        另请阅读 <Link to="/terms" className="text-brand-strong">服务条款</Link> 与{' '}
        <Link to="/faq" className="text-brand-strong">常见问题</Link>。
      </p>
    </main>
  )
}
