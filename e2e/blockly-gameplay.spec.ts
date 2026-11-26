import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { loginStudent } from './auth-fixtures'

/**
 * Blockly 关卡页的游戏化交互。
 *
 * 分两拨：
 * - 「线上现状」直接打数据库里的关卡，验证小精灵的兜底引导在旧正文（没写 focus）下也管用；
 * - 「迁移后」把 manifest 里的新正文塞进接口响应，验证新数据带 focus、带收集物时的表现。
 */

interface ManifestLevel {
  levelId: string
  title: string
  goal: string
  solution: { type: string; args: Record<string, unknown> }[]
  body: {
    workspace: { initial_blocks: unknown[] }
    [key: string]: unknown
  }
}

const manifest = JSON.parse(
  readFileSync('scripts/generated/blockly-80.manifest.json', 'utf8'),
) as { levels: ManifestLevel[] }
const levelById = new Map(manifest.levels.map((level) => [level.levelId, level]))

/**
 * 把关卡正文换成 manifest 里的版本。
 *
 * 走真实请求再改写响应，接口形状保持和线上一致，不用自己拼 JSON。
 */
async function stubLevel(
  page: Page,
  levelId: string,
  options: { withSolution?: boolean; stripFocus?: boolean; initialHintText?: string } = {},
): Promise<void> {
  const level = levelById.get(levelId)
  if (!level) throw new Error(`manifest 里没有 ${levelId}`)
  // 标准解转成工作区初始积木，省得在浏览器里一块块拖。
  const withSolution = options.withSolution
    ? {
        ...level.body,
        workspace: {
          ...level.body.workspace,
          initial_blocks: level.solution.map((step, index) => ({
            id: `sol-${index + 1}`,
            type: step.type,
            args: step.args,
          })),
        },
      }
    : level.body
  // stripFocus 模拟「正文没写 focus」的旧关卡，用来单独验证兜底推断；
  // 否则这组断言会随迁移执行与否来回变，迁移一跑就红。
  const hints = (withSolution.hints ?? []) as { trigger: string; text: string; focus?: unknown }[]
  const body = options.stripFocus
    ? {
        ...withSolution,
        hints: hints.map((hint, index) => {
          const { focus: _focus, ...rest } = hint
          if (index === 0 && options.initialHintText) return { ...rest, text: options.initialHintText }
          return rest
        }),
      }
    : withSolution
  await page.route('**/api/student-learning', async (route) => {
    let payload: { action?: string; moduleId?: string } = {}
    try {
      payload = route.request().postDataJSON() as { action?: string; moduleId?: string }
    } catch {
      payload = {}
    }
    if (payload.action !== 'level' || payload.moduleId !== 'blockly') {
      await route.continue()
      return
    }
    const response = await route.fetch()
    const json = (await response.json()) as { level: Record<string, unknown> }
    await route.fulfill({
      response,
      json: {
        ...json,
        level: { ...json.level, body, title: level.title, goal: level.goal },
      },
    })
  })
}

/** 打开一关并等积木工作区就绪。 */
async function openLesson(page: Page, levelId: string): Promise<void> {
  await page.goto(`/blockly/lesson/${levelId}`)
  await page.waitForSelector('svg.blocklySvg', { state: 'attached', timeout: 60_000 })
}

