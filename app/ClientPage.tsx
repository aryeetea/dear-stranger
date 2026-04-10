'use client'

import dynamic from 'next/dynamic'

const HomeClient = dynamic(() => import('./HomeClient'), {
  ssr: false,
  loading: () => (
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
      <div
        style={{
          position: 'absolute',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '1px solid rgba(201,168,76,0.15)',
          borderTopColor: 'rgba(201,168,76,0.55)',
          animation: 'ds-loading-orbit 1.6s linear infinite',
        }}
      />
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '13px',
          letterSpacing: '0.4em',
          color: 'rgba(201,168,76,0.75)',
          animation: 'ds-loading-pulse 2.2s ease-in-out infinite',
        }}
      >
        ✦
      </div>
    </div>
  ),
})

export default function ClientPage() {
  return <HomeClient />
}
