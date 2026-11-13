import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect } from 'vite'
import { dispatch } from './routes'

export function attachApi(middlewares: Connect.Server) {
  middlewares.use(async (req, res, next) => {
    const url = req.url ?? ''
    if (!url.startsWith('/api/')) {
      next()
      return
    }
    const name = url.slice('/api/'.length).split('?')[0] ?? ''
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    let body: Record<string, unknown> = {}
    const raw = Buffer.concat(chunks).toString('utf8')
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Record<string, unknown>
      } catch {
        body = {}
      }
    }
    const nodeReq = req as IncomingMessage
    const nodeRes = res as ServerResponse
    try {
      const result = await dispatch({
        method: nodeReq.method ?? 'GET',
        name,
        header: (key) => {
          const value = nodeReq.headers[key.toLowerCase()]
          return Array.isArray(value) ? value[0] ?? null : value ?? null
        },
        body,
      })
      nodeRes.statusCode = result.status
      if (result.status !== 204) {
        nodeRes.setHeader('content-type', 'application/json; charset=utf-8')
        nodeRes.end(JSON.stringify(result.body ?? {}))
      } else {
        nodeRes.end()
      }
    } catch (error) {
      console.error('api middleware failed', error instanceof Error ? error.message : error)
      nodeRes.statusCode = 500
      nodeRes.setHeader('content-type', 'application/json; charset=utf-8')
      nodeRes.end(JSON.stringify({ message: '请求失败' }))
    }
  })
}
