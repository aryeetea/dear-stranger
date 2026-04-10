'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getMyLetters, pinLetter, unpinLetter, getPinnedLetterIds, deleteLetter, deleteLetterForEveryone } from '../lib/auth'
import { playAudioWithEffect, type VoiceEffect } from '../../lib/audioEffects'
import { playWaxSeal } from '../../lib/sounds'
import { PAPER_TONES, PAPER_INK, renderLetterPaper } from '../lib/letterPapers'
import { getHandwritingStyleStyles, renderLetterEmbellishment, type HandwritingStyle, type EmbellishmentId } from '../lib/letterEnrichments'

// ── Deterministic seeded random (no Math.random in render) ──
function sr(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

// ── Static background stars ──
const BG_STARS = Array.from({ length: 160 }, (_, i) => ({
  x: sr(i * 3 + 1) * 100,
  y: sr(i * 3 + 2) * 100,
  r: sr(i * 3 + 3) * 1.4 + 0.3,
  opacity: sr(i * 3 + 7) * 0.35 + 0.08,
}))

// ── Twinkle stars (subset that animate opacity) ──
const TWINKLE_STARS = BG_STARS.filter((_, i) => i % 4 === 2)

// ── Nebula patches (subtle ambient only) ──
const NEBULAE = [
  { x: 22, y: 22, rx: 18, ry: 12, color: '104,52,150', op: 0.07 },
  { x: 80, y: 20, rx: 15, ry: 10, color: '200,110,84', op: 0.06 },
  { x: 76, y: 74, rx: 16, ry: 10, color: '80,130,200', op: 0.06 },
  { x: 28, y: 80, rx: 13, ry: 8,  color: '160,90,190', op: 0.05 },
  { x: 55, y: 48, rx: 10, ry: 7,  color: '255,182,110', op: 0.05 },
]

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

function hexToRgbString(hex: string) {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return '230,199,110'
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  return `${r},${g},${b}`
}

const PAPER_COLORS: Record<string, { accent: string; glow: string }> = Object.fromEntries(
  Object.entries(PAPER_INK).map(([paperId, ink]) => [
    paperId,
    { accent: ink.accent, glow: hexToRgbString(ink.accent) },
  ]),
)

const SENT_GLOW_RGB = '255,185,65'
const TRANSIT_GLOW_RGB = '200,220,255'
const RECEIVED_GLOW_RGB = '230,199,110'

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
  status: 'transit' | 'arrived' | 'pinned'
  travelProgress?: number
  direction: 'sent' | 'received'
  isUniverseLetter?: boolean
  burnAfterReading?: boolean
  voiceNoteUrl?: string
  voiceEffect?: VoiceEffect
  handwritingStyle?: HandwritingStyle
  handwrittenImageUrl?: string
  embellishmentId?: EmbellishmentId
  cx?: number
  cy?: number
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
  handwritten_image_url?: string | null
  embellishment_id?: string | null
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function clampPanOffset(x: number, y: number) {
  return {
    x: clamp(x, -180, 180),
    y: clamp(y, -140, 140),
  }
}

function formatObservatoryDate(dateString?: string) {
  if (!dateString) return 'Awaiting a timestamp'
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Assign each letter a stable celestial position via natural clustering
// Sent: lower half (energy moving away)  |  Transit received: upper arc (crossing the dark)
// Arrived received: center cluster  |  Pinned: elevated mid-field
function assignCelestialPositions(letters: Letter[]): Letter[] {
  return letters.map((l, i) => {
    const seed = i * 17 + l.id.charCodeAt(0) * 3
    let cx: number, cy: number
    if (l.direction === 'sent') {
      // Sent letters drift across the lower half — warm energy radiating outward
      cx = 10 + sr(seed) * 80; cy = 56 + sr(seed + 1) * 26
    } else if (l.status === 'transit') {
      // Incoming comets arc across the upper sky
      cx = 8 + sr(seed) * 84; cy = 10 + sr(seed + 1) * 32
    } else if (l.status === 'pinned') {
      // Pinned stars rest steady in the mid-upper field
      cx = 28 + sr(seed) * 44; cy = 16 + sr(seed + 1) * 34
    } else {
      // Arrived letters cluster around the center
      cx = 22 + sr(seed) * 56; cy = 30 + sr(seed + 1) * 34
    }
    return { ...l, cx, cy }
  })
}

export default function Observatory({ onClose, onWriteLetter }: { onClose?: () => void; onWriteLetter?: (name: string) => void }) {
  const [openLetter, setOpenLetter] = useState<Letter | null>(null)
  const [letters, setLetters] = useState<Letter[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('ds_read_letters') || '[]')) } catch { return new Set() }
  })
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ letter: Letter; x: number; y: number } | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })
  const [portalPulse, setPortalPulse] = useState(false)
  const [zoomTarget, setZoomTarget] = useState<Letter | null>(null)
  const [countHovered, setCountHovered] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const panRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const skyRef = useRef<HTMLDivElement>(null)
  const bgSvgRef = useRef<SVGSVGElement>(null)
  const twinkleRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    async function loadLetters() {
      try {
        setLoading(true)
        const data = await Promise.race([
          getMyLetters(),
          new Promise<{ userId: string; transit: never[]; arrived: never[] }>((resolve) =>
            setTimeout(() => resolve({ userId: '', transit: [], arrived: [] }), 10000)
          ),
        ])
        const userId = data.userId
        const mapLetter = (l: LetterRow): Letter => {
          const createdAt = l.created_at || new Date().toISOString()
          const arrivesMs = l.arrives_at ? new Date(l.arrives_at).getTime() : new Date(createdAt).getTime()
          const createdMs = new Date(createdAt).getTime()
          const nowMs = Date.now()
          const totalMs = arrivesMs - createdMs
          const rawProgress = totalMs > 0 ? ((nowMs - createdMs) / totalMs) * 100 : 100
          const direction: 'sent' | 'received' = l.sender_id === userId ? 'sent' : 'received'
          const baseStatus: Letter['status'] = l.status === 'transit' || l.status === 'arrived' ? l.status : 'arrived'
          const effectiveStatus = direction === 'received' && baseStatus === 'transit' && l.arrives_at && nowMs >= arrivesMs ? 'arrived' : baseStatus
          return {
            id: l.id,
            from: direction === 'received' ? (l.sender?.hub_name || 'Unknown Sender') : (l.sender?.hub_name || 'You'),
            to: direction === 'sent' ? (l.recipient?.hub_name || (l.is_universe_letter ? 'The Universe' : 'Unknown')) : (l.recipient?.hub_name || 'You'),
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
            direction,
            travelProgress: effectiveStatus === 'transit' ? clamp(Math.floor(rawProgress), 0, 100) : undefined,
            isUniverseLetter: l.is_universe_letter ?? false,
            burnAfterReading: l.burn_after_reading ?? false,
            voiceNoteUrl: l.voice_note_url || undefined,
            voiceEffect: (l.voice_effect as VoiceEffect | null) || undefined,
            handwritingStyle: (l.handwriting_style as HandwritingStyle | null) || 'typed',
            handwrittenImageUrl: l.handwritten_image_url || undefined,
            embellishmentId: (l.embellishment_id as EmbellishmentId | null) || 'none',
          }
        }
        setCurrentUserId(userId)
        const pinnedIds = getPinnedLetterIds(userId)
        const applyPin = (l: Letter): Letter => pinnedIds.has(l.id) ? { ...l, status: 'pinned' as const } : l
        const all: Letter[] = [
          ...(data.transit || []).map(mapLetter).map(applyPin),
          ...(data.arrived || []).map(mapLetter).map(applyPin),
        ]
        setLetters(assignCelestialPositions(all))
      } catch (err) {
        console.error('Failed to load letters:', err)
        setLetters([])
      } finally {
        setLoading(false)
      }
    }
    loadLetters()
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || isDraggingRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setMousePos({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height })
  }, [])

  // Drag via native DOM events — direct DOM manipulation for 60fps smoothness
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let dragging = false
    let startX = 0, startY = 0
    let originX = 0, originY = 0
    let parallaxGroups: NodeListOf<SVGGElement> | null = null

    function onDown(e: PointerEvent) {
      if ((e.target as HTMLElement).closest('[data-letter],[data-no-pan]')) return
      dragging = true
      isDraggingRef.current = true
      startX = e.clientX; startY = e.clientY
      originX = panRef.current.x; originY = panRef.current.y
      parallaxGroups = bgSvgRef.current?.querySelectorAll<SVGGElement>('[data-parallax]') || null
      el!.setPointerCapture(e.pointerId)
      el!.style.cursor = 'grabbing'
    }
    function onMove(e: PointerEvent) {
      if (!dragging) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const next = clampPanOffset(originX + dx, originY + dy)
      panRef.current = next
      // Update all layers directly — zero React re-renders during drag
      if (skyRef.current) skyRef.current.style.transform = `translate(${next.x}px, ${next.y}px)`
      if (twinkleRef.current) twinkleRef.current.style.transform = `translate(${next.x * 0.6}px, ${next.y * 0.6}px)`
      parallaxGroups?.forEach(g => {
        const f = parseFloat(g.dataset.parallax || '0.5')
        g.style.transform = `translate(${next.x * f}px, ${next.y * f}px)`
      })
    }
    function onUp(e: PointerEvent) {
      if (!dragging) return
      dragging = false
      isDraggingRef.current = false
      setPan({ ...panRef.current })
      try { el!.releasePointerCapture(e.pointerId) } catch {}
      el!.style.cursor = 'grab'
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [])

  function handlePin(letter: Letter) {
    const isAlreadyPinned = letter.status === 'pinned'
    if (isAlreadyPinned) {
      unpinLetter(letter.id, currentUserId)
      setOpenLetter(null)
      setLetters(prev => assignCelestialPositions(prev.map(l => l.id === letter.id ? { ...l, status: 'arrived' as const } : l)))
    } else {
      pinLetter(letter.id, currentUserId)
      setOpenLetter(null)
      setLetters(prev => assignCelestialPositions(prev.map(l => l.id === letter.id ? { ...l, status: 'pinned' as const } : l)))
    }
  }

  async function handleBurnAndClose(letter: Letter) {
    setOpenLetter(null)
    setLetters(prev => prev.filter(l => l.id !== letter.id))
    try { await deleteLetter(letter.id) } catch (err) { console.error('Failed to delete burn letter:', err) }
  }

  async function handleDeleteForEveryone(letter: Letter) {
    setOpenLetter(null)
    setLetters(prev => prev.filter(l => l.id !== letter.id))
    try { await deleteLetterForEveryone(letter.id) } catch (err) { console.error('Failed to delete letter for everyone:', err) }
  }

  function handleLetterClick(letter: Letter) {
    if (letter.status === 'transit') return
    setReadIds(prev => {
      const next = new Set(prev)
      next.add(letter.id)
      try { localStorage.setItem('ds_read_letters', JSON.stringify([...next])) } catch {}
      return next
    })
    setZoomTarget(letter)
    setTimeout(() => { setZoomTarget(null); setOpenLetter(letter) }, 480)
  }

  const transit = letters.filter(l => l.status === 'transit')
  const arrived = letters.filter(l => l.status === 'arrived')
  const pinned = letters.filter(l => l.status === 'pinned')
  const total = letters.length
  const sentCount = letters.filter(l => l.direction === 'sent').length
  const receivedCount = letters.filter(l => l.direction === 'received' && l.status !== 'transit').length
  const newlyArrived = arrived.filter(l => !readIds.has(l.id) && (currentTime - new Date(l.arrivedAt || l.sentAt).getTime()) < 48 * 3600000)

  const p1x = (mousePos.x - 0.5) * 14
  const p1y = (mousePos.y - 0.5) * 10
  const p2x = (mousePos.x - 0.5) * 28
  const p2y = (mousePos.y - 0.5) * 20

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={handleMouseMove}
      style={{ position: 'fixed', inset: 0, background: 'rgba(3,2,10,0.88)', backdropFilter: 'blur(18px)', zIndex: 70, overflow: 'hidden', cursor: 'grab', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
    >
      {/* ── Deep space background ── */}
      <svg ref={bgSvgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} aria-hidden="true">
        <defs>
          <radialGradient id="obs-core" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="rgba(60,30,90,0.18)" />
            <stop offset="100%" stopColor="rgba(3,2,10,0)" />
          </radialGradient>
          <radialGradient id="obs-anchor" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(201,168,76,0.1)" />
            <stop offset="50%" stopColor="rgba(201,168,76,0.03)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#obs-core)" />
        <g data-parallax="0.3" style={{ transform: `translate(${pan.x * 0.3 + p1x * 0.4}px, ${pan.y * 0.3 + p1y * 0.4}px)` }}>
          {NEBULAE.map((n, i) => (
            <ellipse key={i} cx={`${n.x}%`} cy={`${n.y}%`} rx={`${n.rx}%`} ry={`${n.ry}%`} fill={`rgba(${n.color},${n.op})`} style={{ filter: 'blur(22px)' }} />
          ))}
        </g>
        <g data-parallax="0.5" style={{ transform: `translate(${pan.x * 0.5 + p1x}px, ${pan.y * 0.5 + p1y}px)` }}>
          {BG_STARS.slice(0, 80).map((s, i) => (
            <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill={`rgba(255,255,255,${s.opacity})`} />
          ))}
        </g>
        <g data-parallax="0.7" style={{ transform: `translate(${pan.x * 0.7 + p2x}px, ${pan.y * 0.7 + p2y}px)` }}>
          {BG_STARS.slice(80).map((s, i) => (
            <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r * 0.7} fill={`rgba(255,255,255,${s.opacity * 0.7})`} />
          ))}
        </g>
        <ellipse cx="50%" cy="50%" rx="20%" ry="14%" fill="url(#obs-anchor)" />
      </svg>

      {/* ── Twinkling overlay stars ── */}
      <div ref={twinkleRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', transform: `translate(${pan.x * 0.6}px, ${pan.y * 0.6}px)` }}>
      {TWINKLE_STARS.map((s, i) => (
        <motion.div
          key={`tw-${i}`}
          animate={{ opacity: [s.opacity * 0.3, Math.min(s.opacity * 2.6, 0.88), s.opacity * 0.5, s.opacity * 1.9, s.opacity * 0.3] }}
          transition={{ duration: 2.5 + sr(i * 31) * 3.5, repeat: Infinity, ease: 'easeInOut', delay: sr(i * 43) * 6 }}
          style={{
            position: 'absolute',
            left: `${s.x}%`, top: `${s.y}%`,
            width: `${Math.max(s.r * 3, 1.5)}px`, height: `${Math.max(s.r * 3, 1.5)}px`,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.95)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      ))}
      </div>

      {/* ── Guidance hint ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} style={{ position: 'absolute', top: '62px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none', zIndex: 2, whiteSpace: 'nowrap' }}>
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}>Tap a letter to read its light</p>
      </motion.div>

      {/* ── Zone labels removed ── */}

      {/* ── Top bar ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(12px, 2.5vw, 18px) clamp(14px, 3vw, 28px)', pointerEvents: 'none' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ display: 'flex', gap: '8px', pointerEvents: 'all', flexWrap: 'wrap' }}>
          <div
            onMouseEnter={() => setCountHovered(true)}
            onMouseLeave={() => setCountHovered(false)}
            style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px', backdropFilter: 'blur(10px)', cursor: 'default' }}
          >
            {countHovered && total > 0 ? (
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(8px, 1.2vw, 10px)', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                {[receivedCount > 0 && `${receivedCount} received`, sentCount > 0 && `${sentCount} sent`, transit.length > 0 && `${transit.length} transit`].filter(Boolean).join(' · ')}
              </span>
            ) : (
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(8px, 1.2vw, 10px)', letterSpacing: '0.28em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>{total} {total === 1 ? 'letter' : 'letters'}</span>
            )}
          </div>
          {newlyArrived.length > 0 && (
            <motion.div animate={{ opacity: [0.75, 1, 0.75] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} style={{ padding: '7px 14px', background: 'rgba(230,199,110,0.1)', border: '1px solid rgba(230,199,110,0.4)', borderRadius: '999px', backdropFilter: 'blur(10px)' }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(8px, 1.2vw, 10px)', letterSpacing: '0.28em', color: '#e6c76e', textTransform: 'uppercase' }}>{newlyArrived.length} new</span>
            </motion.div>
          )}
        </motion.div>
        <motion.button data-no-pan="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} onClick={onClose} style={{ pointerEvents: 'all', background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.75)', fontFamily: "'Cinzel', serif", fontSize: 'clamp(8px, 1.2vw, 10px)', letterSpacing: '0.3em', padding: '8px 16px', cursor: 'pointer', textTransform: 'uppercase', minHeight: '44px', display: 'flex', alignItems: 'center' }} onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)' }} onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}>← Universe</motion.button>
      </div>

      {/* ── Star type legend ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} style={{ position: 'absolute', bottom: 'clamp(36px, 6vh, 52px)', left: 'clamp(14px, 3vw, 36px)', zIndex: 10, pointerEvents: 'none' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: '12px' }}>Star Types</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Received */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '18px', height: '18px', flexShrink: 0 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(${RECEIVED_GLOW_RGB},0.75) 40%, transparent 100%)`, boxShadow: `0 0 6px rgba(${RECEIVED_GLOW_RGB},0.6)` }} />
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '26px', height: '1px', background: `linear-gradient(to right, transparent, rgba(${RECEIVED_GLOW_RGB},0.4), transparent)` }} />
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(90deg)', width: '26px', height: '1px', background: `linear-gradient(to right, transparent, rgba(${RECEIVED_GLOW_RGB},0.4), transparent)` }} />
            </div>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em', color: `rgba(${RECEIVED_GLOW_RGB},0.65)`, textTransform: 'uppercase' }}>Received</span>
          </div>
          {/* Sent */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '16px', height: '16px', flexShrink: 0 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, rgba(255,180,40,0.98) 0%, rgba(200,120,10,0.6) 45%, transparent 100%)`, boxShadow: `0 0 6px rgba(${SENT_GLOW_RGB},0.8)` }} />
            </div>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em', color: `rgba(${SENT_GLOW_RGB},0.65)`, textTransform: 'uppercase' }}>Sent</span>
          </div>
          {/* In Transit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '14px', height: '14px', flexShrink: 0 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, rgba(100,170,255,0.98) 0%, rgba(60,110,240,0.6) 50%, transparent 100%)`, boxShadow: '0 0 6px rgba(100,170,255,0.55)' }} />
              <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '2px', background: `linear-gradient(to left, rgba(${TRANSIT_GLOW_RGB},0.7), transparent)`, borderRadius: '1px' }} />
            </div>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em', color: `rgba(${TRANSIT_GLOW_RGB},0.55)`, textTransform: 'uppercase' }}>In Transit</span>
          </div>
          {/* Pinned */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '22px', height: '22px', flexShrink: 0 }}>
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '14px', height: '14px', borderRadius: '50%', background: `radial-gradient(circle, rgba(230,200,255,0.98) 0%, rgba(180,140,240,0.7) 45%, transparent 100%)`, boxShadow: '0 0 8px rgba(180,140,240,0.85)' }} />
              {[0, 90, 45, 135].map(rot => (
                <div key={rot} style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) rotate(${rot}deg)`, width: rot < 90 ? '22px' : '16px', height: '1px', background: `linear-gradient(to right, transparent, rgba(180,140,240,${rot < 90 ? 0.65 : 0.45}), transparent)`, pointerEvents: 'none' }} />
              ))}
            </div>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em', color: 'rgba(200,160,255,0.55)', textTransform: 'uppercase' }}>Pinned</span>
          </div>
        </div>
      </motion.div>

      {/* ── Observatory title hint ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ position: 'absolute', left: '50%', bottom: 'clamp(12px, 3vh, 28px)', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none', zIndex: 3 }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(8px, 1vw, 9px)', letterSpacing: '0.6em', color: 'rgba(255,234,196,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>The Observatory</p>
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(10px, 1.4vw, 12px)', color: 'rgba(255,255,255,0.18)' }}>touch a star to read its light</p>
      </motion.div>

      {/* ── "To the Universe" portal ── */}
      <motion.div data-no-pan="true" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, type: 'spring', stiffness: 200 }} style={{ position: 'absolute', bottom: 'clamp(36px, 6vh, 52px)', right: 'clamp(14px, 3vw, 36px)', zIndex: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={() => { setPortalPulse(true); setTimeout(() => { setPortalPulse(false); onWriteLetter?.('') }, 600) }}>
        <motion.div
          animate={portalPulse ? { scale: [1, 2.8, 0.1], opacity: [1, 0.8, 0] } : {}}
          transition={portalPulse ? { duration: 0.6, ease: 'easeOut' } : {}}
          style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {/* Outer slow-pulse ring */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', inset: '-16px', borderRadius: '50%', border: '1px solid rgba(230,199,110,0.35)', pointerEvents: 'none' }}
          />
          {/* Main circle */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(230,199,110,0.72)', boxShadow: '0 0 28px rgba(230,199,110,0.5), 0 0 60px rgba(230,199,110,0.22), inset 0 0 24px rgba(230,199,110,0.09)' }} />
          {/* Inner rotating dashed ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            style={{ position: 'absolute', inset: '13px', borderRadius: '50%', border: '1px dashed rgba(230,199,110,0.42)', pointerEvents: 'none' }}
          />
          <span style={{ fontSize: '30px', position: 'relative', zIndex: 1, color: 'rgba(230,199,110,0.95)', filter: 'drop-shadow(0 0 10px rgba(230,199,110,0.65))' }}>✦</span>
        </motion.div>
        <motion.p
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.28em', color: 'rgba(230,199,110,0.85)', textTransform: 'uppercase', textAlign: 'center', marginTop: '10px', whiteSpace: 'nowrap' }}
        >Write to Universe</motion.p>
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '10px', color: 'rgba(230,199,110,0.4)', textAlign: 'center', marginTop: '3px', whiteSpace: 'nowrap' }}>compose a letter to a stranger</p>
      </motion.div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
          <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Scanning the sky…</motion.p>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && letters.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', zIndex: 5 }}>
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '20px', color: 'rgba(255,255,255,0.38)' }}>The sky is quiet.</p>
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.2)' }}>Write a letter and watch it become a star.</p>
        </div>
      )}

      {/* ── Celestial letter objects ── */}
      <div ref={skyRef} style={{ position: 'absolute', inset: 0, transform: `translate(${pan.x}px, ${pan.y}px)` }}>
      {!loading && letters.map((letter, i) => {
        const pColor = PAPER_COLORS[letter.paperId] || PAPER_COLORS.ornate
        const isPinned = letter.status === 'pinned'
        const isSent = !isPinned && letter.direction === 'sent'
        const isTransit = !isPinned && letter.status === 'transit'
        const isArrived = !isPinned && letter.status === 'arrived'
        const isNew = isArrived && !isSent && !readIds.has(letter.id) && (currentTime - new Date(letter.arrivedAt || letter.sentAt).getTime()) < 48 * 3600000
        const isHovered = hoveredId === letter.id
        const isZooming = zoomTarget?.id === letter.id
        const cx = letter.cx ?? 50
        const cy = letter.cy ?? 50
        const baseSize = isPinned ? 11 : isSent ? 8 : isTransit ? 7 : (isNew ? 12 : 9)
        const opacity = isPinned ? 0.8 : isSent ? 0.85 : isTransit ? 0.72 : 1
        const statusGlowRgb = isPinned
          ? '220,180,255'
          : isSent
            ? SENT_GLOW_RGB
            : isTransit
              ? TRANSIT_GLOW_RGB
              : RECEIVED_GLOW_RGB
        const driftX = isTransit ? (sr(i * 13) * 50) - 25 : 0
        const driftY = isTransit ? (sr(i * 17) * 24) - 12 : 0
        const driftDur = isTransit ? 22 + sr(i * 23) * 18 : 0

        return (
          <motion.div
            key={letter.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={isZooming ? { opacity: 0, scale: 4 } : { opacity, scale: 1 }}
            transition={isZooming ? { duration: 0.45, ease: 'easeIn' } : { delay: i * 0.04, type: 'spring', stiffness: 280, damping: 24 }}
            data-letter="true"
            style={{
              position: 'absolute',
              left: `${cx}%`, top: `${cy}%`,
              transform: `translate(-50%, -50%) translate(${p2x * (isArrived ? 0.5 : 0.3)}px, ${p2y * (isArrived ? 0.5 : 0.3)}px)`,
              cursor: isTransit ? 'default' : 'pointer',
              zIndex: isHovered ? 20 : 5,
            }}
            onClick={() => handleLetterClick(letter)}
            onMouseEnter={() => {
              setHoveredId(letter.id)
              setTooltip({ letter, x: cx, y: cy })
            }}
            onMouseLeave={() => { setHoveredId(null); setTooltip(null) }}
            onTouchStart={() => { setHoveredId(letter.id); setTooltip({ letter, x: cx, y: cy }) }}
            onTouchEnd={() => { setHoveredId(null); setTooltip(null) }}
          >
            <motion.div
              animate={isTransit ? { x: [0, driftX, 0], y: [0, driftY, 0] } : {}}
              transition={isTransit ? { duration: driftDur, repeat: Infinity, ease: 'easeInOut' } : {}}
            >
            {/* Glow aura */}
            <motion.div
              animate={isSent ? { opacity: [0.2, 0.5, 0.2], scale: [1, 1.22, 1] } : isArrived && isNew ? { opacity: [0.3, 0.7, 0.3], scale: [1, 1.3, 1] } : isArrived ? { opacity: [0.2, 0.45, 0.2] } : isPinned ? { opacity: [0.25, 0.55, 0.25] } : { opacity: 0.12 }}
              transition={{ duration: isSent ? 3.6 + sr(i * 7) * 1.5 : isNew ? 2.2 : 3.5, repeat: Infinity, ease: 'easeInOut', delay: sr(i * 7) * 2 }}
              style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: `${baseSize * 12}px`, height: `${baseSize * 12}px`, borderRadius: '50%', background: `radial-gradient(circle, rgba(${statusGlowRgb},0.5) 0%, rgba(${statusGlowRgb},0) 70%)`, pointerEvents: 'none' }}
            />

            {/* Hover ripple ring */}
            <AnimatePresence>
              {isHovered && !isTransit && (
                <motion.div
                  key="ripple"
                  initial={{ opacity: 0.75, scale: 0.5 }}
                  animate={{ opacity: 0, scale: 3.2 }}
                  exit={{}}
                  transition={{ duration: 0.65, ease: 'easeOut' }}
                  style={{
                    position: 'absolute', left: '50%', top: '50%',
                  width: `${baseSize * 6}px`, height: `${baseSize * 6}px`,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    border: `1px solid rgba(${statusGlowRgb},0.9)`,
                    pointerEvents: 'none',
                  }}
                />
              )}
            </AnimatePresence>

            {/* Comet tail for transit */}
            {isTransit && (
              <motion.div
                animate={{ opacity: [0.4, 0.8, 0.4], scaleX: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: sr(i * 5) * 1.5 }}
                style={{ position: 'absolute', right: `${baseSize}px`, top: '50%', transform: 'translateY(-50%)', width: `${20 + (letter.travelProgress ?? 50) * 0.4}px`, height: '2px', background: `linear-gradient(to left, rgba(${statusGlowRgb},0.7), transparent)`, borderRadius: '1px', pointerEvents: 'none', transformOrigin: 'right center' }}
              />
            )}

            {/* Star body */}
            <motion.div
              animate={isSent ? { scale: [1, 1.07, 1], opacity: [0.8, 0.97, 0.8] } : isPinned ? {} : isArrived ? { scale: [1, 1.15, 1], opacity: [0.9, 1, 0.9] } : isTransit ? { scale: [1, 1.06, 1] } : {}}
              transition={{ duration: isSent ? 3.2 + sr(i * 3) * 1.5 : isArrived ? 2.8 + sr(i * 3) * 1.5 : 1.4, repeat: Infinity, ease: 'easeInOut', delay: sr(i * 11) * 2 }}
              style={{
                width: `${isHovered && !isTransit ? baseSize * 2.4 : baseSize * 2}px`,
                height: `${isHovered && !isTransit ? baseSize * 2.4 : baseSize * 2}px`,
                borderRadius: '50%',
                background: isSent
                  ? `radial-gradient(circle, rgba(255,180,40,0.98) 0%, rgba(200,120,10,0.6) 45%, transparent 100%)`
                  : isPinned
                    ? `radial-gradient(circle, rgba(230,200,255,0.98) 0%, rgba(180,140,240,0.7) 45%, transparent 100%)`
                    : isTransit
                      ? `radial-gradient(circle, rgba(100,170,255,0.98) 0%, rgba(60,110,240,0.6) 50%, transparent 100%)`
                      : `radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(${RECEIVED_GLOW_RGB},0.75) 40%, transparent 100%)`,
                boxShadow: isHovered && !isTransit
                  ? `0 0 ${baseSize * 4}px rgba(${statusGlowRgb},0.95), 0 0 ${baseSize * 8}px rgba(${statusGlowRgb},0.4)`
                  : isSent
                    ? `0 0 ${baseSize * 2}px rgba(${SENT_GLOW_RGB},0.8), 0 0 ${baseSize * 5}px rgba(200,120,10,0.35)`
                    : isPinned
                      ? `0 0 ${baseSize * 2.5}px rgba(180,140,240,0.85), 0 0 ${baseSize * 5}px rgba(160,120,220,0.4)`
                      : isArrived
                        ? `0 0 ${baseSize * 2}px rgba(${RECEIVED_GLOW_RGB},0.6)`
                        : isTransit
                          ? `0 0 6px rgba(100,170,255,0.55)`
                          : 'none',
                transition: 'box-shadow 0.3s, width 0.2s, height 0.2s',
              }}
            />

            {/* 4-point diffraction spikes for arrived/pinned */}
            {!isSent && (isArrived || isPinned) && [0, 90].map(rot => (
              <div key={rot} style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                width: isHovered ? `${baseSize * 8}px` : `${isPinned ? baseSize * 5 : baseSize * 4}px`, height: '1px',
                background: isPinned
                  ? `linear-gradient(to right, transparent, rgba(180,140,240,${isHovered ? 0.85 : 0.65}), transparent)`
                  : `linear-gradient(to right, transparent, rgba(${RECEIVED_GLOW_RGB},${isHovered ? 0.85 : 0.4}), transparent)`,
                transition: 'width 0.3s', pointerEvents: 'none',
              }} />
            ))}
            {/* Extra 45° spikes for pinned */}
            {isPinned && [45, 135].map(rot => (
              <div key={rot} style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                width: isHovered ? `${baseSize * 6}px` : `${baseSize * 3.5}px`, height: '1px',
                background: `linear-gradient(to right, transparent, rgba(180,140,240,${isHovered ? 0.7 : 0.45}), transparent)`,
                transition: 'width 0.3s', pointerEvents: 'none',
              }} />
            ))}
            </motion.div>
          </motion.div>
        )
      })}

      {/* ── Tooltip ── */}
      <AnimatePresence>
        {tooltip && hoveredId && (
          <motion.div
            key={tooltip.letter.id + '-tip'}
            initial={{ opacity: 0, scale: 0.92, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.18 }}
            style={{
              position: 'absolute', left: `${tooltip.x}%`, top: `${tooltip.y}%`,
              transform: `translate(${tooltip.x > 68 ? 'calc(-100% - 18px)' : '18px'}, ${tooltip.y > 68 ? 'calc(-100% - 8px)' : '8px'})`,
              zIndex: 30, pointerEvents: 'none', maxWidth: '220px',
              padding: '12px 14px', borderRadius: '14px',
              background: 'rgba(8,5,18,0.94)', border: `1px solid rgba(${PAPER_COLORS[tooltip.letter.paperId]?.glow || '230,199,110'},0.3)`,
              backdropFilter: 'blur(16px)', boxShadow: '0 14px 40px rgba(0,0,0,0.65)',
            }}
          >
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em', color: `rgba(${PAPER_COLORS[tooltip.letter.paperId]?.glow || '230,199,110'},0.9)`, textTransform: 'uppercase', marginBottom: '5px' }}>
              {tooltip.letter.direction === 'received' ? `From · ${tooltip.letter.from}` : `To · ${tooltip.letter.to}`}
            </p>
            {tooltip.letter.status === 'transit' ? (
              <>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: `rgba(${TRANSIT_GLOW_RGB},0.6)`, lineHeight: 1.45, marginBottom: '6px' }}>still crossing the dark…</p>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.18em', color: `rgba(${TRANSIT_GLOW_RGB},0.45)`, textTransform: 'uppercase', marginBottom: '4px' }}>{tooltip.letter.travelProgress ?? 0}% of the way</p>
                {tooltip.letter.arrivedAt && <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: `rgba(${TRANSIT_GLOW_RGB},0.35)`, textTransform: 'uppercase' }}>Arriving · {formatObservatoryDate(tooltip.letter.arrivedAt)}</p>}
              </>
            ) : (
              <>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.45, marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {tooltip.letter.preview}
                </p>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>
                  {formatObservatoryDate(tooltip.letter.arrivedAt || tooltip.letter.sentAt)}
                </p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* ── Letter modal ── */}
      <AnimatePresence>
        {openLetter && (
          <LetterModal
            letter={openLetter} onClose={() => setOpenLetter(null)}
            onReply={name => { setOpenLetter(null); onWriteLetter?.(name) }}
            onPin={() => handlePin(openLetter)}
            onBurn={openLetter.burnAfterReading && openLetter.direction === 'received' ? () => handleBurnAndClose(openLetter) : undefined}
            onDeleteForEveryone={() => handleDeleteForEveryone(openLetter)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Stamps (preserved from original) ──
function ModalStamp({ id }: { id: string }) {
  const s = 48
  if (['moon-seal','rose-seal','emerald-seal','sapphire-seal','obsidian-seal','ivory-seal','sun-seal','star-seal'].includes(id)) {
    const sealColors: Record<string, [string, string]> = {
      'moon-seal':    ['#8b1a1a', '#9a2020'], 'rose-seal':    ['#8b1a4a', '#9a2060'],
      'emerald-seal': ['#1a6b30', '#207840'], 'sapphire-seal':['#1a3a8b', '#2040a0'],
      'obsidian-seal':['#111118', '#1a1a28'], 'ivory-seal':   ['#9a8a60', '#b09a70'],
      'sun-seal':     ['#8b6010', '#a07018'], 'star-seal':    ['#1a1a5a', '#22226a'],
    }
    const [bg, inner] = sealColors[id] || ['#8b1a1a', '#9a2020']
    if (id === 'sun-seal') return <svg width={s} height={s} viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill={bg}/><circle cx="30" cy="30" r="24" fill={inner}/>{[...Array(8)].map((_,i)=>{const a=(i/8)*Math.PI*2;return <line key={i} x1={30+Math.cos(a)*14} y1={30+Math.sin(a)*14} x2={30+Math.cos(a)*22} y2={30+Math.sin(a)*22} stroke="rgba(255,220,100,0.5)" strokeWidth="2" strokeLinecap="round"/>})}<circle cx="30" cy="30" r="10" fill="#c9a040"/></svg>
    if (id === 'star-seal') return <svg width={s} height={s} viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill={bg}/><circle cx="30" cy="30" r="24" fill={inner}/><polygon points="30,12 33,22 44,22 35,28 38,40 30,33 22,40 25,28 16,22 27,22" fill="rgba(200,200,255,0.7)"/></svg>
    return <svg width={s} height={s} viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill={bg}/><circle cx="30" cy="30" r="24" fill={inner}/><path d="M22 20 Q30 14 38 20 Q32 22 30 30 Q24 22 22 20Z" fill="rgba(255,220,200,0.7)"/><text x="30" y="45" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(255,200,180,0.7)" letterSpacing="1">SEALED</text></svg>
  }
  if (id === 'veilmore') return <svg width={s} height={s} viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="none" stroke="rgba(80,60,100,0.7)" strokeWidth="2"/><text x="40" y="36" textAnchor="middle" fontSize="9" fontFamily="serif" fill="rgba(80,60,100,0.85)" letterSpacing="2" fontWeight="bold">VEILMORE</text><text x="40" y="52" textAnchor="middle" fontSize="6" fontFamily="serif" fill="rgba(80,60,100,0.5)">BEYOND THE VEIL</text></svg>
  if (id === 'ashpoint') return <svg width={s} height={s} viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="none" stroke="rgba(60,30,20,0.7)" strokeWidth="2"/><text x="40" y="36" textAnchor="middle" fontSize="9" fontFamily="serif" fill="rgba(50,25,10,0.85)" letterSpacing="2" fontWeight="bold">ASHPOINT</text><text x="40" y="52" textAnchor="middle" fontSize="7" fontFamily="serif" fill="rgba(50,25,10,0.5)">BETWEEN WORLDS</text></svg>
  if (id === 'duskhollow') return <svg width={s} height={s} viewBox="0 0 80 80"><ellipse cx="40" cy="40" rx="36" ry="28" fill="none" stroke="rgba(40,20,60,0.7)" strokeWidth="2"/><text x="40" y="36" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(40,20,60,0.85)" letterSpacing="2" fontWeight="bold">DUSKHOLLOW</text><text x="40" y="54" textAnchor="middle" fontSize="6" fontFamily="serif" fill="rgba(40,20,60,0.5)">WHERE LETTERS REST</text></svg>
  if (id === 'evermore') return <svg width={s} height={s} viewBox="0 0 80 80"><rect x="2" y="2" width="76" height="76" fill="none" stroke="rgba(60,40,20,0.7)" strokeWidth="2" rx="4"/><text x="40" y="28" textAnchor="middle" fontSize="9" fontFamily="serif" fill="rgba(50,30,10,0.8)" letterSpacing="2" fontWeight="bold">EVERMORE</text><text x="40" y="48" textAnchor="middle" fontSize="7" fontFamily="serif" fill="rgba(60,30,10,0.6)">COSMIC POST</text></svg>
  if (id === 'gloomhaven') return <svg width={s} height={s} viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="none" stroke="rgba(30,20,50,0.7)" strokeWidth="2"/><text x="40" y="36" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(30,20,60,0.85)" letterSpacing="2" fontWeight="bold">GLOOMHAVEN</text><text x="40" y="52" textAnchor="middle" fontSize="7" fontFamily="serif" fill="rgba(40,20,60,0.5)">BETWEEN WORLDS</text></svg>
  if (id === 'stardrift') return <svg width={s} height={s} viewBox="0 0 80 80"><ellipse cx="40" cy="40" rx="36" ry="28" fill="none" stroke="rgba(20,30,70,0.7)" strokeWidth="2"/><text x="40" y="36" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(20,30,80,0.85)" letterSpacing="2" fontWeight="bold">STARDRIFT</text><text x="40" y="54" textAnchor="middle" fontSize="6" fontFamily="serif" fill="rgba(20,30,70,0.5)">CARRIED BY LIGHT</text></svg>
  if (id === 'compass') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(200,170,100,0.15)" stroke="rgba(120,80,20,0.6)" strokeWidth="1.5" rx="2"/><circle cx="30" cy="28" r="16" fill="none" stroke="rgba(100,60,10,0.5)" strokeWidth="1"/><line x1="30" y1="14" x2="30" y2="42" stroke="rgba(100,60,10,0.4)" strokeWidth="1"/><line x1="16" y1="28" x2="44" y2="28" stroke="rgba(100,60,10,0.4)" strokeWidth="1"/><polygon points="30,14 28,24 32,24" fill="rgba(140,20,20,0.7)"/><circle cx="30" cy="28" r="3" fill="rgba(100,60,10,0.6)"/></svg>
  if (id === 'feather') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(200,230,200,0.15)" stroke="rgba(60,100,60,0.5)" strokeWidth="1.5" rx="2"/><path d="M30 10 C 45 15 50 30 30 50 C 20 35 15 20 30 10Z" fill="rgba(100,150,100,0.3)" stroke="rgba(60,100,60,0.5)" strokeWidth="1"/><line x1="30" y1="10" x2="30" y2="50" stroke="rgba(60,100,60,0.5)" strokeWidth="1.5"/></svg>
  if (id === 'cat') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(255,220,240,0.2)" stroke="rgba(220,120,160,0.5)" strokeWidth="1.5" rx="2"/><circle cx="30" cy="32" r="16" fill="rgba(255,200,220,0.35)" stroke="rgba(220,120,160,0.5)" strokeWidth="1.5"/><polygon points="16,20 22,10 28,20" fill="rgba(255,200,220,0.6)" stroke="rgba(220,120,160,0.5)" strokeWidth="1"/><polygon points="32,20 38,10 44,20" fill="rgba(255,200,220,0.6)" stroke="rgba(220,120,160,0.5)" strokeWidth="1"/><ellipse cx="24" cy="30" rx="3" ry="3.5" fill="rgba(70,30,90,0.7)"/><ellipse cx="36" cy="30" rx="3" ry="3.5" fill="rgba(70,30,90,0.7)"/><polygon points="30,34 28,37 32,37" fill="rgba(255,100,140,0.7)"/></svg>
  if (id === 'heart') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(255,200,220,0.15)" stroke="rgba(220,100,140,0.5)" strokeWidth="1.5" rx="2"/><path d="M30 44 C10 30 12 14 22 14 C26 14 30 18 30 18 C30 18 34 14 38 14 C48 14 50 30 30 44Z" fill="rgba(220,80,120,0.5)" stroke="rgba(200,60,100,0.65)" strokeWidth="1.5"/></svg>
  if (id === 'shooting-star') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(15,8,35,0.5)" stroke="rgba(200,180,240,0.5)" strokeWidth="1.5" rx="2"/><line x1="6" y1="52" x2="38" y2="20" stroke="rgba(255,250,220,0.55)" strokeWidth="1.5" strokeLinecap="round"/><polygon points="40,18 42,24 48,24 43,28 45,34 40,30 35,34 37,28 32,24 38,24" fill="rgba(255,240,180,0.9)"/></svg>
  return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="none" stroke="rgba(200,168,76,0.5)" strokeWidth="1.5" rx="3"/><text x="30" y="34" textAnchor="middle" fontSize="18" fill="rgba(200,168,76,0.7)">✦</text></svg>
}

function ModalEnvelope({ id }: { id: string }) {
  const w = 90, h = 60
  if (id === 'vintage') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="2" fill="#f2e8c8" stroke="rgba(120,80,20,0.55)" strokeWidth="1.2"/><path d="M2 20 L60 56 L118 20 Z" fill="#ede0b8" stroke="rgba(120,80,20,0.45)" strokeWidth="1"/><path d="M2 78 L60 46 L118 78" fill="none" stroke="rgba(120,80,20,0.28)" strokeWidth="0.8"/></svg>
  if (id === 'airmail') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="2" width="116" height="76" rx="2" fill="#f8f5ee" stroke="#cc3333" strokeWidth="3"/><path d="M2 20 L60 54 L118 20 Z" fill="#f5f1e8" stroke="#bb3322" strokeWidth="0.8"/><text x="60" y="68" textAnchor="middle" fontSize="7" fontFamily="sans-serif" fill="#1144aa" letterSpacing="2" fontStyle="italic">PAR AVION</text></svg>
  if (id === 'sakura') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="2" fill="#fde8f0" stroke="rgba(200,100,140,0.45)" strokeWidth="1"/><path d="M2 20 L60 56 L118 20 Z" fill="#fde0ec" stroke="rgba(200,100,140,0.35)" strokeWidth="0.8"/></svg>
  if (id === 'starfield') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="2" fill="#1a1830" stroke="rgba(150,140,220,0.4)" strokeWidth="1"/><path d="M2 20 L60 56 L118 20 Z" fill="#1c1a38" stroke="rgba(150,140,220,0.32)" strokeWidth="0.8"/>{[[14,34],[28,28],[44,42],[68,30],[84,38],[100,26],[56,60]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r="0.9" fill="rgba(220,210,255,0.85)"/>)}</svg>
  if (id === 'kraft') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="2" fill="#c8924a" stroke="rgba(80,40,10,0.5)" strokeWidth="1.2"/><path d="M2 20 L60 56 L118 20 Z" fill="#be8840" stroke="rgba(80,40,10,0.4)" strokeWidth="1"/></svg>
  if (id === 'romantic') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="2" fill="#fce8ee" stroke="rgba(200,80,120,0.4)" strokeWidth="1"/><path d="M60 46 C56 42 51 40 51 43.5 C51 47 55 50 60 54 C65 50 69 47 69 43.5 C69 40 64 42 60 46Z" fill="rgba(200,70,110,0.58)"/></svg>
  if (id === 'wax') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="2" width="116" height="76" rx="2" fill="#f4eedd" stroke="rgba(100,80,40,0.4)" strokeWidth="1.2"/><circle cx="60" cy="42" r="11" fill="#8b1a1a"/><text x="60" y="46" textAnchor="middle" fontSize="9" fill="rgba(255,200,180,0.8)" fontFamily="serif">✦</text></svg>
  return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="3" fill="rgba(230,199,110,0.15)" stroke="rgba(230,199,110,0.45)" strokeWidth="1"/><path d="M2 20 L60 56 L118 20 Z" fill="rgba(230,199,110,0.12)" stroke="rgba(230,199,110,0.35)" strokeWidth="1"/></svg>
}

function LetterModal({ letter, onClose, onReply, onPin, onBurn, onDeleteForEveryone }: {
  letter: Letter; onClose: () => void; onReply?: (name: string) => void; onPin?: () => void; onBurn?: () => void; onDeleteForEveryone?: () => void
  // onPin toggles pin/unpin
}) {
  const colors = PAPER_COLORS[letter.paperId] || PAPER_COLORS.ornate
  const bodyFont = (letter.fontId && FONT_FAMILIES[letter.fontId]) || "'Cormorant Garamond', serif"
  const paperBg = letter.paperColor ? (PAPER_TONES.find(t => t.id === letter.paperColor)?.bg ?? undefined) : undefined
  const defaultInk = PAPER_INK[letter.paperId]?.main ?? '#180e04'
  const bodyColor = (letter.fontColor && FONT_COLOR_MAP[letter.fontColor]) ? FONT_COLOR_MAP[letter.fontColor] : defaultInk
  const writingStyle = getHandwritingStyleStyles(letter.handwritingStyle || 'typed')
  const isReceivedLetter = letter.direction === 'received' && (letter.status === 'arrived' || letter.status === 'pinned')
  const isBurnReceived = isReceivedLetter && !!letter.burnAfterReading
  const [burnConfirmed, setBurnConfirmed] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isPlayingVoice, setIsPlayingVoice] = useState(false)
  const [openPhase, setOpenPhase] = useState<'warning' | 'envelope' | 'letter'>(
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

  async function handlePlayVoiceNote() {
    if (!letter.voiceNoteUrl || isPlayingVoice) return
    setIsPlayingVoice(true)
    try { await playAudioWithEffect(letter.voiceNoteUrl, letter.voiceEffect || 'raw', () => setIsPlayingVoice(false)) }
    catch { setIsPlayingVoice(false) }
  }

  return (
    <motion.div data-no-pan="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,5,0.88)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: 'clamp(10px, 2vw, 20px)' }}>
      {openPhase === 'warning' && isBurnReceived && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', textAlign: 'center', padding: '20px', maxWidth: '320px' }}>
          <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} style={{ fontSize: '52px', filter: 'drop-shadow(0 0 20px rgba(255,80,40,0.7))' }}>🔥</motion.div>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.35em', color: '#e87060', textTransform: 'uppercase' }}>Burn After Reading</p>
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '15px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.75 }}>This letter will be destroyed once you read it.<br />There is no going back.</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => { setBurnConfirmed(true); setOpenPhase('envelope'); playWaxSeal(); setTimeout(() => setOpenPhase('letter'), 1600) }} style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: '#e87060', padding: '10px 20px', border: '1px solid rgba(220,60,40,0.55)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,60,40,0.1)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>Open & Destroy ✶</button>
            <button onClick={onClose} style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.45)', padding: '10px 20px', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }} onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.72)' }} onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}>Keep Sealed</button>
          </div>
        </motion.div>
      )}
      {openPhase === 'envelope' && isReceivedLetter && (
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} style={{ opacity: 0.9 }}>
            <svg width="160" height="110" viewBox="0 0 120 80">
              <rect x="2" y="20" width="116" height="58" rx="3" fill={`${colors.accent}18`} stroke={`${colors.accent}60`} strokeWidth="1.2"/>
              <motion.path d="M2 20 L60 56 L118 20 Z" initial={{ d: 'M2 20 L60 56 L118 20 Z' }} animate={{ d: ['M2 20 L60 56 L118 20 Z', 'M2 20 L60 6 L118 20 Z'] }} transition={{ duration: 1.2, ease: 'easeInOut' }} fill={`${colors.accent}15`} stroke={`${colors.accent}45`} strokeWidth="1"/>
              <path d="M2 78 L60 46 L118 78" fill="none" stroke={`${colors.accent}30`} strokeWidth="1"/>
            </svg>
          </motion.div>
          <motion.p animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.4em', color: colors.accent, textTransform: 'uppercase' }}>Breaking the seal...</motion.p>
        </motion.div>
      )}
      {(openPhase === 'letter' || !isReceivedLetter) && (
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.35 }} onClick={e => e.stopPropagation()} style={{ width: 'min(600px, 92vw)', maxHeight: '80vh', overflowY: 'auto', borderRadius: '3px', boxShadow: `0 16px 60px rgba(0,0,0,0.9), 0 0 40px ${colors.accent}20`, position: 'relative' }}>
          <button onClick={handleClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', opacity: 0.6, color: defaultInk, zIndex: 10 }} onMouseEnter={e => { e.currentTarget.style.opacity = '0.95' }} onMouseLeave={e => { e.currentTarget.style.opacity = '0.6' }}>×</button>
          {renderLetterPaper(letter.paperId, paperBg, (
            <div style={{ position: 'relative' }}>
              {renderLetterEmbellishment(letter.embellishmentId, colors.accent, 'read')}
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: colors.accent, textTransform: 'uppercase', marginBottom: '20px', opacity: 0.88 }}>{letter.direction === 'received' ? `From · ${letter.from}` : `To · ${letter.to}`}</p>
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '11px', opacity: 0.76, marginBottom: '20px', color: bodyColor }}>{new Date(letter.arrivedAt || letter.sentAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p style={{ fontFamily: bodyFont, fontSize: '17px', fontStyle: 'italic', color: bodyColor, opacity: 0.9, marginBottom: '16px', lineHeight: 1.8 }}>{letter.direction === 'received' ? (letter.isUniverseLetter ? 'Dear Stranger,' : `Dear ${letter.to},`) : `Dear ${letter.to},`}</p>
              {letter.handwritingStyle === 'handwritten' && letter.handwrittenImageUrl ? (
                <div style={{ margin: '16px 0' }}>
                  <img src={letter.handwrittenImageUrl} alt="Handwritten letter" style={{ width: '100%', height: 'auto', borderRadius: '4px' }} />
                </div>
              ) : (
                letter.body.split('\n\n— ✦ —\n\n').map((page, i, arr) => (
                <div key={i} style={writingStyle}>
                  <p style={{ fontFamily: bodyFont, fontSize: 'clamp(15px,2vw,18px)', lineHeight: 2, letterSpacing: '0.02em', color: bodyColor, opacity: 0.98, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{page}</p>
                  {i < arr.length - 1 && <div style={{ textAlign: 'center', margin: '24px 0', opacity: 0.4 }}><span style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.4em', color: colors.accent }}>— ✦ —</span></div>}
                </div>
                ))
              )}
              {letter.voiceNoteUrl && (
                <div style={{ marginTop: '22px', padding: '14px 16px', border: `1px solid ${colors.accent}30`, borderRadius: '6px', background: 'rgba(10,10,24,0.18)' }}>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.28em', color: colors.accent, textTransform: 'uppercase', margin: '0 0 6px' }}>Voice Note</p>
                  <button onClick={handlePlayVoiceNote} disabled={isPlayingVoice} style={{ background: 'transparent', border: `1px solid ${colors.accent}70`, color: colors.accent, fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', padding: '8px 14px', cursor: isPlayingVoice ? 'default' : 'pointer', borderRadius: '2px', opacity: isPlayingVoice ? 0.6 : 1 }}>{isPlayingVoice ? 'Playing...' : 'Play Voice Note'}</button>
                </div>
              )}
              <p style={{ fontFamily: bodyFont, fontStyle: 'italic', fontSize: '15px', color: bodyColor, opacity: 0.86, marginTop: '24px', lineHeight: 1.9 }}>With presence,<br /><span style={{ color: colors.accent, opacity: 0.95 }}>{letter.direction === 'received' && !letter.isUniverseLetter && letter.from ? letter.from : 'A Stranger'}</span></p>
              {(letter.stampId || letter.envelopeId) && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: '12px', marginTop: '16px', opacity: 0.85 }}>
                  {letter.envelopeId && <ModalEnvelope id={letter.envelopeId} />}
                  {letter.stampId && <ModalStamp id={letter.stampId} />}
                </div>
              )}
            </div>
          ))}
          {letter.direction === 'received' && (
            <div style={{ padding: 'clamp(10px, 2vw, 16px) clamp(14px, 3vw, 28px) clamp(12px, 2.5vw, 20px)', background: 'rgba(0,0,8,0.97)', borderTop: `1px solid ${colors.accent}38`, display: 'flex', gap: 'clamp(8px, 1.5vw, 12px)', flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => onReply?.(letter.from || '')} style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: colors.accent, padding: '10px 24px', border: `1px solid ${colors.accent}70`, borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }} onMouseEnter={e => { e.currentTarget.style.background = `${colors.accent}12`; e.currentTarget.style.boxShadow = `0 0 20px ${colors.accent}20` }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none' }}>Reply ✦</button>
              <button onClick={onPin} style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.45)', padding: '10px 24px', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }} onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.72)' }} onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}>{letter.status === 'pinned' ? '★ Pinned' : '☆ Pin'}</button>
              <div style={{ marginLeft: 'auto' }}>
                {deleteConfirm ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Delete for everyone?</span>
                    <button onClick={() => { setDeleteConfirm(false); onDeleteForEveryone?.() }} style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.22em', color: 'rgba(220,80,80,0.9)', padding: '7px 14px', border: '1px solid rgba(220,80,80,0.45)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }}>Confirm</button>
                    <button onClick={() => setDeleteConfirm(false)} style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.35)', padding: '7px 14px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(true)} style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.22em', color: 'rgba(200,60,60,0.45)', padding: '7px 14px', border: '1px solid rgba(200,60,60,0.15)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = 'rgba(220,80,80,0.85)'; e.currentTarget.style.borderColor = 'rgba(220,80,80,0.4)' }} onMouseLeave={e => { e.currentTarget.style.color = 'rgba(200,60,60,0.45)'; e.currentTarget.style.borderColor = 'rgba(200,60,60,0.15)' }}>Delete for Everyone</button>
                )}
              </div>
            </div>
          )}
          {letter.direction === 'sent' && letter.status === 'arrived' && (
            <div style={{ padding: 'clamp(10px, 2vw, 16px) clamp(14px, 3vw, 28px) clamp(12px, 2.5vw, 20px)', background: 'rgba(0,0,8,0.97)', borderTop: `1px solid ${colors.accent}38`, display: 'flex', gap: 'clamp(8px, 1.5vw, 12px)', alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={onPin} style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.45)', padding: '10px 24px', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }} onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.72)' }} onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}>{'☆ Pin'}</button>
              <div style={{ marginLeft: 'auto' }}>
                {deleteConfirm ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Delete for everyone?</span>
                    <button onClick={() => { setDeleteConfirm(false); onDeleteForEveryone?.() }} style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.22em', color: 'rgba(220,80,80,0.9)', padding: '7px 14px', border: '1px solid rgba(220,80,80,0.45)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }}>Confirm</button>
                    <button onClick={() => setDeleteConfirm(false)} style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.35)', padding: '7px 14px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(true)} style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.22em', color: 'rgba(200,60,60,0.45)', padding: '7px 14px', border: '1px solid rgba(200,60,60,0.15)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = 'rgba(220,80,80,0.85)'; e.currentTarget.style.borderColor = 'rgba(220,80,80,0.4)' }} onMouseLeave={e => { e.currentTarget.style.color = 'rgba(200,60,60,0.45)'; e.currentTarget.style.borderColor = 'rgba(200,60,60,0.15)' }}>Delete for Everyone</button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
