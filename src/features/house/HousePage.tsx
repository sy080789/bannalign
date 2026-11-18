import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { db, type Issue, type TableName, type Task } from '../../db'
import { save } from '../../sync'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { checkIn, markDone } from './actions'
import { daysUntil } from './logic'
import { Projects } from './Projects'
import { IssueRow, TaskRow } from './rows'
import { StarterSheet } from './StarterSheet'

const TABS = [
  { path: '/house', label: 'Upkeep' },
  { path: '/house/fix', label: 'Fix' },
  { path: '/house/projects', label: 'Projects' },
]

export function HousePage() {
  const { pathname, state } = useLocation()
  const nav = useNavigate()
  const toast = useToast()

  // Arrived after deleting something: offer Undo.
  const deleted = (state as { deleted?: { table: TableName; row: { id: string; updated_at: string }; name: string } } | null)?.deleted
  useEffect(() => {
    if (!deleted) return
    nav('.', { replace: true, state: null })
    toast.show(`Deleted ${deleted.name}`, () => save(deleted.table, { ...deleted.row, deleted: false }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleted])

  return (
    <>
      <header className="page-head">
        <div className="segmented" role="tablist">
          {TABS.map((t) => (
            <NavLink key={t.path} to={t.path} end className={({ isActive }) => (isActive ? 'seg active' : 'seg')}>
              {t.label}
            </NavLink>
          ))}
        </div>
      </header>
      {pathname === '/house' && <Upkeep onToast={toast.show} />}
      {pathname === '/house/fix' && <Fix onToast={toast.show} />}
      {pathname === '/house/projects' && <Projects />}
      {toast.node}
    </>
  )
}

type Toast = (text: string, undo?: () => void) => void

function Upkeep({ onToast }: { onToast: Toast }) {
  const tasks = useLiveQuery(async () => (await db.tasks.toArray()).filter((t) => !t.deleted).sort((a, b) => a.next_due.localeCompare(b.next_due)), [], undefined)
  const [starter, setStarter] = useState(false)
  if (!tasks) return null

  const done = async (t: Task) => onToast(`Done: ${t.name}`, await markDone(t))
  const overdue = tasks.filter((t) => daysUntil(t.next_due) < 0)
  const soon = tasks.filter((t) => daysUntil(t.next_due) >= 0 && daysUntil(t.next_due) <= 31)
  const later = tasks.filter((t) => daysUntil(t.next_due) > 31)
  const sections = [
    ['Overdue', overdue],
    ['Next 30 days', soon],
    ['Later', later],
  ] as const

  return (
    <>
      {tasks.length === 0 && (
        <div className="empty small">
          <p>Track the routine stuff: filters, gutters, alarms.</p>
          <p className="muted">Start from a standard checklist for a Toronto house, then add your own.</p>
          <button className="btn primary inline" onClick={() => setStarter(true)}>
            Choose starter tasks
          </button>
        </div>
      )}
      {sections.map(
        ([title, list]) =>
          list.length > 0 && (
            <section key={title} className="group">
              <h2>{title}</h2>
              <ul className="card rows">
                {list.map((t) => (
                  <TaskRow key={t.id} task={t} onDone={done} />
                ))}
              </ul>
            </section>
          ),
      )}
      {tasks.length > 0 && (
        <div className="action-row">
          <Link className="btn soft" to="/house/tasks/new">
            <Icon name="plus" size={18} /> New task
          </Link>
          <button className="btn soft" onClick={() => setStarter(true)}>
            Starter list
          </button>
        </div>
      )}
      {starter && <StarterSheet onClose={() => setStarter(false)} onAdded={(n) => onToast(`Added ${n} task${n === 1 ? '' : 's'}`)} />}
    </>
  )
}

function Fix({ onToast }: { onToast: Toast }) {
  const issues = useLiveQuery(async () => (await db.issues.toArray()).filter((i) => !i.deleted), [], undefined)
  const photos = useLiveQuery(
    async () => {
      const m: Record<string, string> = {}
      const evs = (await db.house_events.toArray()).filter((e) => e.photo_url && !e.deleted).sort((a, b) => a.at.localeCompare(b.at))
      for (const e of evs) m[e.parent_id] = e.photo_url // latest wins
      return m
    },
    [],
    {} as Record<string, string>,
  )
  const [showFixed, setShowFixed] = useState(false)
  if (!issues) return null

  const check = async (i: Issue) => onToast(`Checked ${i.title}`, await checkIn(i))
  const byNew = (a: Issue, b: Issue) => b.updated_at.localeCompare(a.updated_at)
  const fix = issues.filter((i) => i.status === 'fix').sort(byNew)
  const watch = issues
    .filter((i) => i.status === 'watch')
    .sort((a, b) => (a.next_check ?? '9').localeCompare(b.next_check ?? '9'))
  const fixed = issues.filter((i) => i.status === 'fixed').sort((a, b) => (b.fixed_at ?? '').localeCompare(a.fixed_at ?? ''))
  const isDue = (i: Issue) => !!i.next_check && daysUntil(i.next_check) <= 0

  return (
    <>
      {issues.length === 0 && (
        <div className="empty small">
          <p>Log anything that needs fixing or watching, with photos over time.</p>
          <p className="muted">e.g. a ceiling stain after a leak.</p>
        </div>
      )}
      {fix.length > 0 && (
        <section className="group">
          <h2>To fix</h2>
          <ul className="card rows">
            {fix.map((i) => (
              <IssueRow key={i.id} issue={i} photo={photos[i.id]} />
            ))}
          </ul>
        </section>
      )}
      {watch.length > 0 && (
        <section className="group">
          <h2>Watching</h2>
          <ul className="card rows">
            {watch.map((i) => (
              <IssueRow key={i.id} issue={i} photo={photos[i.id]} onCheck={isDue(i) ? check : undefined} />
            ))}
          </ul>
        </section>
      )}
      {fixed.length > 0 && (
        <section className="group">
          <button className="group-toggle" onClick={() => setShowFixed(!showFixed)} aria-expanded={showFixed}>
            <h2>Fixed · {fixed.length}</h2>
            <span className={`rg-toggle ${showFixed ? 'open' : ''}`}>
              <Icon name="chevron" size={18} />
            </span>
          </button>
          {showFixed && (
            <ul className="card rows done">
              {fixed.map((i) => (
                <IssueRow key={i.id} issue={i} photo={photos[i.id]} />
              ))}
            </ul>
          )}
        </section>
      )}
      <Link className="fab" to="/house/issues/new" aria-label="Log an issue">
        <Icon name="plus" size={28} />
      </Link>
    </>
  )
}
