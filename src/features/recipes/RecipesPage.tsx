import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../../db'
import { Icon } from '../../components/Icon'

export function RecipesPage() {
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const recipes = useLiveQuery(() => db.recipes.toArray(), [], [])

  const live = recipes.filter((r) => !r.deleted)
  const tags = [...new Set(live.flatMap((r) => r.tags))].sort()
  const needle = q.trim().toLowerCase()
  const shown = live
    .filter((r) => (tag === '★' ? r.favorite : !tag || r.tags.includes(tag)))
    .filter((r) => !needle || r.name.toLowerCase().includes(needle) || r.ingredients.some((i) => i.toLowerCase().includes(needle)))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name))

  return (
    <>
      <header className="page-head">
        <h1>Recipes</h1>
        <input className="search" type="search" placeholder="Search recipes or ingredients" value={q} onChange={(e) => setQ(e.target.value)} />
        {live.length > 0 && (
          <div className="chips filter">
            {['★', ...tags].map((t) => (
              <button key={t} className={`chip ${tag === t ? 'on' : ''}`} onClick={() => setTag(tag === t ? null : t)}>
                {t === '★' ? 'Favorites' : t}
              </button>
            ))}
          </div>
        )}
      </header>

      {live.length === 0 ? (
        <div className="empty small">
          <p>No recipes yet.</p>
          <p className="muted">Paste a link from any recipe site, or type one in.</p>
          <Link to="/recipes/new" className="btn primary inline">
            Add your first recipe
          </Link>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty small">
          <p className="muted">No matches.</p>
        </div>
      ) : (
        <div className="recipe-grid">
          {shown.map((r) => (
            <Link key={r.id} to={`/recipes/${r.id}`} className="recipe-card">
              {r.image_url ? <img src={r.image_url} alt="" loading="lazy" /> : <div className="ph">{r.name.charAt(0)}</div>}
              <div className="rc-body">
                <span className="rc-name">{r.name}</span>
                {r.favorite && <Icon name="star" filled size={14} />}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link to="/recipes/new" className="fab" aria-label="Add recipe">
        <Icon name="plus" size={26} />
      </Link>
    </>
  )
}
