/**
 * 扫描 content/courses/level1/*.json，按五条硬规则标 PASS / FAIL，
 * 并把未通过的关卡写到 docs/audit-hard-rules.md。
 *
 * 用法：node scripts/audit-level1.js
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const courseDir = join(root, 'content', 'courses', 'level1')
const reportPath = join(root, 'docs', 'audit-hard-rules.md')

const DANGEROUS_APIS = ['circle', 'fillcolor', 'goto', 'speed']

function collectStrings(value, out) {
  if (typeof value === 'string') {
    out.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out)
    return
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, out)
  }
}

function dangerousApisIn(level) {
  const texts = []
  collectStrings(level, texts)
  const body = texts.join('\n')
  return DANGEROUS_APIS.filter((api) => new RegExp(`\\b${api}\\b`).test(body))
}

function charLength(text) {
  return Array.from(text).length
}

function auditLevel(level) {
  const reasons = []

  if (Array.isArray(level.teach_code_lines) && level.teach_code_lines.length > 10) {
    reasons.push(`行数超载：teach_code_lines 有 ${level.teach_code_lines.length} 行（> 10）`)
  }

  const apis = dangerousApisIn(level)
  if (apis.length > 0) {
    reasons.push(`危险 API：正文包含 ${apis.map((api) => `\`${api}\``).join('、')}`)
  }

  const params = Array.isArray(level.challenge_params) ? level.challenge_params : []
  for (const param of params) {
    if (!param || typeof param !== 'object' || !('min' in param) || !('max' in param)) continue
    if (typeof param.min !== 'number' || typeof param.max !== 'number') continue
    const gap = Math.abs(param.max - param.min)
    if (gap < 20) {
      const name = typeof param.name === 'string' && param.name ? param.name : '（未命名）'
      reasons.push(`参数无效：\`${name}\` 的 min 为 ${param.min}、max 为 ${param.max}，差值绝对值为 ${gap}（< 20）`)
    }
  }

  if (typeof level.drill_chunk === 'string' && charLength(level.drill_chunk) > 15) {
    reasons.push(`碎片太短：drill_chunk 长度为 ${charLength(level.drill_chunk)}（> 15）`)
  }

  if (!Array.isArray(level.error_mappings)) {
    reasons.push('缺失配置：没有 error_mappings')
  } else if (level.error_mappings.length === 0) {
    reasons.push('缺失配置：error_mappings 为空')
  }

  return reasons
}

function loadPackages() {
  const files = readdirSync(courseDir).filter((name) => name.endsWith('.json')).sort()
  return files.map((file) => {
    const text = readFileSync(join(courseDir, file), 'utf8')
    return { file, data: JSON.parse(text) }
  })
}

function renderReport(failures, scannedLevels, fileCount) {
  const lines = [
    '# Level 1 硬规则审计',
    '',
    `扫描 \`content/courses/level1/\` 下 ${fileCount} 个 JSON，共 ${scannedLevels} 关。命中规则记为 FAIL，未命中记为 PASS。`,
    '',
    `未通过 ${failures.length} 关，通过 ${scannedLevels - failures.length} 关。`,
    '',
    '## FAIL',
    '',
  ]

  if (failures.length === 0) {
    lines.push('无。全部关卡 PASS。', '')
  } else {
    for (const item of failures) {
      const title = item.title ? ` ${item.title}` : ''
      lines.push(`### ${item.levelId}${title}`, '')
      lines.push(`来源：\`${item.file}\``, '')
      for (const reason of item.reasons) lines.push(`- ${reason}`)
      lines.push('')
    }
  }

  return `${lines.join('\n').trim()}\n`
}

const packages = loadPackages()
const failures = []
let scannedLevels = 0

for (const pack of packages) {
  const levels = Array.isArray(pack.data.levels) ? pack.data.levels : []
  for (const level of levels) {
    scannedLevels += 1
    const reasons = auditLevel(level)
    if (reasons.length === 0) continue
    failures.push({
      file: pack.file,
      levelId: typeof level.level_id === 'string' ? level.level_id : `（无编号，order ${level.order ?? '?'}）`,
      order: typeof level.order === 'number' ? level.order : Number.MAX_SAFE_INTEGER,
      title: typeof level.title === 'string' ? level.title : '',
      reasons,
    })
  }
}

failures.sort((a, b) => a.order - b.order || a.levelId.localeCompare(b.levelId))

mkdirSync(dirname(reportPath), { recursive: true })
writeFileSync(reportPath, renderReport(failures, scannedLevels, packages.length), 'utf8')

console.log(`已写入 ${reportPath}`)
console.log(`扫描 ${packages.length} 个文件、${scannedLevels} 关，FAIL ${failures.length} 关`)
for (const item of failures) {
  console.log(`${item.levelId}\t${item.reasons.join('；')}`)
}

process.exitCode = failures.length > 0 ? 1 : 0
