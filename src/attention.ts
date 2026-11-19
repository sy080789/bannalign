import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db, type Issue, type Plant, type Task } from './db'
import { isDue } from './features/plants/logic'
import { daysUntil } from './features/house/logic'

/**
 * Which tabs get a dot. Plants: anything due today or overdue. House: only things that slipped
 * (overdue upkeep, a missed check-in), so it stays quiet for merely upcoming work.
 */
export function attention(plants: Plant[], tasks: Task[], issues: Issue[], now = new Date()): Record<string, boolean> {
  return {
    '/plants': plants.some((p) => !p.deleted && isDue(p, now)),
    '/house':
      tasks.some((t) => !t.deleted && daysUntil(t.next_due, now) < 0) ||
      issues.some((i) => !i.deleted && i.status === 'watch' && !!i.next_check && daysUntil(i.next_check, now) < 0),
  }
}

/** Live tab dots. Re-checks when the app returns to the foreground, so a new day shows up. */
export function useAttention(): Record<string, boolean> {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const onShow = () => document.visibilityState === 'visible' && setTick((n) => n + 1)
    document.addEventListener('visibilitychange', onShow)
    return () => document.removeEventListener('visibilitychange', onShow)
  }, [])
  return useLiveQuery(async () => attention(await db.plants.toArray(), await db.tasks.toArray(), await db.issues.toArray()), [tick], {})
}
