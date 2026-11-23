import { expect, test } from '@playwright/test'

/**
 * MatuPix 积木搭建冒烟：进页、本机草稿文案、魔法模型、草稿落盘、导出、刷新恢复。
 * 不连业务库，只打前端本地路由。
 */
const DRAFT_KEY = 'matupix.brick.draft.v1'

test.describe('MatuPix 积木搭建', () => {
  test('进页可见本机草稿说明，魔法模型可落草稿并导出', async ({ page }) => {
    test.setTimeout(120_000)

    // 只清一次：不要用 addInitScript，否则 reload 时会把刚写入的草稿再抹掉。
    await page.goto('/matupix')
    await page.evaluate((key) => {
      try {
        localStorage.removeItem(key)
      } catch {
        // 隐私模式忽略。
      }
    }, DRAFT_KEY)

    await page.goto('/matupix/brick')
    await expect(page.getByRole('heading', { name: '积木搭建' })).toBeVisible()
    await expect(page.getByText('草稿只留在本机')).toBeVisible()
    await expect(page.getByText(/不会上传/)).toBeVisible()

    const root = page.locator('[data-brick-count]')
    await expect(root).toHaveAttribute('data-brick-count', '0')

    await page.getByRole('button', { name: '魔法模型' }).click()
    await expect(page.getByRole('dialog', { name: '魔法模型' })).toBeVisible()
    await expect(page.getByRole('button', { name: '机器人' })).toBeVisible({ timeout: 60_000 })
    await page.getByRole('button', { name: '机器人' }).click()

    await expect(root).not.toHaveAttribute('data-brick-count', '0', { timeout: 60_000 })
    const countAfterMagic = Number(await root.getAttribute('data-brick-count'))
    expect(countAfterMagic).toBeGreaterThan(0)

    await expect
      .poll(async () => {
        return page.evaluate((key) => {
          const raw = localStorage.getItem(key)
          if (!raw) return 0
          try {
            const data = JSON.parse(raw) as { bricks?: unknown[] }
            return Array.isArray(data.bricks) ? data.bricks.length : 0
          } catch {
            return 0
          }
        }, DRAFT_KEY)
      }, { timeout: 10_000 })
      .toBe(countAfterMagic)

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
    await page.getByRole('button', { name: '导出 LDraw' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('matupix-brick.ldr')
    await expect
      .poll(async () => (await root.getAttribute('data-last-ldr')) ?? '', { timeout: 15_000 })
      .toMatch(/^0 /)

    await page.reload()
    await expect(page.getByRole('heading', { name: '积木搭建' })).toBeVisible()
    await expect(page.locator('[data-brick-count]')).toHaveAttribute(
      'data-brick-count',
      String(countAfterMagic),
      { timeout: 30_000 },
    )
  })
})
