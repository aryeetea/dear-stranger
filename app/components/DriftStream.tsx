'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getDriftLetters, sendLetter, blockUser, isBlocked } from '../lib/auth'
import { playLetterSend, playTypingSound, playWaxSeal } from '../../lib/sounds'
import { HANDWRITING_STYLES, LETTER_EMBELLISHMENTS, getHandwritingStyleStyles, renderLetterEmbellishment, type HandwritingStyle, type EmbellishmentId } from '../lib/letterEnrichments'
import HandwritingCanvas, { type HandwritingCanvasRef } from './HandwritingCanvas'
import { uploadHandwrittenImage } from '../lib/auth'

// ─── Drift-exclusive paper styles ────────────────────────────────────────────
const DRIFT_PAPERS = [
  { id: 'void-parchment',  label: 'Void Parchment',   sublabel: 'Cosmic dark vellum',       bg: 'linear-gradient(160deg, #0e0c1a 0%, #1a1430 100%)', border: 'rgba(160,130,220,0.22)', text: 'rgba(220,210,255,0.92)', subtext: 'rgba(160,140,220,0.65)', accent: '#c9a8f0' },
  { id: 'nebula-leaf',     label: 'Nebula Leaf',       sublabel: 'Swirling purple mist',     bg: 'linear-gradient(135deg, #130a22 0%, #1e0a38 55%, #0a1228 100%)', border: 'rgba(140,90,200,0.3)', text: 'rgba(230,220,255,0.9)', subtext: 'rgba(180,150,230,0.7)', accent: '#e0b8ff' },
  { id: 'starworn',        label: 'Starworn',          sublabel: 'Ancient cosmic scroll',    bg: 'linear-gradient(160deg, #1a1408 0%, #2a2010 60%, #1c1808 100%)', border: 'rgba(200,170,90,0.3)', text: 'rgba(245,225,170,0.92)', subtext: 'rgba(200,170,100,0.65)', accent: '#e6c76e' },
  { id: 'moondust',        label: 'Moondust',          sublabel: 'Soft silver luminescence', bg: 'linear-gradient(160deg, #f8f8fc 0%, #eeeef8 60%, #e4e4f4 100%)', border: 'rgba(80,80,160,0.18)', text: 'rgba(30,28,60,0.88)', subtext: 'rgba(80,78,140,0.6)', accent: '#5050a0' },
  { id: 'ember-glow',      label: 'Ember Glow',        sublabel: 'Warm burnt orange tones',  bg: 'linear-gradient(160deg, #180a04 0%, #2c1008 55%, #200c06 100%)', border: 'rgba(220,120,40,0.3)', text: 'rgba(255,210,160,0.9)', subtext: 'rgba(220,150,80,0.65)', accent: '#f0a848' },
  { id: 'tide-glass',      label: 'Tide Glass',        sublabel: 'Deep ocean teal',          bg: 'linear-gradient(160deg, #041018 0%, #082028 55%, #040e18 100%)', border: 'rgba(60,160,180,0.25)', text: 'rgba(180,240,250,0.9)', subtext: 'rgba(100,200,220,0.6)', accent: '#60d0e8' },
  { id: 'rose-ash',        label: 'Rose Ash',          sublabel: 'Faded rose & cinders',     bg: 'linear-gradient(160deg, #200818 0%, #300a22 55%, #1c0818 100%)', border: 'rgba(200,80,120,0.25)', text: 'rgba(255,200,220,0.9)', subtext: 'rgba(200,130,160,0.6)', accent: '#f0a0c0' },
  { id: 'gilded-dark',     label: 'Gilded Dark',       sublabel: 'Black with gold veins',    bg: 'linear-gradient(160deg, #080808 0%, #121010 55%, #0a0808 100%)', border: 'rgba(200,170,70,0.35)', text: 'rgba(240,220,140,0.92)', subtext: 'rgba(180,150,70,0.65)', accent: '#d4a830' },
]

// ─── Drift-exclusive fonts ────────────────────────────────────────────────────
const DRIFT_FONTS = [
  { id: 'almendra',       label: 'Almendra',        family: "'Almendra', serif",              preview: 'Words carried by the wind' },
  { id: 'cinzel',         label: 'Cinzel',           family: "'Cinzel', serif",                preview: 'WORDS TO THE VOID' },
  { id: 'philosopher',    label: 'Philosopher',      family: "'Philosopher', serif",           preview: 'Words carried by the wind' },
  { id: 'spectral',       label: 'Spectral',         family: "'Spectral', serif",              preview: 'Words carried by the wind' },
  { id: 'unifraktur',     label: 'UnifrakturMaguntia', family: "'UnifrakturMaguntia', cursive", preview: 'Words to the void' },
  { id: 'im-fell',        label: 'IM Fell English',  family: "'IM Fell English', serif",       preview: 'Words carried by the wind' },
  { id: 'fondamento',     label: 'Fondamento',       family: "'Fondamento', cursive",          preview: 'Words carried by the wind' },
  { id: 'tangerine',      label: 'Tangerine',        family: "'Tangerine', cursive",           preview: 'Words carried softly away' },
  { id: 'pinyon-script',  label: 'Pinyon Script',    family: "'Pinyon Script', cursive",       preview: 'Words carried softly away' },
  { id: 'caesar-dressing',label: 'Caesar Dressing',  family: "'Caesar Dressing', cursive",     preview: 'Words to the void' },
  { id: 'cormorant',      label: 'Cormorant',        family: "'Cormorant Garamond', serif",    preview: 'Words carried by the wind' },
  { id: 'eb-garamond',    label: 'EB Garamond',      family: "'EB Garamond', serif",           preview: 'Words carried by the wind' },
]

// ─── Drift-exclusive ink colors ───────────────────────────────────────────────
const DRIFT_INKS = [
  { id: 'starlight',  label: 'Starlight',     color: 'rgba(220,210,255,0.95)',  desc: 'Pale luminous violet' },
  { id: 'void',       label: 'Void Ink',      color: 'rgba(180,160,240,0.9)',   desc: 'Deep spectral purple' },
  { id: 'nebula',     label: 'Nebula',        color: 'rgba(150,220,250,0.9)',   desc: 'Cosmic cyan' },
  { id: 'ember',      label: 'Ember',         color: 'rgba(255,190,90,0.92)',   desc: 'Warm drifting amber' },
  { id: 'moss-fire',  label: 'Moss Fire',     color: 'rgba(120,240,160,0.88)',  desc: 'Ethereal green glow' },
  { id: 'rose-mist',  label: 'Rose Mist',     color: 'rgba(255,180,200,0.9)',   desc: 'Soft drifting rose' },
  { id: 'obsidian',   label: 'Obsidian',      color: 'rgba(200,195,220,0.92)',  desc: 'Cool stone grey' },
  { id: 'gold-leaf',  label: 'Gold Leaf',     color: 'rgba(230,195,90,0.95)',   desc: 'Burnished gilded ink' },
  { id: 'midnight-blue', label: 'Midnight Blue', color: 'rgba(100,140,240,0.9)', desc: 'Night sky blue' },
  { id: 'crimson-drift', label: 'Crimson Drift', color: 'rgba(240,110,130,0.9)', desc: 'Blood-red dusk' },
]

