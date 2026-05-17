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

function FeatherQuillMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      style={{
        width: '15px',
        height: '15px',
        display: 'block',
        transform: 'translateY(1px) rotate(10deg)',
      }}
    >
      <path
        d="M24 4C17 6 10 14 9 22c3-1 6-1 8-3 5-4 7-10 7-15Z"
        fill="rgba(140,100,30,0.16)"
        stroke="rgba(120,85,20,0.52)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M23.5 6.5c-3.3 2.9-7.2 8.3-10.6 15"
        fill="none"
        stroke="rgba(120,85,20,0.5)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M12.6 21.4 9.8 27.8l3.8-2.8"
        fill="none"
        stroke="rgba(120,85,20,0.58)"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function LandingPage({ onEnter, onLogin, onGuest }: { onEnter?: () => void; onLogin?: () => void; onGuest?: () => void }) {
  // phase 0 = title splash, 1 = intro arrives, 2 = greeting, 3 = story, 4 = buttons
  const [phase, setPhase] = useState(0)
  const [titleOut, setTitleOut] = useState(false)
  const [guideTopic, setGuideTopic] = useState('mirror')
  const [showUniverseChoices, setShowUniverseChoices] = useState(false)
  useEffect(() => {
    const timers = [
      setTimeout(() => setTitleOut(true), 3000),
      setTimeout(() => setPhase(1), 3300),
      setTimeout(() => setPhase(2), 4200),
      setTimeout(() => setPhase(3), 5000),
      setTimeout(() => setPhase(4), 6000),
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

  const observatoryBeats = [
    { label: 'In Transit', text: 'letters still traveling show their progress and arrival date', glow: 'rgba(120,190,255,0.82)' },
    { label: 'Arrived', text: 'new letters brighten until you open and read them', glow: 'rgba(230,199,110,0.9)' },
    { label: 'Pinned', text: 'save the letters you want to keep close in your sky', glow: 'rgba(200,160,255,0.9)' },
    { label: 'Reply', text: 'open a letter, answer it, play voice notes, or honor burn-after-reading', glow: 'rgba(255,140,120,0.86)' },
  ]

  const journeyChapters = [
    { label: 'Mirror', text: 'your words become an anonymous hub' },
    { label: 'Map', text: 'click hubs to meet real people' },
    { label: 'Scribe', text: 'write to the universe or the selected hub' },
    { label: 'Observe', text: 'letters become stars you can follow' },
    { label: 'Reply', text: 'answer from an opened letter' },
  ]

  const sendingPaths = [
    { label: 'Open Universe', text: 'open Scribe from the nav and release without a recipient; the letter becomes a universe letter.' },
    { label: 'Direct Hub', text: 'click a hub on the Starmap, then press Send a Letter; Scribe opens already addressed to them.' },
  ]

  const guideTopics = [
    { id: 'mirror', icon: '◌', label: 'Soul Mirror', title: 'Make your hub', text: 'Answer the mirror, choose your avatar style, write a bio and ask-about, pick your hub form, then name your place in the universe.', accent: 'rgba(201,168,76,0.84)' },
    { id: 'map', icon: '✦', label: 'Starmap', title: 'Explore real hubs', text: 'The universe is a draggable map of hubs. Click one to read their bio, see what they are open to, and start a direct letter from that hub card.', accent: 'rgba(90,145,210,0.78)' },
    { id: 'scribe', icon: '✒', label: 'Scribe', title: 'Write and style', text: 'Scribe is the composer. It handles subject, paper, fonts, ink, stamps, envelopes, handwriting, voice notes, anonymity, and burn-after-reading.', accent: 'rgba(112,76,20,0.78)' },
    { id: 'direct', icon: '⇢', label: 'Direct Hub', title: 'Direct starts on the map', text: 'To send directly, click a hub on the Starmap and choose Send a Letter. Scribe opens addressed to that person; direct letters travel before arriving.', accent: 'rgba(90,145,210,0.78)' },
    { id: 'observatory', icon: '⟡', label: 'Observatory', title: 'Read your sky', text: 'The Observatory shows sent, received, in-transit, arrived, and pinned letters. Tap an arrived star to break the seal and read it.', accent: 'rgba(200,160,255,0.84)' },
    { id: 'reply', icon: '↩', label: 'Replies', title: 'Reply from a letter', text: 'Replies begin inside the Observatory. Open a received letter, press Reply, and Scribe appears with the original letter beside your answer.', accent: 'rgba(255,140,120,0.82)' },
    { id: 'drift', icon: '☄', label: 'DriftStream', title: 'Open currents', text: 'DriftStream is separate from Scribe. Read circling open letters, or write a drift letter, poem, or journal entry for a stranger to find.', accent: 'rgba(201,168,76,0.84)' },
    { id: 'sanctum', icon: '◎', label: 'Sanctum', title: 'Shape your place', text: 'The Sanctum is your profile area: appearance, avatar refreshes, bio, ask-about, visitor book, sharing, sign out, export, and account settings.', accent: 'rgba(80,150,120,0.82)' },
  ]
  const activeGuide = guideTopics.find(topic => topic.id === guideTopic) || guideTopics[0]
  const showMirror = guideTopic === 'mirror'
  const showMap = guideTopic === 'map'
  const showScribe = guideTopic === 'scribe'
  const showDirect = guideTopic === 'direct'
  const showObservatory = guideTopic === 'observatory'
  const showReply = guideTopic === 'reply'
  const showDrift = guideTopic === 'drift'
  const showSanctum = guideTopic === 'sanctum'

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
        @keyframes ds-letter-drift {
          0% { transform: translate3d(-15%, 12px, 0) rotate(-10deg) scale(0.9); opacity: 0; }
          12% { opacity: 1; }
          48% { transform: translate3d(180%, -14px, 0) rotate(4deg) scale(1); opacity: 1; }
          82% { transform: translate3d(365%, 8px, 0) rotate(13deg) scale(0.94); opacity: 1; }
          100% { transform: translate3d(430%, -4px, 0) rotate(18deg) scale(0.88); opacity: 0; }
        }
        @keyframes ds-ink-line {
          0%, 12% { transform: scaleX(0); opacity: 0; }
          30%, 70% { transform: scaleX(1); opacity: 1; }
          100% { transform: scaleX(1); opacity: 0.24; }
        }
        @keyframes ds-orbit-pulse {
          0%, 100% { opacity: 0.26; transform: translate(-50%, -50%) scale(0.95); }
          50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.04); }
        }
        @keyframes ds-chip-float {
          0%, 100% { transform: translateY(0); opacity: 0.64; }
          50% { transform: translateY(-8px); opacity: 0.96; }
        }
        @keyframes ds-comet-sweep {
          0% { transform: translate3d(-20%, 36px, 0) rotate(-14deg); opacity: 0; }
          18% { opacity: 0.78; }
          70% { opacity: 0.78; }
          100% { transform: translate3d(116%, -34px, 0) rotate(-14deg); opacity: 0; }
        }
        @keyframes ds-route-draw {
          0% { stroke-dashoffset: 520; opacity: 0.1; }
          16%, 78% { stroke-dashoffset: 0; opacity: 0.62; }
          100% { stroke-dashoffset: 0; opacity: 0.12; }
        }
        @keyframes ds-arrival-kindled {
          0%, 48% { transform: scale(0.7); opacity: 0; }
          58% { transform: scale(1.2); opacity: 1; }
          72%, 100% { transform: scale(1); opacity: 0.82; }
        }
        @keyframes ds-reply-return {
          0%, 64% { transform: translate3d(0, 0, 0) rotate(14deg) scale(0.76); opacity: 0; }
          72% { opacity: 0.9; }
          100% { transform: translate3d(-260%, -90px, 0) rotate(-12deg) scale(0.9); opacity: 0; }
        }
        @keyframes ds-timeline-glow {
          0%, 100% { opacity: 0.32; }
          50% { opacity: 0.86; }
        }
        @keyframes ds-direct-pulse {
          0%, 100% { opacity: 0.45; transform: scale(0.92); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes ds-spotlight-in {
          from { opacity: 0; transform: translateY(10px) scale(0.97); filter: blur(5px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes ds-tab-orbit {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.68; }
          50% { transform: translateY(-2px) rotate(8deg); opacity: 1; }
        }
        .ds-tour-tabs {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(138px, 1fr));
          gap: 8px;
          margin-bottom: 16px;
        }
        .ds-tour-stage {
          position: relative;
          min-height: clamp(320px, 50vw, 410px);
          border: 1px solid rgba(120,88,24,0.18);
          background: radial-gradient(circle at 18% 24%, rgba(255,248,220,0.68), transparent 25%), radial-gradient(circle at 75% 62%, rgba(24,18,42,0.24), transparent 34%), linear-gradient(145deg, rgba(54,35,8,0.06), rgba(255,255,255,0.16));
          overflow: hidden;
          margin-bottom: 22px;
        }
        .ds-tour-spotlight {
          position: absolute;
          right: clamp(16px, 4vw, 34px);
          top: clamp(74px, 14vw, 110px);
          z-index: 8;
          width: min(300px, 46%);
          min-height: 132px;
          padding: 14px;
          animation: ds-spotlight-in 0.35s ease-out both;
        }
        .ds-tour-spotlight-observatory {
          left: clamp(16px, 4vw, 34px);
          width: auto;
          min-height: 168px;
        }
        @media (max-width: 640px) {
          .ds-tour-tabs {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .ds-tour-tab {
            min-height: 52px !important;
            padding: 9px 10px !important;
          }
          .ds-tour-stage {
            min-height: 520px;
          }
          .ds-tour-spotlight,
          .ds-tour-spotlight-observatory {
            left: 14px !important;
            right: 14px !important;
            top: 88px !important;
            width: auto !important;
            min-height: 0 !important;
            padding: 12px !important;
          }
          .ds-tour-observatory-grid {
            grid-template-columns: 1fr !important;
          }
          .ds-tour-stage-label {
            max-width: calc(100% - 28px);
          }
        }
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
            exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeIn' } }}
            transition={{ duration: 0.5 }}
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
                    fontFamily: "'Dancing Script', cursive",
                    fontSize: 'clamp(60px, 11vw, 116px)',
                    fontWeight: 400,
                    color: 'rgba(245,230,190,0.92)',
                    letterSpacing: '0.02em',
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
                    fontFamily: "'Dancing Script', cursive",
                    fontSize: 'clamp(60px, 11vw, 116px)',
                    fontWeight: 400,
                    color: 'rgba(245,230,190,0.92)',
                    letterSpacing: '0.02em',
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
          maxWidth: '720px',
          width: '100%',
          background: 'linear-gradient(168deg, #f6edd8 0%, #efe0c2 55%, #e8d5ac 100%)',
          borderRadius: '1px',
          padding: 'clamp(30px, 5vw, 56px) clamp(22px, 4.8vw, 58px) clamp(32px, 5vw, 52px)',
          boxShadow: '0 60px 150px rgba(0,0,0,0.92), 0 20px 60px rgba(0,0,0,0.72), 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,248,220,0.55)',
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <GoldRule opacity={0.26} />
          <p style={{ fontFamily: "'Dancing Script', cursive", fontSize: '13px', color: 'rgba(100,72,22,0.55)', letterSpacing: '0.1em', textAlign: 'center', marginTop: '18px', marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span>Somewhere in the universe</span>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <FeatherQuillMark />
            </span>
          </p>
        </div>

        <motion.p
          initial={{ opacity: 0, x: -12 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ fontFamily: "'Dancing Script', cursive", fontSize: 'clamp(30px, 5.2vw, 46px)', color: '#1a1208', marginBottom: '8px', lineHeight: 1.2 }}
        >
          Dear Stranger,
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          style={{ marginBottom: '28px' }}
        >
          <p style={{
            fontFamily: "'IM Fell English', serif",
            fontSize: 'clamp(15px, 1.8vw, 18px)',
            color: 'rgba(38,24,6,0.82)',
            lineHeight: 1.75,
            margin: '0 0 22px',
          }}>
            Welcome to Dear Stranger, a quiet world of anonymous hubs, drifting letters, and unexpected connection. This guided tour will show you how each part of the universe works before you step inside.
          </p>

          <div
            role="tablist"
            aria-label="Dear Stranger tour"
            className="ds-tour-tabs"
          >
            {guideTopics.map((topic) => {
              const selected = topic.id === guideTopic
              return (
                <motion.button
                  key={topic.id}
                  className="ds-tour-tab"
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-label={`${topic.label}: ${topic.title}`}
                  onClick={() => setGuideTopic(topic.id)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  animate={{
                    opacity: selected ? 1 : 0.74,
                    scale: selected ? 1.015 : 1,
                  }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  style={{
                    position: 'relative',
                    minHeight: '58px',
                    border: selected ? `1px solid ${topic.accent}` : '1px solid rgba(120,88,24,0.16)',
                    borderRadius: '6px',
                    background: selected ? 'linear-gradient(145deg, rgba(255,252,238,0.86), rgba(239,220,180,0.52))' : 'rgba(255,249,231,0.28)',
                    color: selected ? 'rgba(38,24,6,0.86)' : 'rgba(62,39,8,0.58)',
                    fontFamily: "'Cinzel', serif",
                    fontSize: '8px',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '9px',
                    padding: '11px 12px',
                    overflow: 'hidden',
                    boxShadow: selected ? `0 8px 22px rgba(80,48,8,0.08), 0 0 18px ${topic.accent.replace('0.84', '0.16').replace('0.78', '0.14').replace('0.82', '0.14')}` : 'none',
                    outlineOffset: '2px',
                  }}
                >
                  <span style={{
                    width: '25px',
                    height: '25px',
                    flex: '0 0 25px',
                    borderRadius: '50%',
                    border: `1px solid ${selected ? topic.accent : 'rgba(120,88,24,0.16)'}`,
                    background: selected ? 'rgba(255,252,238,0.74)' : 'rgba(255,252,238,0.34)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    lineHeight: 1,
                    color: selected ? topic.accent : 'rgba(82,56,12,0.58)',
                    animation: selected ? 'ds-tab-orbit 2.8s ease-in-out infinite' : 'none',
                  }}>{topic.icon}</span>
                  <span style={{ display: 'grid', gap: '3px', minWidth: 0, textAlign: 'left' }}>
                    <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topic.label}</span>
                    <span style={{
                      display: 'block',
                      fontFamily: "'IM Fell English', serif",
                      fontSize: '11px',
                      lineHeight: 1.15,
                      letterSpacing: 0,
                      textTransform: 'none',
                      color: selected ? 'rgba(55,34,8,0.62)' : 'rgba(62,39,8,0.38)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>{topic.title}</span>
                  </span>
                  {selected && (
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: '2px',
                      background: topic.accent,
                      transformOrigin: 'left center',
                      transform: 'scaleX(1)',
                    }} />
                  )}
                </motion.button>
              )
            })}
          </div>

          <div
            aria-label="A letter is written, drifts through space, arrives, and becomes a reply."
            className="ds-tour-stage"
          >
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(rgba(120,88,24,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(120,88,24,0.05) 1px, transparent 1px)',
              backgroundSize: '42px 42px',
              opacity: 0.26,
            }} />

            <div style={{
              position: 'absolute',
              left: 'clamp(14px, 4vw, 30px)',
              top: 'clamp(14px, 3vw, 24px)',
              zIndex: 7,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              border: `1px solid ${activeGuide.accent}`,
              borderRadius: '999px',
              background: 'rgba(255,250,238,0.94)',
              boxShadow: `0 8px 24px rgba(64,40,8,0.12), 0 0 20px ${activeGuide.accent.replace('0.84', '0.18').replace('0.78', '0.16').replace('0.82', '0.16')}`,
            }} className="ds-tour-stage-label">
              <span style={{ fontSize: '15px', color: activeGuide.accent, lineHeight: 1 }}>{activeGuide.icon}</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(62,39,8,0.86)' }}>
                {activeGuide.label}
              </span>
            </div>

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}
            >
              <path
                d="M 18 57 C 31 25, 48 72, 62 44 S 82 36, 88 66"
                fill="none"
                stroke={showMap || showScribe || showDrift || showObservatory ? 'rgba(92,61,10,0.22)' : 'rgba(92,61,10,0.08)'}
                strokeWidth="0.28"
                strokeDasharray="4 5"
              />
              <path
                d="M 28 55 C 42 42, 55 35, 72 30"
                fill="none"
                stroke={showMap || showDirect || showReply || showSanctum ? 'rgba(70,112,160,0.3)' : 'rgba(70,112,160,0.08)'}
                strokeWidth="0.32"
                strokeDasharray="2 3"
              />
              <path
                d="M 18 57 C 31 25, 48 72, 62 44 S 82 36, 88 66"
                fill="none"
                stroke={showMap || showScribe || showDrift || showObservatory ? 'rgba(201,168,76,0.78)' : 'rgba(201,168,76,0.18)'}
                strokeWidth={showMap || showScribe || showDrift || showObservatory ? '0.58' : '0.36'}
                strokeLinecap="round"
                strokeDasharray="520"
                strokeDashoffset="520"
                style={{ animation: 'ds-route-draw 9s ease-in-out infinite', filter: showMap || showScribe || showDrift || showObservatory ? 'drop-shadow(0 0 6px rgba(201,168,76,0.42))' : 'none' }}
              />
              <path
                d="M 28 55 C 42 42, 55 35, 72 30"
                fill="none"
                stroke={showMap || showDirect || showReply || showSanctum ? 'rgba(90,145,210,0.78)' : 'rgba(90,145,210,0.16)'}
                strokeWidth={showMap || showDirect || showReply || showSanctum ? '0.5' : '0.3'}
                strokeLinecap="round"
                strokeDasharray="520"
                strokeDashoffset="520"
                style={{ animation: 'ds-route-draw 9s ease-in-out 1.15s infinite', filter: showMap || showDirect || showReply || showSanctum ? 'drop-shadow(0 0 6px rgba(90,145,210,0.38))' : 'none' }}
              />
            </svg>

            <div style={{
              position: 'absolute',
              left: '5%',
              right: '5%',
              top: '56%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(92,61,10,0.18), transparent)',
              transform: 'rotate(-9deg)',
            }} />

            <div
              key={activeGuide.id}
              className={`ds-tour-spotlight ${showObservatory ? 'ds-tour-spotlight-observatory' : ''}`}
              style={{
                border: `1px solid ${activeGuide.accent}`,
                borderRadius: '6px',
                background: 'rgba(255,251,240,0.95)',
                boxShadow: `0 18px 42px rgba(60,38,8,0.16), 0 0 28px ${activeGuide.accent.replace('0.84', '0.18').replace('0.78', '0.16').replace('0.82', '0.16')}`,
              }}
            >
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(62,39,8,0.84)', margin: '0 0 12px' }}>
                {activeGuide.label}
              </p>

              {showMirror && (
                <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.42)', background: 'radial-gradient(circle, rgba(255,252,238,0.96), rgba(201,168,76,0.22) 60%, transparent 72%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", color: 'rgba(92,61,10,0.78)', fontSize: '20px', boxShadow: '0 0 28px rgba(201,168,76,0.28)' }}>◌</div>
                  <div>
                    <p style={{ fontFamily: "'IM Fell English', serif", fontSize: '15px', lineHeight: 1.45, color: 'rgba(38,24,6,0.78)', margin: 0 }}>Your description becomes an anonymous avatar and a hub others can find.</p>
                  </div>
                </div>
              )}

              {showScribe && (
                <div>
                  <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {['subject', 'paper', 'voice', 'seal'].map((tool) => (
                      <span key={tool} style={{ border: '1px solid rgba(120,88,24,0.18)', background: 'rgba(255,252,238,0.5)', padding: '5px 7px', fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(62,39,8,0.68)' }}>{tool}</span>
                    ))}
                  </div>
                  <p style={{ fontFamily: "'IM Fell English', serif", fontSize: '15px', lineHeight: 1.45, color: 'rgba(38,24,6,0.78)', margin: 0 }}>Write and customize here. If a hub was chosen first, Scribe opens addressed to them.</p>
                </div>
              )}

              {showMap && (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {sendingPaths.map((path, i) => (
                    <div key={path.label} style={{ display: 'grid', gridTemplateColumns: '10px 1fr', gap: '8px', alignItems: 'start' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', marginTop: '4px', background: i === 0 ? 'rgba(201,168,76,0.9)' : 'rgba(90,145,210,0.9)', boxShadow: i === 0 ? '0 0 14px rgba(201,168,76,0.5)' : '0 0 14px rgba(90,145,210,0.48)' }} />
                      <span>
                        <span style={{ display: 'block', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: i === 0 ? 'rgba(82,56,12,0.88)' : 'rgba(42,70,110,0.92)', marginBottom: '4px' }}>{path.label}</span>
                        <span style={{ display: 'block', fontFamily: "'IM Fell English', serif", fontSize: '15px', lineHeight: 1.4, color: 'rgba(38,24,6,0.9)' }}>{path.text}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {showDirect && (
                <div style={{ display: 'grid', gridTemplateColumns: '54px 1fr', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '54px', height: '54px', borderRadius: '50%', border: '1px solid rgba(90,145,210,0.42)', background: 'radial-gradient(circle, rgba(180,215,255,0.86), rgba(38,52,74,0.36) 58%, transparent 72%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(42,70,110,0.86)', fontFamily: "'Cinzel', serif", fontSize: '18px', boxShadow: '0 0 26px rgba(90,145,210,0.28)' }}>⇢</div>
                  <p style={{ fontFamily: "'IM Fell English', serif", fontSize: '15px', lineHeight: 1.45, color: 'rgba(38,24,6,0.78)', margin: 0 }}>Map first, Scribe second: choose a hub card, then send a letter directly to that hub.</p>
                </div>
              )}

              {showObservatory && (
                <div className="ds-tour-observatory-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: '9px' }}>
                  {observatoryBeats.map((beat) => (
                    <div key={beat.label} style={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: '8px', alignItems: 'start', minHeight: '78px', padding: '9px', border: '1px solid rgba(120,88,24,0.12)', borderRadius: '5px', background: 'rgba(255,252,238,0.42)' }}>
                      <span style={{ width: '11px', height: '11px', borderRadius: '50%', marginTop: '3px', background: beat.glow, boxShadow: `0 0 16px ${beat.glow}`, flexShrink: 0 }} />
                      <span>
                        <span style={{ display: 'block', fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(62,39,8,0.72)', marginBottom: '4px' }}>{beat.label}</span>
                        <span style={{ display: 'block', fontFamily: "'IM Fell English', serif", fontSize: '13px', lineHeight: 1.3, color: 'rgba(38,24,6,0.72)' }}>{beat.text}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {showReply && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ border: '1px solid rgba(120,88,24,0.18)', background: 'rgba(255,252,238,0.48)', padding: '7px 8px', fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.13em', color: 'rgba(62,39,8,0.68)', textTransform: 'uppercase', textAlign: 'center' }}>original</span>
                    <span style={{ textAlign: 'center', color: 'rgba(255,140,120,0.86)', fontFamily: "'Cinzel', serif" }}>↩</span>
                    <span style={{ border: '1px solid rgba(255,140,120,0.32)', background: 'rgba(255,235,228,0.52)', padding: '7px 8px', fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.13em', color: 'rgba(120,52,40,0.74)', textTransform: 'uppercase', textAlign: 'center' }}>reply</span>
                  </div>
                  <p style={{ fontFamily: "'IM Fell English', serif", fontSize: '15px', lineHeight: 1.45, color: 'rgba(38,24,6,0.78)', margin: 0 }}>Open a received letter in the Observatory, then Reply opens Scribe with that letter beside your draft.</p>
                </div>
              )}

              {showDrift && (
                <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '42px', height: '16px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.88))', position: 'relative' }}>
                    <span style={{ position: 'absolute', right: '-2px', top: '3px', width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(243,216,137,0.95)', boxShadow: '0 0 16px rgba(243,216,137,0.62)' }} />
                  </div>
                  <p style={{ fontFamily: "'IM Fell English', serif", fontSize: '15px', lineHeight: 1.45, color: 'rgba(38,24,6,0.78)', margin: 0 }}>DriftStream has its own read/write room for open-current letters, poems, and journal entries.</p>
                </div>
              )}

              {showSanctum && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                  {['appearance', 'visitors', 'share', 'settings'].map((item) => (
                    <span key={item} style={{ border: '1px solid rgba(80,150,120,0.22)', background: 'rgba(238,252,244,0.45)', padding: '7px 8px', fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.13em', color: 'rgba(35,78,56,0.74)', textTransform: 'uppercase' }}>{item}</span>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              position: 'absolute',
              left: '0',
              top: '39%',
              width: '100%',
              height: '18px',
              animation: 'ds-comet-sweep 7s ease-in-out 1.2s infinite',
              pointerEvents: 'none',
              opacity: showDrift || showScribe || showMap ? 1 : 0.22,
              transition: 'opacity 0.35s ease',
            }}>
              <span style={{
                position: 'absolute',
                left: 0,
                top: '8px',
                width: '34%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(141,31,36,0.36), rgba(243,216,137,0.82))',
              }} />
              <span style={{ position: 'absolute', left: '33%', top: '4px', width: '9px', height: '9px', borderRadius: '50%', background: '#f3d889', boxShadow: '0 0 18px rgba(243,216,137,0.62)' }} />
            </div>

            <div style={{
              position: 'absolute',
              right: 'clamp(14px, 4vw, 28px)',
              top: 'clamp(58px, 13vw, 92px)',
              zIndex: 3,
              display: 'grid',
              gap: '7px',
              maxWidth: '42%',
              opacity: showObservatory ? 1 : 0.38,
              transition: 'opacity 0.35s ease',
            }}>
              {observatoryBeats.slice(0, 3).map((beat, i) => (
                <span
                  key={beat.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: "'Cinzel', serif",
                    fontSize: 'clamp(8px, 1.05vw, 10px)',
                    letterSpacing: '0.12em',
                    color: 'rgba(62,39,8,0.82)',
                    textTransform: 'uppercase',
                    animation: `ds-chip-float 5.2s ease-in-out ${i * 0.5}s infinite`,
                  }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: beat.glow, boxShadow: `0 0 14px ${beat.glow}` }} />
                  {beat.label}
                </span>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={phase >= 3 ? { opacity: showScribe || showMap || showDirect || showReply ? 1 : 0.42, scale: showScribe ? 1.04 : 1 } : {}}
              transition={{ duration: 1.2, delay: 0.25, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: 'clamp(18px, 5vw, 48px)',
                top: 'clamp(24px, 5vw, 42px)',
                width: 'clamp(104px, 24vw, 156px)',
                height: 'clamp(128px, 28vw, 184px)',
                background: 'linear-gradient(160deg, rgba(255,252,238,0.98), rgba(232,211,166,0.94))',
                border: '1px solid rgba(120,88,24,0.22)',
                boxShadow: showScribe ? '0 20px 44px rgba(112,76,20,0.28), 0 0 32px rgba(201,168,76,0.22)' : '0 18px 35px rgba(70,44,8,0.16)',
                padding: 'clamp(16px, 3vw, 24px)',
              }}
            >
              {[0, 1, 2, 3].map((line) => (
                <span
                  key={line}
                  style={{
                    display: 'block',
                    height: line === 0 ? '2px' : '1px',
                    width: line === 3 ? '54%' : line === 2 ? '76%' : '88%',
                    marginTop: line === 0 ? 0 : '17px',
                    background: 'rgba(55,34,8,0.5)',
                    transformOrigin: 'left center',
                    animation: `ds-ink-line 5.4s ease-in-out ${0.25 + line * 0.22}s infinite`,
                  }}
                />
              ))}
              <span style={{ position: 'absolute', right: '18px', bottom: '18px', fontFamily: "'Dancing Script', cursive", fontSize: '22px', color: 'rgba(112,76,20,0.58)' }}>you</span>
            </motion.div>

            <div style={{
              position: 'absolute',
              left: 'clamp(34px, 8vw, 70px)',
              top: 'clamp(178px, 30vw, 228px)',
              zIndex: 3,
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '1px solid rgba(120,88,24,0.26)',
              background: 'radial-gradient(circle, rgba(255,252,238,0.9), rgba(201,168,76,0.18) 58%, transparent 70%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Cinzel', serif",
              fontSize: '15px',
              color: 'rgba(92,61,10,0.68)',
              opacity: showMirror ? 1 : 0.34,
              transform: showMirror ? 'scale(1.12)' : 'scale(1)',
              transition: 'opacity 0.35s ease, transform 0.35s ease, box-shadow 0.35s ease',
              boxShadow: showMirror ? '0 0 38px rgba(201,168,76,0.42)' : '0 0 28px rgba(201,168,76,0.22)',
            }}>
              ◌
            </div>

            <div style={{
              position: 'absolute',
              left: '68%',
              top: '27%',
              zIndex: 4,
              width: 'clamp(42px, 9vw, 58px)',
              height: 'clamp(42px, 9vw, 58px)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(38,52,74,0.76), rgba(38,52,74,0.42) 58%, transparent 72%)',
              border: '1px solid rgba(90,145,210,0.38)',
              boxShadow: '0 0 24px rgba(90,145,210,0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'ds-direct-pulse 4.8s ease-in-out infinite',
              opacity: showMap || showDirect || showReply || showSanctum ? 1 : 0.26,
              transition: 'opacity 0.35s ease, box-shadow 0.35s ease',
            }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'rgba(180,215,255,0.9)', boxShadow: '0 0 18px rgba(120,180,255,0.62)' }} />
            </div>

            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 'clamp(118px, 25vw, 176px)',
              height: 'clamp(118px, 25vw, 176px)',
              borderRadius: '50%',
              border: '1px solid rgba(120,88,24,0.22)',
              animation: 'ds-orbit-pulse 4.8s ease-in-out infinite',
            }} />

            <div style={{
              position: 'absolute',
              left: '22%',
              top: '48%',
              width: 'clamp(70px, 16vw, 110px)',
              height: 'clamp(46px, 10vw, 70px)',
              transformOrigin: 'center',
              animation: 'ds-letter-drift 5.4s ease-in-out infinite',
              filter: 'drop-shadow(0 12px 16px rgba(64,39,7,0.22))',
            }}>
              <div style={{ width: '100%', height: '100%', background: '#f7edd1', border: '1px solid rgba(92,61,10,0.28)', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(0 0, 50% 55%, 100% 0, 100% 100%, 0 100%)', background: 'rgba(224,196,137,0.5)' }} />
                <div style={{ position: 'absolute', left: '50%', top: '52%', width: '14px', height: '14px', borderRadius: '50%', background: '#8d1f24', transform: 'translate(-50%, -50%)', boxShadow: '0 0 0 3px rgba(141,31,36,0.12)' }} />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={phase >= 3 ? { opacity: showObservatory || showMap || showDirect || showReply || showDrift ? 1 : 0.34, scale: showObservatory ? 1.06 : 1 } : {}}
              transition={{ duration: 1.2, delay: 0.65, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                right: 'clamp(18px, 5vw, 46px)',
                bottom: 'clamp(22px, 5vw, 44px)',
                width: 'clamp(104px, 24vw, 156px)',
                height: 'clamp(104px, 24vw, 156px)',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(28,19,8,0.88), rgba(28,19,8,0.52) 54%, transparent 70%)',
                boxShadow: showObservatory ? '0 0 52px rgba(200,160,255,0.38), 0 0 38px rgba(201,168,76,0.42)' : '0 0 38px rgba(201,168,76,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f3d889', boxShadow: '0 0 24px 10px rgba(243,216,137,0.54)' }} />
              <span style={{
                position: 'absolute',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                border: '1px solid rgba(243,216,137,0.36)',
                animation: 'ds-arrival-kindled 5.4s ease-in-out infinite',
              }} />
              <span style={{ position: 'absolute', top: '20%', right: '24%', width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.7)' }} />
              <span style={{ position: 'absolute', bottom: '25%', left: '28%', width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.62)' }} />
            </motion.div>

            <div style={{
              position: 'absolute',
              right: 'clamp(42px, 9vw, 78px)',
              bottom: 'clamp(92px, 17vw, 132px)',
              zIndex: 4,
              width: 'clamp(42px, 9vw, 62px)',
              height: 'clamp(28px, 6vw, 40px)',
              transformOrigin: 'center',
              animation: 'ds-reply-return 8s ease-in-out infinite',
              filter: 'drop-shadow(0 8px 12px rgba(64,39,7,0.18))',
              pointerEvents: 'none',
              opacity: showObservatory || showDrift ? 1 : 0.2,
              transition: 'opacity 0.35s ease',
            }}>
              <div style={{ width: '100%', height: '100%', background: '#f8efd8', border: '1px solid rgba(92,61,10,0.24)', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(0 0, 50% 58%, 100% 0, 100% 100%, 0 100%)', background: 'rgba(231,202,146,0.48)' }} />
              </div>
            </div>

            <div style={{
              position: 'absolute',
              left: 'clamp(16px, 4vw, 34px)',
              right: 'clamp(16px, 4vw, 34px)',
              bottom: 'clamp(50px, 9vw, 76px)',
              zIndex: 5,
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: '6px',
              pointerEvents: 'none',
            }}>
              {journeyChapters.map((chapter, i) => (
                <span
                  key={chapter.label}
                  style={{
                    height: '3px',
                    borderRadius: '999px',
                    background: i === 0 && showMirror
                      ? 'linear-gradient(90deg, rgba(120,88,24,0.28), rgba(201,168,76,0.95))'
                      : i === 1 && showMap
                        ? 'linear-gradient(90deg, rgba(120,88,24,0.28), rgba(90,145,210,0.9))'
                      : i === 2 && (showScribe || showDirect)
                          ? 'linear-gradient(90deg, rgba(120,88,24,0.28), rgba(112,76,20,0.85))'
                          : i === 3 && showObservatory
                            ? 'linear-gradient(90deg, rgba(120,88,24,0.28), rgba(200,160,255,0.9))'
                            : i === 4 && showReply
                              ? 'linear-gradient(90deg, rgba(120,88,24,0.28), rgba(255,140,120,0.9))'
                              : 'linear-gradient(90deg, rgba(120,88,24,0.16), rgba(201,168,76,0.34))',
                    animation: `ds-timeline-glow 3s ease-in-out ${i * 0.45}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '1px', background: 'rgba(120,88,24,0.28)' }} />
            <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: 'clamp(17px, 2vw, 21px)', color: 'rgba(55,34,8,0.78)' }}>
              No likes. No follower counts. No read receipts. Just letters, handled kindly.
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.7, ease: 'easeOut' }}
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
            onClick={() => setShowUniverseChoices((v) => !v)}
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
          <AnimatePresence>
            {showUniverseChoices && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  padding: '18px',
                  background: 'linear-gradient(180deg, rgba(255,250,238,0.86) 0%, rgba(250,241,214,0.8) 100%)',
                  border: '1px solid rgba(140,100,30,0.2)',
                  borderRadius: '18px',
                  boxShadow: '0 16px 40px rgba(120,88,24,0.14)',
                }}
              >
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <p
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: 'clamp(9px, 1.1vw, 10px)',
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: 'rgba(120,88,24,0.56)',
                      margin: 0,
                    }}
                  >
                    Choose Your Path
                  </p>
                  <p
                    style={{
                      fontFamily: "'IM Fell English', serif",
                      fontStyle: 'italic',
                      fontSize: 'clamp(13px, 1.5vw, 15px)',
                      color: 'rgba(75,52,12,0.7)',
                      textAlign: 'center',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    New here, or returning to your hub?
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '12px',
                  }}
                >
                  <button
                    onClick={onEnter}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '7px',
                      fontFamily: "'Cinzel', serif",
                      textAlign: 'left',
                      color: '#f5edd8',
                      background: 'linear-gradient(135deg, #7a5a18 0%, #c9a84c 48%, #7a5a18 100%)',
                      border: 'none',
                      padding: '16px 18px',
                      cursor: 'pointer',
                      width: '100%',
                      borderRadius: '14px',
                      boxShadow: '0 8px 24px rgba(120,88,24,0.22)',
                    }}
                  >
                    <span style={{ fontSize: 'clamp(9px, 1.1vw, 10px)', letterSpacing: '0.24em', textTransform: 'uppercase' }}>
                      Create a Hub
                    </span>
                    <span style={{ fontFamily: "'IM Fell English', serif", fontSize: '14px', letterSpacing: '0.02em', lineHeight: 1.4, textTransform: 'none', opacity: 0.94 }}>
                      Begin onboarding and shape your place in the universe.
                    </span>
                  </button>

                  <button
                    onClick={onLogin}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '7px',
                      fontFamily: "'Cinzel', serif",
                      textAlign: 'left',
                      color: 'rgba(75,52,12,0.78)',
                      background: 'rgba(255,252,244,0.7)',
                      border: '1px solid rgba(140,100,30,0.2)',
                      padding: '16px 18px',
                      cursor: 'pointer',
                      width: '100%',
                      borderRadius: '14px',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.42)',
                    }}
                  >
                    <span style={{ fontSize: 'clamp(9px, 1.1vw, 10px)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
                      Got a Hub? Sign In
                    </span>
                    <span style={{ fontFamily: "'IM Fell English', serif", fontSize: '14px', letterSpacing: '0.02em', lineHeight: 1.4, textTransform: 'none', opacity: 0.82 }}>
                      Return straight to your account and pick up where you left off.
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
