/**
 * 把 content/courses/level2 的 6 个单元包写入数据库。
 * 按 sort_order 覆盖 121–240 关，不改第 120 关以前和第 241 关以后。
 * 本地读 .env，远程读 .env.test。两份连接串相同就只写一次。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCoursePackage } from '../supabase/functions/_shared/coursePackage.ts'
import { databaseHost, neonSql } from './neonSql.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'content', 'courses', 'level2')

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

async function snapshotOutside(connectionString) {
  const rows = await neonSql(
    connectionString,
    `select sort_order, level_id, title, md5(body::text) as sig
     from public.course_level
     where sort_order = 120 or sort_order >= 241
     order by sort_order`,
  )
  return JSON.stringify(rows)
}

async function importPackages(connectionString, packs) {
  let written = 0
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
      if (level.order < 121 || level.order > 240) throw new Error(`${pack.name} 出现了范围外的第 ${level.order} 关`)
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
      if (!updated.length) throw new Error(`第 ${level.order} 关没有对应的行，没有插入新行`)
      written += 1
    }
    console.log(`${pack.name} 写入 ${pack.levels.length} 关`)
  }
  return written
}

async function assertLevel2Imported(connectionString) {
  const rows = await neonSql(
    connectionString,
    `select sort_order, level_id, title, goal, body
     from public.course_level
     where sort_order between 121 and 240
     order by sort_order`,
  )
  if (rows.length !== 120) throw new Error(`121–240 关只有 ${rows.length} 行`)
  const first = rows[0]
  const last = rows[119]
  if (first.title !== '给正方形起个名字') throw new Error(`第 121 关标题仍是「${first.title}」`)
  if (String(first.goal).startsWith('这一节先熟悉')) throw new Error('第 121 关仍是骨架题干')
  const lines = first.body?.teach_code_lines
  if (!Array.isArray(lines) || !lines.some((line) => String(line).includes('def '))) {
    throw new Error('第 121 关正文里没有函数')
  }
  if (last.title !== '我的小花园') throw new Error(`第 240 关标题仍是「${last.title}」`)
  const skeletons = rows.filter((row) => String(row.goal).startsWith('这一节先熟悉'))
  if (skeletons.length) throw new Error(`还有 ${skeletons.length} 关是骨架题干`)
  return { first: first.title, last: last.title }
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
  const orders = packs.flatMap((pack) => pack.levels.map((level) => level.order))
  if (orders.length !== 120 || Math.min(...orders) !== 121 || Math.max(...orders) !== 240) {
    throw new Error('课程包没有覆盖 121–240')
  }
  for (const target of targets) {
    console.log(`开始写入${target.label} ${databaseHost(target.url)}`)
    const before = await snapshotOutside(target.url)
    const written = await importPackages(target.url, packs)
    const after = await snapshotOutside(target.url)
    if (before !== after) throw new Error('第 120 关或第 241 关以后被改动了')
    const result = await assertLevel2Imported(target.url)
    console.log(`${target.label} 校验通过：写入 ${written} 关，第 121 关「${result.first}」，第 240 关「${result.last}」`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : '导入失败')
  process.exit(1)
})
