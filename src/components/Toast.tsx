import { useCallback, useRef, useState } from 'react'

interface ToastState {
  text: string
  undo?: () => void
}

/** One toast at a time, auto-dismissed after 4s, with an optional Undo action. */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((text: string, undo?: () => void) => {
    window.clearTimeout(timer.current)
    setToast({ text, undo })
    timer.current = window.setTimeout(() => setToast(null), 4000)
  }, [])

  const node = toast && (
    <div className="toast" role="status">
      <span>{toast.text}</span>
      {toast.undo && (
        <button
          onClick={() => {
            toast.undo?.()
            setToast(null)
          }}
        >
          Undo
        </button>
      )}
    </div>
  )

  return { show, node }
}
