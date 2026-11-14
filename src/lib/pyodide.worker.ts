import miniTurtleSource from './pyodide/mini_turtle.py?raw'

const INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v314.0.8/full/'

interface PyodideApi {
  runPython: (code: string) => unknown
  runPythonAsync: (code: string) => Promise<unknown>
  setInterruptBuffer?: (buffer: Uint8Array) => void
  FS: { writeFile: (path: string, data: string) => void }
}

interface PyodideModule {
  loadPyodide: (options: { indexURL: string; interruptBuffer?: Uint8Array }) => Promise<PyodideApi>
}

const BOOT_SOURCE = [
  'import importlib.util, sys',
  'sys.path.insert(0, "/home/pyodide")',
  'spec = importlib.util.spec_from_file_location("turtle", "/home/pyodide/turtle.py")',
  'module = importlib.util.module_from_spec(spec)',
  'sys.modules["turtle"] = module',
  'loader = spec.loader',
  'if loader is None:',
  '    raise RuntimeError("turtle loader missing")',
  'loader.exec_module(module)',
  'if not getattr(module, "__mini_turtle__", False):',
  '    raise RuntimeError("official turtle was loaded")',
  'import json, traceback',
  'from io import StringIO',
  'def __run_student(source):',
  '    import turtle',
  '    turtle.reset_state()',
  '    buf = StringIO()',
  '    old = sys.stdout',
  '    sys.stdout = buf',
  '    try:',
  '        compiled = compile(source, "<exec>", "exec")',
  '        namespace = {"__name__": "__main__", "turtle": turtle, "t": turtle.Turtle()}',
  '        exec(compiled, namespace)',
  '        turtle.emit_canvas()',
  '        return json.dumps({"ok": True, "stdout": buf.getvalue()})',
  '    except Exception:',
  '        return json.dumps({"ok": False, "error": traceback.format_exc()})',
  '    finally:',
  '        sys.stdout = old',
  'def __note(text, locals_dict):',
  '    import re',
  '    stripped = text.strip()',
  '    if stripped.startswith("print"):',
  '        return "把字打印到屏幕上"',
  '    if stripped.startswith("for "):',
  '        return "进入这一轮循环"',
  '    if stripped.startswith("if "):',
  '        return "走到这个判断"',
  '    if stripped.startswith("elif "):',
  '        return "再判断一次"',
  '    if stripped.startswith("else"):',
  '        return "走进 else"',
  '    assigned = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\\s*=(?!=)", stripped)',
  '    if assigned:',
  '        name = assigned.group(1)',
  '        if isinstance(locals_dict, dict) and name in locals_dict:',
  '            return name + " 现在是 " + str(locals_dict[name])',
  '        return name + " 记下了"',
  '    call = re.match(r"^(?:t|turtle)\\.([A-Za-z_][A-Za-z0-9_]*)\\((.*)\\)\\s*$", stripped)',
  '    if call:',
  '        name, arg = call.group(1), call.group(2).strip()',
  '        if name in ("forward", "fd"):',
  '            return "向前走 " + arg',
  '        if name in ("backward", "bk", "back"):',
  '            return "向后退 " + arg',
  '        if name in ("right", "rt"):',
  '            return "向右转 " + arg + " 度"',
  '        if name in ("left", "lt"):',
  '            return "向左转 " + arg + " 度"',
  '        if name in ("color", "pencolor"):',
  '            return "换一种颜色：" + arg',
  '        if name in ("penup", "pu", "up"):',
  '            return "抬笔，接下来先不画线"',
  '        if name in ("pendown", "pd", "down"):',
  '            return "落笔，接下来会画出线"',
  '        if name == "done":',
  '            return "海龟画完了"',
  '    if stripped.startswith("import ") or stripped.startswith("from "):',
  '        return "准备好要用的工具"',
  '    return "执行这一行"',
  'def __trace_student(source):',
  '    import turtle',
  '    turtle.reset_state()',
  '    lines = source.splitlines()',
  '    steps = []',
  '    buf = StringIO()',
  '    old = sys.stdout',
  '    sys.stdout = buf',
  '    state = {"line": None}',
  '    def flush(globals_dict):',
  '        if len(steps) >= 500:',
  '            raise __TraceTooLong()',
  '        line_no = state["line"]',
  '        if line_no is None:',
  '            return',
  '        text = lines[line_no - 1] if 0 < line_no <= len(lines) else ""',
  '        bag = globals_dict if isinstance(globals_dict, dict) else {}',
  '        steps.append({',
  '            "line": line_no,',
  '            "note": __note(text, bag),',
  '            "commands": turtle.copy_commands(),',
  '            "text": buf.getvalue(),',
  '            "cursor": turtle.pose_of(bag.get("t")),',
  '        })',
  '    def tracer(frame, event, arg):',
  '        if frame.f_code.co_filename != "<exec>":',
  '            return tracer',
  '        if event == "line":',
  '            if state["line"] is not None:',
  '                flush(frame.f_globals)',
  '            state["line"] = frame.f_lineno',
  '        return tracer',
  '    try:',
  '        compiled = compile(source, "<exec>", "exec")',
  '        namespace = {"__name__": "__main__", "turtle": turtle, "t": turtle.Turtle()}',
  '        sys.settrace(tracer)',
  '        exec(compiled, namespace)',
  '        sys.settrace(None)',
  '        flush(namespace)',
  '        return json.dumps({"ok": True, "truncated": False, "steps": steps})',
  '    except __TraceTooLong:',
  '        return json.dumps({"ok": True, "truncated": True, "steps": []})',
  '    except Exception:',
  '        return json.dumps({"ok": False, "error": traceback.format_exc()})',
  '    finally:',
  '        sys.settrace(None)',
  '        sys.stdout = old',
].join('\n')

