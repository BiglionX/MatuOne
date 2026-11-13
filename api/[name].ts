type NodeResult = { status: (code: number) => { json: (body: unknown) => void; end: () => void } }
type RawResult = { writeHead: (code: number, headers: Record<string, string>) => void; end: (body?: string) => void }

export default async function handler(req: RequestLike, res?: NodeResult | RawResult): Promise<Response | void> {
  try {
    const { dispatch } = await import('../server/routes')
    const result = await dispatch(await readRequest(req))
    return send(res, result.status, result.body)
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求失败'
    return send(res, 500, { message: message.slice(0, 180) || '请求失败' })
  }
}

interface RequestLike {
  method?: string
  url?: string
  query?: { name?: string | string[] }
  headers?: { get?: (name: string) => string | null } & Record<string, string | string[] | undefined>
  body?: unknown
  json?: () => Promise<unknown>
}

async function readRequest(req: RequestLike) {
  return {
    method: req.method ?? 'GET',
    name: functionName(req),
    header: (key: string) => headerOf(req, key),
    body: await bodyOf(req),
  }
}

function functionName(req: RequestLike): string {
  const queryName = req.query?.name
  if (Array.isArray(queryName)) return queryName[0] ?? ''
  if (typeof queryName === 'string' && queryName) return queryName
  if (!req.url) return ''
  try {
    const path = new URL(req.url, 'http://localhost').pathname
    return path.split('/').filter(Boolean).pop() ?? ''
  } catch {
    return ''
  }
}

function headerOf(req: RequestLike, key: string): string | null {
  if (typeof req.headers?.get === 'function') return req.headers.get(key)
  const value = req.headers?.[key.toLowerCase()]
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

async function bodyOf(req: RequestLike): Promise<Record<string, unknown>> {
  if (typeof req.json === 'function' && isWebBody(req.body)) {
    try {
      return asRecord(await req.json())
    } catch {
      return {}
    }
  }
  return asRecord(req.body)
}

function isWebBody(body: unknown): boolean {
  return body == null || typeof body === 'string' || (typeof body === 'object' && body !== null && 'getReader' in body)
}

function asRecord(parsed: unknown): Record<string, unknown> {
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown
    } catch {
      return {}
    }
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && !('getReader' in parsed)) return parsed as Record<string, unknown>
  return {}
}

function send(res: NodeResult | RawResult | undefined, status: number, body: unknown): Response | void {
  if (status === 204) {
    if (res && 'status' in res && typeof res.status === 'function') {
      res.status(204).end()
      return
    }
    if (res && 'writeHead' in res) {
      res.writeHead(204, {})
      res.end()
      return
    }
    return new Response(null, { status: 204 })
  }
  const payload = body ?? {}
  if (res && 'status' in res && typeof res.status === 'function') {
    res.status(status).json(payload)
    return
  }
  const json = JSON.stringify(payload)
  if (res && 'writeHead' in res) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
    res.end(json)
    return
  }
  return new Response(json, { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
}
