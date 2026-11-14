import { useRef, useState } from 'react'
import { pythonEnvPhase, type PythonPhase } from '@/lib/runner'

/**
 * 点运行时如果 Pyodide 还在下载，按钮停在「引擎准备中...」。
 * onRun 里的 runCode 会等环境好了再自动执行，不用再点一次。
 */
export function RunButton({
  textLevel,
  envPhase,
  busy,
  disabled = false,
  idleLabel,
  busyLabel = '运行中…',
  className = 'btn-primary px-8',
  onRun,
}: {
  textLevel: boolean
  envPhase: PythonPhase
  busy: boolean
  disabled?: boolean
  idleLabel: string
  busyLabel?: string
  className?: string
  onRun: () => Promise<void> | void
}) {
  const [hold, setHold] = useState(false)
  const clicked = useRef(false)
  const preparing = textLevel && hold && (envPhase === 'idle' || envPhase === 'loading')

  return (
    <button
      type="button"
      className={`${className} relative overflow-hidden`}
      disabled={disabled || busy || preparing}
      aria-busy={preparing || busy}
      onClick={() => {
        if (disabled || busy || preparing || clicked.current) return
        clicked.current = true
        if (textLevel && pythonEnvPhase() !== 'ready') setHold(true)
        void Promise.resolve(onRun()).finally(() => {
          clicked.current = false
          setHold(false)
        })
      }}
    >
      {preparing ? (
        <>
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden="true"
          />
          引擎准备中...
          <span className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-white/25" aria-hidden="true">
            <span className="engine-bar block h-full w-1/3 bg-white" />
          </span>
        </>
      ) : busy ? (
        busyLabel
      ) : (
        idleLabel
      )}
    </button>
  )
}
