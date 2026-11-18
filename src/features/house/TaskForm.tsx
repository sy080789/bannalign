import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, type Task } from '../../db'
import { save } from '../../sync'
import { addMonths } from './actions'
import { MONTHS, nextDue } from './logic'
import { STARTER_CATEGORIES } from './starter'

const blank = (): Task => ({
  id: crypto.randomUUID(),
  name: '',
  category: '',
  interval_months: 12,
  month: 0,
  steps: '',
  parts: '',
  notes: '',
  next_due: '',
  last_done: null,
  last_done_by: '',
  updated_at: '',
})

// For new tasks: roughly when was it last done? (-1 = not sure → due in a couple of weeks)
const LAST = [
  ['Not sure', -1],
  ['This month', 0],
  ['~6 months ago', 6],
  ['~A year ago', 12],
] as const

export function TaskForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const existing = useLiveQuery(() => (id ? db.tasks.get(id) : undefined), [id])
  const [t, setT] = useState<Task>(blank)
  const [last, setLast] = useState<number>(-1)
  const [error, setError] = useState('')

  useEffect(() => {
    if (existing) setT(existing)
  }, [existing])

  const set = <K extends keyof Task>(k: K, v: Task[K]) => setT((x) => ({ ...x, [k]: v }))
  const setEvery = (n: number) => set('interval_months', Math.max(1, Math.min(120, Math.round(n) || 1)))

  async function submit() {
    if (!t.name.trim()) return setError('Give it a name')
    const row = { ...t, name: t.name.trim() }
    const scheduleChanged = existing && (existing.interval_months !== row.interval_months || existing.month !== row.month)
    if (!id) {
      row.next_due = (last < 0 ? addMonths(0, new Date(Date.now() + 14 * 86_400_000)) : nextDue(addMonths(-last), row.interval_months, row.month)).toISOString()
    } else if (scheduleChanged) {
      row.next_due = nextDue(row.last_done ? new Date(row.last_done) : new Date(), row.interval_months, row.month).toISOString()
    }
    await save('tasks', row)
    nav(id ? `/house/tasks/${row.id}` : '/house', { replace: true })
  }

  async function remove() {
    if (!existing) return
    await save('tasks', { ...existing, deleted: true })
    nav('/house', { replace: true, state: { deleted: { table: 'tasks', row: existing, name: existing.name } } })
  }

  return (
    <div className="form-page">
      <div className="detail-bar">
        <button className="btn link" onClick={() => nav(-1)}>
          Cancel
        </button>
        <h2 className="bar-title">{id ? 'Edit task' : 'New task'}</h2>
        <button className="btn link strong" onClick={submit}>
          Save
        </button>
      </div>

      <label className="field">
        Task
        <input value={t.name} placeholder="e.g. Clean basement dehumidifier" onChange={(e) => set('name', e.target.value)} />
      </label>

      <div className="field">
        Category
        <div className="chips static">
          {STARTER_CATEGORIES.map((c) => (
            <button key={c} type="button" className={`chip ${t.category === c ? 'on' : ''}`} onClick={() => set('category', t.category === c ? '' : c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        Every
        <div className="stepper">
          <button type="button" onClick={() => setEvery(t.interval_months - 1)} aria-label="Fewer months">
            −
          </button>
          <input type="number" inputMode="numeric" value={t.interval_months} onChange={(e) => setEvery(Number(e.target.value))} aria-label="Months" />
          <span>{t.interval_months === 1 ? 'month' : 'months'}</span>
          <button type="button" onClick={() => setEvery(t.interval_months + 1)} aria-label="More months">
            +
          </button>
        </div>
      </div>

      <label className="field">
        Best month <small>optional, e.g. gutters in November</small>
        <select value={t.month} onChange={(e) => set('month', Number(e.target.value))}>
          <option value={0}>Any time</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </label>

      {!id && (
        <div className="field">
          Last done
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
        Parts <small>optional, shown on the list</small>
        <input value={t.parts} placeholder="e.g. Filter size: 16×25×1" onChange={(e) => set('parts', e.target.value)} />
      </label>

      <label className="field">
        How to <small>optional</small>
        <textarea rows={4} value={t.steps} onChange={(e) => set('steps', e.target.value)} />
      </label>

      <label className="field">
        Our notes <small>optional</small>
        <textarea rows={3} value={t.notes} placeholder="e.g. Shut-off is behind the laundry sink" onChange={(e) => set('notes', e.target.value)} />
      </label>

      {error && <p className="error">{error}</p>}
      {id && (
        <button className="btn danger full" onClick={remove}>
          Delete task
        </button>
      )}
    </div>
  )
}
