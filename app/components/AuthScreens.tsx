'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signInWithGoogle, signInWithDiscord, sendEmailCode, verifyEmailCode, signOut } from '../lib/auth'
import { supabase } from '../../lib/supabase'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  return /FBAN|FBAV|Instagram|Snapchat|Line\/|KAKAOTALK|Twitter\/|LinkedInApp|WhatsApp|wv\)|GSA\//.test(ua)
}

function InAppBrowserBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(isInAppBrowser()), 0)
    return () => window.clearTimeout(timeout)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
            background: 'rgba(180,120,0,0.96)',
            backdropFilter: 'blur(10px)',
            padding: '14px 20px 12px',
            display: 'flex', flexDirection: 'column', gap: '6px',
            borderBottom: '1px solid rgba(255,220,80,0.3)',
          }}
        >
          <p style={{
            fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.25em',
            color: '#fff8e0', textTransform: 'uppercase', margin: 0,
          }}>
            ⚠ Open in your browser
          </p>
          <p style={{
            fontFamily: "'IM Fell English', serif", fontStyle: 'italic',
            fontSize: '13px', color: 'rgba(255,248,200,0.88)', margin: 0, lineHeight: 1.5,
          }}>
            Google and Discord sign-in won&apos;t work inside Snapchat, Instagram, or other apps.
            Please open <strong>dearstranger.xyz</strong> in Safari or Chrome instead.
          </p>
          <button
            onClick={() => setVisible(false)}
            style={{
              alignSelf: 'flex-end', background: 'none', border: 'none',
              color: 'rgba(255,248,200,0.6)', fontSize: '18px', cursor: 'pointer',
              position: 'absolute', top: '10px', right: '14px', lineHeight: 1,
            }}
          >×</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function clearSignupIntent() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem('ds_goto_onboarding')
  sessionStorage.removeItem('ds_pending_creds')
}

function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.014.043.03.056a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

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

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 4L12 13 2 4" />
    </svg>
  )
}

function EmailCodePanel({
  email,
  setEmail,
  code,
  setCode,
  loading,
  error,
  sent,
  sendLabel,
  verifyLabel,
  sentTitle,
  sentBody,
  onSend,
  onVerify,
  onReset,
}: {
  email: string
  setEmail: (value: string) => void
  code: string
  setCode: (value: string) => void
  loading: boolean
  error: string
  sent: boolean
  sendLabel: string
  verifyLabel: string
  sentTitle: string
  sentBody: React.ReactNode
  onSend: () => Promise<void>
  onVerify: () => Promise<void>
  onReset: () => void
}) {
  if (sent) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ width: 'min(420px, 92vw)', zIndex: 2, textAlign: 'center' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: '12px' }}>Dear Stranger</p>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', color: 'rgba(255,255,255,0.88)', letterSpacing: '0.06em', marginBottom: '12px' }}>{sentTitle}</p>
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '24px' }}>
          {sentBody}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="The code you got in your email"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\s/g, ''))}
            onKeyDown={e => e.key === 'Enter' && void onVerify()}
            disabled={loading}
            style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.88)', fontFamily: "'IM Fell English', serif", fontSize: '14px', borderRadius: '4px', outline: 'none', textAlign: 'center', letterSpacing: '0.18em' }}
          />
          <button onClick={() => void onVerify()} disabled={loading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 18px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', color: 'rgba(201,168,76,0.9)', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
            <MailIcon />
            {loading ? 'Verifying...' : verifyLabel}
          </button>
        </div>
        {error && (
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(220,100,100,0.85)', marginBottom: '14px', textAlign: 'center' }}>{error}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={onReset}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '10px 22px', cursor: 'pointer', borderRadius: '4px' }}>
            Use a different email
          </button>
          <button onClick={() => void onSend()}
            style={{ background: 'none', border: '1px solid rgba(201,168,76,0.2)', color: 'rgba(201,168,76,0.75)', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '10px 22px', cursor: 'pointer', borderRadius: '4px' }}>
            Resend code
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void onSend()}
          disabled={loading}
          style={{ flex: '1 1 200px', minWidth: 0, padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.88)', fontFamily: "'IM Fell English', serif", fontSize: '14px', borderRadius: '4px', outline: 'none' }}
        />
        <button onClick={() => void onSend()} disabled={loading}
          style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 18px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', color: 'rgba(201,168,76,0.9)', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.22)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.12)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)' }}>
          <MailIcon />
          {loading ? 'Sending...' : sendLabel}
        </button>
      </div>
      {error && (
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(220,100,100,0.85)', marginTop: '14px', marginBottom: 0, textAlign: 'center' }}>{error}</p>
      )}
    </div>
  )
}

