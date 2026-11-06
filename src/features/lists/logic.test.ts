import { describe, expect, it } from 'vitest'
import type { Item } from '../../db'
import { guessCategory } from './categories'
import { addByName, clearChecked, usuals } from './logic'

const item = (p: Partial<Item>): Item => ({
  id: 'x', list_id: 'groceries', name: 'Milk', qty: '', category: 'Dairy & Eggs',
  staple: false, in_list: true, checked: false, updated_at: '', ...p,
})

describe('categories', () => {
  it('prefers longer keywords', () => {
    expect(guessCategory('Vanilla ice cream')).toBe('Frozen')
    expect(guessCategory('Peanut butter')).toBe('Pantry')
    expect(guessCategory('Oat milk')).toBe('Dairy & Eggs')
    expect(guessCategory('Lightbulbs')).toBe('Other')
  })
})

describe('addByName', () => {
  it('ignores duplicates already on the list', () => {
    expect(addByName([item({})], 'groceries', ' milk ')).toBeNull()
  })
  it('revives a usual instead of duplicating', () => {
    const r = addByName([item({ staple: true, in_list: false })], 'groceries', 'Milk')
    expect(r).toMatchObject({ id: 'x', in_list: true, staple: true })
  })
  it('re-adds a checked item as unchecked', () => {
    expect(addByName([item({ checked: true })], 'groceries', 'Milk')).toMatchObject({ checked: false })
  })
  it('creates new items with a guessed category', () => {
    expect(addByName([], 'groceries', 'Bananas')).toMatchObject({ category: 'Produce', in_list: true })
  })
})

describe('clearChecked', () => {
  it('returns staples to Usuals and one-offs to history', () => {
    const cleared = clearChecked([item({ id: 'a', staple: true, checked: true }), item({ id: 'b', checked: true }), item({ id: 'c' })])
    expect(cleared.map((i) => i.id)).toEqual(['a', 'b'])
    expect(usuals(cleared).map((i) => i.id)).toEqual(['a'])
  })
})
