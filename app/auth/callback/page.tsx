'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // With PKCE (Supabase JS v2 default), the client auto-exchanges the ?code=
    // in the URL when detectSessionInUrl is true. We listen for SIGNED_IN and
    // also check the session immediately in case the exchange already completed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        router.replace('/')
      }
    })

    // Race-guard: if the exchange finished before the listener registered, session
    // will already be present.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/')
    })

    return () => subscription.unsubscribe()
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
        color: 'rgba(255,255,255,0.45)',
        fontFamily: "'Cinzel', serif",
        fontSize: '13px',
        letterSpacing: '0.25em',
      }}
    >
      Connecting…
    </div>
  )
}
