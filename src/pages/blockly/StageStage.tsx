import type { ModuleStageScene } from '@/modules/curriculum/moduleLevelBody'
import { STAGE_BASE_SPRITE_SIZE, type StageSnapshot } from '@/modules/curriculum/moduleStageInterpreter'
import './blocklyGame.css'

export interface StageStageProps {
  scene: ModuleStageScene
  snapshot: StageSnapshot
  isRunning: boolean
}

const BACKDROPS: Record<string, string> = {
  sky: 'linear-gradient(180deg, #bfdbfe 0%, #e0f2fe 58%, #dcfce7 100%)',
  city: 'linear-gradient(180deg, #c7d2fe 0%, #e0e7ff 55%, #fde68a 100%)',
  night: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
  grass: 'linear-gradient(180deg, #bae6fd 0%, #e0f2fe 45%, #86efac 46%, #22c55e 100%)',
}

const SPRITE_GLYPHS: Record<string, string> = {
  player: '🐱',
  hero: '🦸',
  apple: '🍎',
  ball: '⚽',
  star: '★',
  bomb: '◆',
  // 二年级新增的舞台角色；克隆体用同一套字形，克隆出来的子弹也认得出来。
  ship: '🚀',
  bullet: '✦',
  enemy: '👾',
  mole: '🐹',
  coin: '🪙',
  gem: '💎',
  rock: '🪨',
  ghost: '👻',
  pacman: '🟡',
  goal: '🚩',
  bee: '🐝',
}

function glyphOf(asset: string): string {
  return SPRITE_GLYPHS[asset] ?? (asset.length <= 2 ? asset : '■')
}

function displayValue(value: string | number | boolean): string {
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return value ? '真' : '假'
  return String(value)
}

function variableBadgeLabel(variable: ModuleStageScene['variables'][number]): string {
  if (variable.id === 'score' || variable.name === 'score') return '⭐ 得分'
  if (variable.id === 'apple_count' || variable.name === 'apple_count') return '🍎 苹果'
  if (variable.id === 'lives' || variable.name === 'lives') return '❤️ 生命'
  if (variable.id === 'hits' || variable.name === 'hits') return '💥 碰撞'
  return `🏷️ ${variable.name}`
}

/** 自由舞台纯展示组件；坐标和碰撞语义由 Stage 解释器决定。 */
export function StageStage({ scene, snapshot, isRunning }: StageStageProps) {
  const { width, height } = scene.stage_size
  const backdrop = BACKDROPS[scene.backdrop] ?? BACKDROPS.sky

  return (
    <div
      className="matu-stage relative isolate overflow-hidden rounded-xl border border-emerald-900/10 shadow-card"
      style={{ aspectRatio: `${width} / ${height}`, background: backdrop }}
      data-stage-status={snapshot.status}
      aria-label="自由舞台"
    >
      <div className="matu-stage-variables" aria-label="舞台计分板">
        {snapshot.program.variables.map((variable) => {
          const isScore = variable.id === 'score' || variable.name === 'score'
          return (
            <span
              key={variable.id}
              className={`matu-stage-variable-badge ${isScore ? 'matu-stage-score' : ''}`}
            >
              {variableBadgeLabel(variable)}：{displayValue(snapshot.variables[variable.id])}
            </span>
          )
        })}
      </div>

      {snapshot.sprites.map((sprite) => {
        if (!sprite.visible) return null
        const logicalSize = STAGE_BASE_SPRITE_SIZE * (sprite.size / 100)
        return (
          <div
            key={sprite.id}
            className="matu-stage-sprite"
            style={{
              left: `${(sprite.x / width) * 100}%`,
              top: `${(sprite.y / height) * 100}%`,
              width: `${(logicalSize / width) * 100}%`,
              height: `${(logicalSize / height) * 100}%`,
            }}
            title={sprite.id}
            aria-label={`${sprite.id} 精灵`}
          >
            <span aria-hidden="true">{glyphOf(sprite.asset)}</span>
          </div>
        )
      })}

      <span className="matu-stage-status">
        {snapshot.status === 'running' ? (isRunning ? '运行中' : '准备好了') : snapshot.status === 'completed' ? '已完成' : snapshot.status === 'error' ? '运行出错' : '已停止'}
      </span>
    </div>
  )
}
