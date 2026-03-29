'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getUniverseLetters } from '../lib/auth'

const DRIFT_STARS = Array.from({ length: 24 }, (_, i) => ({
  width: `${(i % 3) * 0.4 + 0.3}px`,
  left: `${((i * 53 + 19) % 100)}%`,
  top: `${((i * 71 + 7) % 100)}%`,
  opacity: (i % 5) * 0.04 + 0.04,
}))

interface DriftLetter {
  id: string
  senderId: string
  senderName: string
  body: string
  preview: string
  subject: string
}

export default function DriftStream({ onClose }: { onClose?: () => void }) {
  const [letters, setLetters] = useState<DriftLetter[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<DriftLetter | null>(null)

  useEffect(() => {
    getUniverseLetters().then((data) => {
      setLetters(data as DriftLetter[])
      setLoading(false)
    })
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,5,0.97)',
        backdropFilter: 'blur(20px)',
        zIndex: 70,
        overflowY: 'auto',
        padding: 'clamp(60px,8vh,90px) clamp(16px,5vw,48px) 80px',
      }}
    >
      {/* background hints */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 55% 45% at 50% 30%, rgba(15,25,80,0.28) 0%, transparent 65%)' }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        {DRIFT_STARS.map((s, i) => (
          <div key={i} style={{
            position: 'absolute', width: s.width, height: s.width, borderRadius: '50%',
            background: `rgba(255,255,255,${s.opacity})`, left: s.left, top: s.top,
          }} />
        ))}
      </div>

      <button
        onClick={onClose}
        className="fixed-close-btn-top"
        style={{
          position: 'fixed', top: '24px', right: '24px', background: 'none',
          border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.78)',
          fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em',
          padding: '8px 16px', cursor: 'pointer', textTransform: 'uppercase', zIndex: 80,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.96)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.32)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.78)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.background = 'none' }}
      >
        ← Return
      </button>

      <div style={{ position: 'relative', zIndex: 2, maxWidth: '680px', margin: '0 auto' }}>
        {/* header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.52em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '12px' }}>
            The Driftstream
          </p>
          <p style={{
            fontFamily: "'IM Fell English', serif", fontStyle: 'italic',
            fontSize: 'clamp(14px,2vw,17px)', color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.75, maxWidth: '480px', margin: '0 auto',
          }}>
            Letters released into the open universe — unclaimed, still drifting.
            <br />Read them as you find them. They ask nothing of you.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '22px' }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(230,199,110,0.2))' }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', color: 'rgba(230,199,110,0.45)', letterSpacing: '0.3em' }}>✦</span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(230,199,110,0.2), transparent)' }} />
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', paddingTop: '80px' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.38em', color: 'rgba(230,199,110,0.42)', textTransform: 'uppercase' }}>
              Listening to the void…
            </p>
          </div>
        )}

        {!loading && letters.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: '80px' }}>
            <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '18px', color: 'rgba(255,255,255,0.35)' }}>
              The universe is quiet right now.
            </p>
            <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.2)', marginTop: '12px' }}>
              Check back after more letters have been released into the open.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {letters.map((letter, i) => (
            <motion.div
              key={letter.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              onClick={() => setOpen(letter)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: '3px',
                padding: '22px 26px',
                cursor: 'pointer',
                transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.background = 'rgba(230,199,110,0.05)'
                el.style.borderColor = 'rgba(230,199,110,0.2)'
                el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.35)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.background = 'rgba(255,255,255,0.03)'
                el.style.borderColor = 'rgba(255,255,255,0.09)'
                el.style.boxShadow = 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '10px' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.2em', color: '#e6c76e', textTransform: 'uppercase', margin: 0 }}>
                  {letter.subject}
                </p>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', whiteSpace: 'nowrap', margin: 0 }}>
                  from {letter.senderName}
                </p>
              </div>
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '15px', color: 'rgba(255,255,255,0.68)', lineHeight: 1.8, margin: 0 }}>
                {letter.preview}
              </p>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.22em', color: 'rgba(230,199,110,0.45)', textTransform: 'uppercase', marginTop: '14px', marginBottom: 0 }}>
                Read in full →
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* expanded letter */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,5,0.88)',
              zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '40px 20px',
            }}
            onClick={() => setOpen(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'linear-gradient(160deg, #fdf6e0 0%, #efe0c2 55%, #e8d5ac 100%)',
                borderRadius: '2px',
                maxWidth: '560px',
                width: '100%',
                maxHeight: '82vh',
                overflowY: 'auto',
                padding: 'clamp(32px,5vw,56px)',
                boxShadow: '0 40px 120px rgba(0,0,0,0.92), 0 8px 32px rgba(0,0,0,0.6)',
                position: 'relative',
              }}
            >
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(100,72,22,0.52)', textAlign: 'center', textTransform: 'uppercase', marginBottom: '6px' }}>
                Released to the universe
              </p>
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(20px,3.2vw,28px)', color: '#1a1208', marginBottom: '6px', lineHeight: 1.2 }}>
                {open.subject}
              </p>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(100,72,22,0.55)', textTransform: 'uppercase', marginBottom: '28px' }}>
                from {open.senderName}
              </p>
              <div style={{ height: '1px', background: 'rgba(120,88,24,0.18)', marginBottom: '24px' }} />
              <p style={{
                fontFamily: "'IM Fell English', serif",
                fontSize: 'clamp(14px,1.8vw,17px)',
                color: 'rgba(38,24,6,0.85)',
                lineHeight: 2.0,
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}>
                {open.body}
              </p>
              <button
                onClick={() => setOpen(null)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', color: 'rgba(100,72,22,0.45)', cursor: 'pointer' }}
              >
                ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
