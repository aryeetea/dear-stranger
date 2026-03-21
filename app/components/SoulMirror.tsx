'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TOTAL_EXCHANGES = 7

const RULES = [
  { icon: '✦', title: 'Letters take time', desc: 'Nothing arrives instantly. Letters drift through space and arrive over days. Anticipation is part of the experience.' },
  { icon: '◎', title: 'Hubs are people, not profiles', desc: 'Every glowing point in the universe is a real person. Click to see their presence. Write to connect.' },
  { icon: '✒', title: 'Write slowly', desc: 'There are no likes, no followers, no feeds. Only letters. Take your time. Say what matters.' },
  { icon: '⟡', title: 'The Observatory holds your correspondence', desc: 'Track letters in transit, read ones that have arrived, and revisit your archive of past exchanges.' },
  { icon: '🌀', title: 'Your Soul Mirror evolves', desc: 'Your avatar renews every 90 days. Identity here is not fixed — it drifts, like everything else.' },
]

interface Message {
  role: 'ai' | 'user'
  text: string
}

export default function SoulMirror({
  onComplete,
}: {
  onComplete?: (answers: Record<number, string>) => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [userAnswers, setUserAnswers] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<'chat' | 'hubname' | 'welcome'>('chat')
  const [hubName, setHubName] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)


  // Load first AI message on mount
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true
    void fetchAIMessage([], [])
  }, [])

  async function fetchAIMessage(history: Message[], answers: string[]) {
    try {
      setLoading(true)
      setError('')

      const res = await fetch('/api/soul-mirror-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          answers,
          exchangeNumber: answers.length,
          totalExchanges: TOTAL_EXCHANGES,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      setMessages(prev => [...prev, { role: 'ai', text: data.question }])
    } catch (err) {
      setError('Something went quiet. Try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    const text = inputValue.trim()
    if (!text || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', text }]
    const newAnswers = [...userAnswers, text]

    setMessages(newMessages)
    setUserAnswers(newAnswers)
    setInputValue('')

    if (newAnswers.length >= TOTAL_EXCHANGES) {
      // Done with chat — move to hub name step
      setPhase('hubname')
    } else {
      await fetchAIMessage(newMessages, newAnswers)
    }
  }

  function handleHubNameSubmit() {
    if (!hubName.trim()) return
    setPhase('welcome')
  }

  function handleEnter() {
    // Build answers record from userAnswers + hubName
    const answersRecord: Record<number, string> = {}
    userAnswers.forEach((a, i) => { answersRecord[i] = a })
    answersRecord[userAnswers.length] = hubName.trim()
    onComplete?.(answersRecord)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000005',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '20px',
    }}>
      {/* Nebula */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 60% 40% at 20% 30%, rgba(40,20,80,0.25) 0%, transparent 70%),
          radial-gradient(ellipse 50% 60% at 80% 70%, rgba(10,30,80,0.2) 0%, transparent 70%)
        `,
      }} />

      <AnimatePresence mode="wait">

        {/* ── CHAT PHASE ── */}
        {phase === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
            style={{
              background: 'rgba(10,12,30,0.85)',
              border: '1px solid rgba(201,168,76,0.15)',
              borderRadius: '12px',
              width: 'min(560px, 95vw)',
              height: 'min(680px, 90vh)',
              display: 'flex', flexDirection: 'column',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 0 80px rgba(0,0,0,0.8), 0 0 40px rgba(201,168,76,0.06)',
              overflow: 'hidden', position: 'relative',
            }}
          >
            {/* Top accent */}
            <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)' }} />

            {/* Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.4em', color: '#c9a84c', textTransform: 'uppercase' }}>Soul Mirror</p>
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>tell me about yourself</p>
                </div>
                {/* Progress dots */}
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {[...Array(TOTAL_EXCHANGES)].map((_, i) => (
                    <div key={i} style={{
                      width: '5px', height: '5px', borderRadius: '50%',
                      background: i < userAnswers.length ? '#c9a84c' : 'rgba(255,255,255,0.1)',
                      boxShadow: i < userAnswers.length ? '0 0 6px rgba(201,168,76,0.5)' : 'none',
                      transition: 'all 0.3s',
                    }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{
                      maxWidth: '80%',
                      padding: '12px 16px',
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: msg.role === 'user'
                        ? 'rgba(201,168,76,0.12)'
                        : 'rgba(255,255,255,0.05)',
                      border: msg.role === 'user'
                        ? '1px solid rgba(201,168,76,0.25)'
                        : '1px solid rgba(255,255,255,0.08)',
                    }}>
                      {msg.role === 'ai' && (
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: '6px' }}>✦ Mirror</p>
                      )}
                      <p style={{
                        fontFamily: msg.role === 'ai' ? "'IM Fell English', serif" : "'Cormorant Garamond', serif",
                        fontStyle: msg.role === 'ai' ? 'italic' : 'normal',
                        fontSize: msg.role === 'ai' ? '16px' : '15px',
                        color: msg.role === 'user' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.75)',
                        lineHeight: 1.6,
                      }}>{msg.text}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Loading indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ display: 'flex', justifyContent: 'flex-start' }}
                >
                  <div style={{
                    padding: '12px 18px',
                    borderRadius: '16px 16px 16px 4px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', gap: '5px', alignItems: 'center',
                  }}>
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(201,168,76,0.6)' }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {error && (
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(220,120,120,0.7)', textAlign: 'center' }}>{error}</p>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div style={{ padding: '12px 16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <textarea
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="Say something..."
                  rows={2}
                  disabled={loading}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleSend()
                    }
                  }}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    color: 'rgba(255,255,255,0.88)',
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '15px',
                    lineHeight: 1.6,
                    padding: '10px 14px',
                    resize: 'none',
                    outline: 'none',
                    caretColor: '#c9a84c',
                    opacity: loading ? 0.5 : 1,
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                <button
                  onClick={() => void handleSend()}
                  disabled={!inputValue.trim() || loading}
                  style={{
                    width: '42px', height: '42px', borderRadius: '10px',
                    background: inputValue.trim() && !loading ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${inputValue.trim() && !loading ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    color: inputValue.trim() && !loading ? '#c9a84c' : 'rgba(255,255,255,0.2)',
                    fontSize: '16px', cursor: inputValue.trim() && !loading ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.2s',
                  }}
                >
                  ✦
                </button>
              </div>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.15)', textAlign: 'center', marginTop: '8px', textTransform: 'uppercase' }}>
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        )}

        {/* ── HUB NAME PHASE ── */}
        {phase === 'hubname' && (
          <motion.div
            key="hubname"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
            style={{
              background: 'rgba(10,12,30,0.85)',
              border: '1px solid rgba(201,168,76,0.15)',
              borderRadius: '12px',
              padding: 'clamp(40px, 6vw, 64px)',
              width: 'min(480px, 95vw)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 0 80px rgba(0,0,0,0.8), 0 0 40px rgba(201,168,76,0.06)',
              textAlign: 'center', position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)' }} />

            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: '16px' }}>One last thing</p>

            <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(18px, 3vw, 24px)', color: 'rgba(255,255,255,0.88)', lineHeight: 1.6, marginBottom: '32px' }}>
              What would you name your place in the universe?
            </p>

            <input
              autoFocus
              value={hubName}
              onChange={e => setHubName(e.target.value)}
              placeholder="Your hub name..."
              onKeyDown={e => { if (e.key === 'Enter') handleHubNameSubmit() }}
              style={{
                width: '100%', background: 'transparent',
                border: 'none', borderBottom: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.88)',
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '22px', lineHeight: 1.6,
                padding: '10px 4px', outline: 'none',
                textAlign: 'center', letterSpacing: '0.08em',
                caretColor: '#c9a84c', marginBottom: '28px',
              }}
              onFocus={e => e.target.style.borderBottomColor = '#c9a84c'}
              onBlur={e => e.target.style.borderBottomColor = 'rgba(255,255,255,0.12)'}
            />

            <button
              onClick={handleHubNameSubmit}
              disabled={!hubName.trim()}
              style={{
                width: '100%', padding: '14px',
                background: 'transparent',
                border: '1px solid rgba(201,168,76,0.35)',
                color: hubName.trim() ? '#c9a84c' : 'rgba(201,168,76,0.3)',
                fontFamily: "'Cinzel', serif", fontSize: '11px',
                letterSpacing: '0.3em', textTransform: 'uppercase',
                cursor: hubName.trim() ? 'pointer' : 'default', transition: 'all 0.3s',
              }}
              onMouseEnter={e => {
                if (!hubName.trim()) return
                e.currentTarget.style.background = 'rgba(201,168,76,0.08)'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(201,168,76,0.15)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Continue
            </button>

            <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)' }} />
          </motion.div>
        )}

        {/* ── WELCOME PHASE ── */}
        {phase === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5 }}
            style={{
              background: 'rgba(10,12,30,0.85)',
              border: '1px solid rgba(201,168,76,0.15)',
              borderRadius: '12px',
              padding: 'clamp(36px, 5vw, 56px)',
              width: 'min(560px, 95vw)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 0 80px rgba(0,0,0,0.8), 0 0 40px rgba(201,168,76,0.06)',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)' }} />

            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: '12px' }}>Welcome to the Universe</p>
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(16px, 2.5vw, 20px)', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>Before you enter, a few things to know</p>
              <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)', marginTop: '16px' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '36px' }}>
              {RULES.map((rule, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0, marginTop: '2px' }}>
                    {rule.icon}
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.8)', textTransform: 'uppercase', marginBottom: '4px' }}>{rule.title}</p>
                    <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{rule.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.button
              onClick={handleEnter}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              whileTap={{ scale: 0.98 }}
              style={{ width: '100%', padding: '16px', background: 'transparent', border: '1px solid rgba(201,168,76,0.5)', color: '#c9a84c', fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.35em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.1)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(201,168,76,0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none' }}
            >
              Enter the Universe ✦
            </motion.button>

            <div style={{ position: 'absolute', bottom: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}