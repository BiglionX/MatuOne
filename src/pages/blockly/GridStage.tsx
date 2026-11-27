import { useEffect, useMemo, useRef, useState } from 'react'
import type { ActorState } from '@/modules/curriculum/moduleLevelInterpreter'
import type { GridHeading, ModuleGridScene, ModuleLevelEntity } from '@/modules/curriculum/moduleLevelBody'
import './blocklyGame.css'

export interface GridStageProps {
  scene: ModuleGridScene
  actorState: ActorState
  animationDurationMs: number
  /** 画出机器人走过的格子。 */
  showTrail?: boolean
  /**
   * 要不要画收集物（金币、星星）。
   *
   * 收集物只有在这一关真的要教「吃金币」时才该出现，
   * 否则对一年级学生就是纯干扰——他会一路想着去捡，而不是去拼积木。
   * 页面会根据这一关的提示文案决定要不要传 false。
   */
  showCollectibles?: boolean
}

const HEADING_DEGREES: Record<GridHeading, number> = {
  E: 0,
  S: 90,
  W: 180,
  N: 270,
}

/**
 * 可以被吃掉的收集物；不在表里的一律当场景装饰。
 *
 * 这里刻意不用 emoji 画：🪙 属于 Emoji 12.0（2019 年），
 * Windows 上的 Segoe UI Emoji 版本偏旧时会渲染成豆腐块，
 * 而收集物是这套玩法里最重要的视觉反馈，不能赌系统字体。
 */
const COLLECTIBLE_SHAPE: Record<string, 'coin' | 'star' | 'gem' | 'heart'> = {
  coin: 'coin',
  star: 'star',
  gem: 'gem',
  heart: 'heart',
}

/** 角色的表情；scene.actor.asset 认不出来就用默认的小机器人。 */
const ACTOR_EMOJI: Record<string, string> = {
  grid_robot: '🤖',
}

const CONFETTI_COLORS = ['#F59E0B', '#10B981', '#38BDF8', '#F472B6', '#A78BFA', '#FACC15']

/** 撒花的碎片；位置和节奏写死，重画一次也是同一个样子。 */
const CONFETTI = Array.from({ length: 28 }, (_, index) => ({
  left: (index * 37) % 100,
  delay: ((index * 53) % 90) / 100,
  duration: 1.4 + ((index * 29) % 70) / 100,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  width: 6 + (index % 3) * 2,
  height: 8 + (index % 4) * 2,
}))

