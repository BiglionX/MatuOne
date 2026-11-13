import { dispatch } from '../server/routes'

export default async function handler(
  req: { method?: string; query?: { name?: string }; headers: Record<string, string | string[] | undefined>; body?: unknown },
  res: { status: (code: number) => { json: (body: unknown) => void; end: () => void } },
) {
  const name = String(req.query?.name ?? '')
  const parsed = req.body
  const body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
  const result = await dispatch({
    method: req.method ?? 'GET',
    name,
    header: (key) => {
      const value = req.headers[key.toLowerCase()]
      return Array.isArray(value) ? value[0] ?? null : value ?? null
    },
    body,
  })
  if (result.status === 204) {
    res.status(204).end()
    return
  }
  res.status(result.status).json(result.body ?? {})
}