export function LoginScreen({
  onSuccess,
  onGoToSignup,
}: {
  onSuccess: () => void
  onGoToSignup: () => void
}) {
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [discordLoading, setDiscordLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)

  useEffect(() => {
    setGoogleLoading(false)
    setDiscordLoading(false)
    setEmailLoading(false)
  }, [])

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      setGoogleLoading(false)
      setDiscordLoading(false)
      setEmailLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const anyLoading = googleLoading || discordLoading || emailLoading

  async function handleGoogle() {
    setGoogleLoading(true); setError('')
    try {
      clearSignupIntent()
      await signOut()
      await signInWithGoogle()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Google sign-in failed.'))
      setGoogleLoading(false)
    }
  }

  async function handleDiscord() {
    setDiscordLoading(true); setError('')
    try {
      clearSignupIntent()
      await signOut()
      await signInWithDiscord()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Discord sign-in failed.'))
      setDiscordLoading(false)
    }
  }

  async function handleSendCode() {
    if (!email.trim()) { setError('Enter your email address.'); return }
    setEmailLoading(true); setError('')
    try {
      clearSignupIntent()
      await sendEmailCode(email.trim(), false)
      setCodeSent(true)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not send code.'))
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleVerifyCode() {
    if (!emailCode.trim()) { setError('Enter the code from your email.'); return }
    setEmailLoading(true); setError('')
    try {
      clearSignupIntent()
      await verifyEmailCode(email.trim(), emailCode.trim(), 'email')
      onSuccess()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not verify code.'))
    } finally {
      setEmailLoading(false)
    }
  }

  if (codeSent) {
    return (
      <EmailCodePanel
        email={email}
        setEmail={setEmail}
        code={emailCode}
        setCode={setEmailCode}
        loading={anyLoading}
        error={error}
        sent={codeSent}
        sendLabel="Send code"
        verifyLabel="Verify code"
        sentTitle="Enter your code"
        sentBody={<><span>A sign-in code has been sent to<br /><span style={{ color: 'rgba(201,168,76,0.8)' }}>{email}</span><br />Type it here to enter the universe.</span></>}
        onSend={handleSendCode}
        onVerify={handleVerifyCode}
        onReset={() => { setCodeSent(false); setEmailCode(''); setEmail(''); setError('') }}
      />
    )
  }

  return (
    <>
      <InAppBrowserBanner />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
        style={{ width: 'min(420px, 92vw)', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: '8px' }}>Dear Stranger</p>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', color: 'rgba(255,255,255,0.88)', letterSpacing: '0.06em', marginBottom: '8px' }}>Welcome back</p>
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.38)' }}>Your hub is waiting in the universe</p>
        </div>

        <EmailCodePanel
          email={email}
          setEmail={setEmail}
          code={emailCode}
          setCode={setEmailCode}
          loading={anyLoading}
          error={error}
          sent={false}
          sendLabel="Send code"
          verifyLabel="Verify code"
          sentTitle=""
          sentBody={null}
          onSend={handleSendCode}
          onVerify={handleVerifyCode}
          onReset={() => {}}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0 16px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <button onClick={handleGoogle} disabled={anyLoading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.82)', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', marginBottom: '10px', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}>
          <GoogleIcon />
          {googleLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <button onClick={handleDiscord} disabled={anyLoading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '13px', background: 'rgba(88,101,242,0.1)', border: '1px solid rgba(88,101,242,0.35)', color: 'rgba(255,255,255,0.82)', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', marginBottom: '10px', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(88,101,242,0.2)'; e.currentTarget.style.borderColor = 'rgba(88,101,242,0.6)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(88,101,242,0.1)'; e.currentTarget.style.borderColor = 'rgba(88,101,242,0.35)' }}>
          <DiscordIcon />
          {discordLoading ? 'Connecting...' : 'Continue with Discord'}
        </button>

        <button
          onClick={() => window.location.replace('/')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '13px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.7)',
            fontFamily: "'Cinzel', serif",
            fontSize: '10px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            borderRadius: '4px',
            marginBottom: '16px',
            transition: 'all 0.2s',
          }}
        >
          ← Back to Main
        </button>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
            New to the universe?{' '}
            <span onClick={onGoToSignup} style={{ color: 'rgba(201,168,76,0.7)', cursor: 'pointer', textDecoration: 'underline' }}>Create a hub</span>
          </p>
        </div>
      </motion.div>
    </>
  )
}

