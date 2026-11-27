import { expect, test, type Page } from '@playwright/test'
import { loginStudent } from './auth-fixtures'

/**
 * blk-161「接苹果」真机验收。
 *
 * 全部用真实鼠标事件操作 Blockly：翻绘本 → 拖 7 块积木 → 改步数和下拉 → 运行 → 通关。
 *
 * 瞄准原理（对齐 Blockly 内部判定口径）：
 * - 目标连接点取 `connection.x/y`，即连接点在工作区里的绝对坐标（DB 坐标）。
 * - 拖拽中的连接点取「块的实时工作区位置 + 块内偏移」；Blockly 拖拽时不会刷新连接点
 *   的 DB 坐标，但它内部判定用的正是「DB 坐标 + 拖拽位移」，两者等价。
 * - 两者同处一个工作区坐标系，鼠标位移 = 工作区位移 × 缩放比例。
 *
 * 跑法：需要一个开发服务器（探针只在开发模式下挂载）：
 *   E2E_BASE_URL=http://127.0.0.1:5175 npx playwright test e2e/blockly-stage-acceptance.spec.ts
 */

interface WsPoint {
  x: number
  y: number
}

interface DragState {
  /** 被拖块「上一个连接点」当前的工作区绝对坐标 */
  connWs: WsPoint
  scale: number
}

type ConnectionKind = 'previous' | 'body' | 'next'

const ART_DIR = '_brand'

/** 日志转成纯 ASCII，避免 PowerShell 管道把中文变成乱码。 */
function ascii(text: string): string {
  return text.replace(/[^\x20-\x7E]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
}

/**
 * 页面内工具：按「树结构顺序」列出工作区里的所有积木。
 *
 * Blockly 自带的 `getAllBlocks(false)` 只返回「顶层块 + 每个顶层块的直接子块」，
 * 嵌套两三层的积木根本不在里面，按索引取块会漂移，所以自己按树结构递归。
 */
const HELPERS = `
window.__matuListBlocks = function () {
  const ws = window.__matuBlocklyWorkspace;
  if (!ws) return [];
  const out = [];
  const seen = new Set();
  const visit = (block) => {
    if (!block || seen.has(block.id)) return;
    seen.add(block.id);
    out.push(block);
    let next = block.getNextBlock ? block.getNextBlock() : null;
    while (next) {
      visit(next);
      next = next.getNextBlock();
    }
    const inputs = block.inputList || [];
    for (const input of inputs) {
      const conn = input.connection;
      const child = conn && conn.targetBlock ? conn.targetBlock() : null;
      if (child) visit(child);
    }
  };
  const tops = ws.getTopBlocks ? ws.getTopBlocks(true) : [];
  for (const top of tops) visit(top);
  return out;
};
window.__matuFindBlock = function (blockType, blockIndex) {
  const all = window.__matuListBlocks();
  const matched = all.filter((block) => block.type === blockType);
  return matched[blockIndex] || null;
};
`

/** 目标连接点的工作区绝对坐标（DB 坐标，与 Blockly 内部距离判定完全一致）。 */
async function targetConnectionWs(
  page: Page,
  type: string,
  index: number,
  kind: ConnectionKind,
): Promise<WsPoint | null> {
  return page.evaluate(
    ({ blockType, blockIndex, connectionKind }) => {
      const block = (window as never as { __matuFindBlock: (t: string, i: number) => any }).__matuFindBlock(
        blockType,
        blockIndex,
      )
      if (!block) return null
      let connection: any = null
      if (connectionKind === 'previous') connection = block.previousConnection
      else if (connectionKind === 'next') connection = block.nextConnection
      else connection = block.getInput('BODY')?.connection
      if (!connection) return null
      const offset = connection.getOffsetInBlock()
      const pos = block.getRelativeToSurfaceXY()
      return {
        x: connection.x,
        y: connection.y,
        offsetX: offset.x,
        offsetY: offset.y,
        derivedX: pos.x + offset.x,
        derivedY: pos.y + offset.y,
      }
    },
    { blockType: type, blockIndex: index, connectionKind: kind },
  )
}

/** 正在被拖的那块积木，它的「上一个连接点」此刻的工作区坐标。 */
async function draggedConnectionWs(page: Page): Promise<DragState | null> {
  return page.evaluate(() => {
    const ws = (window as never as { __matuBlocklyWorkspace?: any }).__matuBlocklyWorkspace
    if (!ws) return null
    const tops = ws.getTopBlocks(false) as any[]
    const block = tops.find((item) => item.isDragging && item.isDragging())
    if (!block?.previousConnection) return null
    const pos = block.getRelativeToSurfaceXY()
    const offset = block.previousConnection.getOffsetInBlock()
    return {
      connWs: { x: pos.x + offset.x, y: pos.y + offset.y },
      scale: ws.getScale(),
    }
  })
}

/** 把工作区里的积木树序列化，方便断言结构。 */
async function dumpTree(page: Page): Promise<string> {
  return page.evaluate(() => {
    const ws = (window as never as { __matuBlocklyWorkspace?: any }).__matuBlocklyWorkspace
    if (!ws) return 'NO_HOOK'
    const serialize = (block: any): string => {
      let out = block.type
      const kids: string[] = []
      for (const input of block.inputList || []) {
        const conn = input.connection
        const child = conn && conn.targetBlock ? conn.targetBlock() : null
        if (child) kids.push(serialize(child))
      }
      if (kids.length) out += `[${kids.join(',')}]`
      const conn = block.nextConnection
      const next = conn && conn.targetBlock ? conn.targetBlock() : null
      if (next) out += `->${serialize(next)}`
      return out
    }
    return ws
      .getTopBlocks(true)
      .map((block: any) => serialize(block))
      .join(' | ')
  })
}

/** 结构化输出积木树：每个块的 id、每个输入口接了什么、next 接了什么。 */
async function dumpTreeJson(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const ws = (window as never as { __matuBlocklyWorkspace?: any }).__matuBlocklyWorkspace
    if (!ws) return 'NO_HOOK'
    const describe = (block: any, path: Set<string>): any => {
      if (!block) return null
      if (path.has(block.id)) return { type: block.type, id: block.id, cycle: true }
      const next = new Set(path)
      next.add(block.id)
      const inputs = (block.inputList || [])
        .filter((input: any) => input.connection)
        .map((input: any) => ({
          name: input.name,
          child: describe(input.connection.targetBlock(), next),
        }))
      const nextBlock = block.nextConnection?.targetBlock?.() ?? null
      return {
        type: block.type,
        id: block.id,
        inputs,
        next: describe(nextBlock, next),
      }
    }
    return ws.getTopBlocks(true).map((block: any) => describe(block, new Set()))
  })
}

