import { useState, type ReactNode } from 'react'
import type { BlankLine, Level, RunResult } from '@/types'
import { runCode, type PythonPhase } from '@/lib/runner'
import { RunPreview } from '@/components/RunPreview'
import { RunButton } from '@/components/RunButton'

interface Props {
  level: Level
  envPhase: PythonPhase
  onNext: () => void
}

function blankKey(line: number, index: number): string {
  return `${line}:${index}`
}

function groupsOf(level: Level): BlankLine[] {
  return (level.blank_lines ?? [])
    .map((group) => ({
      ...group,
      blanks: [...group.blanks].sort((a, b) => a.start - b.start),
    }))
    .sort((a, b) => a.line - b.line)
}

/** B 回合的完形填空：整段代码都在，指定的词留成输入框。全部填上才能运行。 */
export function FillBlank({ level, envPhase, onNext }: Props) {
  const groups = groupsOf(level)
  const [values, setValues] = useState<Record<string, string>>({})
  const [result, setResult] = useState<RunResult | null>(null)
  const [flash, setFlash] = useState(false)
  const [running, setRunning] = useState(false)

  const filled = (line: number, index: number) => (values[blankKey(line, index)] ?? '').trim()

  const allFilled = groups.every((group) => group.blanks.every((_, index) => filled(group.line, index).length > 0))
  const allCorrect = groups.every((group) =>
    group.blanks.every((blank, index) => filled(group.line, index) === blank.answer),
  )

  const compose = () =>
    level.teach_code_lines
      .map((line, lineNo) => {
        const group = groups.find((item) => item.line === lineNo)
        if (!group) return line
        let out = ''
        let cursor = 0
        group.blanks.forEach((blank, index) => {
          out += line.slice(cursor, blank.start)
          out += filled(lineNo, index)
          cursor = blank.end
        })
        return out + line.slice(cursor)
      })
      .join('\n')

  const run = async () => {
    if (running || !allFilled) return
    setRunning(true)
    const res = await runCode(compose(), level.level_id, setResult)
    setResult(res)
    setRunning(false)
    if (res.ok) {
      setFlash(true)
      window.setTimeout(() => setFlash(false), 1400)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,40%)_minmax(0,1fr)]">
      <div className="flex min-h-[420px] flex-col gap-4">
        <div className="text-sm font-medium text-ink-soft">
          {result?.ok ? '这是你填完跑出来的' : '空都填上之后，点运行看看'}
        </div>
        <div className="min-h-[300px] flex-1">
          <RunPreview result={result} flash={flash && !!result?.ok} />
        </div>
      </div>

      <div className="card flex flex-col p-6">
        <span className="chip w-fit bg-brand-soft text-brand-strong">填一填</span>
        <h2 className="mt-3 text-xl font-semibold text-ink">代码已经给你，把空着的词填上</h2>
        <p className="mt-1 text-sm text-ink-soft">变量名和数字都在上面出现过。空都填了，运行按钮才会亮。</p>

        <div className="mt-5 space-y-2 rounded-card border border-line bg-code-bg px-4 py-4">
          {level.teach_code_lines.map((line, lineNo) => {
            const group = groups.find((item) => item.line === lineNo)
            const failed = !!result && !result.ok && !result.loading && result.line === lineNo + 1
            return (
              <div key={lineNo} className={`flex items-start gap-3 rounded-md px-1 ${failed ? 'bg-danger-soft ring-1 ring-danger' : ''}`}>
                <span className="code-font w-6 shrink-0 pt-1 text-right text-sm text-ink-soft">{lineNo + 1}</span>
                <div className="code-font min-w-0 flex-1 text-sm leading-8 text-ink">
                  <LineParts
                    line={line}
                    lineNo={lineNo}
                    group={group}
                    values={values}
                    onChange={(index, next) => {
                      setValues((prev) => ({ ...prev, [blankKey(lineNo, index)]: next }))
                      setResult(null)
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {result && !result.ok && !result.loading && (
          <div className="mt-4 rounded-card border border-danger/40 bg-danger-soft p-4">
            <p className="font-semibold text-danger">
              {result.line > 0 ? `第 ${result.line} 行出了点小问题` : result.message}
            </p>
            {result.line > 0 && <p className="mt-1 text-ink">{result.message}</p>}
          </div>
        )}

        {result?.ok && !allCorrect && (
          <p className="mt-4 rounded-field bg-warning-soft px-4 py-3 text-ink">
            跑起来了，不过有的空和原来不一样。改成一样，再去下一回合。
          </p>
        )}

        {result?.ok && allCorrect && (
          <div className="mt-4 flex items-center justify-between rounded-card border border-success bg-success-soft px-5 py-4">
            <span className="font-semibold text-success">空都填对了，跑通了！</span>
            <button type="button" className="btn-primary" onClick={onNext}>
              下一回合
            </button>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <RunButton
            textLevel
            envPhase={envPhase}
            busy={running}
            disabled={!allFilled}
            idleLabel="运行"
            onRun={run}
          />
          {!allFilled && <span className="text-sm text-ink-soft">还有空没填</span>}
        </div>
      </div>
    </div>
  )
}

function LineParts({
  line,
  lineNo,
  group,
  values,
  onChange,
}: {
  line: string
  lineNo: number
  group: BlankLine | undefined
  values: Record<string, string>
  onChange: (index: number, next: string) => void
}) {
  if (!group) return <span className="whitespace-pre">{line || ' '}</span>
  const parts: ReactNode[] = []
  let cursor = 0
  group.blanks.forEach((blank, index) => {
    parts.push(
      <span key={`t-${index}`} className="whitespace-pre">
        {line.slice(cursor, blank.start)}
      </span>,
    )
    parts.push(
      <input
        key={`b-${index}`}
        aria-label={`第 ${lineNo + 1} 行填空 ${index + 1}`}
        value={values[blankKey(lineNo, index)] ?? ''}
        onChange={(e) => onChange(index, e.target.value)}
        onPaste={(e) => e.preventDefault()}
        spellCheck={false}
        autoComplete="off"
        className="code-font mx-0.5 inline-block rounded border-2 border-brand bg-white px-1 text-center text-ink outline-none"
        style={{ width: `${Math.max(blank.answer.length, 2) + 1.5}ch` }}
      />,
    )
    cursor = blank.end
  })
  parts.push(
    <span key="tail" className="whitespace-pre">
      {line.slice(cursor)}
    </span>,
  )
  return <>{parts}</>
}
