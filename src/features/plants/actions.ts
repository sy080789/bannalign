import type { Plant, PlantEvent } from '../../db'
import { save } from '../../sync'
import { whoAmI } from '../../people'

export function newEvent(plant_id: string, kind: PlantEvent['kind'], by: string, photo_url = ''): PlantEvent {
  return { id: crypto.randomUUID(), plant_id, kind, at: new Date().toISOString(), by, photo_url, updated_at: '' }
}

/** Log a watering. Returns an undo. */
export async function water(p: Plant): Promise<() => void> {
  const by = await whoAmI()
  const ev = newEvent(p.id, 'water', by)
  await save('plants', { ...p, last_watered: ev.at, last_watered_by: by, snooze_until: null })
  await save('plant_events', ev)
  return () => {
    save('plants', p)
    save('plant_events', { ...ev, deleted: true })
  }
}

/** "Still wet": check again in N days without logging a watering. Returns an undo. */
export async function snooze(p: Plant, days = 2): Promise<() => void> {
  const d = new Date()
  d.setDate(d.getDate() + days)
  await save('plants', { ...p, snooze_until: d.toISOString() })
  return () => save('plants', p)
}
