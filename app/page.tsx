'use client'

import { useEffect, useState } from 'react'
import EntryScreen from './components/EntryScreen'
import SoulMirror from './components/SoulMirror'
import UniverseMap from './components/UniverseMap'
import type { HubStyle } from './components/UniverseMap'
import Scribe from './components/Scribe'
import Observatory from './components/Observatory'
import Profile from './components/Profile'
import { LoginScreen, SignupScreen } from './components/AuthScreens'
import {
  signInAndCreateHub, signUpAndCreateHub, signOut,
  getSession, getMyHub, getAllHubs, sendLetter, updateHub,
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

  useEffect(() => {
    async function checkSession() {
      try {
        const session = await getSession()
        if (session) {
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
          await signOut()
        }
        setScreen('entry')
      } catch (err) {
        console.error('checkSession failed:', err)
        try { await signOut() } catch {}
        setScreen('entry')
      }
    }
    checkSession()
  }, [])

  async function handleOnboardingComplete(
    answers: Record<number, string>,
    selectedStyle?: { id: string; label: string; desc: string },
    selectedHubStyle?: HubStyle,
    mirrorVoice?: { id: string; label: string },
    backdrop?: { id: string; label: string; colors: string[] },
    userBio?: string,
    userHubName?: string,
  ) {
    const keys = Object.keys(answers).map(Number).sort((a, b) => a - b)
    const hubNameAnswer = userHubName || answers[keys[keys.length - 1]] || 'Your Hub'
    const conversationAnswers: Record<number, string> = {}
    for (let i = 0; i < keys.length - 1; i++) conversationAnswers[i] = answers[keys[i]]

    const fallbackBio = 'A wanderer who arrived here quietly, carrying something unspoken.'
    const fallbackAskAbout = 'Silence, slow mornings, and letters that take their time.'
    const chosenHubStyle = selectedHubStyle || 'portal'
    const chosenBio = userBio?.trim() || fallbackBio

    try {
      setScreen('generating')
      setGeneratingStatus('Crafting your soul mirror...')

      if (pendingCredentials) {
        await signUpAndCreateHub(pendingCredentials.email, pendingCredentials.password, hubNameAnswer, chosenBio, fallbackAskAbout)
        setPendingCredentials(null)
      } else {
        await signInAndCreateHub(hubNameAnswer, chosenBio, fallbackAskAbout)
      }

      setHubName(hubNameAnswer)
      setHubStyle(chosenHubStyle)
      setHubBio(chosenBio)

      const session = await getSession()
      const userId = session?.user?.id

      setGeneratingStatus('The mirror is reflecting your presence...')

      // Only generate avatar — bio is user-written now
      const [, avatarResponse] = await Promise.allSettled([
        // Bio generation skipped — user wrote their own
        Promise.resolve({ bio: chosenBio, askAbout: fallbackAskAbout }),
        fetch('/api/generate-avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: conversationAnswers, userId }),
        }).then(r => r.json()),
      ])

      let avatarUrl = ''
      if (avatarResponse.status === 'fulfilled' && !avatarResponse.value.error) {
        avatarUrl = avatarResponse.value.imageUrl || ''
      }

      setGeneratingStatus('Placing your hub in the universe...')
      await updateHub({
        bio: chosenBio,
        ask_about: fallbackAskAbout,
        hub_style: chosenHubStyle,
        backdrop_id: backdrop?.id || 'void',
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      } as any)

      setHubAskAbout(fallbackAskAbout)
      setHubAvatarUrl(avatarUrl)
      setScreen('universe')

    } catch (err) {
      console.error('Error during onboarding:', err)
      setHubName(hubNameAnswer)
      setHubBio(chosenBio)
      setHubAskAbout(fallbackAskAbout)
      setScreen('universe')
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
            const hub = await getMyHub()
            if (hub) {
              setHubName(hub.hub_name || '')
              setHubBio(hub.bio || '')
              setHubAskAbout(hub.ask_about || '')
              setHubAvatarUrl(hub.avatar_url || '')
              setHubStyle((hub.hub_style as HubStyle) || 'portal')
              setLettersSent(hub.letters_sent || 0)
              setScreen('universe')
            }
          }}
          onGoToSignup={() => setScreen('signup')}
          onGuestEnter={() => setScreen('onboarding')}
        />
      </div>
    )
  }

  if (screen === 'signup') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000005', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AuthBackground />
        <SignupScreen
          onSuccess={() => setScreen('onboarding')}
          onGoToLogin={() => setScreen('login')}
          pendingCredentials={pendingCredentials}
          setPendingCredentials={setPendingCredentials}
        />
      </div>
    )
  }

  return (
    <>
      {screen === 'entry' && (
        <EntryScreen
          onEnter={() => setScreen('onboarding')}
          onLogin={() => setScreen('login')}
          onSignup={() => setScreen('signup')}
        />
      )}

      {screen === 'onboarding' && (
        <SoulMirror onComplete={handleOnboardingComplete} />
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