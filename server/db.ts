import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const INT_TYPES = new Set([20, 21, 23])
const FLOAT_TYPES = new Set([700, 701, 1700])

interface SqlField {
  name: string
  dataTypeID: number
}

interface SqlPayload {
  fields?: SqlField[]
  rows?: unknown[]
  message?: string
}

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

function prepare(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'undefined') return null
  return value
}

function coerce(value: unknown, dataTypeID: number): unknown {
  if (value === null || value === undefined) return null
  if (dataTypeID === 16) return value === true || value === 't' || value === 'true'
  if (INT_TYPES.has(dataTypeID) || FLOAT_TYPES.has(dataTypeID)) {
    const number = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(number) ? number : value
  }
  return value
}

function rowsOf(payload: SqlPayload): Record<string, unknown>[] {
  const fields = payload.fields ?? []
  return (payload.rows ?? []).map((row) => {
    if (Array.isArray(row)) {
      const record: Record<string, unknown> = {}
      fields.forEach((field, index) => {
        record[field.name] = coerce(row[index], field.dataTypeID)
      })
      return record
    }
    const record = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    for (const field of fields) record[field.name] = coerce(record[field.name], field.dataTypeID)
    return record
  })
}

async function run(text: string, params: unknown[]): Promise<Record<string, unknown>[]> {
  const connectionString = loadDatabaseUrl()
  const host = new URL(connectionString).hostname.replace(/^[^.]+/, 'api')
  const response = await fetch(`https://${host}/sql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'neon-connection-string': connectionString,
      'neon-raw-text-output': 'true',
      'neon-array-mode': 'true',
    },
    body: JSON.stringify({ query: text, params: params.map(prepare) }),
  })
  const raw = await response.text()
  let payload: SqlPayload = {}
  if (raw) {
    try {
      payload = JSON.parse(raw) as SqlPayload
    } catch {
      payload = { message: raw }
    }
  }
  if (!response.ok) {
    const message = payload.message?.replace(/postgres(?:ql)?:\/\/\S+/gi, '').trim() || `数据库 HTTP ${response.status}`
    throw new Error(message.slice(0, 180))
  }
  return rowsOf(payload)
}

export async function q<T extends Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSessionTable()
  return (await run(text, params)) as T[]
}

export async function one<T extends Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params)
  return rows[0] ?? null
}

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

export function dbMessage(error: unknown): string {
  return error instanceof Error ? error.message : ''
}
