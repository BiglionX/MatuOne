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
 *
 * 绘本字段（intro_story / review）由选项单独控制，默认一律不带。
 * 原因：manifest 里的 80 关正文已经带了绘本，如果默认带上，
 * 「这一关有没有绘本」就会随迁移有没有执行来回变，测试不再确定。
 * 现在绘本走的是显式开关：
 * - storyPages：注入一组指定的绘本页
 * - review：注入一张课前复习卡
 * - keepManifestStory：直接用 manifest 里生成器产出的绘本
 */
async function stubLevel(
  page: Page,
  levelId: string,
  options: {
    withSolution?: boolean
    stripFocus?: boolean
    initialHintText?: string
    /** 注入一组指定的绘本页。 */
    storyPages?: { type: string; speaker?: string; image?: string; content: string }[]
    /** 注入一张课前复习卡。 */
    review?: { question: string; answer: string; hint?: string }
    /** 保留 manifest 里生成器产出的绘本和复习卡。 */
    keepManifestStory?: boolean
  } = {},
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
  // 绘本单独控制：默认抹掉（模拟「这一关没有绘本的老关卡」），
  // 显式给了才注入。不受迁移有没有执行影响，两条路径都能测。
  const { intro_story: _introStory, review: _review, ...withoutStory } = body as Record<string, unknown>
  const storyBody: Record<string, unknown> = { ...withoutStory }
  if (options.keepManifestStory) {
    storyBody.intro_story = body.intro_story
    if (body.review) storyBody.review = body.review
  }
  if (options.storyPages) storyBody.intro_story = options.storyPages
  if (options.review) storyBody.review = options.review
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
        level: { ...json.level, body: storyBody, title: level.title, goal: level.goal },
      },
    })
  })
}

/** 打开一关并等积木工作区就绪。 */
async function openLesson(page: Page, levelId: string): Promise<void> {
  await page.goto(`/blockly/lesson/${levelId}`)
  await page.waitForSelector('svg.blocklySvg', { state: 'attached', timeout: 60_000 })
}

/** 打开一关，等到绘本或者工作区出现（两者有一个就行）。 */
async function openLessonOrStory(page: Page, levelId: string): Promise<void> {
  await page.goto(`/blockly/lesson/${levelId}`)
  await page.waitForSelector('.matu-story-backdrop, svg.blocklySvg', { state: 'attached', timeout: 60_000 })
}

/** 验收用的三页绘本。 */
const THREE_PAGE_STORY = [
  { type: 'text', speaker: '小精灵', content: '欢迎来到第二关！这一关我们再走远一点点。' },
  { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '「前进」积木就是这样：拖一块，我走一格。' },
  { type: 'image_text', image: 'run_button', speaker: '机器人', content: '今天要走到 2 格，所以要 2 块「前进」连在一起，再点「运行」。' },
]

/** 验收用的课前复习卡。 */
const REVIEW_CARD = {
  question: '上一关我们拖的是哪一块积木呀？',
  answer: '「前进」积木！',
  hint: '就是那个绿色的方块，拖一次我就走一格。',
}

/**
 * flyout 里找一块可见的积木。
 *
 * 不能直接用 `.first()`：BlocklyWorkspace 的 findHighlightBlock 会轮流切换分类，
 * flyout 里会残留切换前的隐藏积木 DOM，`.first()` 可能命中那个看不见的。
 */
async function findVisibleFlyoutBlock(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(() => {
    const host = document.querySelector('.blocklyFlyout')
    if (!host) return null
    for (const el of Array.from(host.querySelectorAll('.blocklyDraggable'))) {
      const r = el.getBoundingClientRect()
      if (r.width > 4 && r.height > 4) return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    }
    return null
  })
}

/**
 * 工具箱（flyout）当前的状态：宽度和真正可见的积木数。
 *
 * 宽度为 0 说明工具箱被收起了——这正是 Blockly 13 的老毛病：
 * 拖走一块积木时焦点移到拖拽层，toolbox 失焦就把 flyout 关了。
 */
async function flyoutState(page: Page): Promise<{ width: number; visible: number }> {
  return page.evaluate(() => {
    const host = document.querySelector('.blocklyFlyout')
    if (!host) return { width: 0, visible: 0 }
    const visible = Array.from(host.querySelectorAll('.blocklyDraggable')).filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 4 && r.height > 4
    }).length
    return { width: Math.round(host.getBoundingClientRect().width), visible }
  })
}

/**
 * 从 flyout 里拖一块积木到工作区的指定屏幕坐标。
 *
 * 工具箱是常驻的（见 BlocklyWorkspace 里的 setAutoClose(false)），
 * 所以拖走一块之后 flyout 里那块还在原位，不用再点一次分类才能接着拖。
 */