/** 网格舞台；坐标换算和动画都在这里，不执行关卡逻辑。 */
export function GridStage({ scene, actorState, animationDurationMs, showTrail = false, showCollectibles = true }: GridStageProps) {
  const obstacleKeys = useMemo(() => new Set(scene.obstacles.map((item) => `${item.x},${item.y}`)), [scene.obstacles])
  const collected = useMemo(() => new Set(actorState.collectedEntityIds), [actorState.collectedEntityIds])
  const trailKeys = useMemo(() => new Set(actorState.trail.map((item) => `${item.x},${item.y}`)), [actorState.trail])

  const entitiesByCell = useMemo(() => {
    const map = new Map<string, ModuleLevelEntity[]>()
    // 这一关不教收集的时候，收集物一个字都不画。
    if (!showCollectibles) return map
    for (const entity of scene.entities) {
      if (!COLLECTIBLE_SHAPE[entity.type]) continue
      const key = `${entity.x},${entity.y}`
      const list = map.get(key)
      if (list) list.push(entity)
      else map.set(key, [entity])
    }
    return map
  }, [scene.entities, showCollectibles])

  // 走到新格子时让角色弹一下；位置没变就不动。
  const [hopKey, setHopKey] = useState(0)
  const positionRef = useRef({ x: actorState.x, y: actorState.y })
  useEffect(() => {
    if (positionRef.current.x === actorState.x && positionRef.current.y === actorState.y) return
    positionRef.current = { x: actorState.x, y: actorState.y }
    setHopKey((key) => key + 1)
  }, [actorState.x, actorState.y])

  // 刚吃掉的收集物留一小会儿，放大淡出当「吃掉」的动效。
  const [popped, setPopped] = useState<string[]>([])
  const collectedRef = useRef<string[]>([])
  const collectedKey = actorState.collectedEntityIds.join(',')
  useEffect(() => {
    const previous = new Set(collectedRef.current)
    const added = actorState.collectedEntityIds.filter((id) => !previous.has(id))
    collectedRef.current = actorState.collectedEntityIds
    if (!added.length) return
    setPopped((current) => [...current, ...added])
    const timer = window.setTimeout(() => {
      setPopped((current) => current.filter((id) => !added.includes(id)))
    }, 520)
    return () => window.clearTimeout(timer)
  }, [collectedKey])

  const cells = Array.from({ length: scene.width * scene.height }, (_, index) => {
    const x = index % scene.width
    const y = Math.floor(index / scene.width)
    const key = `${x},${y}`
    const isGoal = x === scene.goal.x && y === scene.goal.y
    const isStart = x === scene.start.x && y === scene.start.y
    const isObstacle = obstacleKeys.has(key)
    const showTrailDot = showTrail && trailKeys.has(key) && !isStart
    return (
      <div
        key={key}
        className={`relative flex items-center justify-center border border-emerald-900/10 text-sm font-semibold ${
          isGoal ? 'bg-emerald-100 text-emerald-700' : isObstacle ? 'bg-indigo-100 text-indigo-400' : 'bg-white/80'
        }`}
        aria-label={isGoal ? '终点' : isObstacle ? '障碍物' : isStart ? '起点' : `格子 ${x + 1},${y + 1}`}
      >
        {showTrailDot ? <span className="matu-trail-dot" aria-hidden="true" /> : null}
        {isGoal ? '终点' : isObstacle ? '障碍' : isStart ? '起点' : ''}
        {(entitiesByCell.get(key) ?? []).map((entity) => {
          const isCollected = collected.has(entity.id)
          const isPopping = popped.includes(entity.id)
          // 吃掉的收集物先消失；刚好被吃掉的那一个留一下放大淡出的动效。
          if (isCollected && !isPopping) return null
          const shape = COLLECTIBLE_SHAPE[entity.type]
          return (
            <span
              key={entity.id}
              className={
                isPopping
                  ? `matu-collectible matu-collectible-pop matu-collectible-${shape}`
                  : `matu-collectible matu-collectible-${shape}`
              }
              aria-hidden="true"
            />
          )
        })}
      </div>
    )
  })

  const actorEmoji = ACTOR_EMOJI[scene.actor.asset] ?? '🤖'

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl border border-emerald-900/10 bg-emerald-50 p-3"
      role="img"
      aria-label={`${scene.width} 列 ${scene.height} 行网格，角色位于第 ${actorState.x + 1} 列第 ${actorState.y + 1} 行`}
    >
      <div
        className="grid w-full overflow-hidden rounded-2xl"
        style={{
          gridTemplateColumns: `repeat(${scene.width}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${scene.height}, minmax(0, 1fr))`,
          aspectRatio: `${scene.width} / ${scene.height}`,
        }}
      >
        {cells}
      </div>

      {actorState.completed ? (
        <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
          <div className="matu-win-flash absolute inset-0 bg-amber-200/70" />
          {CONFETTI.map((piece, index) => (
            <span
              key={index}
              className="matu-confetti"
              style={{
                left: `${piece.left}%`,
                width: piece.width,
                height: piece.height,
                backgroundColor: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div
        className="pointer-events-none absolute left-3 top-3 flex items-center justify-center p-1.5 transition-transform duration-300 ease-in-out motion-reduce:transition-none"
        data-testid="grid-actor"
        style={{
          width: `calc((100% - 1.5rem) / ${scene.width})`,
          height: `calc((100% - 1.5rem) / ${scene.height})`,
          transform: `translate(${actorState.x * 100}%, ${actorState.y * 100}%)`,
          transitionDuration: `${animationDurationMs}ms`,
        }}
      >
        <div key={hopKey} className="matu-actor-hop h-full w-full">
          <div className="matu-actor-body">
            <span className="matu-actor-sprite" aria-hidden="true">
              {actorEmoji}
            </span>
            <span
              className="matu-actor-arrow"
              style={{ transform: `rotate(${HEADING_DEGREES[actorState.heading]}deg)` }}
              aria-hidden="true"
            >
              ▶
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
