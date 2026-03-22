'use client'

import { useEffect, useState } from 'react'
import EntryScreen from './components/EntryScreen'
import SoulMirror from './components/SoulMirror'
import type { MirrorVoice, SoulMirrorResumeState, StyleOption } from './components/SoulMirror'
import UniverseMap from './components/UniverseMap'
import type { HubStyle } from './components/UniverseMap'
import Scribe from './components/Scribe'
import Observatory from './components/Observatory'
import Profile from './components/Profile'
import { LoginScreen, SignupScreen } from './components/AuthScreens'
import { supabase } from '../lib/supabase'
import {
  signInAndCreateHub, signUpAndCreateHub, signOut,
  createHubForCurrentUser, getSession, getMyHub, getAllHubs, sendLetter, updateHub, signIn,
} from './lib/auth'

type Screen = 'entry' | 'login' | 'signup' | 'onboarding' | 'universe' | 'loading' | 'generating'

const STARS = Array.from({ length: 30 }, (_, i) => ({
  left: `${((i * 37 + 11) % 100)}%`,
  top: `${((i * 53 + 7) % 100)}%`,
  width: `${(i % 3) * 0.6 + 0.3}px`,
  opacity: (i % 5) * 0.06 + 0.04,
}))

function AuthBackground() {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(30,15,60,0.4) 0%, transparent 70%)' }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        {STARS.map((s, i) => <div key={i} style={{ position: 'absolute', width: s.width, height: s.width, borderRadius: '50%', background: `rgba(255,255,255,${s.opacity})`, left: s.left, top: s.top }} />)}
      </div>
    </>
  )
}

