import type { CanvasCommand, ChallengeParam, Level, RunCursor, RunResult, RunStep } from '@/types'
import { splitCanvasStdout } from './canvasCommands'
import { resolveLevel } from './levelCatalog'
import { explainPythonError, normalizeStdout, tracebackLine } from './pythonError'

export type PythonPhase = 'idle' | 'loading' | 'ready' | 'error'

interface TraceBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface RawTraceStep {
  line: number
  note: string
  text: string
  commands: unknown
  cursor: RunCursor
}

type WorkerInbound =
  | { type: 'ready' }
  | { type: 'fatal'; message: string }
  | { type: 'interrupt'; buffer: SharedArrayBuffer }
  | { type: 'result'; id: number; ok: true; stdout: string }
  | { type: 'result'; id: number; ok: false; error: string }
  | { type: 'trace-ready'; id: number; ok: true; total: number; bounds: TraceBounds; nextLine: number | null; truncated?: boolean }
  | { type: 'trace-ready'; id: number; ok: false; error: string }
  | {
      type: 'trace-step'
      id: number
      ok: true
      index: number
      total: number
      nextLine: number | null
      step: RawTraceStep | null
      truncated?: boolean
    }
  | { type: 'trace-step'; id: number; ok: false; error: string }

type WorkerReply = Exclude<WorkerInbound, { type: 'ready' } | { type: 'fatal'; message: string } | { type: 'interrupt'; buffer: SharedArrayBuffer }>

type PendingRun = {
  resolve: (value: WorkerReply) => void
  timer: number
  grace: number
}

/** 学生代码最多跑这么久。下载 Pyodide 的时间不算在里面。 */
const RUN_LIMIT_MS = 3_000
const INTERRUPT_GRACE_MS = 800
const EXEC_TIMEOUT_MESSAGE = '代码执行时间太长啦，检查一下有没有死循环？'

/** Pyodide 还在下载。页面用它把运行按钮换成「引擎准备中...」。 */
export function pythonLoadingResult(): RunResult {
  return { ok: false, loading: true, line: 0, message: '引擎准备中...' }
}

let phase: PythonPhase = 'idle'
let worker: Worker | null = null
let bootPromise: Promise<void> | null = null
let seq = 0
let interruptBuffer: Uint8Array | null = null
let execution: Promise<void> = Promise.resolve()
const listeners = new Set<(next: PythonPhase) => void>()
const pending = new Map<number, PendingRun>()

function setPhase(next: PythonPhase) {
  phase = next
  for (const listener of listeners) listener(next)
}

export function pythonEnvPhase(): PythonPhase {
  return phase
}

export function subscribePythonEnv(listener: (next: PythonPhase) => void): () => void {
  listeners.add(listener)
  listener(phase)
  return () => listeners.delete(listener)
}

function dropWorker(message: string) {
  const current = worker
  worker = null
  bootPromise = null
  interruptBuffer = null
  if (current) {
    current.onmessage = null
    current.onerror = null
    current.terminate()
  }
  for (const [id, item] of pending) {
    window.clearTimeout(item.timer)
    window.clearTimeout(item.grace)
    item.resolve({ type: 'result', id, ok: false, error: message })
    pending.delete(id)
  }
}

function ensureWorker(): Worker {
  if (worker) return worker
  const next = new Worker(new URL('./pyodide.worker.ts', import.meta.url), { type: 'module' })
  next.onmessage = (event: MessageEvent<WorkerInbound>) => {
    const data = event.data
    if (!data || typeof data !== 'object') return
    if (data.type === 'ready') {
      setPhase('ready')
      return
    }
    if (data.type === 'fatal') {
      setPhase('error')
      dropWorker(data.message || '运行环境加载失败')
      return
    }
    if (data.type === 'interrupt') {
      if (data.buffer instanceof SharedArrayBuffer) {
        interruptBuffer = new Uint8Array(data.buffer)
        interruptBuffer[0] = 0
      }
      return
    }
    if (data.type !== 'result' && data.type !== 'trace-ready' && data.type !== 'trace-step') return
    const item = pending.get(data.id)
    if (!item) return
    window.clearTimeout(item.timer)
    window.clearTimeout(item.grace)
    pending.delete(data.id)
    if (!data.ok && (data.error === 'TIMEOUT' || /KeyboardInterrupt/.test(data.error))) {
      item.resolve({ ...data, error: EXEC_TIMEOUT_MESSAGE })
      return
    }
    item.resolve(data)
  }
  next.onerror = () => {
    setPhase('error')
    dropWorker('运行环境加载失败')
  }
  worker = next
  return next
}

