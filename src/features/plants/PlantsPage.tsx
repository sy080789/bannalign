import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { db, type Plant } from '../../db'
import { save } from '../../sync'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { water } from './actions'
import { PlantRow } from './PlantRow'
import { byDue, isDue } from './logic'

export function PlantsPage() {
  const plants = useLiveQuery(async () => (await db.plants.toArray()).filter((p) => !p.deleted).sort(byDue()), [], [])
  const toast = useToast()
  const loc = useLocation()
  const nav = useNavigate()

  // Arrived here after deleting a plant: offer Undo.
  const deleted = (loc.state as { deleted?: Plant } | null)?.deleted
  useEffect(() => {
    if (!deleted) return
    nav('.', { replace: true, state: null })
    toast.show(`Deleted ${deleted.name}`, () => save('plants', { ...deleted, deleted: false }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleted])

  async function onWater(p: Plant) {
    toast.show(`Watered ${p.name}`, await water(p))
  }

  const due = plants.filter((p) => isDue(p))
  const later = plants.filter((p) => !isDue(p))

  return (
    <>
      <header className="page-head">
        <h1>Plants</h1>
        <p className="date">{plants.length === 0 ? 'No plants yet' : due.length ? `${due.length} need${due.length === 1 ? 's' : ''} water` : 'All watered'}</p>
      </header>

      {plants.length === 0 && (
        <div className="empty small">
          <p>Add your plants and how often they need water.</p>
          <p className="muted">Due plants show up on Today.</p>
          <Link className="btn primary inline" to="/plants/new">
            Add a plant
          </Link>
        </div>
      )}

      {due.length > 0 && (
        <section className="group">
          <h2>Needs water</h2>
          <ul className="card rows">
            {due.map((p) => (
              <PlantRow key={p.id} plant={p} onWater={onWater} />
            ))}
          </ul>
        </section>
      )}

      {later.length > 0 && (
        <section className="group">
          <h2>Coming up</h2>
          <ul className="card rows">
            {later.map((p) => (
              <PlantRow key={p.id} plant={p} onWater={onWater} />
            ))}
          </ul>
        </section>
      )}

      {plants.length > 0 && (
        <Link className="fab" to="/plants/new" aria-label="Add a plant">
          <Icon name="plus" size={28} />
        </Link>
      )}
      {toast.node}
    </>
  )
}
