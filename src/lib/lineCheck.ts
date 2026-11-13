import type { ErrorMapping } from '@/types'

export interface LineCheckResult {
  ok: boolean
  pattern: 'cjk' | 'paren' | 'indent' | 'diff'
  message: string
}

const CJK_PUNCT = /[（）［］｛｝，。：；、！“”‘’《》]/

const FALLBACK: Record<string, string> = {
  cjk: '这一行里有中文标点，换成英文输入法再打一次。',
  paren: '这一行的括号没有配对，数一数左右括号是不是一样多。',
  indent: '缩进不对，行首的空格要和标准答案一模一样。',
  diff: '和标准答案差一点点，一个字符一个字符对一下。',
}

const friendly = (mappings: ErrorMapping[], pattern: string) =>
  mappings.find((m) => m.pattern === pattern)?.friendlyMessage ?? FALLBACK[pattern] ?? FALLBACK.diff

/** 逐行校验：回车后调用，只判断能不能推进，不做完整语法分析 */
export function checkTypedLine(input: string, standard: string, mappings: ErrorMapping[]): LineCheckResult {
  const typed = input.replace(/\r/g, '')

  if (typed === standard) return { ok: true, pattern: 'diff', message: '' }

  if (CJK_PUNCT.test(typed)) {
    return { ok: false, pattern: 'cjk', message: friendly(mappings, 'cjk') }
  }

  const typedIndent = (typed.match(/^[ \t]*/) ?? [''])[0].length
  const standardIndent = (standard.match(/^[ \t]*/) ?? [''])[0].length
  if (typedIndent !== standardIndent) {
    return { ok: false, pattern: 'indent', message: friendly(mappings, 'indent') }
  }

  const open = (typed.match(/\(/g) || []).length
  const close = (typed.match(/\)/g) || []).length
  if (open !== close) {
    return { ok: false, pattern: 'paren', message: friendly(mappings, 'paren') }
  }

  if (typed.length < standard.length) {
    const rest = standard.length - typed.length
    return { ok: false, pattern: 'diff', message: `这一行还没打完，还差 ${rest} 个字符，接着往下打。` }
  }

  const at = typed.split('').findIndex((c, i) => c !== standard[i])
  const pos = at === -1 ? standard.length : at
  const expect = standard[pos] === ' ' ? '空格' : standard[pos] ?? ''
  const got = typed[pos] === ' ' ? '空格' : typed[pos] ?? ''

  if (standard[pos] === ':') {
    return { ok: false, pattern: 'diff', message: `第 ${pos + 1} 个字符是冒号，别忘了它，后面还要缩进。` }
  }
  if (standard[pos] === '(' || standard[pos] === ')') {
    return { ok: false, pattern: 'paren', message: `第 ${pos + 1} 个字符应该是${standard[pos] === '(' ? '左' : '右'}括号，你打的是「${got || '空'}」。` }
  }
  return {
    ok: false,
    pattern: 'diff',
    message: `第 ${pos + 1} 个字符应该是「${expect || '空'}」，你打的是「${got || '空'}」，改一下再回车。`,
  }
}
