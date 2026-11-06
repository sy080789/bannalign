import { useState, type FormEvent } from 'react'
import { supabase } from '../sync'

/** Email + 6-digit code (not a magic link: links open Safari, not the installed app). */
export function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    const { error } = sent
      ? await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
      : await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } })
    setBusy(false)
    if (error) setError(sent ? 'That code didn’t work. Try again.' : 'That email isn’t on the household list.')
    else setSent(true)
  }

  return (
    <form className="login" onSubmit={submit}>
      <img src="/icon.svg" alt="" width={72} height={72} />
      <h1>HomeHub</h1>
      {!sent ? (
        <input type="email" autoComplete="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      ) : (
        <>
          <p className="muted">We emailed a 6-digit code to {email}.</p>
          <input inputMode="numeric" autoComplete="one-time-code" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} required />
        </>
      )}
      {error && <p className="error">{error}</p>}
      <button className="btn primary" disabled={busy}>
        {sent ? 'Sign in' : 'Send code'}
      </button>
      {sent && (
        <button type="button" className="btn link" onClick={() => setSent(false)}>
          Use a different email
        </button>
      )}
    </form>
  )
}
