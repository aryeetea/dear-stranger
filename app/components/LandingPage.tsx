'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

// ── Scroll-reveal wrapper ────────────────────────────────────────────────────
function FadeIn({
  children,
  delay = 0,
  y = 28,
}: {
  children: React.ReactNode
  delay?: number
  y?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.12 })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1.3, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ── Gold divider ─────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        margin: '0 auto 64px',
        maxWidth: '240px',
      }}
    >
      <div
        style={{
          flex: 1,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3))',
        }}
      />
      <span
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '10px',
          color: 'rgba(201,168,76,0.5)',
          letterSpacing: '0.3em',
        }}
      >
        ✦
      </span>
      <div
        style={{
          flex: 1,
          height: '1px',
          background: 'linear-gradient(90deg, rgba(201,168,76,0.3), transparent)',
        }}
      />
    </div>
  )
}

// ── Hero star-field canvas ───────────────────────────────────────────────────
function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    const stars = Array.from({ length: 280 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.3,
      alpha: Math.random() * 0.65 + 0.1,
      speed: Math.random() * 0.007 + 0.002,
      phase: Math.random() * Math.PI * 2,
    }))
    let frame: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const t = Date.now() * 0.001
      stars.forEach((s) => {
        const a = s.alpha * (0.55 + 0.45 * Math.sin(t * s.speed * 10 + s.phase))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.fill()
      })
      frame = requestAnimationFrame(draw)
    }
    draw()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])
  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
}

