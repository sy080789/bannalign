import { describe, expect, it } from 'vitest'
import type { Project } from '../../db'
import { costLabel, costTotal, dueLabel, everyLabel, nextDue, rankBetween, stagger } from './logic'
import { STARTER } from './starter'

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)
const ymd = (x: Date) => `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`

describe('nextDue', () => {
  it('adds months when there is no preferred month', () => {
    expect(ymd(nextDue(d(2026, 11, 18), 3))).toBe('2027-2-18')
  })
  it('snaps a yearly task back to its month even if done late', () => {
    expect(ymd(nextDue(d(2026, 12, 20), 12, 10))).toBe('2027-10-1') // outdoor taps done late
    expect(ymd(nextDue(d(2026, 9, 5), 12, 9))).toBe('2027-9-1')
  })
  it('alternates spring and fall for 6-monthly tasks', () => {
    expect(ymd(nextDue(d(2026, 5, 10), 6, 5))).toBe('2026-11-1') // gutters May → Nov
    expect(ymd(nextDue(d(2026, 11, 25), 6, 5))).toBe('2027-5-1')
  })
})

describe('labels', () => {
  const now = d(2026, 11, 18)
  it('describes due dates', () => {
    expect(dueLabel(d(2026, 11, 1).toISOString(), now)).toEqual({ text: '2 weeks overdue', tone: 'overdue' })
    expect(dueLabel(d(2026, 11, 28).toISOString(), now)).toEqual({ text: 'In 10 days', tone: 'ok' })
    expect(dueLabel(d(2027, 5, 18).toISOString(), now)).toEqual({ text: 'In 6 months', tone: 'ok' })
  })
  it('describes schedules', () => {
    expect(everyLabel({ interval_months: 12, month: 10 })).toBe('Yearly · Oct')
    expect(everyLabel({ interval_months: 6, month: 5 })).toBe('Every 6 months · May & Nov')
    expect(everyLabel({ interval_months: 3, month: 0 })).toBe('Every 3 months')
  })
})

describe('stagger', () => {
  it('spreads starter tasks over 8 weeks with safety first', () => {
    const now = d(2026, 11, 18)
    const due = stagger(STARTER, now)
    const sorted = [...due.entries()].sort((a, b) => a[1].getTime() - b[1].getTime())
    const get = (key: string) => ymd(due.get(STARTER.find((s) => s.key === key)!)!)
    expect(sorted[0][0].category).toBe('Safety')
    expect(sorted[0][1].getTime()).toBeGreaterThan(now.getTime())
    // Out of season → waits for its month; in season (gutters May & Nov) → spread over the next 8 weeks.
    expect(get('ac-service')).toBe('2027-5-1')
    expect(get('chimney')).toBe('2027-9-1')
    const soon = (key: string) => due.get(STARTER.find((s) => s.key === key)!)!.getTime() <= d(2027, 1, 13).getTime()
    expect(soon('gutters')).toBe(true) // May & Nov: in season
    expect(soon('outdoor-taps')).toBe(true) // Oct: just missed, still do it now
    expect(soon('alarm-test')).toBe(true) // safety ignores season
    expect(get('alarm-batteries')).not.toBe('2027-11-1') // Nov task, in season now
  })
})

describe('costs and ranks', () => {
  const p = (lo: number | null, hi: number | null) => ({ cost_low: lo, cost_high: hi }) as Project
  it('formats costs', () => {
    expect(costLabel(p(12000, 18000))).toBe('$12–18k')
    expect(costLabel(p(2500, null))).toBe('$2.5k')
    expect(costLabel(p(400, 900))).toBe('$400–$900')
    expect(costLabel(p(null, null))).toBe('—')
    expect(costTotal([p(12000, 18000), p(2000, 3000), p(null, null)])).toBe('$14–21k')
  })
  it('ranks between neighbours', () => {
    expect(rankBetween(1, 2)).toBe(1.5)
    expect(rankBetween(undefined, 1)).toBe(0)
    expect(rankBetween(3, undefined)).toBe(4)
  })
})