export function SignupScreen({
  onSuccess,
  setPendingCredentials,
}: {
  onSuccess: () => void
  setPendingCredentials: (creds: { email: string; password: string } | null) => void
}) {
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [discordLoading, setDiscordLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)

  useEffect(() => {
    setGoogleLoading(false)
    setDiscordLoading(false)
    setEmailLoading(false)
  }, [])

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      setGoogleLoading(false)
      setDiscordLoading(false)
      setEmailLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const anyLoading = googleLoading || discordLoading || emailLoading

  function rememberOnboardingIntent() {
    if (typeof sessionStorage === 'undefined') return
    sessionStorage.setItem('ds_goto_onboarding', '1')
  }

  async function handleGoogle() {
    setGoogleLoading(true); setError('')
    try {
      await signOut()
      rememberOnboardingIntent()
      setPendingCredentials(null)
      await signInWithGoogle()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Google sign-in failed.'))
      setGoogleLoading(false)
    }
  }

  async function handleDiscord() {
    setDiscordLoading(true); setError('')
    try {
      await signOut()
      rememberOnboardingIntent()
      setPendingCredentials(null)
      await signInWithDiscord()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Discord sign-in failed.'))
      setDiscordLoading(false)
    }
  }

  async function handleSendCode() {
    if (!email.trim()) { setError('Enter your email address.'); return }
    setEmailLoading(true); setError('')
    try {
      rememberOnboardingIntent()
      await sendEmailCode(email.trim(), true)
      setCodeSent(true)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not send code.'))
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleVerifyCode() {
    if (!emailCode.trim()) { setError('Enter the code from your email.'); return }
    setEmailLoading(true); setError('')
    try {
      rememberOnboardingIntent()
      setPendingCredentials(null)
      await verifyEmailCode(email.trim(), emailCode.trim(), 'signup')
      onSuccess()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not verify code.'))
    } finally {
      setEmailLoading(false)
    }
  }

  if (codeSent) {
    return (
      <EmailCodePanel
        email={email}
        setEmail={setEmail}
        code={emailCode}
        setCode={setEmailCode}
        loading={anyLoading}
        error={error}
        sent={codeSent}
        sendLabel="Send code"
        verifyLabel="Verify code"
        sentTitle="Enter your code"
        sentBody={<><span>A sign-up code has been sent to<br /><span style={{ color: 'rgba(201,168,76,0.8)' }}>{email}</span><br />Type it here to open your account.</span></>}
        onSend={handleSendCode}
        onVerify={handleVerifyCode}
        onReset={() => { setCodeSent(false); setEmailCode(''); setEmail(''); setError('') }}
      />
    )
  }

  return (
    <>
      <InAppBrowserBanner />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
        style={{ width: 'min(420px, 92vw)', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: '8px' }}>Dear Stranger</p>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', color: 'rgba(255,255,255,0.88)', letterSpacing: '0.06em', marginBottom: '8px' }}>Join the universe</p>
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.38)' }}>A hub will be built for you</p>
        </div>

        <EmailCodePanel
          email={email}
          setEmail={setEmail}
          code={emailCode}
          setCode={setEmailCode}
          loading={anyLoading}
          error={error}
          sent={false}
          sendLabel="Send code"
          verifyLabel="Verify code"
          sentTitle=""
          sentBody={null}
          onSend={handleSendCode}
          onVerify={handleVerifyCode}
          onReset={() => {}}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0 16px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <button onClick={handleGoogle} disabled={anyLoading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.82)', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', marginBottom: '10px', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}>
          <GoogleIcon />
          {googleLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <button onClick={handleDiscord} disabled={anyLoading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '13px', background: 'rgba(88,101,242,0.1)', border: '1px solid rgba(88,101,242,0.35)', color: 'rgba(255,255,255,0.82)', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', marginBottom: '10px', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(88,101,242,0.2)'; e.currentTarget.style.borderColor = 'rgba(88,101,242,0.6)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(88,101,242,0.1)'; e.currentTarget.style.borderColor = 'rgba(88,101,242,0.35)' }}>
          <DiscordIcon />
          {discordLoading ? 'Connecting...' : 'Continue with Discord'}
        </button>

        <button
          onClick={() => window.location.replace('/')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '13px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.7)',
            fontFamily: "'Cinzel', serif",
            fontSize: '10px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            borderRadius: '4px',
            marginBottom: '16px',
            transition: 'all 0.2s',
          }}
        >
          ← Back to Main
        </button>
      </motion.div>
    </>
  )
}
