'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

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

export default function ClientPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user && !ignore) {
        // User is authenticated, go to main app ("/")
        router.replace('/');
      } else {
        setChecked(true);
      }
    }
    checkSession();
    return () => { ignore = true; };
  }, [router]);

  // Only render HomeClient if not authenticated or after check
  if (!checked) {
    return <LoadingFallback />;
  }
  return <HomeClient />;
}
