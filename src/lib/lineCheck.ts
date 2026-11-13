import type { ErrorMapping } from '@/types'
import { resolveFriendly } from '@/lib/errorHint'

export interface LineCheckResult {
  ok: boolean
  pattern: 'cjk' | 'paren' | 'indent' | 'diff' | 'colon' | 'compare'
  message: string
}

const CJK_PUNCT = /[（）［］｛｝，。：；、！“”‘’《》]/

const FALLBACK: Record<string, string> = {
  cjk: '这一行里有中文标点，换成英文输入法再打一次。',
  paren: '这一行的括号没有配对，数一数左右括号是不是一样多。',
  indent: '缩进不对，行首的空格要和标准答案一模一样。',
  colon: "这行代码最后少了一个英文冒号 ':'，加上它试试。",
  compare: "判断是否相等要用两个等号 '==' 哦，一个等号是赋值。",
  diff: '和标准答案差一点点，一个字符一个字符对一下。',
}

const friendly = (mappings: ErrorMapping[], pattern: string, diagnostic: string) =>
  resolveFriendly(mappings, pattern, diagnostic) ?? FALLBACK[pattern] ?? FALLBACK.diff

function count(source: string, re: RegExp): number {
  return (source.match(re) || []).length
}

/** 一个等号和两个等号互换，或比较符被写成赋值。 */
function equalityMixup(typed: string, standard: string): boolean {
  const doubles = (s: string) => count(s, /==/g)
  const singles = (s: string) => count(s, /(?<![<>!=])=(?!=)/g)
  const compares = (s: string) => count(s, />=|<=|!=|>|</g)
  if (doubles(standard) > 0 && doubles(typed) === 0 && singles(typed) > 0) return true
  if (doubles(typed) > 0 && doubles(standard) === 0 && singles(standard) > 0) return true
  if (compares(standard) > 0 && compares(typed) === 0 && singles(typed) > 0) return true
  return false
}

/** 逐行校验：回车后调用，只判断能不能推进，不做完整语法分析 */
export function checkTypedLine(input: string, standard: string, mappings: ErrorMapping[]): LineCheckResult {
  const typed = input.replace(/\r/g, '')

  if (typed === standard) return { ok: true, pattern: 'diff', message: '' }

  if (CJK_PUNCT.test(typed)) {
    return { ok: false, pattern: 'cjk', message: friendly(mappings, 'cjk', 'cjk') }
  }

  if (equalityMixup(typed, standard)) {
    return { ok: false, pattern: 'compare', message: friendly(mappings, 'compare', '= vs ==') }
  }

  const typedIndent = (typed.match(/^[ \t]*/) ?? [''])[0].length
  const standardIndent = (standard.match(/^[ \t]*/) ?? [''])[0].length
  if (typedIndent !== standardIndent) {
    return { ok: false, pattern: 'indent', message: friendly(mappings, 'indent', 'IndentationError') }
  }

  const standardBody = standard.trimEnd().endsWith(':') ? standard.trimEnd().slice(0, -1) : ''
  if (standardBody && typed.trimEnd() === standardBody) {
    return { ok: false, pattern: 'colon', message: friendly(mappings, 'colon', "expected ':'") }
  }

  const open = (typed.match(/\(/g) || []).length
  const close = (typed.match(/\)/g) || []).length
  if (open !== close) {
    return { ok: false, pattern: 'paren', message: friendly(mappings, 'paren', 'paren') }
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
    return { ok: false, pattern: 'colon', message: friendly(mappings, 'colon', "expected ':'") }
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
