'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getMyLetters } from '../lib/auth'

interface Letter {
  id: string
  from?: string
  to?: string
  preview: string
  body: string
  paperId: string
  sentAt: string
  arrivedAt?: string
  status: 'transit' | 'arrived' | 'archive'
  travelProgress?: number
  direction: 'sent' | 'received'
}

const PAPER_COLORS: Record<string, { accent: string; bg: string }> = {
  parchment: { accent: '#c9a84c', bg: 'rgba(200,160,80,0.08)' },
  midnight: { accent: '#6688cc', bg: 'rgba(80,110,200,0.08)' },
  scroll: { accent: '#a07840', bg: 'rgba(160,120,60,0.08)' },
  ivory: { accent: '#aaaaaa', bg: 'rgba(200,200,200,0.06)' },
  starfield: { accent: '#c9a84c', bg: 'rgba(201,168,76,0.06)' },
  ember: { accent: '#cc6622', bg: 'rgba(200,80,30,0.08)' },
  vellum: { accent: '#8899ff', bg: 'rgba(130,150,255,0.07)' },
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
  }>({
    transit: [],
    arrived: [],
    archive: [],
  })
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
            preview: l.body
              ? l.body.length > 90
                ? `${l.body.slice(0, 90)}...`
                : l.body
              : '',
            body: l.body || '',
            paperId: l.paper_id || 'parchment',
            sentAt: l.created_at,
            arrivedAt: l.arrives_at || undefined,
            status: l.status,
            direction: 'sent',
            travelProgress:
              l.status === 'transit' ? clamp(Math.floor(rawProgress), 0, 100) : undefined,
          }
        }

        const mapReceivedLetter = (l: any): Letter => ({
          id: l.id,
          from: l.sender?.hub_name || 'Unknown Sender',
          to: l.recipient?.hub_name || 'You',
          preview: l.body
            ? l.body.length > 90
              ? `${l.body.slice(0, 90)}...`
              : l.body
            : '',
          body: l.body || '',
          paperId: l.paper_id || 'parchment',
          sentAt: l.created_at,
          arrivedAt: l.arrives_at || undefined,
          status: l.status,
          direction: 'received',
        })

        setLetters({
          transit: (data.transit || []).map(mapSentLetter),
          arrived: (data.arrived || []).map((l: any) =>
            l.recipient?.hub_name ? mapReceivedLetter(l) : mapSentLetter(l)
          ),
          archive: (data.archive || []).map((l: any) =>
            l.recipient?.hub_name ? mapReceivedLetter(l) : mapSentLetter(l)
          ),
        })
      } catch (err) {
        console.error('Failed to load letters:', err)
        setLetters({
          transit: [],
          arrived: [],
          archive: [],
        })
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
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,5,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 70,
        overflowY: 'auto',
        padding: '80px 20px 120px',
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background: `
          radial-gradient(ellipse 50% 40% at 15% 25%, rgba(30,15,70,0.2) 0%, transparent 65%),
          radial-gradient(ellipse 40% 50% at 85% 75%, rgba(8,20,60,0.18) 0%, transparent 65%)
        `,
        }}
      />

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${Math.random() * 1.2 + 0.3}px`,
              height: `${Math.random() * 1.2 + 0.3}px`,
              borderRadius: '50%',
              background: `rgba(255,255,255,${Math.random() * 0.3 + 0.05})`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '28px',
          right: '28px',
          background: 'none',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.25)',
          fontFamily: "'Cinzel', serif",
          fontSize: '9px',
          letterSpacing: '0.3em',
          padding: '8px 16px',
          cursor: 'pointer',
          textTransform: 'uppercase',
          zIndex: 80,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.25)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
        }}
      >
        ← Universe
      </motion.button>

      <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: '48px' }}
        >
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(20px, 3vw, 28px)',
              fontWeight: 300,
              letterSpacing: '0.4em',
              color: '#c9a84c',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
          >
            The Observatory
          </p>
          <p
            style={{
              fontFamily: "'IM Fell English', serif",
              fontStyle: 'italic',
              fontSize: '15px',
              color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.06em',
            }}
          >
            letters in motion, letters at rest
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            display: 'flex',
            gap: '0',
            background: 'rgba(10,12,30,0.6)',
            border: '1px solid rgba(201,168,76,0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
            marginBottom: '32px',
          }}
        >
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '14px 8px',
                background: activeTab === tab.id ? 'rgba(201,168,76,0.08)' : 'transparent',
                border: 'none',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.3s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '10px',
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  color: activeTab === tab.id ? '#c9a84c' : 'rgba(255,255,255,0.3)',
                  transition: 'color 0.3s',
                }}
              >
                {tab.label}
              </span>
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '9px',
                  color:
                    activeTab === tab.id
                      ? 'rgba(201,168,76,0.6)'
                      : 'rgba(255,255,255,0.15)',
                  transition: 'color 0.3s',
                }}
              >
                {tab.count} {tab.count === 1 ? 'letter' : 'letters'}
              </span>
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p
                  style={{
                    fontFamily: "'IM Fell English', serif",
                    fontStyle: 'italic',
                    fontSize: '16px',
                    color: 'rgba(255,255,255,0.2)',
                  }}
                >
                  loading letters...
                </p>
              </div>
            ) : currentLetters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p
                  style={{
                    fontFamily: "'IM Fell English', serif",
                    fontStyle: 'italic',
                    fontSize: '16px',
                    color: 'rgba(255,255,255,0.2)',
                  }}
                >
                  {activeTab === 'transit' && 'No letters traveling at the moment.'}
                  {activeTab === 'arrived' && 'No letters have arrived yet.'}
                  {activeTab === 'archive' && 'Your archive is empty.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentLetters.map((letter, i) => (
                  <LetterEntry
                    key={letter.id}
                    letter={letter}
                    index={i}
                    onClick={() => letter.status !== 'transit' && setOpenLetter(letter)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {openLetter && (
          <LetterModal
            letter={openLetter}
            onClose={() => setOpenLetter(null)}
            onReply={(name) => {
              setOpenLetter(null)
              onWriteLetter?.(name)
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function LetterEntry({
  letter,
  index,
  onClick,
}: {
  letter: Letter
  index: number
  onClick: () => void
}) {
  const colors = PAPER_COLORS[letter.paperId] || PAPER_COLORS.parchment
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
        border: `1px solid ${
          isTransit ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.05)'
        }`,
        borderRadius: '2px',
        cursor: isTransit ? 'default' : 'pointer',
        transition: 'background 0.2s, border-color 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      whileHover={!isTransit ? ({ backgroundColor: 'rgba(255,255,255,0.03)' } as never) : {}}
    >
      <div
        style={{
          fontSize: '18px',
          lineHeight: 1,
          flexShrink: 0,
          marginTop: '2px',
          opacity: isTransit ? 0.5 : letter.status === 'archive' ? 0.4 : 1,
          filter: isTransit ? 'none' : `drop-shadow(0 0 4px ${colors.accent}60)`,
        }}
      >
        {isTransit ? '✦' : '📜'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '5px',
          }}
        >
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '11px',
              letterSpacing: '0.18em',
              color: colors.accent,
              textTransform: 'uppercase',
            }}
          >
            {letter.direction === 'received' ? `From · ${letter.from}` : `To · ${letter.to}`}
          </p>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '9px',
              letterSpacing: '0.15em',
              color: 'rgba(255,255,255,0.18)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {isTransit ? 'traveling' : letter.arrivedAt || letter.sentAt}
          </p>
        </div>

        <p
          style={{
            fontFamily: "'IM Fell English', serif",
            fontStyle: 'italic',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {letter.preview}
        </p>

        {isTransit && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '8px',
                  letterSpacing: '0.2em',
                  color: 'rgba(255,255,255,0.15)',
                  textTransform: 'uppercase',
                }}
              >
                In transit
              </span>
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '8px',
                  letterSpacing: '0.15em',
                  color: 'rgba(201,168,76,0.4)',
                }}
              >
                {letter.travelProgress ?? 0}%
              </span>
            </div>
            <div
              style={{
                height: '1px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '1px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${letter.travelProgress ?? 0}%`,
                  background: `linear-gradient(90deg, transparent, ${colors.accent})`,
                }}
              />
              <motion.div
                animate={{ left: ['0%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: '40px',
                  background: `linear-gradient(90deg, transparent, ${colors.accent}aa, transparent)`,
                  filter: 'blur(2px)',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
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
  const colors = PAPER_COLORS[letter.paperId] || PAPER_COLORS.parchment

  const paperStyles: Record<string, CSSProperties> = {
    parchment: {
      background: 'linear-gradient(135deg, #f5e6c8, #e8d8a8)',
      color: '#2c1a0e',
    },
    midnight: {
      background: 'linear-gradient(135deg, #0d1128, #111830)',
      color: 'rgba(200,220,255,0.85)',
    },
    scroll: {
      background: 'linear-gradient(135deg, #d4b896, #c8a878)',
      color: '#1a0f05',
    },
    ivory: {
      background: 'linear-gradient(160deg, #fdfaf4, #f8f4ec)',
      color: '#1a1a1a',
    },
    starfield: {
      background: 'linear-gradient(135deg, #03040d, #060816)',
      color: 'rgba(255,255,255,0.88)',
    },
    ember: {
      background: 'linear-gradient(135deg, #1a0808, #200c0c)',
      color: 'rgba(255,220,180,0.88)',
    },
    vellum: {
      background: 'linear-gradient(135deg, rgba(20,25,60,0.95), rgba(15,20,50,0.98))',
      color: 'rgba(220,235,255,0.9)',
    },
  }

  const ps = paperStyles[letter.paperId] || paperStyles.parchment

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,5,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 90,
        padding: '20px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.35 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          ...ps,
          width: 'min(600px, 92vw)',
          maxHeight: '80vh',
          overflowY: 'auto',
          borderRadius: '3px',
          padding: 'clamp(32px, 5vw, 56px) clamp(28px, 6vw, 60px)',
          boxShadow: `0 16px 60px rgba(0,0,0,0.9), 0 0 40px ${colors.accent}20`,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${colors.accent}60, transparent)`,
          }}
        />

        <p
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '9px',
            letterSpacing: '0.4em',
            color: colors.accent,
            textTransform: 'uppercase',
            marginBottom: '20px',
            opacity: 0.7,
          }}
        >
          {letter.direction === 'received' ? `From · ${letter.from}` : `To · ${letter.to}`}
        </p>

        <p
          style={{
            fontFamily: "'IM Fell English', serif",
            fontStyle: 'italic',
            fontSize: '11px',
            opacity: 0.5,
            marginBottom: '20px',
          }}
        >
          {new Date(letter.arrivedAt || letter.sentAt).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '17px',
            fontStyle: 'italic',
            opacity: 0.6,
            marginBottom: '16px',
            lineHeight: 1.8,
          }}
        >
          {letter.direction === 'received' ? 'Dear Stranger,' : `Dear ${letter.to},`}
        </p>

        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(15px, 2vw, 18px)',
            lineHeight: 2,
            letterSpacing: '0.02em',
          }}
        >
          {letter.body}
        </p>

        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            fontSize: '15px',
            opacity: 0.5,
            marginTop: '24px',
            lineHeight: 1.9,
          }}
        >
          With presence,
          <br />
          <span style={{ color: colors.accent, opacity: 0.8 }}>A Stranger</span>
        </p>

        {letter.direction === 'received' && (
          <div
            style={{
              marginTop: '32px',
              paddingTop: '20px',
              borderTop: `1px solid rgba(${
                colors.accent === '#c9a84c' ? '201,168,76' : '100,120,200'
              },0.15)`,
            }}
          >
            <button
              onClick={() => onReply?.(letter.from || '')}
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '10px',
                letterSpacing: '0.3em',
                color: colors.accent,
                padding: '10px 24px',
                border: `1px solid ${colors.accent}50`,
                borderRadius: '2px',
                background: 'transparent',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${colors.accent}12`
                e.currentTarget.style.borderColor = colors.accent
                e.currentTarget.style.boxShadow = `0 0 20px ${colors.accent}20`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = `${colors.accent}50`
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Reply ✦
            </button>
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '15%',
            right: '15%',
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${colors.accent}40, transparent)`,
          }}
        />

        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            opacity: 0.3,
            transition: 'opacity 0.2s',
            color: 'inherit',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.7'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.3'
          }}
        >
          ×
        </button>
      </motion.div>
    </motion.div>
  )
}