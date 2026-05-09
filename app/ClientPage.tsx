'use client'
import dynamic from 'next/dynamic'
import { useSyncExternalStore, useEffect, useState } from 'react'
import { supabaseInitError } from '../lib/supabase'

function LoadingFallback() {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 3500)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#060a18', display: 'flex', flexDirection: 'column', gap: '18px', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.15)', borderTopColor: 'rgba(201,168,76,0.55)', animation: 'ds-loading-orbit 1.6s linear infinite' }} />
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '13px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.75)', animation: 'ds-loading-pulse 2.2s ease-in-out infinite' }}>✦</div>
      </div>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.28em', color: 'rgba(201,168,76,0.62)', textTransform: 'uppercase', margin: 0 }}>
        {slow ? 'Still opening the door...' : 'Opening Dear Stranger...'}
      </p>
    </div>
  )
}

const HomeClient = dynamic(() => import('./HomeClient'), {
  ssr: false,
  loading: () => <LoadingFallback />,
})

function subscribe() {
  return () => {}
}

export default function ClientPage() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)

  if (!mounted) {
    return <LoadingFallback />
  }

  if (supabaseInitError) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#060a18', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <div style={{ width: 'min(560px, 100%)', border: '1px solid rgba(220,120,120,0.24)', borderRadius: '18px', background: 'rgba(10,8,28,0.94)', boxShadow: '0 24px 80px rgba(0,0,0,0.45)', padding: '28px 24px' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.32em', color: 'rgba(220,120,120,0.82)', textTransform: 'uppercase', margin: '0 0 10px' }}>
            Configuration Needed
          </p>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '30px', color: 'rgba(255,255,255,0.94)', margin: '0 0 10px' }}>
            Dear Stranger cannot open yet.
          </p>
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '15px', color: 'rgba(255,255,255,0.64)', lineHeight: 1.7, margin: '0 0 16px' }}>
            The deployment is missing required Supabase environment variables.
          </p>
          <p style={{ fontFamily: "'Courier Prime', monospace", fontSize: '13px', color: 'rgba(255,255,255,0.88)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px', margin: '0 0 16px', overflowWrap: 'anywhere' }}>
            {supabaseInitError.message}
          </p>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, margin: 0 }}>
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your Vercel project settings, then redeploy.
          </p>
        </div>
      </div>
    )
  }

  return <HomeClient />;
}
