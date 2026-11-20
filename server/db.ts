import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Pool, types } from 'pg'
import type { PoolConfig } from 'pg'

type QueryRow = Record<string, unknown>

/**
 * 旧的 HTTP SQL 通道用 neon-raw-text-output 把所有值当文本返回，再按 OID 手工还原类型。
 * 换成 pg 之后这里补同样的还原，保证服务端和前端拿到的形状不变。
 */
const OID_INT8 = 20
const OID_NUMERIC = 1700
const OID_DATE = 1082
const OID_TIMESTAMP = 1114
const OID_TIMESTAMPTZ = 1184

/** Postgres 的 timestamptz 文本带时区偏移，转成前端能直接 new Date() 的 ISO 串。 */
function toIso(text: string): string {
  const normalized = text.trim().replace(' ', 'T')
  const withZone = /[Zz]$/.test(normalized) ? normalized : normalized.replace(/([+-]\d{2})$/, '$1:00')
  const parsed = new Date(withZone)
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString()
}

const customTypes = {
  getTypeParser(oid: number, format?: unknown) {
    switch (oid) {
      case OID_INT8:
      case OID_NUMERIC:
        return (value: string) => Number(value)
      case OID_DATE:
        return (value: string) => value
      case OID_TIMESTAMP:
        return (value: string) => value.replace(' ', 'T')
      case OID_TIMESTAMPTZ:
        return (value: string) => toIso(value)
      default:
        return types.getTypeParser(oid, format as never)
    }
  },
}

let pool: Pool | null = null

function unquote(value: string): string {
  const trimmed = value.trim()
  const first = trimmed.charCodeAt(0)
  const last = trimmed.charCodeAt(trimmed.length - 1)
  if (trimmed.length >= 2 && first === last && (first === 34 || first === 39)) return trimmed.slice(1, -1)
  return trimmed
}

function readEnvFile(): Record<string, string> {
  try {
    const raw = readFileSync(join(process.cwd(), '.env'), 'utf8')
    const values: Record<string, string> = {}
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const matched = /^([A-Za-z0-9_]+)=(.*)$/.exec(trimmed)
      if (matched?.[1]) values[matched[1]] = unquote(matched[2] ?? '')
    }
    return values
  } catch {
    // Vercel 和自建服务器都由环境变量提供，本地没有 .env 时走下面的错误。
    return {}
  }
}

/** pg 不认 channel_binding，保留它会直接连不上。 */
function normalize(connectionString: string): string {
  const url = new URL(connectionString)
  url.searchParams.delete('channel_binding')
  if (!url.searchParams.get('sslmode')) url.searchParams.set('sslmode', 'require')
  return url.toString()
}

function connectionString(): string {
  const pooler = unquote(process.env.DATABASE_URL_POOLER ?? '')
  if (pooler) return normalize(pooler)
  const fallback = unquote(process.env.DATABASE_URL ?? '')
  if (fallback) {
    console.warn('[db] 没有 DATABASE_URL_POOLER，先用 DATABASE_URL 顶着')
    return normalize(fallback)
  }
  const file = readEnvFile()
  const filePooler = file.DATABASE_URL_POOLER ?? ''
  if (filePooler) return normalize(filePooler)
  const fileUrl = file.DATABASE_URL ?? ''
  if (fileUrl) {
    console.warn('[db] .env 里没有 DATABASE_URL_POOLER，先用 DATABASE_URL 顶着')
    return normalize(fileUrl)
  }
  throw new Error('missing DATABASE_URL_POOLER')
}

function createPool(): Pool {
  const config: PoolConfig = {
    connectionString: connectionString(),
    // Neon pooler 对同一客户端的并发连接会递增延迟并最终重置（实测：第 2 条 2.7s、第 3 条 10.7s、第 4 条 17.5s，之后 ECONNRESET）。
    // 所以只能开 1 条连接，全站查询在它上面串行跑。
    max: 1,
    // 建一条连接要 2~4 秒。空闲 30 秒就关的话，下一个请求又要重新握手，所以要留得比保活周期还长。
    idleTimeoutMillis: 300_000,
    connectionTimeoutMillis: 5_000,
    // 注意：startup packet 里的 options 参数会被 Neon 拒掉，所以不能在这里挂 statement_cache_mode。
    // pg 默认用 unnamed statement，PgBouncer transaction 模式下不会串库。
    types: customTypes,
  }
  const instance = new Pool(config)
  // Neon 会掐掉空闲连接，不接住这个 error 会变成进程级未捕获异常。
  instance.on('error', (error: Error) => {
    console.error('[db] 空闲连接异常：', error.message)
  })
  // 提前把连接建好。TLS 握手要 2 秒多，放到后台做，首个请求就不用等。
  void instance
    .connect()
    .then((client) => {
      client.release()
    })
    .catch((error: unknown) => {
      console.error('[db] 预热连接失败：', error instanceof Error ? error.message : error)
    })
  return instance
}

function getPool(): Pool {
  if (!pool) pool = createPool()
  return pool
}

function prepare(value: unknown): unknown {
  if (typeof value === 'undefined') return null
  return value
}

/** 唯一的查询出口。服务端所有 SQL 都从这里走。 */
export async function query<T extends QueryRow = QueryRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query<T>(text, params.map(prepare))
  return result.rows as T[]
}

const RETRYABLE = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'EHOSTUNREACH',
  'ENETUNREACH',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '08P01',
  '57P01',
  '53300',
  '40001',
])

function retryable(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code
  if (typeof code === 'string' && RETRYABLE.has(code)) return true
  const message = error instanceof Error ? error.message : String(error)
  return /terminated|connection ended|server closed the connection|timeout|ECONNRESET/i.test(message)
}

async function run<T extends QueryRow>(text: string, params: unknown[]): Promise<T[]> {
  let last: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await query<T>(text, params)
    } catch (error) {
      last = error
      if (!retryable(error) || attempt === 2) break
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
    }
  }
  throw last
}

export async function q<T extends QueryRow>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSessionTable()
  return run<T>(text, params)
}

export async function one<T extends QueryRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params)
  return rows[0] ?? null
}

let ready: Promise<void> | null = null

export async function ensureSessionTable(): Promise<void> {
  if (!ready) {
    ready = run(
      `create table if not exists public.app_session (
        token_hash text primary key,
        role text not null,
        subject_id uuid not null,
        expires_at timestamptz not null,
        created_at timestamptz not null default now()
      )`,
      [],
    )
      .then(() => undefined)
      .catch((error: unknown) => {
        ready = null
        throw error
      })
  }
  await ready
}

/** e2e 结束时关掉连接池，否则 Node 会被空闲 socket 挂住不退出。 */
export async function closePool(): Promise<void> {
  if (!pool) return
  const current = pool
  pool = null
  await current.end()
}

export function dbMessage(error: unknown): string {
  return error instanceof Error ? error.message : ''
}
