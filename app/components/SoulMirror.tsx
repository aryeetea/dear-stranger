'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HUB_STYLES, type HubStyle } from './UniverseMap'

const MIN_EXCHANGES = 5
const MAX_EXCHANGES = 9

const MIRROR_VOICES = [
  { id: 'friend', label: 'Supportive Friend', desc: 'Warm, gentle, encouraging. Like talking to someone who always has your back.', icon: '🤍', prompt: 'You are a warm, gentle, encouraging friend. You speak with care and genuine interest. Never clinical, never performative — just real.' },
  { id: 'poetic', label: 'Poetic & Mysterious', desc: 'Speaks in metaphors and imagery. Every question feels like a riddle worth answering.', icon: '🌙', prompt: 'You are poetic and mysterious. Speak in metaphors, imagery, and layered meaning. Let silence breathe between your words.' },
  { id: 'direct', label: 'Direct & Honest', desc: 'Straight to the point. No fluff, no filler. Refreshingly real.', icon: '⚡', prompt: 'You are direct and honest. Ask exactly what you mean. No filler, no softening. Respect the person enough to be real with them.' },
  { id: 'genz', label: 'Gen Z', desc: 'Chaotic, funny, very online. Will probably use "no cap" and mean it.', icon: '💀', prompt: 'You are extremely Gen Z. Use current slang naturally — no cap, slay, lowkey, periodt, understood the assignment, etc. Be chaotic but genuinely curious. Make it fun.' },
  { id: 'elder', label: 'Wise Elder', desc: 'Calm, deep, philosophical. Asks the questions that linger for days.', icon: '🔮', prompt: 'You are a wise elder — calm, patient, and philosophical. Ask questions that reveal deeper truths. Speak slowly and with weight.' },
  { id: 'playful', label: 'Playful & Curious', desc: 'Childlike wonder. Treats everything like a discovery worth celebrating.', icon: '✨', prompt: 'You are playful and endlessly curious. Approach each answer with wonder and delight. Make the person feel like what they share is genuinely fascinating.' },
]

const STYLE_OPTIONS = [
  { id: 'fantasy', label: 'Fantasy', desc: 'magical, ethereal, mythical, otherworldly' },
  { id: 'modern', label: 'Modern', desc: 'clean, stylish, current, realistic' },
  { id: 'fantasy-modern', label: 'Fantasy Modern', desc: 'a mix of magical and modern style' },
  { id: 'celestial', label: 'Celestial', desc: 'stars, moonlight, cosmic beauty, divine energy' },
  { id: 'royal', label: 'Royal', desc: 'elegant, luxurious, noble, powerful' },
  { id: 'streetwear', label: 'Streetwear', desc: 'bold, cool, trendy, expressive' },
  { id: 'futuristic', label: 'Futuristic', desc: 'sleek, sci-fi, advanced, glowing' },
  { id: 'nature', label: 'Nature Inspired', desc: 'earthy, floral, organic, peaceful' },
]

const RULES = [
  { icon: '✦', title: 'Letters travel slowly — and that is the point', desc: 'Nothing in Dear Stranger arrives instantly. When you send a letter, it drifts through the universe for anywhere between one and seven days before landing. This is not a bug. The wait is part of the experience — it gives your words weight, and gives the reader time to anticipate. Write like your letter deserves the journey.' },
  { icon: '◎', title: 'Every hub is a real person', desc: 'Every glowing point, every lantern, every archway you see floating in the universe belongs to someone real — a student, a wanderer, someone who sat with the same questions you did during onboarding. Click a hub to see their presence. Write to connect.' },
  { icon: '✒', title: 'There are no likes. No followers. No feed.', desc: 'Dear Stranger has no metrics. Nobody sees how many letters you have sent or received unless you tell them. There is no algorithm deciding who matters. The only way to be known here is to write — and to mean it.' },
  { icon: '⟡', title: 'The Observatory holds your correspondence', desc: 'Every letter you send or receive lives in the Observatory. Track letters still traveling, open ones that have arrived, and revisit your archive. Universe letters appear as shooting stars drifting across the map. Catch one and read a piece of what a stranger sent into the void.' },
  { icon: '🌀', title: 'Your Soul Mirror is sealed for 90 days', desc: 'On your first day, the mirror gives you three chances to shape how you appear. After the third, your form is fixed. After 90 days the mirror opens again. Your presence here should feel considered, not constantly edited. You are not a profile. You are a place.' },
  { icon: '◉', title: 'Your hub style and voice are yours', desc: 'During onboarding you choose how your hub looks and how the mirror speaks to you. You can update your bio and ask-about anytime from your profile — but your hub form should feel chosen, not constantly rebuilt.' },
  { icon: '🌍', title: 'This space is for everyone — but it started for students', desc: 'Dear Stranger was built with college students in mind — the 2am questions, the distance from home, the strange intimacy of sharing a campus with thousands of strangers. But if you found your way here, you are welcome.' },
]

