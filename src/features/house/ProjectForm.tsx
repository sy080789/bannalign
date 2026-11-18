import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db, type Project } from '../../db'
import { save } from '../../sync'
import { rankBetween } from './logic'
import { PROJECT_STATUS } from './actions'

const blank = (): Project => ({
  id: crypto.randomUUID(),
  title: '',
  rank: 0,
  status: 'idea',
  cost_low: null,
  cost_high: null,
  actual_cost: null,
  notes: '',
  links: '',
  done_at: null,
  issue_id: null,
  updated_at: '',
})

const num = (s: string): number | null => {
  const n = Number(s.replace(/[$,\s]/g, '').replace(/k$/i, '000'))
  return s.trim() && Number.isFinite(n) ? n : null
}
const str = (n: number | null) => (n == null ? '' : String(n))

/** Add or edit a project (no separate detail page: everything is editable here). */
export function ProjectForm() {
  const { id } = useParams()
  const isNew = id === 'new'
  const nav = useNavigate()
  const existing = useLiveQuery(() => (!isNew && id ? db.projects.get(id) : undefined), [id])
  const issue = useLiveQuery(async () => (existing?.issue_id ? db.issues.get(existing.issue_id) : undefined), [existing?.issue_id])
  const [p, setP] = useState<Project>(blank)
  const [low, setLow] = useState('')
  const [high, setHigh] = useState('')
  const [actual, setActual] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!existing) return
    setP(existing)
    setLow(str(existing.cost_low))
    setHigh(str(existing.cost_high))
    setActual(str(existing.actual_cost))
  }, [existing])

  const set = <K extends keyof Project>(k: K, v: Project[K]) => setP((x) => ({ ...x, [k]: v }))
  const links = p.links
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^https?:\/\//.test(l))

  async function submit() {
    if (!p.title.trim()) return setError('Give it a name')
    const row: Project = { ...p, title: p.title.trim(), cost_low: num(low), cost_high: num(high), actual_cost: p.status === 'done' ? num(actual) : null }
    if (isNew) {
      const all = (await db.projects.toArray()).filter((x) => !x.deleted && x.status !== 'done')
      row.rank = rankBetween(all.length ? Math.max(...all.map((x) => x.rank)) : undefined, undefined) // new ideas go to the bottom
    }
    if (row.status === 'done' && !row.done_at) row.done_at = new Date().toISOString()
    if (row.status !== 'done') row.done_at = null
    await save('projects', row)
    nav('/house/projects', { replace: true })
  }

  async function remove() {
    if (!existing) return
    await save('projects', { ...existing, deleted: true })
    nav('/house/projects', { replace: true, state: { deleted: { table: 'projects', row: existing, name: existing.title } } })
  }

  return (
    <div className="form-page">
      <div className="detail-bar">
        <button className="btn link" onClick={() => nav(-1)}>
          Cancel
        </button>
        <h2 className="bar-title">{isNew ? 'New project' : 'Project'}</h2>
        <button className="btn link strong" onClick={submit}>
          Save
        </button>
      </div>

      <label className="field">
        Project
        <input value={p.title} placeholder="e.g. Replace flat roof" onChange={(e) => set('title', e.target.value)} />
      </label>

      <div className="field">
        Status
        <div className="chips static">
          {(Object.keys(PROJECT_STATUS) as Project['status'][]).map((s) => (
            <button key={s} type="button" className={`chip ${p.status === s ? 'on' : ''}`} onClick={() => set('status', s)}>
              {PROJECT_STATUS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        Estimated cost <small>optional; one number or a range</small>
        <div className="two-col">
          <input inputMode="decimal" value={low} placeholder="$ low" onChange={(e) => setLow(e.target.value)} aria-label="Low estimate" />
          <input inputMode="decimal" value={high} placeholder="$ high" onChange={(e) => setHigh(e.target.value)} aria-label="High estimate" />
        </div>
      </div>

      {p.status === 'done' && (
        <label className="field">
          Actual cost
          <input inputMode="decimal" value={actual} placeholder="$" onChange={(e) => setActual(e.target.value)} />
        </label>
      )}

      <label className="field">
        Notes <small>optional</small>
        <textarea rows={4} value={p.notes} placeholder="e.g. Roofer said 3–5 years left in 2026" onChange={(e) => set('notes', e.target.value)} />
      </label>

      <label className="field">
        Links <small>quotes, products; one per line</small>
        <textarea rows={2} value={p.links} placeholder="https://…" onChange={(e) => set('links', e.target.value)} />
      </label>
      {links.length > 0 && (
        <ul className="card rows">
          {links.map((l) => (
            <li key={l}>
              <a className="row link-row" href={l} target="_blank" rel="noreferrer">
                <span className="name ellipsis">{l.replace(/^https?:\/\/(www\.)?/, '')}</span>
                <span className="qty">↗</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {issue && !issue.deleted && (
        <Link className="btn ghost" to={`/house/issues/${issue.id}`}>
          From issue: {issue.title} →
        </Link>
      )}

      {error && <p className="error">{error}</p>}
      {!isNew && (
        <button className="btn danger full" onClick={remove}>
          Delete project
        </button>
      )}
    </div>
  )
}
