'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signIn, signInWithGoogle, signOut } from '../lib/auth'

type AuthView = 'login' | 'signup'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export function LoginScreen({
  onSuccess,
  onGoToSignup,
  onGuestEnter,
}: {
  onSuccess: () => void
  onGoToSignup: () => void
  onGuestEnter: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleLogin() {
    if (!email.trim() || !password) { setError('Please fill in all fields.'); return }
    setLoading(true); setError('')
    try {
      await signOut()
      await signIn(email.trim(), password)
      onSuccess()
    } catch (err: any) {
      setError(err.message?.includes('Invalid login') ? 'Incorrect email or password.' : (err.message || 'Login failed.'))
    } finally { setLoading(false) }
  }

  async function handleGoogle() {
    setGoogleLoading(true); setError('')
    try {
      await signOut()
      await signInWithGoogle()
      // Supabase redirects — onSuccess will be called after redirect back
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.')
      setGoogleLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
      style={{ width: 'min(420px, 92vw)', zIndex: 2 }}>
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: '8px' }}>Dear Stranger</p>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', color: 'rgba(255,255,255,0.88)', letterSpacing: '0.06em', marginBottom: '8px' }}>Welcome back</p>
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.38)' }}>Your hub is waiting in the universe</p>
      </div>

      {/* Google */}
      <button onClick={handleGoogle} disabled={googleLoading || loading}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.82)', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', marginBottom: '16px', transition: 'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}>
        <GoogleIcon />
        {googleLoading ? 'Connecting...' : 'Continue with Google'}
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>or</p>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
      </div>

      {/* Email */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email address"
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'rgba(255,255,255,0.85)', fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.1em', padding: '13px 16px', outline: 'none', caretColor: '#c9a84c' }}
          onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          onKeyDown={e => e.key === 'Enter' && void handleLogin()} />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password"
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'rgba(255,255,255,0.85)', fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.1em', padding: '13px 16px', outline: 'none', caretColor: '#c9a84c' }}
          onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          onKeyDown={e => e.key === 'Enter' && void handleLogin()} />
      </div>

      {error && (
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(220,100,100,0.85)', marginBottom: '14px', textAlign: 'center' }}>{error}</p>
      )}

      <button onClick={() => void handleLogin()} disabled={loading || googleLoading}
        style={{ width: '100%', padding: '14px', background: 'transparent', border: '1px solid rgba(201,168,76,0.5)', color: '#c9a84c', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', marginBottom: '20px', opacity: loading ? 0.6 : 1, transition: 'all 0.2s' }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(201,168,76,0.08)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
        {loading ? 'Signing in...' : 'Sign In ✦'}
      </button>

      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
          New to the universe?{' '}
          <span onClick={onGoToSignup} style={{ color: 'rgba(201,168,76,0.7)', cursor: 'pointer', textDecoration: 'underline' }}>Create a hub</span>
        </p>
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>
          <span onClick={onGuestEnter} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Enter as a stranger</span>
        </p>
      </div>
    </motion.div>
  )
}

export function SignupScreen({
  onSuccess,
  onGoToLogin,
  setPendingCredentials,
}: {
  onSuccess: () => void
  onGoToLogin: () => void
  setPendingCredentials: (creds: { email: string; password: string } | null) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSignup() {
    if (!email.trim() || !password || !confirm) { setError('Please fill in all fields.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')
    try {
      await signOut()
      // Store credentials so onboarding can use them to create the real account
      setPendingCredentials({ email: email.trim(), password })
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Signup failed.')
    } finally { setLoading(false) }
  }

  async function handleGoogle() {
    setGoogleLoading(true); setError('')
    try {
      await signOut()
      setPendingCredentials(null)
      await signInWithGoogle()
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.')
      setGoogleLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
      style={{ width: 'min(420px, 92vw)', zIndex: 2 }}>
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: '8px' }}>Dear Stranger</p>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', color: 'rgba(255,255,255,0.88)', letterSpacing: '0.06em', marginBottom: '8px' }}>Join the universe</p>
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.38)' }}>A hub will be built for you</p>
      </div>

      {/* Google */}
      <button onClick={handleGoogle} disabled={googleLoading || loading}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.82)', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', marginBottom: '16px', transition: 'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}>
        <GoogleIcon />
        {googleLoading ? 'Connecting...' : 'Continue with Google'}
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>or</p>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email address"
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'rgba(255,255,255,0.85)', fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.1em', padding: '13px 16px', outline: 'none', caretColor: '#c9a84c' }}
          onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password (min 6 characters)"
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'rgba(255,255,255,0.85)', fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.1em', padding: '13px 16px', outline: 'none', caretColor: '#c9a84c' }}
          onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
        <input value={confirm} onChange={e => setConfirm(e.target.value)} type="password" placeholder="Confirm password"
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'rgba(255,255,255,0.85)', fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.1em', padding: '13px 16px', outline: 'none', caretColor: '#c9a84c' }}
          onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          onKeyDown={e => e.key === 'Enter' && void handleSignup()} />
      </div>

      {error && (
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(220,100,100,0.85)', marginBottom: '14px', textAlign: 'center' }}>{error}</p>
      )}

      <button onClick={() => void handleSignup()} disabled={loading || googleLoading}
        style={{ width: '100%', padding: '14px', background: 'transparent', border: '1px solid rgba(201,168,76,0.5)', color: '#c9a84c', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', marginBottom: '20px', opacity: loading ? 0.6 : 1, transition: 'all 0.2s' }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(201,168,76,0.08)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
        {loading ? 'Preparing...' : 'Continue to Soul Mirror ✦'}
      </button>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
          Already have a hub?{' '}
          <span onClick={onGoToLogin} style={{ color: 'rgba(201,168,76,0.7)', cursor: 'pointer', textDecoration: 'underline' }}>Sign in</span>
        </p>
      </div>
    </motion.div>
  )
}
