import type { Project, Task } from '../../db'

const DAY = 86_400_000
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Calendar days from now until `iso` (negative = overdue). */
export function daysUntil(iso: string, now = new Date()): number {
  return Math.round((startOfDay(new Date(iso)) - startOfDay(now)) / DAY)
}

/**
 * Next due date after doing a task on `from`. With a preferred month, it snaps to the 1st of the
 * nearest allowed month (e.g. every 6 months starting Apr → Apr/Oct), so doing the fall gutters late
 * in December still brings them back next fall, not next December.
 */
export function nextDue(from: Date, intervalMonths: number, month = 0): Date {
  const target = new Date(from.getFullYear(), from.getMonth() + intervalMonths, from.getDate())
  if (!month) return target
  const allowed = allowedMonths(intervalMonths, month)
  let best: Date | null = null
  // Candidates: the 1st of each month from next month up to interval + 6 months out.
  for (let k = 1; k <= intervalMonths + 6; k++) {
    const c = new Date(from.getFullYear(), from.getMonth() + k, 1)
    if (!allowed.has(c.getMonth())) continue
    if (!best || Math.abs(c.getTime() - target.getTime()) < Math.abs(best.getTime() - target.getTime())) best = c
  }
  return best ?? target
}

/** Month indexes (0–11) a task with a preferred month can fall in, e.g. every 6 from May → {4, 10}. */
export function allowedMonths(intervalMonths: number, month: number): Set<number> {
  const allowed = new Set<number>()
  for (let m = month - 1; ; m += intervalMonths) {
    const k = ((m % 12) + 12) % 12
    if (allowed.has(k)) return allowed
    allowed.add(k)
  }
}

export function dueLabel(iso: string, now = new Date()): { text: string; tone: 'overdue' | 'due' | 'ok' } {
  const d = daysUntil(iso, now)
  if (d < 0) {
    const w = Math.floor(-d / 7)
    return { text: w >= 2 ? `${w} weeks overdue` : `${-d} day${d === -1 ? '' : 's'} overdue`, tone: 'overdue' }
  }
  if (d === 0) return { text: 'Due today', tone: 'due' }
  if (d <= 31) return { text: d === 1 ? 'Tomorrow' : `In ${d} days`, tone: d <= 7 ? 'due' : 'ok' }
  if (d <= 56) return { text: `In ${Math.round(d / 7)} weeks`, tone: 'ok' }
  const m = Math.round(d / 30.4)
  return { text: m >= 12 && m % 12 === 0 ? `In ${m / 12} year${m === 12 ? '' : 's'}` : `In ${m} months`, tone: 'ok' }
}

export function everyLabel(t: Pick<Task, 'interval_months' | 'month'>): string {
  const n = t.interval_months
  const base = n === 1 ? 'Monthly' : n === 12 ? 'Yearly' : n % 12 === 0 ? `Every ${n / 12} years` : `Every ${n} months`
  return t.month ? `${base} · ${n === 6 ? `${MONTHS[t.month - 1]} & ${MONTHS[(t.month + 5) % 12]}` : MONTHS[t.month - 1]}` : base
}

/**
 * First due dates for starter tasks (last-done unknown). Seasonal tasks out of season wait for the
 * 1st of their next month (no AC service in January). The rest, and all safety checks, are spread
 * over the next 8 weeks, safety first, so Today isn't flooded on day one.
 */
export function stagger<T extends { category: string; interval_months: number; month: number }>(tasks: T[], now = new Date(), weeks = 8): Map<T, Date> {
  const out = new Map<T, Date>()
  const spread: T[] = []
  for (const t of tasks) {
    const allowed = t.month && t.category !== 'Safety' ? allowedMonths(t.interval_months, t.month) : null
    // In season = this month or just past it (drain the outdoor taps in November if October was missed).
    if (!allowed || allowed.has(now.getMonth()) || allowed.has((now.getMonth() + 11) % 12)) {
      spread.push(t)
      continue
    }
    for (let k = 1; k <= 12; k++) {
      const c = new Date(now.getFullYear(), now.getMonth() + k, 1)
      if (allowed.has(c.getMonth())) {
        out.set(t, c)
        break
      }
    }
  }
  const order = [...spread].sort((a, b) => Number(b.category === 'Safety') - Number(a.category === 'Safety') || a.interval_months - b.interval_months)
  const span = weeks * 7
  order.forEach((t, i) => out.set(t, new Date(now.getFullYear(), now.getMonth(), now.getDate() + Math.round(((i + 1) * span) / order.length))))
  return out
}

/** "$12k", "$2,500", "$12–18k" */
export function money(n: number): string {
  return n >= 10_000 ? `$${Math.round(n / 1000)}k` : n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 ? 1 : 0)}k` : `$${n}`
}

export function costLabel(p: Pick<Project, 'cost_low' | 'cost_high'>): string {
  const { cost_low: lo, cost_high: hi } = p
  if (lo == null && hi == null) return '—'
  if (lo != null && hi != null && hi !== lo) {
    const a = money(lo)
    const b = money(hi)
    return a.endsWith('k') && b.endsWith('k') ? `${a.slice(0, -1)}–${b.slice(1)}` : `${a}–${b}`
  }
  return money((lo ?? hi)!)
}

export function costTotal(projects: Project[]): string {
  let lo = 0
  let hi = 0
  for (const p of projects) {
    if (p.cost_low == null && p.cost_high == null) continue
    lo += p.cost_low ?? p.cost_high!
    hi += p.cost_high ?? p.cost_low!
  }
  if (!hi) return ''
  return costLabel({ cost_low: lo, cost_high: hi })
}

/** Rank for an item placed between two neighbours (either may be missing). */
export function rankBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return 1
  if (before === undefined) return after! - 1
  if (after === undefined) return before + 1
  return (before + after) / 2
}
