import type { Stroke, TurtleArt } from '@/types'

/**
 * 1.0 原型内的轻量「海龟 + print」模拟器，仅被 src/lib/runner.ts 调用。
 * 不做完整 Python 语法分析，只覆盖课程里用到的语句与四类常见错误；
 * 后续替换 Pyodide 时只需替换 runner 的适配层实现。
 */

export interface SimResult {
  strokes: Stroke[]
  text: string
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

export type SimPattern = 'cjk' | 'paren' | 'indent' | 'name' | 'syntax'

export class SimError extends Error {
  pattern: SimPattern
  line: number
  constructor(line: number, pattern: SimPattern, message: string) {
    super(message)
    this.line = line
    this.pattern = pattern
  }
}

const TURTLE_METHODS = [
  'forward', 'fd', 'backward', 'bk', 'right', 'rt', 'left', 'lt', 'circle',
  'penup', 'pu', 'pendown', 'pd', 'pencolor', 'color', 'goto', 'setpos',
  'speed', 'hideturtle', 'showturtle', 'done', 'begin_fill', 'end_fill',
  'home', 'dot', 'write',
]
const BUILTINS = ['print', 'range', 'int', 'len', 'str']
const OBJ_ALIASES = ['t', 'turtle']
const KEYWORDS = ['for', 'in', 'if', 'else', 'elif', 'True', 'False', 'import', 'from', 'pass']

const CJK_PUNCT = /[（）［］｛｝，。：；、！“”‘’《》]/

function stripStrings(line: string): string {
  return line.replace(/"([^"]*)"|'([^']*)'/g, '""')
}

function stripComment(line: string): string {
  let inStr: string | null = null
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inStr) {
      if (c === inStr) inStr = null
    } else if (c === '"' || c === "'") {
      inStr = c
    } else if (c === '#') {
      return line.slice(0, i)
    }
  }
  return line
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = []
  for (let i = 0; i <= m; i++) {
    dp[i] = [i]
    for (let j = 1; j <= n; j++) dp[i][j] = i === 0 ? j : 0
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
  }
  return dp[m][n]
}

export interface Node {
  line: number
  indent: number
  text: string
  children: Node[]
}

/** 解析成带缩进层级的语句树，同时做 1.0 四类错误检查 */
export function parseCode(rawCode: string): { nodes: Node[] } {
  const rawLines = rawCode.replace(/\r\n/g, '\n').split('\n')
  const nodes: Node[] = []
  const stack: Node[] = []
  let lastNode: Node | null = null

  for (let idx = 0; idx < rawLines.length; idx++) {
    const lineNo = idx + 1
    const codeOnly = stripComment(rawLines[idx])
    if (!codeOnly.trim()) continue

    let indent = 0
    for (const ch of codeOnly.match(/^[ \t]*/)![0]) indent += ch === '\t' ? 4 : 1

    const text = codeOnly.trim()
    const noStr = stripStrings(codeOnly)

    if (CJK_PUNCT.test(noStr)) {
      throw new SimError(lineNo, 'cjk', '这一行混进了中文标点')
    }
    const open = (noStr.match(/\(/g) || []).length
    const close = (noStr.match(/\)/g) || []).length
    if (open !== close) {
      throw new SimError(lineNo, 'paren', '这一行的括号没有配对')
    }

    if (/^(for|if|elif|else|while|def|class)\b/.test(text) && !text.endsWith(':')) {
      throw new SimError(lineNo, 'syntax', "expected ':'")
    }

    if (indent > 0 && lastNode) {
      if (indent > lastNode.indent) {
        // 缩进只允许出现在冒号结尾的行之后，且只能深一层（4 空格）
        if (!lastNode.text.endsWith(':') || indent !== lastNode.indent + 4) {
          throw new SimError(lineNo, 'indent', 'IndentationError')
        }
      }
    } else if (indent > 0) {
      throw new SimError(lineNo, 'indent', 'IndentationError')
    }

    const node: Node = { line: lineNo, indent, text, children: [] }
    while (stack.length && stack[stack.length - 1].indent > indent) stack.pop()
    if (stack.length && stack[stack.length - 1].indent === indent) stack.pop()

    if (stack.length && indent > stack[stack.length - 1].indent) {
      stack[stack.length - 1].children.push(node)
    } else if (indent === 0) {
      nodes.push(node)
    } else {
      throw new SimError(lineNo, 'indent', 'IndentationError')
    }
    stack.push(node)
    lastNode = node

    if (text.endsWith(':')) {
      let next = idx + 1
      while (next < rawLines.length && !stripComment(rawLines[next]).trim()) next++
      if (next < rawLines.length) {
        const nextRaw = stripComment(rawLines[next])
        let nextIndent = 0
        for (const ch of nextRaw.match(/^[ \t]*/)![0]) nextIndent += ch === '\t' ? 4 : 1
        if (nextIndent < indent + 4) {
          throw new SimError(next + 1, 'indent', 'IndentationError')
        }
      }
    }
  }

  return { nodes }
}

