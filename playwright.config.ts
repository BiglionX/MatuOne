import { readFileSync } from 'node:fs'
import { defineConfig } from '@playwright/test'

function loadTestEnv(): void {
  let raw = ''
  try {
    raw = readFileSync('.env.test', 'utf8')
  } catch {
    throw new Error('缺少 .env.test。远程 E2E 需要在这里填写线上 DATABASE_URL。')
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const matched = /^([A-Za-z0-9_]+)=(.*)$/.exec(trimmed)
    if (!matched) continue
    const value = matched[2].trim().replace(/^['"]|['"]$/g, '')
    process.env[matched[1]] = value
  }
  if (!process.env.DATABASE_URL) throw new Error('.env.test 里没有 DATABASE_URL')
}

loadTestEnv()

// 默认打本机。远程环境用 E2E_BASE_URL 覆盖。
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173'
process.env.E2E_BASE_URL = baseURL
const local = /localhost|127\.0\.0\.1/.test(baseURL)

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['./e2e/summary-reporter.ts']],
  webServer: local
    ? {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
  use: {
    baseURL,
    actionTimeout: 90_000,
    navigationTimeout: 45_000,
    channel: 'msedge',
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'off',
  },
})
