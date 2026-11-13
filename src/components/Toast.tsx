import { useCallback, useEffect, useRef, useState } from 'react'

/** 轻 toast：只做提示，不打断、不弹窗 */
export function useToast(duration = 2200) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const show = useCallback(
    (text: string) => {
      setMessage(text)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setMessage(null), duration)
    },
    [duration],
  )

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  const toast = message ? (
    <div className="pointer-events-none fixed bottom-10 left-1/2 z-50 -translate-x-1/2">
      <div className="toast-in rounded-full bg-ink/90 px-5 py-3 text-white shadow-pop">{message}</div>
    </div>
  ) : null

  return { show, toast }
}
