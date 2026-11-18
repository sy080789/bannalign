import { Link } from 'react-router-dom'
import type { Plant } from '../../db'
import { Icon } from '../../components/Icon'
import { dueLabel } from './logic'

export function Thumb({ plant, size = 48 }: { plant: Plant; size?: number }) {
  return plant.photo_url ? (
    <img className="plant-thumb" src={plant.photo_url} alt="" width={size} height={size} />
  ) : (
    <span className="plant-thumb ph" style={{ width: size, height: size }}>
      <Icon name="leaf" size={size / 2} />
    </span>
  )
}

/** One plant in a list: photo, name, room · due, and a one-tap water button. */
export function PlantRow({ plant, onWater }: { plant: Plant; onWater: (p: Plant) => void }) {
  const due = dueLabel(plant)
  return (
    <li className="row plant-row">
      <Link to={`/plants/${plant.id}`} className="row-main plant-link">
        <Thumb plant={plant} />
        <span className="name">
          {plant.name}
          <small className={`due is-${due.tone}`}>
            {plant.room && `${plant.room} · `}
            {due.text}
          </small>
        </span>
      </Link>
      <button className={`water-btn is-${due.tone}`} onClick={() => onWater(plant)} aria-label={`Water ${plant.name}`}>
        <Icon name="drop" size={22} />
      </button>
    </li>
  )
}
