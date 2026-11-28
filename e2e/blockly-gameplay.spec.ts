import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * Blockly 关卡页的游戏化交互。
 *
 * 全部用 manifest 正文和浏览器桩，不直连数据库：
 * - stripFocus 模拟旧正文（没写 focus），验证小精灵的兜底引导；
 * - 默认保留新正文的 focus，验证高亮、收集物、绘本和实时计数等表现。
 */

interface ManifestSolution {
  type: string
  args: Record<string, unknown>
  children?: ManifestSolution[]
  next?: ManifestSolution
}

interface ManifestLevel {
  levelId: string
  title: string
  goal: string
  solution: ManifestSolution[]
  body: {
    workspace: { initial_blocks: unknown[] }
    [key: string]: unknown
  }
}

const manifest = JSON.parse(
  readFileSync('scripts/generated/blockly-80.manifest.json', 'utf8'),
) as { levels: ManifestLevel[] }
const levelById = new Map(manifest.levels.map((level) => [level.levelId, level]))
const stageManifest = JSON.parse(
  readFileSync('scripts/generated/blockly-stage-80.manifest.json', 'utf8'),
) as { levels: ManifestLevel[] }
const stageLevelById = new Map(stageManifest.levels.map((level) => [level.levelId, level]))

const APPLE_SAMPLE_FILE = 'supabase/migrations/20261126180000_blockly_stage_blk_031_apple_sample.sql'

/** 直接用正式接苹果正文，避免浏览器测试依赖数据库迁移是否已经执行。 */
function appleSampleBodyWithoutStory(): Record<string, unknown> {
  const sql = readFileSync(APPLE_SAMPLE_FILE, 'utf8')
  const matched = sql.match(/\$body\$([\s\S]*?)\$body\$::jsonb/)
  if (!matched?.[1]) throw new Error('接苹果迁移缺少正文')
  const body = JSON.parse(matched[1]) as Record<string, unknown>
  delete body.intro_story
  delete body.review
  return body
}

const APPLE_SOLUTION: ManifestSolution[] = [{
  type: 'forever',
  args: {},
  children: [
    { type: 'move_steps', args: { steps: 10 } },
    { type: 'if_touching', args: { target_sprite_id: 'apple' }, children: [{ type: 'change_variable', args: { variable_id: 'score', value: 1 } }] },
    { type: 'if_touching', args: { target_sprite_id: 'apple-2' }, children: [{ type: 'change_variable', args: { variable_id: 'score', value: 1 } }] },
    { type: 'if_touching', args: { target_sprite_id: 'apple-3' }, children: [{ type: 'change_variable', args: { variable_id: 'score', value: 1 } }] },
  ],
}]

const APPLE_MISS_SOLUTION: ManifestSolution[] = [{
  type: 'forever',
  args: {},
  children: [{ type: 'move_steps', args: { steps: -10 } }],
}]

const APPLE_ONE_SOLUTION: ManifestSolution[] = [{
  type: 'forever',
  args: {},
  children: [
    { type: 'move_steps', args: { steps: 10 } },
    { type: 'if_touching', args: { target_sprite_id: 'apple' }, children: [{ type: 'change_variable', args: { variable_id: 'score', value: 1 } }] },
  ],
}]

/** blk-161 的分步验收标准解；顶层初始化与循环分别成链。 */
const APPLE_STAGE_SOLUTION: ManifestSolution[] = [
  { type: 'set_variable', args: { variable_id: 'score', value: 0 } },
  {
    type: 'forever',
    args: {},
    children: [
      { type: 'move_steps', args: { steps: 6 } },
      { type: 'if_touching', args: { target_sprite_id: 'apple-1' }, children: [{ type: 'change_variable', args: { variable_id: 'score', value: 1 } }] },
      { type: 'if_touching', args: { target_sprite_id: 'apple-2' }, children: [{ type: 'change_variable', args: { variable_id: 'score', value: 1 } }] },
    ],
  },
]

