import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, type Issue } from '../../db'
import { save } from '../../sync'
import { savePhoto } from '../../photo'
import { whoAmI } from '../../people'
import { STATUS_LABEL, addMonths, houseEvent } from './actions'

const blank = (): Issue => ({
  id: crypto.randomUUID(),
  title: '',
  room: '',
  status: 'fix',
  check_months: 0,
  next_check: null,
  fixed_at: null,
  updated_at: '',
})

const CHECKS = [
  ['Off', 0],
  ['Monthly', 1],
  ['3 months', 3],
  ['6 months', 6],
] as const

export function IssueForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const existing = useLiveQuery(() => (id ? db.issues.get(id) : undefined), [id])
  const rooms = useLiveQuery(
    async () => [...new Set([...(await db.issues.toArray()), ...(await db.plants.toArray())].filter((r) => !r.deleted && r.room).map((r) => r.room))].sort(),
    [],
    [],
  )
  const [i, setI] = useState<Issue>(blank)
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (existing) setI(existing)
  }, [existing])

  const set = <K extends keyof Issue>(k: K, v: Issue[K]) => setI((x) => ({ ...x, [k]: v }))

  async function pickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      setPhoto(await savePhoto(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    if (!i.title.trim()) return setError('Give it a short name')
    const row = { ...i, title: i.title.trim(), room: i.room.trim() }
    const checkChanged = !existing || existing.check_months !== row.check_months || existing.status !== row.status
    if (checkChanged) row.next_check = row.status === 'watch' && row.check_months ? addMonths(row.check_months).toISOString() : null
    await save('issues', row)
    if (photo || note.trim()) await save('house_events', houseEvent(row.id, photo ? 'photo' : 'note', await whoAmI(), note.trim(), photo))
    nav(`/house/issues/${row.id}`, { replace: true })
  }

  async function remove() {
    if (!existing) return
    await save('issues', { ...existing, deleted: true })
    nav('/house/fix', { replace: true, state: { deleted: { table: 'issues', row: existing, name: existing.title } } })
  }

  return (
    <div className="form-page">
      <div className="detail-bar">
        <button className="btn link" onClick={() => nav(-1)}>
          Cancel
        </button>
        <h2 className="bar-title">{id ? 'Edit issue' : 'New issue'}</h2>
        <button className="btn link strong" onClick={submit} disabled={busy}>
          Save
        </button>
      </div>

      <label className="field">
        What is it?
        <input value={i.title} placeholder="e.g. Ceiling stain" onChange={(e) => set('title', e.target.value)} />
      </label>

      <label className="field">
        Where
        <input value={i.room} placeholder="e.g. Kids’ room" onChange={(e) => set('room', e.target.value)} />
      </label>
      {rooms.length > 0 && (
        <div className="chips static">
          {rooms.map((r) => (
            <button key={r} type="button" className={`chip ${i.room === r ? 'on' : ''}`} onClick={() => set('room', r)}>
              {r}
            </button>
          ))}
        </div>
      )}

      {!id && (
        <div className="field">
          Status
          <div className="chips static">
            {(['fix', 'watch'] as const).map((s) => (
              <button key={s} type="button" className={`chip ${i.status === s ? 'on' : ''}`} onClick={() => set('status', s)}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {i.status === 'watch' && (
        <div className="field">
          Remind us to check
          <div className="chips static">
            {CHECKS.map(([label, n]) => (
              <button key={label} type="button" className={`chip ${i.check_months === n ? 'on' : ''}`} onClick={() => set('check_months', n)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!id && (
        <>
          <div className="field">
            Photo
            <label className="photo-pick">
              {photo ? <img src={photo} alt="" /> : <span className="muted">{busy ? 'Saving…' : 'Add a photo'}</span>}
              <input type="file" accept="image/*" onChange={pickPhoto} hidden />
            </label>
          </div>
          <label className="field">
            Note <small>optional</small>
            <textarea rows={3} value={note} placeholder="e.g. From the roof leak in spring. Roofer patched it in May." onChange={(e) => setNote(e.target.value)} />
          </label>
        </>
      )}

      {error && <p className="error">{error}</p>}
      {id && (
        <button className="btn danger full" onClick={remove}>
          Delete issue
        </button>
      )}
    </div>
  )
}
