import { useState } from 'react'
import { db, type Recipe } from '../../db'
import { save } from '../../sync'
import { Icon } from '../../components/Icon'
import { addToGroup } from '../lists/groups'
import { isPantryBasic, parseIngredient } from './ingredients'

interface Row {
  on: boolean
  name: string
  qty: string
}

interface Props {
  recipe: Recipe
  onClose: () => void
  onDone: (text: string, undo: () => void) => void
  onDelete?: () => void // shown for saved recipes in "Make again"
}

/** Review a recipe's ingredients before they go on Groceries as a group: uncheck what you have, fix names. */
export function AddToListSheet({ recipe, onClose, onDone, onDelete }: Props) {
  const [rows, setRows] = useState<Row[]>(() =>
    recipe.ingredients.map((line) => {
      const p = parseIngredient(line)
      return { ...p, on: !isPantryBasic(p.name) }
    }),
  )
  const count = rows.filter((r) => r.on && r.name.trim()).length
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  async function add() {
    const listId = 'groceries'
    const before = await db.items.where('list_id').equals(listId).toArray()
    const recipes = (await db.recipes.toArray()).filter((r) => !r.deleted)
    const working = [...before]
    const touched: string[] = []
    let skipped = 0
    for (const r of rows.filter((x) => x.on && x.name.trim())) {
      const row = addToGroup(working, listId, r.name, r.qty, recipe, recipes)
      if (!row) {
        skipped++
        continue
      }
      await save('items', row)
      touched.push(row.id)
      const idx = working.findIndex((w) => w.id === row.id)
      if (idx >= 0) working[idx] = row
      else working.push(row)
    }
    const undo = async () => {
      for (const id of touched) {
        const prev = before.find((b) => b.id === id)
        if (prev) await save('items', prev)
        else {
          const cur = await db.items.get(id)
          if (cur) await save('items', { ...cur, in_list: false, checked: false })
        }
      }
    }
    const added = touched.length
    onDone(`Added ${added} item${added === 1 ? '' : 's'} for ${recipe.name}${skipped ? ` · ${skipped} already there` : ''}`, undo)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet tall" role="dialog" aria-label={`Add ${recipe.name}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{recipe.name}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <p className="muted small-note">
          Uncheck anything you already have.
          {recipe.source_url && (
            <>
              {' '}
              <a href={recipe.source_url} target="_blank" rel="noreferrer">
                View recipe ↗
              </a>
            </>
          )}
        </p>
        {rows.length > 0 ? (
          <ul className="card rows ing-pick">
            {rows.map((r, i) => (
              <li key={i} className="row">
                <button className={`check ${r.on ? 'on' : ''}`} onClick={() => set(i, { on: !r.on })} aria-label={r.on ? `Skip ${r.name}` : `Include ${r.name}`}>
                  {r.on && <Icon name="check" size={18} />}
                </button>
                <input className="bare" value={r.name} onChange={(e) => set(i, { name: e.target.value })} aria-label="Item" />
                <input className="bare qty-in" value={r.qty} placeholder="amt" onChange={(e) => set(i, { qty: e.target.value })} aria-label="Amount" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small-note">No ingredients saved for this one yet.</p>
        )}
        <button className="btn primary" disabled={!count} onClick={add}>
          Add {count} item{count === 1 ? '' : 's'}
        </button>
        {onDelete && (
          <button className="btn link" onClick={onDelete}>
            Delete this recipe
          </button>
        )}
      </div>
    </div>
  )
}
