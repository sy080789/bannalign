import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../../db'
import { save } from '../../sync'
import { Icon } from '../../components/Icon'
import { PROJECT_STATUS } from './actions'
import { costLabel, costTotal, money, rankBetween } from './logic'


interface Drag {
  from: number
  to: number
  dy: number
  startY: number
  mids: number[] // vertical midpoints of each row at drag start
  height: number
}

/** Ranked wish list. Drag the ≡ handle (handle-only, so scrolling still works on iPhone). */
export function Projects() {
  const projects = useLiveQuery(async () => (await db.projects.toArray()).filter((p) => !p.deleted), [], undefined)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [showDone, setShowDone] = useState(false)
  const list = useRef<HTMLUListElement>(null)
  if (!projects) return null

  const active = projects.filter((p) => p.status !== 'done').sort((a, b) => a.rank - b.rank)
  const done = projects.filter((p) => p.status === 'done').sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''))
  const total = costTotal(active)

  function start(e: PointerEvent, index: number) {
    const rows = [...(list.current?.children ?? [])] as HTMLElement[]
    const rects = rows.map((r) => r.getBoundingClientRect())
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ from: index, to: index, dy: 0, startY: e.clientY, mids: rects.map((r) => r.top + r.height / 2), height: rects[index].height })
  }

  function move(e: PointerEvent) {
    if (!drag) return
    const dy = e.clientY - drag.startY
    const y = drag.mids[drag.from] + dy
    let to = drag.mids.findIndex((m) => y < m)
    if (to === -1) to = drag.mids.length - 1
    else if (to > drag.from) to -= 1
    setDrag({ ...drag, dy, to })
  }

  async function end() {
    if (!drag) return
    const { from, to } = drag
    setDrag(null)
    if (from === to) return
    const rest = active.filter((_, i) => i !== from)
    const rank = rankBetween(rest[to - 1]?.rank, rest[to]?.rank)
    await save('projects', { ...active[from], rank })
  }

  const shift = (i: number) => {
    if (!drag || i === drag.from) return 0
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return -drag.height
    if (drag.from > drag.to && i < drag.from && i >= drag.to) return drag.height
    return 0
  }

  return (
    <>
      {active.length > 0 && total && <p className="date total">Estimated total {total}</p>}
      {projects.length === 0 && (
        <div className="empty small">
          <p>List the improvements you want, rank them, and add rough costs.</p>
          <p className="muted">e.g. replace the flat roof, upgrade the washer and dryer.</p>
        </div>
      )}
      {active.length > 0 && (
        <ul className={`card rows projects ${drag ? 'dragging' : ''}`} ref={list}>
          {active.map((p, i) => (
            <li
              key={p.id}
              className={`row project-row ${drag?.from === i ? 'lifted' : ''}`}
              style={{ transform: `translateY(${drag?.from === i ? drag.dy : shift(i)}px)` }}
            >
              <span
                className="handle"
                onPointerDown={(e) => start(e, i)}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
                aria-label={`Drag to reorder ${p.title}`}
                role="button"
              >
                <Icon name="list" size={20} />
              </span>
              <Link to={`/house/projects/${p.id}`} className="row-main plant-link">
                <span className="rank">{i + 1}</span>
                <span className="name">
                  {p.title}
                  {p.status !== 'idea' && <small className="due">{PROJECT_STATUS[p.status]}</small>}
                </span>
                <span className="qty">{costLabel(p)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <section className="group">
          <button className="group-toggle" onClick={() => setShowDone(!showDone)} aria-expanded={showDone}>
            <h2>Done · {done.length}</h2>
            <span className={`rg-toggle ${showDone ? 'open' : ''}`}>
              <Icon name="chevron" size={18} />
            </span>
          </button>
          {showDone && (
            <ul className="card rows">
              {done.map((p) => (
                <li key={p.id}>
                  <Link to={`/house/projects/${p.id}`} className="row link-row">
                    <span className="name">
                      {p.title}
                      {p.done_at && <small className="due">{new Date(p.done_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</small>}
                    </span>
                    <span className="qty">{p.actual_cost != null ? money(p.actual_cost) : costLabel(p)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <Link className="fab" to="/house/projects/new" aria-label="Add a project">
        <Icon name="plus" size={28} />
      </Link>
    </>
  )
}
