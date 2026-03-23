import { useState, useEffect, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from '../lib/supabase'

export function AuthGate({ children }: { children: ReactNode }) {
  // Hooks must always be called — no early return before these
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!supabaseConfigured) return

    // Fallback: if session check takes > 6s, drop to login screen
    const timeout = setTimeout(() => setSession(null), 6000)
    supabase.auth.getSession()
      .then(({ data }) => setSession(data.session ?? null))
      .catch(() => setSession(null))
      .finally(() => clearTimeout(timeout))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      clearTimeout(timeout)
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Supabase not configured
  if (!supabaseConfigured) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 28px', textAlign: 'center' }}>
        <span style={{ fontSize: 44, marginBottom: 16 }}>⚙️</span>
        <h2 style={{ margin: '0 0 12px', color: 'var(--text-primary)', fontSize: 20, fontWeight: 700 }}>Supabase not configured</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, maxWidth: 320 }}>
          Add <code style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>VITE_SUPABASE_URL</code> and{' '}
          <code style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>VITE_SUPABASE_ANON_KEY</code>{' '}
          in Netlify → Site Settings → Environment Variables, then trigger a redeploy.
        </p>
      </div>
    )
  }

  // Checking session
  if (session === undefined) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 36 }}>💃</span>
      </div>
    )
  }

  // Authenticated — render the app
  if (session) return <>{children}</>

  // Not authenticated — magic link form
  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (error) {
      // Surface rate-limit errors clearly
      if (error.message.toLowerCase().includes('rate limit') || error.status === 429) {
        setErrorMsg('Too many emails sent. Please wait a few minutes before trying again.')
      } else {
        setErrorMsg(error.message)
      }
    } else {
      setSent(true)
    }
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 28px',
    }}>
      <span style={{ fontSize: 52, marginBottom: 12 }}>💃</span>
      <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center' }}>
        Passinho
      </h1>
      <p style={{ margin: '0 0 40px', fontSize: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
        Dance class tracker
      </p>

      {sent ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>📬</div>
          <p style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8, fontSize: 18 }}>
            Check your email
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>
            Magic link sent to<br />
            <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
            Link expires in 1 hour. Check your spam folder if you don't see it.
          </p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            style={{
              marginTop: 24, background: 'none', border: 'none',
              color: 'var(--accent-light)', fontSize: 14, cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSend} style={{ width: '100%', maxWidth: 320 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoComplete="email"
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 14,
              border: `1px solid ${errorMsg ? 'var(--danger)' : 'var(--border)'}`,
              background: 'var(--bg-card)', color: 'var(--text-primary)',
              fontSize: 16, outline: 'none', fontFamily: 'inherit',
              marginBottom: 12, boxSizing: 'border-box',
            }}
          />
          {errorMsg && (
            <p style={{ color: 'var(--danger)', fontSize: 13, margin: '-4px 0 12px' }}>{errorMsg}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '15px', borderRadius: 14, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
              opacity: loading ? 0.7 : 1, letterSpacing: '0.02em',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            }}
          >
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
            No password needed — we'll email you a sign-in link.
          </p>
        </form>
      )}
    </div>
  )
}
