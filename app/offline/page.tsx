import Link from 'next/link'

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '32px 20px',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <section
        style={{
          width: 'min(560px, 100%)',
          padding: '32px 28px',
          borderRadius: 28,
          border: '1px solid rgba(230, 199, 110, 0.18)',
          background: 'rgba(7, 6, 18, 0.82)',
          boxShadow: '0 22px 80px rgba(0,0,0,0.42)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            color: 'rgba(230, 199, 110, 0.88)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontSize: 12,
          }}
        >
          Dear Stranger
        </p>
        <h1
          style={{
            margin: '18px 0 14px',
            fontSize: 'clamp(32px, 5vw, 52px)',
            lineHeight: 1.05,
          }}
        >
          You’re offline, but the universe is still here.
        </h1>
        <p
          style={{
            margin: '0 auto 24px',
            maxWidth: 420,
            color: 'rgba(255,255,255,0.72)',
            lineHeight: 1.6,
          }}
        >
          Reconnect to send letters, refresh drifting pages, and open the wider sky again.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 48,
            padding: '0 18px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, rgba(122,90,24,0.95), rgba(201,168,76,1))',
            color: '#120d03',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Try Again
        </Link>
      </section>
    </main>
  )
}
