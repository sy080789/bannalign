import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../../db'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { ago } from '../plants/logic'
import { markDone } from './actions'
import { dueLabel, everyLabel } from './logic'

export function TaskPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const task = useLiveQuery(() => db.tasks.get(id), [id])
  const log = useLiveQuery(
    async () => (await db.house_events.where('parent_id').equals(id).toArray()).filter((e) => !e.deleted).sort((a, b) => b.at.localeCompare(a.at)),
    [id],
    [],
  )
  if (task === undefined) return null
  if (!task || task.deleted) return <div className="empty">This task was deleted.</div>
  const due = dueLabel(task.next_due)
  const overdue = due.tone === 'overdue'

  return (
    <div className="plant-detail">
      <div className="detail-bar">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Back">
          <Icon name="back" />
        </button>
        <span className="spacer" />
        <Link className="btn link" to={`/house/tasks/${task.id}/edit`}>
          Edit
        </Link>
      </div>
      <h1>{task.name}</h1>
      <p className={`meta ${overdue ? 'overdue-text' : ''}`}>{[task.category, everyLabel(task)].filter(Boolean).join(' · ')}</p>

      <div className={`status-card card is-${due.tone}`}>
        <strong>{due.text}</strong>
        <p className={overdue ? 'overdue-text' : 'muted'}>
          {task.last_done ? `Last done ${ago(task.last_done)}${task.last_done_by ? ` by ${task.last_done_by}` : ''}` : 'Not logged yet'}
        </p>
      </div>
      <div className="action-row">
        <button className="btn primary" onClick={async () => toast.show(`Done: ${task.name}`, await markDone(task))}>
          <Icon name="check" size={20} /> Mark done
        </button>
      </div>

      {task.parts && !/^[^:]*:\s*$/.test(task.parts) && (
        <section className="group">
          <h2>Parts</h2>
          <p className="card notes">{task.parts}</p>
        </section>
      )}
      {task.steps && (
        <section className="group">
          <h2>How to</h2>
          <p className="card notes">{task.steps}</p>
        </section>
      )}
      {task.notes && (
        <section className="group">
          <h2>Our notes</h2>
          <p className="card notes">{task.notes}</p>
        </section>
      )}
      <section className="group">
        <h2>History</h2>
        {log.length === 0 ? (
          <p className="muted small-note">Each time you mark it done, it’s logged here.</p>
        ) : (
          <ul className="card rows timeline">
            {log.map((e) => (
              <li key={e.id} className="row">
                <Icon name="check" size={18} />
                <span className="name">
                  Done{e.by && ` by ${e.by}`}
                  {e.note && <small className="due">{e.note}</small>}
                </span>
                <span className="qty">{ago(e.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {toast.node}
    </div>
  )
}
