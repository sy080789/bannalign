/** Turns a recipe line like "2 cups all-purpose flour, sifted" into { name: "all-purpose flour", qty: "2 cups" }. */

const UNITS = [
  'cups?', 'c\\.', 'tablespoons?', 'tbsps?\\.?', 'tbs\\.?', 'T\\.?', 'teaspoons?', 'tsps?\\.?', 't\\.',
  'ounces?', 'oz\\.?', 'fl\\.? ?oz\\.?', 'pounds?', 'lbs?\\.?', 'grams?', 'g', 'kilograms?', 'kg', 'ml', 'milliliters?', 'millilitres?',
  'l', 'liters?', 'litres?', 'pints?', 'quarts?', 'qts?\\.?', 'gallons?', 'cloves?', 'cans?', 'jars?', 'packages?', 'pkgs?\\.?',
  'sticks?', 'bunch(?:es)?', 'heads?', 'slices?', 'pinch(?:es)?', 'dash(?:es)?', 'handfuls?', 'sprigs?', 'stalks?', 'pieces?',
  'large', 'medium', 'small',
]

const NUM = '(?:\\d+(?:[.,/]\\d+)?|[½⅓⅔¼¾⅛⅜⅝⅞])'
const QTY_RE = new RegExp(
  `^\\s*((?:${NUM}(?:\\s*[-–]\\s*${NUM})?\\s*(?:${NUM})?\\s*(?:\\(.*?\\)\\s*)?)(?:(?:${UNITS.join('|')})\\b\\.?\\s*)?(?:of\\s+)?)`,
  'i',
)

export function parseIngredient(line: string): { name: string; qty: string } {
  const text = line.replace(/\s+/g, ' ').trim()
  const m = text.match(QTY_RE)
  let qty = m ? m[1].replace(/\s*of\s*$/i, '').trim() : ''
  let name = m ? text.slice(m[1].length) : text
  // "1½ cups plus 1 Tbsp. flour" → qty "1½ cups plus 1 Tbsp."
  const plus = name.match(/^plus\s+/i) && name.slice(5).match(QTY_RE)
  if (plus) {
    qty = `${qty} plus ${plus[1].trim()}`
    name = name.slice(5 + plus[1].length)
  }
  // "Diamond Crystal or ¾ tsp. Morton kosher salt" → "Morton kosher salt"
  const alt = name.match(/\bor\s+(?=[\d½⅓⅔¼¾⅛])/i)
  if (alt?.index !== undefined) {
    const rest = name.slice(alt.index + alt[0].length)
    const q2 = rest.match(QTY_RE)
    if (q2) name = rest.slice(q2[1].length)
  }
  name = name
    .replace(/\(.*?\)/g, '') // "(about 2 cups)"
    .split(/,| - | – /)[0] // ", finely chopped"
    .replace(/\b(?:to taste|optional|divided|for serving|plus more.*)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!name) name = text
  return { name: name.charAt(0).toUpperCase() + name.slice(1), qty }
}

/** Basics most kitchens already have — start unchecked in "Add to Groceries". */
const PANTRY = ['salt', 'pepper', 'black pepper', 'kosher salt', 'sea salt', 'water', 'olive oil', 'vegetable oil', 'oil', 'cooking spray', 'ice', 'sugar']

export function isPantryBasic(name: string): boolean {
  const n = name.toLowerCase().replace(/^(?:freshly )?(?:ground |cracked )?/, '').trim()
  return n.endsWith(' salt') || PANTRY.some((p) => n === p || n === `${p}s` || n.startsWith(`${p} and `))
}
