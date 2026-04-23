'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoginScreen } from '../components/AuthScreens'
import { getSession, getMyHub, createFallbackHubForCurrentUser } from '../lib/auth'
import { supabase } from '../../lib/supabase'

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
            'radial-gradient(ellipse 75% 60% at 50% 45%, rgba(90,20,180,0.60) 0%, rgba(15,45,155,0.35) 50%, transparent 80%), radial-gradient(ellipse 55% 45% at 80% 20%, rgba(0,120,180,0.28) 0%, transparent 65%), radial-gradient(ellipse 45% 40% at 20% 75%, rgba(170,20,90,0.22) 0%, transparent 65%)',
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

export default function LoginPage() {
  const router = useRouter()

  // If already authenticated with a hub, go straight to the universe

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session) return
      try {
        let hub = await getMyHub()
        if (!hub) {
          try {
            await createFallbackHubForCurrentUser()
            hub = await getMyHub()
          } catch {
            // If hub creation fails, send to onboarding or show error
            router.replace('/signup')
            return
          }
        }
        router.replace('/')
      } catch {
        router.replace('/')
      }
    })

    // Handle OAuth redirects (Discord/Google): after the provider redirects back,
    // Supabase exchanges the code asynchronously and fires SIGNED_IN — without this
    // listener the user would be stuck on the login screen until a manual refresh.
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        // Repeat the same logic as above for OAuth
        try {
          let hub = await getMyHub()
          if (!hub) {
            try {
              await createFallbackHubForCurrentUser()
              hub = await getMyHub()
            } catch {
              router.replace('/signup')
              return
            }
          }
          router.replace('/')
        } catch {
          router.replace('/')
        }
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#060a18',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AuthBackground />
      <LoginScreen
        onSuccess={() => router.replace('/')}
        onGoToSignup={() => router.push('/signup')}
      />
    </div>
  )
}
