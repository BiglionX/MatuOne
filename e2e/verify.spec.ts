import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { prepareOrgSwitch } from './org-progress'
import { restoreParentBinding, restoreStudentPassword } from './restore'

/**
 * 仓库里原先没有这份脚本。下面 R1–R11 是上线后必须保持为绿的业务链路，
 * 断言按当前路由写：平台登录进 /admin/dashboard，机构进度在 /org/dashboard，
 * 课程包从 /admin/courses 进 /admin/levels。默认打到本地最新前端和真实数据库，不拦截成假数据。
 */

const ORG_ACCOUNT = 'adminorg0001@daima-chuangguan.local'
const ORG_PASSWORD = 'TrialDemo1234'
const PARENT_ACCOUNT = 'parent.demo'
const PARENT_PASSWORD = 'ParentDemo1234'

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return
  await mkdir('e2e/screenshots', { recursive: true })
  const name = info.title.replace(/[\\/:*?"<>|]/g, '-')
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true }).catch(() => undefined)
})

const SITE = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173'

let restoreOrgSwitch: (() => Promise<void>) | null = null

test.afterAll(async ({ request }) => {
  if (restoreOrgSwitch) await restoreOrgSwitch()
  await restoreStudentPassword()
  await restoreParentBinding(request, SITE)
})

async function loginStudent(page: Page, account: string, password: string) {
  await page.goto('/student/login')
  await page.getByPlaceholder('例如 chenxiaoman').fill(account)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: '进入课程地图' }).click()
  await expect(page).toHaveURL(/\/student\/?$/)
}

async function loginOrg(page: Page) {
  await page.goto('/org/login')
  await page.getByLabel('账号').fill(ORG_ACCOUNT)
  await page.getByLabel('密码').fill(ORG_PASSWORD)
  await page.getByRole('button', { name: '进入机构端' }).click()
  await expect(page).toHaveURL(/\/org\/dashboard$/)
}

async function loginParent(page: Page) {
  await page.goto('/parent/login')
  await page.getByLabel('用户名').fill(PARENT_ACCOUNT)
  await page.getByLabel('密码').fill(PARENT_PASSWORD)
  await page.getByRole('button', { name: '进入家长端' }).click()
  await expect(page).toHaveURL(/\/parent\/?$/)
}

async function loginOps(page: Page) {
  await page.goto('/admin/login')
  await page.getByLabel('账号').fill('ops')
  await page.getByLabel('密码').fill('OpsDemo12345')
  await page.getByRole('button', { name: '进入后台' }).click()
  await expect(page).toHaveURL(/\/admin\/dashboard$/)
}

test('R1 入口能进四个端', async ({ page }) => {
  await page.goto('/enter')
  await expect(page.getByRole('heading', { name: '代码闯关' })).toBeVisible()
  for (const [title, href] of [
    ['学生端', '/student/login'],
    ['机构端', '/org/login'],
    ['家长端', '/parent/login'],
    ['平台后台', '/admin/login'],
  ] as const) {
    await expect(page.getByRole('link', { name: new RegExp(title) })).toHaveAttribute('href', href)
  }
})

test('R2 学生登录进入课程地图', async ({ page }) => {
  await loginStudent(page, 'chenxiaoman', '123456')
  await expect(page.getByText('陈小满')).toBeVisible()
  await expect(page.getByRole('link', { name: '打字热身' })).toBeVisible()
})

