'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getPages, submitPage, resonatePage } from '../lib/auth'

const BG_STARS = Array.from({ length: 28 }, (_, i) => ({
  w: `${(i % 3) * 0.35 + 0.25}px`,
  left: `${((i * 61 + 13) % 100)}%`,
  top: `${((i * 79 + 11) % 100)}%`,
  opacity: (i % 5) * 0.035 + 0.03,
}))

type PageEntry = {
  id: string
  body: string
  type: 'entry' | 'poem'
  resonance_count: number
  created_at: string
}

type Tab = 'read' | 'write'
type WriteType = 'entry' | 'poem'

const CHAR_LIMITS: Record<WriteType, number> = { entry: 4000, poem: 4000 }
const POEM_HINT = 500

export default function PagesAndInk({ onClose }: { onClose?: () => void }) {
  const [tab, setTab] = useState<Tab>('read')
  const [pages, setPages] = useState<PageEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'entry' | 'poem'>('all')
  const [open, setOpen] = useState<PageEntry | null>(null)
  const [resonated, setResonated] = useState<Set<string>>(new Set())

  // write state
  const [writeType, setWriteType] = useState<WriteType>('entry')
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [writeError, setWriteError] = useState('')

  useEffect(() => {
    getPages().then((data) => {
      setPages(data as PageEntry[])
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'all' ? pages : pages.filter(p => p.type === filter)

  async function handleResonate(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (resonated.has(id)) return
    setResonated(prev => new Set(prev).add(id))
    setPages(prev => prev.map(p => p.id === id ? { ...p, resonance_count: p.resonance_count + 1 } : p))
    if (open?.id === id) setOpen(prev => prev ? { ...prev, resonance_count: prev.resonance_count + 1 } : prev)
    try { await resonatePage(id) } catch { /* silent */ }
  }

  async function handleSubmit() {
    if (!draft.trim()) { setWriteError('The page is empty.'); return }
    if (draft.trim().length < 10) { setWriteError('A little more, perhaps.'); return }
    setWriteError('')
    setSubmitting(true)
    try {
      await submitPage(draft, writeType)
      setSubmitted(true)
      const fresh = await getPages()
      setPages(fresh as PageEntry[])
      setDraft('')
      setTimeout(() => { setSubmitted(false); setTab('read') }, 2200)
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

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
        zIndex: 70,
        overflowY: 'auto',
        padding: 'clamp(60px,8vh,90px) clamp(16px,5vw,48px) 80px',
      }}
    >
      {/* bg glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 55% 40% at 50% 28%, rgba(10,18,70,0.3) 0%, transparent 65%)' }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        {BG_STARS.map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: s.w, height: s.w, borderRadius: '50%', background: `rgba(255,255,255,${s.opacity})`, left: s.left, top: s.top }} />
        ))}
      </div>

      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: '24px', right: '24px', background: 'none',
          border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.78)',
          fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em',
          padding: '8px 16px', cursor: 'pointer', textTransform: 'uppercase', zIndex: 80,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.78)'; e.currentTarget.style.background = 'none' }}
      >
        ← Return
      </button>

      <div style={{ position: 'relative', zIndex: 2, maxWidth: '680px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.52em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '10px' }}>
            Pages &amp; Ink
          </p>
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(14px,2vw,17px)', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, maxWidth: '460px', margin: '0 auto' }}>
            Anonymous entries and poems left in the open.
            <br />No names. No replies. Just words that needed somewhere to go.
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '24px' }}>
            {(['read', 'write'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? 'rgba(230,199,110,0.1)' : 'transparent',
                border: `1px solid ${tab === t ? 'rgba(230,199,110,0.35)' : 'rgba(255,255,255,0.12)'}`,
                color: tab === t ? '#e6c76e' : 'rgba(255,255,255,0.55)',
                fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.28em',
                textTransform: 'uppercase', padding: '8px 22px', cursor: 'pointer',
                transition: 'all 0.2s',
              }}>
                {t === 'read' ? 'Read' : 'Write'}
              </button>
            ))}
          </div>
        </div>

        {/* ── READ TAB ── */}
        {tab === 'read' && (
          <>
            {/* filter */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '28px' }}>
              {(['all', 'entry', 'poem'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: filter === f ? '#e6c76e' : 'rgba(255,255,255,0.38)',
                  borderBottom: filter === f ? '1px solid rgba(230,199,110,0.4)' : '1px solid transparent',
                  paddingBottom: '3px', transition: 'color 0.2s',
                }}>
                  {f === 'all' ? 'All' : f === 'entry' ? 'Entries' : 'Poems'}
                </button>
              ))}
            </div>

            {loading && (
              <p style={{ textAlign: 'center', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.38em', color: 'rgba(230,199,110,0.4)', textTransform: 'uppercase', paddingTop: '60px' }}>
                Unfolding pages…
              </p>
            )}
            {!loading && filtered.length === 0 && (
              <p style={{ textAlign: 'center', fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '17px', color: 'rgba(255,255,255,0.3)', paddingTop: '60px' }}>
                Nothing here yet. Be the first to leave a page.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtered.map((page, i) => (
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.45 }}
                  onClick={() => setOpen(page)}
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '3px',
                    padding: '20px 22px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.background = page.type === 'poem' ? 'rgba(180,170,230,0.05)' : 'rgba(230,199,110,0.04)'
                    el.style.borderColor = page.type === 'poem' ? 'rgba(180,170,230,0.2)' : 'rgba(230,199,110,0.18)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.background = 'rgba(255,255,255,0.025)'
                    el.style.borderColor = 'rgba(255,255,255,0.08)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                    <span style={{
                      fontFamily: "'Cinzel', serif", fontSize: '7.5px', letterSpacing: '0.3em',
                      textTransform: 'uppercase',
                      color: page.type === 'poem' ? 'rgba(180,170,230,0.75)' : 'rgba(230,199,110,0.65)',
                    }}>
                      {page.type === 'poem' ? 'Poem' : 'Entry'}
                    </span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '7.5px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' }}>
                      {new Date(page.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <p style={{
                    fontFamily: page.type === 'poem' ? "'IM Fell English', serif" : "'Cormorant Garamond', serif",
                    fontStyle: page.type === 'poem' ? 'italic' : 'normal',
                    fontSize: page.type === 'poem' ? '15px' : '14px',
                    color: 'rgba(255,255,255,0.72)',
                    lineHeight: page.type === 'poem' ? 2.0 : 1.75,
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    display: '-webkit-box',
                    WebkitLineClamp: 5,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {page.body}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Read →</span>
                    <button
                      onClick={e => handleResonate(e, page.id)}
                      title={resonated.has(page.id) ? 'You resonated with this' : 'This resonates'}
                      style={{
                        background: 'none', border: 'none', cursor: resonated.has(page.id) ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px',
                        fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.15em',
                        color: resonated.has(page.id) ? '#e6c76e' : 'rgba(255,255,255,0.35)',
                        transition: 'color 0.2s',
                        padding: '2px 4px',
                      }}
                    >
                      <span style={{ fontSize: '11px' }}>✦</span>
                      {page.resonance_count > 0 && <span>{page.resonance_count}</span>}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* ── WRITE TAB ── */}
        {tab === 'write' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '24px' }}>
              {(['entry', 'poem'] as WriteType[]).map(t => (
                <button key={t} onClick={() => setWriteType(t)} style={{
                  background: writeType === t ? (t === 'poem' ? 'rgba(180,170,230,0.1)' : 'rgba(230,199,110,0.1)') : 'transparent',
                  border: `1px solid ${writeType === t ? (t === 'poem' ? 'rgba(180,170,230,0.35)' : 'rgba(230,199,110,0.35)') : 'rgba(255,255,255,0.1)'}`,
                  color: writeType === t ? (t === 'poem' ? 'rgba(180,170,230,0.95)' : '#e6c76e') : 'rgba(255,255,255,0.45)',
                  fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em',
                  textTransform: 'uppercase', padding: '8px 20px', cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  {t === 'entry' ? 'Journal Entry' : 'Poem'}
                </button>
              ))}
            </div>

            <p style={{
              fontFamily: "'IM Fell English', serif", fontStyle: 'italic',
              fontSize: '13px', color: 'rgba(255,255,255,0.38)', textAlign: 'center',
              marginBottom: '18px', lineHeight: 1.6,
            }}>
              {writeType === 'poem'
                ? 'Anonymous. No title required. Let form be whatever it needs to be.'
                : 'Anonymous. No date shown. Just the words.'}
            </p>

            <textarea
              value={draft}
              onChange={e => { setDraft(e.target.value); if (writeError) setWriteError('') }}
              placeholder={writeType === 'poem' ? 'Begin anywhere…' : 'Today I…'}
              maxLength={CHAR_LIMITS[writeType]}
              rows={writeType === 'poem' ? 12 : 16}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.035)',
                border: `1px solid ${writeError ? 'rgba(220,80,80,0.6)' : writeType === 'poem' ? 'rgba(180,170,230,0.2)' : 'rgba(230,199,110,0.18)'}`,
                borderRadius: '3px',
                color: 'rgba(255,255,255,0.88)',
                fontFamily: writeType === 'poem' ? "'IM Fell English', serif" : "'Cormorant Garamond', serif",
                fontStyle: writeType === 'poem' ? 'italic' : 'normal',
                fontSize: writeType === 'poem' ? '16px' : '15px',
                lineHeight: writeType === 'poem' ? 2.1 : 1.85,
                padding: '18px 20px',
                outline: 'none',
                resize: 'vertical',
                caretColor: writeType === 'poem' ? 'rgba(180,170,230,0.9)' : '#e6c76e',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = writeType === 'poem' ? 'rgba(180,170,230,0.4)' : 'rgba(230,199,110,0.35)' }}
              onBlur={e => { if (!writeError) e.target.style.borderColor = writeType === 'poem' ? 'rgba(180,170,230,0.2)' : 'rgba(230,199,110,0.18)' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.15em', color: writeType === 'poem' && draft.length > POEM_HINT ? 'rgba(255,255,255,0.38)' : 'transparent' }}>
                {writeType === 'poem' && draft.length > POEM_HINT ? `${draft.length} / ${CHAR_LIMITS.poem}` : ''}
              </span>
              {writeError && (
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(220,80,80,0.85)', textTransform: 'uppercase' }}>
                  {writeError}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <button
                onClick={handleSubmit}
                disabled={submitting || submitted}
                style={{
                  fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.35em',
                  textTransform: 'uppercase',
                  color: submitted ? 'rgba(255,255,255,0.5)' : writeType === 'poem' ? 'rgba(180,170,230,0.9)' : '#e6c76e',
                  background: 'transparent',
                  border: `1px solid ${submitted ? 'rgba(255,255,255,0.15)' : writeType === 'poem' ? 'rgba(180,170,230,0.35)' : 'rgba(230,199,110,0.4)'}`,
                  padding: '12px 32px',
                  cursor: submitting || submitted ? 'default' : 'pointer',
                  transition: 'all 0.25s',
                  borderRadius: '2px',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitted ? 'Left in the open ✦' : submitting ? 'Releasing…' : 'Leave it here'}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Expanded entry/poem */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,5,0.88)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}
            onClick={() => setOpen(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: open.type === 'poem'
                  ? 'linear-gradient(160deg, #0d0d1a 0%, #12102a 100%)'
                  : 'linear-gradient(160deg, #fdf6e0 0%, #efe0c2 55%, #e8d5ac 100%)',
                borderRadius: '2px',
                maxWidth: '560px',
                width: '100%',
                maxHeight: '82vh',
                overflowY: 'auto',
                padding: 'clamp(32px,5vw,52px)',
                boxShadow: '0 40px 120px rgba(0,0,0,0.92)',
                position: 'relative',
                border: open.type === 'poem' ? '1px solid rgba(180,170,230,0.18)' : 'none',
              }}
            >
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.38em', textTransform: 'uppercase', marginBottom: '20px',
                color: open.type === 'poem' ? 'rgba(180,170,230,0.5)' : 'rgba(100,72,22,0.45)',
                textAlign: open.type === 'poem' ? 'center' : 'left',
              }}>
                {open.type === 'poem' ? '— anonymous poem —' : `Entry · ${new Date(open.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
              </p>
              <p style={{
                fontFamily: open.type === 'poem' ? "'IM Fell English', serif" : "'Cormorant Garamond', serif",
                fontStyle: open.type === 'poem' ? 'italic' : 'normal',
                fontSize: 'clamp(15px,2vw,18px)',
                color: open.type === 'poem' ? 'rgba(220,215,255,0.88)' : 'rgba(38,24,6,0.88)',
                lineHeight: open.type === 'poem' ? 2.15 : 1.95,
                whiteSpace: 'pre-wrap',
                margin: 0,
                textAlign: open.type === 'poem' ? 'center' : 'left',
              }}>
                {open.body}
              </p>

              <div style={{ display: 'flex', justifyContent: open.type === 'poem' ? 'center' : 'flex-start', marginTop: '24px' }}>
                <button
                  onClick={e => handleResonate(e, open.id)}
                  style={{
                    background: 'none', border: `1px solid ${resonated.has(open.id) ? (open.type === 'poem' ? 'rgba(180,170,230,0.4)' : 'rgba(201,168,76,0.4)') : 'rgba(255,255,255,0.15)'}`,
                    cursor: resonated.has(open.id) ? 'default' : 'pointer',
                    padding: '7px 18px', borderRadius: '2px',
                    fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em', textTransform: 'uppercase',
                    color: resonated.has(open.id) ? (open.type === 'poem' ? 'rgba(180,170,230,0.9)' : '#c9a84c') : (open.type === 'poem' ? 'rgba(255,255,255,0.45)' : 'rgba(80,55,10,0.6)'),
                    display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
                  }}
                >
                  <span>✦</span>
                  <span>{resonated.has(open.id) ? 'Resonates' : 'This resonates'}</span>
                  {open.resonance_count > 0 && <span style={{ opacity: 0.65 }}>· {open.resonance_count}</span>}
                </button>
              </div>

              <button onClick={() => setOpen(null)} style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: open.type === 'poem' ? 'rgba(255,255,255,0.4)' : 'rgba(100,72,22,0.4)' }}>×</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
