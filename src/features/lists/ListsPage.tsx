import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { db, type Item, type Recipe } from '../../db'
import { save } from '../../sync'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { AddToListSheet } from '../recipes/AddToListSheet'
import { CATEGORIES } from './categories'
import { byRecipe, groupOf, makeAgain } from './groups'
import { clearChecked, onList, usuals } from './logic'
import { NewGroupSheet } from './NewGroupSheet'
import { QuickAdd } from './QuickAdd'
import { GroupCard, GroupSheet } from './RecipeGroups'

type View = 'recipe' | 'aisle'
const VIEW_KEY = 'groceries-view'
function loadView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'aisle' ? 'aisle' : 'recipe'
  } catch {
    return 'recipe'
  }
}

export function ListsPage() {
  const listId = useParams().listId ?? 'groceries'
  const lists = useLiveQuery(() => db.lists.orderBy('sort').toArray(), [], [])
  const items = useLiveQuery(() => db.items.where('list_id').equals(listId).toArray(), [listId], [])
  const recipes = useLiveQuery(async () => (await db.recipes.toArray()).filter((r) => !r.deleted), [], [])
  const [editing, setEditing] = useState<Item | null>(null)
  const [view, setViewState] = useState<View>(loadView)
  const [newGroup, setNewGroup] = useState(false)
  const [picking, setPicking] = useState<Recipe | null>(null) // ingredient review sheet (new recipe or "Make again")
  const [openGroup, setOpenGroup] = useState<Recipe | null>(null)
  const toast = useToast()

  const groceries = listId === 'groceries'
  const recipeView = groceries && view === 'recipe'
  const setView = (v: View) => {
    setViewState(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* per-device convenience only */
    }
  }

  const current = onList(items)
  const todo = current.filter((i) => !i.checked)
  const done = current.filter((i) => i.checked)
  const usual = usuals(items)
  const aisles = CATEGORIES.map((c) => [c, todo.filter((i) => i.category === c).sort((a, b) => a.name.localeCompare(b.name))] as const).filter(
    ([, g]) => g.length,
  )
  const sections = recipeView ? byRecipe(current, recipes) : []
  const again = groceries ? makeAgain(recipes, current) : []

  const toggle = (i: Item) => save('items', { ...i, checked: !i.checked })
  const row = (i: Item) => (
    <ItemRow key={i.id} item={i} label={recipeView ? undefined : groupOf(i, recipes)?.name} onToggle={toggle} onEdit={setEditing} onStar={star} />
  )

  async function star(i: Item) {
    await save('items', { ...i, staple: !i.staple })
    toast.show(i.staple ? `${i.name} removed from Usuals` : `${i.name} added to Usuals`, () => save('items', i))
  }

  async function clear() {
    const before = done
    const now = new Date().toISOString()
    const shopped = new Set(done.map((i) => groupOf(i, recipes)).filter((r): r is Recipe => !!r))
    for (const r of shopped) await save('recipes', { ...r, last_cooked: now }) // orders "Make again"
    for (const r of clearChecked(done)) await save('items', r)
    toast.show(`Cleared ${before.length} item${before.length === 1 ? '' : 's'}`, () => before.forEach((r) => save('items', r)))
  }

  async function addUsual(i: Item) {
    await save('items', { ...i, in_list: true, checked: false })
    toast.show(`Added ${i.name}`, () => save('items', { ...i }))
  }

  async function deleteRecipe(r: Recipe) {
    await save('recipes', { ...r, deleted: true })
    setPicking(null)
    toast.show(`Deleted ${r.name}`, () => save('recipes', { ...r, deleted: false }))
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
        {groceries && (
          <div className="view-toggle" role="tablist" aria-label="Group by">
            <button role="tab" aria-selected={view === 'recipe'} className={view === 'recipe' ? 'on' : ''} onClick={() => setView('recipe')}>
              By recipe
            </button>
            <button role="tab" aria-selected={view === 'aisle'} className={view === 'aisle' ? 'on' : ''} onClick={() => setView('aisle')}>
              By aisle
            </button>
          </div>
        )}
      </header>

      {groceries && (
        <section className="usuals" aria-label="Recipes">
          <h2>{again.length ? 'Make again' : 'Recipes'}</h2>
          <div className="chips">
            <button className="chip plain" onClick={() => setNewGroup(true)}>
              <Icon name="plus" size={16} /> New recipe
            </button>
            {again.map((r) => (
              <button key={r.id} className="chip" onClick={() => setPicking(r)}>
                {r.name}
              </button>
            ))}
          </div>
        </section>
      )}

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
          <p className="muted">{groceries ? 'Tap “New recipe” to shop for a meal, or star an item to keep it in Usuals.' : 'Star an item to keep it in Usuals for next time.'}</p>
        </div>
      )}

      {sections.map((s) => (
        <GroupCard key={s.recipe?.id ?? 'else'} section={s} recipes={recipes} row={row} onOpen={setOpenGroup} onToast={toast.show} />
      ))}

      {recipeView && done.length > 0 && (
        <button className="btn ghost full clear-all" onClick={clear}>
          Clear {done.length} checked item{done.length === 1 ? '' : 's'}
        </button>
      )}

      {!recipeView &&
        aisles.map(([cat, g]) => (
          <section key={cat} className="group">
            <h2>{cat}</h2>
            <ul className="card rows">{g.map(row)}</ul>
          </section>
        ))}

      {!recipeView && done.length > 0 && (
        <section className="group">
          <div className="group-head">
            <h2>In the cart · {done.length}</h2>
            <button className="btn link" onClick={clear}>
              Clear
            </button>
          </div>
          <ul className="card rows done">{done.map(row)}</ul>
        </section>
      )}

      {newGroup && (
        <NewGroupSheet
          onClose={() => setNewGroup(false)}
          onCreated={(r) => {
            setNewGroup(false)
            setPicking(r)
          }}
        />
      )}
      {picking && (
        <AddToListSheet
          recipe={picking}
          onClose={() => setPicking(null)}
          onDone={(t, undo) => {
            if (view !== 'recipe') setView('recipe')
            toast.show(t, undo)
          }}
          onDelete={again.some((r) => r.id === picking.id) ? () => deleteRecipe(picking) : undefined}
        />
      )}
      {openGroup && (
        <GroupSheet
          recipe={openGroup}
          items={current.filter((i) => groupOf(i, recipes)?.id === openGroup.id)}
          onClose={() => setOpenGroup(null)}
          onToast={toast.show}
        />
      )}
      {editing && (
        <EditSheet
          item={editing}
          recipes={groceries ? recipes : []}
          onClose={() => setEditing(null)}
          onRemoved={(i) => toast.show(`Removed ${i.name}`, () => save('items', i))}
        />
      )}
      {toast.node}
    </>
  )
}

