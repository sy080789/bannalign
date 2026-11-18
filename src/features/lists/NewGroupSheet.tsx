import { useState } from 'react'
import type { Recipe } from '../../db'
import { save } from '../../sync'
import { Icon } from '../../components/Icon'
import { scrapeRecipe } from '../recipes/api'

const lines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-•*▢□]|\d+[.)])\s*/, '').trim()) // strip bullets / "1." from pasted captions
    .filter(Boolean)

/** "…/recipe/158968/spinach-and-feta-turkey-burgers/" → "Spinach and feta turkey burgers" */
function nameFromUrl(raw: string): string {
  try {
    const seg = new URL(raw).pathname.split('/').filter((s) => s && !/^\d+$/.test(s) && s !== 'recipe' && s !== 'recipes').pop() ?? ''
    const words = decodeURIComponent(seg).replace(/\.\w+$/, '').replace(/[-_]+/g, ' ').replace(/\brecipe\b/gi, '').trim()
    return words ? words.charAt(0).toUpperCase() + words.slice(1) : ''
  } catch {
    return ''
  }
}

/** Start a recipe group: a name, ingredients typed/pasted or imported from a link. Then the review sheet takes over. */
export function NewGroupSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (r: Recipe) => void }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [ing, setIng] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function importLink() {
    setBusy(true)
    setStatus('Reading the recipe…')
    try {
      const s = await scrapeRecipe(url.trim())
      setName((n) => s.name || n)
      if (s.ingredients.length) setIng(s.ingredients.join('\n'))
      setStatus(s.ingredients.length ? '' : 'Couldn’t find the ingredients on that page. Paste them below.')
    } catch (e) {
      setName((n) => n || nameFromUrl(url))
      setStatus(
        e instanceof Error && e.message === 'blocked'
          ? 'This site doesn’t allow automatic import. Open the link, copy the ingredients, and paste them below.'
          : 'Couldn’t read that page. Paste the ingredients below.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function next() {
    const r: Recipe = {
      id: crypto.randomUUID(),
      name: name.trim(),
      source_url: url.trim(),
      image_url: '',
      servings: '',
      total_time: '',
      ingredients: lines(ing),
      steps: [],
      notes: '',
      tags: [],
      favorite: false,
      last_cooked: null,
      updated_at: '',
    }
    await save('recipes', r)
    onCreated(r)
  }

  const ready = name.trim() && lines(ing).length > 0 && !busy

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet tall" role="dialog" aria-label="New recipe group" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>New recipe group</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <label>
          Recipe
          <input value={name} placeholder="e.g. Fish tacos" onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Link <small className="muted">optional, fills in the ingredients</small>
          <div className="inline-row">
            <input type="url" inputMode="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button className="btn primary narrow" onClick={importLink} disabled={busy || !url.trim()}>
              Import
            </button>
          </div>
        </label>
        {status && <p className="muted small-note">{status}</p>}
        <label>
          Ingredients <small className="muted">one per line</small>
          <textarea rows={7} value={ing} placeholder={'1 lb cod\n8 tortillas\n2 limes'} onChange={(e) => setIng(e.target.value)} />
        </label>
        <button className="btn primary" disabled={!ready} onClick={next}>
          Next
        </button>
      </div>
    </div>
  )
}
