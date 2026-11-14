/** 课程 JSON 里的 drill_chunk。缺省返回 undefined。写了但不是一行短字符串也返回 undefined。 */
export function readDrillChunk(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  if (!text || text.length > 40 || /[\r\n]/.test(value)) return undefined
  return text
}

/** 字段写了但结构不对时，返回给导入校验的那一句。缺省不算错。 */
export function drillChunkError(value: unknown): string | null {
  if (value == null) return null
  if (!readDrillChunk(value)) return 'drill_chunk 需要是一行以内、不超过 40 个字符的字符串'
  return null
}
