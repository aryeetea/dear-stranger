'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState('Connecting...')

  useEffect(() => {
    let cancelled = false
    let redirected = false

    const finish = () => {
      if (cancelled || redirected) return
      redirected = true
      // A full navigation makes the root client pick up the freshly persisted
      // OAuth session immediately, avoiding the "manual refresh" limbo.
      window.location.replace('/')
    }

    const finishIfSessionExists = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          finish()
          return true
        }
      } catch {
        return false
      }
      return false
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) finish()
    })

    async function handleCallback() {
      try {
        setMessage('Opening the gate...')
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        const errorDescription = url.searchParams.get('error_description') || url.searchParams.get('error')

        if (errorDescription) throw new Error(errorDescription)

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else if (url.hash) {
          const hashParams = new URLSearchParams(url.hash.slice(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            if (error) throw error
          }
        }

        if (await finishIfSessionExists()) return

        setMessage('Still connecting...')
        window.setTimeout(async () => {
          if (cancelled) return
          if (await finishIfSessionExists()) return

          setMessage('Connection took too long. Sending you back...')
          router.replace('/')
        }, 1200)
      } catch (error) {
        console.error('OAuth callback failed:', error)
        if (await finishIfSessionExists()) return
        setMessage('Could not finish sign-in. Sending you back...')
        window.setTimeout(() => {
          if (!cancelled) router.replace('/login')
        }, 1400)
      }
    }

    void handleCallback()

    return () => {
      cancelled = true
      subscription.unsubscribe()
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
        color: 'rgba(255,255,255,0.45)',
        fontFamily: "'Cinzel', serif",
        fontSize: '13px',
        letterSpacing: '0.25em',
      }}
    >
      {message}
    </div>
  )
}
