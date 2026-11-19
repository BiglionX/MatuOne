import type { PixelGrid } from './PixelCanvas'

export function floodFill(grid: PixelGrid, x: number, y: number, replacement: string): PixelGrid | null {
  if (y < 0 || y >= grid.length) return null
  const startRow = grid[y]
  if (!startRow || x < 0 || x >= startRow.length) return null
  const target = startRow[x] ?? null
  if (target === replacement) return null

  const next = grid.map((row) => row.slice())
  const stack: Array<[number, number]> = [[x, y]]
  let changed = false

  while (stack.length > 0) {
    const cell = stack.pop()
    if (!cell) continue
    const [cx, cy] = cell
    if (cy < 0 || cy >= next.length) continue
    const row = next[cy]
    if (!row || cx < 0 || cx >= row.length) continue
    if ((row[cx] ?? null) !== target) continue
    row[cx] = replacement
    changed = true
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
  }

  if (!changed) return null
  return next
}
