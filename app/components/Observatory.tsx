'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getMyLetters } from '../lib/auth'

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
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
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

  useEffect(() => {
    async function loadLetters() {
      try {
        setLoading(true)
        const data = await getMyLetters()

        const mapSentLetter = (l: any): Letter => {
          const createdMs = new Date(l.created_at).getTime()
          const arrivesMs = l.arrives_at ? new Date(l.arrives_at).getTime() : createdMs
          const nowMs = Date.now()
          const totalMs = arrivesMs - createdMs
          const rawProgress = totalMs > 0 ? ((nowMs - createdMs) / totalMs) * 100 : 100
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
            sentAt: l.created_at,
            arrivedAt: l.arrives_at || undefined,
            status: l.status,
            direction: 'sent',
            travelProgress: l.status === 'transit' ? clamp(Math.floor(rawProgress), 0, 100) : undefined,
          }
        }

        const mapReceivedLetter = (l: any): Letter => {
          const createdMs = new Date(l.created_at).getTime()
          const arrivesMs = l.arrives_at ? new Date(l.arrives_at).getTime() : createdMs
          const nowMs = Date.now()
          const totalMs = arrivesMs - createdMs
          const rawProgress = totalMs > 0 ? ((nowMs - createdMs) / totalMs) * 100 : 100
          // Client-side: if arrives_at has passed, treat as arrived even if DB hasn't updated yet
          const effectiveStatus = (l.status === 'transit' && l.arrives_at && nowMs >= arrivesMs) ? 'arrived' : l.status
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
            sentAt: l.created_at,
            arrivedAt: l.arrives_at || undefined,
            status: effectiveStatus as Letter['status'],
            direction: 'received',
            travelProgress: effectiveStatus === 'transit' ? clamp(Math.floor(rawProgress), 0, 100) : undefined,
          }
        }

        const userId = data.userId
        const mapLetter = (l: any): Letter =>
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
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,5,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 70, overflowY: 'auto',
        padding: '80px 20px 120px',
      }}
    >
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 50% 40% at 15% 25%, rgba(30,15,70,0.2) 0%, transparent 65%), radial-gradient(ellipse 40% 50% at 85% 75%, rgba(8,20,60,0.18) 0%, transparent 65%)` }} />

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

      <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 300, letterSpacing: '0.4em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '10px', textShadow: '0 0 10px rgba(230,199,110,0.22)' }}>
            The Observatory
          </p>
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '15px', color: 'rgba(255,255,255,0.82)', letterSpacing: '0.06em' }}>
            letters in motion, letters at rest
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ display: 'flex', background: 'rgba(10,12,30,0.68)', border: '1px solid rgba(230,199,110,0.16)', borderRadius: '4px', overflow: 'hidden', marginBottom: '32px' }}>
          {tabs.map((tab, i) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ flex: 1, padding: '14px 8px', background: activeTab === tab.id ? 'rgba(230,199,110,0.1)' : 'transparent', border: 'none', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none', cursor: 'pointer', transition: 'background 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: activeTab === tab.id ? '#e6c76e' : 'rgba(255,255,255,0.72)', transition: 'color 0.3s' }}>
                {tab.label}
              </span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', color: activeTab === tab.id ? 'rgba(230,199,110,0.82)' : 'rgba(255,255,255,0.55)', transition: 'color 0.3s' }}>
                {tab.count} {tab.count === 1 ? 'letter' : 'letters'}
              </span>
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '16px', color: 'rgba(255,255,255,0.75)' }}>loading letters...</p>
              </div>
            ) : currentLetters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '16px', color: 'rgba(255,255,255,0.75)' }}>
                  {activeTab === 'transit' && 'No letters traveling at the moment.'}
                  {activeTab === 'arrived' && 'No letters have arrived yet.'}
                  {activeTab === 'archive' && 'Your archive is empty.'}
                </p>
              </div>
            ) : (() => {
              const sentLetters = currentLetters.filter(l => l.direction === 'sent')
              const receivedLetters = currentLetters.filter(l => l.direction === 'received')
              const isClickable = (l: Letter) => l.status !== 'transit'
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {receivedLetters.length > 0 && (
                    <div>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.35em', color: 'rgba(230,199,110,0.6)', textTransform: 'uppercase', marginBottom: '10px' }}>
                        {activeTab === 'transit' ? 'Incoming' : 'Received'}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {receivedLetters.map((letter, i) => (
                          <LetterEntry key={letter.id} letter={letter} index={i}
                            onClick={() => isClickable(letter) && setOpenLetter(letter)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {sentLetters.length > 0 && (
                    <div>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.35em', color: 'rgba(230,199,110,0.6)', textTransform: 'uppercase', marginBottom: '10px' }}>
                        {activeTab === 'transit' ? 'Sending' : 'Sent'}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {sentLetters.map((letter, i) => (
                          <LetterEntry key={letter.id} letter={letter} index={i}
                            onClick={() => isClickable(letter) && setOpenLetter(letter)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {openLetter && (
          <LetterModal letter={openLetter} onClose={() => setOpenLetter(null)}
            onReply={name => { setOpenLetter(null); onWriteLetter?.(name) }} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function LetterEntry({ letter, index, onClick }: { letter: Letter; index: number; onClick: () => void }) {
  const colors = PAPER_COLORS[letter.paperId] || PAPER_COLORS.ornate
  const isTransit = letter.status === 'transit'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        padding: '18px 20px',
        background: colors.bg,
        border: `1.5px solid ${isTransit ? 'rgba(230,199,110,0.28)' : 'rgba(255,255,255,0.18)'}`,
        borderRadius: '4px',
        cursor: isTransit ? 'default' : 'pointer',
        transition: 'background 0.2s',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isTransit ? `0 2px 8px ${colors.accent}22` : `0 1px 6px #0002`,
      }}
      whileHover={!isTransit ? ({ backgroundColor: 'rgba(255,255,255,0.07)' } as never) : {}}
    >
      <div style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0, marginTop: '2px', opacity: isTransit ? 0.85 : letter.status === 'archive' ? 0.7 : 1, filter: isTransit ? 'none' : `drop-shadow(0 0 4px ${colors.accent}80)` }}>
        {isTransit ? '✦' : '📜'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '5px' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.18em', color: colors.accent, textTransform: 'uppercase', textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}>
            {letter.direction === 'received' ? `From · ${letter.from}` : `To · ${letter.to}`}
          </p>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.82)', whiteSpace: 'nowrap', flexShrink: 0, textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}>
            {isTransit ? 'traveling' : letter.arrivedAt || letter.sentAt}
          </p>
        </div>

        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.92)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}>
          {letter.preview}
        </p>

        {isTransit && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.82)', textTransform: 'uppercase', textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}>In transit</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.15em', color: 'rgba(230,199,110,0.95)', textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}>{letter.travelProgress ?? 0}%</span>
            </div>
            <div style={{ height: '2px', background: 'rgba(255,255,255,0.14)', borderRadius: '1px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${letter.travelProgress ?? 0}%`, background: `linear-gradient(90deg, transparent, ${colors.accent})` }} />
              <motion.div
                animate={{ left: ['0%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                style={{ position: 'absolute', top: 0, bottom: 0, width: '40px', background: `linear-gradient(90deg, transparent, ${colors.accent}cc, transparent)`, filter: 'blur(2px)' }}
              />
            </div>
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
}: {
  letter: Letter
  onClose: () => void
  onReply?: (name: string) => void
}) {
  const colors = PAPER_COLORS[letter.paperId] || PAPER_COLORS.ornate
  const bodyFont = (letter.fontId && FONT_FAMILIES[letter.fontId]) || "'Cormorant Garamond', serif"
  const bodyColor = (letter.fontColor && FONT_COLOR_MAP[letter.fontColor])
    ? `color-mix(in srgb, ${FONT_COLOR_MAP[letter.fontColor]} 85%, rgba(255,255,255,0.7))`
    : 'rgba(255,255,255,0.94)'
  const ps: CSSProperties = {
    background: 'linear-gradient(180deg, rgba(18,16,24,0.96), rgba(10,8,14,0.98))',
    border: `1px solid ${colors.accent}45`,
    color: 'rgba(255,255,255,0.94)',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,5,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: '20px' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.35 }}
        onClick={e => e.stopPropagation()}
        style={{ ...ps, width: 'min(600px, 92vw)', maxHeight: '80vh', overflowY: 'auto', borderRadius: '3px', padding: 'clamp(32px,5vw,56px) clamp(28px,6vw,60px)', boxShadow: `0 16px 60px rgba(0,0,0,0.9), 0 0 40px ${colors.accent}20`, position: 'relative' }}
      >
        <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: `linear-gradient(90deg, transparent, ${colors.accent}60, transparent)` }} />

        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: colors.accent, textTransform: 'uppercase', marginBottom: '20px', opacity: 0.88 }}>
          {letter.direction === 'received' ? `From · ${letter.from}` : `To · ${letter.to}`}
        </p>

        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '11px', opacity: 0.76, marginBottom: '20px' }}>
          {new Date(letter.arrivedAt || letter.sentAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <p style={{ fontFamily: bodyFont, fontSize: '17px', fontStyle: 'italic', color: bodyColor, opacity: 0.9, marginBottom: '16px', lineHeight: 1.8 }}>
          {letter.direction === 'received' ? 'Dear Stranger,' : `Dear ${letter.to},`}
        </p>

        {letter.body.split('\n\n— ✦ —\n\n').map((page, i, arr) => (
          <div key={i}>
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

        <p style={{ fontFamily: bodyFont, fontStyle: 'italic', fontSize: '15px', color: bodyColor, opacity: 0.86, marginTop: '24px', lineHeight: 1.9 }}>
          With presence,<br />
          <span style={{ color: colors.accent, opacity: 0.95 }}>A Stranger</span>
        </p>

        {(letter.stampId || letter.envelopeId) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: '12px', marginTop: '16px', opacity: 0.85 }}>
            {letter.envelopeId && <ModalEnvelope id={letter.envelopeId} />}
            {letter.stampId && <ModalStamp id={letter.stampId} />}
          </div>
        )}

        {letter.direction === 'received' && (
          <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: `1px solid ${colors.accent}38` }}>
            <button
              onClick={() => onReply?.(letter.from || '')}
              style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: colors.accent, padding: '10px 24px', border: `1px solid ${colors.accent}70`, borderRadius: '2px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = `${colors.accent}12`; e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.boxShadow = `0 0 20px ${colors.accent}20` }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${colors.accent}70`; e.currentTarget.style.boxShadow = 'none' }}
            >
              Reply ✦
            </button>
          </div>
        )}

        <div style={{ position: 'absolute', bottom: 0, left: '15%', right: '15%', height: '1px', background: `linear-gradient(90deg, transparent, ${colors.accent}40, transparent)` }} />

        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', opacity: 0.6, transition: 'opacity 0.2s', color: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.95' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.6' }}
        >
          ×
        </button>
      </motion.div>
    </motion.div>
  )
}