function collectNames(nodes: Node[], acc: Set<string> = new Set()): Set<string> {
  for (const node of nodes) {
    const assign = node.text.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=(?!=)/)
    if (assign) acc.add(assign[1])
    const loop = node.text.match(/^for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+/)
    if (loop) acc.add(loop[1])
    collectNames(node.children, acc)
  }
  return acc
}

function checkNames(nodes: Node[], defined: Set<string>) {
  const walk = (list: Node[]) => {
    for (const node of list) {
      const ids = stripStrings(node.text).match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || []
      for (const id of ids) {
        if (
          defined.has(id) ||
          BUILTINS.includes(id) ||
          TURTLE_METHODS.includes(id) ||
          OBJ_ALIASES.includes(id) ||
          KEYWORDS.includes(id)
        )
          continue
        const nearest = [...TURTLE_METHODS, ...BUILTINS]
          .map((c) => ({ c, d: levenshtein(id, c) }))
          .sort((a, b) => a.d - b.d)[0]
        const hint = nearest && nearest.d <= 3 ? `，是不是想写 ${nearest.c}？` : ''
        throw new SimError(node.line, 'name', `第 ${node.line} 行的 ${id} 电脑不认识${hint}`)
      }
      walk(node.children)
    }
  }
  walk(nodes)
}

/* ------------------------------ 海龟 ------------------------------ */

class Turtle {
  x = 0
  y = 0
  heading = 0
  color = 'var(--brand)'
  penDown = true
  strokes: Stroke[] = []
  current: [number, number][] = [[0, 0]]
  textLines: string[] = []
  minX = 0
  minY = 0
  maxX = 0
  maxY = 0

  private note(x: number, y: number) {
    this.minX = Math.min(this.minX, x)
    this.minY = Math.min(this.minY, y)
    this.maxX = Math.max(this.maxX, x)
    this.maxY = Math.max(this.maxY, y)
  }

  private endStroke() {
    if (this.current.length > 1) this.strokes.push({ color: this.color, points: this.current })
    this.current = [[this.x, this.y]]
  }

  move(d: number) {
    const rad = (this.heading * Math.PI) / 180
    this.x += d * Math.cos(rad)
    this.y += d * Math.sin(rad)
    this.note(this.x, this.y)
    if (this.penDown) this.current.push([this.x, this.y])
    else this.current = [[this.x, this.y]]
  }

  turn(a: number) {
    this.heading += a
  }

  circle(r: number) {
    const rad = (this.heading * Math.PI) / 180
    const cx = this.x - r * Math.sin(rad)
    const cy = this.y + r * Math.cos(rad)
    const start = Math.atan2(this.y - cy, this.x - cx)
    const steps = 48
    if (this.penDown) this.endStroke()
    for (let i = 1; i <= steps; i++) {
      const ang = start + (i / steps) * Math.PI * 2
      const px = cx + Math.abs(r) * Math.cos(ang)
      const py = cy + Math.abs(r) * Math.sin(ang)
      this.note(px, py)
      if (this.penDown) this.current.push([px, py])
    }
    if (this.penDown) this.endStroke()
  }

