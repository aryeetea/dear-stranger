'use client'

import { useEffect, useState } from 'react'
import EntryScreen from './components/EntryScreen'
import SoulMirror from './components/SoulMirror'
import UniverseMap from './components/UniverseMap'
import Scribe from './components/Scribe'
import Observatory from './components/Observatory'
import Profile from './components/Profile'
import {
  signInAndCreateHub,
  signOut,
  getSession,
  getMyHub,
  getAllHubs,
  sendLetter,
  updateHub,
} from './lib/auth'

type Screen = 'entry' | 'onboarding' | 'universe' | 'loading' | 'generating'

export default function Home() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [hubName, setHubName] = useState('')
  const [hubBio, setHubBio] = useState('')
  const [hubAskAbout, setHubAskAbout] = useState('')
  const [hubAvatarUrl, setHubAvatarUrl] = useState('')
  const [lettersSent, setLettersSent] = useState(0)
  const [generatingStatus, setGeneratingStatus] = useState('')
  const [scribeOpen, setScribeOpen] = useState(false)
  const [scribeRecipient, setScribeRecipient] = useState<string | undefined>()
  const [observatoryOpen, setObservatoryOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

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
            setLettersSent(hub.letters_sent || 0)
            setScreen('universe')
            return
          }
          await signOut()
        }
        setScreen('entry')
      } catch (err) {
        console.error('checkSession failed:', err)
        try {
          await signOut()
        } catch {}
        setScreen('entry')
      }
    }
    checkSession()
  }, [])

  async function handleOnboardingComplete(answers: Record<number, string>) {
    const keys = Object.keys(answers).map(Number).sort((a, b) => a - b)
    const hubNameAnswer = answers[keys[keys.length - 1]] || 'Your Hub'

    const conversationAnswers: Record<number, string> = {}
    for (let i = 0; i < keys.length - 1; i++) {
      conversationAnswers[i] = answers[keys[i]]
    }

    const fallbackBio =
      'A wanderer who arrived here quietly, carrying something unspoken.'
    const fallbackAskAbout =
      'Silence, slow mornings, and letters that take their time.'

    try {
      setScreen('generating')
      setGeneratingStatus('Crafting your soul mirror...')

      await signInAndCreateHub(hubNameAnswer, fallbackBio, fallbackAskAbout)
      setHubName(hubNameAnswer)

      const session = await getSession()
      const userId = session?.user?.id

      setGeneratingStatus('The mirror is reflecting your presence...')

      const [bioResponse, avatarResponse] = await Promise.allSettled([
        fetch('/api/generate-bio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: conversationAnswers }),
        }).then((r) => r.json()),

        fetch('/api/generate-avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: conversationAnswers, userId }),
        }).then((r) => r.json()),
      ])

      let bio = fallbackBio
      let askAbout = fallbackAskAbout
      if (bioResponse.status === 'fulfilled' && !bioResponse.value.error) {
        bio = bioResponse.value.bio || fallbackBio
        askAbout = bioResponse.value.askAbout || fallbackAskAbout
      } else {
        console.warn('Bio generation failed, using fallback')
      }

      let avatarUrl = ''
      if (avatarResponse.status === 'fulfilled' && !avatarResponse.value.error) {
        avatarUrl = avatarResponse.value.imageUrl || ''
      } else {
        console.warn(
          'Avatar generation failed:',
          avatarResponse.status === 'rejected'
            ? avatarResponse.reason
            : avatarResponse.value?.error
        )
      }

      setGeneratingStatus('Placing your hub in the universe...')
      await updateHub({
        bio,
        ask_about: askAbout,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      })

      setHubBio(bio)
      setHubAskAbout(askAbout)
      setHubAvatarUrl(avatarUrl)
      setScreen('universe')
    } catch (err) {
      console.error('Error during onboarding:', err)
      setHubName(hubNameAnswer)
      setHubBio(fallbackBio)
      setHubAskAbout(fallbackAskAbout)
      setScreen('universe')
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
            color: '#e6c76e',
            textTransform: 'uppercase',
            textShadow: '0 0 10px rgba(230, 199, 110, 0.35)',
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
            background: `
              radial-gradient(ellipse 60% 40% at 20% 30%, rgba(40,20,80,0.25) 0%, transparent 70%),
              radial-gradient(ellipse 50% 60% at 80% 70%, rgba(10,30,80,0.2) 0%, transparent 70%)
            `,
          }}
        />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '1px solid rgba(230, 199, 110, 0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s ease-in-out infinite',
              boxShadow: '0 0 20px rgba(230, 199, 110, 0.08)',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '1px solid rgba(230, 199, 110, 0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 14px rgba(230, 199, 110, 0.12)',
              }}
            >
              <span
                style={{
                  fontSize: '18px',
                  color: '#e6c76e',
                  textShadow: '0 0 10px rgba(230, 199, 110, 0.4)',
                }}
              >
                ✦
              </span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '11px',
              letterSpacing: '0.4em',
              color: '#e6c76e',
              textTransform: 'uppercase',
              marginBottom: '10px',
              textShadow: '0 0 10px rgba(230, 199, 110, 0.35)',
            }}
          >
            Soul Mirror
          </p>

          <p
            style={{
              fontFamily: "'IM Fell English', serif",
              fontStyle: 'italic',
              fontSize: '15px',
              color: 'rgba(255,255,255,0.88)',
              letterSpacing: '0.04em',
              textShadow: '0 0 8px rgba(255,255,255,0.08)',
            }}
          >
            {generatingStatus}
          </p>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 0.7;
            }
            50% {
              transform: scale(1.08);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <>
      {screen === 'entry' && (
        <EntryScreen onEnter={() => setScreen('onboarding')} />
      )}

      {screen === 'onboarding' && (
        <SoulMirror onComplete={handleOnboardingComplete} />
      )}

      {screen === 'universe' && (
        <UniverseMap
          hubName={hubName}
          hubAvatarUrl={hubAvatarUrl}
          onWriteLetter={(name) => {
            setScribeRecipient(name)
            setScribeOpen(true)
          }}
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
              const recipient = allHubs.find(
                (hub: any) => hub.hub_name === letter.to
              )
              const isUniverseLetter = !letter.to

              if (!isUniverseLetter && !recipient) {
                throw new Error('Recipient hub not found')
              }

              await sendLetter(
                recipient?.id || null,
                letter.body,
                letter.paperId,
                isUniverseLetter
              )

              setLettersSent((prev) => prev + 1)
              setScribeOpen(false)
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
          onClose={() => setProfileOpen(false)}
          onUpdateHub={(name) => setHubName(name)}
        />
      )}
    </>
  )
}