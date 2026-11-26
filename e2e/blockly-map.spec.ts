import { expect, test } from '@playwright/test'
import { api, loginStudent } from './auth-fixtures'

/**
 * Blockly 课程地图的学期展示。
 *
 * 学期名走 Level 序列（Level 0 – Level 3），不跟学校年级绑定，
 * 和 Python 侧的 Level 1–8 是同一套口径。
 */
test('Blockly 地图用 Level 序列展示学期，不再出现年级', async ({ page }) => {
  await loginStudent(page)
  await page.goto('/blockly')

  for (const title of ['Level 0', 'Level 1', 'Level 2', 'Level 3']) {
    await expect(page.getByRole('button', { name: new RegExp(title) })).toBeVisible()
  }
  await expect(page.getByRole('heading', { name: 'Level 0' })).toBeVisible()
  await expect(page.getByText('Blockly 课程线')).toBeVisible()
  await expect(page.getByText('一年级')).toHaveCount(0)

  const result = await api(page, '/api/student-learning', { action: 'map', moduleId: 'blockly' })
  expect(result.status).toBe(200)
  const terms = (result.body as { terms?: { title?: string; stageLabel?: string }[] }).terms ?? []
  expect(terms.map((term) => term.title)).toEqual(['Level 0', 'Level 1', 'Level 2', 'Level 3'])
  expect([...new Set(terms.map((term) => term.stageLabel))]).toEqual(['Blockly 课程线'])

  await page.screenshot({ path: 'e2e/screenshots/blockly-level-names.png', fullPage: true })
})
