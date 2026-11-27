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
import { q } from '../server/db'

let safetyRestore: (() => Promise<void>) | null = null

/** 需要直连数据库的用例（A1 / A3）靠它改开通状态；本地没配 DATABASE_URL 时先跳过。 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const skipReason = '本地没配 DATABASE_URL（见 .env.test.example）：跳过需要数据库的用例'

test.beforeAll(async () => {
  if (!hasDatabase) return
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

test.describe('A0 首页是通用入口', () => {
  test('学生会话也只展示注册模块，不请求机构开通记录', async ({ page }) => {
    let orgModuleRequests = 0
    await page.addInitScript(() => {
      localStorage.setItem('cdg.auth.student', 'e2e-home-student')
      localStorage.setItem('cdg.session.student', JSON.stringify({
        id: '22222222-2222-4222-8222-222222222222',
        orgId: '11111111-1111-4111-8111-111111111111',
        groupId: '33333333-3333-4333-8333-333333333333',
        name: '测试学生',
        account: 'home-e2e',
        status: 'active',
        currentLevelOrder: 1,
        lastActiveAt: new Date().toISOString(),
        bindCode: '',
        password: '',
      }))
    })
    await page.route('**/api/org-modules', async (route) => {
      orgModuleRequests += 1
      await route.fulfill({
        json: {
          modules: [
            { moduleId: 'python', maxLevel: null, validUntil: null },
            { moduleId: 'blockly', maxLevel: null, validUntil: null },
          ],
        },
      })
    })

    await page.goto('/')
    await expect(page.getByRole('heading', { name: '选一个板块，开始今天的探索' })).toBeVisible()
    await expect(page.locator('[data-module-control]')).toHaveCount(5)
    await expect(page.getByRole('heading', { name: 'MatuPix 创意搭建', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Python 课外课', exact: true })).toBeVisible()
    await page.waitForTimeout(500)
    expect(orgModuleRequests).toBe(0)
  })
})

test.describe('A1 Python 未开通时业务入口拦截且首页通用展示', () => {
  test.describe.configure({ mode: 'serial' })

  test('A1 Python 未开通时业务入口拦截且首页通用展示', async ({ page }) => {
  test.skip(!hasDatabase, skipReason)
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
    await expect(page.locator('[data-module-control]')).toHaveCount(5)
    await expect(page.getByRole('heading', { name: 'MatuPix 创意搭建', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Python 课外课', exact: true })).toBeVisible()
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
  test.skip(!hasDatabase, skipReason)
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

test.describe('A4 Blockly 成果进入家长端与机构端', () => {
  test('陈小满的图形化通关数非 0，Python 数字仍按原口径返回', async ({ page }) => {
    test.skip(!hasDatabase, skipReason)
    await loginParent(page)
    const home = await api(page, '/api/parent-portal', {})
    expect(home.status).toBe(200)
    const child = (home.body.children as Record<string, unknown>[]).find(
      (item) => (item.student as Record<string, unknown>)?.name === '陈小满',
    )
    expect(child).toBeDefined()
    const studentId = String((child?.student as Record<string, unknown>).id)
    const [blocklyRows, pythonRows] = await Promise.all([
      q<{ n: number }>(
        `select count(*)::int as n
         from public.learning_record lr
         join public.module_level ml on ml.module_id = 'blockly' and ml.level_id = lr.level_id
         where lr.student_id = $1 and lr.module_id = 'blockly' and lr.completed = true and ml.published = true`,
        [studentId],
      ),
      q<{ n: number }>(
        `select count(*)::int as n
         from public.learning_record lr
         join public.course_level cl on cl.level_id = lr.level_id
         where lr.student_id = $1 and lr.module_id = 'python' and lr.completed = true and cl.published = true`,
        [studentId],
      ),
    ])
    const blocklyCount = blocklyRows[0]?.n ?? 0
    const pythonCount = pythonRows[0]?.n ?? 0
    expect(blocklyCount).toBeGreaterThan(0)
    expect((child?.blocklyProgress as { completedCount: number }).completedCount).toBe(blocklyCount)
    expect(child?.completedCount).toBe(pythonCount)
    const card = page.locator('section').filter({ has: page.getByRole('heading', { name: '图形化编程', exact: true }) })
    await expect(card).toContainText(`已通关 ${blocklyCount} 关`)
    await expect(card).toContainText('当前进度：')

    await loginOrg(page)
    const list = await api(page, '/api/org-students', {}, { 'x-action': 'list' })
    expect(list.status).toBe(200)
    const row = (list.body.students as Record<string, unknown>[]).find((student) => student.account === STUDENT_ACCOUNT)
    expect(row?.blocklyCompletedCount).toBe(blocklyCount)
    expect(row?.completed_count).toBe(pythonCount)
    expect(row?.authorizedCompletedCount).toBe(pythonCount)
    await page.getByRole('link', { name: '学生管理' }).click()
    const tableRow = page.locator('tbody tr').filter({ hasText: '陈小满' })
    await expect(tableRow.getByRole('cell', { name: String(blocklyCount), exact: true })).toBeVisible()
  })
})
