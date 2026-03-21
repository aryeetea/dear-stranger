'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function EntryScreen({ onEnter }: { onEnter?: () => void }) {
  const [phase, setPhase] = useState(0)
  // phase 0: black
  // phase 1: gold line
  // phase 2: title
  // phase 3: subtitle
  // phase 4: button

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
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000005',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
    }}>

      {/* Starfield */}
      <StarField />

      {/* Gold Line */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={phase >= 1 ? { width: 'min(480px, 80vw)', opacity: 1 } : {}}
        transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)',
          boxShadow: '0 0 12px rgba(201,168,76,0.4)',
          marginBottom: '48px',
        }}
      />

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 'clamp(28px, 6vw, 56px)',
          fontWeight: 300,
          letterSpacing: '0.25em',
          background: 'linear-gradient(135deg, #c9a84c 0%, #e8d08a 50%, #c9a84c 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textTransform: 'uppercase',
        }}
      >
        Dear Stranger
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? { opacity: 1 } : {}}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{
          fontFamily: "'IM Fell English', serif",
          fontStyle: 'italic',
          fontSize: 'clamp(13px, 2vw, 16px)',
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.12em',
          marginTop: '14px',
        }}
      >
        a universe of slow letters
      </motion.p>

      {/* Enter Button */}
      <AnimatePresence>
        {phase >= 4 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            onClick={onEnter}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.background = 'rgba(201,168,76,0.1)'
              el.style.borderColor = '#c9a84c'
              el.style.boxShadow = '0 0 28px rgba(201,168,76,0.3), inset 0 0 20px rgba(201,168,76,0.1)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.background = 'transparent'
              el.style.borderColor = 'rgba(201,168,76,0.4)'
              el.style.boxShadow = 'none'
            }}
            style={{
              marginTop: '64px',
              padding: '14px 40px',
              background: 'transparent',
              border: '1px solid rgba(201,168,76,0.4)',
              color: '#c9a84c',
              fontFamily: "'Cinzel', serif",
              fontSize: '12px',
              fontWeight: 400,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.3s ease',
            }}
          >
            Enter the Universe
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

// Simple canvas starfield
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
