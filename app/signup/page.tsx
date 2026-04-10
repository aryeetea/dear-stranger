'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SignupScreen } from '../components/AuthScreens'
import { getSession } from '../lib/auth'

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

export default function SignupPage() {
  const router = useRouter()

  // If already authenticated, let the root page route them correctly
  useEffect(() => {
    getSession().then((session) => {
      if (session) router.replace('/')
    })
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
      <SignupScreen
        onSuccess={() => {
          // Signal to the root page that it should show onboarding, not landing
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('ds_goto_onboarding', '1')
          }
          router.replace('/')
        }}
        setPendingCredentials={(creds) => {
          if (typeof sessionStorage === 'undefined') return
          if (creds) {
            sessionStorage.setItem('ds_pending_creds', JSON.stringify(creds))
          } else {
            sessionStorage.removeItem('ds_pending_creds')
          }
        }}
      />
    </div>
  )
}