const TRACE_TOO_LONG = [
  'class __TraceTooLong(BaseException):',
  '    pass',
].join('\n')

interface TraceStep {
  line: number
  note: string
  text: string
  commands: unknown[]
  cursor: { x: number; y: number; heading: number }
}

let traceSteps: TraceStep[] = []
let traceAt = -1
let traceTruncated = false

let booting: Promise<PyodideApi> | null = null
let interrupt: Uint8Array | null = null
let chain: Promise<void> = Promise.resolve()

/** 和主线程 runner 里的执行上限一致。死循环会堵住本线程，所以主线程也会写这块共享内存。 */
const RUN_LIMIT_MS = 3_000

function shareInterrupt() {
  if (typeof SharedArrayBuffer === 'undefined') return
  try {
    const shared = new SharedArrayBuffer(1)
    interrupt = new Uint8Array(shared)
    interrupt[0] = 0
    post({ type: 'interrupt', buffer: shared })
  } catch {
    interrupt = null
  }
}

function boot(): Promise<PyodideApi> {
  if (!booting) {
    booting = (async () => {
      const href = `${INDEX_URL}pyodide.mjs`
      const mod = (await import(/* @vite-ignore */ href)) as PyodideModule
      const pyodide = await mod.loadPyodide({
        indexURL: INDEX_URL,
        ...(interrupt ? { interruptBuffer: interrupt } : {}),
      })
      pyodide.FS.writeFile('/home/pyodide/turtle.py', miniTurtleSource)
      pyodide.runPython(`${TRACE_TOO_LONG}\n${BOOT_SOURCE}`)
      if (interrupt && pyodide.setInterruptBuffer) {
        try {
          pyodide.setInterruptBuffer(interrupt)
        } catch {
          interrupt = null
        }
      }
      return pyodide
    })().catch((err) => {
      booting = null
      throw err
    })
  }
  return booting
}

function post(message: unknown) {
  self.postMessage(message)
}

function interrupted(err: unknown): boolean {
  if (interrupt && interrupt[0] === 2) return true
  const text = err instanceof Error ? err.message : String(err)
  return /KeyboardInterrupt/.test(text)
}

function boundsOf(steps: TraceStep[]) {
  let minX = 0
  let minY = 0
  let maxX = 0
  let maxY = 0
  for (const step of steps) {
    const cursor = step.cursor ?? { x: 0, y: 0, heading: 0 }
    minX = Math.min(minX, cursor.x)
    minY = Math.min(minY, cursor.y)
    maxX = Math.max(maxX, cursor.x)
    maxY = Math.max(maxY, cursor.y)
    for (const command of step.commands) {
      if (!command || typeof command !== 'object') continue
      const row = command as Record<string, unknown>
      const xs = [Number(row.x1), Number(row.x2)]
      const ys = [Number(row.y1), Number(row.y2)]
      minX = Math.min(minX, ...xs)
      minY = Math.min(minY, ...ys)
      maxX = Math.max(maxX, ...xs)
      maxY = Math.max(maxY, ...ys)
    }
  }
  return { minX, minY, maxX, maxY }
}

