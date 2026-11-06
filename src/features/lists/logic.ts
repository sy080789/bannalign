import type { Item } from '../../db'
import { guessCategory } from './categories'

export const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * Adding by name: reuse an existing row (history/usual/checked) instead of creating a duplicate.
 * Returns the row to save, or null if it's already on the list and unchecked.
 */
export function addByName(existing: Item[], listId: string, rawName: string, qty = ''): Item | null {
  const name = rawName.trim()
  if (!name) return null
  const match = existing.find((i) => i.list_id === listId && !i.deleted && norm(i.name) === norm(name))
  if (match) {
    if (match.in_list && !match.checked) return null
    return { ...match, in_list: true, checked: false, qty: qty || match.qty }
  }
  return {
    id: crypto.randomUUID(),
    list_id: listId,
    name,
    qty,
    category: guessCategory(name),
    staple: false,
    in_list: true,
    checked: false,
    updated_at: '',
  }
}

/** "Clear checked": staples go back to Usuals, one-offs fall into history. */
export function clearChecked(items: Item[]): Item[] {
  return items.filter((i) => i.in_list && i.checked).map((i) => ({ ...i, in_list: false, checked: false, source: null }))
}

export const onList = (items: Item[]) => items.filter((i) => i.in_list && !i.deleted)
export const usuals = (items: Item[]) =>
  items.filter((i) => i.staple && !i.in_list && !i.deleted).sort((a, b) => a.name.localeCompare(b.name))
