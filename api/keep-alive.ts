import { query } from '../server/db'

export const config = { runtime: 'nodejs' }

/**
 * 保活端点。Vercel cron 和自建服务器的定时任务都打这里，
 * 目的有两个：不让 Neon compute 自动挂起，也让本机的 pg 连接池保持热连接。
 */
export default async function handler(request: Request): Promise<Response> {
  if (!authorized(request)) return json({ ok: false, message: 'unauthorized' }, 401)
  const started = Date.now()
  try {
    await query('select 1 as ok')
    return json({ ok: true, ms: Date.now() - started })
  } catch (error) {
    const message = error instanceof Error ? error.message : '数据库不通'
    return json({ ok: false, message: message.slice(0, 180), ms: Date.now() - started }, 500)
  }
}

/** 配了 CRON_SECRET 就必须带对 token，避免这个端点被人随便刷。 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return (request.headers.get('authorization') ?? '') === `Bearer ${secret}`
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
