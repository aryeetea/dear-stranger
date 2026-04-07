'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getDriftLetters, sendLetter } from '../lib/auth'
import { playLetterSend, playTypingSound, playWaxSeal } from '../../lib/sounds'

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
}

type DriftView = 'read' | 'write' | 'paper' | 'font' | 'ink'

// ─── Paper background renderer ────────────────────────────────────────────────
function DriftPaperBg({ paperId, children }: { paperId: string; children: React.ReactNode }) {
  const p = DRIFT_PAPERS.find(d => d.id === paperId) ?? DRIFT_PAPERS[0]
  return (
    <div style={{
      background: p.bg,
      border: `1px solid ${p.border}`,
      borderRadius: '3px',
      padding: 'clamp(28px,4vw,52px)',
      boxShadow: `0 0 60px rgba(0,0,0,0.7), inset 0 0 40px rgba(0,0,0,0.12)`,
      position: 'relative',
    }}>
      {children}
    </div>
  )
}

export default function DriftStream({ onClose, senderName }: { onClose?: () => void; senderName?: string }) {
  const [tab, setTab] = useState<DriftView>('read')
  const [letters, setLetters] = useState<DriftLetter[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<DriftLetter | null>(null)

  // write state
  const [selectedPaper, setSelectedPaper] = useState(DRIFT_PAPERS[0])
  const [selectedFont, setSelectedFont] = useState(DRIFT_FONTS[0])
  const [selectedInk, setSelectedInk] = useState(DRIFT_INKS[0])
  const [driftType, setDriftType] = useState<'letter' | 'poem' | 'journal'>('letter')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [subjectError, setSubjectError] = useState(false)
  const [sending, setSending] = useState(false)
  const [waxing, setWaxing] = useState(false)
  const [sent, setSent] = useState(false)
  const lastTypeSoundRef = useRef<number>(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    getDriftLetters().then((data) => {
      setLetters(data as DriftLetter[])
      setLoading(false)
    })
  }, [])

  const paper = selectedPaper
  const fontFamily = selectedFont.family
  const inkColor = selectedInk.color

  function handleTypingKey() {
    const now = Date.now()
    if (now - lastTypeSoundRef.current > 60) {
      playTypingSound()
      lastTypeSoundRef.current = now
    }
  }

  async function handleSend() {
    if (!body.trim()) return
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
      await sendLetter(
        null,
        body,
        selectedPaper.id,
        true,
        subject,
        selectedFont.id,
        selectedInk.id,
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
        background: 'rgba(0,0,5,0.97)',
        backdropFilter: 'blur(20px)',
        zIndex: 70,
        overflowY: tab === 'read' ? 'hidden' : 'auto',
        padding: tab === 'read' ? '0' : 'clamp(72px,9vh,100px) clamp(16px,5vw,48px) 80px',
      }}
    >
      {/* stars */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 55% 45% at 50% 30%, rgba(15,10,60,0.32) 0%, transparent 65%)' }} />
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
            {loading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.38em', color: 'rgba(230,199,110,0.42)', textTransform: 'uppercase' }}>Listening to the void…</p>
              </div>
            )}

            {!loading && letters.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '18px', color: 'rgba(255,255,255,0.35)' }}>The universe is quiet right now.</p>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.2)' }}>Be the first to release a letter into the open.</p>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setTab('write')}
                  style={{ marginTop: '16px', background: 'none', border: '1px solid rgba(230,199,110,0.35)', color: '#e6c76e', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em', padding: '10px 24px', cursor: 'pointer', textTransform: 'uppercase' }}>
                  Write & Release
                </motion.button>
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
                      animate={{ opacity: 1, x: kfX, y: kfY }}
                      transition={{
                        opacity: { duration: 0.8, delay: i * 0.12 },
                        x: { duration, repeat: Infinity, ease: 'linear', times },
                        y: { duration, repeat: Infinity, ease: 'linear', times },
                      }}
                      onClick={() => setOpen(letter)}
                      title={letter.subject}
                      style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        width: 'clamp(72px, 8vw, 100px)',
                        marginLeft: 'calc(-1 * clamp(36px, 4vw, 50px))',
                        marginTop: 'calc(-1 * clamp(25px, 2.7vw, 34px))',
                        zIndex: 10 + i,
                      }}
                    >
                      {/* envelope body */}
                      <div style={{
                        width: '100%',
                        paddingBottom: '68%',
                        background: env.bg,
                        border: `1px solid ${env.border}`,
                        borderRadius: '2px',
                        position: 'relative',
                        boxShadow: `0 8px 28px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)`,
                        transition: 'box-shadow 0.2s, transform 0.2s',
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px rgba(0,0,0,0.8), 0 0 24px ${env.border}`; (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.08)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 28px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)`; (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)' }}
                      >
                        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 100 68" preserveAspectRatio="none">
                          <polygon points="0,0 100,0 50,38" fill={env.flap} opacity="0.9" />
                          <polygon points="0,0 50,38 0,68" fill="rgba(0,0,0,0.12)" />
                          <polygon points="100,0 50,38 100,68" fill="rgba(0,0,0,0.08)" />
                        </svg>
                        <div style={{ position: 'absolute', bottom: '20%', left: '50%', transform: 'translateX(-50%)', width: '10px', height: '10px', borderRadius: '50%', background: env.border, boxShadow: `0 0 6px ${env.border}` }} />
                      </div>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.18em', color: env.label, textTransform: 'uppercase', textAlign: 'center', marginTop: '6px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {letter.subject}
                      </p>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* hint */}
            {!loading && letters.length > 0 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.22)', textAlign: 'center', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                Click an envelope to read its letter
              </motion.p>
            )}
          </motion.div>
        )}

        {/* ── WRITE ── */}
        {tab === 'write' && !waxing && !sending && !sent && (
          <motion.div key="write" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ position: 'relative', zIndex: 2, maxWidth: '680px', margin: '0 auto' }}>
            {/* paper preview area */}
            <DriftPaperBg paperId={paper.id}>
              {/* type selector */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
                {(['letter', 'poem', 'journal'] as const).map(t => (
                  <button key={t} onClick={() => setDriftType(t)}
                    style={{
                      background: driftType === t ? `rgba(255,255,255,0.1)` : 'transparent',
                      border: `1px solid ${driftType === t ? paper.accent : paper.border}`,
                      color: driftType === t ? paper.accent : paper.subtext,
                      fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.22em',
                      textTransform: 'uppercase', padding: '5px 14px', cursor: 'pointer',
                      borderRadius: '2px', transition: 'all 0.15s',
                    }}>
                    {t === 'letter' ? 'Written Word' : t === 'poem' ? 'Poem' : 'Journal'}
                  </button>
                ))}
              </div>

              {/* toolbar */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {[
                  { key: 'paper', label: paper.label, icon: '⬛', onClick: () => setTab('paper') },
                  { key: 'font',  label: selectedFont.label, icon: 'A', onClick: () => setTab('font') },
                  { key: 'ink',   label: selectedInk.label, icon: '✒', onClick: () => setTab('ink') },
                ].map(btn => (
                  <button key={btn.key} onClick={btn.onClick}
                    style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${paper.border}`, color: paper.subtext, fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '5px 12px', cursor: 'pointer', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '5px', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}>
                    <span>{btn.icon}</span>{btn.label}
                  </button>
                ))}
              </div>

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
              <textarea
                ref={textareaRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={handleTypingKey}
                placeholder={driftType === 'letter' ? 'Your letter begins here...' : driftType === 'poem' ? 'Let it pour out...' : 'Write freely...'}
                maxLength={6000}
                style={{
                  width: '100%', minHeight: '220px', background: 'transparent', border: 'none', outline: 'none',
                  color: inkColor, fontFamily, fontSize: 'clamp(14px,1.8vw,16px)', lineHeight: 2,
                  resize: 'none', letterSpacing: '0.01em', caretColor: paper.accent,
                  boxSizing: 'border-box',
                }}
              />

              {/* sign-off */}
              {driftType === 'letter' && (
                <p style={{ fontFamily, fontSize: '15px', fontStyle: 'italic', color: paper.subtext, marginTop: '10px', lineHeight: 1.8 }}>
                  Released into the drift,<br />
                  <span style={{ color: paper.accent }}>{senderName || 'A Stranger'}</span>
                </p>
              )}
              {driftType === 'poem' && (
                <p style={{ fontFamily, fontSize: '15px', fontStyle: 'italic', color: paper.subtext, marginTop: '10px', lineHeight: 1.8 }}>
                  — <span style={{ color: paper.accent }}>{senderName || 'A Stranger'}</span>
                </p>
              )}
              {driftType === 'journal' && (
                <p style={{ fontFamily, fontSize: '15px', fontStyle: 'italic', color: paper.subtext, marginTop: '10px', lineHeight: 1.8 }}>
                  — <span style={{ color: paper.accent }}>{senderName || 'A Stranger'}</span>
                </p>
              )}

              <div style={{ height: '1px', background: paper.border, margin: '20px 0' }} />

              {/* send */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSend}
                  disabled={!body.trim()}
                  style={{
                    background: 'transparent', border: `1px solid ${body.trim() ? paper.accent : paper.border}`,
                    color: body.trim() ? paper.accent : paper.subtext, fontFamily: "'Cinzel', serif",
                    fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase',
                    padding: '12px 28px', cursor: body.trim() ? 'pointer' : 'default', borderRadius: '2px',
                    transition: 'all 0.2s',
                  }}>
                  Release into the Drift ✦
                </motion.button>
              </div>
            </DriftPaperBg>
          </motion.div>
        )}

        {/* ── WAX SEAL animation ── */}
        {waxing && (
          <motion.div key="waxing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'radial-gradient(circle, #8b1a1a, #6a0f0f)', boxShadow: '0 0 40px rgba(160,30,30,0.7)' }}
            />
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
            <motion.div
              animate={{ y: [0, -120, -300], x: [0, 60, 200], opacity: [1, 1, 0], rotate: [0, -8, -20] }}
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
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
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
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', backdropFilter: 'blur(8px)' }}
            onClick={() => setOpen(null)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '580px', width: '100%', maxHeight: '84vh', overflowY: 'auto', position: 'relative' }}
            >
              {(() => {
                const p = DRIFT_PAPERS.find(d => d.id === open.paperId) ?? DRIFT_PAPERS[0]
                const f = DRIFT_FONTS.find(d => d.id === open.fontId) ?? DRIFT_FONTS[0]
                const inkEntry = DRIFT_INKS.find(d => d.id === open.fontColor)
                const resolvedInk = inkEntry ? inkEntry.color : p.text
                return (
                  <div style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: '3px', padding: 'clamp(28px,4vw,52px)', boxShadow: `0 40px 120px rgba(0,0,0,0.92), 0 0 60px rgba(0,0,0,0.4)`, position: 'relative' }}>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.42em', color: p.subtext, textAlign: 'center', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Released to the universe
                    </p>
                    <p style={{ fontFamily: f.family, fontStyle: 'italic', fontSize: 'clamp(20px,3.2vw,28px)', color: p.text, marginBottom: '4px', lineHeight: 1.2 }}>
                      {open.subject}
                    </p>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: p.subtext, textTransform: 'uppercase', marginBottom: '28px' }}>
                      from {open.senderName}
                    </p>
                    <div style={{ height: '1px', background: p.border, marginBottom: '24px' }} />
                    <p style={{ fontFamily: f.family, fontSize: 'clamp(14px,1.8vw,16px)', color: resolvedInk, lineHeight: 2.0, whiteSpace: 'pre-wrap', margin: 0 }}>
                      {open.body}
                    </p>
                    <button onClick={() => setOpen(null)}
                      style={{ position: 'absolute', top: '14px', right: '16px', background: 'none', border: 'none', fontSize: '20px', color: p.subtext, cursor: 'pointer' }}>
                      ×
                    </button>
                  </div>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
