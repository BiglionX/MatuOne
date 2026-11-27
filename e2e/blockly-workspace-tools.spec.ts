import { expect, test } from '@playwright/test'
import { loginStudent } from './auth-fixtures'

/**
 * 工作区右侧工具条回归：放大 / 缩小 / 摆正 / 清空。
 *
 * Blockly 原生的缩放控件和垃圾桶都挂在画布右侧，直接压住积木，
 * 现在改成工作区窗体右侧外面的一条工具条。这个用例守住两件事：
 * 1. 原生控件不许再冒出来；
 * 2. 工具条上的四个按钮都真的能动。
 *
 * 跑法：需要一个开发服务器（读缩放比例要用开发模式下的工作区探针）：
 *   E2E_BASE_URL=http://127.0.0.1:5175 npx playwright test e2e/blockly-workspace-tools.spec.ts
 */

const ART_DIR = '_brand'

test('工作区右侧工具条：原生控件消失，四个按钮都能用', async ({ page }) => {
  test.setTimeout(240_000)

  await loginStudent(page)
  await page.goto('/blockly/lesson/blk-161')
  await page.waitForSelector('.matu-story-backdrop', { state: 'attached', timeout: 120_000 })

  // 绘本翻到底，再进关卡
  const next = page.getByRole('button', { name: '下一页' })
  for (let i = 0; i < 12 && (await next.count()) > 0; i += 1) {
    await next.click().catch(() => undefined)
    await page.waitForTimeout(450)
  }
  const start = page.getByRole('button', { name: '开始挑战' })
  if (await start.count()) await start.click()
  await page.waitForSelector('svg.blocklySvg', { state: 'attached', timeout: 120_000 })
  await page.waitForTimeout(1500)

  // 探针只在开发模式下挂载，生产预览里读不到缩放比例就跳过数值断言。
  const hasProbe = await page.evaluate(() =>
    Boolean((window as unknown as { __matuBlocklyWorkspace?: unknown }).__matuBlocklyWorkspace),
  )
  if (!hasProbe) {
    test.skip(true, '需要开发服务器：缩放比例要用开发模式下的 Blockly 工作区探针')
  }

  const tools = page.locator('div[aria-label="工作区工具"]')
  await expect(tools).toBeVisible()
  await expect(tools.locator('button')).toHaveCount(4)

  // 原生缩放控件和垃圾桶必须已经关掉，不能再压在积木上
  expect(await page.locator('.blocklyZoomControls').count()).toBe(0)
  expect(await page.locator('.blocklyTrashcan').count()).toBe(0)

  const scale = () =>
    page.evaluate(() => {
      const ws = (window as never as { __matuBlocklyWorkspace?: any }).__matuBlocklyWorkspace
      return ws?.getScale?.()
    })

  const before = await scale()
  await page.getByRole('button', { name: '放大积木' }).click()
  await page.waitForTimeout(350)
  const zoomedIn = await scale()
  expect(zoomedIn).toBeGreaterThan(before)

  await page.getByRole('button', { name: '缩小积木' }).click()
  await page.waitForTimeout(350)
  const zoomedOut = await scale()
  expect(zoomedOut).toBeLessThan(zoomedIn)

  await page.getByRole('button', { name: '把积木摆进视野' }).click()
  await page.waitForTimeout(500)
  expect(Number.isFinite(await scale())).toBe(true)

  // 摆一块积木进去，验证「清空」两段式真的清得掉
  await page.evaluate(() => {
    const ws = (window as never as { __matuBlocklyWorkspace?: any }).__matuBlocklyWorkspace
    const block = ws.newBlock('set_variable')
    block.initSvg()
    block.queueRender()
  })
  await page.waitForTimeout(400)
  const countBlocks = () =>
    page.evaluate(() => {
      const ws = (window as never as { __matuBlocklyWorkspace?: any }).__matuBlocklyWorkspace
      return ws?.getAllBlocks?.(false)?.length ?? 0
    })
  const beforeClear = await countBlocks()
  await page.getByRole('button', { name: '清空积木' }).click()
  await page.waitForTimeout(250)
  await expect(page.getByRole('button', { name: '再点一次就清空积木' })).toBeVisible()
  expect(await countBlocks()).toBe(beforeClear)
  await page.getByRole('button', { name: '再点一次就清空积木' }).click()
  await page.waitForTimeout(500)
  expect(await countBlocks()).toBe(0)

  await page.screenshot({ path: `${ART_DIR}/final-accept-workspace-tools-desktop.png` })

  // 移动端：工具条改成横排，落在工作区下方
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(900)
  const mobileZoom = page.getByRole('button', { name: '放大积木' })
  await mobileZoom.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${ART_DIR}/final-accept-workspace-tools-mobile.png`, fullPage: false })
})
