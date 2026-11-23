import { expect, test, type Page } from '@playwright/test'
import {
  api,
  assertDemoFixtures,
  attachAuthDiagnostics,
  enterLevelReason,
  loginOrg,
  loginParent,
  loginStudent,
  parentUnitProgress,
  setEntitlementRevoked,
  setOrgStatus,
  snapshotEntitlement,
  snapshotOrgStatus,
  watchAuthApi,
  STUDENT_ACCOUNT,
} from './auth-fixtures'

let safetyRestore: (() => Promise<void>) | null = null

test.beforeAll(async () => {
  await assertDemoFixtures()
})

test.beforeEach(async ({ page }) => {
  safetyRestore = null
  watchAuthApi(page)
})

test.afterEach(async ({ page }, info) => {
  if (safetyRestore) {
    await safetyRestore()
    safetyRestore = null
  }
  await attachAuthDiagnostics(page, info)
  if (info.status !== info.expectedStatus) {
    await page.screenshot({ path: `e2e/screenshots/auth-${info.title.replace(/[\\/:*?"<>|]/g, '-')}.png`, fullPage: true }).catch(() => undefined)
  }
})

test.describe('A1 Python 未开通三端一致', () => {
  test.describe.configure({ mode: 'serial' })

  test('A1 Python 未开通三端一致', async ({ page }) => {
  const original = await snapshotEntitlement('python')
  let restored = false
  const restore = async () => {
    if (restored) return
    restored = true
    await setEntitlementRevoked('python', original)
  }
  safetyRestore = restore
  await setEntitlementRevoked('python', new Date().toISOString())

  try {
    await loginOrg(page)
    const list = await api(page, '/api/org-students', {}, { 'x-action': 'list' })
    expect(list.status).toBe(200)
    expect(list.body.authorizedLevels).toBe(0)
    const students = list.body.students as Record<string, unknown>[]
    const row = students.find((student) => student.account === STUDENT_ACCOUNT)
    expect(row).toBeDefined()
    const enabledModules = Array.isArray(row?.enabledModules)
      ? (row?.enabledModules as ('python' | 'matupix')[])
      : []
    const authorizedLevels = Number(list.body.authorizedLevels ?? 0)
    expect(enabledModules).not.toContain('python')
    expect(authorizedLevels).toBe(0)
    // adapter 的 not_entitled 契约：模块未开通或授权关卡为 0。
    const availability = !enabledModules.includes('python') || authorizedLevels === 0 ? 'not_entitled' : 'cloud'
    expect(availability).toBe('not_entitled')
    await page.getByRole('link', { name: '学生管理' }).click()
    await expect(page.locator('tbody tr').filter({ hasText: '陈小满' })).toContainText('尚未开通')

    await loginParent(page)
    await expect(page.getByRole('button', { name: '陈小满' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '课程进度' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: '打字成长' })).toHaveCount(0)

    await loginStudent(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: '选一个板块，开始今天的探索' })).toBeVisible()
    await page.waitForTimeout(800)
    await expect(page.getByRole('heading', { name: 'Python 课外课', exact: true })).toHaveCount(0)
    expect(await enterLevelReason(page, 'L0001')).toBe('module_not_entitled')
  } finally {
    await restore()
  }
  })
})

test.describe('A2 游客直达 /matupix 仍可进', () => {
  test.describe.configure({ mode: 'serial' })

  test('A2 游客直达 /matupix 仍可进', async ({ browser }) => {
  const context = await browser.newContext()
  try {
    const page = await context.newPage()
    watchAuthApi(page)
    await page.goto('/matupix')
    await expect(page.getByRole('heading', { name: /像素画与3D积木/ }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: '该模块未开通' })).toHaveCount(0)
  } finally {
    await context.close()
  }
  })
})

test.describe('A3 Trial + 已开通 Python 的 Level 1 免费放行', () => {
  test.describe.configure({ mode: 'serial' })

  test('A3 Trial + 已开通 Python 的 Level 1 免费放行', async ({ page }) => {
  const originalRevoked = await snapshotEntitlement('python')
  const originalStatus = await snapshotOrgStatus()
  let restored = false
  const restore = async () => {
    if (restored) return
    restored = true
    await setEntitlementRevoked('python', originalRevoked)
    await setOrgStatus(originalStatus)
  }
  safetyRestore = restore
  await setEntitlementRevoked('python', null)
  await setOrgStatus('trial')

  try {
    await loginStudent(page)
    expect(await enterLevelReason(page, 'L0004')).not.toBe('module_not_entitled')
    expect(await enterLevelReason(page, 'L0004')).not.toBe('trial_locked')
    expect(await enterLevelReason(page, 'L0120')).not.toBe('module_not_entitled')
    expect(await enterLevelReason(page, 'L0120')).not.toBe('trial_locked')
    expect(await enterLevelReason(page, 'L0121')).toBe('trial_locked')

    await loginParent(page)
    await expect(page.getByRole('button', { name: '陈小满' })).toBeVisible()
    const home = await api(page, '/api/parent-portal', {})
    expect(home.status).toBe(200)
    const children = home.body.children as Record<string, unknown>[]
    const child = children.find((item) => (item.student as Record<string, unknown>)?.name === '陈小满')
    expect(child).toBeDefined()
    const expected = await parentUnitProgress(child as Record<string, unknown>)
    expect(expected.total).toBeGreaterThan(0)
    await expect(page.getByText(`本单元进度：${expected.completed}/${expected.total} 节`)).toBeVisible()
  } finally {
    await restore()
  }
  })
})
