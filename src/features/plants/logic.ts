import type { Plant } from '../../db'

const DAY = 86_400_000
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** When the plant next needs water. A snooze ("still wet") overrides the schedule; never watered = due now. */
export function dueAt(p: Plant, now = new Date()): Date {
  if (p.snooze_until) return new Date(p.snooze_until)
  if (!p.last_watered) return now
  return new Date(new Date(p.last_watered).getTime() + p.interval_days * DAY)
}

/** Calendar days until due (negative = overdue). Uses local midnight so "today" matches the phone's clock. */
export function daysUntil(p: Plant, now = new Date()): number {
  return Math.round((startOfDay(dueAt(p, now)) - startOfDay(now)) / DAY)
}

export const isDue = (p: Plant, now = new Date()) => daysUntil(p, now) <= 0

export function dueLabel(p: Plant, now = new Date()): { text: string; tone: 'overdue' | 'due' | 'ok' } {
  const d = daysUntil(p, now)
  if (d < 0) return { text: `${-d} day${d === -1 ? '' : 's'} overdue`, tone: 'overdue' }
  if (d === 0) return { text: 'Water today', tone: 'due' }
  if (d === 1) return { text: 'Tomorrow', tone: 'ok' }
  return { text: `In ${d} days`, tone: 'ok' }
}

/** "today" / "yesterday" / "3 days ago" / "Mar 4" */
export function ago(iso: string, now = new Date()): string {
  const d = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / DAY)
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 14) return `${d} days ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const byDue = (now = new Date()) => (a: Plant, b: Plant) => daysUntil(a, now) - daysUntil(b, now) || a.name.localeCompare(b.name)

export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
