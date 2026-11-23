import type { Page, TestInfo } from '@playwright/test'
import { one, q } from '../server/db'

export const DEMO_ORG_ID = '11111111-1111-4111-8111-111111111111'
export const ORG_ACCOUNT = 'adminorg0001@daima-chuangguan.local'
export const ORG_PASSWORD = 'TrialDemo1234'
export const PARENT_ACCOUNT = 'parent.demo'
export const PARENT_PASSWORD = 'ParentDemo1234'
export const STUDENT_ACCOUNT = 'chenxiaoman'
export const STUDENT_PASSWORD = '123456'

export interface ApiResult {
  status: number
  body: Record<string, unknown>
}

export async function assertDemoFixtures(): Promise<void> {
  const org = await one<{ id: string }>('select id from public.org where id = $1', [DEMO_ORG_ID])
  if (!org) throw new Error('demo 机构缺失，先跑 seed 脚本')

  const student = await one<{ id: string; org_id: string }>(
    'select id, org_id from public.student where account = $1',
    [STUDENT_ACCOUNT],
  )
  if (!student || student.org_id !== DEMO_ORG_ID) throw new Error('demo 学生 chenxiaoman 缺失或不在 demo 机构，先跑 seed 脚本')

  const parent = await one<{ id: string }>(
    'select id from public.parent_account where account = $1',
    [PARENT_ACCOUNT],
  )
  if (!parent) throw new Error('demo 家长 parent.demo 缺失，先跑 seed 脚本')

  const binding = await one<{ id: string }>(
    'select id from public.parent_binding where parent_account_id = $1 and student_id = $2 and revoked_at is null',
    [parent.id, student.id],
  )
  if (!binding) throw new Error('demo 家长未绑定 chenxiaoman，先跑 seed 脚本')

  const entitlement = await one<{ id: string }>(
    'select id from public.org_entitlement where org_id = $1 and module_id = $2',
    [DEMO_ORG_ID, 'python'],
  )
  if (!entitlement) throw new Error('demo 机构缺少 python entitlement，先跑 seed 脚本')
}

export async function snapshotEntitlement(moduleId: string): Promise<string | null> {
  const row = await one<{ revoked_at: string | null }>(
    'select revoked_at from public.org_entitlement where org_id = $1 and module_id = $2',
    [DEMO_ORG_ID, moduleId],
  )
  if (!row) throw new Error(`缺少 ${moduleId} entitlement，先跑 seed 脚本`)
  return row.revoked_at
}

export async function setEntitlementRevoked(moduleId: string, revokedAt: string | null): Promise<void> {
  await q('update public.org_entitlement set revoked_at = $1 where org_id = $2 and module_id = $3', [
    revokedAt,
    DEMO_ORG_ID,
    moduleId,
  ])
}

export async function snapshotOrgStatus(): Promise<string> {
  const row = await one<{ status: string }>('select status from public.org where id = $1', [DEMO_ORG_ID])
  if (!row) throw new Error('demo 机构缺失，先跑 seed 脚本')
  return row.status
}

export async function setOrgStatus(status: string): Promise<void> {
  await q('update public.org set status = $1 where id = $2', [status, DEMO_ORG_ID])
}

async function clearAndLogin(page: Page, path: string): Promise<void> {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.goto(path)
}

export async function loginOrg(page: Page): Promise<void> {
  await clearAndLogin(page, '/org/login')
  await page.getByLabel('账号').fill(ORG_ACCOUNT)
  await page.getByLabel('密码').fill(ORG_PASSWORD)
  await page.getByRole('button', { name: '进入机构端' }).click()
  await page.waitForURL(/\/org\/dashboard$/)
}

export async function loginParent(page: Page): Promise<void> {
  await clearAndLogin(page, '/parent/login')
  await page.getByLabel('用户名').fill(PARENT_ACCOUNT)
  await page.getByLabel('密码').fill(PARENT_PASSWORD)
  await page.getByRole('button', { name: '进入家长端' }).click()
  await page.waitForURL(/\/parent\/?$/)
}

export async function loginStudent(page: Page): Promise<void> {
  await clearAndLogin(page, '/student/login')
  await page.getByPlaceholder('例如 chenxiaoman').fill(STUDENT_ACCOUNT)
  await page.locator('input[type="password"]').fill(STUDENT_PASSWORD)
  await page.getByRole('button', { name: '进入课程地图' }).click()
  await page.waitForURL(/\/student\/?$/)
}

/** 在页面上下文里带对应角色的 token 调运行链路 API，避免测试代码重复拼 header。 */
export async function api(
  page: Page,
  path: string,
  body: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): Promise<ApiResult> {
  return page.evaluate(
    async ({ path, body, headers }) => {
      const prefix = path.includes('org-') ? 'org' : path.includes('parent') ? 'parent' : 'student'
      const token = localStorage.getItem(`cdg.auth.${prefix}`)
      const response = await fetch(path, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
          ...headers,
        },
        body: JSON.stringify(body),
      })
      let parsed: Record<string, unknown> = {}
      try {
        parsed = await response.json()
      } catch {
        parsed = {}
      }
      return { status: response.status, body: parsed }
    },
    { path, body, headers },
  )
}

/** 家长端进度卡数字：由 parent-portal 返回的 currentLevelOrder/position.unit 与课程表推导，不写死 demo 数字。 */
export async function parentUnitProgress(child: Record<string, unknown>): Promise<{ completed: number; total: number }> {
  const position = child.position as { unit?: { id?: string }; currentOrder?: number } | null | undefined
  const unitId = String(position?.unit?.id ?? '')
  const currentOrder = Number(child.currentLevelOrder ?? position?.currentOrder ?? 1)
  if (!unitId || !Number.isFinite(currentOrder)) throw new Error('parent-portal 未返回可用的课程位置，无法推导单元进度')
  const rows = await q<{ completed: number; total: number }>(
    `select
       count(*) filter (where sort_order < $2)::int as completed,
       count(*)::int as total
     from public.course_level
     where unit_id = $1 and published = true`,
    [unitId, currentOrder],
  )
  return { completed: rows[0]?.completed ?? 0, total: rows[0]?.total ?? 0 }
}

export async function enterLevelReason(page: Page, levelId: string): Promise<string> {
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/student-enter-level'))
  await page.goto(`/student/lesson/${levelId}`)
  const response = await responsePromise
  const body = (await response.json()) as { reason?: string }
  return body.reason ?? ''
}

const apiLogs = new WeakMap<Page, string[]>()

const WATCHED = [
  '/api/org-students',
  '/api/parent-portal',
  '/api/student-enter-level',
  '/api/student-learning',
]

export function watchAuthApi(page: Page): void {
  if (apiLogs.has(page)) return
  const lines: string[] = []
  apiLogs.set(page, lines)
  page.on('response', (response) => {
    if (!WATCHED.some((path) => response.url().includes(path))) return
    void response
      .text()
      .then((body) => {
        lines.push(`${response.request().method()} ${response.status()} ${response.url()}\n${body.slice(0, 4000)}`)
      })
      .catch((error: unknown) => {
        lines.push(`${response.request().method()} ${response.status()} ${response.url()}\n${String(error)}`)
      })
  })
}

export async function attachAuthDiagnostics(page: Page, info: TestInfo): Promise<void> {
  if (info.status === info.expectedStatus) return
  const lines = apiLogs.get(page) ?? []
  if (lines.length) {
    await info.attach('auth-api-responses.txt', {
      body: lines.join('\n---\n'),
      contentType: 'text/plain',
    })
  }
  await info.attach('auth-dom.html', {
    body: await page.content(),
    contentType: 'text/html',
  })
}
