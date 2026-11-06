import { describe, expect, it } from 'vitest'
import { duration, extractRecipe } from './extract'
import { isPantryBasic, parseIngredient } from './ingredients'

const page = (ld: unknown, head = '') =>
  `<html><head><title>Fallback Title</title>${head}<script type="application/ld+json">${JSON.stringify(ld)}</script></head></html>`

describe('extractRecipe', () => {
  it('reads a plain Recipe object', () => {
    const r = extractRecipe(
      page({
        '@type': 'Recipe',
        name: 'Fish Tacos &amp; Slaw',
        image: ['/img/tacos.jpg'],
        recipeIngredient: ['1 lb cod', '8 tortillas'],
        recipeInstructions: [{ '@type': 'HowToStep', text: 'Cook fish.' }, { '@type': 'HowToStep', text: 'Serve.' }],
        recipeYield: '4',
        totalTime: 'PT1H5M',
      }),
      'https://example.com/recipes/tacos',
    )
    expect(r).toEqual({
      name: 'Fish Tacos & Slaw',
      image: 'https://example.com/img/tacos.jpg',
      ingredients: ['1 lb cod', '8 tortillas'],
      steps: ['Cook fish.', 'Serve.'],
      servings: '4 servings',
      total_time: '1 hr 5 min',
    })
  })

  it('finds a Recipe inside @graph with HowToSections and ImageObject', () => {
    const r = extractRecipe(
      page({
        '@graph': [
          { '@type': 'WebPage' },
          {
            '@type': ['Recipe', 'NewsArticle'],
            name: 'Lasagna',
            image: { '@type': 'ImageObject', url: 'https://cdn.x/l.jpg' },
            recipeIngredient: ['noodles'],
            recipeInstructions: [{ '@type': 'HowToSection', itemListElement: [{ text: 'Layer.' }, { text: 'Bake.' }] }],
          },
        ],
      }),
      'https://x.com/',
    )
    expect(r.name).toBe('Lasagna')
    expect(r.image).toBe('https://cdn.x/l.jpg')
    expect(r.steps).toEqual(['Layer.', 'Bake.'])
  })

  it('falls back to og tags when there is no recipe data', () => {
    const html = `<html><head><meta property="og:title" content="Reel by @chef"><meta property="og:image" content="https://ig.x/p.jpg"></head></html>`
    expect(extractRecipe(html, 'https://instagram.com/p/1')).toMatchObject({ name: 'Reel by @chef', image: 'https://ig.x/p.jpg', ingredients: [] })
  })

  it('survives invalid JSON-LD', () => {
    const html = `<title>Soup</title><script type="application/ld+json">{oops</script>`
    expect(extractRecipe(html, 'https://x.com').name).toBe('Soup')
  })

  it('formats durations', () => {
    expect(duration('PT45M')).toBe('45 min')
    expect(duration('PT2H')).toBe('2 hr')
    expect(duration(undefined)).toBe('')
  })
})

describe('parseIngredient', () => {
  it.each([
    ['2 cups all-purpose flour, sifted', 'All-purpose flour', '2 cups'],
    ['1 1/2 tsp kosher salt', 'Kosher salt', '1 1/2 tsp'],
    ['½ cup milk', 'Milk', '½ cup'],
    ['3 cloves garlic, minced', 'Garlic', '3 cloves'],
    ['1 (14 oz) can coconut milk', 'Coconut milk', '1 (14 oz) can'],
    ['2-3 large carrots', 'Carrots', '2-3 large'],
    ['Salt and pepper to taste', 'Salt and pepper', ''],
    ['4 eggs', 'Eggs', '4'],
    ['1 lb ground beef', 'Ground beef', '1 lb'],
    ['1½ cups plus 1 Tbsp. (200 g) all-purpose flour (spooning into cups)', 'All-purpose flour', '1½ cups plus 1 Tbsp.'],
    ['1¼ tsp. (4 g) Diamond Crystal or ¾ tsp. (4 g) Morton kosher salt', 'Morton kosher salt', '1¼ tsp.'],
  ])('%s', (line, name, qty) => {
    expect(parseIngredient(line)).toEqual({ name, qty })
  })
})

describe('isPantryBasic', () => {
  it('flags basics but not real groceries', () => {
    expect(isPantryBasic('Kosher salt')).toBe(true)
    expect(isPantryBasic('Freshly ground black pepper')).toBe(true)
    expect(isPantryBasic('Salt and pepper')).toBe(true)
    expect(isPantryBasic('Olive oil')).toBe(true)
    expect(isPantryBasic('Morton kosher salt')).toBe(true)
    expect(isPantryBasic('Bell pepper')).toBe(false)
    expect(isPantryBasic('Coconut milk')).toBe(false)
  })
})