// ─── Envelope visuals for floating display ────────────────────────────────────
const ENV_STYLES = [
  { bg: 'linear-gradient(145deg, #1a1030, #2a1848)', flap: '#3a2268', border: 'rgba(160,120,240,0.4)', label: 'rgba(200,180,255,0.7)' },
  { bg: 'linear-gradient(145deg, #1c1008, #2c1a08)', flap: '#40280a', border: 'rgba(210,160,60,0.4)',  label: 'rgba(230,190,100,0.7)' },
  { bg: 'linear-gradient(145deg, #060e14, #081820)', flap: '#0a2030', border: 'rgba(60,160,200,0.35)', label: 'rgba(120,200,230,0.7)' },
  { bg: 'linear-gradient(145deg, #180810, #280a1a)', flap: '#380a24', border: 'rgba(200,80,140,0.35)', label: 'rgba(230,140,180,0.7)' },
  { bg: 'linear-gradient(145deg, #10100c, #1c1c10)', flap: '#28280a', border: 'rgba(180,180,60,0.35)', label: 'rgba(210,210,100,0.7)' },
  { bg: 'linear-gradient(145deg, #080c08, #101810)', flap: '#0a280a', border: 'rgba(60,180,100,0.35)', label: 'rgba(120,210,140,0.7)' },
]

const DRIFT_STARS = Array.from({ length: 28 }, (_, i) => ({
  width: `${(i % 3) * 0.4 + 0.25}px`,
  left: `${((i * 53 + 19) % 100)}%`,
  top: `${((i * 71 + 7) % 100)}%`,
  opacity: (i % 6) * 0.035 + 0.03,
}))

// ─── Orbit radii and speeds for tornado display ───────────────────────────────
const ORBIT_TRACKS = [
  { radius: 110, yScale: 0.42, duration: 9 },
  { radius: 175, yScale: 0.42, duration: 12 },
  { radius: 240, yScale: 0.42, duration: 15 },
]

function orbitKeyframes(radius: number, yScale: number, startAngle: number, steps = 24) {
  const kfX: number[] = [], kfY: number[] = []
  for (let k = 0; k <= steps; k++) {
    const angle = startAngle + (k / steps) * Math.PI * 2
    kfX.push(Math.cos(angle) * radius)
    kfY.push(Math.sin(angle) * radius * yScale)
  }
  return { kfX, kfY, times: Array.from({ length: steps + 1 }, (_, k) => k / steps) }
}

interface DriftLetter {
  id: string
  senderId: string
  senderName: string
  body: string
  preview: string
  subject: string
  paperId: string
  fontId: string
  fontColor?: string
  handwritingStyle?: HandwritingStyle
  handwrittenImageUrl?: string
  embellishmentId?: EmbellishmentId
  createdAt?: string
}

type DriftView = 'read' | 'write' | 'paper' | 'font' | 'ink'

function formatDriftTime(dateString?: string) {
  if (!dateString) return 'drifting through the void'
  const diffMs = Date.now() - new Date(dateString).getTime()
  const diffHours = Math.max(1, Math.floor(diffMs / 3600000))
  if (diffHours < 24) return `drifting for ${diffHours} hour${diffHours === 1 ? '' : 's'}`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `drifting for ${diffDays} day${diffDays === 1 ? '' : 's'}`
  const diffMonths = Math.floor(diffDays / 30)
  return `drifting for ${diffMonths} month${diffMonths === 1 ? '' : 's'}`
}

