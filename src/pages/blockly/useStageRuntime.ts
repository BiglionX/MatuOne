import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createStageWorld,
  stopStageWorld,
  tick,
  type StageProgram,
  type StageWorld,
} from '@/modules/curriculum/moduleStageInterpreter'

const FRAME_INTERVAL_MS = 1000 / 30
const MAX_FRAME_DELTA_MS = 100
const MAX_TICKS_PER_ANIMATION_FRAME = 3

export interface StageRuntime {
  snapshot: StageWorld | null
  isRunning: boolean
  error: string | null
  start: (program: StageProgram) => void
  stop: () => void
  reset: (program?: StageProgram) => void
}

/** 只负责时间驱动和 React 快照发布；Stage 逻辑全部在纯解释器里。 */
export function useStageRuntime(): StageRuntime {
  const [snapshot, setSnapshot] = useState<StageWorld | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const worldRef = useRef<StageWorld | null>(null)
  const programRef = useRef<StageProgram | null>(null)
  const rafRef = useRef<number | null>(null)
  const tokenRef = useRef(0)
  const mountedRef = useRef(false)

  const cancelAnimationFrame = useCallback(() => {
    tokenRef.current += 1
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const publish = useCallback((world: StageWorld | null) => {
    worldRef.current = world
    if (mountedRef.current) setSnapshot(world)
  }, [])

  const start = useCallback((program: StageProgram) => {
    cancelAnimationFrame()
    programRef.current = program
    const world = createStageWorld(program)
    publish(world)
    setError(null)
    setIsRunning(world.status === 'running')
    if (world.status !== 'running') return

    const token = tokenRef.current
    let previousTime: number | null = null
    let accumulator = 0

    const frame = (now: number) => {
      if (!mountedRef.current || tokenRef.current !== token) return
      const current = worldRef.current
      if (!current || current.status !== 'running') {
        rafRef.current = null
        setIsRunning(false)
        return
      }

      const delta = previousTime === null ? FRAME_INTERVAL_MS : Math.min(now - previousTime, MAX_FRAME_DELTA_MS)
      previousTime = now
      accumulator += delta
      let next = current
      let tickCount = 0

      try {
        while (
          accumulator >= FRAME_INTERVAL_MS &&
          tickCount < MAX_TICKS_PER_ANIMATION_FRAME &&
          next.status === 'running'
        ) {
          next = tick(next)
          accumulator -= FRAME_INTERVAL_MS
          tickCount += 1
        }
      } catch (reason: unknown) {
        rafRef.current = null
        setError(reason instanceof Error ? reason.message : '舞台程序运行失败')
        setIsRunning(false)
        return
      }

      // 后台标签页恢复后丢弃积压时间，不让角色瞬间跳过大量 Tick。
      if (accumulator >= FRAME_INTERVAL_MS) accumulator = 0
      if (tickCount > 0) publish(next)
      if (next.status === 'running') {
        rafRef.current = window.requestAnimationFrame(frame)
      } else {
        rafRef.current = null
        setIsRunning(false)
      }
    }

    rafRef.current = window.requestAnimationFrame(frame)
  }, [cancelAnimationFrame, publish])

  const stop = useCallback(() => {
    cancelAnimationFrame()
    const current = worldRef.current
    if (!current) {
      setIsRunning(false)
      return
    }
    const stopped = stopStageWorld(current)
    publish(stopped)
    setIsRunning(false)
  }, [cancelAnimationFrame, publish])

  const reset = useCallback((program?: StageProgram) => {
    cancelAnimationFrame()
    if (program) programRef.current = program
    const currentProgram = programRef.current
    if (!currentProgram) {
      publish(null)
      setIsRunning(false)
      return
    }
    const world = createStageWorld(currentProgram)
    publish(world)
    setError(null)
    setIsRunning(false)
  }, [cancelAnimationFrame, publish])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cancelAnimationFrame()
    }
  }, [cancelAnimationFrame])

  return { snapshot, isRunning, error, start, stop, reset }
}
