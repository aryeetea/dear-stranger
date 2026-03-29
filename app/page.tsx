'use client'

import { useEffect, useRef, useState } from 'react'
import EntryScreen from './components/EntryScreen'
import LandingPage from './components/LandingPage'
import SoulMirror from './components/SoulMirror'
import type { MirrorVoice, SoulMirrorResumeState, StyleOption } from './components/SoulMirror'
import UniverseMap from './components/UniverseMap'
import type { HubColor, HubStyle, HubDecoration, HubGlowIntensity } from './components/UniverseMap'
import Scribe from './components/Scribe'
import Observatory from './components/Observatory'
import Profile from './components/Profile'
import DriftStream from './components/DriftStream'
import { LoginScreen, SignupScreen } from './components/AuthScreens'
import NotificationBanner, { sendLocalNotification } from './components/NotificationBanner'
import { supabase } from '../lib/supabase'
import {
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
  getMyLetters,
} from './lib/auth'
import { playChime, startAmbient, stopAmbient, setAmbientMuted } from '../lib/sounds'

type Screen =
  | 'landing'
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
  timeoutMs = 120000,
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    let token: string | undefined

    // getSession() auto-refreshes the token when it's close to expiry —
    // never call refreshSession() explicitly as Supabase rate-limits it.
    const { data: { session } } = await supabase.auth.getSession()
    token = session?.access_token

    const response = await fetch('/api/generate-avatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
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

// ── Nebula drifting blobs (global background layer) ──────────
function NebulaBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', width: '80vw', height: '65vh', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(55,20,110,0.22) 0%, transparent 70%)',
        top: '-15%', left: '-20%',
        animation: 'nebula-drift-1 30s ease-in-out infinite alternate',
      }} />
      <div style={{
        position: 'absolute', width: '65vw', height: '75vh', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(15,35,95,0.18) 0%, transparent 70%)',
        bottom: '-25%', right: '-15%',
        animation: 'nebula-drift-2 38s ease-in-out infinite alternate',
      }} />
      <div style={{
        position: 'absolute', width: '55vw', height: '55vh', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(90,15,55,0.12) 0%, transparent 70%)',
        top: '25%', right: '15%',
        animation: 'nebula-drift-3 24s ease-in-out infinite alternate',
      }} />
    </div>
  )
}

// ── Brief radial warp when the active screen changes ─────────
function WarpFlash({ screenKey }: { screenKey: string }) {
  const [active, setActive] = useState(false)
  const prevKey = useRef(screenKey)
  useEffect(() => {
    if (prevKey.current !== screenKey) {
      prevKey.current = screenKey
      setActive(true)
      const t = setTimeout(() => setActive(false), 700)
      return () => clearTimeout(t)
    }
  }, [screenKey])
  if (!active) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, pointerEvents: 'none',
      animation: 'warp-flash 0.7s ease-out forwards',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(20,10,50,0.82) 0%, rgba(4,5,15,0.55) 55%, transparent 100%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 18% 28% at 50% 50%, rgba(201,168,76,0.12) 0%, transparent 100%)',
      }} />
    </div>
  )
}

