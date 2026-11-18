import { useState, type FormEvent } from 'react'
import { db, type Item, type Recipe } from '../../db'
import { save } from '../../sync'
import { Icon } from '../../components/Icon'
import { parseIngredient } from '../recipes/ingredients'
import { addToGroup, type Section } from './groups'
import { norm } from './logic'

interface CardProps {
  section: Section
  recipes: Recipe[]
  row: (i: Item) => React.ReactNode
  onOpen: (r: Recipe) => void
  onToast: (text: string, undo?: () => void) => void
}

/** One recipe's items together, with progress, collapse and an inline "Add to …" row. */
export function GroupCard({ section, recipes, row, onOpen, onToast }: CardProps) {
  const { recipe, items, done } = section
  const [open, setOpen] = useState(true)
  const [text, setText] = useState('')
  const complete = items.length > 0 && done === items.length

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!recipe) return
    const line = text.trim()
    setText('')
    if (!line) return
    const { name, qty } = parseIngredient(line)
    const existing = await db.items.where('list_id').equals('groceries').toArray()
    const r = addToGroup(existing, 'groceries', name, qty, recipe, recipes)
    if (!r) return onToast(`${name} is already in ${recipe.name}`)
    await save('items', r)
    // Remember it for "Make again".
    if (!recipe.ingredients.some((l) => norm(parseIngredient(l).name) === norm(name))) {
      await save('recipes', { ...recipe, ingredients: [...recipe.ingredients, line] })
    }
  }

  return (
    <section className={`group recipe-group ${complete ? 'complete' : ''}`}>
      <div className="rg-head">
        {recipe ? (
          <button className="rg-title" onClick={() => onOpen(recipe)}>
            {recipe.name}
          </button>
        ) : (
          <h2 className="rg-title plain">Everything else</h2>
        )}
        <span className="rg-count">
          {complete ? <Icon name="check" size={16} /> : null}
          {done}/{items.length}
        </span>
        <button className={`icon-btn rg-toggle ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Collapse' : 'Expand'}>
          <Icon name="chevron" size={20} />
        </button>
      </div>
      {open && (
        <ul className="card rows">
          {items.map(row)}
          {recipe && (
            <li>
              <form className="row rg-add" onSubmit={add}>
                <Icon name="plus" size={18} />
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Add to ${recipe.name}…`} enterKeyHint="go" aria-label={`Add to ${recipe.name}`} />
              </form>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

/** Tap a group's name: rename it, open the original recipe, or take it off the list. */
export function GroupSheet({ recipe, items, onClose, onToast }: { recipe: Recipe; items: Item[]; onClose: () => void; onToast: (t: string, undo?: () => void) => void }) {
  const [name, setName] = useState(recipe.name)

  async function done() {
    if (name.trim() && name.trim() !== recipe.name) await save('recipes', { ...recipe, name: name.trim() })
    onClose()
  }

  async function takeOff() {
    const before = items
    for (const i of before) await save('items', { ...i, in_list: false, checked: false, source: null })
    onToast(`Took ${recipe.name} off the list`, () => before.forEach((i) => save('items', i)))
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={done}>
      <div className="sheet" role="dialog" aria-label={recipe.name} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Recipe group</h2>
          <button className="icon-btn" onClick={done} aria-label="Done">
            <Icon name="close" />
          </button>
        </div>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {recipe.source_url && (
          <a className="btn ghost" href={recipe.source_url} target="_blank" rel="noreferrer">
            View recipe ↗
          </a>
        )}
        <div className="sheet-actions">
          <button className="btn danger" onClick={takeOff}>
            Take off list
          </button>
          <button className="btn primary" onClick={done}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
