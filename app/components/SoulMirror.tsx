'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const MIN_EXCHANGES = 10
const MAX_EXCHANGES = 20

const RULES = [
  { icon: '✦', title: 'Letters take time', desc: 'Nothing arrives instantly. Letters drift through space and arrive over days. Anticipation is part of the experience.' },
  { icon: '◎', title: 'Hubs are people, not profiles', desc: 'Every glowing point in the universe is a real person. Click to see their presence. Write to connect.' },
  { icon: '✒', title: 'Write slowly', desc: 'There are no likes, no followers, no feeds. Only letters. Take your time. Say what matters.' },
  { icon: '⟡', title: 'The Observatory holds your correspondence', desc: 'Track letters in transit, read ones that have arrived, and revisit your archive of past exchanges.' },
  { icon: '🌀', title: 'Your Soul Mirror evolves', desc: 'On your first day, you have 3 chances to shape how you appear. After that, your form is fixed for 90 days — then the mirror opens again.' },
]

const STYLE_OPTIONS = [
  {
    id: 'fantasy',
    label: 'Fantasy',
    desc: 'magical, ethereal, mythical, otherworldly',
  },
  {
    id: 'modern',
    label: 'Modern',
    desc: 'clean, stylish, current, realistic',
  },
  {
    id: 'fantasy-modern',
    label: 'Fantasy Modern',
    desc: 'a mix of magical and modern style',
  },
  {
    id: 'celestial',
    label: 'Celestial',
    desc: 'stars, moonlight, cosmic beauty, divine energy',
  },
  {
    id: 'royal',
    label: 'Royal',
    desc: 'elegant, luxurious, noble, powerful',
  },
  {
    id: 'streetwear',
    label: 'Streetwear',
    desc: 'bold, cool, trendy, expressive',
  },
  {
    id: 'futuristic',
    label: 'Futuristic',
    desc: 'sleek, sci-fi, advanced, glowing',
  },
  {
    id: 'nature',
    label: 'Nature Inspired',
    desc: 'earthy, floral, organic, peaceful',
  },
]

const SUGGESTION_GROUPS = [
  {
    label: 'Presence',
    chips: ['quiet but powerful', 'warm and magnetic', 'mysterious', 'gentle but intense', 'wildly free', 'calm and grounded'],
  },
  {
    label: 'World',
    chips: ['neon city at night', 'quiet forest', 'cosmic void', 'golden afternoon', 'stormy ocean', 'ancient library'],
  },
  {
    label: 'Mood',
    chips: ['soft and dreamy', 'dark and elegant', 'chaotic and alive', 'cozy and warm', 'sharp and focused', 'flowing and fluid'],
  },
  {
    label: 'Power',
    chips: ['healer', 'wanderer', 'protector', 'creator', 'destroyer', 'observer'],
  },
]

export interface Message {
  role: 'ai' | 'user'
  text: string
  isClosing?: boolean
}

export interface StyleOption {
  id: string
  label: string
  desc: string
}

interface SoulMirrorProps {
  onComplete?: (answers: Record<number, string>, selectedStyle?: StyleOption) => void
}

