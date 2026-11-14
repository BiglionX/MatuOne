import type { ChallengeParam, Level, RunResult, RunStep } from '@/types'
import { resolveFriendly } from './errorHint'
import { hintFor, resolveLevel } from './levelCatalog'
import { SimError, simulate, traceCode } from './python-sim'

/**
 * Python 执行适配层（页面唯一的运行入口）。
 * 1.0 原型内部用轻量模拟器给出预置结果；替换 Pyodide 时只改本文件，
 * 页面与组件不需要任何改动。
 */
export async function runCode(code: string, levelId: string): Promise<RunResult> {
  const started = performance.now()
  let runSeed = 0
  const level = resolveLevel(levelId)

  // 模拟一次真实的异步执行耗时，给页面留出"运行中"状态
  await new Promise((resolve) => setTimeout(resolve, 260 + Math.floor(Math.random() * 220)))
  runSeed = Date.now()

  if (!level) {
    return {
      ok: false,
      kind: 'text',
      lineCount: 0,
      runId: String(runSeed),
      elapsedMs: Math.round(performance.now() - started),
      source: 'mock',
      error: { line: 1, pattern: 'syntax', message: '没有找到这一关的课程内容，先回到课程地图看看。' },
    }
  }

  const lineCount = code.split('\n').filter((l) => l.trim().length > 0).length

  try {
    const result = simulate(code)
    return {
      ok: true,
      kind: level.preview_kind,
      text: result.text,
      art: { strokes: result.strokes, bounds: result.bounds },
      lineCount,
      runId: String(runSeed),
      elapsedMs: Math.round(performance.now() - started),
      source: 'mock',
    }
  } catch (err) {
    const simError = err instanceof SimError ? err : null
    const pattern = simError?.pattern ?? 'syntax'
    const diagnostic = `${simError?.message ?? ''} ${pattern}`
    const mapped = resolveFriendly(level.error_mappings, pattern, diagnostic)
    const fallback: Record<string, string> = {
      syntax: '这一行和标准答案对不上，仔细看看是不是少打了个符号。',
      cjk: '这里的括号或逗号是中文的，换成英文输入法再打一次。',
      paren: '这一行的括号没有配对上，数一数左括号和右括号是不是一样多。',
      indent: '冒号后面要缩进 4 个空格，下一行要往右挪一点。',
      name: '有个名字拼错了，Python 不认识它。',
    }
    return {
      ok: false,
      kind: level.preview_kind,
      lineCount,
      runId: String(runSeed),
      elapsedMs: Math.round(performance.now() - started),
      source: 'mock',
      error: {
        line: simError?.line ?? 1,
        pattern,
        // 用课程配置里的话术优先，保证提示和本节内容贴合
        // 关卡自己的 error_mappings 优先，全局 hint 只作兜底
        message: mapped ?? hintFor(pattern) ?? fallback[pattern] ?? fallback.syntax,
      },
    }
  }
}

/** 分步执行：每一步是一条语句跑完后的画面。页面用它做「按空格走一步」。 */
export function traceRun(code: string): RunStep[] {
  return traceCode(code).map((step) => ({
    line: step.line,
    note: step.note,
    text: step.text,
    art: { strokes: step.strokes, bounds: step.bounds },
    cursor: step.cursor,
  }))
}

/**
 * 把「改一改」的参数写进代码，返回改写后的完整代码。
 * 页面不直接拼接 mock 数据，统一走这里。
 */
export function applyParam(code: string, param: ChallengeParam, value: string | number): string {
  const lines = code.split('\n')

  if (param.apply.kind === 'replaceChar') {
    return code.split(param.apply.char).join(String(value))
  }

  if (param.apply.kind === 'assign') {
    const variable = param.apply.variable
    let replaced = false
    return lines
      .map((line) => {
        if (replaced) return line
        const match = line.match(new RegExp(`^(\\s*)${variable}\\s*=.*$`))
        if (!match) return line
        replaced = true
        const quoted = /=\s*(['"]).*\1\s*$/.test(line)
        const literal = quoted ? `"${String(value)}"` : String(value)
        return `${match[1]}${variable} = ${literal}`
      })
      .join('\n')
  }

  const { func, argIndex } = param.apply
  const occurrence = param.apply.occurrence ?? 1
  const argText = typeof value === 'string' && func === 'print' ? `"${value}"` : String(value)
  let seen = 0
  const callPattern = new RegExp(`${func}\\(([^)]*)\\)`, 'g')

  return lines
    .map((line) => {
      if (occurrence !== 'all' && seen >= occurrence) return line
      return line.replace(callPattern, (whole, inner: string) => {
        seen += 1
        if (occurrence !== 'all' && seen !== occurrence) return whole
        const args = inner.split(',')
        args[argIndex] = argText
        return `${func}(${args.join(', ')})`
      })
    })
    .join('\n')
}

/** 按课程默认参数生成完整示例代码 */
export function buildDemoCode(level: Level): string {
  let code = level.teach_code_lines.join('\n')
  for (const param of level.challenge_params) {
    code = applyParam(code, param, param.default)
  }
  return code
}
