import { Link } from 'react-router-dom'
import type { Issue, Task } from '../../db'
import { Icon } from '../../components/Icon'
import { STATUS_LABEL } from './actions'
import { daysUntil, dueLabel } from './logic'

/** An upkeep task: name, due · parts, and a one-tap Done. */
export function TaskRow({ task, onDone }: { task: Task; onDone: (t: Task) => void }) {
  const due = dueLabel(task.next_due)
  const parts = task.parts.replace(/^[^:]*:\s*$/, '') // ignore an unfilled "Filter size: " template
  return (
    <li className="row">
      <Link to={`/house/tasks/${task.id}`} className="row-main plant-link">
        <span className="name">
          {task.name}
          <small className={`due is-${due.tone}`}>
            {due.text}
            {parts && <span className="parts"> · {parts}</span>}
          </small>
        </span>
      </Link>
      <button className={`water-btn is-${due.tone}`} onClick={() => onDone(task)} aria-label={`Mark ${task.name} done`}>
        <Icon name="check" size={22} />
      </button>
    </li>
  )
}

/** A Fix issue: photo, title, room · status (or check-in due), optional "Checked" button. */
export function IssueRow({ issue, photo, onCheck }: { issue: Issue; photo?: string; onCheck?: (i: Issue) => void }) {
  const watching = issue.status === 'watch' && issue.next_check
  const dueNow = watching && daysUntil(issue.next_check!) <= 0
  const sub = !watching ? STATUS_LABEL[issue.status] : dueNow ? 'Time to check' : `Watching · check ${dueLabel(issue.next_check!).text.toLowerCase()}`
  const tone = dueNow ? 'due' : issue.status === 'fix' ? 'fix' : 'ok'
  return (
    <li className="row plant-row">
      <Link to={`/house/issues/${issue.id}`} className="row-main plant-link">
        {photo ? (
          <img className="plant-thumb" src={photo} alt="" width={48} height={48} />
        ) : (
          <span className="plant-thumb ph" style={{ width: 48, height: 48 }}>
            <Icon name="house" size={24} />
          </span>
        )}
        <span className="name">
          {issue.title}
          <small className={`due is-${tone}`}>
            {issue.room && `${issue.room} · `}
            {sub}
          </small>
        </span>
      </Link>
      {onCheck && (
        <button className="water-btn is-due" onClick={() => onCheck(issue)} aria-label={`Checked ${issue.title}`}>
          <Icon name="check" size={22} />
        </button>
      )}
    </li>
  )
}
