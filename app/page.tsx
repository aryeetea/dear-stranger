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

  // ✅ ADD THIS
  const [selectedStyle, setSelectedStyle] = useState<any>(null)

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

            // ✅ LOAD STYLE FROM DB
            setSelectedStyle({
              label: hub.avatar_style_label,
              desc: hub.avatar_style_desc,
            })

            setScreen('universe')
            return
          }
          await signOut()
        }
        setScreen('entry')
      } catch (err) {
        console.error(err)
        await signOut()
        setScreen('entry')
      }
    }

    checkSession()
  }, [])

  // ✅ UPDATED
  async function handleOnboardingComplete(
    answers: Record<number, string>,
    style: any
  ) {
    setSelectedStyle(style)

    const keys = Object.keys(answers).map(Number).sort((a, b) => a - b)
    const hubNameAnswer = answers[keys[keys.length - 1]] || 'Your Hub'

    const conversationAnswers: Record<number, string> = {}
    for (let i = 0; i < keys.length - 1; i++) {
      conversationAnswers[i] = answers[keys[i]]
    }

    const fallbackBio = 'A wanderer who arrived here quietly...'
    const fallbackAskAbout = 'Silence, slow mornings...'

    try {
      setScreen('generating')
      setGeneratingStatus('Crafting your soul mirror...')

      // ✅ PASS STYLE TO DB
      await signInAndCreateHub(
        hubNameAnswer,
        fallbackBio,
        fallbackAskAbout,
        style
      )

      setHubName(hubNameAnswer)

      setGeneratingStatus('The mirror is reflecting your presence...')

      const avatarResponse = await fetch('/api/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: conversationAnswers,
          selectedStyle: style, // ✅ IMPORTANT
        }),
      }).then(r => r.json())

      const avatarUrl = avatarResponse.imageUrl || ''

      await updateHub({
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      })

      setHubAvatarUrl(avatarUrl)
      setScreen('universe')
    } catch (err) {
      console.error(err)
      setScreen('universe')
    }
  }

  if (screen === 'loading') return <div />

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

          // ✅ PASS STYLE HERE
          selectedStyle={selectedStyle}

          onWriteLetter={(name) => {
            setScribeRecipient(name)
            setScribeOpen(true)
          }}
          onObservatory={() => setObservatoryOpen(true)}
          onProfile={() => setProfileOpen(true)}
        />
      )}

      {profileOpen && (
        <Profile
          hubName={hubName}
          bio={hubBio}
          askAbout={hubAskAbout}
          avatarUrl={hubAvatarUrl}

          // ✅ PASS STYLE HERE
          selectedStyle={selectedStyle}

          onClose={() => setProfileOpen(false)}
          onUpdateHub={(name) => setHubName(name)}
        />
      )}
    </>
  )
}