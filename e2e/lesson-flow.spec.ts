import { expect, test, type Page } from '@playwright/test'
import { LEVELS } from '../src/mock/levels'
import { expectCanvasDrawn, readCanvasInk } from './canvasInk'
import { reportApi, watchApi } from './api-log'

/**
 * 试用学生进不了第 5、6 关，这两项仍用课程夹具挡住接口。
 * 画图已经走真实 Pyodide，画布是 Canvas，不再断言 SVG。
 */

const STUDENT = {
  id: 'S-e2e',
  orgId: 'org-e2e',
  groupId: 'g-e2e',
  name: '测试同学',
  account: 'e2e',
  status: 'active',
  currentLevelOrder: 5,
  lastActiveAt: '2026-11-13T00:00:00.000Z',
  bindCode: 'E2E',
  password: '',
}

async function openLevel(page: Page, levelId: string) {
  const level = LEVELS.find((item) => item.level_id === levelId)
  if (!level) throw new Error(`缺少 ${levelId}`)

  await page.addInitScript((student) => {
    localStorage.setItem('cdg.auth.student', 'e2e-token')
    localStorage.setItem('cdg.session.student', JSON.stringify(student))
  }, STUDENT)

  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const url = route.request().url()
    let body: { action?: string; levelId?: string } = {}
    try {
      body = route.request().postDataJSON() as { action?: string; levelId?: string }
    } catch {
      body = {}
    }
    if (url.includes('student-enter-level')) {
      await route.fulfill({ json: { allowed: true, reason: 'ok' } })
      return
    }
    if (url.includes('student-learning') && body.action === 'level') {
      await route.fulfill({ json: { level, hints: [] } })
      return
    }
    await route.fulfill({ json: { ok: true, hints: [] } })
  })

  await page.goto(`/student/lesson/${levelId}`)
  await page.getByRole('button', { name: '跳过' }).click()
}

test.beforeEach(async ({ page }) => {
  watchApi(page)
})

test.afterEach(async ({ page }, info) => {
  reportApi(page, info)
})

test('第 5 关填空后才能运行，改边长时画布不重新缩放', async ({ page }) => {
  test.setTimeout(180_000)
  await openLevel(page, 'L05')
  await page.getByRole('button', { name: '120 度', exact: true }).click()
  await page.getByRole('button', { name: '运行看看' }).click()
  await page.getByRole('button', { name: '开始抄代码' }).click()
  await page.getByRole('button', { name: '准备好了' }).click()

  const run = page.getByRole('button', { name: '运行', exact: true })
  await expect(run).toBeDisabled()
  await expect(page.getByText('还有空没填')).toBeVisible()

  const answers = ['120', '120', 'size', 'angle', 'size', 'angle']
  const inputs = page.getByRole('textbox', { name: /行填空/ })
  await expect(inputs).toHaveCount(answers.length)
  for (let i = 0; i < answers.length; i++) await inputs.nth(i).fill(answers[i])

  await expect(run).toBeEnabled()
  await run.click()
  await page.getByRole('button', { name: '下一回合' }).click()
  await page.getByRole('button', { name: '准备好了' }).click()

  const before = await expectCanvasDrawn(page)
  await page.getByRole('slider', { name: '三角形边长' }).fill('200')
  await page.getByRole('button', { name: '再跑一次' }).click()
  await expect(page.getByText('改完的样子')).toBeVisible({ timeout: 90_000 })
  await expect(page.getByText('出了点小问题')).toHaveCount(0)
  const after = await readCanvasInk(page)
  expect(after.ink).toBeGreaterThan(20)
  // 视野锁住时，边长变大，线段占画布的比例变大，而不是重新缩放到同一块。
  expect(after.bw / after.w).toBeGreaterThan((before.bw / before.w) * 1.2)

  const typing = page.getByLabel('打字练习输入框')
  for (const word of ['size', 'angle', 't.right(angle)']) {
    await typing.pressSequentially(word, { delay: 5 })
  }
  await page.getByRole('button', { name: '完成这一关' }).click()
  await expect(page.getByRole('heading', { name: '这一关完成了' })).toBeVisible()
})

test('第 6 关用折叠看到 8 行变成 for，循环次数改完代码跟着变', async ({ page }) => {
  test.setTimeout(180_000)
  await openLevel(page, 'L06')
  await page.getByRole('button', { name: '4 次', exact: true }).click()
  await page.getByRole('button', { name: '运行看看' }).click()
  await page.getByRole('button', { name: '开始抄代码' }).click()
  await page.getByRole('button', { name: '准备好了' }).click()

  await expect(page.getByText('一键折叠')).toBeVisible()
  await expect(page.getByText('循环替你把重复的事做完')).toHaveCount(0)
  await page.getByRole('button', { name: '一键折叠' }).click()
  await expect(page.getByText('循环替你把重复的事做完')).toBeVisible()
  await expect(page.locator('pre', { hasText: 'for i in range(4):' })).toBeVisible()
  await page.getByRole('button', { name: '运行折叠后的代码' }).click()
  await expect(page.getByText('出了点小问题')).toHaveCount(0)
  await expectCanvasDrawn(page)
  await page.getByRole('button', { name: '下一回合' }).click()
  await page.getByRole('button', { name: '准备好了' }).click()

  await page.getByRole('button', { name: '2 次（一个拐角）' }).click()
  await expect(page.getByText('range(2)')).toBeVisible()
})
