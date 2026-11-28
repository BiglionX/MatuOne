import { Fragment, type ReactNode } from 'react'

interface PythonCodeViewProps {
  code: string
  error?: string | null
}

const KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'break', 'class', 'continue',
  'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global',
  'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'try', 'while', 'with', 'yield',
])

const TOKEN_PATTERN = /(#.*$)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|\b(False|None|True|and|as|assert|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)(?=\s*\()/g

function tokenClass(token: string): string {
  if (token.startsWith('#')) return 'text-slate-500'
  if (token.startsWith("'") || token.startsWith('"')) return 'text-emerald-300'
  if (/^\d/.test(token)) return 'text-amber-300'
  if (KEYWORDS.has(token)) return 'text-fuchsia-300'
  if (/^[A-Za-z_]\w*$/.test(token)) return 'text-sky-300'
  return 'text-slate-100'
}

/** 轻量分词高亮：不注入 HTML，积木字段里的文本始终按普通 React 文本渲染。 */
function highlightLine(line: string): ReactNode[] {
  const parts: ReactNode[] = []
  let cursor = 0
  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0
    if (index > cursor) parts.push(line.slice(cursor, index))
    parts.push(<span key={`${index}-${match[0]}`} className={tokenClass(match[0])}>{match[0]}</span>)
    cursor = index + match[0].length
  }
  if (cursor < line.length) parts.push(line.slice(cursor))
  return parts
}

/** 与工作区同高的只读代码面板；代码由 Blockly Python 生成器实时提供。 */
export function PythonCodeView({ code, error }: PythonCodeViewProps) {
  const source = error ? '# 代码预览暂时不可用，请切换回积木视图再试。' : code
  const lines = source.replace(/\n$/, '').split('\n')

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900" data-testid="python-code-view">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-slate-800 px-4 py-3">
        <span className="rounded-md bg-amber-300 px-2 py-0.5 text-xs font-bold tracking-wide text-slate-900">PY</span>
        <span className="text-sm font-semibold text-slate-100">Python 代码</span>
        <span className="ml-auto text-xs text-slate-400">只读预览 · 拖动积木后自动更新</span>
      </div>
      {error ? <p className="border-b border-red-800 bg-red-950/60 px-4 py-2 text-sm text-red-200" role="alert">{error}</p> : null}
      <div className="min-h-0 flex-1 overflow-auto">
        <pre className="code-font min-w-max px-4 py-4 text-[15px] leading-7 text-slate-100 sm:px-5" aria-label="Python 代码预览" data-testid="python-code">
          <code>
            {lines.map((line, index) => (
              <Fragment key={index}>
                <span className="inline-block w-8 select-none pr-4 text-right tabular-nums text-slate-600" aria-hidden="true">{index + 1}</span>
                <span>{highlightLine(line)}</span>
                {'\n'}
              </Fragment>
            ))}
          </code>
        </pre>
      </div>
      <p className="border-t border-slate-700 bg-slate-800/70 px-4 py-2 text-xs text-slate-400">
        这里只展示代码写法，暂时不运行 Python；运行按钮仍会执行右侧积木程序。
      </p>
    </div>
  )
}