function formatDriftDate(dateString?: string) {
  if (!dateString) return 'No timestamp'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Paper background renderer ────────────────────────────────────────────────
function DriftPaperBg({ paperId, children }: { paperId: string; children: React.ReactNode }) {
  const p = DRIFT_PAPERS.find(d => d.id === paperId) ?? DRIFT_PAPERS[0]
  const id = paperId
  const rl = (count: number, color: string, startY: number, gap: number, left: string, right: string) =>
    [...Array(count)].map((_, i) => (
      <div key={i} style={{ position: 'absolute', left, right, top: `${startY + i * gap}px`, height: '1px', background: color, pointerEvents: 'none', zIndex: 1 }} />
    ))
  return (
    <div style={{
      background: p.bg,
      border: `1px solid ${p.border}`,
      borderRadius: '2px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 20px 80px rgba(0,0,0,0.75), inset 0 0 60px rgba(0,0,0,0.15)',
    }}>
      {/* void-parchment: star particles + inner border + ruled lines */}
      {id === 'void-parchment' && <>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
          {[...Array(40)].map((_, i) => { const x = (i * 67 + 11) % 100; const y = (i * 53 + 7) % 100; const sz = (i % 3) * 0.3 + 0.3; const op = (i % 5) * 0.03 + 0.06; return <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${sz}px`, height: `${sz}px`, borderRadius: '50%', background: `rgba(255,255,255,${op})` }} /> })}
        </div>
        <div style={{ position: 'absolute', inset: '14px', border: '1px solid rgba(160,130,220,0.18)', pointerEvents: 'none', zIndex: 2 }} />
        {rl(20, 'rgba(160,130,220,0.08)', 70, 30, '44px', '44px')}
      </>}
      {/* nebula-leaf: stars + nebula SVG glow + inner border + lines */}
      {id === 'nebula-leaf' && <>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
          {[...Array(55)].map((_, i) => { const x = (i * 71 + 23) % 100; const y = (i * 59 + 13) % 100; const sz = (i % 4) * 0.25 + 0.25; const op = (i % 6) * 0.025 + 0.07; return <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${sz}px`, height: `${sz}px`, borderRadius: '50%', background: `rgba(255,255,255,${op})` }} /> })}
        </div>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid slice">
            <defs><filter id="nbl-blur"><feGaussianBlur stdDeviation="28" /></filter></defs>
            <ellipse cx="80%" cy="18%" rx="160" ry="110" fill="rgba(140,60,200,0.11)" filter="url(#nbl-blur)" />
            <ellipse cx="15%" cy="75%" rx="120" ry="90" fill="rgba(80,40,180,0.09)" filter="url(#nbl-blur)" />
          </svg>
        </div>
        <div style={{ position: 'absolute', inset: '14px', border: '1px solid rgba(140,90,200,0.18)', pointerEvents: 'none', zIndex: 2 }} />
        {rl(18, 'rgba(140,90,200,0.07)', 70, 30, '40px', '40px')}
      </>}
      {/* starworn: fractal grain + amber ruled lines + age spots */}
      {id === 'starworn' && <>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='swn'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0.35'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23swn)' opacity='0.1'/%3E%3C/svg%3E\")", backgroundSize: '180px', zIndex: 1 }} />
        {rl(18, 'rgba(200,160,60,0.1)', 60, 30, '36px', '36px')}
        {[[8, 12, 18], [82, 6, 14], [60, 78, 16]].map(([l, t, sz], i) => (
          <div key={i} style={{ position: 'absolute', left: `${l}%`, top: `${t}%`, width: `${sz}px`, height: `${sz}px`, background: 'radial-gradient(circle, rgba(100,60,10,0.18) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 2 }} />
        ))}
      </>}
      {/* moondust: margin line + inner border + ruled lines */}
      {id === 'moondust' && <>
        <div style={{ position: 'absolute', left: '52px', top: 0, bottom: 0, width: '1px', background: 'rgba(80,80,180,0.22)', pointerEvents: 'none', zIndex: 2 }} />
        <div style={{ position: 'absolute', inset: '14px', border: '1px solid rgba(80,80,160,0.1)', pointerEvents: 'none', zIndex: 2 }} />
        {rl(22, 'rgba(100,100,200,0.11)', 52, 28, '54px', '20px')}
      </>}
      {/* ember-glow: grain + warm top radial + faint ruled lines */}
      {id === 'ember-glow' && <>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='emb'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0.3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23emb)' opacity='0.09'/%3E%3C/svg%3E\")", backgroundSize: '160px', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 45% at 50% 0%, rgba(220,100,20,0.14) 0%, transparent 70%)', zIndex: 2 }} />
        {rl(18, 'rgba(220,120,40,0.08)', 62, 30, '36px', '36px')}
      </>}
      {/* tide-glass: bioluminescent particles + inner border + lines */}
      {id === 'tide-glass' && <>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
          {[...Array(30)].map((_, i) => { const x = (i * 73 + 17) % 100; const y = (i * 61 + 9) % 100; const sz = (i % 3) * 0.3 + 0.3; const op = (i % 5) * 0.03 + 0.07; return <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${sz}px`, height: `${sz}px`, borderRadius: '50%', background: `rgba(100,220,240,${op})` }} /> })}
        </div>
        <div style={{ position: 'absolute', inset: '14px', border: '1px solid rgba(60,160,180,0.2)', pointerEvents: 'none', zIndex: 2 }} />
        {rl(18, 'rgba(60,160,180,0.07)', 70, 30, '40px', '40px')}
      </>}
      {/* rose-ash: petal particles + inner border + lines */}
      {id === 'rose-ash' && <>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
          {[...Array(25)].map((_, i) => { const x = (i * 67 + 23) % 100; const y = (i * 53 + 11) % 100; const sz = (i % 4) * 1.5 + 2; const op = (i % 5) * 0.025 + 0.08; return <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${sz}px`, height: `${sz * 0.6}px`, borderRadius: '50%', background: `rgba(240,120,160,${op})`, transform: `rotate(${(i * 37) % 360}deg)` }} /> })}
        </div>
        <div style={{ position: 'absolute', inset: '14px', border: '1px solid rgba(200,80,120,0.18)', pointerEvents: 'none', zIndex: 2 }} />
        {rl(18, 'rgba(200,80,120,0.07)', 70, 30, '40px', '40px')}
      </>}
      {/* gilded-dark: corner ornaments + double gold border + gold particles + lines */}
      {id === 'gilded-dark' && <>
        {[['0', '0', '0deg'], ['100%', '0', '90deg'], ['0', '100%', '-90deg'], ['100%', '100%', '180deg']].map(([l, t, rot], i) => (
          <div key={i} style={{ position: 'absolute', left: l, top: t, transform: `translate(${i % 2 ? '-100%' : '0'}, ${i > 1 ? '-100%' : '0'})`, zIndex: 3, pointerEvents: 'none' }}>
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: `rotate(${rot})` }}>
              <path d="M0 0 L26 0 Q32 0 32 6 L32 26" fill="none" stroke="rgba(200,170,70,0.55)" strokeWidth="1.5" />
              <circle cx="4" cy="4" r="2" fill="rgba(200,170,70,0.5)" />
              <path d="M13 13 Q16 9 18 13 Q22 14 18 18 Q16 21 13 19 Q9 16 13 13Z" fill="rgba(200,170,70,0.16)" stroke="rgba(200,170,70,0.4)" strokeWidth="0.7" />
            </svg>
          </div>
        ))}
        <div style={{ position: 'absolute', inset: '14px', border: '1px solid rgba(200,170,70,0.32)', pointerEvents: 'none', zIndex: 2 }} />
        <div style={{ position: 'absolute', inset: '20px', border: '0.5px solid rgba(200,170,70,0.14)', pointerEvents: 'none', zIndex: 2 }} />
        {rl(18, 'rgba(200,170,70,0.07)', 70, 30, '44px', '44px')}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
          {[...Array(20)].map((_, i) => { const x = (i * 67 + 11) % 100; const y = (i * 53 + 17) % 100; const op = (i % 5) * 0.02 + 0.05; return <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: '1.5px', height: '1.5px', borderRadius: '50%', background: `rgba(210,180,70,${op})` }} /> })}
        </div>
      </>}
      {/* edge vignette for all papers */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.22) 100%)', pointerEvents: 'none', zIndex: 3 }} />
      {/* ── Letterhead ── */}
      <div style={{ textAlign: 'center', paddingTop: '36px', paddingBottom: '4px', position: 'relative', zIndex: 4 }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: p.subtext, textTransform: 'uppercase', margin: 0 }}>✦ Dear Stranger ✦</p>
        <div style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${p.border}, transparent)`, margin: '10px 40px 0' }} />
      </div>
      {/* ── Content ── */}
      <div style={{ padding: 'clamp(14px,2vw,22px) clamp(28px,4vw,52px) 0', position: 'relative', zIndex: 4 }}>
        {children}
      </div>
      {/* ── Footer ── */}
      <div style={{ textAlign: 'center', padding: '16px 0 28px', position: 'relative', zIndex: 4 }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: p.subtext, opacity: 0.5, margin: 0 }}>— ✦ —</p>
      </div>
    </div>
  )
}

// ─── Letter reading modal with block ─────────────────────────────────────────
function OpenLetterModal({ open, onClose, onBlocked }: {
  open: DriftLetter
  onClose: () => void
  onBlocked: () => void
}) {
  const p = DRIFT_PAPERS.find(d => d.id === open.paperId) ?? DRIFT_PAPERS[0]
  const f = DRIFT_FONTS.find(d => d.id === open.fontId) ?? DRIFT_FONTS[0]
  const inkEntry = DRIFT_INKS.find(d => d.id === open.fontColor)
  const resolvedInk = inkEntry ? inkEntry.color : p.text
  const writingStyle = getHandwritingStyleStyles(open.handwritingStyle || 'typed')

  const [blocking, setBlocking] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [confirmBlock, setConfirmBlock] = useState(false)
  const [phase, setPhase] = useState<'seal' | 'unfold' | 'read'>('seal')
  const [visibleChars, setVisibleChars] = useState(0)

  useEffect(() => {
    isBlocked(open.senderId).then(setBlocked)
  }, [open.senderId])

  useEffect(() => {
    const openTimer = setTimeout(() => setPhase('unfold'), 650)
    const readTimer = setTimeout(() => setPhase('read'), 1325)
    return () => {
      clearTimeout(openTimer)
      clearTimeout(readTimer)
    }
  }, [open.id])

  useEffect(() => {
    if (phase !== 'read') return
    const timer = window.setInterval(() => {
      setVisibleChars(prev => {
        const next = Math.min(open.body.length, prev + 8)
        if (next >= open.body.length) window.clearInterval(timer)
        return next
      })
    }, 18)
    return () => window.clearInterval(timer)
  }, [phase, open.body])

  async function handleBlock() {
    setBlocking(true)
    try {
      await blockUser(open.senderId)
      setBlocked(true)
      setTimeout(onBlocked, 600)
    } catch {
      setBlocking(false)
      setConfirmBlock(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(3,2,10,0.84)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', backdropFilter: 'blur(14px)' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 34% 28% at 24% 22%, rgba(162,92,190,0.12) 0%, transparent 72%), radial-gradient(ellipse 30% 24% at 74% 68%, rgba(255,142,88,0.1) 0%, transparent 72%), radial-gradient(ellipse 50% 36% at 50% 56%, rgba(72,40,120,0.16) 0%, transparent 80%)' }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 'min(74vw, 760px)', height: 'min(74vw, 760px)', transform: 'translate(-50%, -50%)', pointerEvents: 'none', borderRadius: '50%', border: '1px solid rgba(206,172,242,0.08)', boxShadow: '0 0 0 80px rgba(166,126,220,0.025), 0 0 0 170px rgba(255,150,92,0.018)' }} />
      <motion.div
        initial={{ scale: 0.93, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '100%', maxHeight: '84vh', overflowY: 'auto', position: 'relative', padding: '18px', borderRadius: '28px', background: 'linear-gradient(180deg, rgba(12,8,24,0.72), rgba(8,6,18,0.48))', border: '1px solid rgba(214,186,255,0.08)', boxShadow: '0 28px 90px rgba(0,0,0,0.5)' }}
      >
        {/* close */}
        <button onClick={onClose}
          style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 100, background: 'rgba(0,0,0,0.5)', border: `1px solid ${p.border}`, borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: p.subtext, cursor: 'pointer' }}>
          ×
        </button>

        <div style={{ position: 'relative' }}>
          {phase !== 'read' && (
            <motion.div
              initial={{ opacity: 0.9 }}
              animate={{ opacity: phase === 'seal' ? 1 : 0.85 }}
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9, pointerEvents: 'none' }}>
              <motion.div
                initial={{ scale: 0.94, rotateX: 0, opacity: 1 }}
                animate={phase === 'seal'
                  ? { scale: [0.94, 1, 0.98], rotate: [0, -1.5, 1.5, 0] }
                  : { scale: [1, 1.02, 1.06], rotateX: [0, 14, 24], y: [0, -18, -30], opacity: [1, 0.84, 0] }}
                transition={{ duration: phase === 'seal' ? 0.55 : 0.7, ease: 'easeInOut' }}
                style={{ position: 'relative', width: 'min(520px, 88vw)', aspectRatio: '1.45 / 1', borderRadius: '6px', background: 'linear-gradient(160deg, rgba(38,22,58,0.98), rgba(82,48,106,0.94))', border: '1px solid rgba(230,190,255,0.18)', boxShadow: '0 22px 70px rgba(0,0,0,0.7)' }}>
                <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(0 0, 100% 0, 50% 54%)', background: 'linear-gradient(180deg, rgba(124,80,154,0.98), rgba(62,34,88,0.95))', borderBottom: '1px solid rgba(230,190,255,0.14)' }} />
                <motion.div
                  animate={phase === 'seal' ? { scale: [1, 0.92, 1.08, 1] } : { scale: [1, 0.8, 0.55], opacity: [1, 0.7, 0] }}
                  transition={{ duration: 0.46, ease: 'easeInOut' }}
                  style={{ position: 'absolute', left: '50%', top: '52%', transform: 'translate(-50%, -50%)', width: '66px', height: '66px', borderRadius: '50%', background: 'radial-gradient(circle at 36% 30%, rgba(255,146,136,0.98), rgba(134,30,34,0.94) 54%, rgba(72,10,16,0.98))', boxShadow: '0 0 28px rgba(190,60,60,0.42)' }} />
                {phase === 'unfold' && [...Array(14)].map((_, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0.9, scale: 0.4, x: 0, y: 0 }}
                    animate={{ opacity: 0, scale: 1.1, x: (index - 7) * 16, y: ((index % 4) - 1.5) * 18 - 8 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{ position: 'absolute', left: '50%', top: '52%', width: '8px', height: '8px', background: 'rgba(214,112,122,0.85)', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}

        <DriftPaperBg paperId={open.paperId}>
          {renderLetterEmbellishment(open.embellishmentId, p.accent, 'read')}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 42% 30% at 52% 46%, rgba(120,68,190,0.08) 0%, transparent 74%)', zIndex: 2 }} />
          <p style={{ fontFamily: f.family, fontStyle: 'italic', fontSize: 'clamp(20px,3.2vw,28px)', color: p.text, marginBottom: '4px', lineHeight: 1.2 }}>
            {open.subject}
          </p>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: p.subtext, textTransform: 'uppercase', marginBottom: '28px' }}>
            from {open.senderName}
          </p>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: p.subtext, textTransform: 'uppercase', marginBottom: '14px', opacity: 0.7 }}>
            {formatDriftTime(open.createdAt)}
          </p>
          <div style={{ height: '1px', background: p.border, marginBottom: '24px' }} />
          {open.handwritingStyle === 'handwritten' && open.handwrittenImageUrl ? (
            <div style={{ margin: '16px 0' }}>
              <img src={open.handwrittenImageUrl} alt="Handwritten letter" style={{ width: '100%', height: 'auto', borderRadius: '4px' }} />
            </div>
          ) : (
            <p style={{ ...writingStyle, fontFamily: f.family, fontSize: 'clamp(14px,1.8vw,16px)', color: resolvedInk, lineHeight: 2.0, whiteSpace: 'pre-wrap', margin: 0 }}>
              {phase === 'read' ? open.body.slice(0, visibleChars) : ''}
            </p>
          )}

          {/* block section */}
          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
            {blocked ? (
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.22em', color: p.subtext, opacity: 0.5, textTransform: 'uppercase' }}>
                Stranger blocked
              </p>
            ) : confirmBlock ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '11px', color: p.subtext, margin: 0 }}>
                  Block this stranger? Their letters will no longer drift to you.
                </p>
                <button
                  onClick={handleBlock}
                  disabled={blocking}
                  style={{ background: 'rgba(180,40,40,0.12)', border: '1px solid rgba(200,60,60,0.5)', color: 'rgba(240,140,130,0.9)', fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.22em', textTransform: 'uppercase', padding: '5px 12px', cursor: 'pointer', borderRadius: '2px' }}>
                  {blocking ? 'Blocking…' : 'Confirm'}
                </button>
                <button
                  onClick={() => setConfirmBlock(false)}
                  style={{ background: 'transparent', border: `1px solid ${p.border}`, color: p.subtext, fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.22em', textTransform: 'uppercase', padding: '5px 12px', cursor: 'pointer', borderRadius: '2px' }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmBlock(true)}
                style={{ background: 'transparent', border: `1px solid ${p.border}`, color: p.subtext, fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.22em', textTransform: 'uppercase', padding: '5px 12px', cursor: 'pointer', borderRadius: '2px', opacity: 0.55, transition: 'opacity 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.55')}>
                Block Stranger
              </button>
            )}
          </div>
        </DriftPaperBg>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function DriftStream({ onClose, senderName }: { onClose?: () => void; senderName?: string }) {
  const [tab, setTab] = useState<DriftView>('read')
  const [letters, setLetters] = useState<DriftLetter[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [open, setOpen] = useState<DriftLetter | null>(null)

  // write state
  const [selectedPaper, setSelectedPaper] = useState(DRIFT_PAPERS[0])
  const [selectedFont, setSelectedFont] = useState(DRIFT_FONTS[0])
  const [selectedInk, setSelectedInk] = useState(DRIFT_INKS[0])
  const [selectedHandwriting, setSelectedHandwriting] = useState<HandwritingStyle>('typed')
  const [selectedEmbellishment, setSelectedEmbellishment] = useState<EmbellishmentId>('none')
  const [driftType, setDriftType] = useState<'letter' | 'poem' | 'journal'>('letter')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [subjectError, setSubjectError] = useState(false)
  const [sending, setSending] = useState(false)
  const [waxing, setWaxing] = useState(false)
  const [sent, setSent] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [hoveredLetterId, setHoveredLetterId] = useState<string | null>(null)
  const [openingLetterId, setOpeningLetterId] = useState<string | null>(null)
  const lastTypeSoundRef = useRef<number>(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const driftCanvasRef = useRef<HandwritingCanvasRef>(null)

  useEffect(() => {
    let cancelled = false
    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('DriftStream took too long to answer.')), 10000)
    })
    Promise.race([getDriftLetters(), timeout])
      .then((data) => {
        if (cancelled) return
        setLetters(data as DriftLetter[])
        setLoadError('')
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('The DriftStream is taking too long to answer. Please try again in a moment.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const paper = selectedPaper
  const fontFamily = selectedFont.family
  const inkColor = selectedInk.color
  const writeStyle = getHandwritingStyleStyles(selectedHandwriting)

  function handleTypingKey() {
    const now = Date.now()
    if (now - lastTypeSoundRef.current > 60) {
      playTypingSound()
      lastTypeSoundRef.current = now
    }
  }

  async function handleSend() {
    if (selectedHandwriting === 'typed' && !body.trim()) return
    if (selectedHandwriting === 'handwritten' && driftCanvasRef.current?.isEmpty()) return
    if (!subject.trim()) { setSubjectError(true); setTimeout(() => setSubjectError(false), 3000); return }
    setSubjectError(false)
    setWaxing(true)
    playWaxSeal()
    await new Promise(r => setTimeout(r, 1400))
    setWaxing(false)
    setSending(true)
    playLetterSend()
    await new Promise(r => setTimeout(r, 1800))
    try {
      let handwrittenImageUrl: string | undefined
      if (selectedHandwriting === 'handwritten') {
        const blob = await driftCanvasRef.current?.toBlob()
        if (blob) handwrittenImageUrl = await uploadHandwrittenImage(blob)
      }
      await sendLetter(
        null,
        body,
        selectedPaper.id,
        true,
        subject,
        selectedFont.id,
        selectedInk.id,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        selectedHandwriting,
        selectedEmbellishment,
        handwrittenImageUrl,
        isAnonymous,
      )
    } catch { /* silent */ }
    setSent(true)
  }

  const backLabel = tab === 'read' ? '← Return' : tab === 'write' ? '← Return' : '← Back'

  function handleBack() {
    if (tab === 'paper' || tab === 'font' || tab === 'ink') { setTab('write'); return }
    onClose?.()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed-scroll-panel"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(6,2,14,0.98)',
        backdropFilter: 'blur(20px)',
        zIndex: 70,
        overflowY: tab === 'read' ? 'hidden' : 'auto',
        padding: tab === 'read' ? '0' : 'clamp(72px,9vh,100px) clamp(16px,5vw,48px) 80px',
      }}
    >
      {/* stars */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 58% 42% at 50% 28%, rgba(104,52,150,0.3) 0%, transparent 66%), radial-gradient(ellipse 34% 26% at 18% 72%, rgba(200,110,84,0.14) 0%, transparent 72%), radial-gradient(ellipse 28% 24% at 82% 22%, rgba(152,90,190,0.14) 0%, transparent 72%), radial-gradient(circle at 50% 52%, rgba(255,182,110,0.05) 0%, transparent 18%)' }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.1, mixBlendMode: 'screen', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 220'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)' opacity='0.72'/%3E%3C/svg%3E\")" }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        {DRIFT_STARS.map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: s.width, height: s.width, borderRadius: '50%', background: `rgba(255,255,255,${s.opacity})`, left: s.left, top: s.top }} />
        ))}
      </div>

      {/* header controls */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', pointerEvents: 'none' }}>
        {/* back */}
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          onClick={handleBack}
          style={{ pointerEvents: 'all', background: 'none', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.78)', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em', padding: '8px 16px', cursor: 'pointer', textTransform: 'uppercase' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.96)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.32)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.78)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.background = 'none' }}
        >
          {backLabel}
        </motion.button>

        {/* title */}
        <div style={{ pointerEvents: 'none', textAlign: 'center' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.52em', color: '#e6c76e', textTransform: 'uppercase', margin: 0 }}>The Driftstream</p>
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.38)', marginTop: '6px' }}>open currents, hidden senders</p>
        </div>

        {/* tab toggle */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ pointerEvents: 'all', display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '4px', borderRadius: '4px' }}
        >
          {(['read', 'write'] as const).map(t => (
            <button key={t} onClick={() => { if (!waxing && !sending && !sent) setTab(t) }} disabled={waxing || sending || sent} style={{
              background: tab === t ? 'rgba(230,199,110,0.15)' : 'none',
              border: tab === t ? '1px solid rgba(230,199,110,0.4)' : '1px solid transparent',
              color: tab === t ? '#e6c76e' : 'rgba(255,255,255,0.5)',
              fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em',
              padding: '6px 14px', cursor: 'pointer', textTransform: 'uppercase', borderRadius: '2px',
              transition: 'all 0.18s',
            }}>{t === 'read' ? 'Drift' : 'Write'}</button>
          ))}
        </motion.div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── READ / floating envelopes ── */}
        {tab === 'read' && (
          <motion.div key="read" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 42% 36% at 50% 52%, rgba(255,132,78,0.08) 0%, transparent 68%)' }} />
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: 'min(64vw, 680px)', height: 'min(64vw, 680px)', transform: 'translate(-50%, -50%)', pointerEvents: 'none', borderRadius: '50%', background: 'radial-gradient(circle, rgba(94,38,140,0.22) 0%, rgba(34,14,64,0.1) 34%, transparent 70%)', filter: 'blur(10px)' }} />
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: 'min(34vw, 340px)', height: 'min(34vw, 340px)', transform: 'translate(-50%, -50%)', pointerEvents: 'none', borderRadius: '50%', border: '1px solid rgba(224,186,255,0.12)', boxShadow: '0 0 0 24px rgba(224,186,255,0.025), 0 0 40px rgba(255,148,94,0.08)' }} />
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: '22px', height: '22px', transform: 'translate(-50%, -50%)', pointerEvents: 'none', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,214,150,0.95), rgba(255,142,90,0.4) 56%, rgba(255,142,90,0) 72%)', boxShadow: '0 0 30px rgba(255,176,108,0.45)' }} />
            <div style={{ position: 'absolute', top: '112px', left: '50%', transform: 'translateX(-50%)', width: 'min(580px, calc(100vw - 48px))', textAlign: 'center', pointerEvents: 'none' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.36em', color: 'rgba(230,199,110,0.72)', textTransform: 'uppercase', marginBottom: '10px' }}>Anonymous Current</p>
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '18px', lineHeight: 1.6, color: 'rgba(255,255,255,0.64)' }}>
                Letters circle the warm center until one drifts close enough to be opened.
              </p>
            </div>
            {loading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.38em', color: 'rgba(230,199,110,0.42)', textTransform: 'uppercase' }}>Listening to the void…</p>
              </div>
            )}

            {!loading && loadError && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
                <p style={{ maxWidth: '420px', fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '17px', lineHeight: 1.6, color: 'rgba(255,255,255,0.5)' }}>{loadError}</p>
              </div>
            )}

            {!loading && !loadError && letters.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <div style={{ width: 'min(460px, calc(100vw - 48px))', padding: '28px 24px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(18,12,34,0.76), rgba(10,8,20,0.64))', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', textAlign: 'center' }}>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '18px', color: 'rgba(255,255,255,0.35)' }}>The universe is quiet right now.</p>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.2)' }}>Be the first to release a letter into the open.</p>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setTab('write')}
                  style={{ marginTop: '16px', background: 'none', border: '1px solid rgba(230,199,110,0.35)', color: '#e6c76e', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em', padding: '10px 24px', cursor: 'pointer', textTransform: 'uppercase' }}>
                  Write & Release
                </motion.button>
                </div>
              </div>
            )}

            {/* tornado-orbit envelopes */}
            {!loading && letters.length > 0 && (
              <div style={{ position: 'absolute', top: '50%', left: '50%' }}>
                {letters.map((letter, i) => {
                  const track = ORBIT_TRACKS[i % 3]
                  const startAngle = (i * 2.399) % (Math.PI * 2)
                  const duration = track.duration + i * 0.6
                  const { kfX, kfY, times } = orbitKeyframes(track.radius, track.yScale, startAngle)
                  const env = ENV_STYLES[i % ENV_STYLES.length]
                  return (
                    <motion.div
                      key={letter.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, x: kfX, y: kfY, rotate: hoveredLetterId === letter.id ? 0 : [((i % 5) - 2) * 2, ((i % 7) - 3) * 3, ((i % 4) - 1.5) * 2], scale: openingLetterId === letter.id ? [1, 1.08, 1.24] : hoveredLetterId === letter.id ? 1.1 : [1, 0.985, 1.02] }}
                      transition={{
                        opacity: { duration: 0.8, delay: i * 0.12 },
                        x: { duration, repeat: Infinity, ease: 'linear', times },
                        y: { duration, repeat: Infinity, ease: 'linear', times },
                        rotate: { duration: hoveredLetterId === letter.id ? 0.24 : 7 + (i % 4), repeat: hoveredLetterId === letter.id || openingLetterId === letter.id ? 0 : Infinity, ease: 'easeInOut' },
                        scale: { duration: openingLetterId === letter.id ? 0.52 : 4.8 + i * 0.12, repeat: openingLetterId === letter.id || hoveredLetterId === letter.id ? 0 : Infinity, ease: 'easeInOut' },
                      }}
                      onClick={() => { setOpeningLetterId(letter.id); setTimeout(() => { setOpen(letter); setOpeningLetterId(null) }, 360) }}
                      onMouseEnter={() => setHoveredLetterId(letter.id)}
                      onMouseLeave={() => setHoveredLetterId(current => current === letter.id ? null : current)}
                      title={letter.subject}
                      style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        width: 'clamp(72px, 8vw, 100px)',
                        marginLeft: 'calc(-1 * clamp(36px, 4vw, 50px))',
                        marginTop: 'calc(-1 * clamp(25px, 2.7vw, 34px))',
                        zIndex: 10 + i,
                        transformStyle: 'preserve-3d',
                      }}
                    >
                      {/* envelope body */}
                      <div style={{
                        width: '100%',
                        paddingBottom: '68%',
                        background: env.bg,
                        border: `1px solid ${env.border}`,
                        borderRadius: '10px',
                        position: 'relative',
                        boxShadow: hoveredLetterId === letter.id ? `0 20px 44px rgba(0,0,0,0.82), 0 0 28px ${env.border}` : `0 8px 28px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)`,
                        transition: 'box-shadow 0.2s, transform 0.2s',
                        transform: `translateZ(${(i % 3) * 12}px) ${hoveredLetterId === letter.id ? 'rotateX(0deg)' : `rotateX(${(i % 3) - 1}deg)`}`,
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateZ(26px) rotateX(0deg)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = `translateZ(${(i % 3) * 12}px) rotateX(${(i % 3) - 1}deg)` }}
                      >
                        <div style={{ position: 'absolute', inset: '-20% 18% auto', height: '80%', background: `linear-gradient(180deg, ${env.border}, transparent 74%)`, opacity: 0.2, filter: 'blur(14px)', transform: 'translateY(-12px)', pointerEvents: 'none' }} />
                        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 100 68" preserveAspectRatio="none">
                          <polygon points="0,0 100,0 50,38" fill={env.flap} opacity="0.9" />
                          <polygon points="0,0 50,38 0,68" fill="rgba(0,0,0,0.12)" />
                          <polygon points="100,0 50,38 100,68" fill="rgba(0,0,0,0.08)" />
                        </svg>
                        <div style={{ position: 'absolute', inset: '10% 14%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', opacity: 0.38 }} />
                        <div style={{ position: 'absolute', left: '12%', right: '12%', bottom: '18%', padding: '6px 7px', borderRadius: '8px', background: 'rgba(5,5,12,0.26)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '6px', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }}>
                            {letter.subject}
                          </p>
                          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '8px', color: env.label, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {formatDriftDate(letter.createdAt)}
                          </p>
                        </div>
                        <div style={{ position: 'absolute', bottom: '20%', left: '50%', transform: 'translateX(-50%)', width: '10px', height: '10px', borderRadius: '50%', background: env.border, boxShadow: `0 0 6px ${env.border}` }} />
                      </div>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.18em', color: env.label, textTransform: 'uppercase', textAlign: 'center', marginTop: '8px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {formatDriftTime(letter.createdAt)}
                      </p>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* hint */}
            {!loading && letters.length > 0 && (
              <>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                  style={{ position: 'absolute', bottom: '34px', left: '50%', transform: 'translateX(-50%)', fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.22)', textAlign: 'center', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                  envelopes drift in hidden currents
                </motion.p>
                <div style={{ position: 'absolute', left: '24px', bottom: '24px', width: 'min(280px, calc(100vw - 48px))', padding: '16px 18px', borderRadius: '18px', background: 'linear-gradient(180deg, rgba(20,14,36,0.72), rgba(10,8,20,0.62))', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 16px 40px rgba(0,0,0,0.24)', pointerEvents: 'none' }}>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.26em', color: 'rgba(230,199,110,0.72)', textTransform: 'uppercase', marginBottom: '8px' }}>Current Reading</p>
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.62)', lineHeight: 1.55 }}>
                    {letters.length} drifting letter{letters.length === 1 ? '' : 's'} are circling tonight.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── WRITE ── */}
        {tab === 'write' && !waxing && !sending && !sent && (
          <motion.div key="write" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ position: 'relative', zIndex: 2, maxWidth: '980px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px', padding: '24px clamp(18px, 3vw, 28px)', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(18,12,34,0.82), rgba(10,8,20,0.72) 52%, rgba(42,22,18,0.44) 100%)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 24px 70px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', justifyContent: 'space-between', alignItems: 'end' }}>
                <div style={{ flex: '1 1 360px', minWidth: '280px' }}>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.34em', color: 'rgba(230,199,110,0.72)', textTransform: 'uppercase', marginBottom: '10px' }}>Release Chamber</p>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(22px, 3vw, 34px)', letterSpacing: '0.2em', color: '#f1dfab', textTransform: 'uppercase', marginBottom: '10px' }}>Compose For The Current</p>
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '16px', color: 'rgba(255,255,255,0.62)', lineHeight: 1.65, maxWidth: '520px' }}>
                    Pick the paper, hand, and embellishment that matches the mood, then let the drift decide where it lands.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', flex: '0 1 360px' }}>
                  {[
                    { label: 'Paper', value: paper.label, onClick: () => setTab('paper') },
                    { label: 'Hand', value: selectedFont.label, onClick: () => setTab('font') },
                    { label: 'Ink', value: selectedInk.label, onClick: () => setTab('ink') },
                  ].map(chip => (
                    <button key={chip.label} onClick={chip.onClick}
                      style={{ padding: '12px 14px', minWidth: '112px', textAlign: 'left', borderRadius: '14px', background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.24em', color: 'rgba(230,199,110,0.72)', textTransform: 'uppercase', marginBottom: '6px' }}>{chip.label}</p>
                      <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.78)' }}>{chip.value}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', padding: '14px', borderRadius: '18px', background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['letter', 'poem', 'journal'] as const).map(t => (
                  <button key={t} onClick={() => setDriftType(t)}
                    style={{
                      background: driftType === t ? 'rgba(230,199,110,0.12)' : 'transparent',
                      border: `1px solid ${driftType === t ? 'rgba(230,199,110,0.55)' : 'rgba(255,255,255,0.15)'}`,
                      color: driftType === t ? '#e6c76e' : 'rgba(255,255,255,0.5)',
                      fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.22em',
                      textTransform: 'uppercase', padding: '5px 14px', cursor: 'pointer',
                      borderRadius: '2px', transition: 'all 0.15s',
                    }}>
                    {t === 'letter' ? 'Written Word' : t === 'poem' ? 'Poem' : 'Journal'}
                  </button>
                ))}
              </div>
                </div>

                <div style={{ padding: '14px 14px 12px', background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.22em', color: '#e6c76e', textTransform: 'uppercase', margin: '0 0 8px' }}>Letter Form</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {HANDWRITING_STYLES.map(style => {
                    const isSelected = selectedHandwriting === style.id
                    return (
                      <button key={style.id} onClick={() => setSelectedHandwriting(style.id)} style={{ flex: 1, textAlign: 'center', minHeight: '64px', padding: '10px 10px 9px', background: isSelected ? 'linear-gradient(180deg, rgba(230,199,110,0.16), rgba(230,199,110,0.08))' : 'rgba(255,255,255,0.02)', border: `1px solid ${isSelected ? 'rgba(230,199,110,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.14em', color: isSelected ? '#e6c76e' : 'rgba(255,255,255,0.78)', textTransform: 'uppercase', margin: '0 0 2px' }}>{style.id === 'typed' ? '⌨ ' : '✎ '}{style.label}</p>
                        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '10px', color: 'rgba(255,255,255,0.44)', margin: 0 }}>{style.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ padding: '14px 14px 12px', background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.22em', color: '#e6c76e', textTransform: 'uppercase', margin: '0 0 8px' }}>Embellishment</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))', gap: '8px' }}>
                  {LETTER_EMBELLISHMENTS.map(embellishment => {
                    const isSelected = selectedEmbellishment === embellishment.id
                    return (
                      <button key={embellishment.id} onClick={() => setSelectedEmbellishment(embellishment.id)} style={{ textAlign: 'left', minHeight: '84px', padding: '10px 10px 9px', background: isSelected ? 'linear-gradient(180deg, rgba(230,199,110,0.16), rgba(230,199,110,0.08))' : 'rgba(255,255,255,0.02)', border: `1px solid ${isSelected ? 'rgba(230,199,110,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.14em', color: isSelected ? '#e6c76e' : 'rgba(255,255,255,0.78)', textTransform: 'uppercase', margin: '0 0 2px' }}>{embellishment.label}</p>
                        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '10px', color: 'rgba(255,255,255,0.44)', margin: 0 }}>{embellishment.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
              </div>

              <div style={{ padding: '18px', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(12,10,26,0.82), rgba(8,8,18,0.68))', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 70px rgba(0,0,0,0.28)' }}>
            <DriftPaperBg paperId={paper.id}>
              {renderLetterEmbellishment(selectedEmbellishment, paper.accent, 'compose')}
              {/* subject */}
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Subject…"
                maxLength={80}
                style={{
                  width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${subjectError ? '#f08070' : paper.border}`,
                  outline: 'none', color: paper.text, fontFamily, fontSize: 'clamp(16px,2vw,20px)',
                  fontStyle: 'italic', padding: '4px 0 8px', marginBottom: '22px', letterSpacing: '0.02em',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
              />
              {subjectError && <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', color: '#f08070', letterSpacing: '0.2em', marginTop: '-16px', marginBottom: '14px' }}>A subject is needed</p>}

              {/* salutation */}
              {driftType === 'letter' && (
                <p style={{ fontFamily, fontSize: '15px', fontStyle: 'italic', color: paper.subtext, marginBottom: '12px', lineHeight: 1.8 }}>Dear Stranger,</p>
              )}
              {driftType === 'poem' && (
                <p style={{ fontFamily, fontSize: '11px', letterSpacing: '0.3em', color: paper.subtext, marginBottom: '14px', textTransform: 'uppercase', opacity: 0.6 }}>✦ a poem</p>
              )}
              {driftType === 'journal' && (
                <p style={{ fontFamily, fontSize: '11px', letterSpacing: '0.3em', color: paper.subtext, marginBottom: '14px', textTransform: 'uppercase', opacity: 0.6 }}>✦ a journal entry</p>
              )}

              {/* body */}
              {selectedHandwriting === 'handwritten' ? (
                <HandwritingCanvas ref={driftCanvasRef} inkColor={inkColor} lineWidth={2} />
              ) : (
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  onKeyDown={handleTypingKey}
                  placeholder={driftType === 'letter' ? 'Your letter begins here...' : driftType === 'poem' ? 'Let it pour out...' : 'Write freely...'}
                  maxLength={6000}
                  style={{
                    ...writeStyle,
                    width: '100%', minHeight: '220px', background: 'transparent', border: 'none', outline: 'none',
                    color: inkColor, fontFamily, fontSize: 'clamp(14px,1.8vw,16px)', lineHeight: 2,
                    resize: 'none', letterSpacing: '0.01em', caretColor: paper.accent,
                    boxSizing: 'border-box',
                  }}
                />
              )}

              {/* sign-off */}
              {driftType === 'letter' && (
                <p style={{ fontFamily, fontSize: '15px', fontStyle: 'italic', color: paper.subtext, marginTop: '10px', lineHeight: 1.8 }}>
                  Released into the drift,<br />
                  <span style={{ color: paper.accent }}>{isAnonymous ? 'A Stranger' : (senderName || 'A Stranger')}</span>
                </p>
              )}
              {driftType === 'poem' && (
                <p style={{ fontFamily, fontSize: '15px', fontStyle: 'italic', color: paper.subtext, marginTop: '10px', lineHeight: 1.8 }}>
                  — <span style={{ color: paper.accent }}>{isAnonymous ? 'A Stranger' : (senderName || 'A Stranger')}</span>
                </p>
              )}
              {driftType === 'journal' && (
                <p style={{ fontFamily, fontSize: '15px', fontStyle: 'italic', color: paper.subtext, marginTop: '10px', lineHeight: 1.8 }}>
                  — <span style={{ color: paper.accent }}>{isAnonymous ? 'A Stranger' : (senderName || 'A Stranger')}</span>
                </p>
              )}

              <div style={{ height: '1px', background: paper.border, margin: '20px 0' }} />

              {/* send */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setIsAnonymous(a => !a)}
                  style={{ background: isAnonymous ? `${paper.accent}18` : 'transparent', border: `1px solid ${isAnonymous ? paper.accent : paper.border}`, color: isAnonymous ? paper.accent : paper.subtext, fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', padding: '8px 16px', cursor: 'pointer', borderRadius: '2px', transition: 'all 0.2s' }}>
                  👁 {isAnonymous ? 'Anonymous · On' : 'Send Anonymously'}
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSend}
                  disabled={selectedHandwriting === 'typed' ? !body.trim() : false}
                  style={{
                    background: 'transparent', border: `1px solid ${(selectedHandwriting === 'typed' ? body.trim() : true) ? paper.accent : paper.border}`,
                    color: (selectedHandwriting === 'typed' ? body.trim() : true) ? paper.accent : paper.subtext, fontFamily: "'Cinzel', serif",
                    fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase',
                    padding: '12px 28px', cursor: body.trim() ? 'pointer' : 'default', borderRadius: '2px',
                    transition: 'all 0.2s',
                  }}>
                  Release into the Drift ✦
                </motion.button>
              </div>
            </DriftPaperBg>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── WAX SEAL animation ── */}
        {waxing && (
          <motion.div key="waxing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 35% 28% at 50% 50%, rgba(255,120,88,0.08) 0%, transparent 68%)' }} />
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, rotate: [0, -6, 4, 0] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'radial-gradient(circle, #b62e36, #6a0f0f)', boxShadow: '0 0 40px rgba(160,30,30,0.7)' }}
            />
            {[...Array(12)].map((_, index) => (
              <motion.span key={index} initial={{ opacity: 0.9, scale: 0.4, x: 0, y: 0 }} animate={{ opacity: 0, scale: 1.1, x: (index - 6) * 16, y: ((index % 4) - 1.5) * 18 - 12 }} transition={{ duration: 0.66, ease: 'easeOut' }} style={{ position: 'absolute', left: '50%', top: '50%', width: '8px', height: '8px', background: 'rgba(214,112,122,0.82)', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
            ))}
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
              style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '16px', color: 'rgba(255,200,180,0.85)', marginTop: '32px', letterSpacing: '0.04em' }}>
              Sealing your letter…
            </motion.p>
          </motion.div>
        )}

        {/* ── SENDING animation ── */}
        {sending && !sent && (
          <motion.div key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 44% 34% at 50% 50%, rgba(255,126,84,0.06) 0%, transparent 70%)' }} />
            <motion.div
              animate={{ y: [0, -80, -210], x: [0, 36, 122], opacity: [1, 1, 0], rotate: [0, -8, -20], scale: [1, 1.04, 0.98] }}
              transition={{ duration: 1.8, ease: 'easeIn' }}
              style={{ fontSize: '48px' }}>✉</motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '17px', color: 'rgba(255,255,255,0.6)', marginTop: '28px' }}>
              Drifting into the drift…
            </motion.p>
          </motion.div>
        )}

        {/* ── SENT confirmation ── */}
        {sent && (
          <motion.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2, gap: '16px' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.45em', color: '#e6c76e', textTransform: 'uppercase' }}>Released</p>
            <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '22px', color: 'rgba(255,255,255,0.75)', maxWidth: '360px', textAlign: 'center', lineHeight: 1.6 }}>
              Your letter is adrift among the stars.<br />Some stranger will find it.
            </p>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
              style={{ marginTop: '20px', background: 'none', border: '1px solid rgba(230,199,110,0.35)', color: '#e6c76e', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em', padding: '10px 24px', cursor: 'pointer', textTransform: 'uppercase' }}>
              Return to the Drift
            </motion.button>
          </motion.div>
        )}

        {/* ── PAPER picker ── */}
        {tab === 'paper' && (
          <motion.div key="paper-pick" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ position: 'relative', zIndex: 2, maxWidth: '680px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px', padding: '22px 18px', borderRadius: '22px', background: 'linear-gradient(180deg, rgba(18,12,34,0.8), rgba(10,8,20,0.66))', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '5px' }}>Choose Your Letter</p>
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Each carries its own atmosphere</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: '12px', marginBottom: '28px' }}>
              {DRIFT_PAPERS.map(p => {
                const sel = selectedPaper.id === p.id
                return (
                  <motion.div key={p.id} whileTap={{ scale: 0.97 }} onClick={() => { setSelectedPaper(p); setTab('write') }}
                    style={{ cursor: 'pointer' }}>
                    <div style={{ height: '96px', background: p.bg, borderRadius: '3px', border: sel ? `2px solid ${p.accent}` : `1px solid ${p.border}`, boxShadow: sel ? `0 0 18px ${p.accent}55` : '0 4px 16px rgba(0,0,0,0.5)', marginBottom: '8px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {sel && <div style={{ position: 'absolute', top: '7px', right: '7px', width: '18px', height: '18px', borderRadius: '50%', background: p.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#000', fontWeight: 'bold' }}>✓</div>}
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.2em', color: p.subtext, textTransform: 'uppercase' }}>preview</span>
                    </div>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.18em', color: sel ? '#e6c76e' : 'rgba(255,255,255,0.82)', textTransform: 'uppercase', textAlign: 'center' }}>{p.label}</p>
                    <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '10px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: '2px' }}>{p.sublabel}</p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── FONT picker ── */}
        {tab === 'font' && (
          <motion.div key="font-pick" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ position: 'relative', zIndex: 2, maxWidth: '560px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px', padding: '22px 18px', borderRadius: '22px', background: 'linear-gradient(180deg, rgba(18,12,34,0.8), rgba(10,8,20,0.66))', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '5px' }}>Choose Your Hand</p>
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>The voice your words carry</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
              {DRIFT_FONTS.map(f => {
                const sel = selectedFont.id === f.id
                return (
                  <motion.div key={f.id} whileTap={{ scale: 0.99 }} onClick={() => { setSelectedFont(f); setTab('write') }}
                    style={{ padding: '12px 18px', background: sel ? 'rgba(230,199,110,0.1)' : 'rgba(255,255,255,0.03)', border: sel ? '1px solid rgba(230,199,110,0.45)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: sel ? '#e6c76e' : 'rgba(255,255,255,0.75)', textTransform: 'uppercase', minWidth: '100px' }}>{f.label}</span>
                    <span style={{ fontFamily: f.family, fontSize: '17px', color: sel ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.76)', flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{f.preview}</span>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── INK picker ── */}
        {tab === 'ink' && (
          <motion.div key="ink-pick" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ position: 'relative', zIndex: 2, maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px', padding: '22px 18px', borderRadius: '22px', background: 'linear-gradient(180deg, rgba(18,12,34,0.8), rgba(10,8,20,0.66))', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '5px' }}>Choose Your Ink</p>
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>The colour of your words in the dark</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              {DRIFT_INKS.map(ink => {
                const sel = selectedInk.id === ink.id
                return (
                  <motion.div key={ink.id} whileTap={{ scale: 0.97 }} onClick={() => { setSelectedInk(ink); setTab('write') }}
                    style={{ padding: '14px 16px', background: sel ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', border: sel ? `2px solid ${ink.color}` : '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: sel ? `0 0 16px ${ink.color.replace('0.9', '0.25').replace('0.95', '0.25').replace('0.88', '0.25')}` : 'none' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: ink.color, flexShrink: 0, boxShadow: `0 0 8px ${ink.color}` }} />
                    <div>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: sel ? ink.color : 'rgba(255,255,255,0.82)', textTransform: 'uppercase', margin: 0 }}>{ink.label}</p>
                      <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '10px', color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>{ink.desc}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── Letter reading modal ── */}
      <AnimatePresence>
        {open && (
          <OpenLetterModal
            key={open.id}
            open={open}
            onClose={() => setOpen(null)}
            onBlocked={() => {
              setOpen(null)
              setLetters(prev => prev.filter(l => l.senderId !== open.senderId))
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
