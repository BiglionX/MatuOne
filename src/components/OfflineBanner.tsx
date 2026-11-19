import { useEffect, useState } from 'react'

export function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)

  useEffect(() => {
    const sync = () => setOffline(navigator.onLine === false)
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  if (!offline) return null
  return (
    <div role="status" className="bg-warning-soft px-4 py-2.5 text-center text-sm font-semibold text-ink">
      网络已断开，请检查连接
    </div>
  )
}
