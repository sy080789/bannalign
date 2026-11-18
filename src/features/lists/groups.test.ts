import { describe, expect, it } from 'vitest'
import type { Item, Recipe } from '../../db'
import { addToGroup, byRecipe, groupOf, makeAgain } from './groups'

const item = (p: Partial<Item>): Item => ({
  id: crypto.randomUUID(), list_id: 'groceries', name: 'Onion', qty: '', category: 'Produce',
  staple: false, in_list: true, checked: false, updated_at: '', ...p,
})
const recipe = (p: Partial<Recipe>): Recipe => ({
  id: crypto.randomUUID(), name: 'Tacos', source_url: '', image_url: '', servings: '', total_time: '',
  ingredients: [], steps: [], notes: '', tags: [], favorite: false, last_cooked: null, updated_at: '', ...p,
})

const tacos = recipe({ id: 't', name: 'Tacos' })
const soup = recipe({ id: 's', name: 'Soup' })
const all = [tacos, soup]

describe('groupOf', () => {
  it('matches by id, and by name for older items', () => {
    expect(groupOf(item({ source: 't' }), all)).toBe(tacos)
    expect(groupOf(item({ source: 'Soup' }), all)).toBe(soup)
    expect(groupOf(item({ source: null }), all)).toBeUndefined()
  })
})

describe('addToGroup', () => {
  it('gives each recipe its own line for a shared ingredient', () => {
    const onion = item({ source: 't' })
    const r = addToGroup([onion], 'groceries', 'onion', '1', soup, all)
    expect(r).toMatchObject({ source: 's', in_list: true })
    expect(r!.id).not.toBe(onion.id)
  })
  it('skips an item already on the list for the same recipe', () => {
    expect(addToGroup([item({ source: 't' })], 'groceries', 'Onion', '', tacos, all)).toBeNull()
  })
  it('reuses a history row instead of duplicating', () => {
    const old = item({ in_list: false, staple: true })
    expect(addToGroup([old], 'groceries', 'Onion', '2', tacos, all)).toMatchObject({ id: old.id, source: 't', qty: '2', staple: true })
  })
})

describe('byRecipe', () => {
  it('groups by recipe, puts loose items last, and checked items at the bottom of each', () => {
    const items = [
      item({ name: 'Limes', source: 't', checked: true }),
      item({ name: 'Cod', source: 't' }),
      item({ name: 'Lentils', source: 's' }),
      item({ name: 'Paper towels', source: null }),
    ]
    const s = byRecipe(items, all)
    expect(s.map((x) => x.recipe?.name ?? 'else')).toEqual(['Soup', 'Tacos', 'else'])
    expect(s[1].items.map((i) => i.name)).toEqual(['Cod', 'Limes'])
    expect(s[1].done).toBe(1)
  })
})

describe('makeAgain', () => {
  it('lists recipes with nothing on the list, most recently shopped first', () => {
    const old = recipe({ name: 'Old', last_cooked: '2026-01-01' })
    const recent = recipe({ name: 'Recent', last_cooked: '2026-10-01' })
    expect(makeAgain([tacos, old, recent], [item({ source: 't' })]).map((r) => r.name)).toEqual(['Recent', 'Old'])
  })
})