test('R3 试用机构进不了第 4 关，响应里没有课文', async ({ page }) => {
  const mapResponse = page.waitForResponse(
    (response) => response.url().includes('/api/student-learning') && (response.request().postData() ?? '').includes('"map"'),
  )
  await loginStudent(page, 'chenxiaoman', '123456')
  const map = (await (await mapResponse).json()) as { entries: { order: number; levelId: string; unlocked: boolean }[] }
  const fourth = map.entries.find((entry) => entry.order === 4)
  expect(fourth, '课程地图应有第 4 关').toBeTruthy()
  expect(fourth?.unlocked).toBe(false)

  const gateResponse = page.waitForResponse((response) => response.url().includes('/api/student-enter-level'))
  await page.goto(`/student/lesson/${fourth?.levelId}`)
  const gate = await gateResponse
  const gateText = await gate.text()
  expect(gateText).not.toContain('teach_code_lines')
  expect(gateText).not.toContain('demo_code')
  const gateJson = JSON.parse(gateText) as { allowed?: boolean; reason?: string }
  expect(gateJson.allowed).toBe(false)
  expect(gateJson.reason).toBe('trial_locked')
  await expect(page.getByText('试用期间只能学习前 3 关')).toBeVisible()
  await expect(page.getByText('抄代码')).toHaveCount(0)
})

test('R4 打字热身只有基准键位和编程关键词', async ({ page }) => {
  await loginStudent(page, 'chenxiaoman', '123456')
  await page.getByRole('link', { name: '打字热身' }).click()
  await expect(page).toHaveURL(/\/student\/typing$/)
  const modes = page.locator('.ml-auto').getByRole('button')
  await expect(modes).toHaveCount(2)
  await expect(modes.nth(0)).toHaveText('基准键位')
  await expect(modes.nth(1)).toHaveText('编程关键词')
  await modes.nth(1).click()
  await expect(page.getByRole('heading', { name: '编程关键词' })).toBeVisible()
})

test('R5 机构管理员进入进度看板', async ({ page }) => {
  await page.goto('/org')
  await expect(page).toHaveURL(/\/org\/login$/)
  await loginOrg(page)
  await expect(page.getByRole('heading', { name: '进度看板' })).toBeVisible()
  await expect(page.getByText('在读学生')).toBeVisible()
  await expect(page.getByRole('heading', { name: '学生明细' })).toBeVisible()
  await expect(page.getByText('陈小满')).toBeVisible()
})

test('R6 机构学生页只有批量导入', async ({ page }) => {
  await loginOrg(page)
  await page.getByRole('link', { name: '学生管理' }).click()
  await expect(page).toHaveURL(/\/org\/students$/)
  await expect(page.getByRole('heading', { name: '学生管理' })).toBeVisible()
  await expect(page.getByRole('button', { name: '批量导入' })).toBeVisible()
  await expect(page.getByText('陈小满')).toBeVisible()
  expect(await page.locator('body').innerText()).not.toContain('生成邀请码')
})

test('R7 家长登录能看到绑定的孩子', async ({ page }) => {
  await loginParent(page)
  await expect(page.getByRole('button', { name: '陈小满' })).toBeVisible()
  await expect(page.getByText('只显示自己孩子的记录，不做任何排名与对比。')).toBeVisible()
  expect(await page.locator('body').innerText()).not.toContain('排名第')
})

test('R8 平台登录进入工作台', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login$/)
  await loginOps(page)
  await expect(page.getByRole('link', { name: '工作台' })).toBeVisible()
  await expect(page.getByText('本月营收')).toBeVisible()
  await expect(page.getByRole('link', { name: '机构台账' })).toBeVisible()
  await expect(page.getByRole('link', { name: '学生库' })).toBeVisible()
  await expect(page.getByRole('link', { name: '家长库' })).toBeVisible()
})

test('R9 机构台账能看到青禾托辅', async ({ page }) => {
  await loginOps(page)
  await page.getByRole('link', { name: '机构台账' }).click()
  await expect(page).toHaveURL(/\/admin\/orgs$/)
  await expect(page.getByRole('link', { name: '青禾托辅' })).toBeVisible()
  await expect(page.getByText('ORG-0001')).toBeVisible()
  expect(await page.locator('body').innerText()).not.toContain('生成邀请码')
})

test('R10 线索列表可打开', async ({ page }) => {
  await loginOps(page)
  await page.getByRole('link', { name: '线索列表' }).click()
  await expect(page).toHaveURL(/\/admin\/leads$/)
  await expect(page.getByRole('heading', { name: '线索列表' })).toBeVisible()
  await expect(page.getByText('来自试用申请')).toBeVisible()
})

