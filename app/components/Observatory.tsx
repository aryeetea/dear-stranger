'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getMyLetters, archiveLetter, deleteLetter } from '../lib/auth'
import { playAudioWithEffect, type VoiceEffect } from '../../lib/audioEffects'
import { playWaxSeal } from '../../lib/sounds'
import { PAPER_TONES, PAPER_INK, renderLetterPaper } from '../lib/letterPapers'
import { getHandwritingStyleStyles, renderLetterEmbellishment, type HandwritingStyle, type EmbellishmentId } from '../lib/letterEnrichments'

// ── Static stars — no Math.random in render ──
const OBS_STARS = Array.from({ length: 30 }, (_, i) => ({
  width: `${(i % 4) * 0.35 + 0.3}px`,
  left: `${((i * 43 + 17) % 100)}%`,
  top: `${((i * 67 + 11) % 100)}%`,
  opacity: (i % 6) * 0.05 + 0.05,
}))

// Minimal font map so we can render the sender's chosen font without importing Scribe
const FONT_FAMILIES: Record<string, string> = {
  'cormorant': "'Cormorant Garamond', serif",
  'im-fell': "'IM Fell English', serif",
  'georgia': 'Georgia, serif',
  'times': "'Times New Roman', Times, serif",
  'playfair': "'Playfair Display', serif",
  'dancing': "'Dancing Script', cursive",
  'parisienne': "'Parisienne', cursive",
  'allura': "'Allura', cursive",
  'sacramento': "'Sacramento', cursive",
  'style-script': "'Style Script', cursive",
  'satisfy': "'Satisfy', cursive",
  'pacifico': "'Pacifico', cursive",
  'special-elite': "'Special Elite', cursive",
  'bellefair': "'Bellefair', serif",
  'baskervville': "'Baskervville', serif",
  'marcellus': "'Marcellus', serif",
  'courier': "'Courier Prime', monospace",
  'indie': "'Indie Flower', cursive",
  'roboto-slab': "'Roboto Slab', serif",
  'lora': "'Lora', serif",
  'quicksand': "'Quicksand', sans-serif",
  'source-sans': "'Source Sans 3', sans-serif",
  'cinzel': "'Cinzel', serif",
  'roboto': "'Roboto', sans-serif",
  'lato': "'Lato', sans-serif",
}

const FONT_COLOR_MAP: Record<string, string> = {
  'iron-gall': '#1a0e04', 'prussian': '#0c2040', 'forest': '#0c2410',
  'burgundy': '#380614', 'amethyst': '#260c38', 'sepia': '#4a2a08',
  'midnight': '#08081c', 'jade': '#0a2820', 'crimson': '#420808',
  'slate': '#161620', 'teak': '#3a1c06', 'navy': '#060a28',
}

interface Letter {
  id: string
  from?: string
  to?: string
  preview: string
  body: string
  paperId: string
  fontId?: string
  fontColor?: string
  paperColor?: string
  stampId?: string
  envelopeId?: string
  sentAt: string
  arrivedAt?: string
  status: 'transit' | 'arrived' | 'archive'
  travelProgress?: number
  direction: 'sent' | 'received'
  isUniverseLetter?: boolean
  burnAfterReading?: boolean
  voiceNoteUrl?: string
  voiceEffect?: VoiceEffect
  handwritingStyle?: HandwritingStyle
  embellishmentId?: EmbellishmentId
}

type LetterRow = {
  id: string
  sender_id?: string | null
  sender?: { hub_name?: string | null } | null
  recipient?: { hub_name?: string | null } | null
  subject?: string | null
  body?: string | null
  paper_id?: string | null
  font_id?: string | null
  font_color?: string | null
  paper_color?: string | null
  stamp_id?: string | null
  envelope_id?: string | null
  created_at?: string | null
  arrives_at?: string | null
  status?: string | null
  is_universe_letter?: boolean | null
  burn_after_reading?: boolean | null
  voice_note_url?: string | null
  voice_effect?: string | null
  handwriting_style?: string | null
  embellishment_id?: string | null
}

