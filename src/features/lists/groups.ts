import type { Item, Recipe } from '../../db'
import { CATEGORIES, guessCategory } from './categories'
import { norm } from './logic'

/**
 * Recipe groups on Groceries. A group is a `recipes` row; an item belongs to it via `items.source`
 * = recipe id. Older items stored the recipe *name* in `source`, so we fall back to matching by name.
 */
export function groupOf(item: Item, recipes: Recipe[]): Recipe | undefined {
  if (!item.source) return undefined
  return recipes.find((r) => r.id === item.source) ?? recipes.find((r) => norm(r.name) === norm(item.source!))
}

/**
 * Add an item to a recipe group. Each recipe keeps its own line, so onions for tacos and onions for
 * soup are two rows. Reuses an off-list row (history/usual) rather than duplicating it.
 * Returns the row to save, or null if it's already on the list for this group.
 */
export function addToGroup(existing: Item[], listId: string, rawName: string, qty: string, recipe: Recipe, recipes: Recipe[]): Item | null {
  const name = rawName.trim()
  if (!name) return null
  const same = existing.filter((i) => i.list_id === listId && !i.deleted && norm(i.name) === norm(name))
  const mine = same.find((i) => i.in_list && groupOf(i, recipes)?.id === recipe.id)
  if (mine) return mine.checked ? { ...mine, checked: false, source: recipe.id } : null
  const spare = same.find((i) => !i.in_list)
  if (spare) return { ...spare, in_list: true, checked: false, qty: qty || spare.qty, source: recipe.id }
  return {
    id: crypto.randomUUID(),
    list_id: listId,
    name,
    qty,
    category: same[0]?.category ?? guessCategory(name),
    staple: false,
    in_list: true,
    checked: false,
    source: recipe.id,
    updated_at: '',
  }
}

export interface Section {
  recipe: Recipe | null // null = "Everything else"
  items: Item[] // unchecked first, then checked
  done: number
}

const byName = (a: Item, b: Item) => a.name.localeCompare(b.name)

/** "By recipe" view: one section per recipe with items on the list, then everything else. */
export function byRecipe(onList: Item[], recipes: Recipe[]): Section[] {
  const map = new Map<string, Section>()
  const loose: Item[] = []
  for (const i of onList) {
    const r = groupOf(i, recipes)
    if (!r) {
      loose.push(i)
      continue
    }
    const s = map.get(r.id) ?? { recipe: r, items: [], done: 0 }
    s.items.push(i)
    map.set(r.id, s)
  }
  const sections = [...map.values()].sort((a, b) => a.recipe!.name.localeCompare(b.recipe!.name))
  if (loose.length) sections.push({ recipe: null, items: loose, done: 0 })
  for (const s of sections) {
    const aisle = (i: Item) => CATEGORIES.indexOf(i.category)
    const todo = s.items.filter((i) => !i.checked).sort((a, b) => aisle(a) - aisle(b) || byName(a, b)) // store order
    const done = s.items.filter((i) => i.checked).sort(byName)
    s.items = [...todo, ...done]
    s.done = done.length
  }
  return sections
}

/** Saved recipes with nothing on the list right now, most recently shopped first. */
export function makeAgain(recipes: Recipe[], onList: Item[]): Recipe[] {
  const active = new Set(onList.map((i) => groupOf(i, recipes)?.id).filter(Boolean))
  return recipes
    .filter((r) => !r.deleted && !active.has(r.id))
    .sort((a, b) => (b.last_cooked ?? b.updated_at).localeCompare(a.last_cooked ?? a.updated_at))
}
