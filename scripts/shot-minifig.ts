// 人偶特写实拍：把魔法模型里的人偶零件单独放进编辑器草稿，再拍特写。
// 走的是编辑器这条渲染链路（point 挂载 + 摆角/滚角 + 草稿还原），
// 所以能同时验引擎改造和草稿往返。
//
// 用法：npx tsx scripts/shot-minifig.ts [url] [模型id] [放大格数] [旋转dx,dy] [平移dx,dy]
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { MAGIC_MODELS, bricksFromMagic } from '../src/pages/matupix/brick/brickMagicModels.ts'

const MINIFIG = new Set([
  'head',
  'hair',
  'hair-wavy',
  'helmet',
  'arm-left',
  'arm-right',
  'hand',
  'torso',
  'hip',
  'legs',
  'leg-right',
])

const url = process.argv[2] ?? 'http://127.0.0.1:5173/matupix/brick'
const modelId = process.argv[3] ?? 'sport'
const zooms = Number(process.argv[4] ?? 20)
const rot = (process.argv[5] ?? '0,0').split(',').map(Number)
const pan = (process.argv[6] ?? '0,0').split(',').map(Number)
const outDir = path.resolve('_magic-shots')
const DRAFT_KEY = 'matupix.brick.draft.v1'

fs.mkdirSync(outDir, { recursive: true })

function findChromium() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const base = path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')
  if (!fs.existsSync(base)) return undefined
  const dirs = fs
    .readdirSync(base)
    .filter((name) => name.startsWith('chromium-'))
    .sort()
    .reverse()
  for (const dir of dirs) {
    for (const rel of ['chrome-win64/chrome.exe', 'chrome/win/chrome.exe']) {
      const file = path.join(base, dir, rel)
      if (fs.existsSync(file)) return file
    }
  }
  return undefined
}

function minifigBricks() {
  const model = MAGIC_MODELS.find((item) => item.id === modelId)
  if (!model) throw new Error(`找不到模型 ${modelId}`)
  const bricks = bricksFromMagic(model.pieces).filter((brick) => MINIFIG.has(brick.type))
  if (bricks.length === 0) throw new Error(`${modelId} 里没有人偶零件`)
  // 把人偶挪到原点，编辑器初始机位正对原点。
  const torso = bricks.find((brick) => brick.type === 'torso')
  const [ox, , oz] = torso ? torso.position : bricks[0].position
  return bricks.map((brick) => {
    const [x, y, z] = brick.position
    return { ...brick, position: [x - ox, y, z - oz] as [number, number, number] }
  })
}

async function main() {
  const bricks = minifigBricks()
  const draft = { version: 1, bricks, updatedAt: new Date().toISOString() }
  console.log(`人偶零件 ${bricks.length} 件`)
  for (const brick of bricks) {
    console.log(
      `  ${brick.type.padEnd(10)} 位置[${brick.position.map((v) => v.toFixed(3)).join(',')}]` +
        ` 转向${brick.rotation} 摆${brick.tilt ?? 0} 滚${brick.roll ?? 0} 锚${brick.anchor ? brick.anchor.join(',') : '-'}`,
    )
  }

  const executablePath = findChromium()
  const browser = await chromium.launch(executablePath ? { executablePath } : {})
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } })
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))

  await page.addInitScript(
    ([key, payload]) => {
      window.localStorage.setItem(key as string, payload as string)
    },
    [DRAFT_KEY, JSON.stringify(draft)] as const,
  )

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('找不到画布')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  if (rot[0] || rot[1]) {
    await page.mouse.move(cx, cy)
    await page.mouse.down({ button: 'left' })
    await page.mouse.move(cx + rot[0], cy + rot[1], { steps: 16 })
    await page.mouse.up({ button: 'left' })
    await page.waitForTimeout(400)
  }

  await page.mouse.move(cx, cy)
  for (let i = 0; i < zooms; i += 1) {
    await page.mouse.wheel(0, -300)
    await page.waitForTimeout(120)
  }

  if (pan[0] || pan[1]) {
    await page.mouse.move(cx, cy)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(cx + pan[0], cy + pan[1], { steps: 12 })
    await page.mouse.up({ button: 'right' })
    await page.waitForTimeout(400)
  }

  await page.waitForTimeout(900)
  const file = path.join(outDir, `minifig-${modelId}.png`)
  await canvas.screenshot({ path: file })
  console.log(`ok   ${file}`)

  if (errors.length) {
    console.log('console errors:')
    for (const item of [...new Set(errors)].slice(0, 10)) console.log(`  ${item}`)
  }
  await browser.close()
}

main()
