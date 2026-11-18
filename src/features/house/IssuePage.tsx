import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db, type Issue, type Project } from '../../db'
import { save } from '../../sync'
import { savePhoto } from '../../photo'
import { whoAmI } from '../../people'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { ago } from '../plants/logic'
import { STATUS_LABEL, checkIn, houseEvent, setStatus } from './actions'
import { daysUntil, dueLabel, rankBetween } from './logic'

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export function IssuePage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const issue = useLiveQuery(() => db.issues.get(id), [id])
  const events = useLiveQuery(
    async () => (await db.house_events.where('parent_id').equals(id).toArray()).filter((e) => !e.deleted).sort((a, b) => b.at.localeCompare(a.at)),
    [id],
    [],
  )
  const project = useLiveQuery(async () => (await db.projects.toArray()).find((p) => p.issue_id === id && !p.deleted), [id])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  if (issue === undefined) return null
  if (!issue || issue.deleted) return <div className="empty">This issue was deleted.</div>

  const photos = events.filter((e) => e.photo_url).reverse() // oldest first
  const first = photos[0]
  const latest = photos.length > 1 ? photos[photos.length - 1] : undefined
  const checkDue = issue.status === 'watch' && issue.next_check ? daysUntil(issue.next_check) <= 0 : false

  async function addEntry(photo_url = '') {
    if (!issue || (!note.trim() && !photo_url)) return
    await save('house_events', houseEvent(issue.id, photo_url ? 'photo' : 'note', await whoAmI(), note.trim(), photo_url))
    setNote('')
  }

  async function pickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      await addEntry(await savePhoto(file))
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Photo upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function makeProject() {
    if (!issue) return
    const all = (await db.projects.toArray()).filter((p) => !p.deleted && p.status !== 'done')
    const last = Math.max(0, ...all.map((p) => p.rank))
    const p: Project = {
      id: crypto.randomUUID(),
      title: issue.title,
      rank: rankBetween(all.length ? last : undefined, undefined),
      status: 'idea',
      cost_low: null,
      cost_high: null,
      actual_cost: null,
      notes: '',
      links: '',
      done_at: null,
      issue_id: issue.id,
      updated_at: '',
    }
    await save('projects', p)
    nav(`/house/projects/${p.id}`)
  }

  return (
    <div className="plant-detail">
      <div className="detail-bar">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Back">
          <Icon name="back" />
        </button>
        <span className="spacer" />
        <Link className="btn link" to={`/house/issues/${issue.id}/edit`}>
          Edit
        </Link>
      </div>
      <h1>{issue.title}</h1>
      {issue.room && <p className="meta">{issue.room}</p>}

      <div className="seg-chips" role="radiogroup" aria-label="Status">
        {(['fix', 'watch', 'fixed'] as Issue['status'][]).map((s) => (
          <button key={s} role="radio" aria-checked={issue.status === s} className={issue.status === s ? 'on' : ''} onClick={() => setStatus(issue, s)}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {first && (
        <div className={`compare ${latest ? 'two' : ''}`}>
          <figure>
            <img src={first.photo_url} alt="" />
            <figcaption>{latest ? `First · ${fmt(first.at)}` : fmt(first.at)}</figcaption>
          </figure>
          {latest && (
            <figure>
              <img src={latest.photo_url} alt="" />
              <figcaption>Latest · {fmt(latest.at)}</figcaption>
            </figure>
          )}
        </div>
      )}

      {issue.status === 'watch' && (
        <div className={`status-card card ${checkDue ? 'is-due' : ''}`}>
          <strong>{issue.next_check ? (checkDue ? 'Time to check' : `Next check ${dueLabel(issue.next_check).text.toLowerCase()}`) : 'No check-in reminder'}</strong>
          <p className="muted">{issue.check_months ? `Every ${issue.check_months} month${issue.check_months === 1 ? '' : 's'}` : 'Set one in Edit'}</p>
        </div>
      )}
      {issue.status === 'watch' && (
        <div className="action-row">
          <button className="btn soft" onClick={async () => toast.show('Logged a check', await checkIn(issue))}>
            <Icon name="check" size={18} /> Checked, no change
          </button>
        </div>
      )}

      <section className="group">
        <h2>Add to timeline</h2>
        <div className="card composer">
          <textarea rows={2} value={note} placeholder="What did you see?" onChange={(e) => setNote(e.target.value)} />
          <div className="composer-actions">
            <label className="btn link photo-link">
              <Icon name="camera" size={18} /> {busy ? 'Saving…' : 'Photo'}
              <input type="file" accept="image/*" onChange={pickPhoto} hidden disabled={busy} />
            </label>
            <button className="btn primary narrow" disabled={!note.trim()} onClick={() => addEntry()}>
              Add note
            </button>
          </div>
        </div>
      </section>

      <section className="group">
        <h2>Timeline</h2>
        {events.length === 0 ? (
          <p className="muted small-note">Photos and notes will appear here.</p>
        ) : (
          <ul className="card rows timeline">
            {events.map((e) => (
              <li key={e.id} className="row">
                {e.photo_url ? (
                  <div className="tl-photo">
                    <img src={e.photo_url} alt="" loading="lazy" />
                    {e.note && <span className="tl-note">{e.note}</span>}
                    <span className="muted">
                      {fmt(e.at)}
                      {e.by && ` · ${e.by}`}
                    </span>
                  </div>
                ) : (
                  <>
                    <Icon name={e.kind === 'check' ? 'check' : e.kind === 'status' ? 'chevron' : 'list'} size={18} />
                    <span className="name">
                      {e.kind === 'check' ? 'Checked' : e.kind === 'status' ? `Marked ${e.note.toLowerCase()}` : e.note}
                      {e.kind === 'check' && e.note && <small className="due">{e.note}</small>}
                      {e.by && <small className="due">{e.by}</small>}
                    </span>
                    <span className="qty">{ago(e.at)}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {project ? (
        <Link className="btn ghost" to={`/house/projects/${project.id}`}>
          Project: {project.title} →
        </Link>
      ) : (
        issue.status !== 'fixed' && (
          <button className="btn ghost" onClick={makeProject}>
            Make this a project
          </button>
        )
      )}
      {toast.node}
    </div>
  )
}
