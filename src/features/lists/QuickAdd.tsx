import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db } from '../../db'
import { save } from '../../sync'
import { Icon } from '../../components/Icon'
import { addByName, norm } from './logic'

interface Props {
  listId: string
  onListChange?: (id: string) => void // show a list picker (used on Today)
  onAdded?: (text: string) => void
}

/**
 * No native <datalist>: on iOS, Return accepts the autocomplete suggestion instead of submitting,
 * so previously-used items (e.g. "Milk") couldn't be re-added. We render our own tappable suggestions.
 */
export function QuickAdd({ listId, onListChange, onAdded }: Props) {
  const [text, setText] = useState('')
  const lists = useLiveQuery(() => db.lists.orderBy('sort').toArray(), [], [])
  const items = useLiveQuery(() => db.items.where('list_id').equals(listId).toArray(), [listId], [])
  const listName = lists.find((l) => l.id === listId)?.name ?? 'list'

  const q = norm(text)
  const suggestions = q
    ? items
        .filter((i) => !i.deleted && !(i.in_list && !i.checked) && norm(i.name).includes(q) && norm(i.name) !== q)
        .slice(0, 4)
    : []

  async function add(value: string) {
    setText('') // clear first so fast typing doesn't append to the old value
    const row = addByName(items, listId, value)
    if (row) {
      await save('items', row)
      onAdded?.(`Added ${row.name}`)
    } else if (value.trim()) {
      onAdded?.(`${value.trim()} is already on the list`)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    add(text)
  }

  return (
    <div className="quick-add-wrap">
      <form className="quick-add" onSubmit={submit} autoComplete="off">
        <Icon name="plus" size={20} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Add to ${listName}…`}
          enterKeyHint="go"
          autoCapitalize="sentences"
          autoComplete="off"
          autoCorrect="on"
          aria-label={`Add to ${listName}`}
        />
        {text.trim() ? (
          <button type="submit" className="add-btn">
            Add
          </button>
        ) : (
          onListChange && (
            <select value={listId} onChange={(e) => onListChange(e.target.value)} aria-label="Which list">
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )
        )}
      </form>
      {suggestions.length > 0 && (
        <div className="chips suggest">
          {suggestions.map((i) => (
            <button key={i.id} type="button" className="chip" onClick={() => add(i.name)}>
              <Icon name="plus" size={16} /> {i.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
