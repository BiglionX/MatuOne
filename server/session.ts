import { createHash, randomBytes } from 'node:crypto'
import { one, q } from './db'

export type SessionRole = 'org' | 'student' | 'platform' | 'parent'

export interface Session {
  role: SessionRole
  subjectId: string
}

export async function issueSession(role: SessionRole, subjectId: string): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(accessToken).digest('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await q('insert into public.app_session (token_hash, role, subject_id, expires_at) values ($1, $2, $3, $4)', [
    tokenHash,
    role,
    subjectId,
    expiresAt,
  ])
  return { accessToken, refreshToken: accessToken }
}

export async function readSession(authorization: string | null): Promise<Session | null> {
  const token = authorization?.replace(/^Bearer\s+/i, '').trim() ?? ''
  if (!token) return null
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const row = await one<{ role: SessionRole; subject_id: string }>(
    'select role, subject_id from public.app_session where token_hash = $1 and expires_at > now()',
    [tokenHash],
  )
  if (!row) return null
  return { role: row.role, subjectId: row.subject_id }
}
