import { describe, expect, it } from 'vitest'
import type { Issue, Plant, Task } from './db'
import { attention } from './attention'

const now = new Date(2026, 10, 19, 10)
const iso = (days: number) => new Date(2026, 10, 19 + days, 9).toISOString()
const plant = (last: number, extra: Partial<Plant> = {}) =>
  ({ id: 'p', interval_days: 7, last_watered: iso(last), snooze_until: null, ...extra }) as Plant
const task = (due: number, extra: Partial<Task> = {}) => ({ id: 't', next_due: iso(due), ...extra }) as Task
const issue = (check: number | null, status: Issue['status'] = 'watch') =>
  ({ id: 'i', status, next_check: check === null ? null : iso(check) }) as Issue

describe('attention', () => {
  it('dots Plants when a plant is due today or overdue', () => {
    expect(attention([plant(-3)], [], [], now)['/plants']).toBe(false)
    expect(attention([plant(-7)], [], [], now)['/plants']).toBe(true)
    expect(attention([plant(-10)], [], [], now)['/plants']).toBe(true)
  })
  it('ignores deleted and snoozed plants', () => {
    expect(attention([plant(-10, { deleted: true })], [], [], now)['/plants']).toBe(false)
    expect(attention([plant(-10, { snooze_until: iso(2) })], [], [], now)['/plants']).toBe(false)
  })
  it('dots House only for things that slipped', () => {
    expect(attention([], [task(0)], [], now)['/house']).toBe(false) // due today: not yet
    expect(attention([], [task(-1)], [], now)['/house']).toBe(true)
    expect(attention([], [task(-1, { deleted: true })], [], now)['/house']).toBe(false)
    expect(attention([], [], [issue(-2)], now)['/house']).toBe(true)
    expect(attention([], [], [issue(-2, 'fixed')], now)['/house']).toBe(false)
    expect(attention([], [], [issue(null)], now)['/house']).toBe(false)
  })
})
