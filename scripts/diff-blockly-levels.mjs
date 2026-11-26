/**
 * 对比线上 Neon 与本地 PGlite 的 Blockly 关卡，找出本地重建与线上的差异。
 *
 * 用途：迁移预演前先确认「本地库代表线上」这件事还成立。
 * 本地库是把 supabase/migrations 重放一遍建出来的，线上可能漏跑过某个迁移，
 * 两边不一致时本地验证就没有意义，得先查清楚差在哪。
 *
 * 用法：node scripts/diff-blockly-levels.mjs
 */
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { neonSql } from './neonSql.mjs'

const COLUMNS = ['title', 'goal', 'level_type', 'scene_type', 'is_placeholder', 'published', 'unit_id', 'term_id']

function connectionString() {
  const raw = readFileSync('.env', 'utf8')
  const matched = raw.match(/DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/)
  return matched[1]
}

const levelSql = `select level_id, ${COLUMNS.join(', ')}, sort_order
  from public.module_level where module_id = 'blockly' order by level_id`

const termSql = `select term_id, weeks, level_cap from public.module_term
  where module_id = 'blockly' order by term_id`

const unitSql = `select unit_id, term_id, title, level_cap, sort_order from public.module_unit
  where module_id = 'blockly' order by unit_id`

/**
 * 两边取同一个字段，返回值形态却不同：
 * Neon 的 HTTP 接口把布尔列返回成字符串 't' / 'f'，PGlite 返回真正的布尔。
 * 归一化成同一套写法，否则 diff 全是假差异。
 */
function normalizeValue(value) {
  if (value === true || value === 't') return 'true'
  if (value === false || value === 'f') return 'false'
  if (value === null || value === undefined) return null
  return String(value)
}

function normalize(rows) {
  return rows.map((row) => {
    const item = {}
    for (const [key, value] of Object.entries(row)) item[key] = normalizeValue(value)
    return item
  })
}

function diffRows(label, prodRows, localRows) {
  const prod = new Map(prodRows.map((row) => [row.level_id ?? row.term_id ?? row.unit_id, row]))
  const local = new Map(localRows.map((row) => [row.level_id ?? row.term_id ?? row.unit_id, row]))
  const keys = new Set([...prod.keys(), ...local.keys()])
  const differences = []
  for (const key of [...keys].sort()) {
    const a = prod.get(key)
    const b = local.get(key)
    if (!a) {
      differences.push({ key, field: '（整行）', 线上: '不存在', 本地: '有' })
      continue
    }
    if (!b) {
      differences.push({ key, field: '（整行）', 线上: '有', 本地: '不存在' })
      continue
    }
    for (const column of COLUMNS) {
      if (String(a[column]) !== String(b[column])) {
        differences.push({ key, field: column, 线上: a[column], 本地: b[column] })
      }
    }
    if (a.sort_order !== b.sort_order) {
      differences.push({ key, field: 'sort_order', 线上: a.sort_order, 本地: b.sort_order })
    }
  }
  console.log(`--- ${label}：${differences.length} 处差异 ---`)
  for (const item of differences) {
    console.log(`  ${item.key}  ${item.field}：线上=${item.线上}  本地=${item.本地}`)
  }
  return differences.length
}

const conn = connectionString()
const prodLevels = normalize(await neonSql(conn, levelSql))
const prodTerms = normalize(await neonSql(conn, termSql))
const prodUnits = normalize(await neonSql(conn, unitSql))

const db = await PGlite.create('.local-pg', { extensions: { pgcrypto: (await import('@electric-sql/pglite/contrib/pgcrypto')).pgcrypto } })
const localLevels = normalize((await db.query(levelSql)).rows)
const localTerms = normalize((await db.query(termSql)).rows)
const localUnits = normalize((await db.query(unitSql)).rows)
await db.close()

let total = 0
total += diffRows('关卡', prodLevels, localLevels)
total += diffRows('学期', prodTerms, localTerms)
total += diffRows('单元', prodUnits, localUnits)
console.log(total === 0 ? '线上与本地一致。' : `共 ${total} 处差异。`)
process.exitCode = total === 0 ? 0 : 1
