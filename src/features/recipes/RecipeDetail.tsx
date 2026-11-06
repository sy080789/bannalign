import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../../db'
import { save } from '../../sync'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { AddToListSheet } from './AddToListSheet'

function ago(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  if (days < 60) return `${Math.round(days / 7)} weeks ago`
  return `${Math.round(days / 30)} months ago`
}

/** Cook mode: keep the screen on while a recipe is open. */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const get = () => navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    get()
    const onVis = () => document.visibilityState === 'visible' && get()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      lock?.release().catch(() => {})
    }
  }, [])
}

export function RecipeDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const recipe = useLiveQuery(() => db.recipes.get(id ?? ''), [id])
  const [adding, setAdding] = useState(false)
  const toast = useToast()
  useWakeLock()

  if (recipe === undefined) return null
  if (!recipe || recipe.deleted) {
    return (
      <div className="empty">
        <p>Recipe not found.</p>
        <Link to="/recipes">Back to recipes</Link>
      </div>
    )
  }

  async function madeIt() {
    const prev = recipe!
    await save('recipes', { ...prev, last_cooked: new Date().toISOString() })
    toast.show('Nice! Logged as made today', () => save('recipes', prev))
  }

  return (
    <div className="recipe-detail">
      <div className="detail-bar">
        <button className="icon-btn round" onClick={() => nav('/recipes')} aria-label="Back">
          <span className="flip">
            <Icon name="chevron" />
          </span>
        </button>
        <div className="spacer" />
        <button className="icon-btn round" onClick={() => save('recipes', { ...recipe, favorite: !recipe.favorite })} aria-pressed={recipe.favorite} aria-label="Favorite">
          <Icon name="star" filled={recipe.favorite} />
        </button>
        <Link className="btn link" to={`/recipes/${recipe.id}/edit`}>
          Edit
        </Link>
      </div>

      {recipe.image_url && <img className="hero" src={recipe.image_url} alt="" />}

      <h1>{recipe.name}</h1>
      <p className="meta">
        {[recipe.total_time, recipe.servings, recipe.last_cooked && `Last made ${ago(recipe.last_cooked)}`].filter(Boolean).join(' · ')}
      </p>
      {(recipe.source_url || recipe.tags.length > 0) && (
        <div className="chips static">
          {recipe.source_url && (
            <a className="chip" href={recipe.source_url} target="_blank" rel="noreferrer">
              View original ↗
            </a>
          )}
          {recipe.tags.map((t) => (
            <span key={t} className="chip plain">
              {t}
            </span>
          ))}
        </div>
      )}

      {recipe.ingredients.length > 0 && (
        <section className="group">
          <h2>Ingredients · {recipe.ingredients.length}</h2>
          <ul className="card rows plain-list">
            {recipe.ingredients.map((line, i) => (
              <li key={i} className="row">
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      {recipe.steps.length > 0 && (
        <section className="group">
          <h2>Steps</h2>
          <ol className="steps">
            {recipe.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </section>
      )}

      {recipe.notes && (
        <section className="group">
          <h2>Notes</h2>
          <p className="card notes">{recipe.notes}</p>
        </section>
      )}

      <button className="btn ghost made" onClick={madeIt}>
        <Icon name="check" size={18} /> We made this today
      </button>

      {recipe.ingredients.length > 0 && (
        <div className="sticky-cta">
          <button className="btn primary" onClick={() => setAdding(true)}>
            Add to Groceries
          </button>
        </div>
      )}

      {adding && <AddToListSheet recipe={recipe} onClose={() => setAdding(false)} onDone={(t, undo) => toast.show(t, undo)} />}
      {toast.node}
    </div>
  )
}