test('R11 旧课程路由进导入页，没有可视化编辑器', async ({ page }) => {
  await loginOps(page)
  await page.goto('/admin/courses')
  await expect(page).toHaveURL(/\/admin\/levels$/)
  await expect(page.getByRole('heading', { name: '课程包导入' })).toBeVisible()
  await expect(page.getByRole('button', { name: '导入课程包' })).toBeVisible()
  await expect(page.getByText('不提供可视化编辑器')).toBeVisible()
  await expect(page.getByRole('button', { name: '可视化编辑' })).toHaveCount(0)
  await expect(page.locator('[contenteditable="true"]')).toHaveCount(0)
  expect(await page.locator('body').innerText()).not.toContain('生成邀请码')
})

test('A1 机构详情能切换 Tab 并列出该机构学生', async ({ page }) => {
  await loginOps(page)
  await page.getByRole('link', { name: '机构台账' }).click()
  await page.getByRole('link', { name: '青禾托辅' }).click()
  await expect(page).toHaveURL(/\/admin\/orgs\/[0-9a-f-]{36}$/i)
  await expect(page.getByRole('heading', { name: '青禾托辅' })).toBeVisible()
  await expect(page.getByText('ORG-0001', { exact: true })).toBeVisible()
  await expect(page.getByText('机构编号')).toBeVisible()

  await page.getByRole('button', { name: '收费与开通记录' }).click()
  await expect(page.getByRole('heading', { name: '收费记录' })).toBeVisible()

  await page.getByRole('button', { name: '概况' }).click()
  await expect(page.getByText('已用席位 / 总额度')).toBeVisible()

  await page.getByRole('button', { name: '学生与家长' }).click()
  const row = page.getByRole('row', { name: /陈小满/ })
  await expect(row).toBeVisible()
  await expect(row).toContainText('chenxiaoman')
})

test('A2 重置学生密码只显示一次，新密码能登录学生端', async ({ page, browser }) => {
  await loginOps(page)
  await page.getByRole('link', { name: '学生库' }).click()
  await page.getByPlaceholder('搜索学生姓名或账号').fill('chenxiaoman')
  const row = page.getByRole('row', { name: /陈小满/ })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: '重置密码' }).click()
  await expect(page.getByText('原密码会立即失效')).toBeVisible()
  await page.getByRole('button', { name: '确认重置' }).click()

  const dialog = page.getByRole('dialog', { name: '新密码' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('此密码只显示一次，关闭后无法再次查看。')
  const password = (await dialog.locator('.font-mono').innerText()).trim()
  expect(password).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789]{8}$/)

  await dialog.getByRole('button', { name: '我已记下' }).click()
  await expect(page.getByText(password)).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: '学生库' })).toBeVisible()
  await expect(page.getByText(password)).toHaveCount(0)

  const student = await browser.newContext()
  const studentPage = await student.newPage()
  try {
    await loginStudent(studentPage, 'chenxiaoman', password)
    await expect(studentPage.getByText('陈小满').first()).toBeVisible()
    await studentPage.evaluate(() => localStorage.clear())
    await studentPage.goto('/student/login')
    await studentPage.getByPlaceholder('例如 chenxiaoman').fill('chenxiaoman')
    await studentPage.locator('input[type="password"]').fill('123456')
    await studentPage.getByRole('button', { name: '进入课程地图' }).click()
    await expect(studentPage.getByText('账号或密码不对，问问老师。')).toBeVisible()
  } finally {
    await student.close()
  }
})

