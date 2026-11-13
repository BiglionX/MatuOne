import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let sql: NeonQueryFunction<false, false> | null = null
let ready: Promise<void> | null = null

function unquote(value: string): string {
  const trimmed = value.trim()
  const first = trimmed.charCodeAt(0)
  const last = trimmed.charCodeAt(trimmed.length - 1)
  if (trimmed.length >= 2 && first === last && (first === 34 || first === 39)) return trimmed.slice(1, -1)
  return trimmed
}

function loadDatabaseUrl(): string {
  const fromEnv = unquote(process.env.DATABASE_URL ?? '')
  if (fromEnv) return normalize(fromEnv)
  try {
    const raw = readFileSync(join(process.cwd(), '.env'), 'utf8')
    const matched = raw.match(/DATABASE_URL="([^"]+)"/) ?? raw.match(/DATABASE_URL=(\S+)/)
    if (matched?.[1]) return normalize(matched[1])
  } catch {
    // Vercel 上由环境变量提供，本地没有 .env 时走下面的错误。
  }
  throw new Error('missing DATABASE_URL')
}

function normalize(connectionString: string): string {
  const url = new URL(connectionString)
  url.searchParams.delete('channel_binding')
  return url.toString()
}

function getSql(): NeonQueryFunction<false, false> {
  if (!sql) sql = neon(loadDatabaseUrl())
  return sql
}

export async function q<T extends Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSessionTable()
  const rows = await getSql().query(text, params)
  return rows as T[]
}

export async function one<T extends Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params)
  return rows[0] ?? null
}

export async function ensureSessionTable(): Promise<void> {
  if (!ready) {
    ready = getSql()
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
