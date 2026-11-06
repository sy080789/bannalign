import { useState } from 'react'
import { db, type Recipe } from '../../db'
import { save } from '../../sync'
import { Icon } from '../../components/Icon'
import { addByName } from '../lists/logic'
import { isPantryBasic, parseIngredient } from './ingredients'

interface Row {
  on: boolean
  name: string
  qty: string
}

/** Review recipe ingredients before they go on Groceries: uncheck what you have, fix names. */
export function AddToListSheet({ recipe, onClose, onDone }: { recipe: Recipe; onClose: () => void; onDone: (text: string, undo: () => void) => void }) {
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
    const working = [...before]
    const touched: string[] = []
    let skipped = 0
    for (const r of rows.filter((x) => x.on && x.name.trim())) {
      const row = addByName(working, listId, r.name, r.qty)
      if (!row) {
        skipped++
        continue
      }
      const withSource = { ...row, source: recipe.name }
      await save('items', withSource)
      touched.push(withSource.id)
      const idx = working.findIndex((w) => w.id === withSource.id)
      if (idx >= 0) working[idx] = withSource
      else working.push(withSource)
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
    onDone(`Added ${added} item${added === 1 ? '' : 's'} to Groceries${skipped ? ` · ${skipped} already there` : ''}`, undo)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet tall" role="dialog" aria-label="Add to Groceries" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Add to Groceries</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <p className="muted small-note">Uncheck anything you already have.</p>
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
        <button className="btn primary" disabled={!count} onClick={add}>
          Add {count} item{count === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  )
}
