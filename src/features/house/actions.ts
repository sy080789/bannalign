import type { HouseEvent, Issue, Project, Task } from '../../db'
import { save } from '../../sync'
import { whoAmI } from '../../people'
import { nextDue } from './logic'

export function houseEvent(parent_id: string, kind: HouseEvent['kind'], by: string, note = '', photo_url = ''): HouseEvent {
  return { id: crypto.randomUUID(), parent_id, kind, at: new Date().toISOString(), by, note, photo_url, updated_at: '' }
}

export const addMonths = (months: number, from = new Date()) => new Date(from.getFullYear(), from.getMonth() + months, from.getDate())

/** Mark an upkeep task done and schedule the next one. Returns an undo. */
export async function markDone(t: Task, note = ''): Promise<() => void> {
  const by = await whoAmI()
  const ev = houseEvent(t.id, 'done', by, note)
  await save('tasks', { ...t, last_done: ev.at, last_done_by: by, next_due: nextDue(new Date(), t.interval_months, t.month).toISOString() })
  await save('house_events', ev)
  return () => {
    save('tasks', t)
    save('house_events', { ...ev, deleted: true })
  }
}

/** "Checked it, no change" on a watched issue: logs it and pushes the next check-in out. */
export async function checkIn(i: Issue, note = ''): Promise<() => void> {
  const ev = houseEvent(i.id, 'check', await whoAmI(), note)
  await save('issues', { ...i, next_check: i.check_months ? addMonths(i.check_months).toISOString() : null })
  await save('house_events', ev)
  return () => {
    save('issues', i)
    save('house_events', { ...ev, deleted: true })
  }
}

export const STATUS_LABEL: Record<Issue['status'], string> = { fix: 'To fix', watch: 'Watching', fixed: 'Fixed' }

export async function setStatus(i: Issue, status: Issue['status']) {
  if (i.status === status) return
  const now = new Date().toISOString()
  await save('issues', {
    ...i,
    status,
    fixed_at: status === 'fixed' ? now : null,
    next_check: status === 'watch' && i.check_months ? addMonths(i.check_months).toISOString() : status === 'watch' ? i.next_check : null,
  })
  await save('house_events', houseEvent(i.id, 'status', await whoAmI(), STATUS_LABEL[status]))
}

export const PROJECT_STATUS: Record<Project['status'], string> = { idea: 'Idea', quotes: 'Getting quotes', done: 'Done' }
