'use client'

import { useEffect, useRef, useState } from 'react'
import EntryScreen from './components/EntryScreen'
import SoulMirror from './components/SoulMirror'
import type { MirrorVoice, SoulMirrorResumeState, StyleOption } from './components/SoulMirror'
import UniverseMap from './components/UniverseMap'
import type { HubColor, HubStyle, HubDecoration, HubGlowIntensity } from './components/UniverseMap'
import Scribe from './components/Scribe'
import Observatory from './components/Observatory'
import Profile from './components/Profile'
import { LoginScreen, SignupScreen } from './components/AuthScreens'
import { supabase } from '../lib/supabase'
import {
  signInAndCreateHub,
  signUpAndCreateHub,
  signOut,
  createHubForCurrentUser,
  getSession,
  getMyHub,
  getAllHubs,
  sendLetter,
  updateHub,
  signIn,
  uploadAvatarToStorage,
  isGuestUser,
} from './lib/auth'

type Screen =
  | 'entry'
  | 'login'
  | 'signup'
  | 'onboarding'
  | 'universe'
  | 'loading'
  | 'generating'

const STARS = Array.from({ length: 30 }, (_, i) => ({
  left: `${((i * 37 + 11) % 100)}%`,
  top: `${((i * 53 + 7) % 100)}%`,
  width: `${(i % 3) * 0.6 + 0.3}px`,
  opacity: (i % 5) * 0.06 + 0.04,
}))

const HUB_COLOR_IDS: HubColor[] = ['gold', 'sage', 'rose', 'azure', 'amber', 'violet', 'teal', 'sand']

function coerceHubColor(value?: string | null): HubColor {
  return HUB_COLOR_IDS.includes(value as HubColor) ? (value as HubColor) : 'gold'
}

function AuthBackground() {
  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(30,15,60,0.4) 0%, transparent 70%)',
        }}
      />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        {STARS.map((s, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: s.width,
              height: s.width,
              borderRadius: '50%',
              background: `rgba(255,255,255,${s.opacity})`,
              left: s.left,
              top: s.top,
            }}
          />
        ))}
      </div>
    </>
  )
}

