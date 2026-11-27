/** 核对 Blockly 四学期课程、Stage 样板和层级外键；只读数据库。 */
import { readFileSync } from 'node:fs'
import { databaseHost, neonSql } from './neonSql.mjs'

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const raw = readFileSync('.env', 'utf8')
  const matched = raw.match(/DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/)
  if (!matched?.[1]) throw new Error('缺少 DATABASE_URL')
  return matched[1]
}

const conn = connectionString()
console.log(`目标：${databaseHost(conn)}（只读核验）`)

const [summary] = await neonSql(conn, `select jsonb_build_object(
  'total_rows', (select count(*) from public.module_level where module_id = 'blockly'),
  'visible_levels', (select count(*) from public.module_level where module_id = 'blockly' and published and not is_placeholder),
  'placeholder_rows', (select count(*) from public.module_level where module_id = 'blockly' and is_placeholder),
  'stage_target_rows', (select count(*) from public.module_level where module_id = 'blockly' and published and not is_placeholder and scene_type = 'stage'),
  'orphan_levels', (select count(*) from public.module_level l where l.module_id = 'blockly' and not exists (
    select 1 from public.module_unit u where u.module_id = l.module_id and u.unit_id = l.unit_id and u.term_id = l.term_id)),
  'scene_mismatch', (select count(*) from public.module_level where module_id = 'blockly' and scene_type <> body->>'scene_type'),
  'validated_unit_fk', (select convalidated from pg_constraint where conname = 'module_level_unit_fk')
) as result`)

const terms = await neonSql(conn, `select t.title, t.term_id, count(l.level_id) filter (where l.published and not l.is_placeholder) as visible_levels
from public.module_term t left join public.module_level l on l.module_id = t.module_id and l.term_id = t.term_id
where t.module_id = 'blockly' group by t.title, t.term_id, t.sort_order order by t.sort_order`)

const targets = await neonSql(conn, `select level_id, title, scene_type, sort_order, body->'success_check'->>'variable_id' as variable_id,
body->'success_check'->>'value' as target_value
from public.module_level where module_id = 'blockly' and level_id in ('blk-161', 'blk-201') order by sort_order`)

console.log('SUMMARY', JSON.stringify(summary.result, null, 2))
console.log('TERMS', JSON.stringify(terms, null, 2))
console.log('TARGETS', JSON.stringify(targets, null, 2))

const failures = []
if (summary.result.visible_levels !== 240) failures.push(`正式关卡应为 240，实际 ${summary.result.visible_levels}`)
const expectedTermCounts = [80, 80, 40, 40]
if (terms.length !== 4 || terms.some((term, index) => Number(term.visible_levels) !== expectedTermCounts[index])) {
  failures.push('四个学期正式关卡数应为 80 / 80 / 40 / 40')
}
if (targets.length !== 2 || targets.some((target) => target.scene_type !== 'stage')) failures.push('blk-161 / blk-201 必须都是 stage')
if (summary.result.orphan_levels !== 0) failures.push(`存在 ${summary.result.orphan_levels} 个孤儿关卡`)
if (summary.result.scene_mismatch !== 0) failures.push(`存在 ${summary.result.scene_mismatch} 个场景类型不一致`)
if (summary.result.validated_unit_fk !== true) failures.push('module_level_unit_fk 未恢复或未校验')
if (failures.length) {
  console.error(`FAIL ${failures.join('；')}`)
  process.exit(1)
}
console.log('PASS Blockly 数据库核验全部通过')
