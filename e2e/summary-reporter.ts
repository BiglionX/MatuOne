import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter'

interface Row {
  name: string
  status: string
  ms: number
}

/** 跑完后在控制台打一张「测试项 / 状态 / 耗时」表。 */
class SummaryReporter implements Reporter {
  private rows: Row[] = []

  onTestEnd(test: TestCase, result: TestResult): void {
    const status = result.status === 'passed' ? 'PASS' : result.status === 'skipped' ? 'SKIP' : 'FAIL'
    const previous = this.rows.findIndex((row) => row.name === test.title)
    const next = { name: test.title, status, ms: result.duration }
    if (previous >= 0) this.rows[previous] = next
    else this.rows.push(next)
  }

  onEnd(result: FullResult): void {
    const width = Math.max(8, ...this.rows.map((row) => row.name.length))
    console.log('\n测试项'.padEnd(width + 2) + '状态    耗时')
    for (const row of this.rows) {
      const seconds = `${(row.ms / 1000).toFixed(1)}s`
      console.log(`${row.name.padEnd(width + 2)}${row.status.padEnd(8)}${seconds}`)
    }
    console.log(`合计 ${this.rows.length} 项，整次 ${result.status}`)
    if (result.status !== 'passed') console.log('失败截图在 e2e/screenshots/')
  }
}

export default SummaryReporter
