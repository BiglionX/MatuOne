import type { Page, TestInfo } from '@playwright/test'

const buckets = new WeakMap<Page, string[]>()

/** 记下失败的接口响应。测试失败时把状态码和响应体打出来。 */
export function watchApi(page: Page): void {
  if (buckets.has(page)) return
  const lines: string[] = []
  buckets.set(page, lines)
  page.on('response', (response) => {
    const url = response.url()
    if (!url.includes('/api/')) return
    if (response.ok()) return
    void response
      .text()
      .then((body) => {
        lines.push(`${response.request().method()} ${response.status()} ${url}\n${body.slice(0, 2000)}`)
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : '无法读取响应体'
        lines.push(`${response.request().method()} ${response.status()} ${url}\n${message}`)
      })
  })
  page.on('requestfailed', (request) => {
    const url = request.url()
    if (!url.includes('/api/') && !url.includes('matuone.vercel.app')) return
    lines.push(`NO_RESPONSE ${request.method()} ${url}\n${request.failure()?.errorText ?? '连接失败'}`)
  })
}

export function reportApi(page: Page | undefined, info: TestInfo): void {
  if (!page || info.status === info.expectedStatus) return
  const lines = buckets.get(page) ?? []
  if (!lines.length) return
  console.log(`\n[失败接口] ${info.title}\n${lines.join('\n---\n')}`)
}