export interface StyleOption { id: string; label: string; desc: string }
export interface MirrorVoice { id: string; label: string; desc: string; icon: string; prompt: string }

type Phase = 'voice' | 'style' | 'hubstyle' | 'chat' | 'hubname' | 'bio' | 'welcome'

interface SoulMirrorProps {
  isReturning?: boolean
  errorMessage?: string
  onComplete?: (
    answers: Record<number, string>,
    selectedStyle?: StyleOption,
    hubStyle?: HubStyle,
    mirrorVoice?: MirrorVoice,
    bio?: string,
    hubNameFromOnboarding?: string,
  ) => void
}

export default function SoulMirror({ isReturning = false, errorMessage = '', onComplete }: SoulMirrorProps) {
  const [phase, setPhase] = useState<Phase>('voice')
  const [selectedVoice, setSelectedVoice] = useState<MirrorVoice | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null)
  const [selectedHubStyle, setSelectedHubStyle] = useState<HubStyle>('portal')
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string; isClosing?: boolean; chips?: string[] }[]>([])
  const [userAnswers, setUserAnswers] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chatDone, setChatDone] = useState(false)
  const [hubName, setHubName] = useState('')
  const [bio, setBio] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    if (phase !== 'chat' || !selectedStyle || !selectedVoice || hasInitialized.current) return
    hasInitialized.current = true
    void fetchAIMessage([], [])
  }, [phase, selectedStyle, selectedVoice])

  async function fetchAIMessage(history: typeof messages, answers: string[]) {
    if (!selectedStyle || !selectedVoice) return
    try {
      setLoading(true); setError('')
      const res = await fetch('/api/soul-mirror-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          answers,
          exchangeNumber: answers.length,
          style: selectedStyle.label,
          styleDescription: selectedStyle.desc,
          mirrorVoice: selectedVoice.id,
          mirrorVoicePrompt: selectedVoice.prompt,
          isReturning,
          minExchanges: MIN_EXCHANGES,
          maxExchanges: MAX_EXCHANGES,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      const isClosing = data.done === true
      const chips: string[] = data.chips || []
      setMessages(prev => [...prev, { role: 'ai', text: data.question, isClosing, chips }])
      if (isClosing) setChatDone(true)
    } catch (err) {
      setError('Something went quiet. Try again.'); console.error(err)
    } finally { setLoading(false) }
  }

  async function handleSend(text?: string) {
    const finalText = (text || inputValue).trim()
    if (!finalText || loading || chatDone) return
    const newMessages = [...messages, { role: 'user' as const, text: finalText }]
    const newAnswers = [...userAnswers, finalText]
    setMessages(newMessages); setUserAnswers(newAnswers); setInputValue('')
    await fetchAIMessage(newMessages, newAnswers)
  }

  function handleEnter() {
    const answersRecord: Record<number, string> = {}
    userAnswers.forEach((a, i) => { answersRecord[i] = a })
    answersRecord[userAnswers.length] = hubName.trim()
    onComplete?.(answersRecord, selectedStyle || undefined, selectedHubStyle, selectedVoice || undefined, bio.trim(), hubName.trim())
  }

  const progressPct = Math.min(100, (userAnswers.length / MIN_EXCHANGES) * 100)
  const lastAiMsg = [...messages].reverse().find(m => m.role === 'ai' && !m.isClosing)
  const currentChips = lastAiMsg?.chips || []

  const cardStyle: React.CSSProperties = {
    background: 'rgba(10,12,30,0.9)',
    border: '1px solid rgba(230,199,110,0.22)',
    borderRadius: '12px',
    backdropFilter: 'blur(24px)',
    boxShadow: '0 0 80px rgba(0,0,0,0.8)',
    position: 'relative',
    overflow: 'hidden',
  }

  const GoldLines = () => <>
    <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(230,199,110,0.45), transparent)' }} />
    <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(230,199,110,0.2), transparent)' }} />
  </>

  const SectionHeader = ({ step, title, sub }: { step: string; title: string; sub: string }) => (
    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: '6px' }}>{step}</p>
      <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(18px, 2.8vw, 26px)', color: 'rgba(255,255,255,0.92)', lineHeight: 1.5, marginBottom: '8px' }}>{title}</p>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{sub}</p>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000005', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px', overflowY: 'auto' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 40% at 20% 30%, rgba(40,20,80,0.25) 0%, transparent 70%), radial-gradient(ellipse 50% 60% at 80% 70%, rgba(10,30,80,0.2) 0%, transparent 70%)' }} />

      {errorMessage && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', width: 'min(620px, calc(100vw - 40px))', padding: '12px 16px', background: 'rgba(60,15,20,0.88)', border: '1px solid rgba(220,120,120,0.35)', borderRadius: '10px', zIndex: 60, boxShadow: '0 14px 40px rgba(0,0,0,0.35)' }}>
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,220,220,0.92)', textAlign: 'center' }}>{errorMessage}</p>
        </div>
      )}

      <AnimatePresence mode="wait">

        {phase === 'voice' && (
          <motion.div key="voice" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}
            style={{ ...cardStyle, width: 'min(720px, 95vw)', padding: 'clamp(28px,5vw,44px)' }}>
            <GoldLines />
            <SectionHeader step="Soul Mirror · Step 1 of 4"
              title={isReturning ? 'Hello, my old friend. How shall I speak to you this time?' : 'How would you like your mirror to speak?'}
              sub="Choose the voice the mirror uses during your conversation." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px' }}>
              {MIRROR_VOICES.map(voice => (
                <motion.button key={voice.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setSelectedVoice(voice); setPhase('style') }}
                  style={{ textAlign: 'left', padding: '18px 16px', borderRadius: '12px', border: '1px solid rgba(230,199,110,0.2)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(230,199,110,0.09)'; e.currentTarget.style.borderColor = 'rgba(230,199,110,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(230,199,110,0.2)' }}>
                  <p style={{ fontSize: '20px', marginBottom: '8px' }}>{voice.icon}</p>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.18em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '7px' }}>{voice.label}</p>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', color: 'rgba(255,255,255,0.62)', lineHeight: 1.55 }}>{voice.desc}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {phase === 'style' && (
          <motion.div key="style" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}
            style={{ ...cardStyle, width: 'min(680px, 95vw)', padding: 'clamp(28px,5vw,44px)' }}>
            <GoldLines />
            <SectionHeader step="Soul Mirror · Step 2 of 4" title="Choose your avatar style" sub="This shapes how your Soul Mirror portrait is designed." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              {STYLE_OPTIONS.map(style => (
                <motion.button key={style.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setSelectedStyle(style); setPhase('hubstyle') }}
                  style={{ textAlign: 'left', padding: '16px', borderRadius: '12px', border: '1px solid rgba(230,199,110,0.2)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(230,199,110,0.09)'; e.currentTarget.style.borderColor = 'rgba(230,199,110,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(230,199,110,0.2)' }}>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.18em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '8px' }}>{style.label}</p>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', color: 'rgba(255,255,255,0.62)', lineHeight: 1.5 }}>{style.desc}</p>
                </motion.button>
              ))}
            </div>
            <button onClick={() => setPhase('voice')} style={backBtn}>← Back</button>
          </motion.div>
        )}

        {phase === 'hubstyle' && (
          <motion.div key="hubstyle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}
            style={{ ...cardStyle, width: 'min(720px, 95vw)', padding: 'clamp(28px,5vw,44px)' }}>
            <GoldLines />
            <SectionHeader step="Soul Mirror · Step 3 of 4" title="How does your hub appear in the universe?" sub="Each structure has its own animation and personality. Others see this when they explore the map." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '28px' }}>
              {HUB_STYLES.map(style => {
                const isSelected = selectedHubStyle === style.id
                return (
                  <motion.button key={style.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedHubStyle(style.id)}
                    style={{ textAlign: 'left', padding: '18px 16px', borderRadius: '12px', border: isSelected ? '1px solid rgba(230,199,110,0.7)' : '1px solid rgba(230,199,110,0.2)', background: isSelected ? 'rgba(230,199,110,0.12)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(230,199,110,0.08)'; e.currentTarget.style.borderColor = 'rgba(230,199,110,0.35)' } }}
                    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(230,199,110,0.2)' } }}>
                    {isSelected && <div style={{ position: 'absolute', top: '10px', right: '12px', width: '16px', height: '16px', borderRadius: '50%', background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#000', fontWeight: 'bold' }}>✓</div>}
                    <p style={{ fontSize: '20px', marginBottom: '8px' }}>{style.icon}</p>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.18em', color: isSelected ? '#e6c76e' : 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: '6px' }}>{style.label}</p>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{style.desc}</p>
                  </motion.button>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setPhase('style')} style={backBtn}>← Back</button>
              <button onClick={() => setPhase('chat')} style={continueBtn}>Enter the Mirror ✦</button>
            </div>
          </motion.div>
        )}

        {phase === 'chat' && (
          <motion.div key="chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}
            style={{ ...cardStyle, width: 'min(580px, 95vw)', height: 'min(720px, 92vh)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(230,199,110,0.45), transparent)' }} />

            <div style={{ padding: '16px 22px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.4em', color: '#e6c76e', textTransform: 'uppercase' }}>Soul Mirror · Step 4 of 4</p>
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginTop: '3px' }}>
                    {selectedVoice?.label} · {selectedStyle?.label} · {HUB_STYLES.find(style => style.id === selectedHubStyle)?.label}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{chatDone ? 'complete' : `${userAnswers.length} / ${MIN_EXCHANGES}+`}</p>
                  <div style={{ width: '80px', height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <motion.div animate={{ width: chatDone ? '100%' : `${progressPct}%` }} transition={{ duration: 0.4 }}
                      style={{ height: '100%', background: '#e6c76e', borderRadius: '2px' }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 8px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                    style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '84%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.isClosing ? 'rgba(230,199,110,0.1)' : msg.role === 'user' ? 'rgba(230,199,110,0.13)' : 'rgba(255,255,255,0.06)', border: msg.isClosing ? '1px solid rgba(230,199,110,0.4)' : msg.role === 'user' ? '1px solid rgba(230,199,110,0.25)' : '1px solid rgba(255,255,255,0.09)' }}>
                      {msg.role === 'ai' && (
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.2em', color: msg.isClosing ? '#e6c76e' : 'rgba(230,199,110,0.75)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          {msg.isClosing ? 'Mirror · I can see you now' : `${selectedVoice?.label || 'Mirror'}`}
                        </p>
                      )}
                      <p style={{ fontFamily: msg.role === 'ai' ? "'IM Fell English', serif" : "'Cormorant Garamond', serif", fontStyle: msg.role === 'ai' ? 'italic' : 'normal', fontSize: msg.role === 'ai' ? '16px' : '15px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.65 }}>
                        {msg.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '12px 18px', borderRadius: '16px 16px 16px 4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {[0,1,2].map(i => <motion.div key={i} animate={{ opacity: [0.3,1,0.3], y: [0,-3,0] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(230,199,110,0.8)' }} />)}
                  </div>
                </motion.div>
              )}
              {error && <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(235,140,140,0.85)', textAlign: 'center' }}>{error}</p>}
              <div ref={bottomRef} />
            </div>

            {!chatDone && !loading && currentChips.length > 0 && (
              <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: '8px' }}>tap to use</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {currentChips.map((chip, i) => (
                    <motion.button key={`${messages.length}-${i}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                      onClick={() => void handleSend(chip)} disabled={loading}
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '13px', color: 'rgba(230,199,110,0.88)', padding: '5px 12px', border: '1px solid rgba(230,199,110,0.28)', borderRadius: '20px', background: 'rgba(230,199,110,0.06)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(230,199,110,0.14)'; e.currentTarget.style.color = '#e6c76e' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(230,199,110,0.06)'; e.currentTarget.style.color = 'rgba(230,199,110,0.88)' }}>
                      {chip}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ padding: '10px 16px 18px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, marginTop: '8px' }}>
              {chatDone ? (
                <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={() => setPhase('hubname')}
                  style={{ width: '100%', padding: '14px', background: 'rgba(230,199,110,0.12)', border: '1px solid rgba(230,199,110,0.55)', color: '#e6c76e', fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '8px' }}>
                  Continue ✦
                </motion.button>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <textarea value={inputValue} onChange={e => setInputValue(e.target.value)}
                      placeholder="Describe yourself in as much detail as you like..." rows={2}
                      disabled={loading || chatDone}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.9)', fontFamily: "'Cormorant Garamond', serif", fontSize: '15px', lineHeight: 1.6, padding: '10px 14px', resize: 'none', outline: 'none', caretColor: '#e6c76e' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(230,199,110,0.4)' }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }} />
                    <button onClick={() => void handleSend()} disabled={!inputValue.trim() || loading}
                      style={{ width: '42px', height: '42px', borderRadius: '10px', background: inputValue.trim() ? 'rgba(230,199,110,0.18)' : 'rgba(255,255,255,0.04)', border: `1px solid ${inputValue.trim() ? 'rgba(230,199,110,0.45)' : 'rgba(255,255,255,0.08)'}`, color: inputValue.trim() ? '#e6c76e' : 'rgba(255,255,255,0.35)', fontSize: '16px', cursor: inputValue.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✦</button>
                  </div>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '8px', textTransform: 'uppercase' }}>Enter to send · Shift+Enter for new line</p>
                </>
              )}
            </div>
          </motion.div>
        )}

        {phase === 'hubname' && (
          <motion.div key="hubname" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}
            style={{ ...cardStyle, padding: 'clamp(40px,6vw,64px)', width: 'min(480px, 95vw)', textAlign: 'center' }}>
            <GoldLines />
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '16px' }}>Almost there</p>
            <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(18px,3vw,24px)', color: 'rgba(255,255,255,0.92)', lineHeight: 1.6, marginBottom: '8px' }}>What would you name your place in the universe?</p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '28px' }}>This is how others will find you on the map.</p>
            <input autoFocus value={hubName} onChange={e => setHubName(e.target.value)} placeholder="Your hub name..."
              onKeyDown={e => { if (e.key === 'Enter' && hubName.trim()) setPhase('bio') }}
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.94)', fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', padding: '10px 4px', outline: 'none', textAlign: 'center', letterSpacing: '0.08em', caretColor: '#e6c76e', marginBottom: '28px' }}
              onFocus={e => { e.target.style.borderBottomColor = '#e6c76e' }}
              onBlur={e => { e.target.style.borderBottomColor = 'rgba(255,255,255,0.2)' }} />
            <button onClick={() => hubName.trim() && setPhase('bio')} disabled={!hubName.trim()}
              style={{ width: '100%', padding: '14px', background: 'transparent', border: '1px solid rgba(230,199,110,0.42)', color: hubName.trim() ? '#e6c76e' : 'rgba(230,199,110,0.3)', fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', cursor: hubName.trim() ? 'pointer' : 'default', borderRadius: '4px' }}
              onMouseEnter={e => { if (hubName.trim()) e.currentTarget.style.background = 'rgba(230,199,110,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              Continue
            </button>
          </motion.div>
        )}

        {phase === 'bio' && (
          <motion.div key="bio" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}
            style={{ ...cardStyle, width: 'min(520px, 95vw)', padding: 'clamp(36px,5vw,52px)' }}>
            <GoldLines />
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '10px' }}>Your Bio</p>
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(16px,2.5vw,22px)', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6, marginBottom: '8px' }}>Tell the universe who you are</p>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>This appears on your hub card when others visit. You can always edit it in your profile.</p>
            </div>
            <textarea value={bio} onChange={e => setBio(e.target.value)}
              placeholder={`Hi, I'm ${hubName || 'a stranger'}. I'm here because...`} rows={5}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'rgba(255,255,255,0.9)', fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', lineHeight: 1.8, padding: '14px 16px', outline: 'none', resize: 'none', caretColor: '#e6c76e', marginBottom: '20px' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(230,199,110,0.4)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setPhase('hubname')} style={backBtn}>← Back</button>
              <button onClick={() => setPhase('welcome')} style={continueBtn}>
                {bio.trim() ? 'Continue ✦' : 'Skip for now ✦'}
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'welcome' && (
          <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.5 }}
            style={{ ...cardStyle, width: 'min(620px, 95vw)', padding: 'clamp(36px,5vw,52px)', maxHeight: '90vh', overflowY: 'auto' }}>
            <GoldLines />
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '12px' }}>Welcome, {hubName || 'Stranger'}</p>
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(16px,2.5vw,22px)', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>Before you enter, read this slowly.</p>
              <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(230,199,110,0.3), transparent)', marginTop: '18px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '36px' }}>
              {RULES.map((rule, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + i * 0.07 }}
                  style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(230,199,110,0.1)', border: '1px solid rgba(230,199,110,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0, marginTop: '2px' }}>{rule.icon}</div>
                  <div>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.22em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '6px' }}>{rule.title}</p>
                    <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.75 }}>{rule.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.button onClick={handleEnter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} whileTap={{ scale: 0.98 }}
              style={{ width: '100%', padding: '16px', background: 'transparent', border: '1px solid rgba(230,199,110,0.55)', color: '#e6c76e', fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.35em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(230,199,110,0.1)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(230,199,110,0.18)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none' }}>
              Enter the Universe ✦
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

const backBtn: React.CSSProperties = {
  fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em',
  color: 'rgba(255,255,255,0.35)', padding: '8px 14px',
  border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
  cursor: 'pointer', textTransform: 'uppercase', borderRadius: '4px',
}

const continueBtn: React.CSSProperties = {
  fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em',
  color: '#e6c76e', padding: '12px 28px',
  border: '1px solid rgba(230,199,110,0.5)', background: 'rgba(230,199,110,0.08)',
  cursor: 'pointer', textTransform: 'uppercase', borderRadius: '4px',
}
