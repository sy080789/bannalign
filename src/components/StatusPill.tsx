import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../db'
import { supabase } from '../sync'

/** Small "offline · 3 pending" pill. Hidden when everything is synced. */
export function StatusPill() {
  const [online, setOnline] = useState(navigator.onLine)
  const pending = useLiveQuery(() => db.outbox.count(), [], 0)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (!supabase) return null // local-only mode: nothing to sync
  if (online && !pending) return null
  const text = !online ? `Offline${pending ? ` · ${pending} pending` : ''}` : `Syncing ${pending}…`
  return (
    <div className="pill" role="status">
      {text}
    </div>
  )
}