test('A3 强制解绑后家长首页不再显示该孩子', async ({ page, browser, request }) => {
  await loginOps(page)
  await page.getByRole('link', { name: '家长库' }).click()
  await page.getByPlaceholder('搜索家长账号或孩子姓名').fill('陈小满')
  const row = page.getByRole('row').filter({ hasText: '****' }).first()
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: '查看详情' }).click()
  const drawer = page.getByRole('dialog')
  await expect(drawer.getByRole('heading', { name: PARENT_ACCOUNT })).toBeVisible()
  await expect(drawer.getByText('陈小满')).toBeVisible()
  await drawer.getByRole('button', { name: '强制解绑' }).click()
  await expect(drawer.getByText('解绑后家长将无法查看该孩子数据')).toBeVisible()
  await drawer.getByRole('button', { name: '确认解绑' }).click()
  await expect(drawer.getByText('还没有绑定孩子。')).toBeVisible()
  await expect(drawer.getByText('陈小满')).toHaveCount(0)

  const parent = await browser.newContext()
  const parentPage = await parent.newPage()
  try {
    await loginParent(parentPage)
    await expect(parentPage.getByText('还没有绑定孩子')).toBeVisible()
    await expect(parentPage.getByText('陈小满')).toHaveCount(0)
  } finally {
    await parent.close()
    await restoreParentBinding(request, SITE)
  }
})

test('A4 家长列表账号脱敏，列表接口不回明文', async ({ page }) => {
  await loginOps(page)
  const listed = page.waitForResponse((response) => {
    const data = response.request().postData() ?? ''
    return response.url().includes('/api/admin-users') && data.includes('list_parents')
  })
  await page.getByRole('link', { name: '家长库' }).click()
  const response = await listed
  const text = await response.text()
  expect(response.ok()).toBe(true)
  expect(text).not.toContain(PARENT_ACCOUNT)
  expect(text).not.toContain('13800000001')
  const payload = JSON.parse(text) as { parents?: Record<string, unknown>[] }
  expect(payload.parents?.length).toBeGreaterThan(0)
  for (const parent of payload.parents ?? []) {
    const account = String(parent.account ?? '')
    expect(account).toContain('*')
    expect(account).not.toBe(PARENT_ACCOUNT)
    expect(parent).not.toHaveProperty('phone')
    expect(parent).not.toHaveProperty('mobile')
    expect(parent).not.toHaveProperty('contactPhone')
    expect(parent).not.toHaveProperty('password')
  }
  const accountCell = page.locator('tbody td.font-mono').first()
  await expect(accountCell).toContainText('*')
  expect(await page.locator('tbody').innerText()).not.toContain(PARENT_ACCOUNT)
})

async function postAs(request: APIRequestContext, name: string, token: string, body: Record<string, unknown>) {
  return request.post(`/api/${name}`, {
    headers: { authorization: `Bearer ${token}` },
    data: body,
  })
}

function assertNoAdminData(status: number, text: string, name: string) {
  expect([401, 403], `${name} 应拒绝`).toContain(status)
  expect(text, name).not.toContain('chenxiaoman')
  expect(text, name).not.toContain('青禾')
  expect(text, name).not.toContain('"revenue"')
  expect(text, name).not.toContain('"students"')
  expect(text, name).not.toContain(PARENT_ACCOUNT)
}

test('S1 机构管理员调平台接口被拒绝', async ({ request }) => {
  const login = await request.post('/api/org-login', {
    data: { account: ORG_ACCOUNT, password: ORG_PASSWORD },
  })
  expect(login.ok(), '机构演示账号应能登录，否则越权断言没有意义').toBe(true)
  const token = ((await login.json()) as { accessToken?: string }).accessToken ?? ''
  expect(token.length).toBeGreaterThan(10)

  const calls: Array<[string, Record<string, unknown>]> = [
    ['admin-dashboard', { action: 'overview' }],
    ['admin-users', { action: 'list_students' }],
    ['admin-ops', { action: 'ledger' }],
    ['admin-orgs', { action: 'ledger' }],
  ]
  for (const [name, body] of calls) {
    const response = await postAs(request, name, token, body)
    const text = await response.text()
    if (name === 'admin-orgs') {
      expect(response.ok(), 'admin-orgs 不能返回数据').toBe(false)
      expect(text).not.toContain('chenxiaoman')
      expect(text).not.toContain('青禾')
      expect(text).not.toContain('"revenue"')
      expect([401, 403, 404]).toContain(response.status())
      continue
    }
    assertNoAdminData(response.status(), text, name)
  }
})

