/**
 * 把 content/courses/level1 的 6 个单元包写入数据库。
 * 按 sort_order 覆盖 1–120 关，不改 121 关以后的行。
 * 本地读 .env，远程读 .env.test。两份连接串相同就只写一次。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCoursePackage } from '../supabase/functions/_shared/coursePackage.ts'
import { databaseHost, neonSql } from './neonSql.mjs'
import { assertLevel1Imported, snapshotAfter120 } from './check-level1-import.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'content', 'courses', 'level1')

function readDatabaseUrl(file) {
  try {
    const raw = readFileSync(join(root, file), 'utf8')
    const matched = raw.match(/DATABASE_URL="([^"]+)"/) ?? raw.match(/DATABASE_URL=(\S+)/)
    return matched?.[1]?.trim() ?? ''
  } catch {
    return ''
  }
}

function packages() {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((name) => {
      const text = readFileSync(join(dir, name), 'utf8')
      const { report, levels, placement } = validateCoursePackage(text)
      if (!report.ok) {
        const issue = report.issues.find((item) => item.severity === 'error')
        throw new Error(`${name} 不能导入：${issue?.message ?? '校验失败'}`)
      }
      return { name, levels, placement }
    })
}

async function importPackages(connectionString, packs) {
  for (const pack of packs) {
    if (pack.placement) {
      const unit = pack.placement.unit
      await neonSql(
        connectionString,
        `insert into public.curriculum_unit (unit_id, semester_id, title, sort_order, stage_level)
         values ($1, $2, $3, $4, $5)
         on conflict (unit_id) do update set
           semester_id = excluded.semester_id,
           title = excluded.title,
           sort_order = excluded.sort_order,
           stage_level = excluded.stage_level`,
        [unit.unit_id, pack.placement.legacySemesterId, unit.title, unit.sort_order, pack.placement.stageLevel],
      )
    }
    for (const level of pack.levels) {
      const body = JSON.stringify(level)
      const updated = await neonSql(
        connectionString,
        `update public.course_level set
           title = $2,
           goal = $3,
           body = $4::jsonb,
           published = true,
           updated_at = now(),
           unit_id = case when $5::boolean then $6 else unit_id end,
           knowledge_tags = case when $7::boolean then $8::text[] else knowledge_tags end,
           level_type = case when $9::boolean then $10 else level_type end,
           milestone_badge = case when $11::boolean then $12 else milestone_badge end,
           teaching_intent = case when $13::boolean then $14 else teaching_intent end,
           parent_brief = case when $15::boolean then $16 else parent_brief end,
           teacher_guide = case when $17::boolean then $18 else teacher_guide end
         where sort_order = $1
         returning level_id`,
        [
          level.order,
          level.title,
          level.goal,
          body,
          Boolean(level.unit_id),
          level.unit_id ?? null,
          level.knowledge_tags !== undefined,
          level.knowledge_tags ?? null,
          Boolean(level.pedagogy),
          level.pedagogy ?? null,
          level.milestone_badge !== undefined,
          level.milestone_badge ?? null,
          level.teaching_intent !== undefined,
          level.teaching_intent ?? null,
          level.parent_brief !== undefined,
          level.parent_brief ?? null,
          level.teacher_guide !== undefined,
          level.teacher_guide ?? null,
        ],
      )
      if (updated.length) continue
      await neonSql(
        connectionString,
        `insert into public.course_level (
           level_id, sort_order, title, goal, body, published, updated_at,
           unit_id, knowledge_tags, level_type, milestone_badge,
           teaching_intent, parent_brief, teacher_guide
         ) values (
           $1, $2, $3, $4, $5::jsonb, true, now(),
           coalesce($6, 'G5-spring-inbox'),
           coalesce($7::text[], '{}'),
           coalesce($8, 'new'),
           $9, $10, $11, $12
         )`,
        [
          level.level_id,
          level.order,
          level.title,
          level.goal,
          body,
          level.unit_id ?? null,
          level.knowledge_tags ?? null,
          level.pedagogy ?? null,
          level.milestone_badge ?? null,
          level.teaching_intent ?? null,
          level.parent_brief ?? null,
          level.teacher_guide ?? null,
        ],
      )
    }
    console.log(`${pack.name} 写入 ${pack.levels.length} 关`)
  }
}

async function main() {
  const local = readDatabaseUrl('.env')
  const remote = readDatabaseUrl('.env.test')
  if (!local && !remote) throw new Error('没有找到 .env 或 .env.test 里的 DATABASE_URL')
  const targets = []
  if (local) targets.push({ label: '本地', url: local })
  if (remote && remote !== local) targets.push({ label: '远程', url: remote })
  if (local && remote && local === remote) console.log(`本地和远程是同一个库 ${databaseHost(local)}`)
  if (!local) console.log('没有 .env，只写远程库')
  if (!remote) console.log('没有 .env.test，只写本地库')

  const packs = packages()
  for (const target of targets) {
    console.log(`开始写入${target.label} ${databaseHost(target.url)}`)
    const before = await snapshotAfter120(target.url)
    await importPackages(target.url, packs)
    const result = await assertLevel1Imported(target.url, before)
    console.log(`${target.label} 校验通过：120 关已覆盖，第 121 关以后 ${result.tail} 行未改`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : '导入失败')
  process.exit(1)
})
