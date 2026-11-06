import Dexie, { type EntityTable } from 'dexie'

/** Every synced row carries these. `updated_at` drives last-write-wins; `deleted` is a soft delete. */
export interface Row {
  id: string
  updated_at: string
  deleted?: boolean
}

export interface List extends Row {
  name: string
  sort: number
}

/**
 * One table holds everything about an item:
 *  - in_list=true            → on the list now (checked = in the cart)
 *  - in_list=false, staple   → in the "Usuals" drawer, one tap to re-add
 *  - in_list=false, !staple  → history, used only for autocomplete
 */
export interface Item extends Row {
  list_id: string
  name: string
  qty: string
  category: string
  staple: boolean
  in_list: boolean
  checked: boolean
}

export type TableName = 'lists' | 'items'

export interface OutboxEntry {
  key: string // `${table}:${id}` — one entry per row, so repeated edits coalesce
  table: TableName
  row: Row
}

export interface Meta {
  key: string
  value: string
}

export const db = new Dexie('bannalign') as Dexie & {
  lists: EntityTable<List, 'id'>
  items: EntityTable<Item, 'id'>
  outbox: EntityTable<OutboxEntry, 'key'>
  meta: EntityTable<Meta, 'key'>
}

db.version(1).stores({
  lists: 'id, sort',
  items: 'id, list_id',
  outbox: 'key',
  meta: 'key',
})

export const DEFAULT_LISTS: Omit<List, 'updated_at'>[] = [
  { id: 'groceries', name: 'Groceries', sort: 0 },
  { id: 'household', name: 'Household', sort: 1 },
]

/** Fixed ids so both phones agree on the two default lists without duplicating them. */
export async function seedDefaults() {
  const epoch = new Date(0).toISOString()
  await db.transaction('rw', db.lists, async () => {
    for (const l of DEFAULT_LISTS) {
      if (!(await db.lists.get(l.id))) await db.lists.put({ ...l, updated_at: epoch })
    }
  })
}
