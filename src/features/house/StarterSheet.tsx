import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type Task } from '../../db'
import { save } from '../../sync'
import { Icon } from '../../components/Icon'
import { everyLabel, stagger } from './logic'
import { STARTER, STARTER_CATEGORIES } from './starter'

const norm = (s: string) => s.trim().toLowerCase()

/** Pick from the standard checklist. Already-added tasks are hidden, so it can be reopened any time. */
export function StarterSheet({ onClose, onAdded }: { onClose: () => void; onAdded: (n: number) => void }) {
  const have = useLiveQuery(async () => new Set((await db.tasks.toArray()).filter((t) => !t.deleted).map((t) => norm(t.name))), [], new Set<string>())
  const available = STARTER.filter((s) => !have.has(norm(s.name)))
  const [off, setOff] = useState<Set<string>>(new Set())
  const picked = available.filter((s) => !off.has(s.key))

  const toggle = (k: string) =>
    setOff((o) => {
      const n = new Set(o)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

  async function add() {
    const due = stagger(picked)
    for (const s of picked) {
      const t: Task = {
        id: crypto.randomUUID(),
        name: s.name,
        category: s.category,
        interval_months: s.interval_months,
        month: s.month,
        steps: s.steps,
        parts: s.parts ?? '',
        notes: '',
        next_due: due.get(s)!.toISOString(),
        last_done: null,
        last_done_by: '',
        updated_at: '',
      }
      await save('tasks', t)
    }
    onAdded(picked.length)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet tall" role="dialog" aria-label="Starter tasks" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Starter tasks</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        {available.length === 0 ? (
          <p className="muted small-note">You’ve added everything from the starter list.</p>
        ) : (
          <>
            <p className="muted small-note">Untick anything that doesn’t apply. First due dates are spread over the next 8 weeks, safety checks first.</p>
            {STARTER_CATEGORIES.map((cat) => {
              const list = available.filter((s) => s.category === cat)
              if (!list.length) return null
              return (
                <div key={cat} className="starter-group">
                  <h3>{cat}</h3>
                  <ul className="card rows">
                    {list.map((s) => {
                      const on = !off.has(s.key)
                      return (
                        <li key={s.key}>
                          <button className="row starter-row" onClick={() => toggle(s.key)} aria-pressed={on}>
                            <span className={`check ${on ? 'on' : ''}`}>{on && <Icon name="check" size={18} />}</span>
                            <span className="name">
                              {s.name}
                              <small className="due">{everyLabel(s)}</small>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </>
        )}
        <button className="btn primary" disabled={!picked.length} onClick={add}>
          Add {picked.length} task{picked.length === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  )
}