const PAPER_COLORS: Record<string, { accent: string; bg: string }> = {
  ornate: { accent: '#e6c76e', bg: 'rgba(230,199,110,0.1)' },
  floral: { accent: '#e8a0c0', bg: 'rgba(220,150,180,0.1)' },
  notepad: { accent: '#8ab4e8', bg: 'rgba(100,160,220,0.1)' },
  scrapbook: { accent: '#c8a060', bg: 'rgba(200,150,80,0.1)' },
  ribbon: { accent: '#e87070', bg: 'rgba(220,80,80,0.1)' },
  postage: { accent: '#a080c8', bg: 'rgba(140,100,180,0.1)' },
  sakura: { accent: '#f0a0c0', bg: 'rgba(240,150,190,0.1)' },
  aged: { accent: '#b89050', bg: 'rgba(180,130,60,0.1)' },
  watercolor: { accent: '#a090d0', bg: 'rgba(160,140,200,0.1)' },
  graph: { accent: '#6090c8', bg: 'rgba(80,120,200,0.1)' },
  blueprint: { accent: '#80c0ff', bg: 'rgba(80,140,220,0.12)' },
  'midnight-scroll': { accent: '#b090e0', bg: 'rgba(140,100,220,0.12)' },
  'rice-paper': { accent: '#b09060', bg: 'rgba(160,130,80,0.1)' },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function daysBetween(now: Date, then: Date) {
  return Math.round((now.getTime() - then.getTime()) / 86400000)
}

function getAnniversaryLabel(dateString: string) {
  const now = new Date()
  const then = new Date(dateString)
  const diffDays = daysBetween(now, then)
  if (diffDays < 27) return null
  if (diffDays >= 27 && diffDays <= 33) return 'One month ago'
  if (diffDays >= 87 && diffDays <= 95) return 'Three months ago'
  if (diffDays >= 178 && diffDays <= 188) return 'Six months ago'

  const yearDiff = now.getFullYear() - then.getFullYear()
  const sameSeasonWindow = Math.abs(now.getMonth() - then.getMonth()) <= 1 && Math.abs(now.getDate() - then.getDate()) <= 7
  if (yearDiff === 1 && sameSeasonWindow) return 'One year ago'
  if (yearDiff > 1 && sameSeasonWindow) return `${yearDiff} years ago`
  return null
}

function formatObservatoryDate(dateString?: string) {
  if (!dateString) return 'Awaiting a timestamp'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Observatory({
  onClose,
  onWriteLetter,
}: {
  onClose?: () => void
  onWriteLetter?: (name: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'transit' | 'arrived' | 'archive'>('arrived')
  const [openLetter, setOpenLetter] = useState<Letter | null>(null)
  const [letters, setLetters] = useState<{
    transit: Letter[]
    arrived: Letter[]
    archive: Letter[]
  }>({ transit: [], arrived: [], archive: [] })
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    async function loadLetters() {
      try {
        setLoading(true)
        const data = await getMyLetters()

        const mapSentLetter = (l: LetterRow): Letter => {
          const createdAt = l.created_at || new Date().toISOString()
          const createdMs = new Date(createdAt).getTime()
          const arrivesMs = l.arrives_at ? new Date(l.arrives_at).getTime() : createdMs
          const nowMs = Date.now()
          const totalMs = arrivesMs - createdMs
          const rawProgress = totalMs > 0 ? ((nowMs - createdMs) / totalMs) * 100 : 100
          const status: Letter['status'] = l.status === 'transit' || l.status === 'archive' || l.status === 'arrived' ? l.status : 'arrived'
          return {
            id: l.id,
            from: l.sender?.hub_name || 'You',
            to: l.recipient?.hub_name || (l.is_universe_letter ? 'The Universe' : 'Unknown Recipient'),
            preview: l.subject || 'A letter for you',
            body: l.body || '',
            paperId: l.paper_id || 'ornate',
            fontId: l.font_id || undefined,
            fontColor: l.font_color || undefined,
            paperColor: l.paper_color || undefined,
            stampId: l.stamp_id || undefined,
            envelopeId: l.envelope_id || undefined,
            sentAt: createdAt,
            arrivedAt: l.arrives_at || undefined,
            status,
            direction: 'sent',
            travelProgress: status === 'transit' ? clamp(Math.floor(rawProgress), 0, 100) : undefined,
            isUniverseLetter: l.is_universe_letter ?? false,
            burnAfterReading: l.burn_after_reading ?? false,
            voiceNoteUrl: l.voice_note_url || undefined,
            voiceEffect: (l.voice_effect as VoiceEffect | null) || undefined,
            handwritingStyle: (l.handwriting_style as HandwritingStyle | null) || 'typed',
            embellishmentId: (l.embellishment_id as EmbellishmentId | null) || 'none',
          }
        }

        const mapReceivedLetter = (l: LetterRow): Letter => {
          const createdAt = l.created_at || new Date().toISOString()
          const createdMs = new Date(createdAt).getTime()
          const arrivesMs = l.arrives_at ? new Date(l.arrives_at).getTime() : createdMs
          const nowMs = Date.now()
          const totalMs = arrivesMs - createdMs
          const rawProgress = totalMs > 0 ? ((nowMs - createdMs) / totalMs) * 100 : 100
          // Client-side: if arrives_at has passed, treat as arrived even if DB hasn't updated yet
          const baseStatus: Letter['status'] = l.status === 'transit' || l.status === 'archive' || l.status === 'arrived' ? l.status : 'arrived'
          const effectiveStatus = (baseStatus === 'transit' && l.arrives_at && nowMs >= arrivesMs) ? 'arrived' : baseStatus
          return {
            id: l.id,
            from: l.sender?.hub_name || 'Unknown Sender',
            to: l.recipient?.hub_name || 'You',
            preview: l.subject || 'A letter for you',
            body: l.body || '',
            paperId: l.paper_id || 'ornate',
            fontId: l.font_id || undefined,
            fontColor: l.font_color || undefined,
            paperColor: l.paper_color || undefined,
            stampId: l.stamp_id || undefined,
            envelopeId: l.envelope_id || undefined,
            sentAt: createdAt,
            arrivedAt: l.arrives_at || undefined,
            status: effectiveStatus,
            direction: 'received',
            travelProgress: effectiveStatus === 'transit' ? clamp(Math.floor(rawProgress), 0, 100) : undefined,
            isUniverseLetter: l.is_universe_letter ?? false,
            burnAfterReading: l.burn_after_reading ?? false,
            voiceNoteUrl: l.voice_note_url || undefined,
            voiceEffect: (l.voice_effect as VoiceEffect | null) || undefined,
            handwritingStyle: (l.handwriting_style as HandwritingStyle | null) || 'typed',
            embellishmentId: (l.embellishment_id as EmbellishmentId | null) || 'none',
          }
        }

        const userId = data.userId
        const mapLetter = (l: LetterRow): Letter =>
          l.sender_id === userId ? mapSentLetter(l) : mapReceivedLetter(l)

        const allMapped = [
          ...(data.transit || []).map(mapLetter),
          ...(data.arrived || []).map(mapLetter),
          ...(data.archive || []).map(mapLetter),
        ]
        setLetters({
          transit: allMapped.filter(l => l.status === 'transit'),
          arrived: allMapped.filter(l => l.status === 'arrived'),
          archive: allMapped.filter(l => l.status === 'archive'),
        })
      } catch (err) {
        console.error('Failed to load letters:', err)
        setLetters({ transit: [], arrived: [], archive: [] })
      } finally {
        setLoading(false)
      }
    }
    loadLetters()
  }, [])

  const transit = letters.transit
  const arrived = letters.arrived
  const archive = letters.archive
  const totalLetters = transit.length + arrived.length + archive.length
  const newlyArrivedCount = arrived.filter(letter => (currentTime - new Date(letter.arrivedAt || letter.sentAt).getTime()) < 48 * 3600000).length
  const anniversaryLetters = [...arrived, ...archive]
    .map(letter => ({ letter, label: getAnniversaryLabel(letter.arrivedAt || letter.sentAt) }))
    .filter((entry): entry is { letter: Letter; label: string } => !!entry.label)
    .sort((a, b) => new Date(b.letter.arrivedAt || b.letter.sentAt).getTime() - new Date(a.letter.arrivedAt || a.letter.sentAt).getTime())
    .slice(0, 4)

  async function handleArchive(letter: Letter) {
    await archiveLetter(letter.id)
    setOpenLetter(null)
    setLetters(prev => ({
      ...prev,
      arrived: prev.arrived.filter(l => l.id !== letter.id),
      archive: [{ ...letter, status: 'archive' as const }, ...prev.archive],
    }))
  }

  async function handleBurnAndClose(letter: Letter) {
    setOpenLetter(null)
    setLetters(prev => ({
      ...prev,
      arrived: prev.arrived.filter(l => l.id !== letter.id),
      archive: prev.archive.filter(l => l.id !== letter.id),
    }))
    try { await deleteLetter(letter.id) } catch (err) { console.error('Failed to delete burn letter:', err) }
  }

  const tabs = [
    { id: 'transit' as const, label: 'In Transit', count: transit.length },
    { id: 'arrived' as const, label: 'Arrived', count: arrived.length },
    { id: 'archive' as const, label: 'Archive', count: archive.length },
  ]

  const currentLetters =
    activeTab === 'transit' ? transit : activeTab === 'arrived' ? arrived : archive

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed-scroll-panel"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(14,10,24,0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 70, overflowY: 'auto',
        padding: '80px 20px 120px',
      }}
    >
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 52% 44% at 14% 20%, rgba(255,190,214,0.18) 0%, transparent 68%), radial-gradient(ellipse 42% 40% at 84% 16%, rgba(153,220,255,0.18) 0%, transparent 72%), radial-gradient(ellipse 44% 44% at 76% 80%, rgba(255,214,170,0.12) 0%, transparent 74%), radial-gradient(ellipse 38% 30% at 40% 58%, rgba(211,173,255,0.14) 0%, transparent 70%), linear-gradient(180deg, rgba(36,22,58,0.34) 0%, rgba(16,10,28,0.84) 100%)` }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.09, mixBlendMode: 'screen', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 220'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)' opacity='0.72'/%3E%3C/svg%3E\")" }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 220px rgba(22,10,38,0.44)' }} />
      <div style={{ position: 'fixed', left: '50%', top: '42%', width: 'min(72vw, 760px)', height: 'min(72vw, 760px)', transform: 'translate(-50%, -50%)', pointerEvents: 'none', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,242,245,0.12) 0%, rgba(196,170,255,0.06) 28%, rgba(134,220,255,0.04) 46%, transparent 72%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 0 0 80px rgba(255,228,238,0.02), 0 0 0 170px rgba(170,218,255,0.014)' }} />

      {/* Static stars */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {OBS_STARS.map((star, i) => (
          <div key={i} style={{ position: 'absolute', width: star.width, height: star.width, borderRadius: '50%', background: `rgba(255,255,255,${star.opacity})`, left: star.left, top: star.top }} />
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        onClick={onClose}
        className="fixed-close-btn-top"
        style={{ position: 'fixed', top: '28px', right: '28px', background: 'none', border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.82)', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em', padding: '8px 16px', cursor: 'pointer', textTransform: 'uppercase', zIndex: 80 }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.98)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.82)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.background = 'none' }}
      >
        ← Universe
      </motion.button>

      <div style={{ maxWidth: '1180px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)', gap: '22px', alignItems: 'start' }}>
          <motion.aside initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }} style={{ position: 'sticky', top: '88px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ padding: '22px 20px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.12)', background: 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))', boxShadow: '0 28px 80px rgba(20,12,38,0.28)', backdropFilter: 'blur(16px)' }}>
              <div style={{ width: '100%', aspectRatio: '1 / 1', maxWidth: '220px', margin: '0 auto 20px', borderRadius: '50%', position: 'relative', background: 'radial-gradient(circle at 42% 38%, rgba(255,252,246,0.96), rgba(255,214,230,0.42) 26%, rgba(171,220,255,0.24) 48%, rgba(255,255,255,0.04) 66%, rgba(8,10,24,0) 74%)', boxShadow: '0 0 56px rgba(255,220,236,0.22)' }}>
                <div style={{ position: 'absolute', inset: '9%', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)' }} />
                <div style={{ position: 'absolute', inset: '22%', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.26)' }} />
                <div style={{ position: 'absolute', inset: '30%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(198,243,255,0.3), transparent 70%)' }} />
              </div>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.38em', color: 'rgba(255,234,196,0.84)', textTransform: 'uppercase', marginBottom: '10px', textAlign: 'center' }}>Moonwashed Archive</p>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(24px, 3vw, 34px)', letterSpacing: '0.22em', color: '#fff4f8', textTransform: 'uppercase', marginBottom: '10px', textAlign: 'center', textShadow: '0 8px 24px rgba(255,214,230,0.24)' }}>The Observatory</p>
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '16px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.65, textAlign: 'center' }}>
                A tower ledger for letters that are arriving, lingering, and fading into memory.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              {[
                { label: 'Total Letters', value: totalLetters, note: 'all constellations' },
                { label: 'New Arrivals', value: newlyArrivedCount, note: 'past two days' },
                { label: 'Anniversaries', value: anniversaryLetters.length, note: 'currently glowing' },
              ].map(stat => (
                <div key={stat.label} style={{ padding: '16px 16px 14px', borderRadius: '22px', background: 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.07))', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 14px 32px rgba(28,16,44,0.16)', backdropFilter: 'blur(14px)' }}>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.28em', color: 'rgba(255,234,196,0.8)', textTransform: 'uppercase', marginBottom: '10px' }}>{stat.label}</p>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '32px', color: '#fff5f8', marginBottom: '6px' }}>{stat.value}</p>
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.68)', lineHeight: 1.4 }}>{stat.note}</p>
                </div>
              ))}
            </div>

            {anniversaryLetters.length > 0 && (
              <div style={{ padding: '18px', borderRadius: '26px', background: 'linear-gradient(180deg, rgba(255,228,238,0.18), rgba(183,230,255,0.08))', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 22px 48px rgba(24,14,40,0.2)', backdropFilter: 'blur(14px)' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.34em', color: '#fff0c8', textTransform: 'uppercase', marginBottom: '6px' }}>Orbital Returns</p>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.74)', marginBottom: '12px' }}>old words flashing by again</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {anniversaryLetters.map(({ letter, label }) => (
                    <button
                      key={letter.id}
                      onClick={() => setOpenLetter(letter)}
                      style={{ textAlign: 'left', padding: '12px 12px 11px', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '16px', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.18em', color: 'rgba(255,240,206,0.92)', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</p>
                      <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.88)', lineHeight: 1.45, marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{letter.preview}</p>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.56)', textTransform: 'uppercase' }}>{letter.direction === 'received' ? `From ${letter.from}` : `To ${letter.to}`}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.aside>

          <div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
              style={{ display: 'flex', background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.07))', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px', overflow: 'hidden', marginBottom: '18px', padding: '6px', boxShadow: '0 18px 40px rgba(22,12,38,0.18)', backdropFilter: 'blur(14px)' }}>
              {tabs.map((tab, i) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{ flex: 1, padding: '15px 8px', background: activeTab === tab.id ? 'linear-gradient(180deg, rgba(255,235,246,0.24), rgba(196,230,255,0.16))' : 'transparent', border: 'none', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none', cursor: 'pointer', transition: 'background 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', borderRadius: '18px', boxShadow: activeTab === tab.id ? 'inset 0 1px 0 rgba(255,255,255,0.22), 0 10px 24px rgba(255,220,236,0.08)' : 'none' }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: activeTab === tab.id ? '#fff0c8' : 'rgba(255,255,255,0.8)', transition: 'color 0.3s' }}>
                    {tab.label}
                  </span>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', color: activeTab === tab.id ? 'rgba(255,245,221,0.92)' : 'rgba(255,255,255,0.6)', transition: 'color 0.3s' }}>
                    {tab.count} {tab.count === 1 ? 'letter' : 'letters'}
                  </span>
                </button>
              ))}
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} style={{ padding: '18px clamp(16px, 2vw, 24px) 22px', background: 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '30px', boxShadow: '0 26px 72px rgba(20,12,40,0.24), inset 0 1px 0 rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-end', marginBottom: '18px' }}>
              <div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(255,234,196,0.78)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  {activeTab === 'transit' ? 'Current Orbit' : activeTab === 'arrived' ? 'Open Constellation' : 'Silent Stacks'}
                </p>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.76)' }}>
                  {activeTab === 'transit' ? 'Letters still crossing the dark.' : activeTab === 'arrived' ? 'Recent arrivals waiting to be opened.' : 'Words preserved after their brightest glow.'}
                </p>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.12)' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.24em', color: 'rgba(255,245,220,0.84)', textTransform: 'uppercase' }}>{currentLetters.length} visible</p>
              </div>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '72px 0', borderRadius: '18px', background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '16px', color: 'rgba(255,255,255,0.75)' }}>loading letters...</p>
              </div>
            ) : currentLetters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '72px 0', borderRadius: '18px', background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '16px', color: 'rgba(255,255,255,0.75)' }}>
                  {activeTab === 'transit' && 'No letters traveling at the moment.'}
                  {activeTab === 'arrived' && 'No letters have arrived yet.'}
                  {activeTab === 'archive' && 'Your archive is empty.'}
                </p>
              </div>
            ) : (() => {
              const sentLetters = currentLetters.filter(l => l.direction === 'sent')
              const receivedLetters = currentLetters.filter(l => l.direction === 'received')
              const displayLetters = [...receivedLetters, ...sentLetters]
              const featuredLetter = displayLetters[0]
              const galleryLetters = displayLetters.slice(1)
              const isClickable = (l: Letter) => l.status !== 'transit'
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {featuredLetter && (
                    <button
                      onClick={() => isClickable(featuredLetter) && setOpenLetter(featuredLetter)}
                      style={{
                        textAlign: 'left',
                        padding: '24px',
                        borderRadius: '28px',
                        border: '1px solid rgba(255,255,255,0.14)',
                        background: 'linear-gradient(135deg, rgba(255,244,248,0.18), rgba(204,232,255,0.1) 52%, rgba(255,216,173,0.1) 100%)',
                        cursor: isClickable(featuredLetter) ? 'pointer' : 'default',
                        boxShadow: '0 22px 50px rgba(22,12,40,0.18)',
                        backdropFilter: 'blur(16px)',
                      }}>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.34em', color: 'rgba(255,241,205,0.86)', textTransform: 'uppercase', marginBottom: '10px' }}>
                        Featured {featuredLetter.direction === 'received' ? 'Arrival' : 'Dispatch'}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(180px, 0.8fr)', gap: '18px', alignItems: 'end' }}>
                        <div>
                          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '24px', lineHeight: 1.4, color: 'rgba(255,255,255,0.96)', marginBottom: '12px', textShadow: '0 8px 30px rgba(255,214,230,0.16)' }}>
                            {featuredLetter.preview}
                          </p>
                          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', lineHeight: 1.75, color: 'rgba(255,255,255,0.72)', maxWidth: '560px' }}>
                            {featuredLetter.direction === 'received' ? `From ${featuredLetter.from}` : `To ${featuredLetter.to}`} · {formatObservatoryDate(featuredLetter.arrivedAt || featuredLetter.sentAt)}
                          </p>
                        </div>
                        <div style={{ display: 'grid', gap: '10px' }}>
                          <div style={{ padding: '12px 14px', borderRadius: '18px', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.12)' }}>
                            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.2em', color: 'rgba(255,241,205,0.82)', textTransform: 'uppercase', marginBottom: '6px' }}>Status</p>
                            <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '15px', color: 'rgba(255,255,255,0.82)' }}>{featuredLetter.status === 'transit' ? 'Traveling now' : featuredLetter.status === 'archive' ? 'Archived softly' : 'Ready to open'}</p>
                          </div>
                          <div style={{ padding: '12px 14px', borderRadius: '18px', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.12)' }}>
                            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.2em', color: 'rgba(255,241,205,0.82)', textTransform: 'uppercase', marginBottom: '6px' }}>Direction</p>
                            <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '15px', color: 'rgba(255,255,255,0.82)' }}>{featuredLetter.direction === 'received' ? 'Incoming constellation' : 'Sent across the map'}</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  )}

                  {galleryLetters.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                      {galleryLetters.map((letter, i) => (
                        <LetterEntry key={letter.id} letter={letter} index={i} currentTime={currentTime}
                          onClick={() => isClickable(letter) && setOpenLetter(letter)} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {openLetter && (
          <LetterModal letter={openLetter} onClose={() => setOpenLetter(null)}
            onReply={name => { setOpenLetter(null); onWriteLetter?.(name) }}
            onArchive={() => handleArchive(openLetter)}
            onBurn={openLetter.burnAfterReading && openLetter.direction === 'received' ? () => handleBurnAndClose(openLetter) : undefined} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function LetterEntry({ letter, index, onClick, currentTime }: { letter: Letter; index: number; onClick: () => void; currentTime: number }) {
  const colors = PAPER_COLORS[letter.paperId] || PAPER_COLORS.ornate
  const isTransit = letter.status === 'transit'
  const isNewArrival = !isTransit && letter.direction === 'received' && (currentTime - new Date(letter.arrivedAt || letter.sentAt).getTime()) < 48 * 3600000
  const displayDate = formatObservatoryDate(isTransit ? letter.arrivedAt : (letter.arrivedAt || letter.sentAt))
  const statusLabel = isTransit ? 'In transit' : letter.status === 'archive' ? 'Archived' : isNewArrival ? 'New arrival' : 'Settled'

  const ageDays = (currentTime - new Date(letter.sentAt).getTime()) / 86400000
  const agePct = letter.status === 'archive' ? Math.min(Math.max((ageDays - 7) / 23, 0), 1) : 0
  const ageFilter = agePct > 0 ? `sepia(${Math.round(agePct * 55)}%) saturate(${(1 - agePct * 0.3).toFixed(2)}) brightness(${(1 - agePct * 0.08).toFixed(2)})` : undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '14px',
        minHeight: isTransit ? '220px' : '190px',
        padding: '18px',
        background: `linear-gradient(135deg, rgba(255,242,247,0.18), ${colors.bg} 42%, rgba(180,228,255,0.12) 100%)`,
        border: `1.5px solid ${isTransit ? 'rgba(255,234,198,0.34)' : 'rgba(255,255,255,0.14)'}`,
        borderRadius: '22px',
        cursor: isTransit ? 'default' : 'pointer',
        transition: 'background 0.2s, transform 0.2s, border-color 0.2s',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isTransit ? `0 16px 36px rgba(24,14,40,0.18), 0 2px 8px ${colors.accent}22` : `0 14px 34px rgba(24,14,40,0.2), 0 1px 6px rgba(255,255,255,0.06)`,
        filter: ageFilter,
        backdropFilter: 'blur(14px)',
      }}
      whileHover={!isTransit ? ({ y: -2, borderColor: 'rgba(255,240,205,0.34)' } as never) : {}}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(255,255,255,0.12), transparent 18%, transparent 82%, rgba(255,255,255,0.04))', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: '16px', top: '14px', width: '64px', height: '64px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.16), transparent 70%)', pointerEvents: 'none' }} />
      {isNewArrival && (
        <motion.div
          animate={{ opacity: [0.18, 0.42, 0.18] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, transparent 0%, rgba(255,221,234,0.06) 35%, rgba(214,244,255,0.18) 50%, rgba(255,233,191,0.06) 65%, transparent 100%)', pointerEvents: 'none' }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0, marginTop: '2px', opacity: isTransit ? 0.85 : letter.status === 'archive' ? 0.7 : 1, filter: isTransit ? 'none' : `drop-shadow(0 0 4px ${colors.accent}80)` }}>
          {isTransit ? '✦' : (letter.burnAfterReading && letter.direction === 'received') ? '🔥' : '📜'}
        </div>
        <span style={{ padding: '6px 10px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.12)', fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.18em', color: isTransit ? '#fff0c8' : 'rgba(255,255,255,0.82)', textTransform: 'uppercase' }}>
          {statusLabel}
        </span>
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ marginBottom: '10px' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.18em', color: '#fff0c8', textTransform: 'uppercase', textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}>
            {letter.direction === 'received' ? `From · ${letter.from}` : `To · ${letter.to}`}
          </p>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.62)', textTransform: 'uppercase', marginTop: '8px' }}>
            {displayDate}
          </p>
        </div>

        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '16px', color: 'rgba(255,255,255,0.92)', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}>
          {letter.preview}
        </p>

        {isTransit && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.82)', textTransform: 'uppercase', textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}>In transit</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.15em', color: 'rgba(230,199,110,0.95)', textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}>{letter.travelProgress ?? 0}%</span>
            </div>
            <div style={{ height: '52px', position: 'relative' }}>
              <svg viewBox="0 0 160 52" width="100%" height="52" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <path d="M 16 26 C 38 4, 122 4, 144 26 C 122 48, 38 48, 16 26" fill="none" stroke="rgba(230,199,110,0.22)" strokeWidth="1.1" strokeDasharray="3 4" />
                <path d="M 16 26 C 38 4, 122 4, 144 26" fill="none" stroke="rgba(230,199,110,0.12)" strokeWidth="0.8" />
                <path d="M 16 26 C 38 48, 122 48, 144 26" fill="none" stroke="rgba(230,199,110,0.08)" strokeWidth="0.8" />
                <motion.circle
                  cx={16 + ((letter.travelProgress ?? 0) / 100) * 128}
                  cy={26}
                  r="4.6"
                  animate={{ r: [4.2, 5.4, 4.2], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  fill="rgba(255,230,150,0.95)"
                />
                <motion.circle
                  cx={16 + ((letter.travelProgress ?? 0) / 100) * 128}
                  cy={26}
                  r="8.2"
                  animate={{ r: [7.4, 10.2, 7.4], opacity: [0.16, 0.28, 0.16] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  fill="rgba(230,199,110,0.45)"
                />
              </svg>
            </div>
            {letter.arrivedAt && (() => {
              const msLeft = new Date(letter.arrivedAt).getTime() - currentTime
              const hoursLeft = Math.ceil(msLeft / (1000 * 60 * 60))
              const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))
              let etaText: string
              if (hoursLeft <= 1) etaText = 'arriving very soon'
              else if (hoursLeft < 24) etaText = `~${hoursLeft}h away`
              else if (daysLeft === 1) etaText = 'arriving tomorrow'
              else etaText = `~${daysLeft} days away`
              return (
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '5px', textShadow: '0 1px 6px #fff8' }}>
                  {etaText}
                </p>
              )
            })()}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Lightweight stamp renderer for the modal — mirrors Scribe's StampSVG
function ModalStamp({ id }: { id: string }) {
  const s = 48
  if (id === 'moon-seal' || id === 'rose-seal' || id === 'emerald-seal' || id === 'sapphire-seal' || id === 'obsidian-seal' || id === 'ivory-seal' || id === 'sun-seal' || id === 'star-seal') {
    const sealColors: Record<string, [string, string]> = {
      'moon-seal':    ['#8b1a1a', '#9a2020'],
      'rose-seal':    ['#8b1a4a', '#9a2060'],
      'emerald-seal': ['#1a6b30', '#207840'],
      'sapphire-seal':['#1a3a8b', '#2040a0'],
      'obsidian-seal':['#111118', '#1a1a28'],
      'ivory-seal':   ['#9a8a60', '#b09a70'],
      'sun-seal':     ['#8b6010', '#a07018'],
      'star-seal':    ['#1a1a5a', '#22226a'],
    }
    const [bg, inner] = sealColors[id] || ['#8b1a1a', '#9a2020']
    if (id === 'sun-seal') return <svg width={s} height={s} viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill={bg}/><circle cx="30" cy="30" r="24" fill={inner}/>{[...Array(8)].map((_,i)=>{const a=(i/8)*Math.PI*2;return <line key={i} x1={30+Math.cos(a)*14} y1={30+Math.sin(a)*14} x2={30+Math.cos(a)*22} y2={30+Math.sin(a)*22} stroke="rgba(255,220,100,0.5)" strokeWidth="2" strokeLinecap="round"/>})}<circle cx="30" cy="30" r="10" fill="#c9a040"/></svg>
    if (id === 'star-seal') return <svg width={s} height={s} viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill={bg}/><circle cx="30" cy="30" r="24" fill={inner}/><polygon points="30,12 33,22 44,22 35,28 38,40 30,33 22,40 25,28 16,22 27,22" fill="rgba(200,200,255,0.7)"/></svg>
    return <svg width={s} height={s} viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill={bg}/><circle cx="30" cy="30" r="24" fill={inner}/><path d="M22 20 Q30 14 38 20 Q32 22 30 30 Q24 22 22 20Z" fill="rgba(255,220,200,0.7)"/><text x="30" y="45" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(255,200,180,0.7)" letterSpacing="1">SEALED</text></svg>
  }
  // Postmarks
  if (id === 'veilmore') return <svg width={s} height={s} viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="none" stroke="rgba(80,60,100,0.7)" strokeWidth="2"/><circle cx="40" cy="40" r="28" fill="none" stroke="rgba(80,60,100,0.3)" strokeWidth="0.8"/><text x="40" y="36" textAnchor="middle" fontSize="9" fontFamily="serif" fill="rgba(80,60,100,0.85)" letterSpacing="2" fontWeight="bold">VEILMORE</text><text x="40" y="52" textAnchor="middle" fontSize="6" fontFamily="serif" fill="rgba(80,60,100,0.5)">BEYOND THE VEIL</text></svg>
  if (id === 'ashpoint') return <svg width={s} height={s} viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="none" stroke="rgba(60,30,20,0.7)" strokeWidth="2"/><text x="40" y="36" textAnchor="middle" fontSize="9" fontFamily="serif" fill="rgba(50,25,10,0.85)" letterSpacing="2" fontWeight="bold">ASHPOINT</text><text x="40" y="52" textAnchor="middle" fontSize="7" fontFamily="serif" fill="rgba(50,25,10,0.5)">BETWEEN WORLDS</text></svg>
  if (id === 'duskhollow') return <svg width={s} height={s} viewBox="0 0 80 80"><ellipse cx="40" cy="40" rx="36" ry="28" fill="none" stroke="rgba(40,20,60,0.7)" strokeWidth="2"/><text x="40" y="36" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(40,20,60,0.85)" letterSpacing="2" fontWeight="bold">DUSKHOLLOW</text><text x="40" y="54" textAnchor="middle" fontSize="6" fontFamily="serif" fill="rgba(40,20,60,0.5)">WHERE LETTERS REST</text></svg>
  if (id === 'evermore') return <svg width={s} height={s} viewBox="0 0 80 80"><rect x="2" y="2" width="76" height="76" fill="none" stroke="rgba(60,40,20,0.7)" strokeWidth="2" rx="4"/><text x="40" y="28" textAnchor="middle" fontSize="9" fontFamily="serif" fill="rgba(50,30,10,0.8)" letterSpacing="2" fontWeight="bold">EVERMORE</text><line x1="12" y1="34" x2="68" y2="34" stroke="rgba(80,40,20,0.4)" strokeWidth="1"/><text x="40" y="48" textAnchor="middle" fontSize="7" fontFamily="serif" fill="rgba(60,30,10,0.6)">COSMIC POST</text></svg>
  if (id === 'gloomhaven') return <svg width={s} height={s} viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="none" stroke="rgba(30,20,50,0.7)" strokeWidth="2"/><text x="40" y="36" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(30,20,60,0.85)" letterSpacing="2" fontWeight="bold">GLOOMHAVEN</text><text x="40" y="52" textAnchor="middle" fontSize="7" fontFamily="serif" fill="rgba(40,20,60,0.5)">BETWEEN WORLDS</text></svg>
  if (id === 'stardrift') return <svg width={s} height={s} viewBox="0 0 80 80"><ellipse cx="40" cy="40" rx="36" ry="28" fill="none" stroke="rgba(20,30,70,0.7)" strokeWidth="2"/><text x="40" y="36" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(20,30,80,0.85)" letterSpacing="2" fontWeight="bold">STARDRIFT</text><text x="40" y="54" textAnchor="middle" fontSize="6" fontFamily="serif" fill="rgba(20,30,70,0.5)">CARRIED BY LIGHT</text></svg>
  // Illustrated
  if (id === 'compass') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(200,170,100,0.15)" stroke="rgba(120,80,20,0.6)" strokeWidth="1.5" rx="2"/><circle cx="30" cy="28" r="16" fill="none" stroke="rgba(100,60,10,0.5)" strokeWidth="1"/><line x1="30" y1="14" x2="30" y2="42" stroke="rgba(100,60,10,0.4)" strokeWidth="1"/><line x1="16" y1="28" x2="44" y2="28" stroke="rgba(100,60,10,0.4)" strokeWidth="1"/><polygon points="30,14 28,24 32,24" fill="rgba(140,20,20,0.7)"/><circle cx="30" cy="28" r="3" fill="rgba(100,60,10,0.6)"/></svg>
  if (id === 'feather') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(200,230,200,0.15)" stroke="rgba(60,100,60,0.5)" strokeWidth="1.5" rx="2"/><path d="M30 10 C 45 15 50 30 30 50 C 20 35 15 20 30 10Z" fill="rgba(100,150,100,0.3)" stroke="rgba(60,100,60,0.5)" strokeWidth="1"/><line x1="30" y1="10" x2="30" y2="50" stroke="rgba(60,100,60,0.5)" strokeWidth="1.5"/></svg>
  if (id === 'key') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(220,190,120,0.15)" stroke="rgba(120,90,20,0.6)" strokeWidth="1.5" rx="2"/><circle cx="24" cy="24" r="10" fill="none" stroke="rgba(140,100,20,0.7)" strokeWidth="2"/><line x1="31" y1="31" x2="46" y2="46" stroke="rgba(140,100,20,0.7)" strokeWidth="2.5" strokeLinecap="round"/></svg>
  if (id === 'eye') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(200,220,240,0.1)" stroke="rgba(40,60,100,0.5)" strokeWidth="1.5" rx="2"/><path d="M 10 30 Q 30 14 50 30 Q 30 46 10 30Z" fill="rgba(100,140,200,0.2)" stroke="rgba(40,80,160,0.6)" strokeWidth="1.5"/><circle cx="30" cy="30" r="8" fill="rgba(40,80,160,0.35)"/><circle cx="30" cy="30" r="4" fill="rgba(20,40,100,0.6)"/></svg>
  if (id === 'butterfly') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(220,200,240,0.12)" stroke="rgba(120,80,160,0.5)" strokeWidth="1.5" rx="2"/><path d="M30 30 Q20 18 12 22 Q8 30 20 34 Q28 36 30 30Z" fill="rgba(160,100,200,0.3)" stroke="rgba(120,80,160,0.6)" strokeWidth="1"/><path d="M30 30 Q40 18 48 22 Q52 30 40 34 Q32 36 30 30Z" fill="rgba(160,100,200,0.3)" stroke="rgba(120,80,160,0.6)" strokeWidth="1"/><path d="M30 30 Q20 38 16 46 Q22 50 28 42 Q30 36 30 30Z" fill="rgba(140,80,180,0.25)" stroke="rgba(100,60,140,0.5)" strokeWidth="1"/><path d="M30 30 Q40 38 44 46 Q38 50 32 42 Q30 36 30 30Z" fill="rgba(140,80,180,0.25)" stroke="rgba(100,60,140,0.5)" strokeWidth="1"/></svg>
  if (id === 'hourglass') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(220,200,160,0.1)" stroke="rgba(120,90,40,0.5)" strokeWidth="1.5" rx="2"/><line x1="18" y1="12" x2="42" y2="12" stroke="rgba(100,70,20,0.7)" strokeWidth="2" strokeLinecap="round"/><line x1="18" y1="48" x2="42" y2="48" stroke="rgba(100,70,20,0.7)" strokeWidth="2" strokeLinecap="round"/><path d="M18 12 L42 12 L30 30 L42 48 L18 48 L30 30 Z" fill="rgba(180,140,80,0.2)" stroke="rgba(100,70,20,0.5)" strokeWidth="1"/></svg>
  if (id === 'anchor') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(180,210,230,0.1)" stroke="rgba(40,80,120,0.5)" strokeWidth="1.5" rx="2"/><circle cx="30" cy="18" r="5" fill="none" stroke="rgba(30,70,120,0.7)" strokeWidth="1.8"/><line x1="30" y1="23" x2="30" y2="46" stroke="rgba(30,70,120,0.7)" strokeWidth="1.8" strokeLinecap="round"/><line x1="20" y1="34" x2="40" y2="34" stroke="rgba(30,70,120,0.6)" strokeWidth="1.5" strokeLinecap="round"/><path d="M20 46 Q22 52 30 50 Q38 52 40 46" fill="none" stroke="rgba(30,70,120,0.6)" strokeWidth="1.5" strokeLinecap="round"/></svg>
  if (id === 'rose') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(240,200,210,0.1)" stroke="rgba(160,60,80,0.5)" strokeWidth="1.5" rx="2"/><circle cx="30" cy="28" r="8" fill="rgba(200,80,100,0.25)" stroke="rgba(160,60,80,0.6)" strokeWidth="1"/><circle cx="30" cy="28" r="5" fill="rgba(220,100,120,0.3)"/>{[[22,22],[38,22],[20,32],[40,32],[24,40],[36,40]].map(([x,y],i)=><path key={i} d={`M${x} ${y} Q${Math.round((x+30)/2)} ${Math.round((y+28)/2+2)} 30 28`} fill="none" stroke="rgba(160,60,80,0.35)" strokeWidth="1"/>)}<line x1="28" y1="36" x2="26" y2="50" stroke="rgba(60,120,60,0.5)" strokeWidth="1.5" strokeLinecap="round"/></svg>
  // Constellations
  if (id === 'orion') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(10,10,30,0.6)" stroke="rgba(150,160,220,0.4)" strokeWidth="1.5" rx="2"/>{[[20,12],[22,22],[30,26],[38,22],[40,12],[18,36],[30,40],[42,36]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2" fill="rgba(200,210,255,0.85)"/>)}</svg>
  if (id === 'cassiopeia') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(10,10,30,0.6)" stroke="rgba(150,160,220,0.4)" strokeWidth="1.5" rx="2"/>{[[12,30],[22,20],[30,28],[38,18],[48,26]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2.5" fill="rgba(200,210,255,0.85)"/>)}<polyline points="12,30 22,20 30,28 38,18 48,26" fill="none" stroke="rgba(150,160,220,0.35)" strokeWidth="0.8"/></svg>
  if (id === 'lyra') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(10,10,30,0.6)" stroke="rgba(150,160,220,0.4)" strokeWidth="1.5" rx="2"/><circle cx="30" cy="16" r="3" fill="rgba(255,240,180,0.9)"/>{[[22,28],[38,28],[20,40],[40,40],[30,46]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="1.8" fill="rgba(200,210,255,0.8)"/>)}</svg>
  if (id === 'pleiades') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(10,10,30,0.6)" stroke="rgba(150,160,220,0.4)" strokeWidth="1.5" rx="2"/>{[[22,20],[30,18],[38,22],[26,28],[34,26],[28,34]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i<3?2.5:1.8} fill="rgba(200,210,255,0.85)"/>)}</svg>
  if (id === 'southern-cross') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(10,10,30,0.6)" stroke="rgba(150,160,220,0.4)" strokeWidth="1.5" rx="2"/>{[[30,14],[30,46],[14,30],[44,30],[40,20]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===4?1.5:2.5} fill="rgba(200,210,255,0.85)"/>)}</svg>
  // Abstract
  if (id === 'spiral') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(180,160,220,0.1)" stroke="rgba(100,80,160,0.5)" strokeWidth="1.5" rx="2"/><path d="M30 30 Q36 24 30 18 Q20 18 18 28 Q16 42 30 44 Q46 44 48 28 Q50 10 30 8 Q8 8 6 30" fill="none" stroke="rgba(100,80,160,0.6)" strokeWidth="1.5" strokeLinecap="round"/></svg>
  if (id === 'diamond') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(180,220,240,0.1)" stroke="rgba(60,120,160,0.5)" strokeWidth="1.5" rx="2"/><polygon points="30,8 52,30 30,52 8,30" fill="none" stroke="rgba(60,120,160,0.6)" strokeWidth="1.5"/></svg>
  if (id === 'wave') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(180,230,240,0.1)" stroke="rgba(40,120,160,0.5)" strokeWidth="1.5" rx="2"/>{[18,26,34,42].map((y,i)=><path key={i} d={`M8 ${y} Q18 ${y-6} 22 ${y} Q26 ${y+6} 30 ${y} Q34 ${y-6} 38 ${y} Q42 ${y+6} 46 ${y} Q50 ${y-6} 54 ${y}`} fill="none" stroke={`rgba(40,120,160,${0.3+i*0.1})`} strokeWidth="1.2" strokeLinecap="round"/>)}</svg>
  if (id === 'infinity') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(200,180,240,0.1)" stroke="rgba(100,80,160,0.5)" strokeWidth="1.5" rx="2"/><path d="M12 24 Q20 18 28 24 Q36 30 44 24 Q52 18 58 28 Q52 38 44 34 Q36 30 28 36 Q20 42 12 36 Q6 30 12 24Z" fill="rgba(100,80,160,0.15)" stroke="rgba(100,80,160,0.6)" strokeWidth="1.5"/></svg>
  if (id === 'hexagon') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(180,220,200,0.1)" stroke="rgba(40,120,100,0.5)" strokeWidth="1.5" rx="2"/><polygon points="30,10 48,20 48,40 30,50 12,40 12,20" fill="rgba(40,120,100,0.12)" stroke="rgba(40,120,100,0.65)" strokeWidth="1.5"/><polygon points="30,18 40,24 40,36 30,42 20,36 20,24" fill="rgba(40,120,100,0.1)" stroke="rgba(40,120,100,0.4)" strokeWidth="1"/></svg>
  // Cute stamps
  if (id === 'cat') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(255,220,240,0.2)" stroke="rgba(220,120,160,0.5)" strokeWidth="1.5" rx="2"/><circle cx="30" cy="32" r="16" fill="rgba(255,200,220,0.35)" stroke="rgba(220,120,160,0.5)" strokeWidth="1.5"/><polygon points="16,20 22,10 28,20" fill="rgba(255,200,220,0.6)" stroke="rgba(220,120,160,0.5)" strokeWidth="1"/><polygon points="32,20 38,10 44,20" fill="rgba(255,200,220,0.6)" stroke="rgba(220,120,160,0.5)" strokeWidth="1"/><polygon points="18,19 22,12 26,19" fill="rgba(255,150,185,0.5)"/><polygon points="34,19 38,12 42,19" fill="rgba(255,150,185,0.5)"/><ellipse cx="24" cy="30" rx="3" ry="3.5" fill="rgba(70,30,90,0.7)"/><ellipse cx="36" cy="30" rx="3" ry="3.5" fill="rgba(70,30,90,0.7)"/><circle cx="25" cy="29" r="1" fill="rgba(255,255,255,0.8)"/><circle cx="37" cy="29" r="1" fill="rgba(255,255,255,0.8)"/><polygon points="30,34 28,37 32,37" fill="rgba(255,100,140,0.7)"/><line x1="14" y1="36" x2="26" y2="37" stroke="rgba(160,80,100,0.4)" strokeWidth="0.8"/><line x1="14" y1="38" x2="26" y2="38.5" stroke="rgba(160,80,100,0.4)" strokeWidth="0.8"/><line x1="34" y1="37" x2="46" y2="36" stroke="rgba(160,80,100,0.4)" strokeWidth="0.8"/><line x1="34" y1="38.5" x2="46" y2="38" stroke="rgba(160,80,100,0.4)" strokeWidth="0.8"/></svg>
  if (id === 'heart') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(255,200,220,0.15)" stroke="rgba(220,100,140,0.5)" strokeWidth="1.5" rx="2"/><path d="M30 44 C10 30 12 14 22 14 C26 14 30 18 30 18 C30 18 34 14 38 14 C48 14 50 30 30 44Z" fill="rgba(220,80,120,0.5)" stroke="rgba(200,60,100,0.65)" strokeWidth="1.5"/><path d="M22 20 C20 22 20 27 25 31" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
  if (id === 'mushroom') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(255,220,200,0.15)" stroke="rgba(200,100,60,0.5)" strokeWidth="1.5" rx="2"/><path d="M10 34 Q14 16 30 15 Q46 16 50 34Z" fill="rgba(210,70,50,0.55)" stroke="rgba(170,50,30,0.65)" strokeWidth="1.5"/><path d="M22 34 Q21 47 26 49 L34 49 Q39 47 38 34Z" fill="rgba(255,230,200,0.5)" stroke="rgba(180,140,100,0.5)" strokeWidth="1"/><circle cx="22" cy="26" r="3" fill="rgba(255,245,235,0.75)"/><circle cx="30" cy="21" r="3.5" fill="rgba(255,245,235,0.75)"/><circle cx="38" cy="26" r="3" fill="rgba(255,245,235,0.75)"/><circle cx="26" cy="39" r="2" fill="rgba(80,40,20,0.4)"/><circle cx="34" cy="39" r="2" fill="rgba(80,40,20,0.4)"/><path d="M26 43 Q30 46 34 43" stroke="rgba(80,40,20,0.4)" strokeWidth="1" fill="none" strokeLinecap="round"/></svg>
  if (id === 'rainbow') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(200,230,255,0.15)" stroke="rgba(100,160,220,0.5)" strokeWidth="1.5" rx="2"/><path d="M8 46 Q30 8 52 46" fill="none" stroke="rgba(220,50,50,0.7)" strokeWidth="3.5" strokeLinecap="round"/><path d="M11 46 Q30 14 49 46" fill="none" stroke="rgba(230,150,20,0.7)" strokeWidth="3" strokeLinecap="round"/><path d="M14 46 Q30 19 46 46" fill="none" stroke="rgba(210,210,20,0.7)" strokeWidth="3" strokeLinecap="round"/><path d="M17 46 Q30 24 43 46" fill="none" stroke="rgba(40,180,60,0.7)" strokeWidth="3" strokeLinecap="round"/><path d="M20 46 Q30 29 40 46" fill="none" stroke="rgba(40,100,220,0.7)" strokeWidth="3" strokeLinecap="round"/><path d="M23 46 Q30 33 37 46" fill="none" stroke="rgba(140,40,210,0.65)" strokeWidth="2.5" strokeLinecap="round"/><ellipse cx="12" cy="44" rx="7" ry="5" fill="rgba(255,255,255,0.55)"/><ellipse cx="48" cy="44" rx="7" ry="5" fill="rgba(255,255,255,0.55)"/></svg>
  if (id === 'cloud') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(210,230,255,0.15)" stroke="rgba(100,150,220,0.5)" strokeWidth="1.5" rx="2"/><ellipse cx="30" cy="34" rx="20" ry="11" fill="rgba(220,235,255,0.5)" stroke="rgba(150,180,230,0.5)" strokeWidth="1.5"/><ellipse cx="21" cy="27" rx="11" ry="10" fill="rgba(220,235,255,0.6)" stroke="rgba(150,180,230,0.4)" strokeWidth="1"/><ellipse cx="37" cy="25" rx="12" ry="10" fill="rgba(220,235,255,0.6)" stroke="rgba(150,180,230,0.4)" strokeWidth="1"/><circle cx="25" cy="33" r="2" fill="rgba(80,100,160,0.5)"/><circle cx="35" cy="33" r="2" fill="rgba(80,100,160,0.5)"/><path d="M25 37 Q30 40 35 37" stroke="rgba(80,100,160,0.5)" strokeWidth="1.2" fill="none" strokeLinecap="round"/></svg>
  if (id === 'shooting-star') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(15,8,35,0.5)" stroke="rgba(200,180,240,0.5)" strokeWidth="1.5" rx="2"/><line x1="6" y1="52" x2="38" y2="20" stroke="rgba(255,240,180,0.12)" strokeWidth="7" strokeLinecap="round"/><line x1="6" y1="52" x2="38" y2="20" stroke="rgba(255,240,180,0.28)" strokeWidth="3.5" strokeLinecap="round"/><line x1="6" y1="52" x2="38" y2="20" stroke="rgba(255,250,220,0.55)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="18" cy="41" r="1.5" fill="rgba(255,240,180,0.5)"/><circle cx="12" cy="47" r="1" fill="rgba(255,240,180,0.4)"/><polygon points="40,18 42,24 48,24 43,28 45,34 40,30 35,34 37,28 32,24 38,24" fill="rgba(255,240,180,0.9)" stroke="rgba(255,220,80,0.5)" strokeWidth="0.5"/></svg>
  if (id === 'bow') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(255,210,230,0.15)" stroke="rgba(220,120,160,0.5)" strokeWidth="1.5" rx="2"/><path d="M30 30 C24 24 10 22 12 32 C14 42 26 34 30 30Z" fill="rgba(220,100,140,0.5)" stroke="rgba(200,80,120,0.6)" strokeWidth="1.5"/><path d="M30 30 C36 24 50 22 48 32 C46 42 34 34 30 30Z" fill="rgba(220,100,140,0.5)" stroke="rgba(200,80,120,0.6)" strokeWidth="1.5"/><path d="M28 30 C22 37 18 44 22 47" fill="none" stroke="rgba(200,80,120,0.5)" strokeWidth="2" strokeLinecap="round"/><path d="M32 30 C38 37 42 44 38 47" fill="none" stroke="rgba(200,80,120,0.5)" strokeWidth="2" strokeLinecap="round"/><circle cx="30" cy="30" r="4" fill="rgba(240,120,160,0.75)" stroke="rgba(200,80,120,0.6)" strokeWidth="1"/></svg>
  if (id === 'paw') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(255,220,200,0.15)" stroke="rgba(200,140,100,0.5)" strokeWidth="1.5" rx="2"/><ellipse cx="30" cy="37" rx="13" ry="10" fill="rgba(220,140,100,0.5)" stroke="rgba(180,100,70,0.5)" strokeWidth="1.5"/><circle cx="19" cy="24" r="5.5" fill="rgba(220,140,100,0.5)" stroke="rgba(180,100,70,0.5)" strokeWidth="1"/><circle cx="30" cy="21" r="5.5" fill="rgba(220,140,100,0.5)" stroke="rgba(180,100,70,0.5)" strokeWidth="1"/><circle cx="41" cy="24" r="5.5" fill="rgba(220,140,100,0.5)" stroke="rgba(180,100,70,0.5)" strokeWidth="1"/></svg>
  if (id === 'cherry') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(255,210,220,0.15)" stroke="rgba(180,60,80,0.5)" strokeWidth="1.5" rx="2"/><path d="M22 38 C24 28 32 22 38 18" fill="none" stroke="rgba(80,120,40,0.7)" strokeWidth="1.5" strokeLinecap="round"/><path d="M38 38 C38 30 38 24 38 18" fill="none" stroke="rgba(80,120,40,0.7)" strokeWidth="1.5" strokeLinecap="round"/><path d="M28 24 Q30 18 36 22 Q30 26 28 24Z" fill="rgba(80,160,60,0.6)" stroke="rgba(60,120,40,0.5)" strokeWidth="0.8"/><circle cx="20" cy="40" r="8" fill="rgba(195,38,55,0.6)" stroke="rgba(150,18,38,0.6)" strokeWidth="1.5"/><circle cx="38" cy="41" r="8" fill="rgba(195,38,55,0.6)" stroke="rgba(150,18,38,0.6)" strokeWidth="1.5"/><circle cx="17" cy="37" r="2.5" fill="rgba(255,180,180,0.45)"/><circle cx="35" cy="38" r="2.5" fill="rgba(255,180,180,0.45)"/></svg>
  if (id === 'tulip') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(255,210,235,0.15)" stroke="rgba(200,100,140,0.5)" strokeWidth="1.5" rx="2"/><line x1="30" y1="52" x2="30" y2="34" stroke="rgba(60,130,50,0.7)" strokeWidth="2" strokeLinecap="round"/><path d="M30 44 C26 38 17 38 21 44 C23 48 30 46 30 44Z" fill="rgba(80,160,60,0.5)" stroke="rgba(60,120,40,0.4)" strokeWidth="1"/><path d="M30 44 C34 38 43 38 39 44 C37 48 30 46 30 44Z" fill="rgba(80,160,60,0.5)" stroke="rgba(60,120,40,0.4)" strokeWidth="1"/><path d="M30 34 C24 30 22 18 30 16 C38 18 36 30 30 34Z" fill="rgba(220,75,115,0.6)" stroke="rgba(180,55,95,0.55)" strokeWidth="1.2"/><path d="M28 33 C20 31 16 19 24 17 C28 17 28 29 28 33Z" fill="rgba(220,75,115,0.5)" stroke="rgba(180,55,95,0.5)" strokeWidth="1"/><path d="M32 33 C40 31 44 19 36 17 C32 17 32 29 32 33Z" fill="rgba(220,75,115,0.5)" stroke="rgba(180,55,95,0.5)" strokeWidth="1"/></svg>
  // For all other stamps, render a simple representative shape
  return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="none" stroke="rgba(200,168,76,0.5)" strokeWidth="1.5" rx="3"/><text x="30" y="34" textAnchor="middle" fontSize="18" fill="rgba(200,168,76,0.7)">✦</text></svg>
}

// Lightweight envelope renderer for the modal
function ModalEnvelope({ id }: { id: string }) {
  const w = 90, h = 60
  if (id === 'vintage') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="2" fill="#f2e8c8" stroke="rgba(120,80,20,0.55)" strokeWidth="1.2"/><rect x="6" y="24" width="108" height="50" rx="1" fill="none" stroke="rgba(120,80,20,0.22)" strokeWidth="0.7" strokeDasharray="2 2"/><path d="M2 20 L60 56 L118 20 Z" fill="#ede0b8" stroke="rgba(120,80,20,0.45)" strokeWidth="1"/><path d="M2 78 L60 46 L118 78" fill="none" stroke="rgba(120,80,20,0.28)" strokeWidth="0.8"/><circle cx="10" cy="27" r="2.5" fill="rgba(120,80,20,0.35)"/><circle cx="110" cy="27" r="2.5" fill="rgba(120,80,20,0.35)"/></svg>
  if (id === 'airmail') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="2" width="116" height="76" rx="2" fill="#f8f5ee" stroke="#cc3333" strokeWidth="3"/><rect x="8" y="8" width="104" height="64" rx="1" fill="none" stroke="#1144aa" strokeWidth="1.2" strokeDasharray="4 3"/><path d="M2 20 L60 54 L118 20 Z" fill="#f5f1e8" stroke="#bb3322" strokeWidth="0.8"/><text x="60" y="68" textAnchor="middle" fontSize="7" fontFamily="sans-serif" fill="#1144aa" letterSpacing="2" fontStyle="italic">PAR AVION</text></svg>
  if (id === 'sakura') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="2" fill="#fde8f0" stroke="rgba(200,100,140,0.45)" strokeWidth="1"/><path d="M2 20 L60 56 L118 20 Z" fill="#fde0ec" stroke="rgba(200,100,140,0.35)" strokeWidth="0.8"/><path d="M2 78 L60 46 L118 78" fill="none" stroke="rgba(200,100,140,0.28)" strokeWidth="0.7"/>{[{cx:14,cy:66},{cx:20,cy:70},{cx:8,cy:70},{cx:10,cy:63},{cx:22,cy:63}].map((p,i)=><circle key={i} cx={p.cx} cy={p.cy} r="3.5" fill="rgba(230,100,140,0.5)"/>)}</svg>
  if (id === 'starfield') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="2" fill="#1a1830" stroke="rgba(150,140,220,0.4)" strokeWidth="1"/><path d="M2 20 L60 56 L118 20 Z" fill="#1c1a38" stroke="rgba(150,140,220,0.32)" strokeWidth="0.8"/>{[[14,34],[28,28],[44,42],[68,30],[84,38],[100,26],[56,60],[26,62],[96,60],[110,48]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r={i%3===0?1.4:0.9} fill="rgba(220,210,255,0.85)"/>)}</svg>
  if (id === 'kraft') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="2" fill="#c8924a" stroke="rgba(80,40,10,0.5)" strokeWidth="1.2"/><path d="M2 20 L60 56 L118 20 Z" fill="#be8840" stroke="rgba(80,40,10,0.4)" strokeWidth="1"/><path d="M2 78 L60 46 L118 78" fill="none" stroke="rgba(60,30,8,0.3)" strokeWidth="0.8"/><line x1="60" y1="22" x2="60" y2="76" stroke="rgba(80,40,10,0.22)" strokeWidth="0.9" strokeDasharray="3 2"/></svg>
  if (id === 'romantic') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="2" fill="#fce8ee" stroke="rgba(200,80,120,0.4)" strokeWidth="1"/><path d="M2 20 L60 56 L118 20 Z" fill="#fce0ea" stroke="rgba(180,60,100,0.32)" strokeWidth="0.8"/><path d="M60 46 C56 42 51 40 51 43.5 C51 47 55 50 60 54 C65 50 69 47 69 43.5 C69 40 64 42 60 46Z" fill="rgba(200,70,110,0.58)" stroke="rgba(180,50,90,0.35)" strokeWidth="0.7"/></svg>
  if (id === 'wax') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="2" width="116" height="76" rx="2" fill="#f4eedd" stroke="rgba(100,80,40,0.4)" strokeWidth="1.2"/><path d="M2 2 L60 42 L118 2 Z" fill="#eee0c8" stroke="rgba(100,80,40,0.32)" strokeWidth="0.8"/><path d="M2 78 L60 38 L118 78" fill="none" stroke="rgba(100,80,40,0.2)" strokeWidth="0.7"/><circle cx="60" cy="42" r="11" fill="#8b1a1a"/><circle cx="60" cy="42" r="9" fill="#9a2020"/><text x="60" y="46" textAnchor="middle" fontSize="9" fill="rgba(255,200,180,0.8)" fontFamily="serif">✦</text></svg>
  // classic (default)
  return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="3" fill="rgba(230,199,110,0.15)" stroke="rgba(230,199,110,0.45)" strokeWidth="1"/><path d="M2 20 L60 56 L118 20 Z" fill="rgba(230,199,110,0.12)" stroke="rgba(230,199,110,0.35)" strokeWidth="1"/><path d="M2 78 L60 46 L118 78" fill="none" stroke="rgba(230,199,110,0.22)" strokeWidth="1"/><line x1="2" y1="20" x2="60" y2="46" stroke="rgba(230,199,110,0.15)" strokeWidth="0.8"/><line x1="118" y1="20" x2="60" y2="46" stroke="rgba(230,199,110,0.15)" strokeWidth="0.8"/></svg>
}

function LetterModal({
  letter,
  onClose,
  onReply,
  onArchive,
  onBurn,
}: {
  letter: Letter
  onClose: () => void
  onReply?: (name: string) => void
  onArchive?: () => void
  onBurn?: () => void
}) {
  const colors = PAPER_COLORS[letter.paperId] || PAPER_COLORS.ornate
  const bodyFont = (letter.fontId && FONT_FAMILIES[letter.fontId]) || "'Cormorant Garamond', serif"
  const paperBg = letter.paperColor
    ? (PAPER_TONES.find(t => t.id === letter.paperColor)?.bg ?? undefined)
    : undefined
  const defaultInk = PAPER_INK[letter.paperId]?.main ?? '#180e04'
  const bodyColor = (letter.fontColor && FONT_COLOR_MAP[letter.fontColor])
    ? FONT_COLOR_MAP[letter.fontColor]
    : defaultInk
  const writingStyle = getHandwritingStyleStyles(letter.handwritingStyle || 'typed')

  const isReceivedLetter = letter.direction === 'received' && (letter.status === 'arrived' || letter.status === 'archive')
  const isBurnReceived = isReceivedLetter && !!letter.burnAfterReading
  const [burnConfirmed, setBurnConfirmed] = useState(false)
  const [isPlayingVoice, setIsPlayingVoice] = useState(false)
  const [openPhase, setOpenPhase] = useState<'warning'|'envelope'|'letter'>(
    isBurnReceived ? 'warning' : isReceivedLetter ? 'envelope' : 'letter'
  )
  const handleClose = () => { if (burnConfirmed) onBurn?.(); onClose() }
  useEffect(() => {
    if (!isReceivedLetter || isBurnReceived) return
    playWaxSeal()
    const t = setTimeout(() => setOpenPhase('letter'), 1600)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      setIsPlayingVoice(false)
    }
  }, [])

  async function handlePlayVoiceNote() {
    if (!letter.voiceNoteUrl || isPlayingVoice) return
    setIsPlayingVoice(true)
    try {
      await playAudioWithEffect(letter.voiceNoteUrl, letter.voiceEffect || 'raw', () => setIsPlayingVoice(false))
    } catch (error) {
      console.error('Failed to play voice note:', error)
      setIsPlayingVoice(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,5,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: '20px' }}
    >
      {openPhase === 'warning' && isBurnReceived && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', textAlign: 'center', padding: '20px', maxWidth: '320px' }}
        >
          <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: '52px', filter: 'drop-shadow(0 0 20px rgba(255,80,40,0.7))' }}>🔥</motion.div>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.35em', color: '#e87060', textTransform: 'uppercase' }}>Burn After Reading</p>
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '15px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.75 }}>
            This letter will be destroyed once you read it.<br />There is no going back.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => { setBurnConfirmed(true); setOpenPhase('envelope'); playWaxSeal(); setTimeout(() => setOpenPhase('letter'), 1600) }}
              style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: '#e87060', padding: '10px 20px', border: '1px solid rgba(220,60,40,0.55)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,60,40,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >Open & Destroy ✶</button>
            <button
              onClick={onClose}
              style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.45)', padding: '10px 20px', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.72)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
            >Keep Sealed</button>
          </div>
        </motion.div>
      )}
      {openPhase === 'envelope' && isReceivedLetter && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ opacity: 0.9 }}>
            <svg width="160" height="110" viewBox="0 0 120 80">
              <rect x="2" y="20" width="116" height="58" rx="3" fill={`${colors.accent}18`} stroke={`${colors.accent}60`} strokeWidth="1.2"/>
              <motion.path
                d="M2 20 L60 56 L118 20 Z"
                initial={{ d: 'M2 20 L60 56 L118 20 Z' }}
                animate={{ d: ['M2 20 L60 56 L118 20 Z', 'M2 20 L60 6 L118 20 Z'] }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                fill={`${colors.accent}15`} stroke={`${colors.accent}45`} strokeWidth="1"/>
              <path d="M2 78 L60 46 L118 78" fill="none" stroke={`${colors.accent}30`} strokeWidth="1"/>
            </svg>
          </motion.div>
          <motion.p
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.4em', color: colors.accent, textTransform: 'uppercase' }}>
            Breaking the seal...
          </motion.p>
        </motion.div>
      )}
      {(openPhase === 'letter' || !isReceivedLetter) && (
        <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.35 }}
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(600px, 92vw)', maxHeight: '80vh', overflowY: 'auto', borderRadius: '3px', boxShadow: `0 16px 60px rgba(0,0,0,0.9), 0 0 40px ${colors.accent}20`, position: 'relative' }}
      >
        <button
          onClick={handleClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', opacity: 0.6, transition: 'opacity 0.2s', color: defaultInk, zIndex: 10 }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.95' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.6' }}
        >
          ×
        </button>

        {renderLetterPaper(letter.paperId, paperBg, (
          <div style={{ position: 'relative' }}>
            {renderLetterEmbellishment(letter.embellishmentId, colors.accent, 'read')}
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: colors.accent, textTransform: 'uppercase', marginBottom: '20px', opacity: 0.88 }}>
              {letter.direction === 'received' ? `From · ${letter.from}` : `To · ${letter.to}`}
            </p>

            <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '11px', opacity: 0.76, marginBottom: '20px', color: bodyColor }}>
              {new Date(letter.arrivedAt || letter.sentAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <p style={{ fontFamily: bodyFont, fontSize: '17px', fontStyle: 'italic', color: bodyColor, opacity: 0.9, marginBottom: '16px', lineHeight: 1.8 }}>
              {letter.direction === 'received'
                ? (letter.isUniverseLetter ? 'Dear Stranger,' : `Dear ${letter.to},`)
                : `Dear ${letter.to},`}
            </p>

            {letter.body.split('\n\n— ✦ —\n\n').map((page, i, arr) => (
              <div key={i} style={writingStyle}>
                <p style={{ fontFamily: bodyFont, fontSize: 'clamp(15px,2vw,18px)', lineHeight: 2, letterSpacing: '0.02em', color: bodyColor, opacity: 0.98, whiteSpace: 'pre-wrap' }}>
                  {page}
                </p>
                {i < arr.length - 1 && (
                  <div style={{ textAlign: 'center', margin: '24px 0', opacity: 0.4 }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.4em', color: colors.accent }}>— ✦ —</span>
                  </div>
                )}
              </div>
            ))}

            {letter.voiceNoteUrl && (
              <div style={{ marginTop:'22px', padding:'14px 16px', border:`1px solid ${colors.accent}30`, borderRadius:'6px', background:'rgba(10,10,24,0.18)' }}>
                <p style={{ fontFamily:"'Cinzel', serif", fontSize:'8px', letterSpacing:'0.28em', color:colors.accent, textTransform:'uppercase', margin:'0 0 6px' }}>Voice Note</p>
                <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'11px', color:bodyColor, opacity:0.68, margin:'0 0 12px' }}>
                  {letter.voiceEffect === 'raw' || !letter.voiceEffect
                    ? 'A spoken note was left with this letter.'
                    : `Played through the ${letter.voiceEffect} effect.`}
                </p>
                <button
                  onClick={handlePlayVoiceNote}
                  disabled={isPlayingVoice}
                  style={{ background:'transparent', border:`1px solid ${colors.accent}70`, color:colors.accent, fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.24em', textTransform:'uppercase', padding:'8px 14px', cursor:isPlayingVoice ? 'default' : 'pointer', borderRadius:'2px', opacity:isPlayingVoice ? 0.6 : 1 }}>
                  {isPlayingVoice ? 'Playing...' : 'Play Voice Note'}
                </button>
              </div>
            )}

            <p style={{ fontFamily: bodyFont, fontStyle: 'italic', fontSize: '15px', color: bodyColor, opacity: 0.86, marginTop: '24px', lineHeight: 1.9 }}>
              With presence,<br />
              <span style={{ color: colors.accent, opacity: 0.95 }}>
                {letter.direction === 'received' && !letter.isUniverseLetter && letter.from
                  ? letter.from
                  : 'A Stranger'}
              </span>
            </p>

            {(letter.stampId || letter.envelopeId) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: '12px', marginTop: '16px', opacity: 0.85 }}>
                {letter.envelopeId && <ModalEnvelope id={letter.envelopeId} />}
                {letter.stampId && <ModalStamp id={letter.stampId} />}
              </div>
            )}
          </div>
        ))}

        {letter.direction === 'received' && (
          <div style={{ padding: '16px 28px 20px', background: 'rgba(0,0,8,0.97)', borderTop: `1px solid ${colors.accent}38`, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onReply?.(letter.from || '')}
              style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: colors.accent, padding: '10px 24px', border: `1px solid ${colors.accent}70`, borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = `${colors.accent}12`; e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.boxShadow = `0 0 20px ${colors.accent}20` }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${colors.accent}70`; e.currentTarget.style.boxShadow = 'none' }}
            >
              Reply ✦
            </button>
            {letter.status === 'arrived' && (
              <button
                onClick={onArchive}
                style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.45)', padding: '10px 24px', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.72)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
              >
                Archive
              </button>
            )}
          </div>
        )}
        {letter.direction === 'sent' && letter.status === 'arrived' && (
          <div style={{ padding: '16px 28px 20px', background: 'rgba(0,0,8,0.97)', borderTop: `1px solid ${colors.accent}38` }}>
            <button
              onClick={onArchive}
              style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.45)', padding: '10px 24px', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.72)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
            >
              Archive
            </button>
          </div>
        )}
        </motion.div>
      )}
    </motion.div>
  )
}
