// admin.provisionOrg
// 调用者必须是平台运营（JWT → platform_staff）。请求体里的 operator 一律忽略。
// 明文初始密码只放进这一次响应，不写日志、不入库。
import { ensureAuthUser, loginEmail } from '../_shared/authUser.ts'
import { generateInitialPassword, hashPassword } from '../_shared/password.ts'
import { empty, json } from '../_shared/http.ts'
import { requireOps } from '../_shared/staff.ts'

const FRIENDLY = [
  '机构名称需要',
  '联系人需要',
  '请填写 11 位手机号',
  '请填写校区',
  '试用天数需要',
  '席位额度至少为',
  '试用机构最多',
  '线索不存在',
  '该线索已开户',
  '该线索不能开户',
  '密码哈希无效',
]

function failMessage(raw: string): { status: number; message: string } {
  if (raw.includes('forbidden') || raw.includes('42501')) {
    return { status: 403, message: '需要平台运营权限' }
  }
  const line = raw.split('\n')[0]?.replace(/^ERROR:\s*/, '') ?? ''
  if (FRIENDLY.some((item) => line.includes(item))) return { status: 400, message: line }
  return { status: 500, message: '开户失败' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })

  const auth = await requireOps(req)
  if ('error' in auth) return auth.error

  let body: Record<string, unknown>
  try {
    const parsed = await req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return json(400, { message: '请求格式不正确' })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return json(400, { message: '请求格式不正确' })
  }

  const leadRaw = typeof body.leadId === 'string' ? body.leadId.trim() : ''
  const leadId = leadRaw.length > 0 ? leadRaw : null
  if (leadId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(leadId)) {
    return json(400, { message: '线索不存在' })
  }

  const trialDays = body.trialDays == null || body.trialDays === '' ? 14 : Number(body.trialDays)
  const plain = generateInitialPassword(12)
  const passwordHash = await hashPassword(plain)

  const { data, error } = await auth.db.rpc('provision_org', {
    p_name: typeof body.name === 'string' ? body.name : '',
    p_contact_name: typeof body.contactName === 'string' ? body.contactName : '',
    p_contact_phone: typeof body.contactPhone === 'string' ? body.contactPhone : '',
    p_campus: typeof body.campus === 'string' ? body.campus : '',
    p_seat_quota: Number(body.seatQuota),
    p_trial_days: trialDays,
    p_password_hash: passwordHash,
    p_lead_id: leadId,
    p_operator_staff_id: auth.staff.id,
  })

  if (error) {
    console.error('provision_org failed', error.message)
    const mapped = failMessage(error.message)
    return json(mapped.status, { message: mapped.message })
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row?.org_no || !row?.admin_account) return json(500, { message: '开户失败' })

  const { data: adminRow, error: adminError } = await auth.db
    .from('org_admin')
    .select('id')
    .eq('account', row.admin_account)
    .maybeSingle()
  if (adminError || !adminRow) return json(500, { message: '开户失败' })

  try {
    const authUserId = await ensureAuthUser(auth.db, loginEmail('org', row.admin_account), plain)
    const { error: attachError } = await auth.db.rpc('attach_org_admin_auth', {
      p_admin_id: adminRow.id,
      p_auth_user_id: authUserId,
    })
    if (attachError) {
      console.error('attach_org_admin_auth failed', attachError.message)
      return json(500, { message: '开户失败' })
    }
  } catch (error) {
    console.error('provision auth user failed', error instanceof Error ? error.message : error)
    return json(500, { message: '开户失败' })
  }

  return json(200, {
    orgNo: row.org_no,
    adminAccount: row.admin_account,
    initialPassword: plain,
  })
})
