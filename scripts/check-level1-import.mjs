import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCoursePackage } from '../supabase/functions/_shared/coursePackage.ts'
import { neonSql } from './neonSql.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'content', 'courses', 'level1')

export function expectedLevels() {
  const levels = []
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.json')).sort()) {
    const text = readFileSync(join(dir, name), 'utf8')
    const { report, levels: parsed } = validateCoursePackage(text)
    if (!report.ok) {
      const issue = report.issues.find((item) => item.severity === 'error')
      throw new Error(`${name} 校验失败：${issue?.field ?? ''} ${issue?.message ?? ''}`)
    }
    levels.push(...parsed)
  }
  if (levels.length !== 120) throw new Error(`课程包关数是 ${levels.length}，不是 120`)
  return levels.sort((a, b) => a.order - b.order)
}

export async function snapshotAfter120(connectionString) {
  const rows = await neonSql(
    connectionString,
    `select sort_order, level_id, title, goal, md5(body::text) as sig
     from public.course_level
     where sort_order > 120
     order by sort_order`,
  )
  return JSON.stringify(rows)
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    const next = {}
    for (const key of Object.keys(value).sort()) next[key] = stable(value[key])
    return next
  }
  return value ?? null
}

function sameList(actual, expected) {
  return JSON.stringify(stable(actual)) === JSON.stringify(stable(expected))
}

/** 断言 1–120 已被课程包覆盖，121 关以后和导入前一致。 */
export async function assertLevel1Imported(connectionString, beforeTail) {
  const expected = expectedLevels()
  const rows = await neonSql(
    connectionString,
    `select sort_order, title, body
     from public.course_level
     where sort_order between 1 and 120
     order by sort_order`,
  )
  if (rows.length !== 120) throw new Error(`1–120 关只有 ${rows.length} 行`)
  for (const level of expected) {
    const row = rows.find((item) => Number(item.sort_order) === level.order)
    if (!row) throw new Error(`缺少第 ${level.order} 关`)
    const body = row.body && typeof row.body === 'object' ? row.body : {}
    if (row.title !== level.title) throw new Error(`第 ${level.order} 关标题仍是「${row.title}」`)
    if (!sameList(body.teach_code_lines, level.teach_code_lines)) throw new Error(`第 ${level.order} 关 teach_code_lines 没有覆盖`)
    if (!sameList(body.error_mappings, level.error_mappings)) throw new Error(`第 ${level.order} 关 error_mappings 没有覆盖`)
    if (body.drill_chunk !== level.drill_chunk) throw new Error(`第 ${level.order} 关 drill_chunk 没有覆盖`)
  }
  const bonus = Object.fromEntries(expected.map((level) => [level.order, level.bonus_challenge?.type]))
  for (const [order, type] of [
    [2, 'reverse_draw'],
    [10, 'add_color'],
    [23, 'add_color'],
    [61, 'code_fill'],
    [101, 'code_fill'],
  ]) {
    const row = rows.find((item) => Number(item.sort_order) === order)
    if (row?.body?.bonus_challenge?.type !== type || bonus[order] !== type) {
      throw new Error(`第 ${order} 关副本类型不是 ${type}`)
    }
  }
  const afterTail = await snapshotAfter120(connectionString)
  if (afterTail !== beforeTail) throw new Error('第 121 关及以后的数据被改动了')
  return { checked: 120, tail: JSON.parse(afterTail).length }
}