export default function SoulMirror({ onComplete }: SoulMirrorProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [userAnswers, setUserAnswers] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<'style' | 'chat' | 'hubname' | 'welcome'>('style')
  const [hubName, setHubName] = useState('')
  const [chatDone, setChatDone] = useState(false)
  const [activeGroup, setActiveGroup] = useState(0)
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (phase !== 'chat') return
    if (!selectedStyle) return
    if (hasInitialized.current) return

    hasInitialized.current = true
    void fetchAIMessage([], [])
  }, [phase, selectedStyle])

  async function fetchAIMessage(history: Message[], answers: string[]) {
    if (!selectedStyle) return

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
          style: selectedStyle.label,
          styleDescription: selectedStyle.desc,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed')
      }

      const isClosing = data.done === true
      setMessages(prev => [...prev, { role: 'ai', text: data.question, isClosing }])

      if (isClosing) {
        setChatDone(true)
      }
    } catch (err) {
      setError('Something went quiet. Try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSend(text?: string) {
    const finalText = (text || inputValue).trim()

    if (!finalText || loading || chatDone) return

    const newMessages: Message[] = [...messages, { role: 'user', text: finalText }]
    const newAnswers = [...userAnswers, finalText]

    setMessages(newMessages)
    setUserAnswers(newAnswers)
    setInputValue('')
    setActiveGroup(g => (g + 1) % SUGGESTION_GROUPS.length)

    await fetchAIMessage(newMessages, newAnswers)
  }

  function handleStyleSelect(style: StyleOption) {
    setSelectedStyle(style)
    setPhase('chat')
  }

  function handleHubNameSubmit() {
    if (!hubName.trim()) return
    setPhase('welcome')
  }

  function handleEnter() {
    const answersRecord: Record<number, string> = {}

    userAnswers.forEach((a, i) => {
      answersRecord[i] = a
    })

    answersRecord[userAnswers.length] = hubName.trim()

    onComplete?.(answersRecord, selectedStyle || undefined)
  }

  const progressPct = Math.min(100, (userAnswers.length / MIN_EXCHANGES) * 100)
  const currentGroup = SUGGESTION_GROUPS[activeGroup % SUGGESTION_GROUPS.length]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000005',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '20px',
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 60% 40% at 20% 30%, rgba(40,20,80,0.25) 0%, transparent 70%), radial-gradient(ellipse 50% 60% at 80% 70%, rgba(10,30,80,0.2) 0%, transparent 70%)',
        }}
      />

      <AnimatePresence mode="wait">
        {phase === 'style' && (
          <motion.div
            key="style"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
            style={{
              background: 'rgba(10,12,30,0.85)',
              border: '1px solid rgba(201,168,76,0.15)',
              borderRadius: '12px',
              width: 'min(680px, 95vw)',
              padding: 'clamp(28px, 5vw, 44px)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 0 80px rgba(0,0,0,0.8), 0 0 40px rgba(201,168,76,0.06)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '20%',
                right: '20%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)',
              }}
            />

            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <p
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '10px',
                  letterSpacing: '0.4em',
                  color: '#c9a84c',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                }}
              >
                Soul Mirror
              </p>

              <p
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontStyle: 'italic',
                  fontSize: 'clamp(20px, 3vw, 28px)',
                  color: 'rgba(255,255,255,0.88)',
                  lineHeight: 1.5,
                  marginBottom: '8px',
                }}
              >
                Choose the style you want your avatar to have
              </p>

              <p
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '16px',
                  color: 'rgba(255,255,255,0.5)',
                  lineHeight: 1.5,
                }}
              >
                This choice will shape how your Soul Mirror avatar image is designed.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
              }}
            >
              {STYLE_OPTIONS.map(style => (
                <motion.button
                  key={style.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleStyleSelect(style)}
                  style={{
                    textAlign: 'left',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(201,168,76,0.18)',
                    background: 'rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(201,168,76,0.08)'
                    e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    e.currentTarget.style.borderColor = 'rgba(201,168,76,0.18)'
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '11px',
                      letterSpacing: '0.18em',
                      color: '#c9a84c',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    {style.label}
                  </p>

                  <p
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: '15px',
                      lineHeight: 1.5,
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {style.desc}
                  </p>
                </motion.button>
              ))}
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: '20%',
                right: '20%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)',
              }}
            />
          </motion.div>
        )}

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
              width: 'min(580px, 95vw)',
              height: 'min(720px, 92vh)',
              display: 'flex',
              flexDirection: 'column',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 0 80px rgba(0,0,0,0.8), 0 0 40px rgba(201,168,76,0.06)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '20%',
                right: '20%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)',
              }}
            />

            <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <p
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '10px',
                      letterSpacing: '0.4em',
                      color: '#c9a84c',
                      textTransform: 'uppercase',
                    }}
                  >
                    Soul Mirror
                  </p>

                  <p
                    style={{
                      fontFamily: "'IM Fell English', serif",
                      fontStyle: 'italic',
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.25)',
                      marginTop: '2px',
                    }}
                  >
                    tell me about yourself
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <p
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '8px',
                      letterSpacing: '0.2em',
                      color: 'rgba(255,255,255,0.2)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {chatDone ? 'complete' : `${userAnswers.length} / ${MIN_EXCHANGES}+`}
                  </p>

                  <div
                    style={{
                      width: '80px',
                      height: '2px',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      animate={{ width: chatDone ? '100%' : `${progressPct}%` }}
                      transition={{ duration: 0.4 }}
                      style={{
                        height: '100%',
                        background: chatDone ? '#c9a84c' : 'rgba(201,168,76,0.6)',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                </div>
              </div>

              {selectedStyle && (
                <div style={{ marginTop: '12px' }}>
                  <p
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '8px',
                      letterSpacing: '0.18em',
                      color: 'rgba(255,255,255,0.18)',
                      textTransform: 'uppercase',
                      marginBottom: '6px',
                    }}
                  >
                    Chosen style
                  </p>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      borderRadius: '999px',
                      background: 'rgba(201,168,76,0.08)',
                      border: '1px solid rgba(201,168,76,0.2)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: '14px',
                        color: '#c9a84c',
                      }}
                    >
                      {selectedStyle.label}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
                  >
                    <div
                      style={{
                        maxWidth: '82%',
                        padding: '12px 16px',
                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.isClosing
                          ? 'rgba(201,168,76,0.08)'
                          : msg.role === 'user'
                            ? 'rgba(201,168,76,0.12)'
                            : 'rgba(255,255,255,0.05)',
                        border: msg.isClosing
                          ? '1px solid rgba(201,168,76,0.3)'
                          : msg.role === 'user'
                            ? '1px solid rgba(201,168,76,0.25)'
                            : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {msg.role === 'ai' && (
                        <p
                          style={{
                            fontFamily: "'Cinzel', serif",
                            fontSize: '8px',
                            letterSpacing: '0.2em',
                            color: msg.isClosing ? 'rgba(201,168,76,0.8)' : 'rgba(201,168,76,0.5)',
                            textTransform: 'uppercase',
                            marginBottom: '6px',
                          }}
                        >
                          {msg.isClosing ? '✦ Mirror · I can see you' : '✦ Mirror'}
                        </p>
                      )}

                      <p
                        style={{
                          fontFamily: msg.role === 'ai' ? "'IM Fell English', serif" : "'Cormorant Garamond', serif",
                          fontStyle: msg.role === 'ai' ? 'italic' : 'normal',
                          fontSize: msg.role === 'ai' ? '16px' : '15px',
                          color: msg.isClosing
                            ? 'rgba(255,255,255,0.9)'
                            : msg.role === 'user'
                              ? 'rgba(255,255,255,0.8)'
                              : 'rgba(255,255,255,0.75)',
                          lineHeight: 1.6,
                        }}
                      >
                        {msg.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div
                    style={{
                      padding: '12px 18px',
                      borderRadius: '16px 16px 16px 4px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      gap: '5px',
                      alignItems: 'center',
                    }}
                  >
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: 'rgba(201,168,76,0.6)',
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {error && (
                <p
                  style={{
                    fontFamily: "'IM Fell English', serif",
                    fontStyle: 'italic',
                    fontSize: '13px',
                    color: 'rgba(220,120,120,0.7)',
                    textAlign: 'center',
                  }}
                >
                  {error}
                </p>
              )}

              <div ref={bottomRef} />
            </div>

            {!chatDone && !loading && messages.length > 0 && (
              <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
                <p
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '7px',
                    letterSpacing: '0.25em',
                    color: 'rgba(255,255,255,0.15)',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  {currentGroup.label} · tap to use
                </p>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {currentGroup.chips.map((chip, i) => (
                    <motion.button
                      key={`${activeGroup}-${i}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => void handleSend(chip)}
                      disabled={loading}
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: '13px',
                        color: 'rgba(201,168,76,0.7)',
                        padding: '5px 12px',
                        border: '1px solid rgba(201,168,76,0.2)',
                        borderRadius: '20px',
                        background: 'rgba(201,168,76,0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(201,168,76,0.12)'
                        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'
                        e.currentTarget.style.color = '#c9a84c'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(201,168,76,0.05)'
                        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'
                        e.currentTarget.style.color = 'rgba(201,168,76,0.7)'
                      }}
                    >
                      {chip}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                padding: '10px 16px 18px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                flexShrink: 0,
                marginTop: '8px',
              }}
            >
              {chatDone ? (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setPhase('hubname')}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'rgba(201,168,76,0.1)',
                    border: '1px solid rgba(201,168,76,0.5)',
                    color: '#c9a84c',
                    fontFamily: "'Cinzel', serif",
                    fontSize: '11px',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    transition: 'all 0.3s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(201,168,76,0.18)'
                    e.currentTarget.style.boxShadow = '0 0 24px rgba(201,168,76,0.2)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(201,168,76,0.1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  Continue ✦
                </motion.button>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <textarea
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      placeholder="Or write your own..."
                      rows={2}
                      disabled={loading || chatDone}
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
                      onFocus={e => {
                        e.target.style.borderColor = 'rgba(201,168,76,0.4)'
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                      }}
                    />

                    <button
                      onClick={() => void handleSend()}
                      disabled={!inputValue.trim() || loading}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: inputValue.trim() && !loading ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${inputValue.trim() && !loading ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        color: inputValue.trim() && !loading ? '#c9a84c' : 'rgba(255,255,255,0.2)',
                        fontSize: '16px',
                        cursor: inputValue.trim() && !loading ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                      }}
                    >
                      ✦
                    </button>
                  </div>

                  <p
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '8px',
                      letterSpacing: '0.15em',
                      color: 'rgba(255,255,255,0.12)',
                      textAlign: 'center',
                      marginTop: '8px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Enter to send · Shift+Enter for new line
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}

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
              boxShadow: '0 0 80px rgba(0,0,0,0.8)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '20%',
                right: '20%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)',
              }}
            />

            <p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '9px',
                letterSpacing: '0.5em',
                color: 'rgba(201,168,76,0.5)',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}
            >
              One last thing
            </p>

            <p
              style={{
                fontFamily: "'IM Fell English', serif",
                fontStyle: 'italic',
                fontSize: 'clamp(18px, 3vw, 24px)',
                color: 'rgba(255,255,255,0.88)',
                lineHeight: 1.6,
                marginBottom: '18px',
              }}
            >
              What would you name your place in the universe?
            </p>

            {selectedStyle && (
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '15px',
                  color: 'rgba(255,255,255,0.45)',
                  marginBottom: '18px',
                }}
              >
                Your avatar style is set to {selectedStyle.label}.
              </p>
            )}

            <input
              autoFocus
              value={hubName}
              onChange={e => setHubName(e.target.value)}
              placeholder="Your hub name..."
              onKeyDown={e => {
                if (e.key === 'Enter') handleHubNameSubmit()
              }}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.88)',
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '22px',
                lineHeight: 1.6,
                padding: '10px 4px',
                outline: 'none',
                textAlign: 'center',
                letterSpacing: '0.08em',
                caretColor: '#c9a84c',
                marginBottom: '28px',
              }}
              onFocus={e => {
                e.target.style.borderBottomColor = '#c9a84c'
              }}
              onBlur={e => {
                e.target.style.borderBottomColor = 'rgba(255,255,255,0.12)'
              }}
            />

            <button
              onClick={handleHubNameSubmit}
              disabled={!hubName.trim()}
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                border: '1px solid rgba(201,168,76,0.35)',
                color: hubName.trim() ? '#c9a84c' : 'rgba(201,168,76,0.3)',
                fontFamily: "'Cinzel', serif",
                fontSize: '11px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                cursor: hubName.trim() ? 'pointer' : 'default',
                transition: 'all 0.3s',
              }}
              onMouseEnter={e => {
                if (!hubName.trim()) return
                e.currentTarget.style.background = 'rgba(201,168,76,0.08)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              Continue
            </button>

            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: '20%',
                right: '20%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)',
              }}
            />
          </motion.div>
        )}

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
              boxShadow: '0 0 80px rgba(0,0,0,0.8)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '15%',
                right: '15%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)',
              }}
            />

            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <p
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '9px',
                  letterSpacing: '0.5em',
                  color: 'rgba(201,168,76,0.5)',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                }}
              >
                Welcome to the Universe
              </p>

              <p
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontStyle: 'italic',
                  fontSize: 'clamp(16px, 2.5vw, 20px)',
                  color: 'rgba(255,255,255,0.85)',
                  lineHeight: 1.6,
                }}
              >
                Before you enter, a few things to know
              </p>

              {selectedStyle && (
                <p
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '16px',
                    color: 'rgba(255,255,255,0.45)',
                    marginTop: '10px',
                  }}
                >
                  Your selected avatar style: {selectedStyle.label}
                </p>
              )}

              <div
                style={{
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)',
                  marginTop: '16px',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '36px' }}>
              {RULES.map((rule, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(201,168,76,0.08)',
                      border: '1px solid rgba(201,168,76,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {rule.icon}
                  </div>

                  <div>
                    <p
                      style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: '10px',
                        letterSpacing: '0.2em',
                        color: 'rgba(201,168,76,0.8)',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                      }}
                    >
                      {rule.title}
                    </p>

                    <p
                      style={{
                        fontFamily: "'IM Fell English', serif",
                        fontStyle: 'italic',
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.45)',
                        lineHeight: 1.6,
                      }}
                    >
                      {rule.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.button
              onClick={handleEnter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                padding: '16px',
                background: 'transparent',
                border: '1px solid rgba(201,168,76,0.5)',
                color: '#c9a84c',
                fontFamily: "'Cinzel', serif",
                fontSize: '11px',
                letterSpacing: '0.35em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(201,168,76,0.1)'
                e.currentTarget.style.boxShadow = '0 0 28px rgba(201,168,76,0.2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Enter the Universe ✦
            </motion.button>

            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: '15%',
                right: '15%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}