async function workspaceRect(page: Page): Promise<{ left: number; top: number; right: number; bottom: number }> {
  return page.evaluate(() => {
    const svg = Array.from(document.querySelectorAll('svg.blocklySvg')).find((el) => !el.closest('.blocklyFlyout'))
    if (!svg) throw new Error('找不到 Blockly 工作区 SVG')
    const r = svg.getBoundingClientRect()
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
  })
}

/** 找到某块积木上一个字段的屏幕坐标。 */
async function fieldScreenPoint(page: Page, type: string, index: number, name: string): Promise<{ x: number; y: number } | null> {
  return page.evaluate(
    ({ blockType, blockIndex, fieldName }) => {
      const block = (window as never as { __matuFindBlock: (t: string, i: number) => any }).__matuFindBlock(
        blockType,
        blockIndex,
      )
      const field = block?.getField?.(fieldName)
      if (!field?.getSvgRoot) return null
      const r = field.getSvgRoot().getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    },
    { blockType: type, blockIndex: index, fieldName: name },
  )
}

async function readField(page: Page, type: string, index: number, name: string): Promise<string> {
  return page.evaluate(
    ({ blockType, blockIndex, fieldName }) => {
      const block = (window as never as { __matuFindBlock: (t: string, i: number) => any }).__matuFindBlock(
        blockType,
        blockIndex,
      )
      return String(block?.getFieldValue?.(fieldName) ?? '')
    },
    { blockType: type, blockIndex: index, fieldName: name },
  )
}

