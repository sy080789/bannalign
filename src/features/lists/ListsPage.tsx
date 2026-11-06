import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { db, type Item } from '../../db'
import { save } from '../../sync'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { CATEGORIES } from './categories'
import { clearChecked, onList, usuals } from './logic'
import { QuickAdd } from './QuickAdd'

export function ListsPage() {
  const listId = useParams().listId ?? 'groceries'
  const lists = useLiveQuery(() => db.lists.orderBy('sort').toArray(), [], [])
  const items = useLiveQuery(() => db.items.where('list_id').equals(listId).toArray(), [listId], [])
  const [editing, setEditing] = useState<Item | null>(null)
  const toast = useToast()

  const current = onList(items)
  const todo = current.filter((i) => !i.checked)
  const done = current.filter((i) => i.checked)
  const usual = usuals(items)
  const groups = CATEGORIES.map((c) => [c, todo.filter((i) => i.category === c).sort((a, b) => a.name.localeCompare(b.name))] as const).filter(
    ([, g]) => g.length,
  )

  const toggle = (i: Item) => save('items', { ...i, checked: !i.checked })

  async function clear() {
    const before = done
    for (const r of clearChecked(done)) await save('items', r)
    toast.show(`Cleared ${before.length} item${before.length === 1 ? '' : 's'}`, () => before.forEach((r) => save('items', r)))
  }

  async function addUsual(i: Item) {
    await save('items', { ...i, in_list: true, checked: false })
    toast.show(`Added ${i.name}`, () => save('items', { ...i }))
  }

  return (
    <>
      <header className="page-head">
        <div className="segmented" role="tablist">
          {lists.map((l) => (
            <NavLink key={l.id} to={`/lists/${l.id}`} className={() => (l.id === listId ? 'seg active' : 'seg')}>
              {l.name}
              <span className="count">{l.id === listId ? todo.length || '' : ''}</span>
            </NavLink>
          ))}
        </div>
        <QuickAdd listId={listId} onAdded={(t) => toast.show(t)} />
      </header>

      {usual.length > 0 && (
        <section className="usuals" aria-label="Usuals">
          <h2>Usuals</h2>
          <div className="chips">
            {usual.map((i) => (
              <button key={i.id} className="chip" onClick={() => addUsual(i)}>
                <Icon name="plus" size={16} /> {i.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {todo.length === 0 && done.length === 0 && (
        <div className="empty small">
          <p>Nothing on this list.</p>
          <p className="muted">Star an item to keep it in Usuals for next time.</p>
        </div>
      )}

      {groups.map(([cat, g]) => (
        <section key={cat} className="group">
          <h2>{cat}</h2>
          <ul className="card rows">
            {g.map((i) => (
              <ItemRow key={i.id} item={i} onToggle={toggle} onEdit={setEditing} />
            ))}
          </ul>
        </section>
      ))}

      {done.length > 0 && (
        <section className="group">
          <div className="group-head">
            <h2>In the cart · {done.length}</h2>
            <button className="btn link" onClick={clear}>
              Clear
            </button>
          </div>
          <ul className="card rows done">
            {done.map((i) => (
              <ItemRow key={i.id} item={i} onToggle={toggle} onEdit={setEditing} />
            ))}
          </ul>
        </section>
      )}

      {editing && <EditSheet item={editing} onClose={() => setEditing(null)} onRemoved={(i) => toast.show(`Removed ${i.name}`, () => save('items', i))} />}
      {toast.node}
    </>
  )
}

function ItemRow({ item, onToggle, onEdit }: { item: Item; onToggle: (i: Item) => void; onEdit: (i: Item) => void }) {
  return (
    <li className="row">
      <button className={`check ${item.checked ? 'on' : ''}`} onClick={() => onToggle(item)} aria-label={item.checked ? `Uncheck ${item.name}` : `Check ${item.name}`}>
        {item.checked && <Icon name="check" size={18} />}
      </button>
      <button className="row-main" onClick={() => onEdit(item)}>
        <span className="name">{item.name}</span>
        {item.qty && <span className="qty">{item.qty}</span>}
      </button>
      {item.staple && (
        <span className="star" aria-label="Usual">
          <Icon name="star" filled size={16} />
        </span>
      )}
    </li>
  )
}

function EditSheet({ item, onClose, onRemoved }: { item: Item; onClose: () => void; onRemoved: (before: Item) => void }) {
  const [draft, setDraft] = useState(item)
  const set = <K extends keyof Item>(k: K, v: Item[K]) => setDraft((d) => ({ ...d, [k]: v }))

  async function done() {
    if (JSON.stringify(draft) !== JSON.stringify(item)) await save('items', { ...draft, name: draft.name.trim() || item.name })
    onClose()
  }
  async function remove() {
    // Staples stay in Usuals; one-offs go to history.
    await save('items', { ...item, in_list: false, checked: false })
    onRemoved(item)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={done}>
      <div className="sheet" role="dialog" aria-label={`Edit ${item.name}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Edit item</h2>
          <button className="icon-btn" onClick={done} aria-label="Done">
            <Icon name="close" />
          </button>
        </div>
        <label>
          Name
          <input value={draft.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label>
          Amount or note
          <input value={draft.qty} placeholder="e.g. 2, 1 lb, the big one" onChange={(e) => set('qty', e.target.value)} />
        </label>
        <label>
          Aisle
          <select value={draft.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="toggle">
          <span>
            Usual
            <small>Keep it handy to re-add after shopping</small>
          </span>
          <input type="checkbox" checked={draft.staple} onChange={(e) => set('staple', e.target.checked)} />
        </label>
        <div className="sheet-actions">
          {item.in_list && (
            <button className="btn danger" onClick={remove}>
              Remove from list
            </button>
          )}
          <button className="btn primary" onClick={done}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
