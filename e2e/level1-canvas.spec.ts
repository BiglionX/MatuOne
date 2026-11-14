import { expect, test, type Page } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expectCanvasDrawn } from './canvasInk'
import { q } from '../server/db'

function drillOf(order: number): string {
  const dir = join(process.cwd(), 'content', 'courses', 'level1')
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue
    const pack = JSON.parse(readFileSync(join(dir, name), 'utf8')) as {
      levels: { order: number; drill_chunk?: string }[]
    }
    const found = pack.levels.find((level) => level.order === order)
    if (found?.drill_chunk) return found.drill_chunk
  }
  return ''
}

/**
 * 前 20 关走真实预览和 Pyodide 画布。
 * 另外截第 23、82、101、105、120 关，方便肉眼分辨六边形、花、台阶和房子。
 */
const SWEEP = Array.from({ length: 20 }, (_, index) => index + 1)
const EXTRA = [23, 82, 101, 105, 120]
const ORDERS = [...SWEEP, ...EXTRA]

test('L1 画布巡检：前 20 关有线且缩在画面内', async ({ page }) => {
  test.setTimeout(900_000)
  const before = await q<{ sort_order: number; preview_frozen: boolean }>(
    `select sort_order, preview_frozen
     from public.course_level
     where sort_order between 1 and 20
        or sort_order in (23, 82, 101, 105, 120)
     order by sort_order`,
  )
  await q(
    `update public.course_level
     set preview_frozen = false
     where sort_order between 1 and 20
        or sort_order in (23, 82, 101, 105, 120)`,
  )
  await mkdir('e2e/screenshots/level1', { recursive: true })
  try {
    await page.goto('/admin/login')
    await page.getByLabel('账号').fill('ops')
    await page.getByLabel('密码').fill('OpsDemo12345')
    await page.getByRole('button', { name: '进入后台' }).click()
    await expect(page).toHaveURL(/\/admin\/dashboard$/)

    let first = true
    for (const order of ORDERS) {
      const levelId = `L${String(order).padStart(4, '0')}`
      await openPreview(page, levelId, first)
      first = false
      const recall = page.getByRole('heading', { name: '先把上一节的这一串遮住打一遍' })
      const lesson = page.getByRole('heading', { name: new RegExp(`第 ${order} 关`) })
      await expect(recall.or(lesson)).toBeVisible({ timeout: 30_000 })
      if (await recall.isVisible()) {
        const chunk = drillOf(order - 1)
        expect(chunk, `第 ${order} 关要复习的组块`).toBeTruthy()
        await page.getByLabel('组块打字').fill(chunk ?? '')
      }
      await expect(lesson).toBeVisible()
      const storySkip = page.getByRole('button', { name: '跳过' })
      if (await storySkip.isVisible()) await storySkip.click()
      await expect(page.getByText('这一关要做什么')).toHaveCount(0)
      await expect(page.getByText('出了点小问题')).toHaveCount(0)
      const ink = await expectCanvasDrawn(page)
      expect(Math.max(ink.bw, ink.bh), `${levelId} 尺寸`).toBeGreaterThan(8)
      expect(ink.minX, `${levelId} 左边距`).toBeGreaterThan(1)
      expect(ink.minY, `${levelId} 上边距`).toBeGreaterThan(1)
      expect(ink.maxX, `${levelId} 右边距`).toBeLessThan(ink.w - 2)
      expect(ink.maxY, `${levelId} 下边距`).toBeLessThan(ink.h - 2)
      await page.getByRole('img', { name: '程序运行结果' }).screenshot({
        path: `e2e/screenshots/level1/${levelId}.png`,
      })
    }
  } finally {
    for (const row of before) {
      await q('update public.course_level set preview_frozen = $2 where sort_order = $1', [
        row.sort_order,
        row.preview_frozen,
      ])
    }
  }
})

async function openPreview(page: Page, levelId: string, first: boolean) {
  const path = `/student/lesson/${levelId}?preview=true`
  if (first) {
    await page.goto(path)
    return
  }
  await page.evaluate((next) => {
    window.history.pushState(null, '', next)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
}
