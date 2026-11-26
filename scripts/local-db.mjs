/**
 * 本地 Postgres（PGlite）工具。
 *
 * 为什么要它：项目只有一个数据库（.env 的 Neon），本地开发、e2e、迁移预演全都直连线上库，
 * 想在落库前先把迁移跑一遍根本没有落脚的库。这个脚本用 PGlite（WASM 版真 Postgres）
 * 在本机 .local-pg/ 里建一个独立实例，把 supabase/migrations 按文件名顺序重放一遍，
 * 重建出与线上一致的 schema，再在它上面预演迁移。
 *
 * 关键点：
 * - 切语句复用 apply-migration.mjs 的 splitSql，一条一条发，跟 Neon 的 prepared statement
 *   语义一致；某条失败能精确指出是第几条，不会像整包执行那样看不出断点。
 * - 迁移文件自带幂等性，失败后重跑即可，不用重建整个库。
 * - 迁移历史记在 _local_migrations 表里，migrate 只跑没跑过的。
 *
 * 用法：
 *   node scripts/local-db.mjs reset            重建本地库并跑完全部迁移
 *   node scripts/local-db.mjs reset --skip 15000 重建时跳过文件名含 15000 的迁移
 *   node scripts/local-db.mjs migrate          在已有本地库上补跑没跑过的迁移
 *   node scripts/local-db.mjs apply <文件>     只跑指定的一个迁移文件
 *   node scripts/local-db.mjs query "<sql>"    跑一句查询并打印结果
 *
 * --skip 用文件名子串匹配，可以重复给。
 * 线上可能漏跑过某个迁移（实测 20261126150000 就没跑），
 * 想让本地基线精确等于线上时用它排除掉。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { basename, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { splitSql } from './split-sql.mjs'

const DATA_DIR = '.local-pg'
const MIGRATIONS_DIR = 'supabase/migrations'

/**
 * 补齐迁移依赖的角色。
 *
 * 这几个是 Supabase 的内置角色，Neon 上已存在；本地是干净实例，得自己建，
 * 否则 apply 到一半会因为「role does not exist」挂掉。
 */
const REQUIRED_ROLES = ['anon', 'authenticated', 'service_role']

/**
 * 补齐平台自带、本地没有的表。
 *
 * auth.users 由 Neon 平台提供，全部迁移里没有任何一句 create 它，
 * 只有外键和「按 email 查 id」在用（id / email 两列）。
 * 本地补一个最小替身，让外键能建、函数能编译。
 */
const PLATFORM_TABLES = [
  `create schema if not exists auth;
   create table if not exists auth.users (
     id uuid primary key default gen_random_uuid(),
     email text not null unique,
     created_at timestamptz not null default now()
   )`,
]

/** 打开（必要时创建）本地库。 */
async function openDb({ fresh = false } = {}) {
  if (fresh) rmSync(DATA_DIR, { recursive: true, force: true })
  mkdirSync(DATA_DIR, { recursive: true })
  return PGlite.create(DATA_DIR, { extensions: { pgcrypto } })
}

/** 补齐迁移依赖的角色与平台表。 */
async function bootstrap(db) {
  for (const role of REQUIRED_ROLES) {
    const found = await db.query('select 1 from pg_roles where rolname = $1', [role])
    if (found.rows.length === 0) {
      await db.query(`create role ${role} nologin`)
      console.log(`  建角色 ${role}`)
    }
  }
  for (const sql of PLATFORM_TABLES) {
    // 这里用 exec 而不是 query：query 走扩展协议，一次只能带一条语句。
    await db.exec(sql)
  }
  // 迁移历史表。这个库只用于本地预演，表名加前缀免得跟业务表混在一起。
  await db.exec(`create table if not exists _local_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`)
}

/** 记一次迁移。 */
async function recordMigration(db, name) {
  await db.query(
    'insert into _local_migrations (name, applied_at) values ($1, now()) on conflict (name) do nothing',
    [name],
  )
}

/** 跑过一个迁移文件里的所有语句。 */
async function applySqlFile(db, file) {
  const sql = readFileSync(file, 'utf8')
  const statements = splitSql(sql)
  const started = Date.now()
  for (const [index, statement] of statements.entries()) {
    try {
      await db.query(statement)
    } catch (error) {
      const message = String(error?.message ?? error)
      console.error(`FAIL ${basename(file)} 第 ${index + 1}/${statements.length} 条：${message}`)
      console.error(`  语句：${statement.replace(/\s+/g, ' ').slice(0, 200)}`)
      throw error
    }
  }
  console.log(`  PASS ${basename(file)}（${statements.length} 条，${Date.now() - started}ms）`)
  return statements.length
}

/** 列出所有迁移文件，按文件名排序（时间戳前缀，字典序即时间序）。 */
function migrationFiles(skip = []) {
  if (!existsSync(MIGRATIONS_DIR)) return []
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .filter((name) => !skip.some((pattern) => name.includes(pattern)))
    .sort()
    .map((name) => join(MIGRATIONS_DIR, name))
}

/** 读已应用列表。 */
async function appliedMigrations(db) {
  const rows = await db.query('select name from _local_migrations')
  return new Set(rows.rows.map((row) => row.name))
}

async function cmdReset(skip) {
  console.log(`重建本地库：${DATA_DIR}/`)
  const db = await openDb({ fresh: true })
  await bootstrap(db)
  console.log('跑全部迁移：')
  for (const file of migrationFiles(skip)) {
    await applySqlFile(db, file)
    await recordMigration(db, basename(file))
  }
  console.log('本地库就绪。')
  await db.close()
}

