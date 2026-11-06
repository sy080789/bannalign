import { useState, type FormEvent } from 'react'
import { supabase } from '../sync'

/**
 * Email + password, entered once per phone. iOS offers to save it in Keychain and fills it with Face ID;
 * after that Supabase keeps the session alive with refresh tokens, so you stay signed in.
 */
export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError('That email and password didn’t match.')
  }

  return (
    <form className="login" onSubmit={submit}>
      <img src="/icon.svg" alt="" width={72} height={72} />
      <h1>bannalign</h1>
      <input type="email" name="username" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" name="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="error">{error}</p>}
      <button className="btn primary" disabled={busy}>
        Sign in
      </button>
      <p className="muted">You’ll only need to do this once on each phone.</p>
    </form>
  )
}
