                                      'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function StarField({ count = 220, maxR = 1.0, maxAlpha = 0.4, parallaxFactor = 0 }: {
  count?: number; maxR?: number; maxAlpha?: number; parallaxFactor?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    const stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * maxR + 0.2,
      alpha: Math.random() * maxAlpha + 0.08,
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
    const onMouseMove = (e: MouseEvent) => {
      const cx = e.clientX - window.innerWidth / 2
      const cy = e.clientY - window.innerHeight / 2
      canvas.style.transform = `translate(${cx * parallaxFactor}px, ${cy * parallaxFactor}px)`
    }
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouseMove)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [count, maxR, maxAlpha, parallaxFactor])
  return <canvas ref={canvasRef} style={{
    position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none',
    transition: 'transform 0.12s ease-out', willChange: 'transform',
  }} />
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

export default function LandingPage({ onEnter, onLogin, onGuest }: { onEnter?: () => void; onLogin?: () => void; onGuest?: () => void }) {
  // phase 0 = title splash, 1 = title fades + letter arrives, 2 = salutation, 3 = body, 4 = buttons
  const [phase, setPhase] = useState(0)
  const [titleOut, setTitleOut] = useState(false)
  useEffect(() => {
    const timers = [
      setTimeout(() => setTitleOut(true), 2500),
      setTimeout(() => setPhase(1), 3200),
      setTimeout(() => setPhase(2), 4600),
      setTimeout(() => setPhase(3), 5400),
      setTimeout(() => setPhase(4), 6600),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const voidLines = [
    'somewhere out there, someone is writing to you right now.',
    'i keep forgetting to say the things that matter most.',
    'some distances cannot be measured in miles.',
    'the letter i never sent still lives in my chest.',
    'you are not as forgotten as you think.',
    'we are all strangers until we aren’t.',
    'there is a version of you in every life i almost lived.',
    'i hope you know someone is rooting for you, somewhere.',
    'time heals nothing. writing helps.',
    'the universe keeps letters, even the ones you burned.',
  ]
  const [voidIdx, setVoidIdx] = useState(0)
  const [voidVisible, setVoidVisible] = useState(true)
  useEffect(() => {
    const t = setInterval(() => {
      setVoidVisible(false)
      setTimeout(() => { setVoidIdx(i => (i + 1) % voidLines.length); setVoidVisible(true) }, 500)
    }, 7000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const paragraphs: { text: string; italic?: boolean }[] = [
    { text: 'Dear Stranger is a place for slow letters — the kind you actually meant to write. No feed, no follower counts, no algorithms. Just words, and the space between sending and receiving.' },
    { text: 'When you arrive, the Soul Mirror will build your avatar from your own description. No real name. No photo. Just your words, and what the mirror makes of them. Take your time — your avatar is sealed for ninety days after it is set.' },
    { text: 'Once your hub exists, you can write to the open universe and let your letter drift until a stranger finds it, or address one directly to someone whose light speaks to you. There are no likes here, no read receipts. If a letter moves you, you write one back.', italic: true },
    { text: 'Be honest. Be kind. Anonymity is a gift — use it well.' },
    { text: 'We cannot promise every letter will be answered. We can only promise this is a real place, built for real words, between real people.', italic: true },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000',
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

      <StarField count={220} maxR={1.0} maxAlpha={0.38} parallaxFactor={0.006} />
      <StarField count={50} maxR={2.4} maxAlpha={0.68} parallaxFactor={0.018} />

      {/* ── Dear Stranger title splash ── */}
      <AnimatePresence>
        {!titleOut && (
          <motion.div
            key="title-splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.9, ease: 'easeIn' } }}
            transition={{ duration: 0.6 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 20,
              background: '#000000',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            {/* "Dear" — letters fall in */}
            <div style={{ overflow: 'hidden', display: 'flex', gap: '0.02em' }}>
              {'Dear'.split('').map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 'clamp(52px, 10vw, 96px)',
                    fontWeight: 300,
                    color: 'rgba(245,230,190,0.92)',
                    letterSpacing: '0.06em',
                    lineHeight: 1,
                    display: 'inline-block',
                    textShadow: '0 0 60px rgba(201,168,76,0.45), 0 0 120px rgba(201,168,76,0.22)',
                  }}
                >
                  {ch}
                </motion.span>
              ))}
            </div>

            {/* "Stranger" — slightly delayed */}
            <div style={{ overflow: 'hidden', display: 'flex', gap: '0.02em', marginTop: '0.05em' }}>
              {'Stranger'.split('').map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.9 + i * 0.11, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 'clamp(52px, 10vw, 96px)',
                    fontWeight: 300,
                    color: 'rgba(245,230,190,0.92)',
                    letterSpacing: '0.06em',
                    lineHeight: 1,
                    display: 'inline-block',
                    textShadow: '0 0 60px rgba(201,168,76,0.45), 0 0 120px rgba(201,168,76,0.22)',
                  }}
                >
                  {ch}
                </motion.span>
              ))}
            </div>

            {/* Gold rule */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 1.3, delay: 2.4, ease: [0.16, 1, 0.3, 1] }}
              style={{
                originX: '50%' as unknown as number,
                width: 'clamp(120px, 22vw, 260px)', height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.55), transparent)',
                marginTop: '20px',
              }}
            />

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.0, delay: 3.0, ease: 'easeOut' }}
              style={{
                fontFamily: "'IM Fell English', serif",
                fontStyle: 'italic',
                fontSize: 'clamp(13px, 1.8vw, 17px)',
                color: 'rgba(220,200,155,0.5)',
                letterSpacing: '0.1em',
                marginTop: '18px',
              }}
            >
              slow letters between strangers
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>



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
          <p style={{ fontFamily: "'Dancing Script', cursive", fontSize: '13px', color: 'rgba(100,72,22,0.55)', letterSpacing: '0.1em', textAlign: 'center', marginTop: '18px', marginBottom: 0 }}>
            Somewhere in the universe &nbsp;&middot;&nbsp; March 2026
          </p>
        </div>

        <motion.p
          initial={{ opacity: 0, x: -12 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ fontFamily: "'Dancing Script', cursive", fontSize: 'clamp(32px, 5.5vw, 48px)', color: '#1a1208', marginBottom: '28px', lineHeight: 1.2 }}
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
                fontSize: 'clamp(15px, 1.8vw, 18px)',
                color: italic ? '#1a1208' : 'rgba(38,24,6,0.82)',
                lineHeight: 1.9,
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
          <p style={{ fontFamily: "'Dancing Script', cursive", fontSize: 'clamp(18px, 2.2vw, 22px)', color: '#1a1208', marginBottom: '24px' }}>
            If you are still here, you belong here. Come in.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '1px', background: 'rgba(120,88,24,0.28)' }} />
            <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: '16px', color: 'rgba(100,70,18,0.62)' }}>
              The Dear Stranger Team ✦
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : {}}
          transition={{ duration: 1.2, delay: paragraphs.length * 0.1 + 0.5, ease: 'easeOut' }}
          style={{ margin: '28px 0 24px', textAlign: 'center' }}
        >
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.4em', color: 'rgba(100,72,22,0.42)', textTransform: 'uppercase', marginBottom: '12px' }}>
            FROM THE UNIVERSE
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={voidIdx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: voidVisible ? 1 : 0, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.5 }}
              style={{ fontFamily: "'Dancing Script', cursive", fontSize: 'clamp(15px,1.8vw,18px)', color: 'rgba(70,48,12,0.7)', lineHeight: 1.7, margin: 0 }}
            >
              &ldquo;{voidLines[voidIdx]}&rdquo;
            </motion.p>
          </AnimatePresence>
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

          <button
            onClick={onGuest}
            style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: 'clamp(14px, 1.6vw, 16px)',
              color: 'rgba(75,52,12,0.42)',
              background: 'transparent',
              border: 'none',
              padding: '8px 0',
              cursor: 'pointer',
              width: '100%',
              transition: 'color 0.2s',
              letterSpacing: '0.04em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(75,52,12,0.72)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(75,52,12,0.42)' }}
          >
            just browsing — enter as guest
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