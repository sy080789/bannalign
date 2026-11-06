import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db } from '../../db'
import { save } from '../../sync'
import { Icon } from '../../components/Icon'
import { addByName } from './logic'

interface Props {
  listId: string
  onListChange?: (id: string) => void // show a list picker (used on Today)
  onAdded?: (text: string) => void
}

export function QuickAdd({ listId, onListChange, onAdded }: Props) {
  const [text, setText] = useState('')
  const lists = useLiveQuery(() => db.lists.orderBy('sort').toArray(), [], [])
  const items = useLiveQuery(() => db.items.where('list_id').equals(listId).toArray(), [listId], [])
  const listName = lists.find((l) => l.id === listId)?.name ?? 'list'
  const suggestions = items.filter((i) => !i.in_list && !i.deleted)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const value = text
    setText('') // clear first so fast typing doesn't append to the old value
    const row = addByName(items, listId, value)
    if (row) {
      await save('items', row)
      onAdded?.(`Added ${row.name}`)
    } else if (value.trim()) {
      onAdded?.(`${value.trim()} is already on the list`)
    }
  }

  return (
    <form className="quick-add" onSubmit={submit}>
      <Icon name="plus" size={20} />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Add to ${listName}…`}
        list={`hist-${listId}`}
        enterKeyHint="done"
        autoCapitalize="sentences"
        aria-label={`Add to ${listName}`}
      />
      <datalist id={`hist-${listId}`}>
        {suggestions.map((i) => (
          <option key={i.id} value={i.name} />
        ))}
      </datalist>
      {onListChange && (
        <select value={listId} onChange={(e) => onListChange(e.target.value)} aria-label="Which list">
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      )}
    </form>
  )
}
