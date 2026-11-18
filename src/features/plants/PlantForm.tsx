import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, type Plant } from '../../db'
import { save } from '../../sync'
import { savePhoto } from '../../photo'
import { whoAmI } from '../../people'
import { newEvent } from './actions'

const blank = (): Plant => ({
  id: crypto.randomUUID(),
  name: '',
  room: '',
  photo_url: '',
  interval_days: 7,
  amount: '',
  notes: '',
  last_watered: null,
  last_watered_by: '',
  snooze_until: null,
  updated_at: '',
})

const LAST = [
  ['Today', 0],
  ['Yesterday', 1],
  ['3 days ago', 3],
  ['A week ago', 7],
  ['Not sure', -1],
] as const

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export function PlantForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const existing = useLiveQuery(() => (id ? db.plants.get(id) : undefined), [id])
  const rooms = useLiveQuery(async () => [...new Set((await db.plants.toArray()).filter((p) => !p.deleted && p.room).map((p) => p.room))].sort(), [], [])
  const [p, setP] = useState<Plant>(blank)
  const [last, setLast] = useState<number>(0)
  const [newPhoto, setNewPhoto] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (existing) setP(existing)
  }, [existing])

  const set = <K extends keyof Plant>(k: K, v: Plant[K]) => setP((x) => ({ ...x, [k]: v }))
  const setDays = (n: number) => set('interval_days', Math.max(1, Math.min(90, Math.round(n) || 1)))

  async function pickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      set('photo_url', await savePhoto(file))
      setNewPhoto(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    if (!p.name.trim()) return setError('Give it a name')
    const row = { ...p, name: p.name.trim(), room: p.room.trim() }
    if (!id && last >= 0) row.last_watered = daysAgo(last)
    await save('plants', row)
    if (newPhoto) await save('plant_events', newEvent(row.id, 'photo', await whoAmI(), row.photo_url))
    nav(id ? `/plants/${row.id}` : '/plants', { replace: true })
  }

  async function remove() {
    if (!existing) return
    await save('plants', { ...existing, deleted: true })
    nav('/plants', { replace: true, state: { deleted: existing } })
  }

  return (
    <div className="form-page">
      <div className="detail-bar">
        <button className="btn link" onClick={() => nav(-1)}>
          Cancel
        </button>
        <h2 className="bar-title">{id ? 'Edit plant' : 'New plant'}</h2>
        <button className="btn link strong" onClick={submit} disabled={busy}>
          Save
        </button>
      </div>

      <label className="field">
        Name
        <input value={p.name} placeholder="e.g. Monstera" onChange={(e) => set('name', e.target.value)} />
      </label>

      <div className="field">
        Photo
        <label className="photo-pick">
          {p.photo_url ? <img src={p.photo_url} alt="" /> : <span className="muted">{busy ? 'Saving…' : 'Add a photo'}</span>}
          <input type="file" accept="image/*" onChange={pickPhoto} hidden />
        </label>
      </div>

      <label className="field">
        Room
        <input value={p.room} placeholder="e.g. Living room" onChange={(e) => set('room', e.target.value)} />
      </label>
      {rooms.length > 0 && (
        <div className="chips static">
          {rooms.map((r) => (
            <button key={r} type="button" className={`chip ${p.room === r ? 'on' : ''}`} onClick={() => set('room', r)}>
              {r}
            </button>
          ))}
        </div>
      )}

      <div className="field">
        Water every
        <div className="stepper">
          <button type="button" onClick={() => setDays(p.interval_days - 1)} aria-label="Fewer days">
            −
          </button>
          <input type="number" inputMode="numeric" value={p.interval_days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Days" />
          <span>{p.interval_days === 1 ? 'day' : 'days'}</span>
          <button type="button" onClick={() => setDays(p.interval_days + 1)} aria-label="More days">
            +
          </button>
        </div>
      </div>

      <label className="field">
        How much water <small>optional</small>
        <input value={p.amount} placeholder="e.g. 1 cup, until it drains" onChange={(e) => set('amount', e.target.value)} />
      </label>

      {!id && (
        <div className="field">
          Last watered
          <div className="chips static">
            {LAST.map(([label, n]) => (
              <button key={label} type="button" className={`chip ${last === n ? 'on' : ''}`} onClick={() => setLast(n)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="field">
        Care notes <small>optional</small>
        <textarea rows={3} value={p.notes} placeholder="Bright indirect light. Bottom-water only." onChange={(e) => set('notes', e.target.value)} />
      </label>

      {error && <p className="error">{error}</p>}

      {id && (
        <button className="btn danger full" onClick={remove}>
          Delete plant
        </button>
      )}
    </div>
  )
}