  moveTo(x: number, y: number) {
    this.x = x
    this.y = y
    this.note(x, y)
    if (this.penDown) this.endStroke()
    else this.current = [[x, y]]
  }

  penUp() {
    this.endStroke()
    this.penDown = false
  }

  setColor(color: string) {
    // 换色即切段，否则整条线会全变成最后一种颜色
    if (this.penDown) this.endStroke()
    this.color = color
    this.current = [[this.x, this.y]]
  }

  penDownFn() {
    this.penDown = true
    this.current = [[this.x, this.y]]
  }

  finish() {
    if (this.penDown) this.endStroke()
  }
}

const NUM_EXPR = /^[0-9a-zA-Z_+\-*/%().\s]+$/

function safeEval(expr: string, env: Record<string, number>, line: number): number {
  const trimmed = expr.trim()
  if (!trimmed || !NUM_EXPR.test(trimmed)) {
    throw new SimError(line, 'syntax', '这个算式电脑算不出来')
  }
  const replaced = trimmed.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (name) => {
    if (name === 'True') return '1'
    if (name === 'False') return '0'
    const v = env[name]
    if (v === undefined) throw new SimError(line, 'name', `变量 ${name} 还没有装东西`)
    return String(v)
  })
  if (!/^[0-9+\-*/%().\s]+$/.test(replaced)) {
    throw new SimError(line, 'syntax', '这个算式电脑算不出来')
  }
  const value = Function(`"use strict";return (${replaced})`)()
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new SimError(line, 'syntax', '这个算式电脑算不出来')
  }
  return value
}

function evalCond(expr: string, env: Record<string, number>, line: number): boolean {
  const cmp = expr.match(/^(.+?)(==|!=|<=|>=|<|>)(.+)$/)
  if (!cmp) throw new SimError(line, 'syntax', 'if 后面的判断写得不太对')
  const left = safeEval(cmp[1], env, line)
  const right = safeEval(cmp[3], env, line)
  switch (cmp[2]) {
    case '==':
      return left === right
    case '!=':
      return left !== right
    case '<':
      return left < right
    case '>':
      return left > right
    case '<=':
      return left <= right
    case '>=':
      return left >= right
    default:
      return false
  }
}

function evalArg(raw: string, env: Record<string, number>, line: number): number | string {
  const t = raw.trim()
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1)
  }
  return safeEval(t, env, line)
}

function splitArgs(argStr: string): string[] {
  const args: string[] = []
  let depth = 0
  let inStr: string | null = null
  let buf = ''
  for (const c of argStr) {
    if (inStr) {
      buf += c
      if (c === inStr) inStr = null
      continue
    }
    if (c === '"' || c === "'") {
      inStr = c
      buf += c
      continue
    }
    if (c === '(') depth++
    if (c === ')') depth--
    if (c === ',' && depth === 0) {
      args.push(buf)
      buf = ''
      continue
    }
    buf += c
  }
  if (buf.trim()) args.push(buf)
  return args.map((a) => a.trim())
}

function mapColor(name: string): string {
  const palette: Record<string, string> = {
    teal: 'var(--brand)',
    orange: 'var(--warning)',
    red: 'var(--danger)',
    green: 'var(--success)',
    blue: 'var(--art-blue)',
    purple: 'var(--art-purple)',
    yellow: 'var(--art-yellow)',
    black: 'var(--ink)',
    white: 'var(--art-white)',
  }
  return palette[name.toLowerCase()] ?? name
}

