import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, type Recipe } from '../../db'
import { save } from '../../sync'
import { Icon } from '../../components/Icon'
import { fetchImage, scrapeRecipe } from './api'
import { savePhoto } from './photo'

const DEFAULT_TAGS = ['Dinner', 'Breakfast', 'Quick', 'Kid-friendly', 'Vegetarian', 'Dessert']

const blank = (): Recipe => ({
  id: crypto.randomUUID(),
  name: '',
  source_url: '',
  image_url: '',
  servings: '',
  total_time: '',
  ingredients: [],
  steps: [],
  notes: '',
  tags: [],
  favorite: false,
  last_cooked: null,
  updated_at: '',
})

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

export function RecipeForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const existing = useLiveQuery(() => (id ? db.recipes.get(id) : undefined), [id])
  const allTags = useLiveQuery(async () => [...new Set((await db.recipes.toArray()).flatMap((r) => r.tags))], [], [])

  const [r, setR] = useState<Recipe>(blank)
  const [ingText, setIngText] = useState('')
  const [stepText, setStepText] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (existing) {
      setR(existing)
      setIngText(existing.ingredients.join('\n'))
      setStepText(existing.steps.join('\n\n'))
    }
  }, [existing])

  const set = <K extends keyof Recipe>(k: K, v: Recipe[K]) => setR((x) => ({ ...x, [k]: v }))

  async function importFromLink() {
    if (!r.source_url.trim()) return
    setBusy(true)
    setError('')
    setStatus('Reading the recipe…')
    try {
      const s = await scrapeRecipe(r.source_url.trim())
      setR((x) => ({ ...x, name: s.name || x.name, servings: s.servings || x.servings, total_time: s.total_time || x.total_time }))
      if (s.ingredients.length) setIngText(s.ingredients.join('\n'))
      if (s.steps.length) setStepText(s.steps.join('\n\n'))
      if (s.image) {
        setStatus('Saving the photo…')
        try {
          const url = await savePhoto(await fetchImage(s.image))
          setR((x) => ({ ...x, image_url: url }))
        } catch {
          /* photo is optional */
        }
      }
      setStatus(s.ingredients.length ? '' : 'Couldn’t find the ingredients on that page. Paste them (or the caption) below.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setR((x) => ({ ...x, name: x.name || nameFromUrl(x.source_url) }))
      setStatus(
        msg === 'blocked'
          ? 'This site doesn’t allow automatic import. Open the link, copy the ingredients, and paste them below.'
          : 'Couldn’t read that page. You can paste the ingredients below.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function pickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      set('image_url', await savePhoto(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed')
    } finally {
      setBusy(false)
    }
  }

  function toggleTag(t: string) {
    set('tags', r.tags.includes(t) ? r.tags.filter((x) => x !== t) : [...r.tags, t])
  }

  async function submit() {
    if (!r.name.trim()) {
      setError('Give it a name')
      return
    }
    const rec = { ...r, name: r.name.trim(), ingredients: lines(ingText), steps: stepText.split(/\n\s*\n|\n/).map((s) => s.trim()).filter(Boolean) }
    await save('recipes', rec)
    nav(`/recipes/${rec.id}`, { replace: true })
  }

  async function remove() {
    if (!existing || !window.confirm(`Delete “${existing.name}”?`)) return
    await save('recipes', { ...existing, deleted: true })
    nav('/recipes', { replace: true })
  }

  const tagOptions = [...new Set([...DEFAULT_TAGS, ...allTags, ...r.tags])]

  return (
    <div className="recipe-form">
      <div className="detail-bar">
        <button className="btn link" onClick={() => nav(-1)}>
          Cancel
        </button>
        <h2 className="bar-title">{id ? 'Edit recipe' : 'New recipe'}</h2>
        <button className="btn link strong" onClick={submit} disabled={busy}>
          Save
        </button>
      </div>

      <label className="field">
        Link (website or Instagram)
        <div className="inline-row">
          <input type="url" inputMode="url" placeholder="https://…" value={r.source_url} onChange={(e) => set('source_url', e.target.value)} />
          <button className="btn primary narrow" onClick={importFromLink} disabled={busy || !r.source_url.trim()}>
            Import
          </button>
        </div>
      </label>
      {status && <p className="muted small-note">{status}</p>}
      {error && <p className="error">{error}</p>}

      <label className="field">
        Name
        <input value={r.name} placeholder="e.g. Sheet-pan chicken" onChange={(e) => set('name', e.target.value)} />
      </label>

      <div className="field">
        Photo
        <label className="photo-pick">
          {r.image_url ? <img src={r.image_url} alt="" /> : <span className="muted">Add a photo</span>}
          <input type="file" accept="image/*" onChange={pickPhoto} hidden />
        </label>
      </div>

      <div className="two-col">
        <label className="field">
          Time
          <input value={r.total_time} placeholder="45 min" onChange={(e) => set('total_time', e.target.value)} />
        </label>
        <label className="field">
          Serves
          <input value={r.servings} placeholder="4 servings" onChange={(e) => set('servings', e.target.value)} />
        </label>
      </div>

      <label className="field">
        Ingredients <small>one per line</small>
        <textarea rows={8} value={ingText} placeholder={'2 cups rice\n1 lb chicken thighs\n3 cloves garlic'} onChange={(e) => setIngText(e.target.value)} />
      </label>

      <label className="field">
        Steps <small>optional</small>
        <textarea rows={6} value={stepText} onChange={(e) => setStepText(e.target.value)} />
      </label>

      <label className="field">
        Notes <small>optional</small>
        <textarea rows={3} value={r.notes} placeholder="Double the garlic. Kids liked it." onChange={(e) => set('notes', e.target.value)} />
      </label>

      <div className="field">
        Tags
        <div className="chips static">
          {tagOptions.map((t) => (
            <button key={t} type="button" className={`chip ${r.tags.includes(t) ? 'on' : ''}`} onClick={() => toggleTag(t)}>
              {r.tags.includes(t) && <Icon name="check" size={14} />} {t}
            </button>
          ))}
          <button
            type="button"
            className="chip plain"
            onClick={() => {
              const t = window.prompt('New tag')?.trim()
              if (t && !r.tags.includes(t)) toggleTag(t)
            }}
          >
            <Icon name="plus" size={14} /> Tag
          </button>
        </div>
      </div>

      {id && (
        <button className="btn danger full" onClick={remove}>
          Delete recipe
        </button>
      )}
    </div>
  )
}