async function cmdMigrate(skip) {
  const db = await openDb()
  await bootstrap(db)
  const applied = await appliedMigrations(db)
  const pending = migrationFiles(skip).filter((file) => !applied.has(basename(file)))
  if (!pending.length) {
    console.log('没有待跑的迁移。')
    await db.close()
    return
  }
  console.log(`补跑 ${pending.length} 个迁移：`)
  for (const file of pending) {
    await applySqlFile(db, file)
    await recordMigration(db, basename(file))
  }
  await db.close()
}

async function cmdApply(file) {
  if (!existsSync(file)) {
    console.error(`找不到迁移文件：${file}`)
    process.exit(1)
  }
  const db = await openDb()
  await bootstrap(db)
  await applySqlFile(db, file)
  await recordMigration(db, basename(file))
  await db.close()
}

async function cmdQuery(sql) {
  const db = await openDb()
  try {
    const result = await db.query(sql)
    console.log(JSON.stringify(result.rows, null, 2))
  } catch (error) {
    console.error(String(error?.message ?? error))
    process.exitCode = 1
  }
  await db.close()
}

/**
 * 验收 Blockly 第一学期 80 关。
 *
 * 每条都是"期望值 vs 实际值"，不一致就红。
 * 这些断言来自迁移文件末尾的验收 SQL，另外补了几条迁移文件里没写的：
 * 单元结构、学期容量、以及"学习记录不能指向不存在的关卡"。
 */
async function cmdVerify() {
  const db = await openDb()
  const checks = [
    ['第一学期 80 关且都是真实正文', 80, `
      select count(*) n from module_level
      where module_id='blockly' and term_id='blk-g1-fall' and is_placeholder = false`],
    ['第一学期编号连续 1-80', 80, `
      select count(*) n from module_level
      where module_id='blockly' and term_id='blk-g1-fall' and sort_order between 1 and 80`],
    ['第一学期没有编号空洞', 80, `
      select count(distinct sort_order) n from module_level
      where module_id='blockly' and term_id='blk-g1-fall'`],
    ['5 个单元、每个 16 关', 5, `
      select count(*) n from (
        select unit_id from module_level
        where module_id='blockly' and term_id='blk-g1-fall'
        group by unit_id having count(*) = 16
      ) t`],
    ['学期容量改成 80 课 / 16 周', 80, `
      select level_cap n from module_term
      where module_id='blockly' and term_id='blk-g1-fall' and weeks = 16`],
    ['没有关卡游离在单元之外', 0, `
      select count(*) n from module_level
      where module_id='blockly' and (term_id is null or unit_id is null)`],
    ['正文里的 scene_type 与列一致', 0, `
      select count(*) n from module_level ml
      where ml.module_id='blockly' and ml.scene_type <> ml.body->>'scene_type'`],
    ['全部已发布', 0, `
      select count(*) n from module_level where module_id='blockly' and published = false`],
    ['每关都有正文、提示与积木表', 80, `
      select count(*) n from module_level
      where module_id='blockly' and term_id='blk-g1-fall'
        and body ? 'workspace' and body ? 'hints' and body ? 'available_blocks'`],
    ['后面三个学期换号成功且号段不重叠', 45, `
      select count(*) n from module_level
      where module_id='blockly' and is_placeholder = true
        and ((term_id='blk-g1-spring' and sort_order between 81 and 95)
          or (term_id='blk-g2-fall' and sort_order between 161 and 175)
          or (term_id='blk-g2-spring' and sort_order between 241 and 255))`],
    ['学习记录不指向不存在的关卡', 0, `
      select count(*) n from learning_record lr
      where lr.module_id='blockly'
        and not exists (
          select 1 from module_level ml
          where ml.module_id='blockly' and ml.level_id = lr.level_id
        )`],
  ]
  let failed = 0
  for (const [label, expected, sql] of checks) {
    const result = await db.query(sql)
    const actual = Number(result.rows[0]?.n ?? 0)
    const ok = actual === expected
    if (!ok) failed += 1
    console.log(`${ok ? '  PASS' : '  FAIL'} ${label}（期望 ${expected}，实际 ${actual}）`)
  }
  await db.close()
  console.log(failed === 0 ? '全部通过。' : `${failed} 项不通过。`)
  process.exitCode = failed === 0 ? 0 : 1
}

const [command, ...rest] = process.argv.slice(2)
// --skip <子串> 可以重复给，用来排除文件名匹配的迁移。
const skip = rest.filter((item, index) => rest[index - 1] === '--skip')
const positional = rest.filter((item, index) => item !== '--skip' && rest[index - 1] !== '--skip')
try {
  if (command === 'reset') await cmdReset(skip)
  else if (command === 'migrate') await cmdMigrate(skip)
  else if (command === 'apply') await cmdApply(positional[0])
  else if (command === 'query') await cmdQuery(positional.join(' '))
  else if (command === 'verify') await cmdVerify()
  else {
    console.log('用法：')
    console.log('  node scripts/local-db.mjs reset            重建本地库并跑完全部迁移')
    console.log('  node scripts/local-db.mjs reset --skip 15000 重建时跳过文件名含 15000 的迁移')
    console.log('  node scripts/local-db.mjs migrate          补跑没跑过的迁移')
    console.log('  node scripts/local-db.mjs apply <文件>     只跑指定的一个迁移文件')
    console.log('  node scripts/local-db.mjs query "<sql>"    跑一句查询并打印结果')
    console.log('  node scripts/local-db.mjs verify           验收 Blockly 第一学期 80 关')
  }
} catch (error) {
  console.error(String(error?.message ?? error))
  process.exit(1)
}
