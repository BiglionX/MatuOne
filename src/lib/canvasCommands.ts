import type { CanvasCommand, Stroke } from '@/types'

export function commandsFromStrokes(strokes: Stroke[]): CanvasCommand[] {
  const commands: CanvasCommand[] = []
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.points.length; i++) {
      const [x1, y1] = stroke.points[i - 1]
      const [x2, y2] = stroke.points[i]
      commands.push({ action: 'line', x1, y1, x2, y2, color: stroke.color, pensize: 1 })
    }
  }
  return commands
}

export function asCanvasCommands(value: unknown): CanvasCommand[] {
  if (!Array.isArray(value)) return []
  const commands: CanvasCommand[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (row.action !== 'line') continue
    const x1 = Number(row.x1)
    const y1 = Number(row.y1)
    const x2 = Number(row.x2)
    const y2 = Number(row.y2)
    const pensize = Number(row.pensize)
    if (![x1, y1, x2, y2].every((n) => Number.isFinite(n))) continue
    commands.push({
      action: 'line',
      x1,
      y1,
      x2,
      y2,
      color: typeof row.color === 'string' && row.color.trim() ? row.color : 'black',
      pensize: Number.isFinite(pensize) && pensize > 0 ? pensize : 1,
    })
  }
  return commands
}

const MARK = '__CANVAS_DATA__:'

/** 把学生的 print 和海龟交回的线段拆开。 */
export function splitCanvasStdout(stdout: string): { text: string; commands: CanvasCommand[] } {
  const kept: string[] = []
  const commands: CanvasCommand[] = []
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith(MARK)) {
      kept.push(line)
      continue
    }
    try {
      commands.push(...asCanvasCommands(JSON.parse(trimmed.slice(MARK.length).trim())))
    } catch {
      kept.push(line)
    }
  }
  return { text: kept.join('\n').replace(/\n+$/, ''), commands }
}