/** 在工具箱里找到某类积木，并算出真正能抓住它的屏幕坐标。 */
async function pickFlyoutBlock(page: Page, category: string, type: string): Promise<{ grab: { x: number; y: number } }> {
  const findInFlyout = async () =>
    page.evaluate((blockType) => {
      const host = document.querySelector('.blocklyFlyout')
      if (!host) return null
      const groups = Array.from(host.querySelectorAll('g.blocklyDraggable')).filter((group) =>
        group.classList.contains(blockType),
      )
      for (const group of groups) {
        const path = group.querySelector('path.blocklyPath')
        if (!path) continue
        const rect = path.getBoundingClientRect()
        if (rect.width <= 4 || rect.height <= 4) continue
        const fractions: [number, number][] = []
        for (const fy of [0.9, 0.78, 0.66, 0.54, 0.42, 0.3, 0.18, 0.08]) {
          for (const fx of [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95]) fractions.push([fx, fy])
        }
        for (const [fx, fy] of fractions) {
          const x = rect.x + rect.width * fx
          const y = rect.y + rect.height * fy
          const hit = document.elementFromPoint(x, y)
          const owner = hit?.closest('g.blocklyDraggable')
          if (!owner || !owner.classList.contains(blockType)) continue
          if (!hit?.classList.contains('blocklyPath')) continue
          return { grab: { x, y } }
        }
      }
      return null
    }, type)

  const already = await findInFlyout()
  if (already) return already as { grab: { x: number; y: number } }

  const button = page.locator('.blocklyToolboxCategory', { hasText: category }).first()
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await button.click({ force: true })
    await page.waitForTimeout(420)
    const found = await findInFlyout()
    if (found) return found as { grab: { x: number; y: number } }
  }
  const categories = await page.locator('.blocklyToolboxCategory').allTextContents()
  throw new Error(`工具箱里找不到 ${type}（当前分类：${JSON.stringify(categories)}）`)
}

/** 把工具箱里的积木拖到工作区某个空位。 */
async function dropFlyout(page: Page, category: string, type: string, at: { x: number; y: number }): Promise<void> {
  const source = await pickFlyoutBlock(page, category, type)
  await page.mouse.move(source.grab.x, source.grab.y)
  await page.mouse.down()
  await page.mouse.move(source.grab.x + 8, source.grab.y + 8, { steps: 4 })
  await page.mouse.move(at.x, at.y, { steps: 25 })
  await page.waitForTimeout(250)
  await page.mouse.up()
  await page.waitForTimeout(600)
}

/**
 * 把工具箱里的积木接到工作区里某块积木的某个连接点上。
 *
 * 瞄准：读出目标连接点的工作区坐标，再看被拖连接点此刻的工作区坐标，
 * 差值乘以缩放比例就是鼠标要走的像素距离，迭代逼近。
 */