/** 标准解转成初始积木时保留嵌套结构，避免把控制块的子块悄悄丢掉。 */
function toInitialBlock(step: ManifestSolution, id: string): unknown {
  return {
    id,
    type: step.type,
    args: step.args,
    ...(step.children ? { children: step.children.map((child, index) => toInitialBlock(child, `${id}-${index + 1}`)) } : {}),
    ...(step.next ? { next: toInitialBlock(step.next, `${id}-next`) } : {}),
  }
}

/**
 * Blockly 交互测试只验证前端，不直连数据库，也不写线上通关记录。
 * 会话和准入用浏览器桩；正文仍由下面的 stubLevel 注入。
 */
async function prepareBlocklyStudent(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('cdg.auth.student', 'e2e-blockly-student')
    localStorage.setItem('cdg.session.student', JSON.stringify({
      id: '22222222-2222-4222-8222-222222222222',
      orgId: '11111111-1111-4111-8111-111111111111',
      groupId: '33333333-3333-4333-8333-333333333333',
      name: '测试学生',
      account: 'blockly-e2e',
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
}

/**
 * 把关卡正文换成 manifest 里的版本。
 *
 * 直接按 manifest 构造接口响应，接口形状保持和线上一致，不依赖数据库或迁移状态。
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
    /** 用指定正文替换 manifest 正文，例如接苹果 Stage 样板。 */
    bodyOverride?: Record<string, unknown>
    /** bodyOverride 场景下使用的标准解。 */
    solution?: ManifestSolution[]
  } = {},
): Promise<void> {
  const fallbackLevel: ManifestLevel = {
    levelId,
    title: '接苹果',
    goal: '左右移动小猫，接住 3 个下落的苹果',
    solution: [],
    body: { workspace: { initial_blocks: [] } },
    sortOrder: 161,
  }
  const level = levelById.get(levelId) ?? (options.bodyOverride ? fallbackLevel : undefined)
  if (!level) throw new Error(`manifest 里没有 ${levelId}`)
  // 标准解转成工作区初始积木，省得在浏览器里一块块拖。
  const sourceBody = (options.bodyOverride ?? level.body) as Record<string, unknown>
  const sourceSolution = options.solution ?? level.solution
  const sourceWorkspace = (sourceBody.workspace ?? {}) as Record<string, unknown>
  const withSolution = options.withSolution
    ? {
        ...sourceBody,
        workspace: {
          ...sourceWorkspace,
          initial_blocks: sourceSolution.map((step, index) => toInitialBlock(step, `sol-${index + 1}`)),
        },
      }
    : sourceBody
  // stripFocus 模拟「正文没写 focus」的旧关卡，用来单独验证兜底推断；
  // 否则这组断言会随迁移执行与否来回变，迁移一跑就红。
  // initialHintText 覆盖第一条提示的文案，和 stripFocus 相互独立：
  // 有些用例要的是「提示里提到了金币」这种正文，而 focus 还得留着。
  const hints = (withSolution.hints ?? []) as { trigger: string; text: string; focus?: unknown }[]
  const withText = options.initialHintText
    ? hints.map((hint, index) => (index === 0 ? { ...hint, text: options.initialHintText } : hint))
    : hints
  const body = options.stripFocus
    ? {
        ...withSolution,
        hints: withText.map((hint) => {
          const { focus: _focus, ...rest } = hint
          return rest
        }),
      }
    : { ...withSolution, hints: withText }
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
    if (payload.action === 'complete' && payload.moduleId === 'blockly') {
      await route.fulfill({ json: { ok: true } })
      return
    }
    if (payload.action !== 'level' || payload.moduleId !== 'blockly') {
      await route.continue()
      return
    }
    await route.fulfill({
      json: {
        level: { body: storyBody, title: level.title, goal: level.goal, sort_order: level.sortOrder },
      },
    })
  })
}

