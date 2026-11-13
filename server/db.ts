import { readFileSync } from 'node:fs'
import pg from 'pg'

let pool: pg.Pool | null = null
let ready: Promise<void> | null = null

function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    const matched = raw.match(/DATABASE_URL="([^"]+)"/) ?? raw.match(/DATABASE_URL=(\S+)/)
    if (matched?.[1]) {
      process.env.DATABASE_URL = matched[1]
      return matched[1]
    }
  } catch {
    // Vercel 上由环境变量提供，本地没有 .env 时走下面的错误。
  }
  throw new Error('missing DATABASE_URL')
}

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: loadDatabaseUrl(), max: 1 })
  }
  return pool
}

export async function q<T extends pg.QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSessionTable()
  const result = await getPool().query<T>(text, params)
  return result.rows
}

export async function one<T extends pg.QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params)
  return rows[0] ?? null
}

export async function ensureSessionTable(): Promise<void> {
  if (!ready) {
    ready = getPool()
      .query(
        `create table if not exists public.app_session (
          token_hash text primary key,
          role text not null,
          subject_id uuid not null,
          expires_at timestamptz not null,
          created_at timestamptz not null default now()
        )`,
      )
      .then(() => undefined)
  }
  await ready
}

export function dbMessage(error: unknown): string {
  return error instanceof Error ? error.message : ''
}
