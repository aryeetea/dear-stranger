'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import EntryScreen from './components/EntryScreen'
import SoulMirror from './components/SoulMirror'
import type {
  MirrorVoice,
  SoulMirrorResumeState,
  StyleOption,
} from './components/SoulMirror'
import UniverseMap from './components/UniverseMap'
import {
  DEFAULT_HUB_PALETTE,
  isHubPaletteId,
  type HubPaletteId,
  type HubStyle,
} from './components/UniverseMap'
import Scribe from './components/Scribe'
import Observatory from './components/Observatory'
import Profile from './components/Profile'
import { LoginScreen, SignupScreen } from './components/AuthScreens'
import { supabase } from '../lib/supabase'
import { getLetterPreview } from './lib/letters'
import {
  signInAndCreateHub,
  signOut,
  createHubForCurrentUser,
  getSession,
  getMyHub,
  getAllHubs,
  sendLetter,
  updateHub,
  signIn,
  signUp,
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
  mode: 'create' | 'reimagine' = 'create',
  timeoutMs = 45000,
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    console.error('❌ Avatar fetch timed out after', timeoutMs, 'ms')
    controller.abort()
  }, timeoutMs)

  try {
    console.log('📡 calling /api/generate-avatar', {
      answerCount: Object.keys(answers || {}).length,
      userId,
      style,
      mode,
      timeoutMs,
    })

    const response = await fetch('/api/generate-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, userId, style, mode }),
      signal: controller.signal,
    })

    console.log('📡 /api/generate-avatar status:', response.status)

    const rawText = await response.text()
    console.log('📡 /api/generate-avatar raw response:', rawText)

    let data: any = {}
    try {
      data = rawText ? JSON.parse(rawText) : {}
    } catch (parseError) {
      console.error('❌ Failed to parse avatar API response as JSON:', parseError)
      throw new Error('Avatar API returned invalid JSON')
    }

    if (!response.ok || data.error) {
      console.error('❌ Avatar API error response:', data)
      throw new Error(data.error || `Avatar request failed with status ${response.status}`)
    }

    const imageValue =
      typeof data.imageUrl === 'string' && data.imageUrl.trim()
        ? data.imageUrl.trim()
        : typeof data.b64_json === 'string' && data.b64_json.trim()
          ? `data:image/png;base64,${data.b64_json.trim()}`
          : ''

    const isValidImageValue =
      /^https?:\/\//.test(imageValue) || /^data:image\//.test(imageValue)

    if (!isValidImageValue) {
      console.error('❌ Avatar API returned no usable image payload', {
        data,
        rawText,
      })
      return ''
    }

    console.log('✅ Avatar API parsed successfully')
    return imageValue
  } catch (error) {
    console.error('❌ requestAvatarImage failed:', error)
    throw error
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
  const [hubPaletteId, setHubPaletteId] = useState<HubPaletteId>(DEFAULT_HUB_PALETTE)
  const [hubRegenCount, setHubRegenCount] = useState(0)
  const [lettersSent, setLettersSent] = useState(0)
  const [generatingStatus, setGeneratingStatus] = useState('')
  const [avatarProgress, setAvatarProgress] = useState(0)
  const [scribeOpen, setScribeOpen] = useState(false)
  const [scribeRecipient, setScribeRecipient] = useState<string | undefined>()
  const [scribeInitialSubject, setScribeInitialSubject] = useState('')
  const [scribeInitialBody, setScribeInitialBody] = useState('')
  const [observatoryOpen, setObservatoryOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [showGuestWall, setShowGuestWall] = useState(false)
  const [onboardingError, setOnboardingError] = useState('')
  const [avatarStatusMessage, setAvatarStatusMessage] = useState('')
  const [onboardingResumeState, setOnboardingResumeState] =
    useState<SoulMirrorResumeState | null>(null)

  const screenRef = useRef<Screen>('loading')
  const onboardingInFlightRef = useRef(false)
  const avatarStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showTemporaryAvatarMessage = useCallback((message: string) => {
    setAvatarStatusMessage(message)

    if (avatarStatusTimeoutRef.current) {
      clearTimeout(avatarStatusTimeoutRef.current)
    }

    avatarStatusTimeoutRef.current = setTimeout(() => {
      setAvatarStatusMessage('')
      avatarStatusTimeoutRef.current = null
    }, 5000)
  }, [])

  const clearHubState = useCallback((resetResume = true) => {
    setHubName('')
    setHubBio('')
    setHubAskAbout('')
    setHubAvatarUrl('')
    setHubStyle('portal')
    setHubPaletteId(DEFAULT_HUB_PALETTE)
    setLettersSent(0)
    setHubRegenCount(0)
    setIsGuest(false)
    setScribeRecipient(undefined)
    setScribeInitialSubject('')
    setScribeInitialBody('')
    setAvatarProgress(0)
    setAvatarStatusMessage('')
    if (avatarStatusTimeoutRef.current) {
      clearTimeout(avatarStatusTimeoutRef.current)
      avatarStatusTimeoutRef.current = null
    }
    if (resetResume) setOnboardingResumeState(null)
  }, [])

  useEffect(() => {
    return () => {
      if (avatarStatusTimeoutRef.current) {
        clearTimeout(avatarStatusTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    screenRef.current = screen
  }, [screen])

  function openScribe({
    recipient,
    initialSubject = '',
    initialBody = '',
  }: {
    recipient?: string
    initialSubject?: string
    initialBody?: string
  } = {}) {
    setScribeRecipient(recipient)
    setScribeInitialSubject(initialSubject)
    setScribeInitialBody(initialBody)
    setScribeOpen(true)
  }

  function hasSavedHubIdentity(hub: Awaited<ReturnType<typeof getMyHub>>) {
    return Boolean(hub?.hub_name?.trim())
  }

  const routeFromSession = useCallback(async () => {
    try {
      const session = await getSession()

      if (!session) {
        clearHubState()
        setScreen('entry')
        return
      }

      const hub = await getMyHub()

      if (hasSavedHubIdentity(hub)) {
        setHubName(hub?.hub_name || '')
        setHubBio(hub?.bio || '')
        setHubAskAbout(hub?.ask_about || '')
        setHubAvatarUrl(hub?.avatar_url || '')
        setHubStyle((hub?.hub_style as HubStyle) || 'portal')
        setHubPaletteId(
          isHubPaletteId(hub?.backdrop_id) ? hub.backdrop_id : DEFAULT_HUB_PALETTE,
        )
        setLettersSent(hub?.letters_sent || 0)
        setHubRegenCount(hub?.regen_count || 0)
        setOnboardingError('')
        setOnboardingResumeState(null)

        const guest = await isGuestUser()
        setIsGuest(guest)

        setScreen('universe')
        return
      }

      clearHubState(false)
      setScreen('onboarding')
    } catch (err) {
      console.error('routeFromSession failed:', err)
      clearHubState()
      setScreen('entry')
    }
  }, [clearHubState])

  useEffect(() => {
    async function checkSession() {
      try {
        const hasStaleToken = Object.keys(localStorage).some((k) => k.includes('supabase'))
        if (hasStaleToken) {
          try {
            const { data } = await supabase.auth.getSession()
            if (!data.session) {
              localStorage.clear()
            }
          } catch {
            localStorage.clear()
          }
        }

        await routeFromSession()
      } catch (err) {
        console.error('checkSession failed:', err)
        try {
          await signOut()
        } catch {}
        clearHubState()
        setScreen('entry')
      }
    }

    void checkSession()

    const loadingFallback = setTimeout(() => {
      if (screenRef.current === 'loading') {
        console.warn('Forced exit from loading')
        setScreen('entry')
      }
    }, 3000)

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        clearHubState()
        setOnboardingError('')
        setScreen('entry')
        return
      }

      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'INITIAL_SESSION'
      ) {
        if (onboardingInFlightRef.current || screenRef.current === 'generating') return

        try {
          await routeFromSession()
        } catch (err) {
          console.error('auth state sync failed:', err)
        }
      }
    })

    return () => {
      clearTimeout(loadingFallback)
      authListener.subscription.unsubscribe()
    }
  }, [routeFromSession, clearHubState])

  async function handleOnboardingComplete(
    answers: Record<number, string>,
    selectedStyle?: StyleOption,
    selectedHubStyle?: HubStyle,
    selectedHubPalette?: HubPaletteId,
    mirrorVoice?: MirrorVoice,
    userBio?: string,
    userHubName?: string,
    userAskAbout?: string,
    creationMode: 'guided' | 'direct' = 'guided',
    directAvatarDescription = '',
  ) {
    setOnboardingError('')
    console.log('1. onboarding started')

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
    const chosenHubPalette = selectedHubPalette || DEFAULT_HUB_PALETTE
    const chosenBio = userBio?.trim() || fallbackBio
    const chosenAskAbout = userAskAbout?.trim() || fallbackAskAbout
    const trimmedDirectDescription = directAvatarDescription.trim()
    const avatarAnswers: Record<number, string> = { ...conversationAnswers }

    if (creationMode === 'direct' && trimmedDirectDescription) {
      avatarAnswers[0] = trimmedDirectDescription
      if (selectedStyle) {
        avatarAnswers[1] = `Visual direction: ${selectedStyle.label}. ${selectedStyle.desc}.`
      }
      avatarAnswers[2] = `Hub atmosphere: ${chosenHubStyle} form with ${chosenHubPalette} light.`
    }

    const resumeState: SoulMirrorResumeState = {
      phase: 'welcome',
      selectedStyle,
      selectedHubStyle: chosenHubStyle,
      selectedHubPalette: chosenHubPalette,
      selectedVoice: mirrorVoice,
      userAnswers: keys.slice(0, -1).map((key) => answers[key]),
      hubName: hubNameAnswer,
      bio: chosenBio,
      askAbout: chosenAskAbout,
      creationMode,
      directAvatarDescription: trimmedDirectDescription,
    }

    try {
      onboardingInFlightRef.current = true
      setScreen('generating')
      setGeneratingStatus('Crafting your soul mirror...')
      setAvatarProgress(0)

      console.log('2. before getSession')
      let session = await getSession()

      if (session) {
        console.log('3. session exists, creating hub for current user')
        await createHubForCurrentUser(hubNameAnswer, chosenBio, chosenAskAbout)

        const guest = await isGuestUser()
        setIsGuest(guest)
      } else {
        console.log('4. no session, signing in anonymously and creating hub')
        await signInAndCreateHub(hubNameAnswer, chosenBio, chosenAskAbout)
        session = await getSession()
        setIsGuest(true)
      }

      console.log('5. after hub creation')

      setHubName(hubNameAnswer)
      setHubStyle(chosenHubStyle)
      setHubPaletteId(chosenHubPalette)
      setHubBio(chosenBio)
      setHubAskAbout(chosenAskAbout)

      const freshSession = await getSession()
      let userId = freshSession?.user?.id

      console.log('🔥 userId for avatar:', userId)

      if (!userId) {
        console.error('❌ Avatar generation skipped: missing userId')
      }

      setGeneratingStatus('Placing your hub in the universe...')

      console.log('6. before updateHub')
      await withTimeout(
        updateHub({
          bio: chosenBio,
          ask_about: chosenAskAbout,
          hub_style: chosenHubStyle,
          backdrop_id: chosenHubPalette,
        }),
        12000,
        'Saving your hub took too long. Please try again.',
      )
      console.log('7. after updateHub')

      setHubAvatarUrl('')
      setOnboardingResumeState(null)
      setScreen('universe')

      console.log('🚀 About to start avatar generation block')

      let progress = 5
      setAvatarProgress(progress)

      const interval = setInterval(() => {
        progress += Math.random() * 10
        if (progress >= 90) progress = 90
        setAvatarProgress(Math.floor(progress))

        if (progress < 30) {
          setGeneratingStatus('Summoning your form...')
        } else if (progress < 70) {
          setGeneratingStatus('Shaping your soul mirror...')
        } else {
          setGeneratingStatus('Finalizing your presence...')
        }
      }, 500)

      void (async () => {
        try {
          console.log('🔥 Inside avatar async block')
          console.log('Starting avatar generation')

          if (!userId) {
            const latestSession = await getSession()
            userId = latestSession?.user?.id
          }

          console.log('User ID:', userId)
          console.log('Answers:', avatarAnswers)

          if (!userId) {
            console.error('Avatar failed to generate')
            showTemporaryAvatarMessage('Still crafting your avatar...')
            clearInterval(interval)
            setAvatarProgress(0)
            return
          }

          const avatarUrl = await requestAvatarImage(
            avatarAnswers,
            userId,
            selectedStyle?.id,
            'create',
          )

          console.log('🔥 Avatar API returned:', avatarUrl)

          if (!avatarUrl) {
            console.error('Avatar failed to generate')
            showTemporaryAvatarMessage('Still crafting your avatar...')
            clearInterval(interval)
            setAvatarProgress(0)
            return
          }

          if (!userId) {
            console.error('❌ Missing userId, cannot upload avatar')
            clearInterval(interval)
            setAvatarProgress(0)
            return
          }

          const permanentUrl = await uploadAvatarToStorage(avatarUrl, userId)
          console.log('✅ Uploaded avatar:', permanentUrl)

          clearInterval(interval)
          setAvatarProgress(100)
          setGeneratingStatus('Your soul mirror has arrived.')

          setHubAvatarUrl(permanentUrl)
          await updateHub({ avatar_url: permanentUrl })
          console.log('✅ Updated hub avatar_url')
        } catch (avatarError) {
          console.error('❌ Avatar generation failed:', avatarError)
          showTemporaryAvatarMessage('Still crafting your avatar...')
          clearInterval(interval)
          setAvatarProgress(0)
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
      setAvatarProgress(0)
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
          padding: 'clamp(20px, 5vw, 32px)',
          overflowY: 'auto',
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
            margin: 'auto',
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
          padding: 'clamp(24px, 6vw, 40px)',
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

          <p
            style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.5)',
              marginTop: '10px',
            }}
          >
            {avatarProgress > 0 ? `${avatarProgress}%` : ''}
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
          padding: 'clamp(20px, 5vw, 32px)',
          overflowY: 'auto',
        }}
      >
        <AuthBackground />
        <LoginScreen
          onSuccess={async () => {
            setOnboardingResumeState(null)
            setOnboardingError('')
            await routeFromSession()
          }}
          onGoToSignup={() => {
            setOnboardingError('')
            setScreen('signup')
          }}
          onGuestEnter={() => {
            setOnboardingError('')
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
          padding: 'clamp(20px, 5vw, 32px)',
          overflowY: 'auto',
        }}
      >
        <AuthBackground />
        <SignupScreen
          onSuccess={() => {
            setOnboardingError('')
            setScreen('onboarding')
          }}
          onCreateAccount={async (email, password) => {
            await signOut()
            await signUp(email, password)
            await signIn(email, password)
          }}
          onGoToLogin={() => {
            setOnboardingError('')
            setScreen('login')
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
            setScreen('onboarding')
          }}
          onLogin={() => {
            setOnboardingError('')
            setScreen('login')
          }}
          onSignup={() => {
            setOnboardingError('')
            setScreen('signup')
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
          hubAvatarUrl={hubAvatarUrl}
          hubStyle={hubStyle}
          hubPaletteId={hubPaletteId}
          onWriteLetter={(name) => {
            if (isGuest) {
              setShowGuestWall(true)
              return
            }
            openScribe({ recipient: name })
          }}
          onUniversePrompt={(prompt) => {
            if (isGuest) {
              setShowGuestWall(true)
              return
            }
            openScribe({
              initialSubject: prompt.subject,
              initialBody: prompt.bodyStarter,
            })
          }}
          onObservatory={() => setObservatoryOpen(true)}
          onProfile={() => setProfileOpen(true)}
        />
      )}

      {avatarStatusMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(420px, calc(100vw - 24px))',
            padding: '12px 16px',
            background: 'rgba(10,12,30,0.92)',
            border: '1px solid rgba(230,199,110,0.28)',
            borderRadius: '10px',
            zIndex: 95,
            boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
          }}
        >
          <p
            style={{
              fontFamily: "'IM Fell English', serif",
              fontStyle: 'italic',
              fontSize: '14px',
              color: 'rgba(255,255,255,0.9)',
              textAlign: 'center',
            }}
          >
            {avatarStatusMessage}
          </p>
        </div>
      )}

      {showGuestWall && <GuestWall />}

      {scribeOpen && (
        <Scribe
          key={[scribeRecipient || '', scribeInitialSubject, scribeInitialBody].join('::')}
          recipientName={scribeRecipient}
          lettersSent={lettersSent}
          initialSubject={scribeInitialSubject}
          initialBody={scribeInitialBody}
          onClose={() => {
            setScribeOpen(false)
            setScribeRecipient(undefined)
            setScribeInitialSubject('')
            setScribeInitialBody('')
          }}
          onSend={async (letter) => {
            try {
              const allHubs = await getAllHubs()
              const recipient = allHubs.find((hub) => hub.hub_name === letter.to)
              const isUniverseLetter = !letter.to

              if (!isUniverseLetter && !recipient) {
                throw new Error('Recipient not found')
              }

              const result = await sendLetter(
                recipient?.id || null,
                letter.body,
                letter.paperId,
                isUniverseLetter,
                letter.subject,
                letter.fontId,
              )

              if (isUniverseLetter && typeof window !== 'undefined') {
                const insertedLetter = Array.isArray(result) ? result[0] : null

                window.dispatchEvent(
                  new CustomEvent('dear-stranger:universe-letter-sent', {
                    detail: {
                      id: insertedLetter?.id || `universe-${Date.now()}`,
                      senderName: hubName || 'A Stranger',
                      preview: getLetterPreview(letter.body, 120),
                    },
                  }),
                )
              }

              setLettersSent((prev) => prev + 1)
              setScribeOpen(false)
              setScribeRecipient(undefined)
              setScribeInitialSubject('')
              setScribeInitialBody('')
            } catch (err) {
              console.error('Failed to send letter:', err)
            }
          }}
        />
      )}

      {observatoryOpen && (
        <Observatory
          onClose={() => setObservatoryOpen(false)}
          onWriteLetter={(name) => {
            if (isGuest) {
              setObservatoryOpen(false)
              setShowGuestWall(true)
              return
            }
            setObservatoryOpen(false)
            openScribe({ recipient: name })
          }}
        />
      )}

      {profileOpen && (
        <Profile
          hubName={hubName}
          bio={hubBio}
          askAbout={hubAskAbout}
          avatarUrl={hubAvatarUrl}
          hubStyle={hubStyle}
          hubPaletteId={hubPaletteId}
          regenCount={hubRegenCount}
          onClose={() => setProfileOpen(false)}
          onUpdateHub={({
            hubName: nextHubName,
            bio: nextBio,
            askAbout: nextAskAbout,
            avatarUrl: nextAvatarUrl,
            hubStyle: nextHubStyle,
            hubPaletteId: nextHubPaletteId,
          }) => {
            if (typeof nextHubName === 'string') setHubName(nextHubName)
            if (typeof nextBio === 'string') setHubBio(nextBio)
            if (typeof nextAskAbout === 'string') setHubAskAbout(nextAskAbout)
            if (typeof nextAvatarUrl === 'string') setHubAvatarUrl(nextAvatarUrl)
            if (nextHubStyle) setHubStyle(nextHubStyle)
            if (nextHubPaletteId) setHubPaletteId(nextHubPaletteId)
          }}
        />
      )}
    </>
  )
}
