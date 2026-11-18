import { describe, expect, it } from 'vitest'
import type { Plant } from '../../db'
import { ago, byDue, daysUntil, dueLabel, isDue } from './logic'

const now = new Date(2026, 10, 18, 9, 0) // Nov 18, 9am local
const at = (daysAgo: number, hour = 20) => new Date(2026, 10, 18 - daysAgo, hour).toISOString()
const plant = (p: Partial<Plant>): Plant => ({
  id: 'p', name: 'Fern', room: '', photo_url: '', interval_days: 7, amount: '', notes: '',
  last_watered: null, last_watered_by: '', snooze_until: null, updated_at: '', ...p,
})

describe('plant schedule', () => {
  it('is due now when never watered', () => {
    expect(isDue(plant({}), now)).toBe(true)
  })
  it('counts calendar days, not 24h blocks', () => {
    // watered 6 days ago at 8pm, every 7 days → due tomorrow, even though < 24h of the 7th day has passed
    expect(daysUntil(plant({ last_watered: at(6) }), now)).toBe(1)
    expect(dueLabel(plant({ last_watered: at(7) }), now)).toEqual({ text: 'Water today', tone: 'due' })
    expect(dueLabel(plant({ last_watered: at(9) }), now)).toEqual({ text: '2 days overdue', tone: 'overdue' })
    expect(dueLabel(plant({ last_watered: at(1) }), now).text).toBe('In 6 days')
  })
  it('a snooze overrides the schedule', () => {
    const p = plant({ last_watered: at(10), snooze_until: new Date(2026, 10, 20, 9).toISOString() })
    expect(daysUntil(p, now)).toBe(2)
    expect(isDue(p, now)).toBe(false)
  })
  it('sorts most urgent first', () => {
    const a = plant({ name: 'A', last_watered: at(1) })
    const b = plant({ name: 'B', last_watered: at(9) })
    expect([a, b].sort(byDue(now)).map((p) => p.name)).toEqual(['B', 'A'])
  })
  it('formats how long ago', () => {
    expect(ago(at(0), now)).toBe('today')
    expect(ago(at(1), now)).toBe('yesterday')
    expect(ago(at(3), now)).toBe('3 days ago')
  })
})