test('S2 未登录打不开学生库', async ({ page }) => {
  const leaked: string[] = []
  page.on('response', (response) => {
    if (response.url().includes('/api/admin-') && response.ok()) leaked.push(response.url())
  })
  await page.goto('/admin/students')
  await expect(page).toHaveURL(/\/admin\/login$/)
  await expect(page.getByRole('heading', { name: '平台后台登录' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '学生库' })).toHaveCount(0)
  expect(leaked).toEqual([])
})

test('R12 地图首屏只画出 6 个单元，渲染低于 1.5 秒', async ({ page }) => {
  await restoreStudentPassword()
  await loginStudent(page, 'chenxiaoman', '123456')
  await page.reload()
  const units = page.getByRole('button', { name: /Level 1 · 单元 [1-6]/ })
  await expect(units).toHaveCount(6)
  await expect(page.getByText('当前阶段：Level 1')).toBeVisible()
  const elapsed = await page.evaluate(() => performance.now())
  expect(elapsed, `地图首屏 ${Math.round(elapsed)}ms`).toBeLessThan(1500)
  await expect(page.getByRole('button', { name: /，(?:新课|练习|打字|项目)，/ })).toHaveCount(20)
  expect(await page.locator('button').count()).toBeLessThan(80)
})

test('R13 换机构后第一单元仍是 5/20', async ({ page, request, browser }) => {
  await restoreStudentPassword()
  await restoreParentBinding(request, SITE)
  const plan = await prepareOrgSwitch()
  restoreOrgSwitch = plan.restore
  try {
    const login = await request.post('/api/student-login', {
      data: { account: 'chenxiaoman', password: '123456' },
    })
    expect(login.ok()).toBe(true)
    const token = ((await login.json()) as { accessToken?: string }).accessToken ?? ''
    expect(token.length).toBeGreaterThan(10)
    for (const levelId of ['L0001', 'L0002', 'L0003', 'L0004', 'L0005']) {
      const response = await request.post('/api/student-learning', {
        headers: { authorization: `Bearer ${token}` },
        data: { action: 'complete', levelId, stars: 3, errorTaps: 0 },
      })
      const body = (await response.json()) as { ok?: boolean; reason?: string }
      if (levelId === 'L0004' || levelId === 'L0005') {
        expect(body.reason).toBe('trial_locked')
      } else {
        expect(body.ok, `${levelId} 应能记成完成`).toBe(true)
      }
    }
    await plan.finishFive()
    await plan.moveOrg()

    await page.goto('/student/login')
    await page.evaluate(() => localStorage.clear())
    await loginStudent(page, 'chenxiaoman', '123456')
    await expect(page.getByText('当前阶段：Level 1')).toBeVisible()
    await expect(page.getByRole('button', { name: /单元 1/ })).toContainText(/5\s*\/\s*20/)

    const parent = await browser.newContext()
    const parentPage = await parent.newPage()
    try {
      await loginParent(parentPage)
      await expect(parentPage.getByText('陈小满').first()).toBeVisible()
      const text = await parentPage.locator('body').innerText()
      expect(text).toMatch(/Level 1（基础入门）[\s\S]*5\s*\/\s*20/)
    } finally {
      await parent.close()
    }
  } finally {
    await plan.restore()
    restoreOrgSwitch = null
  }
})

test('S3 家长 token 调 admin-users 返回 403', async ({ request }) => {
  const login = await request.post('/api/parent-login', {
    data: { account: PARENT_ACCOUNT, password: PARENT_PASSWORD },
  })
  expect(login.ok(), '家长演示账号应能登录').toBe(true)
  const token = ((await login.json()) as { accessToken?: string }).accessToken ?? ''
  expect(token.length).toBeGreaterThan(10)
  const response = await postAs(request, 'admin-users', token, { action: 'list_students' })
  const text = await response.text()
  expect(response.status()).toBe(403)
  expect(text).not.toContain('chenxiaoman')
  expect(text).not.toContain('"students"')
})
