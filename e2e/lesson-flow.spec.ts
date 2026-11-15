import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { LEVELS } from '../src/mock/levels'
import type { Level } from '../src/types'
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

function courseLevel(order: number): Level {
  const dir = join(process.cwd(), 'content', 'courses', 'level1')
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue
    const pack = JSON.parse(readFileSync(join(dir, name), 'utf8')) as { levels: Level[] }
    const found = pack.levels.find((level) => level.order === order)
    if (found) {
      return {
        ...found,
        preview_kind: found.preview_kind === 'text' ? 'text' : 'turtle',
        level_type: 'normal',
        challenge_params: found.challenge_params ?? [],
        error_mappings: found.error_mappings ?? [],
      }
    }
  }
  throw new Error(`缺少第 ${order} 关`)
}

async function openCourseLevel(page: Page, order: number) {
  const level = courseLevel(order)
  await openLevel(page, level.level_id, level)
  return level
}

async function openLevel(page: Page, levelId: string, level: Level = LEVELS.find((item) => item.level_id === levelId)!) {
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
      await route.fulfill({ json: { level, hints: [], reviewChunk: null } })
      return
    }
    if (url.includes('student-learning') && body.action === 'bonus') {
      await route.fulfill({ json: { ok: true, reward: '皇冠' } })
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

test('第 61 关猜颜色时，标准答案是红、蓝、蓝', async ({ page }) => {
  await openCourseLevel(page, 61)
  await expect(page.getByRole('button', { name: '红、蓝、红' })).toBeVisible()
  await page.getByRole('button', { name: '红、蓝、蓝' }).click()
  await expect(page.getByText('猜对了')).toBeVisible()
  await expect(page.getByText('最后一条也是蓝的')).toBeVisible()
})

test('第 1 关副本拖过 140 也算把线变长', async ({ page }) => {
  test.setTimeout(180_000)
  await openCourseLevel(page, 1)
  await page.getByRole('button', { name: '一条直线' }).click()
  await page.getByRole('button', { name: '运行看看' }).click()
  await page.getByRole('button', { name: '开始抄代码' }).click()
  await page.getByRole('button', { name: '准备好了' }).click()

  await page.getByRole('textbox', { name: '第 1 行代码' }).fill('t.forward(80)')
  await page.getByRole('textbox', { name: '第 1 行代码' }).press('Enter')
  await page.getByRole('textbox', { name: '第 2 行代码' }).fill('t.done()')
  await page.getByRole('textbox', { name: '第 2 行代码' }).press('Enter')
  await page.getByRole('button', { name: '运行', exact: true }).click()
  await page.getByRole('button', { name: '下一回合' }).click()
  await page.getByRole('button', { name: '准备好了' }).click()

  await page.getByRole('slider', { name: '把这条线改长' }).fill('100')
  await page.getByRole('button', { name: '再跑一次' }).click()
  await expect(page.getByText('改完的样子')).toBeVisible({ timeout: 90_000 })
  const drill = page.getByLabel('组块打字')
  for (let i = 1; i <= 4; i += 1) {
    await expect(page.getByText(`第 ${i} / 4 次`)).toBeVisible()
    await drill.pressSequentially('t.forward(80)', { delay: 10 })
  }
  await page.getByRole('button', { name: '完成这一关' }).click()
  await page.getByRole('button', { name: '巩固一下' }).click()

  await page.getByRole('slider', { name: '把这条线改长' }).fill('160')
  await page.getByRole('button', { name: '跑一下' }).click()
  await expect(page.getByText('拿到了皇冠')).toBeVisible({ timeout: 90_000 })
  await expect(page.getByText('还没到题目要的程度')).toHaveCount(0)
})
