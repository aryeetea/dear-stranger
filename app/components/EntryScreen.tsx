'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function EntryScreen({
  onEnter,
  onLogin,
  onSignup,
}: {
  onEnter?: () => void
  onLogin?: () => void
  onSignup?: () => void
}) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setPhase(4), 3800),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000005',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <StarField />

      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={phase >= 1 ? { width: 'min(480px, 80vw)', opacity: 1 } : {}}
        transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #e6c76e, transparent)',
          boxShadow: '0 0 14px rgba(230,199,110,0.45)',
          marginBottom: '48px',
        }}
      />

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 'clamp(28px, 6vw, 56px)',
          fontWeight: 300,
          letterSpacing: '0.25em',
          background: 'linear-gradient(135deg, #e6c76e 0%, #f3df9a 50%, #e6c76e 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textTransform: 'uppercase',
          textShadow: '0 0 14px rgba(230,199,110,0.18)',
        }}
      >
        Dear Stranger
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? { opacity: 1 } : {}}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{
          fontFamily: "'IM Fell English', serif",
          fontStyle: 'italic',
          fontSize: 'clamp(13px, 2vw, 16px)',
          color: 'rgba(255,255,255,0.78)',
          letterSpacing: '0.12em',
          marginTop: '14px',
          textShadow: '0 0 6px rgba(0,0,0,0.45)',
        }}
      >
        a universe of slow letters
      </motion.p>

      <AnimatePresence>
        {phase >= 4 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginTop: '64px' }}
          >
            {/* Enter the Universe — guest/new user */}
            <button
              onClick={onEnter}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(230,199,110,0.12)'
                e.currentTarget.style.borderColor = '#e6c76e'
                e.currentTarget.style.boxShadow = '0 0 28px rgba(230,199,110,0.3), inset 0 0 20px rgba(230,199,110,0.08)'
                e.currentTarget.style.color = '#f3df9a'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'rgba(230,199,110,0.5)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.color = '#e6c76e'
              }}
              style={{
                padding: '14px 40px',
                background: 'transparent',
                border: '1px solid rgba(230,199,110,0.5)',
                color: '#e6c76e',
                fontFamily: "'Cinzel', serif",
                fontSize: '12px',
                fontWeight: 400,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.3s ease',
                textShadow: '0 0 8px rgba(230,199,110,0.18)',
              }}
            >
              Enter the Universe
            </button>

            {/* Create an Account */}
            <button
              onClick={onSignup}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(230,199,110,0.07)'
                e.currentTarget.style.borderColor = 'rgba(230,199,110,0.4)'
                e.currentTarget.style.color = 'rgba(230,199,110,0.85)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'rgba(230,199,110,0.2)'
                e.currentTarget.style.color = 'rgba(230,199,110,0.5)'
              }}
              style={{
                padding: '10px 32px',
                background: 'transparent',
                border: '1px solid rgba(230,199,110,0.2)',
                color: 'rgba(230,199,110,0.5)',
                fontFamily: "'Cinzel', serif",
                fontSize: '10px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              Create an Account
            </button>

            {/* Sign In */}
            <button
              onClick={onLogin}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.28)' }}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.28)',
                fontFamily: "'Cinzel', serif",
                fontSize: '9px',
                letterSpacing: '0.35em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'color 0.3s ease',
                padding: '4px 8px',
              }}
            >
              Sign In
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StarField() {
  useEffect(() => {
    const canvas = document.getElementById('entry-stars') as HTMLCanvasElement
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2,
      alpha: Math.random() * 0.7 + 0.1,
      speed: Math.random() * 0.008 + 0.002,
      phase: Math.random() * Math.PI * 2,
    }))

    let frame: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const t = Date.now() * 0.001
      stars.forEach(s => {
        const a = s.alpha * (0.6 + 0.4 * Math.sin(t * s.speed * 60 + s.phase))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.fill()
      })
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <canvas
      id="entry-stars"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  )
}