const CALL_RE = /^(?:t|turtle)\.([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/
const PLAIN_CALL_RE = /^([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/

function execCall(name: string, argStr: string, turtle: Turtle, env: Record<string, number>, line: number) {
  const args = splitArgs(argStr)
  const num = (i: number) => Number(evalArg(args[i] ?? '0', env, line))
  switch (name) {
    case 'forward':
    case 'fd':
      turtle.move(num(0))
      break
    case 'backward':
    case 'bk':
      turtle.move(-num(0))
      break
    case 'right':
    case 'rt':
      turtle.turn(-num(0))
      break
    case 'left':
    case 'lt':
      turtle.turn(num(0))
      break
    case 'circle':
      turtle.circle(num(0))
      break
    case 'goto':
    case 'setpos':
      turtle.moveTo(num(0), num(1))
      break
    case 'home':
      turtle.moveTo(0, 0)
      break
    case 'penup':
    case 'pu':
      turtle.penUp()
      break
    case 'pendown':
    case 'pd':
      turtle.penDownFn()
      break
    case 'pencolor':
    case 'color': {
      const c = evalArg(args[0] ?? '"teal"', env, line)
      if (typeof c === 'string') turtle.setColor(mapColor(c))
      break
    }
    case 'speed':
    case 'hideturtle':
    case 'showturtle':
    case 'done':
    case 'begin_fill':
    case 'end_fill':
    case 'dot':
      break
    case 'print': {
      const v = evalArg(args[0] ?? '""', env, line)
      turtle.textLines.push(String(v))
      break
    }
    default:
      throw new SimError(line, 'name', `电脑不认识 ${name} 这个动作`)
  }
}

function execBlock(nodes: Node[], turtle: Turtle, env: Record<string, number>) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const text = node.text

    if (text.startsWith('for ')) {
      const match = text.match(/^for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+range\((.*)\)\s*:$/)
      if (!match) throw new SimError(node.line, 'syntax', 'for 这一行写得不太对')
      const count = Math.max(0, Math.floor(Number(evalArg(match[2], env, node.line))))
      for (let k = 0; k < count; k++) {
        env[match[1]] = k
        execBlock(node.children, turtle, env)
      }
      continue
    }

    if (text.startsWith('if ')) {
      const match = text.match(/^if\s+(.+)\s*:$/)
      if (!match) throw new SimError(node.line, 'syntax', 'if 这一行写得不太对')
      if (/(?<![<>!=])=(?!=)/.test(match[1])) {
        throw new SimError(node.line, 'syntax', '= vs ==')
      }
      const ok = evalCond(match[1], env, node.line)
      const next = nodes[i + 1]
      const hasElse = !!next && next.indent === node.indent && next.text.startsWith('else')
      if (ok) execBlock(node.children, turtle, env)
      else if (hasElse) execBlock(next.children, turtle, env)
      if (hasElse) i++
      continue
    }

    if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*==/.test(text)) {
      throw new SimError(node.line, 'syntax', '= vs ==')
    }

    const assign = text.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=(?!=)\s*(.+)$/)
    if (assign) {
      env[assign[1]] = safeEval(assign[2], env, node.line)
      continue
    }

    const call = text.match(CALL_RE) || text.match(PLAIN_CALL_RE)
    if (call) {
      execCall(call[1], call[2], turtle, env, node.line)
      continue
    }

    if (text.startsWith('import ') || text.startsWith('from ') || text === 'pass') continue
    throw new SimError(node.line, 'syntax', '这一行电脑看不懂')
  }
}

export function simulate(code: string): SimResult {
  const { nodes } = parseCode(code)
  checkNames(nodes, collectNames(nodes))
  const turtle = new Turtle()
  const env: Record<string, number> = {}
  try {
    execBlock(nodes, turtle, env)
    turtle.finish()
  } catch (err) {
    if (err instanceof SimError) throw err
    throw new SimError(1, 'syntax', '这段代码跑不起来')
  }
  return {
    strokes: turtle.strokes,
    text: turtle.textLines.join('\n'),
    bounds: { minX: turtle.minX, minY: turtle.minY, maxX: turtle.maxX, maxY: turtle.maxY },
  }
}

export type { TurtleArt }
