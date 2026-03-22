'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'

const CATEGORIES = [
  { id: 'bug', label: '🐛 Bug Report', desc: 'Something is broken or not working' },
  { id: 'feedback', label: '💬 Feedback', desc: 'Suggestions or general thoughts' },
  { id: 'letter', label: '✉️ Letter Issue', desc: 'Problem with sending or receiving letters' },
  { id: 'account', label: '👤 Account Issue', desc: 'Login, profile, or hub problems' },
  { id: 'content', label: '🚩 Report Content', desc: 'Inappropriate content from another user' },
  { id: 'other', label: '✦ Other', desc: 'Anything else on your mind' },
]

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!category || !message.trim()) {
      setError('Please choose a category and write your message.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const { error: dbError } = await supabase.from('feedback').insert([{
        category,
        message: message.trim(),
        contact_email: email.trim() || null,
        created_at: new Date().toISOString(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }])
      if (dbError) throw dbError
      setSubmitted(true)
      setTimeout(() => {
        setOpen(false)
        setSubmitted(false)
        setCategory(null)
        setMessage('')
        setEmail('')
      }, 3000)
    } catch (err) {
      console.error('Feedback submit failed:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setOpen(false)
    setSubmitted(false)
    setCategory(null)
    setMessage('')
    setEmail('')
    setError('')
  }

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2, duration: 0.4 }}
        onClick={() => setOpen(true)}
        title="Report an issue or send feedback"
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '24px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'rgba(8,10,28,0.88)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.45)',
          fontSize: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 55,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'
          e.currentTarget.style.color = 'rgba(201,168,76,0.8)'
          e.currentTarget.style.background = 'rgba(8,10,28,0.95)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
          e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
          e.currentTarget.style.background = 'rgba(8,10,28,0.88)'
        }}
      >
        ⚑
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,5,0.75)',
              backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', zIndex: 100, padding: '20px',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'rgba(8,10,28,0.97)',
                border: '1px solid rgba(230,199,110,0.22)',
                borderRadius: '12px',
                width: 'min(520px, 95vw)',
                maxHeight: '88vh',
                overflowY: 'auto',
                padding: 'clamp(28px,5vw,44px)',
                boxShadow: '0 0 80px rgba(0,0,0,0.9)',
                position: 'relative',
              }}
            >
              {/* Gold line top */}
              <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(230,199,110,0.45), transparent)' }} />

              {/* Close */}
              <button onClick={handleClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>×</button>

              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                    <p style={{ fontSize: '32px', marginBottom: '16px' }}>✦</p>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.4em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '10px' }}>Received</p>
                    <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
                      Your message has been sent to the team. Thank you for helping make Dear Stranger better.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div style={{ marginBottom: '28px' }}>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: '8px' }}>Dear Stranger · Support</p>
                      <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(18px,2.5vw,22px)', color: 'rgba(255,255,255,0.92)', lineHeight: 1.5, marginBottom: '6px' }}>Report an issue or share feedback</p>
                      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>We read everything. Your experience matters to us.</p>
                    </div>

                    {/* Category */}
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '12px' }}>What is this about?</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
                      {CATEGORIES.map(cat => {
                        const isSelected = category === cat.id
                        return (
                          <button key={cat.id} onClick={() => setCategory(cat.id)}
                            style={{ textAlign: 'left', padding: '12px 14px', borderRadius: '8px', border: isSelected ? '1px solid rgba(230,199,110,0.6)' : '1px solid rgba(255,255,255,0.08)', background: isSelected ? 'rgba(230,199,110,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)' } }}
                            onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' } }}>
                            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.1em', color: isSelected ? '#e6c76e' : 'rgba(255,255,255,0.72)', marginBottom: '3px' }}>{cat.label}</p>
                            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '12px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>{cat.desc}</p>
                          </button>
                        )
                      })}
                    </div>

                    {/* Message */}
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '10px' }}>Your message</p>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Tell us what happened, what you expected, or what you'd like to see..."
                      rows={5}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.88)', fontFamily: "'Cormorant Garamond', serif", fontSize: '15px', lineHeight: 1.7, padding: '12px 14px', outline: 'none', resize: 'none', caretColor: '#e6c76e', marginBottom: '16px' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.4)' }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                    />

                    {/* Email (optional) */}
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '10px' }}>Email (optional — if you'd like a reply)</p>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.88)', fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.1em', padding: '11px 14px', outline: 'none', caretColor: '#e6c76e', marginBottom: '20px' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.4)' }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                    />

                    {error && (
                      <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(220,100,100,0.85)', marginBottom: '14px' }}>{error}</p>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      style={{ width: '100%', padding: '14px', background: 'transparent', border: '1px solid rgba(201,168,76,0.5)', color: '#c9a84c', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px', opacity: submitting ? 0.6 : 1, transition: 'all 0.2s' }}
                      onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = 'rgba(201,168,76,0.08)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {submitting ? 'Sending...' : 'Send to the Team ✦'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Gold line bottom */}
              <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(230,199,110,0.2), transparent)' }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}