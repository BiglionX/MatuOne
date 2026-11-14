import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { LEVELS } from '../src/mock/levels'
import { reportApi, watchApi } from './api-log'
import { expectCanvasDrawn } from './canvasInk'
import { prepareOrgSwitch } from './org-progress'
import { restoreParentBinding, restoreStudentPassword } from './restore'

/**
 * 仓库里原先没有这份脚本。下面 R1–R11 是上线后必须保持为绿的业务链路，
 * 断言按当前路由写：平台登录进 /admin/dashboard，机构进度在 /org/dashboard，
 * 课程包从 /admin/courses 进 /admin/levels。默认打到本机最新前端和真实数据库，不拦截成假数据。
 *
 * 默认 baseURL 是 http://127.0.0.1:5173。
 * 若需跑远程环境，通过环境变量 E2E_BASE_URL 覆盖，以此绕过部分网络限制问题。
 */

const ORG_ACCOUNT = 'adminorg0001@daima-chuangguan.local'
const ORG_PASSWORD = 'TrialDemo1234'
const PARENT_ACCOUNT = 'parent.demo'
const PARENT_PASSWORD = 'ParentDemo1234'

test.beforeEach(async ({ page }) => {
  watchApi(page)
})

test.afterEach(async ({ page }, info) => {
  reportApi(page, info)
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

test('R1 入口能进五个端', async ({ page }) => {
  await page.goto('/enter')
  await expect(page.getByRole('heading', { name: '代码闯关' })).toBeVisible()
  for (const [title, href] of [
    ['学生端', '/student/login'],
    ['机构端', '/org/login'],
    ['家长端', '/parent/login'],
    ['平台后台', '/admin/login'],
    ['区域服务商', '/agent/login'],
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

test('R11 旧课程路由进课程树，没有可视化编辑器', async ({ page }) => {
  await loginOps(page)
  await page.goto('/admin/courses')
  await expect(page).toHaveURL(/\/admin\/levels$/)
  await expect(page.getByRole('heading', { name: '课程管理' })).toBeVisible()
  await expect(page.getByText('不提供可视化编辑器')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Level 1/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^单元 1/ })).toBeVisible()
  const detail = page.getByRole('region', { name: '关卡详情' })
  await expect(detail.getByRole('heading', { name: /L0001/ })).toBeVisible()
  await expect(detail.getByRole('heading', { name: '教学设计意图' })).toBeVisible()
  await page.getByRole('button', { name: /L0002/ }).click()
  await expect(detail.getByRole('heading', { name: /L0002/ })).toBeVisible()
  await page.getByRole('button', { name: '显示冻结关卡' }).click()
  await page.getByRole('button', { name: /^单元 2/ }).click()
  await page.getByRole('button', { name: /L0021/ }).click()
  await expect(detail.getByRole('heading', { name: /L0021/ })).toBeVisible()
  await expect(detail.getByText('尚未填写。').first()).toBeVisible()
  await page.getByRole('button', { name: '导入课程包' }).click()
  await expect(page.getByRole('heading', { name: '课程包导入' })).toBeVisible()
  await expect(page.getByRole('button', { name: '导入课程包' })).toBeVisible()
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

interface Lesson2Snapshot {
  studentId: string
  currentLevelOrder: number
  levelId: string
  record: {
    completed: boolean
    stars: number
    change_done: boolean
    error_taps: number
    runs: number
    drill_reps: number
    drill_chunk: string | null
    bonus_completed: boolean
    bonus_reward: string | null
  } | null
}

async function readLesson2(): Promise<Lesson2Snapshot> {
  const { q } = await import('../server/db.ts')
  const rows = await q<{
    id: string
    current_level_order: number
    level_id: string | null
    completed: boolean | null
    stars: number | null
    change_done: boolean | null
    error_taps: number | null
    runs: number | null
    drill_reps: number | null
    drill_chunk: string | null
    bonus_completed: boolean | null
    bonus_reward: string | null
  }>(
    `select s.id, s.current_level_order, cl.level_id,
            lr.completed, lr.stars, lr.change_done, lr.error_taps, lr.runs,
            lr.drill_reps, lr.drill_chunk, lr.bonus_completed, lr.bonus_reward
     from public.student s
     join public.course_level cl on cl.sort_order = 2
     left join public.learning_record lr on lr.student_id = s.id and lr.level_id = cl.level_id
     where s.account = $1`,
    ['chenxiaoman'],
  )
  const row = rows[0]
  if (!row?.id || !row.level_id) throw new Error('没有找到陈小满或第 2 关')
  const missing = row.completed === null || row.completed === undefined
  return {
    studentId: row.id,
    currentLevelOrder: Number(row.current_level_order),
    levelId: row.level_id,
    record: missing
      ? null
      : {
          completed: Boolean(row.completed),
          stars: Number(row.stars ?? 0),
          change_done: Boolean(row.change_done),
          error_taps: Number(row.error_taps ?? 0),
          runs: Number(row.runs ?? 0),
          drill_reps: Number(row.drill_reps ?? 0),
          drill_chunk: row.drill_chunk,
          bonus_completed: Boolean(row.bonus_completed),
          bonus_reward: row.bonus_reward,
        },
  }
}

async function restoreLesson2(snap: Lesson2Snapshot): Promise<void> {
  const { q } = await import('../server/db.ts')
  await q('update public.student set current_level_order = $2 where id = $1', [snap.studentId, snap.currentLevelOrder])
  if (!snap.record) {
    await q('delete from public.learning_record where student_id = $1 and level_id = $2', [snap.studentId, snap.levelId])
    return
  }
  const row = snap.record
  await q(
    `update public.learning_record
     set completed = $3, stars = $4, change_done = $5, error_taps = $6, runs = $7,
         drill_reps = $8, drill_chunk = $9, bonus_completed = $10, bonus_reward = $11, updated_at = now()
     where student_id = $1 and level_id = $2`,
    [
      snap.studentId,
      snap.levelId,
      row.completed,
      row.stars,
      row.change_done,
      row.error_taps,
      row.runs,
      row.drill_reps,
      row.drill_chunk,
      row.bonus_completed,
      row.bonus_reward,
    ],
  )
}

async function readDrillReps(studentId: string, levelId: string): Promise<number | null> {
  const { q } = await import('../server/db.ts')
  const rows = await q<{ drill_reps: number | null }>(
    'select drill_reps from public.learning_record where student_id = $1 and level_id = $2',
    [studentId, levelId],
  )
  const value = rows[0]?.drill_reps
  return value === null || value === undefined ? null : Number(value)
}

test.describe('课内复习与热身', () => {
  test.describe.configure({ mode: 'serial' })
  let studentPage: Page
  let snap: Lesson2Snapshot

  test.beforeAll(async ({ browser }) => {
    snap = await readLesson2()
    studentPage = await browser.newPage()
    watchApi(studentPage)
  })

  test.afterAll(async () => {
    await studentPage?.close().catch(() => undefined)
    if (snap) await restoreLesson2(snap)
  })

  test.afterEach(async ({}, info) => {
    reportApi(studentPage, info)
    if (info.status === info.expectedStatus || !studentPage) return
    await mkdir('e2e/screenshots', { recursive: true })
    const name = info.title.replace(/[\\/:*?"<>|]/g, '-')
    await studentPage.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true }).catch(() => undefined)
  })

  test('T1 遮字组块复习打满四次并写入 drill_reps', async () => {
    test.setTimeout(120_000)
    await loginStudent(studentPage, 'chenxiaoman', '123456')
    await studentPage.goto('/student/lesson/L0002')
    await expect(studentPage.getByRole('heading', { name: '先把上一节的这一串遮住打一遍' })).toBeVisible()
    await studentPage.getByLabel('组块打字').fill('print("')
    await studentPage.getByRole('button', { name: '跳过' }).click()
    await studentPage.getByRole('button', { name: '向右转 90 度' }).click()
    await studentPage.getByRole('button', { name: '运行看看' }).click()
    await studentPage.getByRole('button', { name: '开始抄代码' }).click()
    await studentPage.getByRole('button', { name: '准备好了' }).click()

    const lines = ['t.forward(200)', 't.right(90)', 't.forward(120)', 't.done()']
    for (let i = 0; i < lines.length; i++) {
      const input = studentPage.getByRole('textbox', { name: `第 ${i + 1} 行代码` })
      await input.fill(lines[i])
      await expect(input).toHaveValue(lines[i])
      await input.press('Enter')
    }
    await studentPage.getByRole('button', { name: '运行', exact: true }).click()
    await studentPage.getByRole('button', { name: '下一回合' }).click()
    await studentPage.getByRole('button', { name: '准备好了' }).click()
    await studentPage.getByRole('button', { name: '120 度（拐得更大）' }).click()
    await studentPage.getByRole('button', { name: '再跑一次' }).click()

    const drill = studentPage.locator('section[aria-label="打字巩固"]')
    const guide = drill.locator('.code-font').first()
    const box = drill.getByLabel('组块打字')
    await expect(drill.getByText('第 1 / 4 次')).toBeVisible()
    await expect(drill.getByText('看着打')).toBeVisible()
    await expect(guide).toHaveText('t.forward(')
    await box.fill('t.forward(')

    await expect(drill.getByText('第 2 / 4 次')).toBeVisible()
    await expect(drill.getByText('看着打')).toBeVisible()
    await expect(guide).toHaveText('t.forward(')
    await box.fill('t.forward(')

    await expect(drill.getByText('第 3 / 4 次')).toBeVisible()
    await expect(drill.getByText('遮住了，凭手打')).toBeVisible()
    await expect(guide).toHaveText('__________')
    await box.fill('t.forward(')

    await expect(drill.getByText('第 4 / 4 次')).toBeVisible()
    await expect(drill.getByText('遮住了，凭手打')).toBeVisible()
    await expect(guide).toHaveText('__________')
    const saved = studentPage.waitForResponse((response) => {
      const data = response.request().postData() ?? ''
      return response.url().includes('/api/student-learning') && data.includes('"action":"drill"')
    })
    await box.fill('t.forward(')
    const savedResponse = await saved
    const savedBody = await savedResponse.text()
    expect(savedResponse.ok(), `${savedResponse.status()} ${savedBody}`).toBe(true)

    const finished = studentPage.waitForResponse((response) => {
      const data = response.request().postData() ?? ''
      return response.url().includes('/api/student-learning') && data.includes('"action":"complete"')
    })
    await expect(studentPage.getByRole('button', { name: '完成这一关' })).toBeEnabled()
    await studentPage.getByRole('button', { name: '完成这一关' }).click()
    const finishedResponse = await finished
    const finishedBody = await finishedResponse.text()
    expect(finishedResponse.ok(), `${finishedResponse.status()} ${finishedBody}`).toBe(true)
    await expect(studentPage.getByRole('heading', { name: '这一关完成了' })).toBeVisible()
    expect(await readDrillReps(snap.studentId, snap.levelId)).toBe(4)
  })

  test('T2 刚学完第 2 关，热身立刻能打到这一关的关键词', async () => {
    const recent = studentPage.waitForResponse((response) => {
      const data = response.request().postData() ?? ''
      return response.url().includes('/api/student-learning') && data.includes('"action":"recent-keywords"')
    })
    await studentPage.getByRole('link', { name: '回到课程地图' }).click()
    await studentPage.getByRole('link', { name: '打字热身' }).click()
    await expect(studentPage).toHaveURL(/\/student\/typing$/)
    const recentResponse = await recent
    const recentBody = await recentResponse.text()
    expect(recentResponse.ok(), `${recentResponse.status()} ${recentBody}`).toBe(true)
    const payload = JSON.parse(recentBody) as { items?: { order: number; keywords: string[] }[] }
    const lesson2 = payload.items?.find((item) => item.order === 2)
    expect(lesson2?.keywords).toEqual(expect.arrayContaining(['t.forward', 't.right', 't.done']))
    await studentPage.locator('.ml-auto').getByRole('button', { name: '编程关键词' }).click()
    await expect(studentPage.getByRole('heading', { name: '编程关键词' })).toBeVisible()
    await expect(studentPage.locator('.code-font').first()).toContainText('t.forward')
    await expect(studentPage.getByText('先去上课，这里会留下最近打过的那几串。')).toHaveCount(0)
  })
})

test('T3 第 21 关没有上一关的复习组块', async ({ page }) => {
  const { q } = await import('../server/db.ts')
  const before = await q<{ preview_frozen: boolean }>('select preview_frozen from public.course_level where sort_order = 21', [])
  const frozen = before[0]?.preview_frozen === true
  await q('update public.course_level set preview_frozen = false where sort_order = 21', [])
  const writes: string[] = []
  page.on('request', (request) => {
    const data = request.postData() ?? ''
    if (data.includes('"action":"drill"') || data.includes('"action":"complete"') || data.includes('"action":"typing"')) writes.push(data)
  })
  try {
    await loginOps(page)
    await page.goto('/student/lesson/L0021?preview=true')
    await expect(page.getByRole('button', { name: '跳过' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '先把上一节的这一串遮住打一遍' })).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('for i in range(')
    await expect(page.getByText('网络波动，复习记录暂未同步')).toHaveCount(0)
    await page.getByRole('button', { name: '跳过' }).click()
    await expect(page.getByRole('heading', { name: /第 21 关/ })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('for i in range(')
    await expect(page.getByText('网络波动，复习记录暂未同步')).toHaveCount(0)
    expect(writes).toEqual([])
  } finally {
    await q('update public.course_level set preview_frozen = $1 where sort_order = 21', [frozen])
  }
})

async function openRoundB(page: Page, levelId: string, answer: string) {
  await loginStudent(page, 'chenxiaoman', '123456')
  await page.goto(`/student/lesson/${levelId}`)
  await expect(page.getByRole('heading', { name: /第 \d+ 关|遮住打一遍/ })).toBeVisible()
  const recall = page.getByRole('heading', { name: '先把上一节的这一串遮住打一遍' })
  if (await recall.isVisible()) await page.getByLabel('组块打字').fill('print("')
  const skip = page.getByRole('button', { name: '跳过' })
  if (await skip.isVisible()) await skip.click()
  await page.getByRole('button', { name: answer }).click()
  await page.getByRole('button', { name: '运行看看' }).click()
  await page.getByRole('button', { name: '开始抄代码' }).click()
  await page.getByRole('button', { name: '准备好了' }).click()
}

test('T-Py1 运行第 2 关代码，画布有像素且不报错', async ({ page }) => {
  test.setTimeout(180_000)
  await loginStudent(page, 'chenxiaoman', '123456')
  await page.goto('/student/lesson/L0002')
  const recall = page.getByRole('heading', { name: '先把上一节的这一串遮住打一遍' })
  const skip = page.getByRole('button', { name: '跳过' })
  const choice = page.getByRole('button', { name: '向右转 90 度' })
  await expect(recall.or(skip).or(choice)).toBeVisible()
  if (await recall.isVisible()) await page.getByLabel('组块打字').fill('print("')
  if (await skip.isVisible()) await skip.click()
  await choice.click()
  await page.getByRole('button', { name: '运行看看' }).click()
  await expect(page.getByRole('button', { name: '开始抄代码' })).toBeVisible({ timeout: 90_000 })
  await expect(page.getByText('出了点小问题')).toHaveCount(0)
  const ink = await expectCanvasDrawn(page)
  expect(ink.ink).toBeGreaterThan(20)
  expect(ink.bw).toBeGreaterThan(10)
  expect(ink.bh).toBeGreaterThan(10)
})

test('T-Py2 少一个括号时显示人话，并高亮出错的那一行', async ({ page }) => {
  test.setTimeout(180_000)
  await openRoundB(page, 'L0001', '一个三角形')
  await page.getByRole('textbox', { name: '第 1 行代码' }).fill('print("hello"')
  await page.getByRole('button', { name: '运行', exact: true }).click()
  await expect(page.getByText('第 1 行出了点小问题')).toBeVisible({ timeout: 90_000 })
  await expect(page.getByText('这里的括号没有闭合哦')).toBeVisible()
  await expect(page.locator('#code-line-1 .ring-danger')).toBeVisible()
})

test('T-Py3 进入 A 回合两秒后 Worker 已经启动', async ({ page }) => {
  await loginStudent(page, 'chenxiaoman', '123456')
  await page.goto('/student/lesson/L0001')
  await expect(page.getByRole('heading', { name: /第 1 关|遮住打一遍/ })).toBeVisible()
  await page.waitForTimeout(2_000)
  const started = await page.evaluate(() =>
    performance.getEntriesByType('resource').some((entry) => entry.name.includes('pyodide.worker')),
  )
  expect(started).toBe(true)
})

test('T-Py4 分步走超过 500 步就停下，并改为直接运行', async ({ page }) => {
  test.setTimeout(180_000)
  const base = LEVELS.find((item) => item.level_id === 'L01')
  if (!base) throw new Error('缺少 L01')
  const level = {
    ...base,
    demo_code: 'for i in range(2000):\n    pass',
    teach_code_lines: ['for i in range(2000):', '    pass'],
    challenge_params: [],
    unfolded_lines: undefined,
  }

  await page.addInitScript(() => {
    localStorage.setItem('cdg.auth.student', 'e2e-token')
    localStorage.setItem(
      'cdg.session.student',
      JSON.stringify({
        id: 'S-e2e',
        orgId: 'org-e2e',
        groupId: 'g-e2e',
        name: '测试同学',
        account: 'e2e',
        status: 'active',
        currentLevelOrder: 1,
        lastActiveAt: '2026-11-13T00:00:00.000Z',
        bindCode: 'E2E',
        password: '',
      }),
    )
  })

  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    let body: { action?: string } = {}
    try {
      body = route.request().postDataJSON() as { action?: string }
    } catch {
      body = {}
    }
    const url = route.request().url()
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

  await page.goto('/student/lesson/L01')
  await page.getByRole('button', { name: '跳过' }).click()
  await page.getByRole('button', { name: '一个三角形' }).click()
  await page.getByRole('button', { name: '分步执行' }).click()
  await page.getByRole('button', { name: '下一步' }).click()
  await expect(page.getByRole('status').filter({ hasText: '代码太长啦，我们直接看结果吧' })).toBeVisible({ timeout: 90_000 })
  await expect(page.getByRole('button', { name: '下一步' })).toHaveCount(0)
  await expect(page.getByText('代码执行时间太长啦，检查一下有没有死循环？')).toHaveCount(0)
})
