/** Aisle order for grouping. "Other" is the catch-all. */
export const CATEGORIES = [
  'Produce',
  'Bakery',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Pantry',
  'Frozen',
  'Drinks',
  'Cleaning',
  'Paper & Toiletries',
  'Other',
] as const

const KEYWORDS: Record<string, string[]> = {
  Produce: ['apple', 'banana', 'lettuce', 'tomato', 'onion', 'potato', 'carrot', 'avocado', 'lemon', 'lime', 'berries', 'berry', 'spinach', 'pepper', 'garlic', 'cucumber', 'grape', 'orange', 'broccoli', 'celery', 'herb', 'cilantro', 'basil', 'ginger', 'mushroom', 'kale', 'zucchini', 'fruit'],
  Bakery: ['bread', 'bagel', 'tortilla', 'bun', 'muffin', 'croissant', 'pita'],
  'Dairy & Eggs': ['milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'egg', 'cream'],
  'Meat & Seafood': ['chicken', 'beef', 'pork', 'salmon', 'fish', 'turkey', 'bacon', 'sausage', 'shrimp', 'steak', 'ham', 'tuna'],
  Pantry: ['rice', 'pasta', 'flour', 'sugar', 'oil', 'cereal', 'beans', 'sauce', 'spice', 'salt', 'coffee', 'tea', 'snack', 'chips', 'crackers', 'oats', 'honey', 'vinegar', 'soup', 'noodle', 'peanut butter', 'jam'],
  Frozen: ['frozen', 'ice cream', 'ice'],
  Drinks: ['water', 'juice', 'soda', 'beer', 'wine', 'kombucha', 'sparkling'],
  Cleaning: ['detergent', 'soap', 'bleach', 'sponge', 'wipes', 'trash bag', 'garbage bag', 'dish', 'cleaner', 'laundry', 'dryer sheet'],
  'Paper & Toiletries': ['paper towel', 'toilet paper', 'tissue', 'shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'deodorant', 'floss', 'razor', 'lotion', 'diaper', 'napkin'],
}

// Longest keyword first so "ice cream" beats "cream" and "peanut butter" beats "butter".
const ORDERED = Object.entries(KEYWORDS)
  .flatMap(([cat, words]) => words.map((w) => [w, cat] as const))
  .sort((a, b) => b[0].length - a[0].length)

export function guessCategory(name: string): string {
  const n = name.toLowerCase()
  return ORDERED.find(([w]) => n.includes(w))?.[1] ?? 'Other'
}
