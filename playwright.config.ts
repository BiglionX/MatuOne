import { readFileSync } from 'node:fs'
import { defineConfig } from '@playwright/test'

/**
 * 读 .env.test（没有就当没配）。
 * - CI：没有 DATABASE_URL 直接报错，避免「静默跑空」。
 * - 本地：只警告。需要数据库的用例会自己 skip（见 e2e/auth-regression.spec.ts），
 *   不需要数据库的用例（例如游客直达 /matupix）照常跑。
 */
function loadTestEnv(): void {
  let raw = ''
  try {
    raw = readFileSync('.env.test', 'utf8')
  } catch {
    raw = ''
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const matched = /^([A-Za-z0-9_]+)=(.*)$/.exec(trimmed)
    if (!matched) continue
    const value = matched[2].trim().replace(/^['"]|['"]$/g, '')
    process.env[matched[1]] = value
  }
  if (process.env.DATABASE_URL) return
  if (process.env.CI === 'true') {
    throw new Error('CI 缺少 DATABASE_URL：门禁回归必须直连数据库，请在 workflow secrets 里补上。')
  }
  console.warn('[e2e] 没有 DATABASE_URL：需要数据库的用例会跳过。模板见 .env.test.example。')
}

loadTestEnv()

// 默认打本机。远程环境用 E2E_BASE_URL 覆盖。
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173'
const port = new URL(baseURL).port || '5173'
process.env.E2E_BASE_URL = baseURL
const local = /localhost|127\.0\.0\.1/.test(baseURL)
const requireFreshServer = process.env.E2E_REQUIRE_FRESH_SERVER === '1'

export default defineConfig({
  testDir: 'e2e',
  globalTeardown: './e2e/global-teardown.ts',
  timeout: 180_000,
  expect: { timeout: 45_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['./e2e/summary-reporter.ts']],
  webServer: local
    ? {
        // 先构建再预览，避免 Blockly 首次加载被 Vite 依赖分析拖慢；同时走真实生产产物。
        command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port}`,
        url: baseURL,
        reuseExistingServer: !requireFreshServer,
        timeout: 300_000,
      }
    : undefined,
  use: {
    baseURL,
    actionTimeout: 120_000,
    // 生产预览首次加载仍可能解析较大的 Blockly 依赖，保留充足的导航窗口。
    navigationTimeout: 120_000,
    channel: 'msedge',
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'off',
  },
})