async function dragBlockFromFlyout(page: Page, toX: number, toY: number): Promise<void> {
  const from = await findVisibleFlyoutBlock(page)
  if (!from) throw new Error('工具箱里找不到可拖的积木')
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 12, from.y + 12, { steps: 5 })
  await page.mouse.move(toX, toY, { steps: 25 })
  await page.mouse.move(toX, toY, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(800)
}

/** 工作区里积木的实际位置（要排除 flyout 里那一块）。 */
async function workspaceBlocks(page: Page): Promise<{ x: number; y: number; w: number; h: number }[]> {
  return page.evaluate(() => {
    const svg = Array.from(document.querySelectorAll('svg.blocklySvg')).find((el) => !el.closest('.blocklyFlyout'))
    if (!svg) return []
    return Array.from(svg.querySelectorAll('g.blocklyDraggable')).map((el) => {
      const b = el.getBoundingClientRect()
      return { x: b.x, y: b.y, w: b.width, h: b.height }
    })
  })
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
    // 走 stub：不带绘本，直接进工作区，结果不受库里是否已迁移绘本数据的影响。
    await stubLevel(page, 'blk-001')
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

/**
 * 绘本情境导入 + 课前复习。
 *
 * 无师化场景的核心闭环：托辅老师不教编程，学生进关前必须先看懂这一关要做什么、
 * 再回忆上一关学过什么，才轮到拖积木。
 *
 * 两条路径都要能确定地验证：
 * - 关卡配了 intro_story / review：先全屏绘本，点「开始挑战」才渲染工作区；
 * - 关卡没配（老正文）：直接进工作区，不报错、不白屏。
 */
test.describe('绘本情境导入与课前复习', () => {
  test('配了绘本的关卡先出绘本，看完才进工作区', async ({ page }) => {
    await loginStudent(page)
    await stubLevel(page, 'blk-002', { storyPages: THREE_PAGE_STORY })
    await openLessonOrStory(page, 'blk-002')

    // 绘本是全屏的，这时候工作区一根积木都还没有。
    await expect(page.locator('.matu-story-backdrop')).toBeVisible()
    await expect(page.locator('svg.blocklySvg')).toHaveCount(0)

    // 三页绘本一页一页翻；最后一页的按钮才变成「开始挑战」。
    const chip = page.locator('.matu-story-page .chip')
    await expect(chip).toHaveText('第 1 / 3 页')
    await expect(page.getByRole('button', { name: '开始挑战' })).toHaveCount(0)

    await page.getByRole('button', { name: '下一页' }).click()
    await expect(chip).toHaveText('第 2 / 3 页')
    await page.getByRole('button', { name: '下一页' }).click()
    await expect(chip).toHaveText('第 3 / 3 页')
    await expect(page.getByRole('button', { name: '开始挑战' })).toBeVisible()

    // 点「开始挑战」才进工作区。
    await page.getByRole('button', { name: '开始挑战' }).click()
    await expect(page.locator('.matu-story-backdrop')).toHaveCount(0)
    await expect(page.locator('svg.blocklySvg')).toHaveCount(1)
  })

  test('没配绘本的关卡直接进工作区，不报错', async ({ page }) => {
    await loginStudent(page)
    // 正文里没有 intro_story / review，就是「没配绘本的老关卡」。
    await stubLevel(page, 'blk-001')
    await openLesson(page, 'blk-001')

    await expect(page.locator('.matu-story-backdrop')).toHaveCount(0)
    await expect(page.locator('svg.blocklySvg')).toHaveCount(1)
    // 页面上也没有残留的绘本容器。
    await expect(page.getByRole('button', { name: '开始挑战' })).toHaveCount(0)
  })

  test('复习卡排在绘本第一页之前，答案默认收着', async ({ page }) => {
    await loginStudent(page)
    await stubLevel(page, 'blk-002', { storyPages: THREE_PAGE_STORY, review: REVIEW_CARD })
    await openLessonOrStory(page, 'blk-002')

    // 先是复习卡。
    await expect(page.locator('.matu-story-page .chip')).toHaveText('课前复习')
    await expect(page.getByRole('button', { name: '看看答案' })).toBeVisible()
    // 答案默认不露出来，学生点了才给。
    await expect(page.locator('.matu-story-bubble')).toHaveCount(0)

    await page.getByRole('button', { name: '看看答案' }).click()
    await expect(page.locator('.matu-story-bubble')).toContainText('「前进」积木！')
    await expect(page.locator('.matu-story-bubble')).toContainText('绿色的方块')

    // 翻过复习卡才是绘本第一页。
    await page.getByRole('button', { name: '下一页' }).click()
    await expect(page.locator('.matu-story-page .chip')).toHaveText('第 1 / 3 页')
  })

  test('看完绘本后点「重新开始」不会再弹绘本', async ({ page }) => {
    await loginStudent(page)
    await stubLevel(page, 'blk-002', { storyPages: THREE_PAGE_STORY })
    await openLessonOrStory(page, 'blk-002')

    await page.getByRole('button', { name: '下一页' }).click()
    await expect(page.locator('.matu-story-page .chip')).toHaveText('第 2 / 3 页')
    await page.getByRole('button', { name: '下一页' }).click()
    await page.getByRole('button', { name: '开始挑战' }).click()
    await expect(page.locator('svg.blocklySvg')).toHaveCount(1)

    // 重试只重置工作区，不重播绘本。
    await page.getByRole('button', { name: '重新开始' }).click()
    await expect(page.locator('.matu-story-backdrop')).toHaveCount(0)
    await expect(page.locator('svg.blocklySvg')).toHaveCount(1)
  })

  test('生成器产出的绘本能正常播（走真实下发数据）', async ({ page }) => {
    await loginStudent(page)
    // 直接用 manifest 里生成器写入的绘本和复习卡。
    await stubLevel(page, 'blk-002', { keepManifestStory: true })
    await openLessonOrStory(page, 'blk-002')

    await expect(page.locator('.matu-story-backdrop')).toBeVisible()
    await expect(page.locator('.matu-story-page .chip')).toHaveText('课前复习')
    await expect(page.locator('.matu-story-backdrop')).toContainText('上一关我们拖的是哪一块积木呀？')
    // 答案也是下发的，点开就在。
    await page.getByRole('button', { name: '看看答案' }).click()
    await expect(page.locator('.matu-story-bubble')).toContainText('「前进」积木！')

    // 复习卡 + 3 页绘本一共 4 步，翻 3 次到最后一页。
    const chip = page.locator('.matu-story-page .chip')
    await page.getByRole('button', { name: '下一页' }).click()
    await expect(chip).toHaveText('第 1 / 3 页')
    await page.getByRole('button', { name: '下一页' }).click()
    await expect(chip).toHaveText('第 2 / 3 页')
    await page.getByRole('button', { name: '下一页' }).click()
    await expect(chip).toHaveText('第 3 / 3 页')

    await page.getByRole('button', { name: '开始挑战' }).click()
    await expect(page.locator('svg.blocklySvg')).toHaveCount(1)
  })
})

/**
 * 真实拖积木。
 *
 * 前面那些用例都用 initial_blocks 预置标准解，绕过了「从工具箱拖」这一步。
 * 无师化场景里孩子是真的要自己从工具箱拖的，所以这里必须走一次真鼠标拖拽，
 * 顺便验证拖出来的两块能自动吸附成一条链。
 */
test.describe('真实拖积木', () => {
  test('拖走一块后工具箱不收起，可以直接接着拖', async ({ page }) => {
    await loginStudent(page)
    // blk-002 只有一个分类、一块积木（前进），正好用来验证拖拽 + 吸附。
    await stubLevel(page, 'blk-002')
    await openLesson(page, 'blk-002')
    await page.waitForTimeout(1000)

    const canvas = await page.evaluate(() => {
      const svg = Array.from(document.querySelectorAll('svg.blocklySvg')).find((el) => !el.closest('.blocklyFlyout'))
      const r = svg!.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    })

    // 工具箱一进来就是开着的，「前进」直接看得见，不用先点【动作】。
    const before = await flyoutState(page)
    expect(before.width).toBeGreaterThan(0)
    expect(before.visible).toBeGreaterThan(0)

    await dragBlockFromFlyout(page, canvas.x + canvas.width * 0.3, canvas.y + canvas.height * 0.25)
    let placed = await workspaceBlocks(page)
    expect(placed).toHaveLength(1)

    // 关键回归点：拖走一块之后工具箱不能被收起。
    // Blockly 13 会在拖拽开始时把焦点移到拖拽层，toolbox 随之失焦并自动关闭 flyout，
    // 结果是孩子必须再点一次分类才能接着拖。这里锁住「工具箱常驻」这个行为。
    const after = await flyoutState(page)
    expect(after.width).toBeGreaterThan(0)
    expect(after.visible).toBeGreaterThan(0)

    // 第二块：全程不点分类，直接接着拖，并自动吸附成一条链。
    const first = placed[0]
    await dragBlockFromFlyout(page, first.x + first.w / 2, first.y + first.h + 16)
    placed = await workspaceBlocks(page)
    expect(placed).toHaveLength(2)

    await page.getByRole('button', { name: '运行', exact: true }).click()
    await expect(page.locator('#completion-title')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('.matu-win-flash')).toHaveCount(1)
  })
})
