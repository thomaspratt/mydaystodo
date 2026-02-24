import { useState } from 'react'
import { supabase } from './supabase'

export default function AuthScreen() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const accent = '#ff6b8a'
  const bg = '#1a1216'
  const surface = '#2a1f24'
  const border = '#3d2f35'
  const text = '#f5e6eb'
  const textMuted = '#9a8a90'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: authError } = mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
      if (authError) setError(authError.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Nunito', sans-serif", color: text,
    }}>
      <div style={{
        background: surface, borderRadius: 20, padding: 40, width: '100%', maxWidth: 400,
        border: `1px solid ${border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700,
          textAlign: 'center', marginBottom: 4, letterSpacing: '-0.02em',
        }}>My Days</h1>
        <p style={{ textAlign: 'center', color: textMuted, fontSize: 14, marginBottom: 28 }}>
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            required autoComplete="email"
            style={{
              padding: '12px 16px', borderRadius: 12, background: bg, border: `1px solid ${border}`,
              color: text, fontSize: 14, fontFamily: "'Nunito', sans-serif", outline: 'none',
            }}
          />
          <input
            type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
            style={{
              padding: '12px 16px', borderRadius: 12, background: bg, border: `1px solid ${border}`,
              color: text, fontSize: 14, fontFamily: "'Nunito', sans-serif", outline: 'none',
            }}
          />

          {error && (
            <p style={{ color: '#ff4466', fontSize: 13, textAlign: 'center' }}>{error}</p>
          )}

          <button type="submit" disabled={loading} style={{
            padding: '12px 0', borderRadius: 12, background: accent, border: 'none',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
            fontFamily: "'Nunito', sans-serif", opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.15s ease',
          }}>
            {loading ? '...' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: textMuted }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <span
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
            style={{ color: accent, cursor: 'pointer', fontWeight: 600 }}
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </div>
    </div>
  )
}
