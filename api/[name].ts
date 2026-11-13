import { dispatch } from '../server/routes'

export const config = { maxDuration: 30 }

export default async function handler(
  req: { method?: string; query?: { name?: string | string[] }; headers: Record<string, string | string[] | undefined>; body?: unknown },
  res: { status: (code: number) => { json: (body: unknown) => void; end: () => void } },
) {
  try {
    const queryName = req.query?.name
    const name = Array.isArray(queryName) ? queryName[0] ?? '' : String(queryName ?? '')
    const result = await dispatch({
      method: req.method ?? 'GET',
      name,
      header: (key) => {
        const value = req.headers[key.toLowerCase()]
        return Array.isArray(value) ? value[0] ?? null : value ?? null
      },
      body: readBody(req.body),
    })
    if (result.status === 204) {
      res.status(204).end()
      return
    }
    res.status(result.status).json(result.body ?? {})
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求失败'
    res.status(500).json({ message: message.slice(0, 160) || '请求失败' })
  }
}

function readBody(parsed: unknown): Record<string, unknown> {
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown
    } catch {
      return {}
    }
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
  return {}
}
