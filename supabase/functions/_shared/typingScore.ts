/** 入库前把打字成绩收成可保存的数。0、非数字、超范围一律拒绝。 */
export function normalizeTypingScore(wpm: unknown, accuracy: unknown): { wpm: number; accuracy: number } | null {
  if (typeof wpm !== 'number' || typeof accuracy !== 'number') return null
  if (!Number.isFinite(wpm) || !Number.isFinite(accuracy)) return null
  const wpmRounded = Math.round(wpm * 10) / 10
  const accuracyRounded = Math.round(accuracy)
  if (wpmRounded <= 0 || accuracyRounded <= 0 || accuracyRounded > 100) return null
  return { wpm: wpmRounded, accuracy: accuracyRounded }
}
