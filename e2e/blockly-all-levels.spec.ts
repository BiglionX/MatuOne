import { readFileSync, writeFileSync } from 'node:fs'
import { relative } from 'node:path'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import {
  parseModuleLevelBody,
  type ModuleBlockInstance,
  type ModuleLevelBody,
} from '../src/modules/curriculum/moduleLevelBody'
import type { BlockExecutionNode } from '../src/modules/curriculum/moduleLevelInterpreter'

/**
 * 320 关正式正文的浏览器逐关验收。
 *
 * 默认跳过，避免常规 e2e 每次都跑半小时；需要全量验收时设置 E2E_ALL_BLOCKLY=1。
 * 可用 E2E_BLOCKLY_FROM / E2E_BLOCKLY_TO 限定数字关卡区间，失败后按同一区间复验。
 * 会话、准入和通关记录全部走浏览器桩，不写数据库；正文和标准解来自正式 manifest。
 */

interface ManifestLevel {
  levelId: string
  sortOrder: number
  title: string
  goal: string
  solution: BlockExecutionNode[]
  body: unknown
  blocks: number
  steps?: number
  ticks?: number
}

interface LevelResult {
  levelId: string
  sortOrder: number
  title: string
  scene: 'grid' | 'stage'
  status: 'passed' | 'failed'
  durationMs: number
  expectedBlocks: number
  actualBlocks: number | null
  evidence: string
  error?: string
  pageErrors: string[]
  consoleErrors: string[]
  screenshot?: string
}

interface AcceptanceReport {
  startedAt: string
  finishedAt: string
  baseURL: string
  range: { from: number; to: number }
  summary: {
    total: number
    passed: number
    failed: number
    durationMs: number
  }
  results: LevelResult[]
}

const manifestFiles = [
  'scripts/generated/blockly-80.manifest.json',
  'scripts/generated/blockly-level-1-80.manifest.json',
  'scripts/generated/blockly-stage-80.manifest.json',
]

const levels = manifestFiles
  .flatMap((file) => (JSON.parse(readFileSync(file, 'utf8')) as { levels: ManifestLevel[] }).levels)
  .sort((a, b) => a.sortOrder - b.sortOrder)

const expectedIds = Array.from({ length: 320 }, (_, index) => `blk-${String(index + 1).padStart(3, '0')}`)
expect(levels.map((level) => level.levelId)).toEqual(expectedIds)

function numericEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value)) throw new Error(`${name} 必须是整数`)
  return value
}

const from = numericEnv('E2E_BLOCKLY_FROM', 1)
const to = numericEnv('E2E_BLOCKLY_TO', 320)
if (from < 1 || to > 320 || from > to) throw new Error(`验收区间无效：${from}-${to}`)
const selectedLevels = levels.filter((level) => level.sortOrder >= from && level.sortOrder <= to)

/** 标准解递归转成初始积木，next 链和 then_else 的 null 分支都不能丢。 */
function toInitialBlock(node: BlockExecutionNode, id: string): ModuleBlockInstance {
  return {
    id,
    type: node.type,
    args: node.args,
    ...(node.next ? { next: toInitialBlock(node.next, `${id}-next`) } : {}),
    ...(node.children
      ? { children: node.children.map((child, index) => child ? toInitialBlock(child, `${id}-child-${index + 1}`) : null) }
      : {}),
  }
}

/** 注入标准解，但跳过绘本和复习卡；它们是独立 UI，不参与本轮逐关运行验收。 */
function acceptanceBody(level: ManifestLevel): ModuleLevelBody {
  const body = parseModuleLevelBody(level.body)
  delete body.intro_story
  delete body.review
  body.workspace.initial_blocks = level.solution.map((node, index) => toInitialBlock(node, `solution-${index + 1}`))
  return body
}

async function prepareStudent(page: Page, getActiveLevel: () => ManifestLevel): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    localStorage.setItem('cdg.auth.student', 'e2e-all-blockly-student')
    localStorage.setItem('cdg.session.student', JSON.stringify({
      id: '22222222-2222-4222-8222-222222222222',
      orgId: '11111111-1111-4111-8111-111111111111',
      groupId: '33333333-3333-4333-8333-333333333333',
      name: '全量验收学生',
      account: 'all-blockly-e2e',
      status: 'active',
      currentLevelOrder: 1,
      lastActiveAt: new Date().toISOString(),
      bindCode: '',
      password: '',
    }))
  })
  await page.route('**/api/student-enter-level', (route) => route.fulfill({
    json: { allowed: true, reason: 'ok' },
  }))
  await page.route('**/api/student-learning', async (route) => {
    const payload = route.request().postDataJSON() as { action?: string; moduleId?: string; levelId?: string }
    if (payload.action === 'complete' && payload.moduleId === 'blockly') {
      await route.fulfill({ json: { ok: true } })
      return
    }
    if (payload.action !== 'level' || payload.moduleId !== 'blockly') {
      await route.fulfill({ json: { ok: true } })
      return
    }
    const active = getActiveLevel()
    if (payload.levelId !== active.levelId) {
      await route.fulfill({ status: 404, json: { error: `验收桩正在加载 ${active.levelId}` } })
      return
    }
    await route.fulfill({
      json: {
        level: {
          body: acceptanceBody(active),
          title: active.title,
          goal: active.goal,
          sort_order: active.sortOrder,
        },
      },
    })
  })
}

