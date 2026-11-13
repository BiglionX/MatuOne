/**
 * 连远程库，核对 960 节课骨架。
 * 用法：node scripts/check-curriculum.js
 */
import { readFileSync } from 'node:fs'

const WANT = { new: 12, practice: 5, typing: 2, project: 1 }

function unquote(value) {
  const trimmed = value.trim()
  const first = trimmed.charCodeAt(0)
  const last = trimmed.charCodeAt(trimmed.length - 1)
  if (trimmed.length >= 2 && first === last && (first === 34 || first === 39)) return trimmed.slice(1, -1)
  return trimmed
}

function connectionString() {
  const fromEnv = unquote(process.env.DATABASE_URL ?? '')
  if (fromEnv) return fromEnv
  const raw = readFileSync('.env', 'utf8')
  const matched = raw.match(/DATABASE_URL="([^"]+)"/) ?? raw.match(/DATABASE_URL=(\S+)/)
  if (!matched?.[1]) throw new Error('missing DATABASE_URL')
  return matched[1]
}

function expectedUnits() {
  const ids = []
  for (let stage = 1; stage <= 8; stage += 1) {
    for (let index = 1; index <= 6; index += 1) ids.push(`L${stage}_U${String(index).padStart(2, '0')}`)
  }
  return ids
}

async function sql(query) {
  const url = new URL(connectionString())
  url.searchParams.delete('channel_binding')
  const host = url.hostname.replace(/^[^.]+/, 'api')
  const response = await fetch(`https://${host}/sql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'neon-connection-string': url.toString(),
      'neon-raw-text-output': 'true',
      'neon-array-mode': 'true',
    },
    body: JSON.stringify({ query, params: [] }),
  })
  const raw = await response.text()
  const payload = raw ? JSON.parse(raw) : {}
  if (!response.ok) {
    const message = String(payload.message ?? raw).replace(/postgres(?:ql)?:\/\/\S+/gi, '')
    throw new Error(message.slice(0, 300))
  }
  return payload.rows ?? []
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

const totalRows = await sql('select count(*)::int as n from public.course_level')
const total = Number(totalRows[0]?.[0])
if (total !== 960) fail(`course_level 有 ${total} 条，不是 960 条`)

const grouped = await sql(`
  select unit_id, level_type, count(*)::int as n
  from public.course_level
  group by unit_id, level_type
  order by unit_id, level_type
`)

const byUnit = new Map()
for (const [unitId, levelType, count] of grouped) {
  if (!byUnit.has(unitId)) byUnit.set(unitId, {})
  byUnit.get(unitId)[levelType] = Number(count)
}

const expected = expectedUnits()
const actual = [...byUnit.keys()].sort()
const missing = expected.filter((id) => !byUnit.has(id))
const extra = actual.filter((id) => !expected.includes(id))
if (byUnit.size !== 48 || missing.length || extra.length) {
  fail(`单元编号不是 Level 1–8 的 48 个单元。缺少 ${missing.join(', ') || '无'}；多出 ${extra.join(', ') || '无'}`)
}

for (const unitId of expected) {
  const counts = byUnit.get(unitId)
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
  if (total !== 20) fail(`${unitId} 有 ${total} 节，应为 20`)
  if (unitId === 'L1_U01') continue
  for (const [kind, want] of Object.entries(WANT)) {
    if (counts[kind] !== want) fail(`${unitId} 的 ${kind} 是 ${counts[kind] ?? 0}，应为 ${want}`)
  }
  const kinds = Object.keys(counts)
  if (kinds.length !== 4) fail(`${unitId} 出现了额外课型：${kinds.join(', ')}`)
}

const stages = await sql(`
  select stage_level, count(*)::int as n
  from public.course_level
  where sort_order between 1 and 960
  group by stage_level
  order by stage_level
`)
if (stages.length !== 8) fail(`stage_level 不是 8 档，实际 ${stages.length}`)
for (const [stageLevel, count] of stages) {
  const level = Number(stageLevel)
  const n = Number(count)
  if (level < 1 || level > 8 || n !== 120) fail(`Level ${level} 有 ${n} 节，应为 120`)
}

const named = await sql(`
  select count(*)::int as n from public.course_level
  where title ~ '三年级|四年级|学期' or goal ~ '三年级|四年级|学期' or body::text ~ '三年级|四年级|学期'
`)
if (Number(named[0]?.[0]) !== 0) fail('课时标题或正文里还有年级或学期字样')

console.log('960 节课校验无误')
