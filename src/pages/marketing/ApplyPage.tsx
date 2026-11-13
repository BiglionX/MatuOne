import { useState } from 'react'
import { submitLead } from '@/api/marketing'
import { ApiError } from '@/lib/apiError'

const EMPTY = { orgName: '', contact: '', phone: '', city: '', estStudents: '', note: '' }

export function ApplyPage() {
  const [form, setForm] = useState(EMPTY)
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
      setError(err instanceof ApiError ? err.message : '提交失败')
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16">
        <h1 className="text-3xl font-bold text-ink">申请已收到</h1>
        <p className="mt-4 text-lg text-ink-soft">我们会在 1 个工作日内联系你开通试用。</p>
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
        {error && <p className="rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? '正在提交…' : '提交申请'}
        </button>
      </form>
    </main>
  )
}
