export interface Notice {
  id: number
  text: string
}

const listeners = new Set<(items: Notice[]) => void>()
let items: Notice[] = []
let seq = 0
let lastText = ''
let lastAt = 0

function publish() {
  const snapshot = items
  listeners.forEach((listener) => listener(snapshot))
}

export function pushNotice(text: string) {
  const now = Date.now()
  if (text === lastText && now - lastAt < 4000) return
  lastText = text
  lastAt = now
  const id = ++seq
  items = [...items, { id, text }].slice(-3)
  publish()
  window.setTimeout(() => {
    items = items.filter((item) => item.id !== id)
    publish()
  }, 4200)
}

export function subscribeNotices(listener: (items: Notice[]) => void): () => void {
  listeners.add(listener)
  listener(items)
  return () => listeners.delete(listener)
}