async function requestAvatarImage(
  answers: Record<number, string>,
  userId?: string,
  style?: string,
  timeoutMs = 55000,
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
  const [hubColor, setHubColor] = useState<HubColor>('gold')
  const [hubDecoration, setHubDecoration] = useState<HubDecoration>('none')
  const [hubGlowIntensity, setHubGlowIntensity] = useState<HubGlowIntensity>('normal')
  const [hubRegenCount, setHubRegenCount] = useState(0)
  const [lettersSent, setLettersSent] = useState(0)
  const [generatingStatus, setGeneratingStatus] = useState('')
  const [scribeOpen, setScribeOpen] = useState(false)
  const [scribeRecipient, setScribeRecipient] = useState<string | undefined>()
  const [observatoryOpen, setObservatoryOpen] = useState(false)
  const [navResetSignal, setNavResetSignal] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [showGuestWall, setShowGuestWall] = useState(false)
  const [pendingCredentials, setPendingCredentials] = useState<{
    email: string
    password: string
  } | null>(null)
  const [onboardingError, setOnboardingError] = useState('')
  const [onboardingResumeState, setOnboardingResumeState] =
    useState<SoulMirrorResumeState | null>(null)

  const screenRef = useRef<Screen>('loading')
  const onboardingInFlightRef = useRef(false)

  // Show guest entry option on onboarding
  function GuestEntryOption() {
    return (
      <div style={{ marginTop: 18, textAlign: 'center' }}>
        <span
          onClick={() => {
            setIsGuest(true);
            setScreen('onboarding');
          }}
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '12px',
            color: '#fff',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            textDecoration: 'none',
            fontWeight: 400,
            background: 'none',
            borderRadius: '6px',
            padding: '4px 10px',
            boxShadow: 'none',
            transition: 'color 0.2s',
            display: 'inline-block',
            opacity: 0.7,
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.7' }}
        >
          Enter as guest
        </span>
      </div>
    )
  }

  function clearHubState(resetResume = true) {
    setHubName('')
    setHubBio('')
    setHubAskAbout('')
    setHubAvatarUrl('')
    setHubStyle('portal')
    setHubColor('gold')
    setHubDecoration('none')
    setHubGlowIntensity('normal')
    setLettersSent(0)
    setHubRegenCount(0)
    setIsGuest(false)
    if (resetResume) setOnboardingResumeState(null)
  }

  useEffect(() => {
    screenRef.current = screen
  }, [screen])

  async function routeFromSession() {
    function timeoutPromise<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout in ${label}`)), ms)),
      ])
    }
    try {
      console.log('[routeFromSession] begin')
      const session = await getSession()
      console.log('[routeFromSession] getSession result:', session)

      if (!session) {
        clearHubState()
        setScreen('entry')
        console.log('[routeFromSession] no session, go to entry')
        return
      }

      let hub = null
      try {
        hub = await timeoutPromise(getMyHub(), 7000, 'getMyHub')
        console.log('[routeFromSession] getMyHub result:', hub)
      } catch (err) {
        console.error('[routeFromSession] getMyHub error:', err)
      }

      if (hub) {
        setHubName(hub.hub_name || '')
        setHubBio(hub.bio || '')
        setHubAskAbout(hub.ask_about || '')
        setHubAvatarUrl(hub.avatar_url || '')
        setHubStyle((hub.hub_style as HubStyle) || 'portal')
        setHubColor(coerceHubColor(hub.backdrop_id))
        setHubDecoration((hub.decoration as HubDecoration) || 'none')
        setHubGlowIntensity((hub.glow_intensity as HubGlowIntensity) || 'normal')
        setLettersSent(hub.letters_sent || 0)
        setHubRegenCount(hub.regen_count || 0)
        setOnboardingError('')
        setOnboardingResumeState(null)

        const guest = await isGuestUser()
        setIsGuest(guest)
        setScreen('universe')
        console.log('[routeFromSession] session+hub, go to universe')
        return
      }

      clearHubState(false)
      setScreen('onboarding')
      console.log('[routeFromSession] session+no hub, go to onboarding')
    } catch (err) {
      console.error('[routeFromSession] error:', err)
      clearHubState()
      setScreen('entry')
      console.log('[routeFromSession] fallback to entry')
    }
  }

  useEffect(() => {
    let ignore = false;
    let fallbackTimer: NodeJS.Timeout | null = null;
    async function checkSession() {
      try {
        await routeFromSession()
      } catch (err) {
        console.error('checkSession failed:', err)
        try {
          await signOut()
        } catch {}
        clearHubState()
        setScreen('entry')
        console.log('[checkSession] fallback to entry')
      }
    }

    checkSession()

    // Fallback: if still loading after 10s, go to entry
    fallbackTimer = setTimeout(() => {
      if (screenRef.current === 'loading') {
        clearHubState()
        setScreen('entry')
        console.log('[fallbackTimer] loading >10s, go to entry')
      }
    }, 10000)

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (ignore) return;
      console.log('[authStateChange]', event)
      if (event === 'SIGNED_OUT') {
        clearHubState()
        setPendingCredentials(null)
        setOnboardingError('')
        setScreen('entry')
        console.log('[authStateChange] SIGNED_OUT, go to entry')
        return
      }
    })

    return () => {
      ignore = true
      if (fallbackTimer) clearTimeout(fallbackTimer)
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function handleOnboardingComplete(
    answers: Record<number, string>,
    selectedStyle?: StyleOption,
    selectedHubStyle?: HubStyle,
    selectedHubColor?: HubColor,
    mirrorVoice?: MirrorVoice,
    userBio?: string,
    userAskAbout?: string,
    userHubName?: string,
  ) {
    setOnboardingError('')

    const keys = Object.keys(answers)
      .map(Number)
      .sort((a, b) => a - b)

    const hubNameAnswer = (userHubName || answers[keys[keys.length - 1]] || 'Your Hub').trim()

    const conversationAnswers: Record<number, string> = {}
    for (let i = 0; i < keys.length - 1; i++) {
      conversationAnswers[i] = answers[keys[i]]
    }

    const fallbackBio = 'A wanderer who arrived here quietly, carrying something unspoken.'
    const fallbackAskAbout = 'Silence, slow mornings, and letters that take their time.'
    const chosenHubStyle = selectedHubStyle || 'portal'
    const chosenHubColor = selectedHubColor || 'gold'
    const chosenBio = userBio?.trim() || fallbackBio
    const chosenAskAbout = userAskAbout?.trim() || fallbackAskAbout

    const resumeState: SoulMirrorResumeState = {
      phase: 'welcome',
      selectedStyle,
      selectedHubStyle: chosenHubStyle,
      selectedHubColor: chosenHubColor,
      selectedVoice: mirrorVoice,
      userAnswers: keys.slice(0, -1).map((key) => answers[key]),
      hubName: hubNameAnswer,
      bio: chosenBio,
      askAbout: chosenAskAbout,
    }

    try {
      onboardingInFlightRef.current = true
      setScreen('generating')
      setGeneratingStatus('Crafting your soul mirror...')

      let session = await getSession()
      const isAnonymousSession = Boolean(
        (session?.user as { is_anonymous?: boolean } | undefined)?.is_anonymous,
      )

      if (pendingCredentials) {
        if (isAnonymousSession) {
          await signOut()
        }

        await signUpAndCreateHub(
          pendingCredentials.email,
          pendingCredentials.password,
          hubNameAnswer,
          chosenBio,
          chosenAskAbout,
        )

        session = await getSession()

        if (!session) {
          await signIn(pendingCredentials.email, pendingCredentials.password)
          session = await getSession()
        }

        setPendingCredentials(null)
        setIsGuest(false)
      } else if (session) {
        await createHubForCurrentUser(hubNameAnswer, chosenBio, chosenAskAbout)

        const guest = await isGuestUser()
        setIsGuest(guest)
      } else {
        await signInAndCreateHub(hubNameAnswer, chosenBio, chosenAskAbout)
        session = await getSession()
        setIsGuest(true)
      }

      setHubName(hubNameAnswer)
      setHubStyle(chosenHubStyle)
      setHubColor(chosenHubColor)
      setHubBio(chosenBio)
      setHubAskAbout(chosenAskAbout)

      const userId = session?.user?.id

      setGeneratingStatus('Placing your hub in the universe...')

      await withTimeout(
        updateHub({
          bio: chosenBio,
          ask_about: chosenAskAbout,
          hub_style: chosenHubStyle,
          backdrop_id: chosenHubColor,
        }),
        12000,
        'Saving your hub took too long. Please try again.',
      )

      setHubAvatarUrl('')
      setOnboardingResumeState(null)
      setScreen('universe')

      void (async () => {
        try {
          const avatarUrl = await requestAvatarImage(
            conversationAnswers,
            userId,
            selectedStyle?.label,
          )

          if (!avatarUrl || !userId) return

          const permanentUrl = await uploadAvatarToStorage(avatarUrl, userId)
          setHubAvatarUrl(permanentUrl)
          await updateHub({ avatar_url: permanentUrl, avatar_prompt_pending: null })
        } catch (avatarError) {
          console.error('Avatar generation failed after hub creation:', avatarError)
          // Save the user's description so we can generate it later once the issue is fixed
          const pendingDescription = Object.values(conversationAnswers).filter(Boolean).join(' — ')
          try {
            await updateHub({ avatar_prompt_pending: pendingDescription })
          } catch {}
        }
      })()
    } catch (err) {
      console.error('Error during onboarding:', err)

      if (
        err instanceof Error &&
        err.message === 'That hub name is already taken. Choose another one.'
      ) {
        setOnboardingResumeState({ ...resumeState, phase: 'hubname' })
      } else {
        setOnboardingResumeState(resumeState)
      }

      setScreen('onboarding')
      setOnboardingError(
        err instanceof Error
          ? err.message
          : 'Your hub could not be created yet. Please try again.',
      )
    } finally {
      onboardingInFlightRef.current = false
    }
  }

  function GuestWall() {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,5,0.92)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 90,
          padding: '20px',
        }}
      >
        <div
          style={{
            width: 'min(440px, 95vw)',
            background: 'rgba(10,12,30,0.95)',
            border: '1px solid rgba(230,199,110,0.22)',
            borderRadius: '12px',
            padding: 'clamp(32px,5vw,48px)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '20%',
              right: '20%',
              height: '1px',
              background:
                'linear-gradient(90deg, transparent, rgba(230,199,110,0.45), transparent)',
            }}
          />

          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '9px',
                letterSpacing: '0.5em',
                color: 'rgba(201,168,76,0.6)',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              Before you write
            </p>

            <p
              style={{
                fontFamily: "'IM Fell English', serif",
                fontStyle: 'italic',
                fontSize: 'clamp(17px,2.5vw,22px)',
                color: 'rgba(255,255,255,0.9)',
                lineHeight: 1.6,
                marginBottom: '10px',
              }}
            >
              Letters need a home to return to.
            </p>

            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '15px',
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.7,
              }}
            >
              Create a free account so your letters can travel — and find their way back
              to you.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => {
                setShowGuestWall(false)
                setScreen('signup')
              }}
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                border: '1px solid rgba(201,168,76,0.5)',
                color: '#c9a84c',
                fontFamily: "'Cinzel', serif",
                fontSize: '10px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(201,168,76,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              Create an Account ✦
            </button>

            <button
              onClick={() => {
                setShowGuestWall(false)
                setScreen('login')
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.5)',
                fontFamily: "'Cinzel', serif",
                fontSize: '9px',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
              }}
            >
              Sign In Instead
            </button>

            <button
              onClick={() => setShowGuestWall(false)}
              style={{
                width: '100%',
                padding: '10px',
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.25)',
                fontFamily: "'Cinzel', serif",
                fontSize: '8px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Keep Exploring ←
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (screen === 'loading') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000005',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '11px',
            letterSpacing: '0.4em',
            color: 'rgba(201,168,76,0.4)',
          }}
        >
          ✦
        </div>
      </div>
    )
  }

  if (screen === 'generating') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000005',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
        }}
      >
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse 60% 40% at 20% 30%, rgba(40,20,80,0.25) 0%, transparent 70%)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '1px solid rgba(201,168,76,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '1px solid rgba(201,168,76,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '18px', color: '#c9a84c' }}>✦</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '11px',
              letterSpacing: '0.4em',
              color: 'rgba(201,168,76,0.7)',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
          >
            Soul Mirror
          </p>

          <p
            style={{
              fontFamily: "'IM Fell English', serif",
              fontStyle: 'italic',
              fontSize: '15px',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            {generatingStatus}
          </p>
        </div>

        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.08); opacity: 1; } }`}</style>
      </div>
    )
  }

  if (screen === 'login') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000005',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
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
              setHubColor(coerceHubColor(hub.backdrop_id))
              setHubDecoration((hub.decoration as HubDecoration) || 'none')
              setHubGlowIntensity((hub.glow_intensity as HubGlowIntensity) || 'normal')
              setLettersSent(hub.letters_sent || 0)
              setHubRegenCount(hub.regen_count || 0)
              setIsGuest(false)
              setScreen('universe')
              return
            }

            setOnboardingError('')
            setScreen('onboarding')
          }}
          onGoToSignup={() => {
            setOnboardingError('')
            setPendingCredentials(null)
            setScreen('signup')
          }}
          onGuestEnter={() => {
            setOnboardingError('')
            setPendingCredentials(null)
            setScreen('onboarding')
          }}
        />
      </div>
    )
  }

  if (screen === 'signup') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000005',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AuthBackground />
        <SignupScreen
          onSuccess={() => {
            setOnboardingError('')
            setScreen('onboarding')
          }}
          setPendingCredentials={setPendingCredentials}
          onGuestEnter={() => {
            setIsGuest(true)
            setScreen('onboarding')
          }}
        />
      </div>
    )
  }

  return (
    <>
      {screen === 'entry' && (
        <EntryScreen
          onEnter={() => {
            setOnboardingError('')
            setPendingCredentials(null)
            setScreen('signup')
          }}
          onLogin={() => {
            setOnboardingError('')
            setPendingCredentials(null)
            setScreen('login')
          }}
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
          hubBio={hubBio}
          hubAskAbout={hubAskAbout}
          hubAvatarUrl={hubAvatarUrl}
          hubStyle={hubStyle}
          hubColor={hubColor}
          hubDecoration={hubDecoration}
          hubGlowIntensity={hubGlowIntensity}
          onWriteLetter={(name) => {
            if (isGuest) {
              setShowGuestWall(true)
              return
            }
            setScribeRecipient(name)
            setScribeOpen(true)
          }}
          onObservatory={() => setObservatoryOpen(true)}
          onProfile={() => setProfileOpen(true)}
          navResetSignal={navResetSignal}
        />
      )}

      {showGuestWall && <GuestWall />}

      {scribeOpen && (
        <Scribe
          recipientName={scribeRecipient}
          senderName={hubName}
          lettersSent={lettersSent}
          onClose={() => { setScribeOpen(false); setNavResetSignal(s => s + 1) }}
          onSend={async (letter) => {
            if (isGuest) {
              alert('You must create an account or sign in to send letters.');
              setScribeOpen(false);
              setShowGuestWall(true);
              return;
            }
            try {
              const allHubs = await getAllHubs();
              const recipient = allHubs.find((hub) => hub.hub_name === letter.to);
              const isUniverseLetter = !letter.to;

              if (!isUniverseLetter && !recipient) {
                throw new Error('Recipient not found');
              }

              await sendLetter(
                recipient?.id || null,
                letter.body,
                letter.paperId,
                isUniverseLetter,
                letter.subject,
                letter.fontId,
              );

              setLettersSent((prev) => prev + 1);
              setScribeOpen(false);
            } catch (err) {
              console.error('Failed to send letter:', err);
            }
          }}
        />
      )}

      {observatoryOpen && (
        <Observatory
          onClose={() => { setObservatoryOpen(false); setNavResetSignal(s => s + 1) }}
          onWriteLetter={(name) => {
            if (isGuest) {
              setObservatoryOpen(false)
              setShowGuestWall(true)
              return
            }
            setObservatoryOpen(false)
            setScribeRecipient(name)
            setScribeOpen(true)
          }}
        />
      )}

      {profileOpen && (
        <Profile
          hubName={hubName}
          bio={hubBio}
          askAbout={hubAskAbout}
          avatarUrl={hubAvatarUrl}
          regenCount={hubRegenCount}
          hubStyle={hubStyle}
          hubColor={hubColor}
          hubDecoration={hubDecoration}
          hubGlowIntensity={hubGlowIntensity}
          onClose={() => { setProfileOpen(false); setNavResetSignal(s => s + 1) }}
          onUpdateHub={({ hubName: nextHubName, bio: nextBio, askAbout: nextAskAbout, avatarUrl: nextAvatarUrl, hubStyle: nextHubStyle, hubColor: nextHubColor, hubDecoration: nextHubDecoration, hubGlowIntensity: nextHubGlowIntensity }) => {
            if (typeof nextHubName === 'string') setHubName(nextHubName)
            if (typeof nextBio === 'string') setHubBio(nextBio)
            if (typeof nextAskAbout === 'string') setHubAskAbout(nextAskAbout)
            if (typeof nextAvatarUrl === 'string') setHubAvatarUrl(nextAvatarUrl)
            if (nextHubStyle) setHubStyle(nextHubStyle)
            if (nextHubColor) setHubColor(nextHubColor)
            if (nextHubDecoration) setHubDecoration(nextHubDecoration)
            if (nextHubGlowIntensity) setHubGlowIntensity(nextHubGlowIntensity)
          }}
        />
      )}
    </>
  )
}
