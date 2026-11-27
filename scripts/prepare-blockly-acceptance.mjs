/**
 * 真机验收数据准备：给真实学生所在机构开通 blockly，并解锁前 160 关。
 * 只做增量更新；不删除学生、机构或学习记录。默认账号为项目已有的 chenxiaoman。
 */
import { readFileSync } from 'node:fs'
import { databaseHost, neonSql } from './neonSql.mjs'

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const raw = readFileSync('.env', 'utf8')
  const matched = raw.match(/DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/)
  if (!matched?.[1]) throw new Error('缺少 DATABASE_URL')
  return matched[1]
}

const account = process.argv[2] ?? 'chenxiaoman'
const conn = connectionString()
console.log(`目标：${databaseHost(conn)}`)

const [student] = await neonSql(conn, `select s.id, s.account, s.org_id, o.name as org_name, o.status,
  o.trial_expire_at, o.service_end_at, public.effective_org_status(o.status, o.trial_expire_at, o.service_end_at) as effective_status
from public.student s join public.org o on o.id = s.org_id where s.account = $1`, [account])
if (!student) throw new Error(`找不到学生账号 ${account}`)
if (student.effective_status === 'disabled') throw new Error('机构已停用，不能自动续期，需人工处理')

const [staff] = await neonSql(conn, `select id from public.platform_staff
where role = 'ops' and status = 'active' order by created_at limit 1`)
if (!staff?.id) throw new Error('没有可用的平台运营人员，无法走正式模块开通入口')

const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
await neonSql(conn, `select public.set_org_module_enabled($1, 'blockly', true, 8, $2, $3)`, [
  student.org_id,
  validUntil,
  staff.id,
])

// 机构过期会先于模块授权拦截；只延长当前状态对应的到期点，不改变机构状态。
await neonSql(conn, `update public.org set
  trial_expire_at = case when status = 'trial' then greatest(trial_expire_at, now() + interval '90 days') else trial_expire_at end,
  service_end_at = case when status = 'active' then greatest(service_end_at, now() + interval '90 days') else service_end_at end
where id = $1`, [student.org_id])

const [progress] = await neonSql(conn, `with written as (
  insert into public.learning_record (student_id, level_id, module_id, completed, stars, updated_at)
  select $1, level_id, 'blockly', true, 3, now()
  from public.module_level
  where module_id = 'blockly' and published and not is_placeholder and sort_order between 1 and 160
  on conflict (student_id, level_id) do update set
    completed = true,
    stars = greatest(public.learning_record.stars, excluded.stars),
    updated_at = now()
  returning level_id
)
select count(*)::int as unlocked from written`, [student.id])

const [verified] = await neonSql(conn, `select jsonb_build_object(
  'student', $1::uuid,
  'org_id', $2::uuid,
  'effective_status', public.effective_org_status(o.status, o.trial_expire_at, o.service_end_at),
  'blockly_enabled', exists (
    select 1 from public.org_entitlement e where e.org_id = o.id and e.module_id = 'blockly'
      and e.revoked_at is null and (e.valid_until is null or e.valid_until > now())),
  'completed_1_160', (select count(*) from public.learning_record lr
    join public.module_level l on l.module_id = lr.module_id and l.level_id = lr.level_id
    where lr.student_id = $1::uuid and lr.module_id = 'blockly' and l.sort_order between 1 and 160 and lr.completed)
) as result from public.org o where o.id = $2`, [student.id, student.org_id])

console.log('PREPARED', JSON.stringify({ account, orgName: student.org_name, newlyUnlocked: progress.unlocked }, null, 2))
console.log('VERIFIED', JSON.stringify(verified.result, null, 2))
if (verified.result.effective_status === 'expired' || verified.result.effective_status === 'disabled') throw new Error('机构状态仍不可进入')
if (!verified.result.blockly_enabled) throw new Error('blockly 模块授权未生效')
if (verified.result.completed_1_160 !== 160) throw new Error('前 160 关解锁进度不足')
console.log('PASS 真机验收数据准备完成')