// ── Shooting-star animation that plays after a letter is sent ─
function LetterDepartAnimation({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')!
    let progress = 0
    const startX = canvas.width * 0.5
    const startY = canvas.height * 0.78
    const endX = canvas.width * 0.82
    const endY = canvas.height * 0.08
    const tail: { x: number; y: number }[] = []
    let frame: number
    const animate = () => {
      progress += 0.022
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (progress >= 1) {
        cancelAnimationFrame(frame)
        onDone()
        return
      }
      const t = 1 - Math.pow(1 - Math.min(progress, 1), 3)
      const x = startX + (endX - startX) * t
      const y = startY + (endY - startY) * t
      tail.push({ x, y })
      if (tail.length > 24) tail.shift()
      tail.forEach((p, i) => {
        const frac = i / tail.length
        ctx.beginPath()
        ctx.arc(p.x, p.y, Math.max(frac * 3.5, 0.5), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(201,168,76,${frac * 0.75})`
        ctx.fill()
      })
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 14)
      glow.addColorStop(0, 'rgba(255,245,180,1)')
      glow.addColorStop(0.35, 'rgba(201,168,76,0.7)')
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(x, y, 14, 0, Math.PI * 2)
      ctx.fill()
      frame = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(frame)
  }, [onDone])
  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 500, pointerEvents: 'none',
        animation: 'letter-depart-bg 1.5s ease-in-out forwards',
      }} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 501, pointerEvents: 'none' }} />
      <div style={{
        position: 'fixed', bottom: '28%', left: '50%',
        zIndex: 502, pointerEvents: 'none', textAlign: 'center', whiteSpace: 'nowrap',
        animation: 'letter-depart-text 1.5s ease-in-out forwards',
      }}>
        <p style={{
          fontFamily: "'IM Fell English', serif", fontStyle: 'italic',
          fontSize: '19px', color: 'rgba(201,168,76,0.92)',
          letterSpacing: '0.06em', margin: 0,
        }}>
          Your letter departs into the void…
        </p>
      </div>
      <style>{`
        @keyframes letter-depart-bg {
          0%   { background: rgba(0,0,5,0); }
          25%  { background: rgba(0,0,5,0.55); }
          100% { background: rgba(0,0,5,0); }
        }
        @keyframes letter-depart-text {
          0%   { opacity: 0; transform: translateX(-50%) translateY(8px); }
          20%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          75%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
        }
      `}</style>
    </>
  )
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [hubName, setHubName] = useState('')
  const [hubBio, setHubBio] = useState('')
  const [hubAskAbout, setHubAskAbout] = useState('')
  const [hubAvatarUrl, setHubAvatarUrl] = useState('')
  const [hubAvatarPending, setHubAvatarPending] = useState<string | null>(null)
  const avatarRetryAttemptedRef = useRef(false)
  const [hubStyle, setHubStyle] = useState<HubStyle>('portal')
  const [hubColor, setHubColor] = useState<HubColor>('gold')
  const [hubDecoration, setHubDecoration] = useState<HubDecoration>('none')
  const [hubGlowIntensity, setHubGlowIntensity] = useState<HubGlowIntensity>('normal')
  const [hubRegenCount, setHubRegenCount] = useState(0)
  const [hubCreatedAt, setHubCreatedAt] = useState('')
  const [lettersSent, setLettersSent] = useState(0)
  const [generatingStatus, setGeneratingStatus] = useState('')
  const [avatarGenerating, setAvatarGenerating] = useState(false)
  const [scribeOpen, setScribeOpen] = useState(false)
  const [scribeRecipient, setScribeRecipient] = useState<string | undefined>()
  const [observatoryOpen, setObservatoryOpen] = useState(false)
  const [driftstreamOpen, setDriftstreamOpen] = useState(false)
  const [navResetSignal, setNavResetSignal] = useState(0)
  const [ambientMuted, setAmbientMutedState] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('ds_ambient_muted') === '1'
  })
  const [profileOpen, setProfileOpen] = useState(false)
  const [sendFlashing, setSendFlashing] = useState(false)
  const [pendingCredentials, setPendingCredentials] = useState<{
    email: string
    password: string
  } | null>(null)
  const [onboardingError, setOnboardingError] = useState('')
  const [onboardingResumeState, setOnboardingResumeState] =
    useState<SoulMirrorResumeState | null>(null)

  const screenRef = useRef<Screen>('loading')
  const onboardingInFlightRef = useRef(false)

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
    setHubCreatedAt('')
    setHubAvatarPending(null)
    if (resetResume) setOnboardingResumeState(null)
  }

  useEffect(() => {
    screenRef.current = screen
  }, [screen])

  // Auto-retry avatar generation when returning to universe with a pending description,
  // or as a fallback for users who have no avatar and no pending prompt (use their bio).
  useEffect(() => {
    if (screen !== 'universe' || hubAvatarUrl || avatarRetryAttemptedRef.current) return
    const prompt = hubAvatarPending || hubBio
    if (!prompt) return
    avatarRetryAttemptedRef.current = true
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setAvatarGenerating(true)
        const avatarUrl = await requestAvatarImage({ 0: prompt }, user.id)
        if (!avatarUrl) return
        const permanentUrl = await uploadAvatarToStorage(avatarUrl, user.id)
        setHubAvatarUrl(permanentUrl)
        setHubAvatarPending(null)
        await updateHub({ avatar_url: permanentUrl, avatar_prompt_pending: null })
      } catch (err) {
        console.error('Avatar auto-retry failed:', err)
      } finally {
        setAvatarGenerating(false)
      }
    })()
  }, [screen, hubAvatarPending, hubAvatarUrl, hubBio])

  // Start/stop cosmic ambient based on screen
  useEffect(() => {
    if (screen === 'universe') {
      startAmbient(ambientMuted)
    } else {
      stopAmbient()
    }
    return () => { if (screen === 'universe') stopAmbient() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  function toggleAmbient() {
    const next = !ambientMuted
    setAmbientMutedState(next)
    setAmbientMuted(next)
    if (typeof window !== 'undefined') localStorage.setItem('ds_ambient_muted', next ? '1' : '0')
  }

  // Poll for newly arrived letters every 60s while on universe screen
  const knownArrivedCountRef = useRef<number | null>(null)
  useEffect(() => {
    if (screen !== 'universe') return
    async function checkArrivals() {
      try {
        const data = await getMyLetters()
        const arrivedCount = (data.arrived || []).filter((l: any) => l.direction === 'received').length
        if (knownArrivedCountRef.current === null) {
          knownArrivedCountRef.current = arrivedCount
          return
        }
        if (arrivedCount > knownArrivedCountRef.current) {
          const newCount = arrivedCount - knownArrivedCountRef.current
          knownArrivedCountRef.current = arrivedCount
          playChime()
          sendLocalNotification(
            'Dear Stranger',
            newCount === 1
              ? 'A letter has found its way to you ✦'
              : `${newCount} letters have arrived at your hub ✦`
          )
        } else {
          knownArrivedCountRef.current = arrivedCount
        }
      } catch { /* silent */ }
    }
    void checkArrivals()
    const interval = setInterval(() => void checkArrivals(), 60_000)
    return () => {
      clearInterval(interval)
      knownArrivedCountRef.current = null
    }
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
        setScreen('landing')
        console.log('[routeFromSession] no session, go to landing')
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
        setHubAvatarPending((hub as any).avatar_prompt_pending || null)
        setHubStyle((hub.hub_style as HubStyle) || 'portal')
        setHubColor(coerceHubColor(hub.backdrop_id))
        setHubDecoration((hub.decoration as HubDecoration) || 'none')
        setHubGlowIntensity((hub.glow_intensity as HubGlowIntensity) || 'normal')
        setLettersSent(hub.letters_sent || 0)
        setHubRegenCount(hub.regen_count || 0)
        setHubCreatedAt((hub as any).created_at || '')
        setOnboardingError('')
        setOnboardingResumeState(null)

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
      setScreen('landing')
      console.log('[routeFromSession] fallback to landing')
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
        setScreen('landing')
        console.log('[checkSession] fallback to landing')
      }
    }

    checkSession()

    // Fallback: if still loading after 10s, go to entry
    fallbackTimer = setTimeout(() => {
      if (screenRef.current === 'loading') {
        clearHubState()
        setScreen('landing')
        console.log('[fallbackTimer] loading >10s, go to landing')
      }
    }, 10000)

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (ignore) return;
      console.log('[authStateChange]', event)
      if (event === 'SIGNED_OUT') {
        clearHubState()
        setPendingCredentials(null)
        setOnboardingError('')
        setScreen('landing')
        console.log('[authStateChange] SIGNED_OUT, go to landing')
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
    hubDecoration?: HubDecoration,
  ) {
    setOnboardingError('')

    const keys = Object.keys(answers)
      .map(Number)
      .sort((a, b) => a - b)

    const hubNameAnswer = (userHubName || answers[keys[keys.length - 1]] || 'Your Hub').trim()


    // Only use the user's explicit avatar description for avatar generation
    // Assume the first answer is the avatar description (from freeform or guided)
    const avatarDescription = answers[0]?.trim() || ''
    const chosenHubStyle = selectedHubStyle || 'portal'
    const chosenHubColor = selectedHubColor || 'gold'
    const chosenDecoration: HubDecoration = hubDecoration || 'none'
    const chosenBio = userBio?.trim() || 'A wanderer who arrived here quietly, carrying something unspoken.'
    const chosenAskAbout = userAskAbout?.trim() || 'Silence, slow mornings, and letters that take their time.'

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

      try {
        onboardingInFlightRef.current = true
        setScreen('generating')
        setGeneratingStatus('Crafting your soul mirror...')

        let session = await getSession()

        if (pendingCredentials) {
          let signUpFailed = false
          try {
            await signUpAndCreateHub(
              pendingCredentials.email,
              pendingCredentials.password,
              hubNameAnswer,
              chosenBio,
              chosenAskAbout,
              chosenHubStyle,
              chosenHubColor,
              chosenDecoration,
            )
          } catch (signUpErr) {
            // Auth user may already exist from a previous partial attempt — sign in instead
            const msg = signUpErr instanceof Error ? signUpErr.message.toLowerCase() : ''
            if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
              signUpFailed = true
            } else {
              throw signUpErr
            }
          }

          if (signUpFailed) {
            await signIn(pendingCredentials.email, pendingCredentials.password)
          }

          session = await getSession()

          if (!session) {
            await signIn(pendingCredentials.email, pendingCredentials.password)
            session = await getSession()
          }

          // Ensure the hub row exists (safe to call even if it was already created)
          if (session) {
            await createHubForCurrentUser(hubNameAnswer, chosenBio, chosenAskAbout, chosenHubStyle, chosenHubColor, chosenDecoration)
          }

          setPendingCredentials(null)
        } else if (session) {
          await createHubForCurrentUser(hubNameAnswer, chosenBio, chosenAskAbout, chosenHubStyle, chosenHubColor, chosenDecoration)
        } else {
          setScreen('entry')
          return
        }

        setHubName(hubNameAnswer)
        setHubStyle(chosenHubStyle)
        setHubColor(chosenHubColor)
        setHubDecoration(chosenDecoration)
        setHubBio(chosenBio)
        setHubAskAbout(chosenAskAbout)
        setHubCreatedAt(new Date().toISOString())

        const userId = session?.user?.id

        setGeneratingStatus('Placing your hub in the universe...')

        await withTimeout(
          updateHub({
            bio: chosenBio,
            ask_about: chosenAskAbout,
            hub_style: chosenHubStyle,
            backdrop_id: chosenHubColor,
            decoration: chosenDecoration,
          }),
          12000,
          'Saving your hub took too long. Please try again.',
        )

        setHubAvatarUrl('')
        setOnboardingResumeState(null)
        setScreen('universe')

        void (async () => {
          try {
            // Only use the user's explicit avatar description for avatar generation
            if (!avatarDescription || !userId) return
            setAvatarGenerating(true)
            const avatarUrl = await requestAvatarImage({ 0: avatarDescription }, userId, selectedStyle?.label)
            if (!avatarUrl) return
            const permanentUrl = await uploadAvatarToStorage(avatarUrl, userId)
            setHubAvatarUrl(permanentUrl)
            setHubAvatarPending(null)
            await updateHub({ avatar_url: permanentUrl, avatar_prompt_pending: null })
          } catch (avatarError) {
            console.error('Avatar generation failed after hub creation:', avatarError)
            // Save the user's description so we can retry it automatically
            if (avatarDescription) {
              try {
                setHubAvatarPending(avatarDescription)
                await updateHub({ avatar_prompt_pending: avatarDescription })
              } catch {}
            }
          } finally {
            setAvatarGenerating(false)
          }
        })()
      } catch (err) {
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
      }
    } finally {
      onboardingInFlightRef.current = false
    }
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
              setHubAvatarPending((hub as any).avatar_prompt_pending || null)
              setHubStyle((hub.hub_style as HubStyle) || 'portal')
              setHubColor(coerceHubColor(hub.backdrop_id))
              setHubDecoration((hub.decoration as HubDecoration) || 'none')
              setHubGlowIntensity((hub.glow_intensity as HubGlowIntensity) || 'normal')
              setLettersSent(hub.letters_sent || 0)
              setHubRegenCount(hub.regen_count || 0)
              setHubCreatedAt((hub as any).created_at || '')
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
        />
      </div>
    )
  }

  return (
    <>
      <NebulaBackground />
      <WarpFlash screenKey={screen} />
      {sendFlashing && (
        <LetterDepartAnimation onDone={() => {
          setSendFlashing(false)
          setScribeOpen(false)
          setNavResetSignal(s => s + 1)
          sendLocalNotification('Dear Stranger', 'Your letter is traveling across the universe ✦')
        }} />
      )}
      {screen === 'landing' && (
        <LandingPage
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
          avatarGenerating={avatarGenerating}
          onWriteLetter={(name) => {
            setScribeRecipient(name)
            setScribeOpen(true)
          }}
          onObservatory={() => setObservatoryOpen(true)}
          onProfile={() => setProfileOpen(true)}
          onDriftstream={() => setDriftstreamOpen(true)}
          navResetSignal={navResetSignal}
        />
      )}

      {screen === 'universe' && <NotificationBanner />}

      {screen === 'universe' && (
        <button
          onClick={toggleAmbient}
          title={ambientMuted ? 'Unmute ambient' : 'Mute ambient'}
          style={{
            position: 'fixed', top: '24px', left: '24px', zIndex: 60,
            background: 'rgba(8,10,28,0.7)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)', color: ambientMuted ? 'rgba(255,255,255,0.3)' : 'rgba(201,168,76,0.8)',
            fontSize: '14px', transition: 'color 0.3s, border-color 0.3s',
          }}
        >
          {ambientMuted ? '🔇' : '🔊'}
        </button>
      )}

      {screen === 'universe' && avatarGenerating && (
        <div style={{
          position: 'fixed',
          bottom: '88px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(6,4,20,0.88)',
          border: '1px solid rgba(201,168,76,0.3)',
          borderRadius: '999px',
          padding: '10px 20px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 0 24px rgba(201,168,76,0.12)',
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            border: '1.5px solid rgba(201,168,76,0.25)',
            borderTopColor: 'rgba(201,168,76,0.9)',
            animation: 'avatar-spin 0.9s linear infinite',
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '10px',
            letterSpacing: '0.18em',
            color: 'rgba(201,168,76,0.8)',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>Weaving your form...</span>
          <style>{`@keyframes avatar-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {scribeOpen && (
        <Scribe
          recipientName={scribeRecipient}
          senderName={hubName}
          lettersSent={lettersSent}
          onClose={() => { setScribeOpen(false); setNavResetSignal(s => s + 1) }}
          onSend={async (letter) => {
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
                letter.colorId,
                letter.paperColorId,
                letter.stampId,
                letter.envelopeId,
              );

              setLettersSent((prev) => prev + 1);
              setSendFlashing(true);
            } catch (err) {
              console.error('Failed to send letter:', err);
            }
          }}
        />
      )}

      {driftstreamOpen && (
        <DriftStream
          onClose={() => { setDriftstreamOpen(false); setNavResetSignal(s => s + 1) }}
        />
      )}

      {observatoryOpen && (
        <Observatory
          onClose={() => { setObservatoryOpen(false); setNavResetSignal(s => s + 1) }}
          onWriteLetter={(name) => {
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
          avatarPromptPending={hubAvatarPending}
          regenCount={hubRegenCount}
          hubCreatedAt={hubCreatedAt}
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
