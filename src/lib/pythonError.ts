import type { ErrorMapping } from '@/types'
import { resolveFriendly } from './errorHint'

const UNCLOSED_PAREN = '这里的括号没有闭合哦'

/** print 末尾多出来的换行去掉，行内空格留下（星号三角形靠它们对齐）。 */
export function normalizeStdout(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/\n+$/, '')
}

export function outputsMatch(stdout: string, expected: string): boolean {
  return normalizeStdout(stdout) === normalizeStdout(expected)
}

/** 从 Pyodide traceback 里取出学生代码的行号。`<exec>` 是我们编译时用的文件名。 */
export function tracebackLine(raw: string): number {
  const execLines = [...raw.matchAll(/File "<exec>", line (\d+)/g)]
  if (execLines.length > 0) return Number(execLines[execLines.length - 1][1]) || 1
  const any = [...raw.matchAll(/File "<[^"]+>", line (\d+)/g)]
  if (any.length > 0) return Number(any[any.length - 1][1]) || 1
  return 1
}

function patternOf(raw: string): string {
  if (/IndentationError|TabError/.test(raw)) return 'indent'
  if (/NameError/.test(raw)) return 'name'
  if (/invalid character/.test(raw)) return 'cjk'
  if (/was never closed|unexpected EOF|unmatched/.test(raw)) return 'paren'
  return 'syntax'
}

/**
 * 把 Pyodide 抛出的原文翻成给孩子看的一句话。
 * 括号没闭合时用固定说法，方便页面直接对照。
 */
export function explainPythonError(
  raw: string,
  mappings: ErrorMapping[] = [],
): { line: number; message: string } {
  const line = tracebackLine(raw)
  const text = raw.trim()
  if (!text) return { line: 1, message: '这行代码还跑不通，再看一眼符号。' }

  if (/was never closed|unexpected EOF while parsing|unmatched ['"([{\]}]/.test(text)) {
    return { line, message: UNCLOSED_PAREN }
  }

  const mapped = resolveFriendly(mappings, patternOf(text), text)
  if (mapped) return { line, message: mapped }

  if (/unterminated string|EOL while scanning string/.test(text)) {
    return { line, message: '这一行的引号没有闭合哦。' }
  }
  if (/IndentationError|TabError/.test(text)) {
    return { line, message: '冒号后面要缩进 4 个空格，下一行要往右挪一点。' }
  }
  if (/NameError/.test(text)) {
    return { line, message: '有个名字拼错了，Python 不认识它。' }
  }
  if (/invalid character/.test(text)) {
    return { line, message: '这里的括号或逗号是中文的，换成英文输入法再打一次。' }
  }
  if (!/Traceback \(most recent call last\)/.test(text)) {
    return { line: 1, message: '运行环境出错了，请再试一次。' }
  }
  return { line, message: '这行代码还跑不通，再看一眼符号。' }
}
