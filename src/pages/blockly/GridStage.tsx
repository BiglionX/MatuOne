import type { ActorState } from '@/modules/curriculum/moduleLevelInterpreter'
import type { GridHeading, ModuleLevelMap } from '@/modules/curriculum/moduleLevelBody'

export interface GridStageProps {
  map: ModuleLevelMap
  actorState: ActorState
  animationDurationMs: number
}

const HEADING_DEGREES: Record<GridHeading, number> = {
  E: 0,
  S: 90,
  W: 180,
  N: 270,
}

/** 第 1 关的纯展示舞台；坐标换算和动画都在这里，不执行关卡逻辑。 */
export function GridStage({ map, actorState, animationDurationMs }: GridStageProps) {
  const obstacles = new Set(map.obstacles.map((item) => `${item.x},${item.y}`))
  const cells = Array.from({ length: map.width * map.height }, (_, index) => {
    const x = index % map.width
    const y = Math.floor(index / map.width)
    const key = `${x},${y}`
    const isGoal = x === map.goal.x && y === map.goal.y
    const isStart = x === map.start.x && y === map.start.y
    const isObstacle = obstacles.has(key)
    return (
      <div
        key={key}
        className={`flex items-center justify-center border border-emerald-900/10 text-sm font-semibold ${
          isGoal ? 'bg-emerald-100 text-emerald-700' : isObstacle ? 'bg-slate-200' : 'bg-white/80'
        }`}
        aria-label={isGoal ? '终点' : isObstacle ? '障碍物' : isStart ? '起点' : `格子 ${x + 1},${y + 1}`}
      >
        {isGoal ? '终点' : isObstacle ? '障碍' : isStart ? '起点' : ''}
      </div>
    )
  })

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl border border-emerald-900/10 bg-emerald-50 p-3"
      role="img"
      aria-label={`${map.width} 列 ${map.height} 行网格，角色位于第 ${actorState.x + 1} 列第 ${actorState.y + 1} 行`}
    >
      <div
        className="grid w-full overflow-hidden rounded-2xl"
        style={{
          gridTemplateColumns: `repeat(${map.width}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${map.height}, minmax(0, 1fr))`,
          aspectRatio: `${map.width} / ${map.height}`,
        }}
      >
        {cells}
      </div>
      <div
        className="pointer-events-none absolute left-3 top-3 flex items-center justify-center p-1.5 transition-transform duration-300 ease-in-out motion-reduce:transition-none"
        data-testid="grid-actor"
        style={{
          width: `calc((100% - 1.5rem) / ${map.width})`,
          height: `calc((100% - 1.5rem) / ${map.height})`,
          transform: `translate(${actorState.x * 100}%, ${actorState.y * 100}%)`,
          transitionDuration: `${animationDurationMs}ms`,
        }}
      >
        <div
          className="h-full w-full transition-transform duration-300 ease-in-out motion-reduce:transition-none"
          style={{ transform: `rotate(${HEADING_DEGREES[actorState.heading]}deg)` }}
        >
          <svg viewBox="0 0 48 48" className="h-full w-full drop-shadow-sm" aria-hidden="true">
            <path d="M35 19h-8l-3-5H17l-2 5H7v14h8l3 5h11l3-5h3V19Z" fill="#10B981" />
            <rect x="12" y="18" width="24" height="17" rx="5" fill="#D1FAE5" />
            <circle cx="18" cy="25" r="2.5" fill="#065F46" />
            <circle cx="30" cy="25" r="2.5" fill="#065F46" />
            <path d="M20 31h8" stroke="#065F46" strokeWidth="2" strokeLinecap="round" />
            <path d="M38 24h6m-3-3 3 3-3 3" fill="none" stroke="#065F46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}