// ── Animated universe map preview ────────────────────────────────────────────
function UniversePreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = 480
    const H = 280
    canvas.width = W
    canvas.height = H
    const hubs = [
      { x: W * 0.5, y: H * 0.5, r: 9, pulse: 0, color: '201,168,76', label: 'You' },
      { x: W * 0.18, y: H * 0.25, r: 6, pulse: 1.1, color: '120,80,200', label: '' },
      { x: W * 0.78, y: H * 0.22, r: 7, pulse: 0.6, color: '60,140,200', label: '' },
      { x: W * 0.25, y: H * 0.72, r: 6, pulse: 2.0, color: '80,180,120', label: '' },
      { x: W * 0.72, y: H * 0.68, r: 5, pulse: 1.5, color: '200,80,80', label: '' },
      { x: W * 0.88, y: H * 0.5, r: 6, pulse: 0.9, color: '180,140,60', label: '' },
      { x: W * 0.12, y: H * 0.5, r: 5, pulse: 2.4, color: '80,160,160', label: '' },
      { x: W * 0.5, y: H * 0.12, r: 6, pulse: 1.8, color: '160,80,180', label: '' },
    ]
    // shooting star state
    let star = { x: -40, y: H * 0.3, vx: 2.2, vy: 0.5, alpha: 0, tail: [] as { x: number; y: number }[] }
    let starLife = 0
    let starMax = 120
    let starPause = 180
    let frame: number
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const t = Date.now() * 0.001
      // bg stars
      for (let i = 0; i < 120; i++) {
        const bx = ((i * 41.7) % W)
        const by = ((i * 23.1) % H)
        const ba = 0.12 + 0.06 * Math.sin(t * 0.4 + i * 0.5)
        ctx.beginPath(); ctx.arc(bx, by, 0.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${ba})`; ctx.fill()
      }
      // faint lines from center hub to others
      ctx.setLineDash([2, 5])
      ctx.lineWidth = 0.5
      hubs.slice(1).forEach((h) => {
        const dist = Math.sqrt((h.x - hubs[0].x) ** 2 + (h.y - hubs[0].y) ** 2)
        const a = Math.max(0, 0.1 - dist / 2000)
        ctx.strokeStyle = `rgba(201,168,76,${a})`
        ctx.beginPath(); ctx.moveTo(hubs[0].x, hubs[0].y); ctx.lineTo(h.x, h.y); ctx.stroke()
      })
      ctx.setLineDash([])
      // hubs
      hubs.forEach((h) => {
        const pulse = 0.82 + 0.18 * Math.sin(t * 0.9 + h.pulse)
        const aura = ctx.createRadialGradient(h.x, h.y, h.r * 0.6, h.x, h.y, h.r * 2.8 * pulse)
        aura.addColorStop(0, `rgba(${h.color},0.22)`)
        aura.addColorStop(1, `rgba(${h.color},0)`)
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r * 2.8 * pulse, 0, Math.PI * 2)
        ctx.fillStyle = aura; ctx.fill()
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r * 0.75, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${h.color},0.8)`; ctx.fill()
        if (h.label) {
          ctx.fillStyle = 'rgba(201,168,76,0.7)'
          ctx.font = `9px 'Cinzel', serif`
          ctx.textAlign = 'center'
          ctx.fillText(h.label, h.x, h.y + h.r * 2.2)
        }
      })
      // shooting star
      if (starPause > 0) {
        starPause--
        if (starPause === 0) {
          star = { x: -20, y: H * (0.2 + Math.random() * 0.6), vx: 2.0 + Math.random(), vy: (Math.random() - 0.5) * 0.8, alpha: 0, tail: [] }
          starLife = 0; starMax = 100
        }
      } else {
        starLife++
        star.alpha = starLife < 10 ? starLife / 10 : Math.max(0, 1 - (starLife - starMax * 0.7) / (starMax * 0.3))
        star.tail.push({ x: star.x, y: star.y })
        if (star.tail.length > 18) star.tail.shift()
        // draw tail
        star.tail.forEach((pt, i) => {
          const ta = ((i / star.tail.length) * star.alpha * 0.7)
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 1, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(230,199,110,${ta})`; ctx.fill()
        })
        // head glow
        const g = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, 8)
        g.addColorStop(0, `rgba(255,245,200,${star.alpha})`)
        g.addColorStop(1, `rgba(201,168,76,0)`)
        ctx.beginPath(); ctx.arc(star.x, star.y, 8, 0, Math.PI * 2)
        ctx.fillStyle = g; ctx.fill()
        star.x += star.vx; star.y += star.vy
        if (starLife >= starMax || star.x > W + 40) {
          starPause = 200 + Math.floor(Math.random() * 120)
        }
      }
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [])
  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        maxWidth: '480px',
        height: 'auto',
        borderRadius: '8px',
        border: '1px solid rgba(201,168,76,0.12)',
      }}
    />
  )
}

// ── Letter paper mockup ───────────────────────────────────────────────────────
function LetterMockup() {
  return (
    <div
      style={{
        background: '#f7f2e6',
        borderRadius: '3px',
        padding: '28px 30px 24px',
        maxWidth: '300px',
        width: '100%',
        boxShadow: '0 8px 60px rgba(0,0,0,0.7), 0 2px 12px rgba(0,0,0,0.4)',
        transform: 'rotate(-1.8deg)',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #c9a84c, #e6c76e, #c9a84c)',
          opacity: 0.5,
          borderRadius: '3px 3px 0 0',
        }}
      />
      <p
        style={{
          fontFamily: "'IM Fell English', serif",
          fontStyle: 'italic',
          fontSize: '12px',
          color: '#7a6a4a',
          marginBottom: '14px',
          letterSpacing: '0.05em',
        }}
      >
        Dear Stranger,
      </p>
      <p
        style={{
          fontFamily: "'IM Fell English', serif",
          fontSize: '13px',
          color: '#3a2e20',
          lineHeight: 1.85,
          marginBottom: '12px',
        }}
      >
        I have been carrying this thought since the fog came in last Tuesday. The kind of fog that makes everything feel suspended — as if the city agreed, just for one morning, to hold its breath.
      </p>
      <p
        style={{
          fontFamily: "'IM Fell English', serif",
          fontSize: '13px',
          color: '#3a2e20',
          lineHeight: 1.85,
          marginBottom: '18px',
        }}
      >
        I don&rsquo;t know who will read this. Maybe that&rsquo;s the point.
      </p>
      <p
        style={{
          fontFamily: "'IM Fell English', serif",
          fontStyle: 'italic',
          fontSize: '11px',
          color: '#7a6a4a',
          textAlign: 'right',
          borderTop: '1px solid rgba(120,100,70,0.2)',
          paddingTop: '10px',
          marginTop: '6px',
        }}
      >
        — from a wanderer ✦
      </p>
    </div>
  )
}

// ── Soul Mirror mock conversation ─────────────────────────────────────────────
function SoulMirrorMockup() {
  const lines = [
    { role: 'mirror', text: 'What do you carry that you have never spoken aloud?' },
    { role: 'user', text: 'A version of myself I left behind somewhere around age seventeen.' },
    { role: 'mirror', text: 'And if that version received a letter tomorrow — what would it need to hear?' },
    { role: 'user', text: 'That it was right to be soft. That the world gets softer too, eventually.' },
  ]
  return (
    <div
      style={{
        background: 'rgba(4,5,18,0.9)',
        border: '1px solid rgba(201,168,76,0.18)',
        borderRadius: '10px',
        padding: '24px 26px',
        maxWidth: '340px',
        width: '100%',
        boxShadow: '0 0 60px rgba(0,0,0,0.8)',
      }}
    >
      <p
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '7px',
          letterSpacing: '0.45em',
          color: 'rgba(201,168,76,0.5)',
          textTransform: 'uppercase',
          marginBottom: '18px',
          textAlign: 'center',
        }}
      >
        ✦ Soul Mirror
      </p>
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            marginBottom: '12px',
            textAlign: line.role === 'user' ? 'right' : 'left',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              fontFamily: "'IM Fell English', serif",
              fontStyle: line.role === 'mirror' ? 'italic' : 'normal',
              fontSize: '12px',
              lineHeight: 1.7,
              color:
                line.role === 'mirror'
                  ? 'rgba(201,168,76,0.8)'
                  : 'rgba(255,255,255,0.75)',
              background:
                line.role === 'mirror'
                  ? 'rgba(201,168,76,0.06)'
                  : 'rgba(255,255,255,0.06)',
              borderRadius: '6px',
              padding: '8px 12px',
              maxWidth: '90%',
            }}
          >
            {line.text}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LandingPage({
  onEnter,
  onLogin,
}: {
  onEnter?: () => void
  onLogin?: () => void
}) {
  const [heroPhase, setHeroPhase] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setHeroPhase(1), 300),
      setTimeout(() => setHeroPhase(2), 1500),
      setTimeout(() => setHeroPhase(3), 2500),
      setTimeout(() => setHeroPhase(4), 3400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div
      style={{
        background: '#000005',
        minHeight: '100vh',
        overflowX: 'hidden',
        color: 'rgba(255,255,255,0.85)',
      }}
    >
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.15); border-radius: 4px; }
        .landing-btn:hover { opacity: 0.85; }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          height: '100vh',
          minHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <HeroCanvas />
        {/* Nebula overlays */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse 55% 45% at 18% 28%, rgba(45,15,90,0.28) 0%, transparent 70%), radial-gradient(ellipse 50% 55% at 82% 74%, rgba(10,18,80,0.22) 0%, transparent 70%)',
          }}
        />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px' }}>
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={heroPhase >= 1 ? { width: 'min(420px, 72vw)', opacity: 1 } : {}}
            transition={{ duration: 1.9, ease: [0.4, 0, 0.2, 1] }}
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #e6c76e, transparent)',
              boxShadow: '0 0 18px rgba(230,199,110,0.4)',
              margin: '0 auto 56px',
            }}
          />
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={heroPhase >= 2 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.3, ease: 'easeOut' }}
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(32px, 7vw, 76px)',
              fontWeight: 300,
              letterSpacing: '0.28em',
              background: 'linear-gradient(135deg, #c9a84c 0%, #f3df9a 45%, #e6c76e 75%, #c9a84c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textTransform: 'uppercase',
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            Dear Stranger
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={heroPhase >= 3 ? { opacity: 1 } : {}}
            transition={{ duration: 1.3 }}
            style={{
              fontFamily: "'IM Fell English', serif",
              fontStyle: 'italic',
              fontSize: 'clamp(14px, 2.2vw, 19px)',
              color: 'rgba(255,255,255,0.72)',
              letterSpacing: '0.14em',
              marginTop: '18px',
            }}
          >
            a universe of slow letters
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={heroPhase >= 4 ? { opacity: 1 } : {}}
            transition={{ duration: 1 }}
            style={{
              marginTop: '80px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '7px',
                letterSpacing: '0.5em',
                color: 'rgba(201,168,76,0.35)',
                textTransform: 'uppercase',
              }}
            >
              scroll
            </p>
            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: '1px',
                height: '36px',
                background:
                  'linear-gradient(to bottom, rgba(201,168,76,0.4), transparent)',
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* ── SECTION: THE INVITATION ──────────────────────────────────────── */}
      <section
        style={{
          maxWidth: '700px',
          margin: '0 auto',
          padding: 'clamp(80px, 12vw, 140px) clamp(24px, 6vw, 48px)',
          textAlign: 'center',
        }}
      >
        <FadeIn>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '9px',
              letterSpacing: '0.5em',
              color: 'rgba(201,168,76,0.5)',
              textTransform: 'uppercase',
              marginBottom: '52px',
            }}
          >
            ✦ &nbsp; An Invitation &nbsp; ✦
          </p>
        </FadeIn>
        <FadeIn delay={0.1} y={18}>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(22px, 3.5vw, 38px)',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.9)',
              lineHeight: 1.55,
              marginBottom: '44px',
              letterSpacing: '0.01em',
            }}
          >
            You have been here before —<br />
            in the middle of a long night,<br />
            with something you needed to say<br />
            and no one to say it to.
          </p>
        </FadeIn>
        <FadeIn delay={0.2} y={16}>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(17px, 2.2vw, 22px)',
              color: 'rgba(255,255,255,0.58)',
              lineHeight: 1.9,
              marginBottom: '36px',
            }}
          >
            Dear Stranger is a universe of letters. There is no feed, no algorithm, no follower count. Only words — carried across the void by light — from one soul to another who you may never meet.
          </p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <p
            style={{
              fontFamily: "'IM Fell English', serif",
              fontStyle: 'italic',
              fontSize: 'clamp(16px, 2vw, 21px)',
              color: 'rgba(201,168,76,0.7)',
              lineHeight: 1.75,
            }}
          >
            &ldquo;It is not a social network. It is a correspondence.&rdquo;
          </p>
        </FadeIn>
      </section>

      {/* ── SECTION: HOW LETTERS TRAVEL ─────────────────────────────────── */}
      <section
        style={{
          padding: 'clamp(70px, 10vw, 120px) clamp(24px, 6vw, 60px)',
          background:
            'linear-gradient(180deg, transparent 0%, rgba(15,10,35,0.6) 30%, rgba(15,10,35,0.6) 70%, transparent 100%)',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <FadeIn>
            <Divider />
            <p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 'clamp(13px, 2vw, 18px)',
                letterSpacing: '0.3em',
                color: 'rgba(230,199,110,0.8)',
                textTransform: 'uppercase',
                textAlign: 'center',
                marginBottom: '64px',
                fontWeight: 300,
              }}
            >
              How Letters Travel
            </p>
          </FadeIn>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '40px 32px',
            }}
          >
            {[
              {
                symbol: '✍',
                title: 'Write',
                body: 'Choose your paper. Choose your ink. Write freely — or address it to someone you noticed in the universe. When you are ready, release it.',
              },
              {
                symbol: '✦',
                title: 'Travel',
                body: 'Universe letters become shooting stars — crossing the void immediately. Direct letters take time. Longer letters take longer. The words earn their distance.',
              },
              {
                symbol: '◉',
                title: 'Arrive',
                body: 'Letters wait at your Observatory. Read them when you are ready. Reply when you are moved to. Or let the thread rest — there is no urgency here.',
              },
            ].map((step, i) => (
              <FadeIn key={step.title} delay={i * 0.15} y={20}>
                <div
                  style={{
                    borderTop: '1px solid rgba(201,168,76,0.2)',
                    paddingTop: '28px',
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '22px',
                      color: 'rgba(201,168,76,0.55)',
                      marginBottom: '16px',
                    }}
                  >
                    {step.symbol}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '11px',
                      letterSpacing: '0.3em',
                      color: 'rgba(230,199,110,0.75)',
                      textTransform: 'uppercase',
                      marginBottom: '14px',
                    }}
                  >
                    {step.title}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 'clamp(15px, 1.8vw, 18px)',
                      color: 'rgba(255,255,255,0.55)',
                      lineHeight: 1.85,
                    }}
                  >
                    {step.body}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION: SOUL MIRROR ────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: 'clamp(80px, 12vw, 140px) clamp(24px, 6vw, 48px)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '60px 48px',
            alignItems: 'center',
          }}
        >
          <div>
            <FadeIn>
              <p
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '9px',
                  letterSpacing: '0.5em',
                  color: 'rgba(201,168,76,0.5)',
                  textTransform: 'uppercase',
                  marginBottom: '24px',
                }}
              >
                ✦ The Soul Mirror
              </p>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 'clamp(26px, 4vw, 42px)',
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.9)',
                  lineHeight: 1.35,
                  marginBottom: '28px',
                  letterSpacing: '0.01em',
                }}
              >
                Before you enter,<br />a guide reflects you.
              </h2>
            </FadeIn>
            <FadeIn delay={0.15} y={16}>
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 'clamp(16px, 1.9vw, 20px)',
                  color: 'rgba(255,255,255,0.55)',
                  lineHeight: 1.9,
                  marginBottom: '20px',
                }}
              >
                The Soul Mirror asks you questions. You answer honestly. From your words it builds your presence in the universe — your hub, your avatar, your mark among the stars.
              </p>
            </FadeIn>
            <FadeIn delay={0.25} y={12}>
              <p
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontStyle: 'italic',
                  fontSize: 'clamp(14px, 1.7vw, 17px)',
                  color: 'rgba(201,168,76,0.65)',
                  lineHeight: 1.8,
                }}
              >
                No username. No profile photo upload. The mirror draws you from the inside.
              </p>
            </FadeIn>
          </div>
          <FadeIn delay={0.1} y={24}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <SoulMirrorMockup />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── SECTION: THE UNIVERSE MAP ────────────────────────────────────── */}
      <section
        style={{
          padding: 'clamp(70px, 10vw, 120px) clamp(24px, 6vw, 48px)',
          background:
            'linear-gradient(180deg, transparent 0%, rgba(4,5,22,0.7) 20%, rgba(4,5,22,0.7) 80%, transparent 100%)',
        }}
      >
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '60px 48px',
            alignItems: 'center',
          }}
        >
          <FadeIn delay={0.05} y={24}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <UniversePreview />
            </div>
          </FadeIn>
          <div>
            <FadeIn>
              <p
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '9px',
                  letterSpacing: '0.5em',
                  color: 'rgba(201,168,76,0.5)',
                  textTransform: 'uppercase',
                  marginBottom: '24px',
                }}
              >
                ✦ The Universe Map
              </p>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 'clamp(26px, 4vw, 42px)',
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.9)',
                  lineHeight: 1.35,
                  marginBottom: '28px',
                }}
              >
                Every soul has a hub.<br />The universe breathes.
              </h2>
            </FadeIn>
            <FadeIn delay={0.15} y={16}>
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 'clamp(16px, 1.9vw, 20px)',
                  color: 'rgba(255,255,255,0.55)',
                  lineHeight: 1.9,
                  marginBottom: '20px',
                }}
              >
                The map is a living canvas. Each point of light is a person — a hub with a name, a style, a quiet presence. Shooting stars carry universe letters between them. Click one to read.
              </p>
            </FadeIn>
            <FadeIn delay={0.25} y={12}>
              <p
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontStyle: 'italic',
                  fontSize: 'clamp(14px, 1.7vw, 17px)',
                  color: 'rgba(201,168,76,0.65)',
                  lineHeight: 1.8,
                }}
              >
                You can write directly to any hub you encounter — or release your words freely into the void.
              </p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── SECTION: LETTER PREVIEW ──────────────────────────────────────── */}
      <section
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: 'clamp(70px, 10vw, 120px) clamp(24px, 6vw, 48px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '60px 48px',
          alignItems: 'center',
        }}
      >
        <div>
          <FadeIn>
            <p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '9px',
                letterSpacing: '0.5em',
                color: 'rgba(201,168,76,0.5)',
                textTransform: 'uppercase',
                marginBottom: '24px',
              }}
            >
              ✦ The Letters
            </p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 'clamp(26px, 4vw, 42px)',
                fontWeight: 400,
                color: 'rgba(255,255,255,0.9)',
                lineHeight: 1.35,
                marginBottom: '28px',
              }}
            >
              Real paper.<br />Real words.<br />Real weight.
            </h2>
          </FadeIn>
          <FadeIn delay={0.15} y={16}>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 'clamp(16px, 1.9vw, 20px)',
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.9,
              }}
            >
              Choose from thirteen paper types — starfield parchment, kraft, vellum, ruled pages. Choose your ink, your font, your stamp. Every letter is a small act of craft. They are not deleted. They are kept.
            </p>
          </FadeIn>
        </div>
        <FadeIn delay={0.1} y={24}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <LetterMockup />
          </div>
        </FadeIn>
      </section>

      {/* ── SECTION: RULES ───────────────────────────────────────────────── */}
      <section
        style={{
          padding: 'clamp(80px, 12vw, 140px) clamp(24px, 6vw, 48px)',
          background:
            'linear-gradient(180deg, transparent 0%, rgba(8,6,28,0.65) 20%, rgba(8,6,28,0.65) 80%, transparent 100%)',
        }}
      >
        <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
          <FadeIn>
            <Divider />
            <p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 'clamp(13px, 2vw, 18px)',
                letterSpacing: '0.3em',
                color: 'rgba(230,199,110,0.8)',
                textTransform: 'uppercase',
                marginBottom: '60px',
                fontWeight: 300,
              }}
            >
              The Rules
            </p>
          </FadeIn>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '32px',
              textAlign: 'left',
              maxWidth: '520px',
              margin: '0 auto',
            }}
          >
            {[
              {
                rule: 'No likes. No seen receipts.',
                detail: 'You write without the anxiety of metrics. No one knows if you read it immediately or after three weeks of rain.',
              },
              {
                rule: 'No feed. No algorithm.',
                detail: 'Nothing is surfaced for you. You find people by wandering the universe map — by curiosity, by accident, by light.',
              },
              {
                rule: 'Letters only.',
                detail: 'No comments, no reactions, no quick replies. If something moved you, write back. That\'s the only currency here.',
              },
              {
                rule: 'Slow, intentional connection.',
                detail: 'Direct letters take time based on how much you wrote. The universe asks you to be patient with the people you reach toward.',
              },
              {
                rule: 'Your words are permanent.',
                detail: 'A sent letter cannot be recalled. Write as if eventually it will be found in a drawer and read again.',
              },
            ].map((item, i) => (
              <FadeIn key={item.rule} delay={i * 0.1} y={16}>
                <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '10px',
                      color: 'rgba(201,168,76,0.55)',
                      marginTop: '4px',
                      flexShrink: 0,
                    }}
                  >
                    ✦
                  </span>
                  <div>
                    <p
                      style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: 'clamp(11px, 1.4vw, 13px)',
                        letterSpacing: '0.18em',
                        color: 'rgba(230,199,110,0.8)',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                        fontWeight: 300,
                      }}
                    >
                      {item.rule}
                    </p>
                    <p
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 'clamp(15px, 1.8vw, 18px)',
                        color: 'rgba(255,255,255,0.5)',
                        lineHeight: 1.85,
                      }}
                    >
                      {item.detail}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION: CTA ────────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(80px, 12vw, 120px) clamp(24px, 6vw, 48px)',
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        {/* Faint nebula behind CTA */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(30,15,70,0.35) 0%, transparent 70%)',
          }}
        />
        {/* Stars passed through from hero (small static field) */}
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(i * 127.3) % 100}%`,
              top: `${(i * 83.7) % 100}%`,
              width: `${0.8 + (i % 3) * 0.4}px`,
              height: `${0.8 + (i % 3) * 0.4}px`,
              borderRadius: '50%',
              background: 'white',
              opacity: 0.1 + (i % 5) * 0.06,
              pointerEvents: 'none',
            }}
          />
        ))}

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px' }}>
          <FadeIn>
            <div
              style={{
                width: 'min(300px, 60vw)',
                height: '1px',
                background:
                  'linear-gradient(90deg, transparent, rgba(230,199,110,0.5), transparent)',
                margin: '0 auto 56px',
              }}
            />
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 'clamp(30px, 5vw, 52px)',
                fontWeight: 400,
                color: 'rgba(255,255,255,0.9)',
                lineHeight: 1.35,
                marginBottom: '20px',
                letterSpacing: '0.01em',
              }}
            >
              The universe waits.
            </p>
            <p
              style={{
                fontFamily: "'IM Fell English', serif",
                fontStyle: 'italic',
                fontSize: 'clamp(15px, 1.8vw, 19px)',
                color: 'rgba(255,255,255,0.45)',
                marginBottom: '64px',
                lineHeight: 1.7,
              }}
            >
              There is a shooting star out there carrying words meant for no one in particular — perhaps for you.
            </p>
          </FadeIn>

          <FadeIn delay={0.2} y={16}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <button
                className="landing-btn"
                onClick={onEnter}
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 'clamp(10px, 1.2vw, 12px)',
                  letterSpacing: '0.35em',
                  color: '#c9a84c',
                  padding: '16px 48px',
                  border: '1px solid rgba(201,168,76,0.5)',
                  background: 'rgba(201,168,76,0.07)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  borderRadius: '4px',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.3s ease',
                  width: 'min(320px, 100%)',
                  boxShadow: '0 0 40px rgba(201,168,76,0.08)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(201,168,76,0.14)'
                  e.currentTarget.style.boxShadow = '0 0 60px rgba(201,168,76,0.2)'
                  e.currentTarget.style.borderColor = '#e6c76e'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(201,168,76,0.07)'
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(201,168,76,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'
                }}
              >
                Enter the Universe ✦
              </button>

              <button
                className="landing-btn"
                onClick={onEnter}
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 'clamp(9px, 1.1vw, 11px)',
                  letterSpacing: '0.3em',
                  color: 'rgba(255,255,255,0.55)',
                  padding: '13px 40px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  borderRadius: '4px',
                  transition: 'all 0.3s ease',
                  width: 'min(320px, 100%)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                }}
              >
                Create an Account
              </button>

              <button
                className="landing-btn"
                onClick={onLogin}
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 'clamp(9px, 1.1vw, 11px)',
                  letterSpacing: '0.3em',
                  color: 'rgba(255,255,255,0.35)',
                  padding: '10px 32px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'color 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.35)'
                }}
              >
                Already have a hub? Sign In
              </button>
            </div>
          </FadeIn>

          <FadeIn delay={0.4} y={8}>
            <div
              style={{
                marginTop: '80px',
                width: 'min(200px, 50vw)',
                height: '1px',
                background:
                  'linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)',
                margin: '80px auto 0',
              }}
            />
            <p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '8px',
                letterSpacing: '0.35em',
                color: 'rgba(255,255,255,0.15)',
                textTransform: 'uppercase',
                marginTop: '24px',
              }}
            >
              Dear Stranger · {new Date().getFullYear()}
            </p>
          </FadeIn>
        </div>
      </section>
    </div>
  )
}
