import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../../db'
import { save } from '../../sync'
import { savePhoto } from '../../photo'
import { whoAmI } from '../../people'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { newEvent, snooze, water } from './actions'
import { ago, dueLabel, plural } from './logic'

export function PlantDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const plant = useLiveQuery(() => db.plants.get(id), [id])
  const events = useLiveQuery(
    async () => (await db.plant_events.where('plant_id').equals(id).toArray()).filter((e) => !e.deleted).sort((a, b) => b.at.localeCompare(a.at)),
    [id],
    [],
  )
  const [busy, setBusy] = useState(false)

  if (plant === undefined) return null
  if (!plant || plant.deleted) return <div className="empty">This plant was deleted.</div>

  const due = dueLabel(plant)

  async function addPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !plant) return
    setBusy(true)
    try {
      const url = await savePhoto(file)
      await save('plant_events', newEvent(plant.id, 'photo', await whoAmI(), url))
      await save('plants', { ...plant, photo_url: url }) // newest photo becomes the plant's picture
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Photo upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="plant-detail">
      <div className="detail-bar">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Back">
          <Icon name="back" />
        </button>
        <span className="spacer" />
        <Link className="btn link" to={`/plants/${plant.id}/edit`}>
          Edit
        </Link>
      </div>

      {plant.photo_url ? <img className="hero" src={plant.photo_url} alt="" /> : null}
      <h1>{plant.name}</h1>
      <p className="meta">
        {[plant.room, `every ${plural(plant.interval_days, 'day')}`, plant.amount].filter(Boolean).join(' · ')}
      </p>

      <div className={`status-card card is-${due.tone}`}>
        <div>
          <strong>{due.text}</strong>
          <p className="muted">
            {plant.last_watered ? `Last watered ${ago(plant.last_watered)}${plant.last_watered_by ? ` by ${plant.last_watered_by}` : ''}` : 'Not watered yet'}
          </p>
        </div>
      </div>
      <div className="action-row">
        <button className="btn primary" onClick={async () => toast.show(`Watered ${plant.name}`, await water(plant))}>
          <Icon name="drop" size={20} /> Watered
        </button>
        <button className="btn soft" onClick={async () => toast.show('We’ll check again in 2 days', await snooze(plant))}>
          Still wet
        </button>
      </div>

      {plant.notes && (
        <section className="group">
          <h2>Care notes</h2>
          <p className="card notes">{plant.notes}</p>
        </section>
      )}

      <section className="group">
        <div className="group-head">
          <h2>Timeline</h2>
          <label className="btn link photo-link">
            <Icon name="camera" size={18} /> {busy ? 'Saving…' : 'Add photo'}
            <input type="file" accept="image/*" onChange={addPhoto} hidden disabled={busy} />
          </label>
        </div>
        {events.length === 0 ? (
          <p className="muted small-note">Waterings and photos will appear here.</p>
        ) : (
          <ul className="card rows timeline">
            {events.slice(0, 40).map((e) => (
              <li key={e.id} className={`row tl-${e.kind}`}>
                {e.kind === 'photo' ? (
                  <div className="tl-photo">
                    <img src={e.photo_url} alt="" loading="lazy" />
                    <span className="muted">
                      Photo · {ago(e.at)}
                      {e.by && ` · ${e.by}`}
                    </span>
                  </div>
                ) : (
                  <>
                    <Icon name="drop" size={18} />
                    <span className="name">Watered{e.by && ` by ${e.by}`}</span>
                    <span className="qty">{ago(e.at)}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      {toast.node}
    </div>
  )
}
