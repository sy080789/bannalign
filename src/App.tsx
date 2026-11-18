import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { FEATURES } from './features'
import { supabase } from './sync'
import { Login } from './components/Login'
import { StatusPill } from './components/StatusPill'
import { UpdateBanner } from './components/UpdateBanner'
import { ListsPage } from './features/lists/ListsPage'
import { TodayPage } from './features/today/TodayPage'
import { PlantDetail } from './features/plants/PlantDetail'
import { PlantForm } from './features/plants/PlantForm'
import { PlantsPage } from './features/plants/PlantsPage'
import { HousePage } from './features/house/HousePage'
import { IssueForm } from './features/house/IssueForm'
import { IssuePage } from './features/house/IssuePage'
import { ProjectForm } from './features/house/ProjectForm'
import { TaskForm } from './features/house/TaskForm'
import { TaskPage } from './features/house/TaskPage'

export default function App() {
  // Local-only mode (no Supabase yet) skips sign-in entirely.
  const [authed, setAuthed] = useState<boolean | null>(supabase ? null : true)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (authed === null) return null
  if (!authed) return <Login />

  return (
    <div className="app">
      <UpdateBanner />
      <StatusPill />
      <main className="page">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/lists" element={<ListsPage />} />
          <Route path="/lists/:listId" element={<ListsPage />} />
          <Route path="/house" element={<HousePage />} />
          <Route path="/house/fix" element={<HousePage />} />
          <Route path="/house/projects" element={<HousePage />} />
          <Route path="/house/projects/:id" element={<ProjectForm />} />
          <Route path="/house/tasks/new" element={<TaskForm />} />
          <Route path="/house/tasks/:id" element={<TaskPage />} />
          <Route path="/house/tasks/:id/edit" element={<TaskForm />} />
          <Route path="/house/issues/new" element={<IssueForm />} />
          <Route path="/house/issues/:id" element={<IssuePage />} />
          <Route path="/house/issues/:id/edit" element={<IssueForm />} />
          <Route path="/plants" element={<PlantsPage />} />
          <Route path="/plants/new" element={<PlantForm />} />
          <Route path="/plants/:id" element={<PlantDetail />} />
          <Route path="/plants/:id/edit" element={<PlantForm />} />
          <Route path="/recipes/*" element={<Navigate to="/lists/groceries" replace />} />
          {FEATURES.filter((f) => !f.ready).map((f) => (
            <Route key={f.path} path={f.path} element={<ComingSoon label={f.label} />} />
          ))}
        </Routes>
      </main>
      <nav className="tabbar">
        {FEATURES.map((f) => (
          <NavLink key={f.path} to={f.path} end={f.path === '/'} className="tab">
            {f.icon}
            <span>{f.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="empty">
      <h1>{label}</h1>
      <p>Coming soon.</p>
    </div>
  )
}
