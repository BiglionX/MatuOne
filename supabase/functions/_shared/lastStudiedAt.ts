/**
 * 最近学习时间三链（纯计算，无 DB）。
 * study_session.started_at → learning_record.updated_at → typing_record.created_at；均无则 null。
 */

function maxIso(values: Iterable<string | null | undefined>): string | null {
  let best: string | null = null
  let bestMs = Number.NEGATIVE_INFINITY
  for (const raw of values) {
    if (raw == null) continue
    const text = String(raw).trim()
    if (!text) continue
    const ms = new Date(text).getTime()
    if (!Number.isFinite(ms)) continue
    if (ms >= bestMs) {
      bestMs = ms
      best = text
    }
  }
  return best
}

export type LastStudiedAtInput = {
  sessionStartedAts?: Iterable<string | null | undefined>
  learningUpdatedAts?: Iterable<string | null | undefined>
  typingCreatedAts?: Iterable<string | null | undefined>
}

/** 单学生：优先 session，其次 learning，再次 typing。 */
export function resolveLastStudiedAt(input: LastStudiedAtInput): string | null {
  return (
    maxIso(input.sessionStartedAts ?? []) ??
    maxIso(input.learningUpdatedAts ?? []) ??
    maxIso(input.typingCreatedAts ?? [])
  )
}

type StudentTsRow = { student_id: string; at: string }

function maxByStudent(rows: StudentTsRow[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const row of rows) {
    const prev = map.get(row.student_id)
    if (!prev) {
      map.set(row.student_id, row.at)
      continue
    }
    const a = new Date(prev).getTime()
    const b = new Date(row.at).getTime()
    if (Number.isFinite(b) && (!Number.isFinite(a) || b >= a)) map.set(row.student_id, row.at)
  }
  return map
}

/**
 * 批量：对各学生分别走三链。调用方传入已查到的时间戳行，避免重复打库。
 */
export function aggregateLastStudiedAtByStudent(input: {
  studentIds: string[]
  sessions?: { student_id: string; started_at: string | null | undefined }[]
  learning?: { student_id: string; updated_at: string | null | undefined }[]
  typing?: { student_id: string; created_at: string | null | undefined }[]
}): Map<string, string | null> {
  const sessions = maxByStudent(
    (input.sessions ?? []).flatMap((row) => {
      const at = row.started_at == null ? '' : String(row.started_at).trim()
      return at ? [{ student_id: row.student_id, at }] : []
    }),
  )
  const learning = maxByStudent(
    (input.learning ?? []).flatMap((row) => {
      const at = row.updated_at == null ? '' : String(row.updated_at).trim()
      return at ? [{ student_id: row.student_id, at }] : []
    }),
  )
  const typing = maxByStudent(
    (input.typing ?? []).flatMap((row) => {
      const at = row.created_at == null ? '' : String(row.created_at).trim()
      return at ? [{ student_id: row.student_id, at }] : []
    }),
  )
  const out = new Map<string, string | null>()
  for (const id of input.studentIds) {
    out.set(id, sessions.get(id) ?? learning.get(id) ?? typing.get(id) ?? null)
  }
  return out
}
