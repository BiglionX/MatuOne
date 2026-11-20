import { closePool } from '../server/db'

/**
 * e2e 跑完必须把连接池关掉。
 * Playwright 在 workers=1 时会把测试跑在主进程里，Pool 持有的空闲 socket 会让 Node 不退出。
 */
export default async function globalTeardown(): Promise<void> {
  await closePool()
}