async function requestAvatarImage(
  answers: Record<number, string>,
  userId?: string,
  style?: string,
  timeoutMs = 25000,
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch('/api/generate-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, userId, style }),
      signal: controller.signal,
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok || data.error) {
      throw new Error(data.error || `Avatar request failed with status ${response.status}`)
    }

    return typeof data.imageUrl === 'string' ? data.imageUrl : ''
  } finally {
    clearTimeout(timeout)
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [hubName, setHubName] = useState('')
  const [hubBio, setHubBio] = useState('')
  const [hubAskAbout, setHubAskAbout] = useState('')
  const [hubAvatarUrl, setHubAvatarUrl] = useState('')
  const [hubStyle, setHubStyle] = useState<HubStyle>('portal')
  const [lettersSent, setLettersSent] = useState(0)
  const [generatingStatus, setGeneratingStatus] = useState('')
  const [scribeOpen, setScribeOpen] = useState(false)
  const [scribeRecipient, setScribeRecipient] = useState<string | undefined>()
  const [observatoryOpen, setObservatoryOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null)
  const [onboardingError, setOnboardingError] = useState('')
  const [onboardingResumeState, setOnboardingResumeState] = useState<SoulMirrorResumeState | null>(null)

  function clearHubState() {
    setHubName('')
    setHubBio('')
    setHubAskAbout('')
    setHubAvatarUrl('')
    setHubStyle('portal')
    setLettersSent(0)
    setOnboardingResumeState(null)
  }

  async function routeFromSession() {
    const session = await getSession()
    if (!session) {
      clearHubState()
      setScreen('entry')
      return
    }

    const hub = await getMyHub()
    if (hub) {
      setHubName(hub.hub_name || '')
      setHubBio(hub.bio || '')
      setHubAskAbout(hub.ask_about || '')
      setHubAvatarUrl(hub.avatar_url || '')
      setHubStyle((hub.hub_style as HubStyle) || 'portal')
      setLettersSent(hub.letters_sent || 0)
      setOnboardingError('')
      setOnboardingResumeState(null)
      setScreen('universe')
      return
    }

    clearHubState()
    setScreen('onboarding')
  }

  useEffect(() => {
    async function checkSession() {
      try {
        await routeFromSession()
      } catch (err) {
        console.error('checkSession failed:', err)
        try { await signOut() } catch {}
        clearHubState()
        setScreen('entry')
      }
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        clearHubState()
        setPendingCredentials(null)
        setOnboardingError('')
        setScreen('entry')
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        try {
          await routeFromSession()
        } catch (err) {
          console.error('auth state sync failed:', err)
        }
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function handleOnboardingComplete(
    answers: Record<number, string>,
    selectedStyle?: StyleOption,
    selectedHubStyle?: HubStyle,
    mirrorVoice?: MirrorVoice,
    userBio?: string,
    userHubName?: string,
  ) {
    setOnboardingError('')
    const keys = Object.keys(answers).map(Number).sort((a, b) => a - b)
    const hubNameAnswer = (userHubName || answers[keys[keys.length - 1]] || 'Your Hub').trim()
    const conversationAnswers: Record<number, string> = {}
    for (let i = 0; i < keys.length - 1; i++) conversationAnswers[i] = answers[keys[i]]

    const fallbackBio = 'A wanderer who arrived here quietly, carrying something unspoken.'
    const fallbackAskAbout = 'Silence, slow mornings, and letters that take their time.'
    const chosenHubStyle = selectedHubStyle || 'portal'
    const chosenBio = userBio?.trim() || fallbackBio
    const resumeState: SoulMirrorResumeState = {
      phase: 'hubname',
      selectedStyle,
      selectedHubStyle: chosenHubStyle,
      selectedVoice: mirrorVoice,
      userAnswers: keys.slice(0, -1).map((key) => answers[key]),
      hubName: hubNameAnswer,
      bio: chosenBio,
    }

    try {
      setScreen('generating')
      setGeneratingStatus('Crafting your soul mirror...')

      let session = await withTimeout(getSession(), 10000, 'Connecting to your account took too long. Please try again.')
      const isAnonymousSession = Boolean((session?.user as { is_anonymous?: boolean } | undefined)?.is_anonymous)

      if (pendingCredentials) {
        if (isAnonymousSession) {
          await withTimeout(signOut(), 8000, 'Resetting your session took too long. Please try again.')
          session = null
        }
        await withTimeout(
          signUpAndCreateHub(pendingCredentials.email, pendingCredentials.password, hubNameAnswer, chosenBio, fallbackAskAbout),
          20000,
          'Creating your account took too long. Please try again.',
        )
        session = await withTimeout(getSession(), 10000, 'Connecting to your new account took too long. Please try again.')
        if (!session) {
          await withTimeout(
            signIn(pendingCredentials.email, pendingCredentials.password),
            12000,
            'Signing you in took too long. Please try again.',
          )
          session = await withTimeout(getSession(), 10000, 'Loading your session took too long. Please try again.')
        }
        setPendingCredentials(null)
      } else if (session) {
        await withTimeout(
          createHubForCurrentUser(hubNameAnswer, chosenBio, fallbackAskAbout),
          15000,
          'Creating your hub took too long. Please try again.',
        )
      } else {
        await withTimeout(
          signInAndCreateHub(hubNameAnswer, chosenBio, fallbackAskAbout),
          15000,
          'Opening your hub took too long. Please try again.',
        )
        session = await withTimeout(getSession(), 10000, 'Loading your session took too long. Please try again.')
      }

      setHubName(hubNameAnswer)
      setHubStyle(chosenHubStyle)
      setHubBio(chosenBio)
      setHubAskAbout(fallbackAskAbout)

      const userId = session?.user?.id

      setGeneratingStatus('Placing your hub in the universe...')
      await withTimeout(
        updateHub({
          bio: chosenBio,
          ask_about: fallbackAskAbout,
          hub_style: chosenHubStyle,
          backdrop_id: 'void',
        } as any),
        12000,
        'Saving your hub took too long. Please try again.',
      )

      setHubAvatarUrl('')
      setOnboardingResumeState(null)
      setScreen('universe')

      void (async () => {
        try {
          const avatarUrl = await requestAvatarImage(conversationAnswers, userId, selectedStyle?.label)
          if (!avatarUrl) return
          await updateHub({ avatar_url: avatarUrl })
          setHubAvatarUrl(avatarUrl)
        } catch (avatarError) {
          console.error('Avatar generation failed after hub creation:', avatarError)
        }
      })()

    } catch (err) {
      console.error('Error during onboarding:', err)
      if (err instanceof Error && err.message === 'That hub name is already taken. Choose another one.') {
        setOnboardingResumeState(resumeState)
      }
      setScreen('onboarding')
      setOnboardingError(err instanceof Error ? err.message : 'Your hub could not be created yet. Please try again.')
    }
  }

  if (screen === 'loading') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000005', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.4)' }}>✦</div>
      </div>
    )
  }

  if (screen === 'generating') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000005', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 40% at 20% 30%, rgba(40,20,80,0.25) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2s ease-in-out infinite' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '18px', color: '#c9a84c' }}>✦</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase', marginBottom: '10px' }}>Soul Mirror</p>
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '15px', color: 'rgba(255,255,255,0.35)' }}>{generatingStatus}</p>
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.08); opacity: 1; } }`}</style>
      </div>
    )
  }

  if (screen === 'login') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000005', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AuthBackground />
        <LoginScreen
          onSuccess={async () => {
            setPendingCredentials(null)
            setOnboardingResumeState(null)
            const hub = await getMyHub()
            if (hub) {
              setHubName(hub.hub_name || '')
              setHubBio(hub.bio || '')
              setHubAskAbout(hub.ask_about || '')
              setHubAvatarUrl(hub.avatar_url || '')
              setHubStyle((hub.hub_style as HubStyle) || 'portal')
              setLettersSent(hub.letters_sent || 0)
              setScreen('universe')
              return
            }
            setOnboardingError('')
            setScreen('onboarding')
          }}
          onGoToSignup={() => { setOnboardingError(''); setPendingCredentials(null); setScreen('signup') }}
          onGuestEnter={() => { setOnboardingError(''); setPendingCredentials(null); setScreen('onboarding') }}
        />
      </div>
    )
  }

  if (screen === 'signup') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000005', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AuthBackground />
        <SignupScreen
          onSuccess={() => { setOnboardingError(''); setScreen('onboarding') }}
          onGoToLogin={() => { setOnboardingError(''); setPendingCredentials(null); setScreen('login') }}
          setPendingCredentials={setPendingCredentials}
        />
      </div>
    )
  }

  return (
    <>
      {screen === 'entry' && (
        <EntryScreen
          onEnter={() => { setOnboardingError(''); setPendingCredentials(null); setScreen('onboarding') }}
          onLogin={() => { setOnboardingError(''); setPendingCredentials(null); setScreen('login') }}
          onSignup={() => { setOnboardingError(''); setPendingCredentials(null); setScreen('signup') }}
        />
      )}

      {screen === 'onboarding' && (
        <SoulMirror
          onComplete={handleOnboardingComplete}
          errorMessage={onboardingError}
          resumeState={onboardingResumeState}
        />
      )}

      {screen === 'universe' && (
        <UniverseMap
          hubName={hubName}
          hubAvatarUrl={hubAvatarUrl}
          hubStyle={hubStyle}
          onWriteLetter={(name) => { setScribeRecipient(name); setScribeOpen(true) }}
          onObservatory={() => setObservatoryOpen(true)}
          onProfile={() => setProfileOpen(true)}
        />
      )}

      {scribeOpen && (
        <Scribe
          recipientName={scribeRecipient}
          lettersSent={lettersSent}
          onClose={() => setScribeOpen(false)}
          onSend={async (letter) => {
            try {
              const allHubs = await getAllHubs()
              const recipient = allHubs.find((hub: any) => hub.hub_name === letter.to)
              const isUniverseLetter = !letter.to
              if (!isUniverseLetter && !recipient) throw new Error('Recipient not found')
              await sendLetter(recipient?.id || null, letter.body, letter.paperId, isUniverseLetter, letter.subject, letter.fontId)
              setLettersSent(prev => prev + 1)
              setScribeOpen(false)
            } catch (err) { console.error('Failed to send letter:', err) }
          }}
        />
      )}

      {observatoryOpen && (
        <Observatory
          onClose={() => setObservatoryOpen(false)}
          onWriteLetter={(name) => { setObservatoryOpen(false); setScribeRecipient(name); setScribeOpen(true) }}
        />
      )}

      {profileOpen && (
        <Profile
          hubName={hubName}
          bio={hubBio}
          askAbout={hubAskAbout}
          avatarUrl={hubAvatarUrl}
          onClose={() => setProfileOpen(false)}
          onUpdateHub={(name) => setHubName(name)}
        />
      )}
    </>
  )
}
