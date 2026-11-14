import { useEffect, useState } from 'react'
import { pythonEnvPhase, subscribePythonEnv, warmupPython, type PythonPhase } from './runner'

/**
 * 课程页停在 A 回合时就把 Worker 拉起来。
 * 订阅一直挂着，进了 B 回合也能看见环境是不是还在下。
 */
export function usePythonEnv(active: boolean): PythonPhase {
  const [phase, setPhase] = useState<PythonPhase>(() => pythonEnvPhase())
  useEffect(() => subscribePythonEnv(setPhase), [])
  useEffect(() => {
    if (!active) return
    void warmupPython().catch(() => undefined)
  }, [active])
  return phase
}
