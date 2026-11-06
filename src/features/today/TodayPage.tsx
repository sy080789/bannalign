import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../../db'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { QuickAdd } from '../lists/QuickAdd'

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

  // Phase 3/4 features will push due/overdue cards in here (maintenance, plants).
  const attention: { id: string; text: string }[] = []

  return (
    <>
      <header className="page-head">
        <p className="date">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1>{greeting()}</h1>
        <QuickAdd listId={listId} onListChange={setListId} onAdded={(t) => toast.show(t)} />
      </header>

      <section className="group">
        <h2>Needs attention</h2>
        {attention.length === 0 ? (
          <div className="card calm">
            <Icon name="leaf" />
            <div>
              <strong>All caught up</strong>
              <p className="muted">Plant and house reminders will show up here.</p>
            </div>
          </div>
        ) : null}
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
