import { useMemo, useState } from 'react'
import type { BonusChallenge, ChallengeParam, Level, RunResult } from '@/types'
import { hasReverseSegment, mentionsTurnAround } from '@/lib/bonusChallenge'
import { applyParam, buildDemoCode, runCode, type PythonPhase } from '@/lib/runner'
import { RunButton } from '@/components/RunButton'
import { claimBonus } from '@/api/learning'
import { RunPreview } from '@/components/RunPreview'
import { TypingTrainer } from '@/components/TypingTrainer'

interface Props {
  level: Level
  challenge: BonusChallenge
  envPhase: PythonPhase
  sandbox?: boolean
  onDone: (reward: string) => void
  onSkip: () => void
}

function ParamControl({
  param,
  value,
  onChange,
}: {
  param: ChallengeParam
  value: string | number
  onChange: (value: string | number) => void
}) {
  if (param.type === 'select') {
    return (
      <div className="flex flex-wrap gap-2">
        {(param.options ?? []).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-field border px-4 py-2.5 transition ${
              String(value) === option.value
                ? 'border-brand bg-brand-soft font-medium text-brand-strong'
                : 'border-line bg-white text-ink hover:border-brand'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <input
        type="range"
        min={param.min ?? 0}
        max={param.max ?? 200}
        step={param.step ?? 1}
        value={Number(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-brand-soft accent-[var(--brand)]"
        aria-label={param.label}
      />
      <span className="w-16 rounded-field bg-canvas py-1.5 text-center font-semibold text-ink">{value}</span>
    </div>
  )
}

/** 学完三回合后的可选副本。跳过不影响过关。 */
export function BonusRound({ level, challenge, envPhase, sandbox = false, onDone, onSkip }: Props) {
  const param = level.challenge_params.find((item) => item.name === challenge.target_param_name)
  const [value, setValue] = useState<string | number>(param?.default ?? '')
  const [result, setResult] = useState<RunResult | null>(null)
  const [filled, setFilled] = useState('')
  const [draft, setDraft] = useState(() => level.teach_code_lines.filter((line) => line.trim() !== 't.done()').join('\n'))
  const [ink, setInk] = useState('')
  const [note, setNote] = useState('')
  const [running, setRunning] = useState(false)
  const [saving, setSaving] = useState(false)

  const code = useMemo(() => {
    if (!param) return buildDemoCode(level)
    return applyParam(buildDemoCode(level), param, value)
  }, [level, param, value])

  const finish = async () => {
    if (saving) return
    setSaving(true)
    try {
      if (sandbox) {
        onDone(challenge.bonus_reward)
        return
      }
      const saved = await claimBonus(level.level_id)
      onDone(saved.reward)
    } catch (error) {
      setNote(error instanceof Error ? error.message : '这次没记下，可以再试一次')
    } finally {
      setSaving(false)
    }
  }

  const runParam = async () => {
    if (!param || running) return
    if (String(value) === String(param.default)) {
      setNote('先把数值改成题目要的那个。')
      setResult(null)
      return
    }
    setRunning(true)
    const next = await runCode(code, level.level_id, (update) => {
      if (!update.ok && update.loading) setNote(update.message)
    })
    setResult(next)
    setRunning(false)
    if (!next.ok) {
      setNote(next.loading ? '引擎准备中...' : next.message)
      return
    }
    if (String(value) !== challenge.target_value) {
      setNote('跑通了，但还不是题目要的那个数。')
      return
    }
    setNote(`这就是${challenge.expected_output}。`)
    await finish()
  }

  const runReverse = async () => {
    if (running) return
    if (!mentionsTurnAround(draft)) {
      setNote('先让海龟掉头，或用 backward 倒退。')
      setResult(null)
      return
    }
    setRunning(true)
    const next = await runCode(`${draft}\nt.done()`, level.level_id, (update) => {
      if (!update.ok && update.loading) setNote(update.message)
    })
    setResult(next)
    setRunning(false)
    if (!next.ok) {
      setNote(next.loading ? '引擎准备中...' : next.message)
      return
    }
    if (next.output.kind !== 'canvas') {
      setNote('这次没有画出线。')
      return
    }
    const length = Number(challenge.target_value)
    if (!hasReverseSegment(next.output.commands, length)) {
      setNote('线画出来了，但还没有一条反方向、一样长的线。')
      return
    }
    setNote(`这就是${challenge.expected_output}。`)
    await finish()
  }

  const runColor = async () => {
    if (running) return
    if (!ink) {
      setNote('先选一种颜色。')
      setResult(null)
      return
    }
    if (ink !== challenge.target_value) {
      setNote('颜色换了，但还不是题目要的那一种。')
      setResult(null)
      return
    }
    setRunning(true)
    const next = await runCode(`t.color("${ink}")\n${buildDemoCode(level)}`, level.level_id, (update) => {
      if (!update.ok && update.loading) setNote(update.message)
    })
    setResult(next)
    setRunning(false)
    if (!next.ok) {
      setNote(next.loading ? '引擎准备中...' : next.message)
      return
    }
    if (next.output.kind !== 'canvas' || !next.output.commands.some((command) => command.color === ink)) {
      setNote('还没有看见这种颜色的边。')
      return
    }
    setNote(`这就是${challenge.expected_output}。`)
    await finish()
  }

  const checkFill = async () => {
    if (filled.trim() !== challenge.target_value) {
      setNote('再看看空里该填什么。')
      return
    }
    setNote(`填对了，这就是${challenge.expected_output}。`)
    await finish()
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-10">
      <div>
        <p className="text-sm font-medium text-brand-strong">巩固一下</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">{challenge.instruction}</h1>
        <p className="mt-2 text-sm text-ink-soft">这是选做的。不做也能去下一关。</p>
      </div>

      {challenge.type === 'param_edit' && param && (
        <div className="grid gap-6 lg:grid-cols-[minmax(280px,40%)_minmax(0,1fr)]">
          <div className="min-h-[280px]">
            <RunPreview result={result} />
          </div>
          <div className="card p-6">
            <p className="text-sm font-medium text-ink">{param.label}</p>
            <div className="mt-3">
              <ParamControl
                param={param}
                value={value}
                onChange={(next) => {
                  setValue(next)
                  setResult(null)
                  setNote('')
                }}
              />
            </div>
            <RunButton
              textLevel
              envPhase={envPhase}
              busy={running}
              disabled={saving}
              idleLabel="跑一下"
              className="btn-primary mt-6 px-8"
              onRun={runParam}
            />
          </div>
        </div>
      )}

      {challenge.type === 'code_fill' && (
        <div className="card p-6">
          <pre className="code-font text-lg text-ink">{challenge.prompt_line}</pre>
          <input
            className="field mt-4"
            value={filled}
            onChange={(event) => {
              setFilled(event.target.value)
              setNote('')
            }}
            aria-label="填空"
            autoFocus
          />
          <button type="button" className="btn-primary mt-4 px-8" onClick={checkFill} disabled={saving}>
            填好了
          </button>
        </div>
      )}

      {challenge.type === 'reverse_draw' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(280px,40%)_minmax(0,1fr)]">
          <div className="min-h-[280px]">
            <RunPreview result={result} />
          </div>
          <div className="card p-6">
            <p className="text-sm text-ink-soft">在原来的代码后面，让海龟掉头，再画一条一样长的线。</p>
            <textarea
              className="field code-font mt-4 min-h-36"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value)
                setResult(null)
                setNote('')
              }}
              aria-label="掉头再画"
              spellCheck={false}
            />
            <RunButton
              textLevel
              envPhase={envPhase}
              busy={running}
              disabled={saving}
              idleLabel="跑一下"
              className="btn-primary mt-6 px-8"
              onRun={runReverse}
            />
          </div>
        </div>
      )}

      {challenge.type === 'add_color' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(280px,40%)_minmax(0,1fr)]">
          <div className="min-h-[280px]">
            <RunPreview result={result} />
          </div>
          <div className="card p-6">
            <p className="text-sm font-medium text-ink">先选颜色，再给整幅画涂上</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ['red', '红色'],
                ['blue', '蓝色'],
                ['green', '绿色'],
                ['orange', '橙色'],
                ['purple', '紫色'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setInk(value)
                    setResult(null)
                    setNote('')
                  }}
                  className={`rounded-field border px-4 py-2.5 transition ${
                    ink === value ? 'border-brand bg-brand-soft font-medium text-brand-strong' : 'border-line bg-white text-ink hover:border-brand'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <RunButton
              textLevel
              envPhase={envPhase}
              busy={running}
              disabled={saving}
              idleLabel="跑一下"
              className="btn-primary mt-6 px-8"
              onRun={runColor}
            />
          </div>
        </div>
      )}

      {challenge.type === 'typing' && (
        <div className="card p-6">
          <TypingTrainer
            targets={level.keywords}
            hint="一个词一个词地打"
            completeLabel="打完了"
            onComplete={() => {
              void finish()
            }}
          />
        </div>
      )}

      {note && <p className="rounded-field bg-brand-soft px-4 py-3 text-brand-strong">{note}</p>}

      <div>
        <button type="button" className="btn-ghost" onClick={onSkip}>
          先不巩固，回到结束页
        </button>
      </div>
    </div>
  )
}
