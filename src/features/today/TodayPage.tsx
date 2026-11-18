import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { db, type Issue, type Plant, type Task } from '../../db'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { QuickAdd } from '../lists/QuickAdd'
import { water } from '../plants/actions'
import { PlantRow } from '../plants/PlantRow'
import { byDue, isDue } from '../plants/logic'
import { checkIn, markDone } from '../house/actions'
import { daysUntil } from '../house/logic'
import { IssueRow, TaskRow } from '../house/rows'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function TodayPage() {
  const [listId, setListId] = useState('groceries')
  const toast = useToast()
  const lists = useLiveQuery(() => db.lists.orderBy('sort').toArray(), [], [])
  const counts = useLiveQuery(
    async () => {
      const items = await db.items.toArray()
      const c: Record<string, number> = {}
      for (const i of items) if (i.in_list && !i.checked && !i.deleted) c[i.list_id] = (c[i.list_id] ?? 0) + 1
      return c
    },
    [],
    {} as Record<string, number>,
  )

  // Due/overdue things from each feature: plants, upkeep tasks, issue check-ins.
  const duePlants = useLiveQuery(async () => (await db.plants.toArray()).filter((p) => !p.deleted && isDue(p)).sort(byDue()), [], [])
  const dueTasks = useLiveQuery(async () => (await db.tasks.toArray()).filter((t) => !t.deleted && daysUntil(t.next_due) <= 0).sort((a, b) => a.next_due.localeCompare(b.next_due)), [], [])
  const dueChecks = useLiveQuery(async () => (await db.issues.toArray()).filter((i) => !i.deleted && i.status === 'watch' && !!i.next_check && daysUntil(i.next_check) <= 0), [], [])
  const onDone = async (t: Task) => toast.show(`Done: ${t.name}`, await markDone(t))
  const onCheck = async (i: Issue) => toast.show(`Checked ${i.title}`, await checkIn(i))
  const onWater = async (p: Plant) => toast.show(`Watered ${p.name}`, await water(p))

  return (
    <>
      <header className="page-head">
        <p className="date">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1>{greeting()}</h1>
        <QuickAdd listId={listId} onListChange={setListId} onAdded={(t) => toast.show(t)} />
      </header>

      <section className="group">
        <h2>Needs attention</h2>
        {duePlants.length + dueTasks.length + dueChecks.length > 0 ? (
          <ul className="card rows">
            {duePlants.map((p) => (
              <PlantRow key={p.id} plant={p} onWater={onWater} />
            ))}
            {dueTasks.map((t) => (
              <TaskRow key={t.id} task={t} onDone={onDone} />
            ))}
            {dueChecks.map((i) => (
              <IssueRow key={i.id} issue={i} onCheck={onCheck} />
            ))}
          </ul>
        ) : (
          <div className="card calm">
            <Icon name="leaf" />
            <div>
              <strong>All caught up</strong>
              <p className="muted">Plant and house reminders will show up here.</p>
            </div>
          </div>
        )}
      </section>

      <section className="group">
        <h2>Lists</h2>
        <ul className="card rows">
          {lists.map((l) => (
            <li key={l.id}>
              <Link className="row link-row" to={`/lists/${l.id}`}>
                <span className="name">{l.name}</span>
                <span className="qty">{counts[l.id] ? `${counts[l.id]} to get` : 'Empty'}</span>
                <Icon name="chevron" size={18} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {toast.node}
    </>
  )
}
