import { useEffect, useState } from 'react'
import { subscribeNotices, type Notice } from '@/lib/notices'

export function NoticeToast() {
  const [items, setItems] = useState<Notice[]>([])

  useEffect(() => subscribeNotices(setItems), [])

  if (items.length === 0) return null
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[80] flex w-[min(92vw,24rem)] -translate-x-1/2 flex-col gap-2">
      {items.map((item) => (
        <p key={item.id} role="status" className="toast-in pointer-events-auto rounded-xl bg-ink px-4 py-3 text-center text-sm text-white shadow-card">
          {item.text}
        </p>
      ))}
    </div>
  )
}
