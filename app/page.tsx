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
  getSession,
  getMyHub,
  getAllHubs,
  sendLetter,
} from './lib/auth'

type Screen = 'entry' | 'onboarding' | 'universe' | 'loading'

export default function Home() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [hubName, setHubName] = useState('')
  const [hubBio, setHubBio] = useState('')
  const [hubAskAbout, setHubAskAbout] = useState('')
  const [lettersSent, setLettersSent] = useState(0)
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
            setLettersSent(hub.letters_sent || 0)
            setScreen('universe')
            return
          }
        }

        setScreen('entry')
      } catch (err) {
        console.error('checkSession failed:', err)
        setScreen('entry')
      }
    }

    checkSession()
  }, [])

  async function handleOnboardingComplete(answers: Record<number, string>) {
  const hubNameAnswer = answers[3] || 'Your Hub'
  const bio = 'A wanderer who arrived here quietly, carrying something unspoken.'
  const askAbout = 'Silence, slow mornings, and letters that take their time.'

  try {
    await signInAndCreateHub(hubNameAnswer, bio, askAbout)
    setHubName(hubNameAnswer)
    setHubBio(bio)
    setHubAskAbout(askAbout)
    setScreen('universe')
  } catch (err) {
    console.error('Error creating hub:', err)

    setHubName(hubNameAnswer)
    setHubBio(bio)
    setHubAskAbout(askAbout)
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
            color: 'rgba(201,168,76,0.4)',
            textTransform: 'uppercase',
          }}
        >
          ✦
        </div>
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
              console.log('Letter saved to Supabase!')
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
          onClose={() => setProfileOpen(false)}
          onUpdateHub={(name) => setHubName(name)}
        />
      )}
    </>
  )
}