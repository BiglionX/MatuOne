// 魔法模型实拍：逐个加载模型并截图，验证零件不再悬空散落。
// 用法：node scripts/shot-magic.mjs http://127.0.0.1:5180/matupix/brick
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const url = process.argv[2] ?? 'http://127.0.0.1:5180/matupix/brick'
const outDir = path.resolve('_magic-shots')
fs.mkdirSync(outDir, { recursive: true })

const targets = process.argv[3]
  ? process.argv[3].split(',').map((item) => item.split('|'))
  : [
      ['直升机', 'heli'],
      ['圣诞树', 'tree'],
      ['恐龙', 'dino'],
      ['游乐园', 'dino-park'],
      ['砖月火车站', 'station'],
      ['跑车', 'sport'],
      ['工地推土机', 'site'],
      ['砖月镇公所', 'village'],
      ['砖月消防站', 'fire-station'],
      ['机场', 'airport'],
      ['F1赛车', 'f1'],
      ['消防车', 'fire-engine'],
      ['飞机', 'plane'],
      ['穿梭机', 'rocket'],
      ['城堡', 'castle'],
      ['房子', 'house'],
      ['机器人', 'robot'],
      ['蒸汽火车', 'train'],
      ['起重机', 'crane'],
      ['帆船', 'boat'],
      ['拖拉机', 'tractor'],
      ['灯塔', 'lighthouse'],
      ['雷霆赛道', 'race'],
      ['拖船', 'port'],
      ['农场拖车', 'farm'],
      ['太空隔离基地', 'space'],
      ['骑士城堡', 'big-castle'],
      ['法拉利赛车', 'stadium'],
      ['埃菲尔铁塔', 'eiffel'],
      ['西尔斯大厦', 'skyscraper'],
    ]

// playwright 自带的浏览器版本可能与本机已装的不一致，这里自动挑一个能用的。
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
    for (const rel of ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe']) {
      const file = path.join(base, dir, rel)
      if (fs.existsSync(file)) return file
    }
  }
  return undefined
}

const executablePath = findChromium()
const browser = await chromium.launch(executablePath ? { executablePath } : {})
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } })
const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (err) => errors.push(String(err)))

// 这个页面有长连接/轮询，networkidle 等不到，直接等 canvas 出来更稳。
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForSelector('canvas', { timeout: 30000 })
await page.waitForTimeout(2500)

for (const [label, slug] of targets) {
  try {
    await page.getByRole('button', { name: '魔法模型' }).click()
    await page.waitForTimeout(600)
    await page.getByRole('button', { name: label, exact: true }).click()
    await page.waitForTimeout(2600)
    const canvas = page.locator('canvas').first()
    const file = path.join(outDir, `${slug}.png`)
    await canvas.screenshot({ path: file })
    console.log(`ok   ${slug.padEnd(14)} ${file}`)
  } catch (error) {
    console.log(`FAIL ${slug.padEnd(14)} ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`)
  }
}

if (errors.length) {
  console.log('console errors:')
  for (const item of [...new Set(errors)].slice(0, 10)) console.log(`  ${item}`)
}

await browser.close()