interface RowProps {
  item: Item
  label?: string // recipe name, shown in the aisle view
  onToggle: (i: Item) => void
  onEdit: (i: Item) => void
  onStar: (i: Item) => void
}

function ItemRow({ item, label, onToggle, onEdit, onStar }: RowProps) {
  return (
    <li className={`row ${item.checked ? 'is-done' : ''}`}>
      <button className={`check ${item.checked ? 'on' : ''}`} onClick={() => onToggle(item)} aria-label={item.checked ? `Uncheck ${item.name}` : `Check ${item.name}`}>
        {item.checked && <Icon name="check" size={18} />}
      </button>
      <button className="row-main" onClick={() => onEdit(item)}>
        <span className="name">
          {item.name}
          {label && <small className="source">for {label}</small>}
        </span>
        {item.qty && <span className="qty">{item.qty}</span>}
      </button>
      <button
        className={`star ${item.staple ? 'on' : ''}`}
        onClick={() => onStar(item)}
        aria-pressed={item.staple}
        aria-label={item.staple ? `Remove ${item.name} from Usuals` : `Add ${item.name} to Usuals`}
      >
        <Icon name="star" filled={item.staple} size={20} />
      </button>
    </li>
  )
}

function EditSheet({ item, recipes, onClose, onRemoved }: { item: Item; recipes: Recipe[]; onClose: () => void; onRemoved: (before: Item) => void }) {
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
        {recipes.length > 0 && (
          <label>
            Recipe
            <select value={groupOf(draft, recipes)?.id ?? ''} onChange={(e) => set('source', e.target.value || null)}>
              <option value="">None</option>
              {[...recipes]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </label>
        )}
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
