/** localStorage 数据层（原型用，后续替换 BaaS） */

const NS = 'cdg.v1.'

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value))
  } catch {
    // 存储写满时静默失败，原型阶段不影响主流程
  }
}

export function resetKey(key: string): void {
  localStorage.removeItem(NS + key)
}