/** 提前下载 Pyodide。已经就绪或正在下时，重复调用会共用同一次。 */
export function warmupPython(): Promise<void> {
  if (phase === 'ready' && worker) return Promise.resolve()
  if (bootPromise) return bootPromise
  setPhase('loading')
  ensureWorker()
  const mine = new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      if (bootPromise === mine) bootPromise = null
      setPhase('error')
      dropWorker('运行环境加载超时，请检查网络后再试一次。')
      reject(new Error('运行环境加载超时'))
    }, 60_000)
    const stop = subscribePythonEnv((next) => {
      if (next !== 'ready' && next !== 'error') return
      window.clearTimeout(timeout)
      stop()
      if (bootPromise === mine) bootPromise = null
      if (next === 'ready') resolve()
      else reject(new Error('运行环境加载失败'))
    })
  })
  bootPromise = mine
  return mine
}

function runInWorkerNow(code: string, action: 'run' | 'trace' | 'trace-next' = 'run'): Promise<WorkerReply> {
  const current = worker
  if (!current) return Promise.resolve({ type: 'result', id: 0, ok: false, error: '运行环境没有准备好' })
  const id = ++seq
  if (interruptBuffer) interruptBuffer[0] = 0
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: WorkerReply) => {
      if (settled) return
      settled = true
      const item = pending.get(id)
      if (item) {
        window.clearTimeout(item.timer)
        window.clearTimeout(item.grace)
        pending.delete(id)
      }
      resolve(value)
    }
    const stopHard = () => {
      if (settled) return
      pending.delete(id)
      dropWorker(EXEC_TIMEOUT_MESSAGE)
      setPhase('idle')
      finish({ type: 'result', id, ok: false, error: EXEC_TIMEOUT_MESSAGE })
    }
    const timer = window.setTimeout(() => {
      if (settled) return
      const item = pending.get(id)
      if (interruptBuffer && item) {
        interruptBuffer[0] = 2
        item.grace = window.setTimeout(stopHard, INTERRUPT_GRACE_MS)
        return
      }
      stopHard()
    }, RUN_LIMIT_MS)
    pending.set(id, { resolve: finish, timer, grace: 0 })
    current.postMessage({ id, code, action })
  })
}

function asRun(reply: WorkerReply): { ok: true; stdout: string } | { ok: false; error: string } {
  if (reply.type !== 'result') return { ok: false, error: '运行环境没有准备好' }
  if (reply.ok) return { ok: true, stdout: reply.stdout }
  return { ok: false, error: reply.error }
}

/** 同一时间只跑一份学生代码，连点也不会叠两个 Worker 请求。 */
function runInWorker(code: string): Promise<{ ok: true; stdout: string } | { ok: false; error: string }> {
  const job = execution.then(async () => {
    if (!worker || phase !== 'ready') {
      try {
        await warmupPython()
      } catch (err) {
        const message = err instanceof Error ? err.message : '运行环境加载失败，请检查网络后再试一次。'
        return { ok: false as const, error: message }
      }
    }
    return asRun(await runInWorkerNow(code, 'run'))
  })
  execution = job.then(
    () => undefined,
    () => undefined,
  )
  return job
}

/**
 * 把真实 traceback 收成给孩子看的一句话，并带上出错的行号。
 * 关卡自己的 error_mappings 只补这些句子没覆盖到的情况。
 */