async function failureText(page: Page): Promise<string> {
  const detailButton = page.getByRole('button', { name: '查看错误信息', exact: true })
  if (await detailButton.isVisible().catch(() => false)) await detailButton.click()
  const text = await page.locator('main').innerText().catch(() => '')
  return text.replace(/\s+/g, ' ').trim().slice(-1200)
}

async function waitForSuccess(page: Page, body: ModuleLevelBody, level: ManifestLevel): Promise<string> {
  const deadline = Date.now() + (body.scene.type === 'stage' ? 90_000 : 60_000)
  const stage = page.locator('[data-stage-status]')
  const completion = page.locator('#completion-title')
  const reflectionAction = page.getByRole('button', { name: '我来试试', exact: true })
  const failedFeedback = page.getByText('再找找线索', { exact: true })

  while (Date.now() < deadline) {
    if (body.scene.type === 'stage') {
      const status = await stage.getAttribute('data-stage-status').catch(() => null)
      if (status === 'completed') return '舞台状态 completed，显示“已完成”'
      if (status === 'error' || status === 'finished' || status === 'stopped') {
        throw new Error(`舞台提前结束：${status}；${await failureText(page)}`)
      }
    } else {
      if (await completion.isVisible().catch(() => false)) return '通关完成层已显示'
      if (body.reflection && await reflectionAction.isVisible().catch(() => false)) return '标准解通关，反思题已出现'
      if (await failedFeedback.isVisible().catch(() => false)) {
        throw new Error(`标准解未通关；${await failureText(page)}`)
      }
    }
    await page.waitForTimeout(100)
  }
  throw new Error(`等待通关超时；${await failureText(page)}`)
}

async function verifyLevel(
  page: Page,
  level: ManifestLevel,
  testInfo: TestInfo,
  pageErrors: string[],
  consoleErrors: string[],
): Promise<LevelResult> {
  const startedAt = Date.now()
  const body = acceptanceBody(level)
  const result: LevelResult = {
    levelId: level.levelId,
    sortOrder: level.sortOrder,
    title: level.title,
    scene: body.scene.type,
    status: 'failed',
    durationMs: 0,
    expectedBlocks: level.blocks,
    actualBlocks: null,
    evidence: '',
    pageErrors: [],
    consoleErrors: [],
  }

  try {
    await page.goto(`/blockly/lesson/${level.levelId}`, { waitUntil: 'domcontentloaded' })
    const runButton = page.getByRole('button', { name: '运行', exact: true })
    await expect(runButton).toBeEnabled({ timeout: 60_000 })
    await expect(page.locator('[data-blockly-host] svg.blocklySvg')).toBeVisible()

    result.actualBlocks = await page.locator('[data-blockly-host] .blocklyDraggable').count()
    expect(result.actualBlocks, '工作区积木数必须和标准解一致').toBe(level.blocks)
    await expect(page.getByLabel('工作区积木数量')).toContainText(`已用 ${level.blocks} / 最多 ${body.workspace.max_blocks}`)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, '页面不应横向溢出').toBeLessThanOrEqual(1)

    await runButton.click()
    result.evidence = await waitForSuccess(page, body, level)
    expect(pageErrors, '运行期间不应有页面异常').toEqual([])
    result.status = 'passed'
  } catch (error: unknown) {
    result.error = error instanceof Error ? error.message : String(error)
    const screenshot = testInfo.outputPath(`${level.levelId}-failure.png`)
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined)
    result.screenshot = relative(process.cwd(), screenshot)
  } finally {
    result.durationMs = Date.now() - startedAt
    result.pageErrors = [...pageErrors]
    result.consoleErrors = [...consoleErrors]
    pageErrors.length = 0
    consoleErrors.length = 0
  }
  return result
}

test(`Blockly 320 关标准解浏览器验收（${from}-${to}）`, async ({ page }, testInfo) => {
  test.skip(process.env.E2E_ALL_BLOCKLY !== '1', '设置 E2E_ALL_BLOCKLY=1 后执行逐关浏览器验收')
  test.setTimeout(1_800_000)

  let activeLevel = selectedLevels[0]
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await prepareStudent(page, () => activeLevel)
  const report: AcceptanceReport = {
    startedAt: new Date().toISOString(),
    finishedAt: '',
    baseURL: testInfo.project.use.baseURL ?? '',
    range: { from, to },
    summary: { total: selectedLevels.length, passed: 0, failed: 0, durationMs: 0 },
    results: [],
  }
  const suiteStartedAt = Date.now()

  for (const [index, level] of selectedLevels.entries()) {
    activeLevel = level
    const result = await verifyLevel(page, level, testInfo, pageErrors, consoleErrors)
    report.results.push(result)
    if (result.status === 'passed') report.summary.passed += 1
    else report.summary.failed += 1
    const state = result.status === 'passed' ? 'PASS' : 'FAIL'
    console.log(`[${index + 1}/${selectedLevels.length}] ${state} ${level.levelId} ${level.title} ${(result.durationMs / 1000).toFixed(1)}s`)
    if (result.status === 'failed') console.log(`  ${result.error}`)
  }

  report.finishedAt = new Date().toISOString()
  report.summary.durationMs = Date.now() - suiteStartedAt
  const reportPath = testInfo.outputPath('blockly-all-levels-report.json')
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await testInfo.attach('320 关验收清单', { path: reportPath, contentType: 'application/json' })
  console.log(`验收完成：${report.summary.passed} 通过，${report.summary.failed} 失败，报告 ${relative(process.cwd(), reportPath)}`)

  const failedIds = report.results.filter((result) => result.status === 'failed').map((result) => result.levelId)
  expect(failedIds, '全部关卡必须逐关通过').toEqual([])
})
