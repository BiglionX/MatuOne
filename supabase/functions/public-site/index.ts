// 营销站公开接口：定价读同一张阶梯表，试用申请写入 lead。不要求登录。
import { empty, json } from '../_shared/http.ts'
import { serviceDb } from '../_shared/staff.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })

  const dbOrError = serviceDb()
  if (dbOrError instanceof Response) return dbOrError
  const db = dbOrError

  let body: Record<string, unknown> = {}
  try {
    const parsed = await req.json()
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>
  } catch {
    body = {}
  }
  const action = typeof body.action === 'string' ? body.action : 'pricing'

  if (action === 'apply') {
    const { data, error } = await db.rpc('submit_lead', {
      p_org_name: typeof body.orgName === 'string' ? body.orgName : '',
      p_contact: typeof body.contact === 'string' ? body.contact : '',
      p_phone: typeof body.phone === 'string' ? body.phone : '',
      p_city: typeof body.city === 'string' ? body.city : '',
      p_est_students: Number(body.estStudents),
      p_note: typeof body.note === 'string' ? body.note : '',
    })
    if (error) {
      const line = error.message.split('\n')[0]?.replace(/^ERROR:\s*/, '') ?? '提交失败'
      const friendly = ['机构名称需要', '联系人需要', '请填写 11 位手机号', '请填写所在城市', '预计学生数需要', '备注不超过']
      return json(friendly.some((item) => line.includes(item)) ? 400 : 500, { message: friendly.some((item) => line.includes(item)) ? line : '提交失败' })
    }
    return json(200, { id: data })
  }

  const seats = Number(body.seats ?? 40)
  const safeSeats = Number.isInteger(seats) && seats > 0 ? seats : 40
  const [quote, trial] = await Promise.all([
    db.rpc('quote_seat_price', { p_seats: safeSeats }),
    db.from('platform_configs').select('value').eq('key', 'trial_days').maybeSingle(),
  ])
  if (quote.error) return json(500, { message: '读取定价失败' })
  const quoted = Array.isArray(quote.data) ? quote.data[0] : quote.data
  return json(200, {
    tiers: quoted ? [{ min_seats: 1, max_seats: null, unit_price: quoted.unit_price }] : [],
    example: quoted ? { seats: safeSeats, unitPrice: quoted.unit_price, amount: quoted.amount, plan: quoted.plan_label } : null,
    trialDays: Number(trial.data?.value) || null,
  })
})
