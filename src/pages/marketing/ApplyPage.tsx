import { useState } from 'react'
import { Link } from 'react-router-dom'
import { submitLead } from '@/api/marketing'
import { ApiError } from '@/lib/apiError'
import { usePageMeta } from '@/lib/usePageMeta'
import { HAS_DIRECT_CONTACT, SITE } from '@/config/site'

const EMPTY = { orgName: '', contact: '', phone: '', city: '', estStudents: '', note: '' }

export function ApplyPage() {
  usePageMeta('申请 14 天试用', '提交机构信息，运营人工开户：14 天试用、最多 10 个席位、开放前 3 关。不安装软件，不需要编程老师。')
  const [form, setForm] = useState(EMPTY)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  const set = (key: keyof typeof EMPTY, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (form.orgName.trim().length < 2 || form.orgName.trim().length > 50) return setError('机构名称需要 2–50 个字')
    if (form.contact.trim().length < 2 || form.contact.trim().length > 20) return setError('联系人需要 2–20 个字')
    if (!/^1\d{10}$/.test(form.phone.trim())) return setError('请填写 11 位手机号')
    if (!form.city.trim()) return setError('请填写所在城市或校区')
    const students = Number(form.estStudents)
    if (!Number.isInteger(students) || students < 1 || students > 500) return setError('预计学生数需要在 1–500 之间')
    if (form.note.length > 200) return setError('备注不超过 200 字')
    if (!agreed) return setError('请先阅读并勾选同意《隐私政策》与《服务条款》')
    setPending(true)
    try {
      await submitLead({
        orgName: form.orgName.trim(),
        contact: form.contact.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        estStudents: students,
        note: form.note.trim(),
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '提交失败，请稍后重试')
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16">
        <p className="chip bg-success-soft text-success">已收到</p>
        <h1 className="mt-3 text-3xl font-bold text-ink">申请已收到</h1>
        <p className="mt-3 text-lg text-ink-soft">我们会在 1 个工作日内联系你开通试用。</p>

        <div className="card mt-6 p-6">
          <h2 className="font-semibold text-ink">接下来会发生什么</h2>
          <ol className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
            <li>
              <span className="text-ink">1.</span> 运营核对机构信息，确认席位与试用范围。
            </li>
            <li>
              <span className="text-ink">2.</span> 电话确认后创建机构账号，发放管理员初始密码。
            </li>
            <li>
              <span className="text-ink">3.</span> 你登录机构端批量导入学生，学生即可用账号进入前 3 关。
            </li>
          </ol>
          {HAS_DIRECT_CONTACT && (
            <p className="mt-4 text-sm text-ink-soft">
              {SITE.contactWechat && <>微信 {SITE.contactWechat}　</>}
              {SITE.contactEmail && <>邮箱 {SITE.contactEmail}　</>}
              {SITE.serviceHours}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/curriculum" className="btn-secondary">
            先看课程体系
          </Link>
          <Link to="/faq" className="btn-secondary">
            常见问题
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-12">
      <h1 className="text-3xl font-bold text-ink">申请 14 天试用</h1>
      <p className="mt-3 text-ink-soft">提交后由运营人工开户。1.0 不发短信验证码。</p>
      <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
        <label className="block text-sm text-ink-soft">
          机构名称
          <input className="field mt-1" value={form.orgName} onChange={(e) => set('orgName', e.target.value)} />
        </label>
        <label className="block text-sm text-ink-soft">
          联系人
          <input className="field mt-1" value={form.contact} onChange={(e) => set('contact', e.target.value)} />
        </label>
        <label className="block text-sm text-ink-soft">
          手机号
          <input className="field mt-1" inputMode="numeric" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </label>
        <label className="block text-sm text-ink-soft">
          所在城市 / 校区
          <input className="field mt-1" value={form.city} onChange={(e) => set('city', e.target.value)} />
        </label>
        <label className="block text-sm text-ink-soft">
          预计学生数
          <input className="field mt-1" inputMode="numeric" value={form.estStudents} onChange={(e) => set('estStudents', e.target.value)} />
        </label>
        <label className="block text-sm text-ink-soft">
          备注（选填）
          <textarea className="field mt-1 min-h-24" value={form.note} onChange={(e) => set('note', e.target.value)} />
        </label>

        <div className="rounded-field bg-canvas px-4 py-3 text-xs leading-relaxed text-ink-soft">
          以上信息仅用于开通试用、回访与账号发放，不用于营销推送；试用到期或你要求删除时按《隐私政策》处理。
        </div>

        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--brand-action-rgb))]"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span className="leading-relaxed text-ink-soft">
            我已阅读并同意
            <Link to="/privacy" target="_blank" className="mx-1 text-brand-strong underline underline-offset-2">
              《隐私政策》
            </Link>
            与
            <Link to="/terms" target="_blank" className="mx-1 text-brand-strong underline underline-offset-2">
              《服务条款》
            </Link>
            ，同意为开通试用处理上述机构与联系人信息。
          </span>
        </label>

        {error && <p className="rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? '正在提交…' : '提交申请'}
        </button>
      </form>
    </main>
  )
}
