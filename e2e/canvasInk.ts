import { expect, type Page } from '@playwright/test'

export interface CanvasInk {
  ink: number
  bw: number
  bh: number
  w: number
  h: number
}

/** 读画布上非白色像素的范围。真实 Pyodide 画出的线用这个核对，不再看 SVG。 */
export async function readCanvasInk(page: Page): Promise<CanvasInk> {
  return page.getByRole('img', { name: '程序运行结果' }).evaluate((el) => {
    const canvas = el as HTMLCanvasElement
    const ctx = canvas.getContext('2d')
    if (!ctx) return { ink: 0, bw: 0, bh: 0, w: 0, h: 0 }
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let minX = width
    let maxX = 0
    let minY = height
    let maxY = 0
    let ink = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 20) continue
      if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) continue
      ink += 1
      const p = i / 4
      const x = p % width
      const y = Math.floor(p / width)
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    if (ink === 0) return { ink: 0, bw: 0, bh: 0, w: width, h: height }
    return { ink, bw: maxX - minX, bh: maxY - minY, w: width, h: height }
  })
}

export async function expectCanvasDrawn(page: Page): Promise<CanvasInk> {
  const canvas = page.getByRole('img', { name: '程序运行结果' })
  await expect(canvas).toBeVisible({ timeout: 90_000 })
  await expect.poll(async () => (await readCanvasInk(page)).ink, { timeout: 90_000 }).toBeGreaterThan(20)
  return readCanvasInk(page)
}
