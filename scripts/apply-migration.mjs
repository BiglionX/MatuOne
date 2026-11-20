/**
 * 把一条迁移应用到 Neon。
 *
 * 迁移文件放在 supabase/migrations/，但目标库是 Neon（.env 的 DATABASE_URL），
 * Neon 上没有 supabase_migrations.schema_migrations 历史表，所以不能用
 * `supabase db push`（那会把全部迁移重放一遍）。这里按文件逐条执行。
 *
 * Neon 的 HTTP SQL 走 prepared statement，一条请求只能带一条语句，所以迁移文件
 * 要先切成单条再逐条发。切分要认得注释、字符串、标识符和 $$ 引用的函数体。
 * 由于跨语句没有事务，某条失败时前面的已经生效——迁移文件必须写成幂等的，重跑即可。
 *
 * 用法：
 *   node scripts/apply-migration.mjs supabase/migrations/20261115120000_org_finance_role.sql
 *   node scripts/apply-migration.mjs --dry-run supabase/migrations/20261115120000_org_finance_role.sql
 */
import { readFileSync, existsSync } from 'node:fs'
import { basename } from 'node:path'
import { neonSql } from './neonSql.mjs'

/** 把一段 SQL 切成单条语句。函数体里的分号不能切。 */
export function splitSql(sql) {
  const statements = []
  let current = ''
  let index = 0
  let dollarTag = null

  while (index < sql.length) {
    const char = sql[index]
    const pair = sql.slice(index, index + 2)

    if (!dollarTag && pair === '--') {
      const lineEnd = sql.indexOf('\n', index)
      const stop = lineEnd === -1 ? sql.length : lineEnd
      // 注释不并入语句，否则注释里的分号会被当成语句分隔。
      current += ' '
      index = stop
      continue
    }

    if (!dollarTag && pair === '/*') {
      let depth = 1
      let cursor = index + 2
      while (cursor < sql.length && depth > 0) {
        if (sql[cursor] === '/' && sql[cursor + 1] === '*') {
          depth += 1
          cursor += 2
          continue
        }
        if (sql[cursor] === '*' && sql[cursor + 1] === '/') {
          depth -= 1
          cursor += 2
          continue
        }
        cursor += 1
      }
      current += ' '
      index = cursor
      continue
    }

    if (!dollarTag && char === '$') {
      const tag = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(index))
      if (tag) {
        dollarTag = tag[0]
        current += tag[0]
        index += tag[0].length
        continue
      }
    }

    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        current += dollarTag
        index += dollarTag.length
        dollarTag = null
        continue
      }
      current += char
      index += 1
      continue
    }

    if (char === "'" || char === '"') {
      let cursor = index + 1
      while (cursor < sql.length) {
        if (sql[cursor] === char) {
          if (sql[cursor + 1] === char) {
            cursor += 2
            continue
          }
          cursor += 1
          break
        }
        cursor += 1
      }
      current += sql.slice(index, cursor)
      index = cursor
      continue
    }

    if (char === ';') {
      statements.push(current)
      current = ''
      index += 1
      continue
    }

    current += char
    index += 1
  }

  statements.push(current)
  return statements.map((statement) => statement.trim()).filter((statement) => statement.length > 0)
}

function connectionString() {
  const fromEnv = process.env.DATABASE_URL
  if (fromEnv) return fromEnv
  try {
    const raw = readFileSync('.env', 'utf8')
    const matched = raw.match(/DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/)
    if (matched?.[1]) return matched[1]
  } catch {
    // 没有 .env 时由下面统一报错。
  }
  throw new Error('缺少 DATABASE_URL：本地读 .env，线上用环境变量。')
}

function usage() {
  console.log('用法：node scripts/apply-migration.mjs [--dry-run] <迁移文件路径>')
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const files = args.filter((item) => !item.startsWith('--'))
if (!files.length) {
  usage()
  process.exit(1)
}

for (const file of files) {
  if (!existsSync(file)) {
    console.error(`找不到迁移文件：${file}`)
    process.exit(1)
  }
}

const conn = connectionString()
console.log(`目标：${new URL(conn).hostname}（不打印账号与密码）`)

for (const file of files) {
  const sql = readFileSync(file, 'utf8')
  const name = basename(file)
  const statements = splitSql(sql)
  if (dryRun) {
    console.log(`DRY RUN ${name}：切出 ${statements.length} 条语句`)
    statements.forEach((statement, index) => {
      console.log(`  ${index + 1}. ${statement.replace(/\s+/g, ' ').slice(0, 110)}`)
    })
    continue
  }
  const started = Date.now()
  for (const [index, statement] of statements.entries()) {
    try {
      await neonSql(conn, statement)
    } catch (error) {
      const message = String(error?.message ?? error).replace(/postgres(?:ql)?:\/\/\S+/gi, '')
      console.error(`FAIL ${name} 第 ${index + 1}/${statements.length} 条：${message}`)
      console.error(`  语句：${statement.replace(/\s+/g, ' ').slice(0, 160)}`)
      process.exit(1)
    }
  }
  console.log(`PASS ${name}（${statements.length} 条，${Date.now() - started}ms）`)
}

if (!dryRun) console.log('迁移执行完成。')