function explainTraceback(raw: string, mappings: Level['error_mappings']): { line: number; message: string } {
  const line = tracebackLine(raw)
  const missingName = raw.match(/NameError: name '([^']+)' is not defined/)
  if (missingName) {
    return { line, message: `Python 不认识 '${missingName[1]}' 这个词，是不是拼错了？或者忘了加引号？` }
  }
  const missingAction = raw.match(/AttributeError: 'Turtle' object has no attribute '([^']+)'/)
  if (missingAction) {
    return {
      line,
      message: `海龟不认识 '${missingAction[1]}' 这个动作，检查一下拼写吧（比如 forward 别拼错）。`,
    }
  }
  if (/SyntaxError: expected ':'/.test(raw)) {
    return { line, message: "这行的最后是不是漏了一个英文冒号 ':'？" }
  }
  if (/IndentationError: expected an indented block/.test(raw)) {
    return { line, message: '缩进不对哦，循环或者判断下面的代码，需要往右边退一格。' }
  }
  if (/SyntaxError: invalid syntax/.test(raw)) {
    return { line, message: '这里好像少写了标点符号，或者拼写不对哦。' }
  }
  return explainPythonError(raw, mappings)
}

async function runWithPyodide(code: string, level: Level): Promise<RunResult> {
  try {
    await warmupPython()
  } catch (err) {
    const message = err instanceof Error ? err.message : '运行环境加载失败，请检查网络后再试一次。'
    return { ok: false, line: 1, message }
  }
  const exec = await runInWorker(code)
  if (!exec.ok) {
    if (exec.error === EXEC_TIMEOUT_MESSAGE) {
      return { ok: false, line: 0, message: EXEC_TIMEOUT_MESSAGE }
    }
    if (!/Traceback \(most recent call last\)/.test(exec.error)) {
      return { ok: false, line: 1, message: exec.error }
    }
    const friendly = explainTraceback(exec.error, level.error_mappings)
    return { ok: false, line: friendly.line, message: friendly.message }
  }
  const parsed = splitCanvasStdout(exec.stdout)
  const text = normalizeStdout(parsed.text)
  if (parsed.commands.length > 0) {
    return { ok: true, output: { kind: 'canvas', commands: parsed.commands, text } }
  }
  return { ok: true, output: { kind: 'text', text } }
}

/**
 * 页面唯一的运行入口。文本和海龟都进 Pyodide，海龟画线由自定义 turtle 模块交回。
 * 环境还没好时，先把 `{ ok: false, loading: true }` 交给 onUpdate，下完再自动跑这份代码。
 */
export async function runCode(
  code: string,
  levelId: string,
  onUpdate?: (result: RunResult) => void,
): Promise<RunResult> {
  const level = resolveLevel(levelId)
  if (!level) {
    return { ok: false, line: 1, message: '没有找到这一关的课程内容，先回到课程地图看看。' }
  }
  if (pythonEnvPhase() !== 'ready') onUpdate?.(pythonLoadingResult())
  return runWithPyodide(code, level)
}

export function readRunText(result: RunResult | null | undefined): string {
  if (!result?.ok) return ''
  return result.output.text
}

function asCommands(value: unknown): CanvasCommand[] {
  if (!Array.isArray(value)) return []
  const commands: CanvasCommand[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (row.action !== 'line') continue
    const x1 = Number(row.x1)
    const y1 = Number(row.y1)
    const x2 = Number(row.x2)
    const y2 = Number(row.y2)
    const pensize = Number(row.pensize)
    if (![x1, y1, x2, y2].every(Number.isFinite)) continue
    commands.push({
      action: 'line',
      x1,
      y1,
      x2,
      y2,
      color: typeof row.color === 'string' ? row.color : 'brand',
      pensize: Number.isFinite(pensize) ? pensize : 1,
    })
  }
  return commands
}

function asStep(raw: RawTraceStep): RunStep {
  const cursor = raw.cursor ?? { x: 0, y: 0, heading: 0 }
  return {
    line: Number(raw.line) || 1,
    note: typeof raw.note === 'string' ? raw.note : '执行这一行',
    text: typeof raw.text === 'string' ? raw.text : '',
    commands: asCommands(raw.commands),
    cursor: {
      x: Number(cursor.x) || 0,
      y: Number(cursor.y) || 0,
      heading: Number(cursor.heading) || 0,
    },
  }
}

