'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    const stars = Array.from({ length: 280 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      alpha: Math.random() * 0.55 + 0.1,
      speed: Math.random() * 0.008 + 0.002,
      phase: Math.random() * Math.PI * 2,
    }))
    let frame: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const t = Date.now() * 0.001
      stars.forEach((s) => {
        const a = s.alpha * (0.5 + 0.5 * Math.sin(t * s.speed * 10 + s.phase))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,' + a + ')'
        ctx.fill()
      })
      frame = requestAnimationFrame(draw)
    }
    draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
}

function GoldRule({ opacity = 0.28 }: { opacity?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(140,100,30,' + opacity + '))' }} />
      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', color: 'rgba(120,85,20,' + (opacity + 0.12) + ')', letterSpacing: '0.2em' }}>✦</span>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(140,100,30,' + opacity + '), transparent)' }} />
    </div>
  )
}

export default function LandingPage({ onEnter, onLogin }: { onEnter?: () => void; onLogin?: () => void }) {
  // phase 0 = nothing, 1 = letter arrives, 2 = salutation, 3 = body, 4 = buttons
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 2600),
      setTimeout(() => setPhase(4), 3800),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const paragraphs: { text: string; italic?: boolean }[] = [
    { text: "Welcome. I'm glad you found this." },
    { text: 'Dear Stranger is a place for slow letters — the kind you actually meant to write. No feed, no trending topics, no follower counts. Just words, and the space between sending and receiving.' },
    { text: 'Here is how it works:', italic: true },
    { text: 'When you first arrive, the Soul Mirror will build your avatar. You can choose to answer a set of guided questions — nothing too serious, just enough to know what you are envisioning, or you can describe yourself in your own words. Either way, what you give it shapes your avatar and your hub that represents you in this universe. No real name. No photo. Just your words, and what the mirror makes of them.' },
    { text: 'One thing you should know before you begin: you only get two chances. The first is now. The second is one reimagine, available only once. After that, your avatar is sealed for ninety days. So take your time with the description — it matters more than it might seem.', italic: true },
    { text: 'Once your hub exists, you can write. You can send a letter to the open universe and let it drift until a stranger finds it, or you can visit the Starmap, find a hub whose name or light speaks to you, and address your letter directly. Longer letters take a little longer to arrive — that is intentional. This place is not built for speed.' },
    { text: 'There are no likes here. No read receipts. No quick reactions. If a letter moves you, you write one back. That is the only way to respond, and honestly, it is the better way.' },
    { text: 'A few things this place asks of you:', italic: true },
    { text: 'Be honest. Be kind. Do not use this space to harm anyone — no harassment, no cruelty, no letters designed to hurt anyone. You can be anonymous here, but anonymity is not a license to be unkind. It is a gift. Use it well.' },
    { text: 'Your hub name, your words, and your light are yours. We will never sell them or show them to an algorithm. What you write here stays within the universe you are about to enter.' },
    { text: 'I cannot promise every letter will be answered. I can only promise this is a real place, built for real words, between real people.', italic: true },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#07060f',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(40px, 7vw, 80px) clamp(16px, 5vw, 40px) clamp(56px, 9vw, 100px)',
      }}
    >
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(140,100,30,0.2); border-radius: 4px; }
      `}</style>

      <StarField />

      <div
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 65% 55% at 50% 40%, rgba(35,18,75,0.36) 0%, transparent 65%)',
        }}
      />

      <motion.article
        initial={{ opacity: 0, y: 80, scale: 0.9, filter: 'blur(6px)' }}
        animate={phase >= 1 ? { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' } : {}}
        transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '640px',
          width: '100%',
          background: 'linear-gradient(168deg, #f6edd8 0%, #efe0c2 55%, #e8d5ac 100%)',
          borderRadius: '1px',
          padding: 'clamp(36px, 6vw, 68px) clamp(28px, 5.5vw, 64px) clamp(36px, 5.5vw, 56px)',
          boxShadow: '0 60px 150px rgba(0,0,0,0.92), 0 20px 60px rgba(0,0,0,0.72), 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,248,220,0.55)',
        }}
      >
        <div style={{ marginBottom: '32px' }}>
          <GoldRule opacity={0.26} />
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '11px', color: 'rgba(100,72,22,0.55)', letterSpacing: '0.14em', textAlign: 'center', marginTop: '18px', marginBottom: 0 }}>
            Somewhere in the universe &nbsp;&middot;&nbsp; March 2026
          </p>
        </div>

        <motion.p
          initial={{ opacity: 0, x: -12 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(26px, 4.5vw, 38px)', color: '#1a1208', marginBottom: '28px', lineHeight: 1.2 }}
        >
          Dear Stranger,
        </motion.p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '32px' }}>
          {paragraphs.map(({ text, italic }, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1.1, delay: i * 0.1, ease: 'easeOut' }}
              style={{
                fontFamily: "'IM Fell English', serif",
                fontStyle: italic ? 'italic' : 'normal',
                fontSize: 'clamp(14px, 1.75vw, 17px)',
                color: italic ? '#1a1208' : 'rgba(38,24,6,0.8)',
                lineHeight: italic ? 1.6 : 1.95,
                margin: 0,
              }}
            >
              {text}
            </motion.p>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : {}}
          transition={{ duration: 1.2, delay: paragraphs.length * 0.1 + 0.2, ease: 'easeOut' }}
          style={{ marginBottom: '40px' }}
        >
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(15px, 1.8vw, 18px)', color: '#1a1208', marginBottom: '24px' }}>
            If you are still here, you belong here. Come in.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '1px', background: 'rgba(120,88,24,0.28)' }} />
            <span style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(100,70,18,0.62)' }}>
              Dear Stranger ✦
            </span>
          </div>
        </motion.div>

        <div style={{ marginBottom: '28px' }}>
          <GoldRule opacity={0.2} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <button
            onClick={onEnter}
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(9px, 1.1vw, 11px)',
              letterSpacing: '0.34em',
              textTransform: 'uppercase',
              color: '#f5edd8',
              background: 'linear-gradient(135deg, #7a5a18 0%, #c9a84c 48%, #7a5a18 100%)',
              border: 'none',
              padding: '15px 32px',
              cursor: 'pointer',
              width: '100%',
              borderRadius: '2px',
              boxShadow: '0 2px 18px rgba(120,88,24,0.45)',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Enter the Universe ✦
          </button>

          <button
            onClick={onLogin}
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(9px, 1.1vw, 10px)',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(75,52,12,0.6)',
              background: 'transparent',
              border: '1px solid rgba(140,100,30,0.26)',
              padding: '13px 32px',
              cursor: 'pointer',
              width: '100%',
              borderRadius: '2px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(75,52,12,0.9)'
              e.currentTarget.style.borderColor = 'rgba(140,100,30,0.52)'
              e.currentTarget.style.background = 'rgba(140,100,30,0.06)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(75,52,12,0.6)'
              e.currentTarget.style.borderColor = 'rgba(140,100,30,0.26)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            Already have a hub? Sign in
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={phase >= 4 ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
          style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.32em', color: 'rgba(100,72,18,0.28)', textTransform: 'uppercase', textAlign: 'center', marginTop: '32px', marginBottom: 0 }}
        >
          Dear Stranger &nbsp;&middot;&nbsp; 2026
        </motion.p>
      </motion.article>
    </div>
  )
}