async function connectFlyout(
  page: Page,
  category: string,
  type: string,
  targetType: string,
  targetIndex: number,
  kind: ConnectionKind,
): Promise<void> {
  const target = await targetConnectionWs(page, targetType, targetIndex, kind)
  if (!target) throw new Error(`找不到 ${targetType}[${targetIndex}] 的 ${kind} 连接点`)
  const drift = Math.hypot(target.x - target.derivedX, target.y - target.derivedY)
  console.log(
    `[连接] 目标 ${targetType}[${targetIndex}].${kind} → 工作区坐标 (${target.x.toFixed(1)}, ${target.y.toFixed(1)})，与「块位置+偏移」偏差 ${drift.toFixed(3)}`,
  )
  if (drift > 0.5) throw new Error('连接点 DB 坐标与块位置不一致，坐标系判断有误')

  const source = await pickFlyoutBlock(page, category, type)
  const canvas = await workspaceRect(page)
  const safeSpot = {
    x: Math.min(Math.max(canvas.left + 120, canvas.left + 60), canvas.right - 80),
    y: Math.min(Math.max(canvas.top + 160, canvas.top + 60), canvas.bottom - 80),
  }

  await page.mouse.move(source.grab.x, source.grab.y)
  await page.mouse.down()
  await page.mouse.move(source.grab.x + 8, source.grab.y + 8, { steps: 4 })
  await page.mouse.move(source.grab.x + 40, source.grab.y + 40, { steps: 8 })
  await page.waitForTimeout(180)

  let state = await draggedConnectionWs(page)
  for (const step of [80, 130, 190]) {
    if (state) break
    await page.mouse.move(source.grab.x + step, source.grab.y + step, { steps: 6 })
    await page.waitForTimeout(160)
    state = await draggedConnectionWs(page)
  }
  if (!state) throw new Error(`${type} 没有开始拖拽`)

  // 先挪到工作区里，事件才不会丢在工具箱上。
  let mouse = safeSpot
  await page.mouse.move(mouse.x, mouse.y, { steps: 10 })
  await page.waitForTimeout(180)
  state = await draggedConnectionWs(page)
  if (!state) throw new Error(`${type} 拖到工作区后丢了拖拽状态`)

  const scale = state.scale
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const now = await draggedConnectionWs(page)
    if (!now) break
    const dx = target.x - now.connWs.x
    const dy = target.y - now.connWs.y
    const distance = Math.hypot(dx, dy)
    if (distance < 4) break
    const stepX = Math.max(-140, Math.min(140, dx * scale))
    const stepY = Math.max(-140, Math.min(140, dy * scale))
    mouse = { x: mouse.x + stepX, y: mouse.y + stepY }
    await page.mouse.move(mouse.x, mouse.y, { steps: 6 })
    await page.waitForTimeout(60)
  }

  const finalState = await draggedConnectionWs(page)
  console.log(
    `[连接] ${type} 落点距目标 ${finalState ? Math.hypot(target.x - finalState.connWs.x, target.y - finalState.connWs.y).toFixed(2) : '未知'} 工作区单位`,
  )
  await page.mouse.up()
  await page.waitForTimeout(650)
  console.log(`[连接] 结果 ${await dumpTree(page)}`)
}

async function usedBlockCount(page: Page): Promise<number> {
  const text = await page.getByLabel('工作区积木数量').textContent()
  const matched = /已用\s*(\d+)/.exec(text ?? '')
  return matched ? Number(matched[1]) : -1
}

async function setNumberField(page: Page, type: string, index: number, value: string): Promise<void> {
  const point = await fieldScreenPoint(page, type, index, 'steps')
  if (!point) throw new Error(`找不到 ${type}[${index}] 上的字段 steps`)
  await page.mouse.click(point.x, point.y)
  const input = page.locator('input.blocklyHtmlInput')
  await input.waitFor({ state: 'visible', timeout: 5000 })
  await page.keyboard.press('Control+A')
  await page.keyboard.type(value)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
}

async function chooseDropdown(page: Page, type: string, index: number, option: string): Promise<void> {
  const point = await fieldScreenPoint(page, type, index, 'target_sprite_id')
  if (!point) throw new Error(`找不到 ${type}[${index}] 上的字段 target_sprite_id`)
  await page.mouse.click(point.x, point.y)
  const menu = page.locator('.blocklyDropdownMenu')
  await menu.waitFor({ state: 'visible', timeout: 8000 })
  await menu.locator('.blocklyMenuItem').filter({ hasText: option }).first().click()
  await page.waitForTimeout(400)
}

async function advanceStory(page: Page): Promise<void> {
  const chip = page.locator('.matu-story-page .chip').first()
  for (let step = 0; step < 30; step += 1) {
    const start = page.getByRole('button', { name: '开始挑战' })
    if (await start.count()) return
    const next = page.getByRole('button', { name: '下一页' })
    if (!(await next.count())) {
      await page.waitForTimeout(400)
      continue
    }
    const before = (await chip.textContent()) ?? ''
    await next.click()
    await page
      .waitForFunction(
        (previous) => {
          const element = document.querySelector('.matu-story-page .chip')
          return Boolean(element) && element.textContent !== previous
        },
        before,
        { timeout: 20_000 },
      )
      .catch(() => undefined)
  }
  throw new Error('绘本翻不到最后')
}