function postTraceReady(id: number, truncated = false) {
  const next = traceSteps[0]
  post({
    type: 'trace-ready',
    id,
    ok: true,
    truncated,
    total: traceSteps.length,
    bounds: boundsOf(traceSteps),
    nextLine: next ? next.line : null,
  })
}

function postTraceStep(id: number) {
  if (traceTruncated) {
    post({
      type: 'trace-step',
      id,
      ok: true,
      truncated: true,
      index: traceAt,
      total: 0,
      nextLine: null,
      step: null,
    })
    return
  }
  if (traceAt + 1 >= traceSteps.length) {
    post({
      type: 'trace-step',
      id,
      ok: true,
      index: traceAt,
      total: traceSteps.length,
      nextLine: null,
      step: null,
    })
    return
  }
  traceAt += 1
  const step = traceSteps[traceAt]
  const upcoming = traceSteps[traceAt + 1]
  post({
    type: 'trace-step',
    id,
    ok: true,
    index: traceAt,
    total: traceSteps.length,
    nextLine: upcoming ? upcoming.line : null,
    step,
  })
}

async function execute(id: number, code: string, action: string) {
  if (action === 'trace-next') {
    postTraceStep(id)
    return
  }
  const pyodide = await boot()
  if (interrupt && pyodide.setInterruptBuffer) {
    try {
      pyodide.setInterruptBuffer(interrupt)
    } catch {
      interrupt = null
    }
  }
  if (interrupt) interrupt[0] = 0
  let timedOut = false
  const watchdog = setTimeout(() => {
    timedOut = true
    if (interrupt) interrupt[0] = 2
  }, RUN_LIMIT_MS)
  try {
    const entry = action === 'trace' ? '__trace_student' : '__run_student'
    const raw = await pyodide.runPythonAsync(`${entry}(${JSON.stringify(code)})`)
    clearTimeout(watchdog)
    if (timedOut) {
      if (interrupt) interrupt[0] = 0
      post(action === 'trace' ? { type: 'trace-ready', id, ok: false, error: 'TIMEOUT' } : { type: 'result', id, ok: false, error: 'TIMEOUT' })
      return
    }
    const parsed = JSON.parse(String(raw)) as
      | { ok: true; stdout: string }
      | { ok: true; steps: TraceStep[]; truncated?: boolean }
      | { ok: false; error: string }
    if (!parsed.ok) {
      post(action === 'trace' ? { type: 'trace-ready', id, ok: false, error: parsed.error } : { type: 'result', id, ok: false, error: parsed.error })
      return
    }
    if (action === 'trace' && 'steps' in parsed) {
      traceTruncated = parsed.truncated === true
      traceSteps = traceTruncated ? [] : parsed.steps
      traceAt = -1
      postTraceReady(id, traceTruncated)
      return
    }
    if ('stdout' in parsed) post({ type: 'result', id, ok: true, stdout: parsed.stdout })
  } catch (err) {
    clearTimeout(watchdog)
    const stop = timedOut || interrupted(err)
    if (interrupt) interrupt[0] = 0
    const fail = action === 'trace' ? 'trace-ready' : 'result'
    if (stop) {
      post({ type: fail, id, ok: false, error: 'TIMEOUT' })
      return
    }
    post({ type: fail, id, ok: false, error: err instanceof Error ? err.message : String(err) })
  }
}

self.onmessage = (event: MessageEvent<{ type?: string; buffer?: SharedArrayBuffer; id?: number; code?: string; action?: string }>) => {
  const data = event.data
  if (!data || typeof data !== 'object') return
  if (typeof data.id !== 'number') return
  const id = data.id
  const code = data.code ?? ''
  const action = data.action === 'trace' || data.action === 'trace-next' ? data.action : 'run'
  chain = chain.then(() => execute(id, code, action)).catch(() => undefined)
}

shareInterrupt()

void boot()
  .then(() => post({ type: 'ready' }))
  .catch((err) => post({ type: 'fatal', message: err instanceof Error ? err.message : String(err) }))

export {}