async function enqueueWorker(code: string, action: 'run' | 'trace' | 'trace-next'): Promise<WorkerReply> {
  const job = execution.then(async () => {
    if (!worker || phase !== 'ready') {
      try {
        await warmupPython()
      } catch (err) {
        const message = err instanceof Error ? err.message : '运行环境加载失败，请检查网络后再试一次。'
        return { type: 'result' as const, id: 0, ok: false as const, error: message }
      }
    }
    return runInWorkerNow(code, action)
  })
  execution = job.then(
    () => undefined,
    () => undefined,
  )
  return job
}

export interface TraceStart {
  ok: true
  total: number
  bounds: TraceBounds
  nextLine: number | null
  /** 超过 500 步就停。页面不再逐帧来取，改成直接运行。 */
  truncated: boolean
}

/** 用真实 Python 把整段代码走一遍，帧留在 Worker 里。空格再逐帧来取。 */
export async function beginTrace(code: string): Promise<TraceStart | { ok: false; message: string }> {
  const reply = await enqueueWorker(code, 'trace')
  if (reply.type !== 'trace-ready') {
    return { ok: false, message: '这段代码没法分步走' }
  }
  if (!reply.ok) return { ok: false, message: reply.error }
  return { ok: true, total: reply.total, bounds: reply.bounds, nextLine: reply.nextLine, truncated: reply.truncated === true }
}

/** 学生按空格或「下一步」时调用。Worker 交出已经算好的下一帧。 */
export async function nextTraceStep(): Promise<
  | { ok: true; step: RunStep | null; nextLine: number | null; index: number; total: number; truncated: boolean }
  | { ok: false; message: string }
> {
  const reply = await enqueueWorker('', 'trace-next')
  if (reply.type !== 'trace-step') return { ok: false, message: '这一步没有走成' }
  if (!reply.ok) return { ok: false, message: reply.error }
  return {
    ok: true,
    step: reply.step ? asStep(reply.step) : null,
    nextLine: reply.nextLine,
    index: reply.index,
    total: reply.total,
    truncated: reply.truncated === true,
  }
}

function extremes(param: ChallengeParam): Array<string | number> {
  if (param.type === 'select') {
    return (param.options ?? []).map((option) => option.value).filter((value) => String(value) !== String(param.default))
  }
  const current = Number(param.default)
  const values: number[] = []
  if (param.min != null && param.min !== current) values.push(param.min)
  if (param.max != null && param.max !== current) values.push(param.max)
  return values
}

function absorbBounds(bounds: TraceBounds, commands: CanvasCommand[]) {
  for (const command of commands) {
    bounds.minX = Math.min(bounds.minX, command.x1, command.x2)
    bounds.minY = Math.min(bounds.minY, command.y1, command.y2)
    bounds.maxX = Math.max(bounds.maxX, command.x1, command.x2)
    bounds.maxY = Math.max(bounds.maxY, command.y1, command.y2)
  }
}

export interface PreviewLock {
  frame: TraceBounds | null
  preview: RunResult | null
  code: string
}

/**
 * C 回合的视野按参数能画出的最大范围锁住。
 * 每个样本都用真实 Pyodide 跑，取它们的坐标并集。
 */
export async function lockPreview(level: Level): Promise<PreviewLock> {
  const base = level.teach_code_lines.join('\n')
  const samples = [base]
  for (const param of level.challenge_params) {
    for (const value of extremes(param)) {
      let text = base
      for (const item of level.challenge_params) {
        text = applyParam(text, item, item.name === param.name ? value : item.default)
      }
      if (!samples.includes(text)) samples.push(text)
    }
  }
  const bounds: TraceBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  let seen = false
  let preview: RunResult | null = null
  for (const sample of samples) {
    const result = await runCode(sample, level.level_id)
    if (sample === base) preview = result
    if (!result.ok || result.output.kind !== 'canvas') continue
    seen = true
    absorbBounds(bounds, result.output.commands)
  }
  if (!seen) return { frame: null, preview, code: base }
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 80)
  const pad = span * 0.08
  return {
    frame: {
      minX: bounds.minX - pad,
      minY: bounds.minY - pad,
      maxX: bounds.maxX + pad,
      maxY: bounds.maxY + pad,
    },
    preview,
    code: base,
  }
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
