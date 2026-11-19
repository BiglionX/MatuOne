import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const EXE = 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'
const URL = process.env.SHOT_URL || 'http://127.0.0.1:5173/'
const OUT = 'e:/MatuOne/_brand/launcher'
const MARKS = [400, 1600, 2600, 3600, 4600, 5600, 6600, 7600, 9000]

await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: EXE })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })

const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto(URL, { waitUntil: 'networkidle' })

let elapsed = 0
for (const mark of MARKS) {
  await page.waitForTimeout(mark - elapsed)
  elapsed = mark
  await page.screenshot({ path: `${OUT}/t${String(mark).padStart(4, '0')}.png` })
}

// 顺手量一下帧率，确认动画没有拖慢页面
const fps = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let frames = 0
      const start = performance.now()
      function tick() {
        frames += 1
        if (performance.now() - start >= 2000) {
          resolve(Math.round((frames * 1000) / (performance.now() - start)))
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }),
)

console.log('fps ≈', fps)
console.log('console errors:', errors.length ? errors : 'none')

await browser.close()