test.describe('小精灵引导（正文没写 focus 时的兜底推断）', () => {
  test('提示里点了积木名，就把那一块高亮起来', async ({ page }) => {
    await loginStudent(page)
    await stubLevel(page, 'blk-001', {
      stripFocus: true,
      initialHintText: '把 5 块“前进”连起来，机器人就会一路走到绿色终点。',
    })
    await openLesson(page, 'blk-001')

    const bubble = page.locator('.matu-npc-bubble')
    await expect(bubble).toBeVisible()
    await expect(bubble).toContainText('前进')

    // 工具箱里的「前进」在闪。
    await expect(page.locator('.blocklyFlyout .matu-block-highlight')).toHaveCount(1)
  })

  test('提示里没点积木名，就闪工作区', async ({ page }) => {
    await loginStudent(page)
    await stubLevel(page, 'blk-002', {
      stripFocus: true,
      initialHintText: '先走三步到拐角，转个弯，再走三步。',
    })
    await openLesson(page, 'blk-002')

    await expect(page.locator('.matu-npc-bubble')).toBeVisible()
    // 文案只说「走三步、转个弯」，没点名积木，兜底指向工作区。
    await expect(page.locator('.blockly-workspace.matu-focus-ring')).toHaveCount(1)
    await expect(page.locator('.blocklyFlyout .matu-block-highlight')).toHaveCount(0)
  })

  test('运行没通关，小精灵换成失败提示', async ({ page }) => {
    await loginStudent(page)
    await stubLevel(page, 'blk-001', {
      stripFocus: true,
      initialHintText: '把 5 块“前进”连起来，机器人就会一路走到绿色终点。',
    })
    await openLesson(page, 'blk-001')

    await page.getByRole('button', { name: '运行', exact: true }).click()

    await expect(page.locator('.matu-npc-bubble')).toContainText('还没到终点')
    // 失败提示也得有个高亮目标，不能只是嘴上说说。
    await expect(page.locator('.matu-block-highlight').or(page.locator('.matu-focus-ring')).first()).toBeVisible()
  })

  test('音效开关默认关着，学生能自己打开', async ({ page }) => {
    await loginStudent(page)
    await openLesson(page, 'blk-001')

    const toggle = page.getByRole('button', { name: '打开关卡音效' })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await toggle.click()
    await expect(page.getByRole('button', { name: '关闭关卡音效' })).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('迁移后的新正文', () => {
  test('写了 focus 的提示会点名运行按钮', async ({ page }) => {
    await loginStudent(page)
    await stubLevel(page, 'blk-002')
    await openLesson(page, 'blk-002')

    await page.getByRole('button', { name: '运行', exact: true }).click()

    await expect(page.locator('.matu-npc-bubble')).toContainText('还没到终点')
    await expect(page.locator('button.matu-focus-ring')).toHaveCount(1)
  })

  test('收集物画得出来，路过时会被吃掉', async ({ page }) => {
    await loginStudent(page)
    await stubLevel(page, 'blk-002')
    await openLesson(page, 'blk-002')

    await expect(page.locator('.matu-collectible')).toHaveCount(1)
    // 形状是画出来的，不是空占位。
    const sizes = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.matu-collectible')).map((element) => {
        const rect = element.getBoundingClientRect()
        return `${Math.round(rect.width)}x${Math.round(rect.height)}`
      }),
    )
    expect(sizes.every((size) => !size.startsWith('0'))).toBe(true)
  })

  test('金币和星星各有各的形状', async ({ page }) => {
    await loginStudent(page)
    await stubLevel(page, 'blk-003')
    await openLesson(page, 'blk-003')

    await expect(page.locator('.matu-collectible-coin')).toHaveCount(1)
    await expect(page.locator('.matu-collectible-star')).toHaveCount(1)
  })

  test('跑到终点会撒花，音效也会响', async ({ page }) => {
    // 数一下 AudioContext 被创建了几次，用来确认音效真的出声了。
    await page.addInitScript(() => {
      const scope = window as unknown as { AudioContext?: typeof AudioContext; __audioCount?: () => number }
      const Original = scope.AudioContext
      if (!Original) return
      let count = 0
      scope.__audioCount = () => count
      scope.AudioContext = class extends Original {
        constructor(...args: ConstructorParameters<typeof AudioContext>) {
          super(...args)
          count += 1
        }
      } as unknown as typeof AudioContext
    })

    await loginStudent(page)
    await stubLevel(page, 'blk-002', { withSolution: true })
    await openLesson(page, 'blk-002')

    // 工作区里已经有两块「前进」
    await expect(page.locator('svg.blocklySvg g.blocklyDraggable')).toHaveCount(2)
    await expect(page.locator('.matu-collectible')).toHaveCount(1)

    await page.getByRole('button', { name: '打开关卡音效' }).click()
    await page.getByRole('button', { name: '运行', exact: true }).click()

    await expect(page.locator('.matu-confetti')).toHaveCount(28, { timeout: 30_000 })
    await expect(page.locator('.matu-collectible')).toHaveCount(0)
    await expect(page.locator('.matu-win-flash')).toHaveCount(1)

    const audioCount = await page.evaluate(() => {
      const scope = window as unknown as { __audioCount?: () => number }
      return scope.__audioCount?.() ?? 0
    })
    expect(audioCount).toBeGreaterThan(0)
  })
})