test('blk-161 真机验收：四学期地图 + 绘本 + 拖出接苹果程序并通关', async ({ page }) => {
  test.setTimeout(420_000)

  await page.addInitScript(HELPERS)

  // ---------- 一、课程地图：四个学期完整 ----------
  await loginStudent(page)
  await page.goto('/blockly')
  const header = page.locator('header').first()
  await expect(header).toContainText('已通关')
  await expect(header).toContainText('/240 关')
  const levelButtons = page.locator('nav[aria-label="选择 Level"] button')
  await expect(levelButtons).toHaveCount(4)
  const levelTexts = await levelButtons.allTextContents()
  console.log('[地图] 学期按钮', JSON.stringify(levelTexts))
  expect(levelTexts[0]).toContain('80/80')
  expect(levelTexts[1]).toContain('80/80')
  expect(levelTexts[2]).toContain('/40')
  expect(levelTexts[3]).toContain('/40')
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${ART_DIR}/final-accept-blockly-map.png` })

  // ---------- 二、绘本 ----------
  await page.goto('/blockly/lesson/blk-161')
  await page.waitForSelector('.matu-story-backdrop', { state: 'attached', timeout: 120_000 })
  await page.waitForTimeout(900)
  const next = page.getByRole('button', { name: '下一页' })
  if (await next.count()) {
    const chip = page.locator('.matu-story-page .chip').first()
    const before = (await chip.textContent()) ?? ''
    await next.click()
    await page
      .waitForFunction(
        (previous) => {
          const element = document.querySelector('.matu-story-page .chip')
          return Boolean(element) && element.textContent !== previous
        },
        before,
        { timeout: 20_000 },
      )
      .catch(() => undefined)
  }
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${ART_DIR}/final-accept-blk-161-story.png` })
  await advanceStory(page)
  await page.getByRole('button', { name: '开始挑战' }).click()
  await page.waitForSelector('svg.blocklySvg', { state: 'attached', timeout: 120_000 })
  await page.waitForTimeout(1800)

  // 探针只在开发模式下挂载，生产预览里拿不到工作区就跳过，不误报失败。
  const hasProbe = await page.evaluate(() =>
    Boolean((window as unknown as { __matuBlocklyWorkspace?: unknown }).__matuBlocklyWorkspace),
  )
  if (!hasProbe) {
    test.skip(true, '需要开发服务器：验收脚本依赖开发模式下的 Blockly 工作区探针')
  }

  // 缩小一点，保证整段程序都能落在画面里
  await page.evaluate(() => {
    const ws = (window as never as { __matuBlocklyWorkspace?: any }).__matuBlocklyWorkspace
    ws?.setScale?.(0.62)
  })
  await page.waitForTimeout(500)

  // ---------- 三、拖出「无限循环 [移动, 如果碰到 -> 分数+1]」 ----------
  const canvas = await workspaceRect(page)
  const flyoutRight = await page.evaluate(() => {
    const host = document.querySelector('.blocklyFlyout')
    return host ? host.getBoundingClientRect().right : 0
  })
  const startX = flyoutRight + 80
  const startY = canvas.top + 60
  console.log('[工作区]', JSON.stringify(canvas), '落点', startX, startY)

  // 1) 设置变量 score = 0
  await dropFlyout(page, '变量', 'set_variable', { x: startX, y: startY })
  expect(await usedBlockCount(page)).toBe(1)

  // 2) 无限循环 → 设置变量 的下一个
  await connectFlyout(page, '控制', 'forever', 'set_variable', 0, 'next')
  // 3) 移动 8 步 → 无限循环 的嵌套体
  await connectFlyout(page, '动作', 'move_steps', 'forever', 0, 'body')
  // 4) 如果碰到 apple-1 → 移动 的下一个
  await connectFlyout(page, '控制', 'if_touching', 'move_steps', 0, 'next')
  // 5) 变量增加 → 如果碰到 的嵌套体
  await connectFlyout(page, '变量', 'change_variable', 'if_touching', 0, 'body')
  // 6) 第二个「如果碰到」→ 第一个「如果碰到」的下一个
  //    两个「如果碰到」要并列在循环体里，不能套进第一个的嵌套体：
  //    嵌套后第一个苹果一被接住，那个分支就不再触发，第二个苹果永远等不到。
  await connectFlyout(page, '控制', 'if_touching', 'if_touching', 0, 'next')
  // 7) 第二个「变量增加」→ 第二个「如果碰到」的嵌套体
  await connectFlyout(page, '变量', 'change_variable', 'if_touching', 1, 'body')

  expect(await usedBlockCount(page)).toBe(7)
  const tree = await dumpTree(page)
  console.log('[积木树]', tree)
  console.log('[积木树详情]', JSON.stringify(await dumpTreeJson(page), null, 1))
  expect(tree).toBe('set_variable->forever[move_steps->if_touching[change_variable]->if_touching[change_variable]]')

  // 变量默认应该就是 score
  const setVar = await readField(page, 'set_variable', 0, 'variable_id')
  const changeVar = await readField(page, 'change_variable', 0, 'variable_id')
  console.log('[字段] set_variable.variable_id =', ascii(setVar), ' change_variable.variable_id =', ascii(changeVar))
  expect(setVar).toBe('score')
  expect(changeVar).toBe('score')

  // 把步数从 10 改成 8
  await setNumberField(page, 'move_steps', 0, '8')
  const steps = await readField(page, 'move_steps', 0, 'steps')
  console.log('[字段] move_steps 步数 =', steps)
  expect(steps).toBe('8')

  // 第二个「如果碰到」改选 apple-2
  await chooseDropdown(page, 'if_touching', 1, 'apple-2')
  const touchTargets = [
    await readField(page, 'if_touching', 0, 'target_sprite_id'),
    await readField(page, 'if_touching', 1, 'target_sprite_id'),
  ]
  console.log('[字段] if_touching 目标 =', JSON.stringify(touchTargets))
  expect(touchTargets[0]).toBe('apple-1')
  expect(touchTargets[1]).toBe('apple-2')

  // 工作区截图前整理一下视野
  await page.evaluate(() => {
    const ws = (window as never as { __matuBlocklyWorkspace?: any }).__matuBlocklyWorkspace
    ws?.setScale?.(0.72)
    ws?.scrollCenter?.()
  })
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${ART_DIR}/final-accept-blk-161-workspace.png` })
  await page.evaluate(() => {
    const ws = (window as never as { __matuBlocklyWorkspace?: any }).__matuBlocklyWorkspace
    ws?.setScale?.(0.9)
  })
  await page.waitForTimeout(400)

  // ---------- 四、运行：猫移动、苹果下落、碰撞加分 ----------
  const runButton = page.getByRole('button', { name: '运行', exact: true })
  await expect(runButton).toBeEnabled({ timeout: 15_000 })
  await runButton.click()

  let runningShot = false
  let completed = false
  for (let round = 0; round < 80; round += 1) {
    const info = await page.evaluate(() => {
      const stage = document.querySelector('[aria-label="自由舞台"]')
      const sprites = Array.from(document.querySelectorAll('.matu-stage-sprite')).map((el) => ({
        id: el.getAttribute('title'),
        left: el.style.left,
        top: el.style.top,
      }))
      const score = document.querySelector('[aria-label="舞台计分板"]')?.textContent ?? ''
      const alert = document.querySelector('[role="alert"]')?.textContent ?? ''
      return {
        status: stage?.getAttribute('data-stage-status') ?? '',
        score,
        sprites,
        alert,
        dialog: Boolean(document.querySelector('#completion-title')),
      }
    })
    if (round % 4 === 0 || info.dialog) {
      console.log('[运行]', round, ascii(JSON.stringify(info)))
    }
    if (!runningShot && /[1-9]/.test(info.score)) {
      runningShot = true
      await page.screenshot({ path: `${ART_DIR}/final-accept-blk-161-stage-running.png` })
      console.log('[运行中] 舞台状态', ascii(info.status))
    }
    if (info.dialog) {
      completed = true
      break
    }
    await page.waitForTimeout(1000)
  }
  expect(completed).toBe(true)
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${ART_DIR}/final-accept-blk-161-completed.png` })
  console.log('[通关] 标题', ascii(await page.locator('#completion-title').textContent()))
})
