import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { FEATURES } from './features'
import { supabase } from './sync'
import { Login } from './components/Login'
import { StatusPill } from './components/StatusPill'
import { UpdateBanner } from './components/UpdateBanner'
import { ListsPage } from './features/lists/ListsPage'
import { TodayPage } from './features/today/TodayPage'

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
      <p>Coming soon. We're getting Lists just right first.</p>
    </div>
  )
}
