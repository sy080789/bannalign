/** Pulls a recipe out of a web page's HTML. Pure (no network) so it can be unit-tested. */

export interface Scraped {
  name: string
  image: string
  ingredients: string[]
  steps: string[]
  servings: string
  total_time: string
}

type Json = Record<string, unknown>

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', deg: '°' }

export function decode(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
      if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
      return ENTITIES[e.toLowerCase()] ?? m
    })
    .replace(/\s+/g, ' ')
    .trim()
}

const str = (v: unknown): string => (typeof v === 'string' ? decode(v) : typeof v === 'number' ? String(v) : '')

function isRecipe(o: Json): boolean {
  const t = o['@type']
  return t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))
}

/** Depth-first search through JSON-LD (handles arrays, @graph, nesting). */
function findRecipe(node: unknown): Json | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipe(n)
      if (r) return r
    }
    return null
  }
  if (node && typeof node === 'object') {
    const o = node as Json
    if (isRecipe(o)) return o
    for (const key of ['@graph', 'mainEntity', 'itemListElement']) {
      if (key in o) {
        const r = findRecipe(o[key])
        if (r) return r
      }
    }
  }
  return null
}

function image(v: unknown): string {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return image(v[0])
  if (v && typeof v === 'object') return str((v as Json).url) || str((v as Json)['@id'])
  return ''
}

function steps(v: unknown): string[] {
  if (typeof v === 'string') return v.split(/\n+|(?<=\.)\s+(?=[A-Z])/).map(decode).filter(Boolean)
  if (!Array.isArray(v)) return []
  return v.flatMap((s) => {
    if (typeof s === 'string') return [decode(s)]
    const o = s as Json
    if (o?.['@type'] === 'HowToSection') return steps(o.itemListElement)
    return [str(o?.text) || str(o?.name)]
  }).filter(Boolean)
}

/** ISO 8601 duration (PT1H30M) → "1 hr 30 min". */
export function duration(v: unknown): string {
  const m = typeof v === 'string' && v.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/)
  if (!m) return ''
  const h = Number(m[1] ?? 0) * 24 + Number(m[2] ?? 0)
  const min = Number(m[3] ?? 0)
  return [h && `${h} hr`, min && `${min} min`].filter(Boolean).join(' ')
}

function yieldText(v: unknown): string {
  const s = Array.isArray(v) ? str(v.find((x) => typeof x === 'string' && /\D/.test(x)) ?? v[0]) : str(v)
  return /^\d+$/.test(s) ? `${s} servings` : s
}

function meta(html: string, prop: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i')
  const tag = html.match(re)?.[0]
  return tag ? decode(tag.match(/content=["']([^"']*)["']/i)?.[1] ?? '') : ''
}

export function extractRecipe(html: string, pageUrl: string): Scraped {
  let recipe: Json | null = null
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      recipe = findRecipe(JSON.parse(m[1].trim()))
    } catch {
      continue // some sites ship invalid JSON-LD; skip that block
    }
    if (recipe) break
  }

  const title = meta(html, 'og:title') || decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
  const ogImage = meta(html, 'og:image')
  const abs = (u: string) => {
    try {
      return u ? new URL(u, pageUrl).href : ''
    } catch {
      return ''
    }
  }

  if (!recipe) return { name: title, image: abs(ogImage), ingredients: [], steps: [], servings: '', total_time: '' }

  const ingredients = (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : recipe.ingredients ?? [])
  return {
    name: str(recipe.name) || title,
    image: abs(image(recipe.image) || ogImage),
    ingredients: (Array.isArray(ingredients) ? ingredients : []).map(str).filter(Boolean),
    steps: steps(recipe.recipeInstructions),
    servings: yieldText(recipe.recipeYield),
    total_time: duration(recipe.totalTime) || duration(recipe.cookTime),
  }
}