/** 打开一关并等积木工作区就绪。 */
async function openLesson(page: Page, levelId: string): Promise<void> {
  await page.goto(`/blockly/lesson/${levelId}`)
  await page.waitForSelector('svg.blocklySvg', { state: 'attached', timeout: 120_000 })
}

/** 打开一关，等到绘本或者工作区出现（两者有一个就行）。 */
async function openLessonOrStory(page: Page, levelId: string): Promise<void> {
  await page.goto(`/blockly/lesson/${levelId}`)
  await page.waitForSelector('.matu-story-backdrop, svg.blocklySvg', { state: 'attached', timeout: 120_000 })
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
    await prepareBlocklyStudent(page)
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
    await prepareBlocklyStudent(page)
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
    await prepareBlocklyStudent(page)
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

  test('最后一步验收通过后显示运行按钮，点击即可运行', async ({ page }, testInfo) => {
    await prepareBlocklyStudent(page)
    const stageLevel = stageLevelById.get('blk-161')
    if (!stageLevel) throw new Error('舞台 manifest 里没有 blk-161')
    await stubLevel(page, 'blk-161', {
      bodyOverride: stageLevel.body,
      withSolution: true,
      solution: APPLE_STAGE_SOLUTION,
    })
    await openLesson(page, 'blk-161')

    const next = page.getByRole('button', { name: '我已完成，下一步' })
    const runAccepted = page.getByRole('button', { name: '已完成，可以运行看看效果了' })
    await expect(next).toBeVisible()
    await expect(runAccepted).toHaveCount(0)
    for (let index = 0; index < 4; index += 1) await next.click()

    await expect(page.locator('.matu-npc-bubble')).toContainText('角色会自己判断啦！')
    await expect(runAccepted).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('blockly-final-step-accepted.png'), fullPage: true })
    await runAccepted.click()
    await expect(page.getByLabel('舞台计分板')).toContainText('⭐ 得分：2', { timeout: 30_000 })
    await expect(page.locator('.matu-npc-bubble')).toContainText('这一关过啦！')
  })

  test('舞台多个顶层循环保持并行，不串成顺序链', async ({ page }) => {
    await prepareBlocklyStudent(page)
    const stageLevel = stageLevelById.get('blk-241')
    if (!stageLevel) throw new Error('舞台 manifest 里没有 blk-241')
    await stubLevel(page, 'blk-241', {
      bodyOverride: stageLevel.body,
      withSolution: true,
      solution: stageLevel.solution,
    })
    await openLesson(page, 'blk-241')

    await page.getByRole('button', { name: '运行', exact: true }).click()
    await expect(page.locator('[data-stage-status]')).toHaveAttribute('data-stage-status', 'completed', { timeout: 30_000 })
  })

  test('音效开关默认关着，学生能自己打开', async ({ page }) => {
    await prepareBlocklyStudent(page)
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
  test('失败提示的 focus 会指向本关可用积木', async ({ page }) => {
    await prepareBlocklyStudent(page)
    await stubLevel(page, 'blk-002')
    await openLesson(page, 'blk-002')

    await page.getByRole('button', { name: '运行', exact: true }).click()

    await expect(page.locator('.matu-npc-bubble')).toContainText('还没到终点')
    await expect(page.locator('.blocklyFlyout .matu-block-highlight')).toHaveCount(1)
  })

  test('这一关只教走到终点，就一个金币都不画', async ({ page }) => {
    await prepareBlocklyStudent(page)
    await stubLevel(page, 'blk-002')
    await openLesson(page, 'blk-002')

    // blk-002 的提示里没提收集，金币就只是干扰，直接不画。
    await expect(page.locator('.matu-collectible')).toHaveCount(0)
    // 地图上的障碍物换成柔和的浅紫，不再是沉重的深灰。
    const obstacleColor = await page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('[aria-label="障碍物"]'))
      return cells[0] ? getComputedStyle(cells[0]).backgroundColor : ''
    })
    expect(obstacleColor).not.toBe('rgb(226, 232, 240)')
  })

  test('提示里讲了吃金币，金币就画出来，路过时会被吃掉', async ({ page }) => {
    await prepareBlocklyStudent(page)
    await stubLevel(page, 'blk-002', { initialHintText: '把「前进」拖到工作区，吃到金币可以加分哦。' })
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
    // 提示里也得把「加分」讲清楚，别让画面和话对不上。
    await expect(page.locator('main')).toContainText('吃到金币可以加分哦')
  })

  test('金币和星星各有各的形状', async ({ page }) => {
    await prepareBlocklyStudent(page)
    await stubLevel(page, 'blk-003', { initialHintText: '把「前进」拖到工作区，吃到金币可以加分哦。' })
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

    await prepareBlocklyStudent(page)
    // 提示里提到金币，这一关才画金币，才好验证「路过被吃掉」。
    await stubLevel(page, 'blk-002', { withSolution: true, initialHintText: '把「前进」拖到工作区，吃到金币可以加分哦。' })
    await openLesson(page, 'blk-002')

    // 工作区里已经有两块「前进」，计数要同步预置积木的真实数量。
    await expect(page.locator('svg.blocklySvg g.blocklyDraggable')).toHaveCount(2)
    await expect(page.getByLabel('工作区积木数量')).toHaveText('已用 2 / 最多 2')
    await expect(page.getByText('已达上限，删除一块后再加新的')).toBeVisible()
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

test.describe('积木转 Python 代码', () => {
  test('核心积木生成高亮代码，切换视图不丢工作区且字段修改实时同步', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await prepareBlocklyStudent(page)
    const stageLevel = stageLevelById.get('blk-161')
    if (!stageLevel) throw new Error('舞台 manifest 里没有 blk-161')
    await stubLevel(page, 'blk-161', {
      bodyOverride: stageLevel.body,
      withSolution: true,
      solution: APPLE_STAGE_SOLUTION,
    })
    await openLesson(page, 'blk-161')

    const codeTab = page.getByRole('tab', { name: 'Python 代码' })
    await expect(codeTab).toBeEnabled()
    await codeTab.click()
    const code = page.getByTestId('python-code')
    await expect(code).toContainText('import robot')
    await expect(code).toContainText('score = 0')
    await expect(code).toContainText('while True:')
    await expect(code).toContainText('move_steps(6)')
    await expect(code).toContainText("if is_touching('apple-1'):")
    await expect(code).toContainText('score += 1')
    await expect(page.locator('.blockly-workspace')).toBeHidden()
    await expect(page.getByRole('separator', { name: '调整积木工作区高度' })).toHaveCount(0)

    const bubble = page.locator('.matu-npc-bubble')
    if (await bubble.isVisible()) await bubble.click()
    await page.screenshot({ path: testInfo.outputPath('blockly-python-code-view.png'), fullPage: true })

    await page.getByRole('tab', { name: '积木视图' }).click()
    await expect(page.locator('.blockly-workspace')).toBeVisible()
    await expect(page.getByLabel('工作区积木数量')).toContainText('已用 7 /')
    await expect(page.locator('svg.blocklySvg')).toBeVisible()

    // 真鼠标编辑 Blockly 数字字段，验证 change 事件也会刷新 Python，而不只是增删积木。
    await page.getByRole('button', { name: 'Edit number: 6', exact: true }).click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('12')
    await page.keyboard.press('Enter')

    await codeTab.click()
    await expect(code).toContainText('move_steps(12)')
    await expect(code).not.toContainText('move_steps(6)')
    await page.getByRole('tab', { name: '积木视图' }).click()
    await expect(page.getByLabel('工作区积木数量')).toContainText('已用 7 /')
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
    await prepareBlocklyStudent(page)
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
    await prepareBlocklyStudent(page)
    // 正文里没有 intro_story / review，就是「没配绘本的老关卡」。
    await stubLevel(page, 'blk-001')
    await openLesson(page, 'blk-001')

    await expect(page.locator('.matu-story-backdrop')).toHaveCount(0)
    await expect(page.locator('svg.blocklySvg')).toHaveCount(1)
    // 页面上也没有残留的绘本容器。
    await expect(page.getByRole('button', { name: '开始挑战' })).toHaveCount(0)
  })

  test('复习卡排在绘本第一页之前，答案默认收着', async ({ page }) => {
    await prepareBlocklyStudent(page)
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
    await prepareBlocklyStudent(page)
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
    await prepareBlocklyStudent(page)
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
 * 低龄化界面。
 *
 * 一年级学生看的是「少而清楚」：同一句话不重复说、小精灵别一直挡着积木、
 * 工作区要比地图宽（挤窄了就拖不动积木了）。
 */
test.describe('低龄化界面', () => {
  test('小精灵提示读完会自己收起来', async ({ page }) => {
    await prepareBlocklyStudent(page)
    await stubLevel(page, 'blk-002')
    await openLesson(page, 'blk-002')

    const bubble = page.locator('.matu-npc-bubble')
    await expect(bubble).toBeVisible()
    // 五秒后自动收起，别一直挡着工作区。
    await expect(bubble).toHaveCount(0, { timeout: 10_000 })
  })

  test('点气泡的任意位置就能关掉它', async ({ page }) => {
    await prepareBlocklyStudent(page)
    await stubLevel(page, 'blk-002')
    await openLesson(page, 'blk-002')

    const bubble = page.locator('.matu-npc-bubble')
    await expect(bubble).toBeVisible()
    await bubble.click()
    await expect(bubble).toHaveCount(0)

    // 再点一次小精灵，它会重新讲一遍。
    await page.getByRole('button', { name: '小精灵，再讲一遍这一关怎么做' }).click()
    await expect(bubble).toBeVisible()
  })

  test('工作区比地图宽，工具箱不会被挤扁', async ({ page }) => {
    await prepareBlocklyStudent(page)
    await stubLevel(page, 'blk-002')
    await openLesson(page, 'blk-002')

    const widths = await page.evaluate(() => {
      const stage = document.querySelector('[aria-labelledby="stage-title"]')
      const workspace = document.querySelector('[aria-labelledby="workspace-title"]')
      return {
        stage: stage ? stage.getBoundingClientRect().width : 0,
        workspace: workspace ? workspace.getBoundingClientRect().width : 0,
      }
    })
    expect(widths.workspace).toBeGreaterThan(widths.stage)
  })

  test('「已用 / 最多」只显示在工作区上方', async ({ page }) => {
    await prepareBlocklyStudent(page)
    await stubLevel(page, 'blk-002')
    await openLesson(page, 'blk-002')

    const counter = page.getByLabel('工作区积木数量')
    await expect(counter).toHaveText('已用 0 / 最多 2')
    await expect(page.locator('[aria-labelledby="workspace-title"]').getByLabel('工作区积木数量')).toHaveCount(1)
    // 地图区不再重复上限说明。
    await expect(page.locator('[aria-labelledby="stage-title"]').getByLabel('工作区积木数量')).toHaveCount(0)
  })

  test('嵌套子块也计入实时积木数', async ({ page }) => {
    await prepareBlocklyStudent(page)
    await stubLevel(page, 'blk-033', { withSolution: true })
    await openLesson(page, 'blk-033')

    // 一个 repeat + 它里面的 move_forward = 2 块，不是只数顶层。
    await expect(page.getByLabel('工作区积木数量')).toHaveText('已用 2 / 最多 2')
    await expect(page.locator('svg.blocklySvg g.blocklyDraggable')).toHaveCount(2)
    await page.getByRole('button', { name: '运行', exact: true }).click()
    await expect(page.getByRole('button', { name: '我来试试', exact: true })).toBeVisible({ timeout: 30_000 })
  })

  test('工作区随视口撑满，分类、变量和控件低龄化', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await prepareBlocklyStudent(page)
    await stubLevel(page, 'blk-161', { bodyOverride: appleSampleBodyWithoutStory() })
    await openLesson(page, 'blk-161')

    await expect(page.locator('.blocklyToolboxCategoryIcon')).toHaveText(['🏃', '🏷️', '🔁'])
    await expect(page.locator('.blocklyToolboxCategoryIcon').nth(0)).toBeVisible()
    await expect(page.locator('.blocklyToolboxCategoryIcon').nth(1)).toBeVisible()
    await expect(page.locator('.blocklyToolboxCategoryIcon').nth(2)).toBeVisible()
    await expect(page.getByLabel('本关变量')).toContainText('⭐ 得分：0')
    await expect(page.getByLabel('舞台计分板')).toContainText('⭐ 得分：0')
    await expect(page.getByLabel('新变量名')).toHaveCount(0)
    await expect(page.getByPlaceholder('输入变量名')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '创建变量' })).toHaveCount(0)
    await expect(page.getByLabel('怎么玩')).toHaveCount(0)
    await expect(page.getByText('① 从左边拖积木')).toHaveCount(0)
    await expect(page.getByText('② 可以搭多条链')).toHaveCount(0)
    await expect(page.getByText('③ 点「运行」')).toHaveCount(0)

    const measure = () => page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('.blockly-workspace')
      const host = document.querySelector<HTMLElement>('[data-blockly-host]')
      const injection = host?.querySelector<HTMLElement>('.injectionDiv')
      const toolbox = document.querySelector<HTMLElement>('.blocklyToolbox')
      const stage = document.querySelector<HTMLElement>('.matu-stage')
      const labels = Array.from(document.querySelectorAll<HTMLElement>('.blocklyToolboxCategoryLabel'))
      const nativeControls = document.querySelectorAll('.blocklyZoom, .blocklyTrash').length
      return {
        workspaceHeight: root?.getBoundingClientRect().height ?? 0,
        hostHeight: host?.getBoundingClientRect().height ?? 0,
        injectionHeight: injection?.getBoundingClientRect().height ?? 0,
        stageRadius: stage ? getComputedStyle(stage).borderRadius : '',
        toolboxBackground: toolbox ? getComputedStyle(toolbox).backgroundColor : '',
        writingModes: labels.map((label) => getComputedStyle(label).writingMode),
        nativeControls,
      }
    })

    const first = await measure()
    console.log('layout-probe', JSON.stringify(first))
    console.log('icon-probe', JSON.stringify(await page.locator('.blocklyToolboxCategoryIcon').evaluateAll((icons) => icons.map((icon) => ({
      text: icon.textContent,
      color: getComputedStyle(icon).color,
      display: getComputedStyle(icon).display,
      fontSize: getComputedStyle(icon).fontSize,
      backgroundImage: getComputedStyle(icon).backgroundImage,
      rect: icon.getBoundingClientRect().toJSON(),
    })))))
    expect(first.workspaceHeight).toBeGreaterThan(500)
    expect(first.hostHeight).toBeGreaterThan(450)
    expect(first.injectionHeight).toBeGreaterThan(450)
    expect(first.stageRadius).toBe('12px')
    expect(first.toolboxBackground).toBe('rgb(241, 245, 249)')
    expect(first.writingModes.every((mode) => mode === 'horizontal-tb')).toBe(true)
    expect(first.nativeControls).toBe(0)
    await expect(page.getByLabel('工作区工具').getByRole('button')).toHaveCount(4)
    await expect(page.getByRole('button', { name: '放大积木' })).toBeVisible()
    await expect(page.getByRole('button', { name: '缩小积木' })).toBeVisible()
    await expect(page.getByRole('button', { name: '把积木摆进视野' })).toBeVisible()
    await expect(page.getByRole('button', { name: '清空积木' })).toBeVisible()

    await page.setViewportSize({ width: 1440, height: 1080 })
    await expect.poll(async () => (await measure()).workspaceHeight).toBeGreaterThan(first.workspaceHeight + 100)
  })

  test('工作区下沿可拖高，双击恢复默认高度', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await prepareBlocklyStudent(page)
    await stubLevel(page, 'blk-002')
    await openLesson(page, 'blk-002')

    const area = page.getByTestId('blockly-workspace-area')
    const handle = page.getByRole('separator', { name: '调整积木工作区高度' })
    const before = await area.evaluate((element) => element.getBoundingClientRect().height)
    const rect = await handle.evaluate((element) => element.getBoundingClientRect().toJSON())
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
    await page.mouse.down()
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2 + 180, { steps: 8 })
    await page.mouse.up()

    await expect.poll(async () => area.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(before + 150)
    await page.screenshot({ path: testInfo.outputPath('blockly-workspace-resized.png'), fullPage: true })
    await handle.dblclick()
    await expect.poll(async () => area.evaluate((element) => element.getBoundingClientRect().height)).toBeCloseTo(before, 0)
  })

  test('失败反馈显示目标进度并指出缺失的碰撞判断', async ({ page }, testInfo) => {
    await prepareBlocklyStudent(page)
    await stubLevel(page, 'blk-161', {
      bodyOverride: appleSampleBodyWithoutStory(),
      withSolution: true,
      solution: APPLE_ONE_SOLUTION,
    })
    await openLesson(page, 'blk-161')
    await page.getByRole('button', { name: '运行', exact: true }).click()

    await expect(page.getByText('再找找线索')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByLabel('得分：1 / 3')).toBeVisible()
    await expect(page.getByLabel('接住苹果：1 / 3')).toBeVisible()
    await page.getByRole('button', { name: '查看错误信息' }).click()
    await expect(page.getByText(/苹果 2、苹果 3 还没接住/)).toBeVisible()
    await expect(page.getByText(/工作区里还没有「如果碰到 苹果 2」/)).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('blockly-error-feedback.png'), fullPage: true })
  })

  test('苹果自动落到底部，小猫能向左移动且不会误加分', async ({ page }) => {
    await prepareBlocklyStudent(page)
    await stubLevel(page, 'blk-161', {
      bodyOverride: appleSampleBodyWithoutStory(),
      withSolution: true,
      solution: APPLE_MISS_SOLUTION,
    })
    await openLesson(page, 'blk-161')

    const positions = () => page.evaluate(() => ({
      playerLeft: parseFloat((document.querySelector<HTMLElement>('.matu-stage-sprite[title="player"]')?.style.left ?? '0')),
      appleTop: parseFloat((document.querySelector<HTMLElement>('.matu-stage-sprite[title="apple-3"]')?.style.top ?? '0')),
    }))
    const initial = await positions()
    expect(initial.playerLeft).toBeGreaterThan(30)
    expect(initial.appleTop).toBeLessThan(70)

    await page.getByRole('button', { name: '运行', exact: true }).click()
    await expect.poll(async () => (await positions()).playerLeft).toBeLessThan(initial.playerLeft - 10)
    await expect.poll(async () => (await positions()).appleTop).toBeGreaterThan(90)
    await expect(page.getByLabel('本关变量')).toContainText('⭐ 得分：0')
    await expect(page.getByLabel('舞台计分板')).toContainText('⭐ 得分：0')
    await expect(page.locator('.matu-stage-sprite[title="apple-3"]')).toBeVisible()
    await expect(page.locator('#completion-title')).toHaveCount(0)

    await page.getByRole('button', { name: '停止', exact: true }).click()
    await expect(page.locator('.matu-stage-status')).toHaveText('已停止')
  })

  test('小猫向右接住 3 个苹果，变量徽章和舞台计分板同步加分', async ({ page }) => {
    await prepareBlocklyStudent(page)
    await stubLevel(page, 'blk-161', {
      bodyOverride: appleSampleBodyWithoutStory(),
      withSolution: true,
      solution: APPLE_SOLUTION,
    })
    await openLesson(page, 'blk-161')

    // Blockly 会把三个选项的公共前缀「苹果」拆成独立文本节点，比较时去掉布局空白。
    const workspaceText = (await page.locator('[data-blockly-host]').evaluate((element) => element.textContent ?? '')).replace(/\s+/g, '')
    expect(workspaceText).toContain('苹果1')
    expect(workspaceText).toContain('苹果2')
    expect(workspaceText).toContain('苹果3')
    const initialLeft = await page.locator('.matu-stage-sprite[title="player"]').evaluate((element) => parseFloat((element as HTMLElement).style.left))

    await page.getByRole('button', { name: '运行', exact: true }).click()
    await expect(page.getByLabel('舞台计分板')).toContainText('⭐ 得分：3', { timeout: 30_000 })
    await expect(page.getByLabel('本关变量')).toContainText('⭐ 得分：3')
    await expect(page.locator('#completion-title')).toBeVisible()
    const finalLeft = await page.locator('.matu-stage-sprite[title="player"]').evaluate((element) => parseFloat((element as HTMLElement).style.left))
    expect(finalLeft).toBeGreaterThan(initialLeft)
    await expect(page.locator('.matu-stage-sprite[title="apple"]')).toHaveCount(0)
    await expect(page.locator('.matu-stage-sprite[title="apple-2"]')).toHaveCount(0)
    await expect(page.locator('.matu-stage-sprite[title="apple-3"]')).toHaveCount(0)
  })

  test('移动端视口不横向溢出，计数和运行按钮仍可见', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await prepareBlocklyStudent(page)
    await stubLevel(page, 'blk-002')
    await openLesson(page, 'blk-002')

    await expect(page.getByLabel('工作区积木数量')).toBeVisible()
    await expect(page.getByRole('button', { name: '运行', exact: true })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
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
    await prepareBlocklyStudent(page)
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
    await expect(page.getByLabel('工作区积木数量')).toHaveText('已用 1 / 最多 2')

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
    await expect(page.getByLabel('工作区积木数量')).toHaveText('已用 2 / 最多 2')
    await expect(page.getByText('已达上限，删除一块后再加新的')).toBeVisible()

    // 第三块真的拖进去也必须被上限拦住，不能只改文案。
    await dragBlockFromFlyout(page, canvas.x + canvas.width * 0.65, canvas.y + canvas.height * 0.25)
    expect(await workspaceBlocks(page)).toHaveLength(2)
    await expect(page.getByLabel('工作区积木数量')).toHaveText('已用 2 / 最多 2')

    // 点中下面那块再按 Delete，验证删除后计数和上限提示同步回落。
    const child = placed[1]
    await page.mouse.click(child.x + child.w / 2, child.y + child.h / 2)
    await page.keyboard.press('Delete')
    await expect(page.getByLabel('工作区积木数量')).toHaveText('已用 1 / 最多 2')
    await expect(page.getByText('已达上限，删除一块后再加新的')).toHaveCount(0)

    // 补回第二块，继续验证吸附和通关。
    placed = await workspaceBlocks(page)
    expect(placed).toHaveLength(1)
    await dragBlockFromFlyout(page, placed[0].x + placed[0].w / 2, placed[0].y + placed[0].h + 16)
    await expect(page.getByLabel('工作区积木数量')).toHaveText('已用 2 / 最多 2')

    await page.getByRole('button', { name: '运行', exact: true }).click()
    await expect(page.locator('#completion-title')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('.matu-win-flash')).toHaveCount(1)

    // 重新开始会清掉学生拖入的积木，计数同步回到初始值。
    await page.getByRole('button', { name: '再试一次' }).click()
    await expect(page.getByLabel('工作区积木数量')).toHaveText('已用 0 / 最多 2')
    await expect(page.getByText('已达上限，删除一块后再加新的')).toHaveCount(0)
  })
})
