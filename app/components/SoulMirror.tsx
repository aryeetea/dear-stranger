'use client'

import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DEFAULT_HUB_PALETTE, HUB_PALETTES, HUB_STYLES, type HubPaletteId, type HubStyle } from './UniverseMap'
import { useViewport } from '../lib/useViewport'

const MIN_EXCHANGES = 5
const MAX_EXCHANGES = 9

const MIRROR_VOICES = [
  { id: 'friend', label: 'Supportive Friend', desc: 'Warm, gentle, encouraging. Like talking to someone who always has your back.', icon: '🤍', prompt: 'You are a warm, gentle, encouraging friend. You speak with care and genuine interest. Never clinical, never performative — just real.' },
  { id: 'poetic', label: 'Poetic & Mysterious', desc: 'Speaks in metaphors and imagery. Every question feels like a riddle worth answering.', icon: '🌙', prompt: 'You are poetic and mysterious. Speak in metaphors, imagery, and layered meaning. Let silence breathe between your words.' },
  { id: 'direct', label: 'Clear & Grounded', desc: 'Simple, calm, and thoughtful. Clear questions without sounding cold or overly intense.', icon: '⚡', prompt: 'You are clear, grounded, and concise. Ask one honest question at a time in plain language. Be warm without being gushy, and direct without sounding harsh, abrupt, or clinical.' },
  { id: 'genz', label: 'Gen Z', desc: 'Chaotic, funny, very online. Will probably use "no cap" and mean it.', icon: '💀', prompt: 'You are extremely Gen Z. Use current slang naturally — no cap, slay, lowkey, periodt, understood the assignment, etc. Be chaotic but genuinely curious. Make it fun.' },
  { id: 'elder', label: 'Wise Elder', desc: 'Calm, deep, philosophical. Asks the questions that linger for days.', icon: '🔮', prompt: 'You are a wise elder — calm, patient, and philosophical. Ask questions that reveal deeper truths. Speak slowly and with weight.' },
  { id: 'playful', label: 'Playful & Curious', desc: 'Childlike wonder. Treats everything like a discovery worth celebrating.', icon: '✨', prompt: 'You are playful and endlessly curious. Approach each answer with wonder and delight. Make the person feel like what they share is genuinely fascinating.' },
]

const STYLE_OPTIONS = [
  { id: 'fantasy', label: 'Fantasy', desc: 'Magical, storybook, and glowing.' },
  { id: 'earthbound', label: 'Earthbound', desc: 'Soft, grounded, and very human.' },
  { id: 'mythic-modern', label: 'Mythic Modern', desc: 'Modern style with a little magic and symbolism.' },
  { id: 'celestial', label: 'Celestial', desc: 'Moonlit, starry, and a little divine.' },
  { id: 'regal', label: 'Regal', desc: 'Rich, elegant, and powerful.' },
  { id: 'nocturne', label: 'Nocturne', desc: 'Dark, moody, and cinematic.' },
  { id: 'luminous-future', label: 'Luminous Future', desc: 'Clean, futuristic, and softly glowing.' },
  { id: 'garden', label: 'Garden', desc: 'Natural, floral, and gentle.' },
  { id: 'sanctuary', label: 'Sanctuary', desc: 'Calm, candlelit, and peaceful.' },
  { id: 'velvet-gothic', label: 'Velvet Gothic', desc: 'Romantic, dramatic, and shadowy.' },
  { id: 'tideborn', label: 'Tideborn', desc: 'Oceanic, dreamy, and cool-toned.' },
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

function cleanDisplayText(text: string) {
  return text
    .replace(/\[CHIPS:[\s\S]*?\]/g, '')
    .replace(/\[DONE\]/g, '')
    .trim()
}

export interface SoulMirrorResumeState {
  phase?: 'voice' | 'style' | 'hubstyle' | 'hubcolor' | 'chat' | 'hubname' | 'bio' | 'ask' | 'welcome'
  selectedStyle?: StyleOption
  selectedHubStyle?: HubStyle
  selectedHubPalette?: HubPaletteId
  selectedVoice?: MirrorVoice
  userAnswers?: string[]
  hubName?: string
  bio?: string
  askAbout?: string
}

type Phase = 'voice' | 'style' | 'hubstyle' | 'hubcolor' | 'chat' | 'hubname' | 'bio' | 'ask' | 'welcome'

interface SoulMirrorProps {
  isReturning?: boolean
  errorMessage?: string
  resumeState?: SoulMirrorResumeState | null
  onComplete?: (
    answers: Record<number, string>,
    selectedStyle?: StyleOption,
    hubStyle?: HubStyle,
    hubPaletteId?: HubPaletteId,
    mirrorVoice?: MirrorVoice,
    bio?: string,
    hubNameFromOnboarding?: string,
    askAbout?: string,
  ) => void
}

export default function SoulMirror({
  isReturning = false,
  errorMessage = '',
  resumeState = null,
  onComplete,
}: SoulMirrorProps) {
  const [phase, setPhase] = useState<Phase>(resumeState?.phase || 'voice')
  const [selectedVoice, setSelectedVoice] = useState<MirrorVoice | null>(resumeState?.selectedVoice || null)
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(resumeState?.selectedStyle || null)
  const [selectedHubStyle, setSelectedHubStyle] = useState<HubStyle>(resumeState?.selectedHubStyle || 'portal')
  const [selectedHubPalette, setSelectedHubPalette] = useState<HubPaletteId>(resumeState?.selectedHubPalette || DEFAULT_HUB_PALETTE)
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string; isClosing?: boolean; chips?: string[] }[]>([])
  const [userAnswers, setUserAnswers] = useState<string[]>(resumeState?.userAnswers || [])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chatDone, setChatDone] = useState(Boolean(resumeState?.phase && (resumeState.phase === 'hubname' || resumeState.phase === 'bio' || resumeState.phase === 'ask' || resumeState.phase === 'welcome')))
  const [hubName, setHubName] = useState(resumeState?.hubName || '')
  const [bio, setBio] = useState(resumeState?.bio || '')
  const [askAbout, setAskAbout] = useState(resumeState?.askAbout || '')
  const bottomRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)
  const { isMobile, isTablet, isNarrow, isShort, height } = useViewport()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const fetchAIMessage = useCallback(async (history: typeof messages, answers: string[]) => {
    if (!selectedStyle || !selectedVoice) return
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
      const cleanedQuestion = cleanDisplayText(typeof data.question === 'string' ? data.question : '')
      setMessages(prev => [
        ...prev,
        { role: 'ai', text: cleanedQuestion, isClosing, chips },
      ])
      if (isClosing) setChatDone(true)
    } catch (err) {
      setError('Something went quiet. Try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [isReturning, selectedStyle, selectedVoice])

  useEffect(() => {
    if (phase !== 'chat' || !selectedStyle || !selectedVoice || hasInitialized.current) return
    hasInitialized.current = true
    void fetchAIMessage([], [])
  }, [fetchAIMessage, phase, selectedStyle, selectedVoice])

  async function handleSend(text?: string) {
    const finalText = (text || inputValue).trim()
    if (!finalText || loading || chatDone) return
    const newMessages = [...messages, { role: 'user' as const, text: finalText }]
    const newAnswers = [...userAnswers, finalText]
    setMessages(newMessages)
    setUserAnswers(newAnswers)
    setInputValue('')
    await fetchAIMessage(newMessages, newAnswers)
  }

  function handleEnter() {
    const answersRecord: Record<number, string> = {}
    userAnswers.forEach((a, i) => {
      answersRecord[i] = a
    })
    answersRecord[userAnswers.length] = hubName.trim()

    onComplete?.(
      answersRecord,
      selectedStyle || undefined,
      selectedHubStyle,
      selectedHubPalette,
      selectedVoice || undefined,
      bio.trim(),
      hubName.trim(),
      askAbout.trim(),
    )
  }

  const progressPct = Math.min(100, (userAnswers.length / MIN_EXCHANGES) * 100)
  const lastAiMsg = [...messages].reverse().find(m => m.role === 'ai' && !m.isClosing)
  const currentChips = lastAiMsg?.chips || []
  const wideSelectionCardWidth = isMobile
    ? '100%'
    : isTablet
      ? 'min(860px, calc(100vw - 48px))'
      : 'min(1040px, calc(100vw - 120px))'
  const selectionGridColumns = isNarrow
    ? '1fr'
    : 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))'
  const selectionCardMaxHeight = isMobile || isShort
    ? `min(820px, ${Math.max(height - 32, 420)}px)`
    : 'min(820px, 92vh)'

  const cardStyle: CSSProperties = {
    background: 'rgba(10,12,30,0.9)',
    border: '1px solid rgba(230,199,110,0.22)',
    borderRadius: '12px',
    backdropFilter: 'blur(24px)',
    boxShadow: '0 0 80px rgba(0,0,0,0.8)',
    position: 'relative',
    overflow: 'hidden',
  }

  const GoldLines = () => (
    <>
      <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(230,199,110,0.45), transparent)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(230,199,110,0.2), transparent)' }} />
    </>
  )

  const SectionHeader = ({ step, title, sub }: { step: string; title: string; sub: string }) => (
    <div style={{ textAlign: 'center', marginBottom: isMobile ? '22px' : '28px' }}>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: '6px' }}>{step}</p>
      <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(18px, 2.8vw, 26px)', color: 'rgba(255,255,255,0.92)', lineHeight: 1.5, marginBottom: '8px' }}>{title}</p>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{sub}</p>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000005', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center', zIndex: 50, padding: isMobile ? '16px' : '20px', paddingTop: isMobile ? 'max(16px, env(safe-area-inset-top))' : '20px', paddingBottom: isMobile ? 'max(16px, env(safe-area-inset-bottom))' : '20px', overflowY: 'auto' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 40% at 20% 30%, rgba(40,20,80,0.25) 0%, transparent 70%), radial-gradient(ellipse 50% 60% at 80% 70%, rgba(10,30,80,0.2) 0%, transparent 70%)' }} />

      {errorMessage && (
        <div style={{ position: 'fixed', top: isMobile ? 'max(12px, env(safe-area-inset-top))' : '20px', left: '50%', transform: 'translateX(-50%)', width: 'min(620px, calc(100vw - 24px))', padding: '12px 16px', background: 'rgba(60,15,20,0.88)', border: '1px solid rgba(220,120,120,0.35)', borderRadius: '10px', zIndex: 60, boxShadow: '0 14px 40px rgba(0,0,0,0.35)' }}>
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,220,220,0.92)', textAlign: 'center' }}>{errorMessage}</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === 'voice' && (
          <motion.div key="voice" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}
            style={{ ...cardStyle, width: wideSelectionCardWidth, maxHeight: selectionCardMaxHeight, overflowY: 'auto', padding: 'clamp(28px,5vw,44px)' }}>
            <GoldLines />
            <SectionHeader
              step="Soul Mirror · Step 1 of 5"
              title={isReturning ? 'Hello, my old friend. How shall I speak to you this time?' : 'How would you like your mirror to speak?'}
              sub="Choose the voice the mirror uses during your experience."
            />
            <div style={{ display: 'grid', gridTemplateColumns: selectionGridColumns, gap: '12px' }}>
              {MIRROR_VOICES.map(voice => (
                <motion.button key={voice.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setSelectedVoice(voice); setPhase('style') }}
                  style={{ textAlign: 'left', padding: '18px 16px', borderRadius: '12px', border: '1px solid rgba(230,199,110,0.2)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.2s' }}>
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
            style={{ ...cardStyle, width: wideSelectionCardWidth, maxHeight: selectionCardMaxHeight, overflowY: 'auto', padding: 'clamp(28px,5vw,44px)' }}>
            <GoldLines />
            <SectionHeader
              step="Soul Mirror · Step 2 of 5"
              title="Choose your avatar theme"
              sub="Pick the overall vibe for your portrait: magical, modern, moonlit, dark, soft, regal, or something in between."
            />
            <div style={{ display: 'grid', gridTemplateColumns: selectionGridColumns, gap: '12px', marginBottom: '24px' }}>
              {STYLE_OPTIONS.map(style => (
                <motion.button key={style.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setSelectedStyle(style); setPhase('hubstyle') }}
                  style={{ textAlign: 'left', minHeight: isMobile ? undefined : '138px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(230,199,110,0.2)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.2s' }}>
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
            style={{ ...cardStyle, width: wideSelectionCardWidth, maxHeight: selectionCardMaxHeight, overflowY: 'auto', padding: 'clamp(28px,5vw,44px)' }}>
            <GoldLines />
            <SectionHeader
              step="Soul Mirror · Step 3 of 5"
              title="How does your hub appear in the universe?"
              sub="Choose a form that feels like a place someone would want to wander into."
            />
            <div style={{ display: 'grid', gridTemplateColumns: selectionGridColumns, gap: '12px', marginBottom: '28px' }}>
              {HUB_STYLES.map(style => {
                const isSelected = selectedHubStyle === style.id
                return (
                  <motion.button key={style.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedHubStyle(style.id)}
                    style={{ textAlign: 'left', padding: '18px 16px', borderRadius: '12px', border: isSelected ? '1px solid rgba(230,199,110,0.7)' : '1px solid rgba(230,199,110,0.2)', background: isSelected ? 'rgba(230,199,110,0.12)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}>
                    {isSelected && <div style={{ position: 'absolute', top: '10px', right: '12px', width: '16px', height: '16px', borderRadius: '50%', background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#000', fontWeight: 'bold' }}>✓</div>}
                    <p style={{ fontSize: '20px', marginBottom: '8px' }}>{style.icon}</p>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.18em', color: isSelected ? '#e6c76e' : 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: '6px' }}>{style.label}</p>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{style.desc}</p>
                  </motion.button>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: isMobile ? 'column-reverse' : 'row', gap: '12px' }}>
              <button onClick={() => setPhase('style')} style={backBtn}>← Back</button>
              <button onClick={() => setPhase('hubcolor')} style={continueBtn}>
                Choose Colors ✦
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'hubcolor' && (
          <motion.div key="hubcolor" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}
            style={{ ...cardStyle, width: wideSelectionCardWidth, maxHeight: selectionCardMaxHeight, overflowY: 'auto', padding: 'clamp(28px,5vw,44px)' }}>
            <GoldLines />
            <SectionHeader
              step="Soul Mirror · Step 4 of 5"
              title="What color world does your hub glow in?"
              sub="Pick a palette that feels beautiful to you. This becomes the atmosphere and light your hub carries into the map."
            />
            <div style={{ display: 'grid', gridTemplateColumns: selectionGridColumns, gap: '12px', marginBottom: '28px' }}>
              {HUB_PALETTES.map((palette) => {
                const isSelected = selectedHubPalette === palette.id
                return (
                  <motion.button
                    key={palette.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedHubPalette(palette.id)}
                    style={{ textAlign: 'left', padding: '16px', borderRadius: '12px', border: isSelected ? '1px solid rgba(230,199,110,0.7)' : '1px solid rgba(230,199,110,0.2)', background: isSelected ? 'rgba(230,199,110,0.12)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                  >
                    {isSelected && <div style={{ position: 'absolute', top: '10px', right: '12px', width: '16px', height: '16px', borderRadius: '50%', background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#000', fontWeight: 'bold' }}>✓</div>}
                    <div style={{ width: '100%', height: '44px', borderRadius: '999px', background: palette.swatch, marginBottom: '12px', border: '1px solid rgba(255,255,255,0.12)', boxShadow: 'inset 0 1px 10px rgba(255,255,255,0.08)' }} />
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.18em', color: isSelected ? '#e6c76e' : 'rgba(255,255,255,0.82)', textTransform: 'uppercase', marginBottom: '6px' }}>{palette.label}</p>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '13px', color: 'rgba(255,255,255,0.56)', lineHeight: 1.5 }}>{palette.desc}</p>
                  </motion.button>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: isMobile ? 'column-reverse' : 'row', gap: '12px' }}>
              <button onClick={() => setPhase('hubstyle')} style={backBtn}>← Back</button>
              <button onClick={() => setPhase('chat')} style={continueBtn}>
                Enter the Mirror ✦
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'chat' && (
          <motion.div key="chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}
            style={{ ...cardStyle, width: 'min(580px, 100%)', height: isMobile ? `min(760px, ${Math.max(height - 32, 420)}px)` : 'min(720px, 92vh)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(230,199,110,0.45), transparent)' }} />

            <div style={{ padding: '16px 22px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : 0 }}>
                <div>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.4em', color: '#e6c76e', textTransform: 'uppercase' }}>Soul Mirror · Step 5 of 5</p>
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginTop: '3px' }}>
                    {selectedVoice?.label} · {selectedStyle?.label} · {HUB_STYLES.find(style => style.id === selectedHubStyle)?.label} · {HUB_PALETTES.find(palette => palette.id === selectedHubPalette)?.label}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: '4px' }}>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{chatDone ? 'complete' : `${userAnswers.length} / ${MIN_EXCHANGES}+`}</p>
                  <div style={{ width: '80px', height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <motion.div animate={{ width: chatDone ? '100%' : `${progressPct}%` }} transition={{ duration: 0.4 }} style={{ height: '100%', background: '#e6c76e', borderRadius: '2px' }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 8px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                    style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: isMobile ? '92%' : '84%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.isClosing ? 'rgba(230,199,110,0.1)' : msg.role === 'user' ? 'rgba(230,199,110,0.13)' : 'rgba(255,255,255,0.06)', border: msg.isClosing ? '1px solid rgba(230,199,110,0.4)' : msg.role === 'user' ? '1px solid rgba(230,199,110,0.25)' : '1px solid rgba(255,255,255,0.09)' }}>
                      {msg.role === 'ai' && (
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.2em', color: msg.isClosing ? '#e6c76e' : 'rgba(230,199,110,0.75)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          {msg.isClosing ? 'Mirror · I can see you now' : `${selectedVoice?.label || 'Mirror'}`}
                        </p>
                      )}
                      <p style={{ fontFamily: msg.role === 'ai' ? "'IM Fell English', serif" : "'Cormorant Garamond', serif", fontStyle: msg.role === 'ai' ? 'italic' : 'normal', fontSize: msg.role === 'ai' ? '16px' : '15px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.65 }}>
                        {msg.role === 'ai' ? cleanDisplayText(msg.text) : msg.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '12px 18px', borderRadius: '16px 16px 16px 4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {[0, 1, 2].map(i => <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(230,199,110,0.8)' }} />)}
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
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '13px', color: 'rgba(230,199,110,0.88)', padding: '5px 12px', border: '1px solid rgba(230,199,110,0.28)', borderRadius: '20px', background: 'rgba(230,199,110,0.06)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexDirection: isMobile ? 'column' : 'row' }}>
                    <textarea value={inputValue} onChange={e => setInputValue(e.target.value)}
                      placeholder="Describe yourself in as much detail as you like..." rows={2}
                      disabled={loading || chatDone}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.9)', fontFamily: "'Cormorant Garamond', serif", fontSize: '15px', lineHeight: 1.6, padding: '10px 14px', resize: 'none', outline: 'none', caretColor: '#e6c76e' }} />
                    <button onClick={() => void handleSend()} disabled={!inputValue.trim() || loading}
                      style={{ width: isMobile ? '100%' : '42px', height: '42px', borderRadius: '10px', background: inputValue.trim() ? 'rgba(230,199,110,0.18)' : 'rgba(255,255,255,0.04)', border: `1px solid ${inputValue.trim() ? 'rgba(230,199,110,0.45)' : 'rgba(255,255,255,0.08)'}`, color: inputValue.trim() ? '#e6c76e' : 'rgba(255,255,255,0.35)', fontSize: '16px', cursor: inputValue.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✦</button>
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
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.94)', fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', padding: '10px 4px', outline: 'none', textAlign: 'center', letterSpacing: '0.08em', caretColor: '#e6c76e', marginBottom: '28px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: isMobile ? 'column-reverse' : 'row', gap: '12px' }}>
              <button onClick={() => setPhase('chat')} style={backBtn}>← Back</button>
              <button onClick={() => hubName.trim() && setPhase('bio')} disabled={!hubName.trim()}
                style={{ ...continueBtn, opacity: hubName.trim() ? 1 : 0.5 }}>
                Continue
              </button>
            </div>
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
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'rgba(255,255,255,0.9)', fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', lineHeight: 1.8, padding: '14px 16px', outline: 'none', resize: 'none', caretColor: '#e6c76e', marginBottom: '20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: isMobile ? 'column-reverse' : 'row', gap: '12px' }}>
              <button onClick={() => setPhase('hubname')} style={backBtn}>← Back</button>
              <button onClick={() => setPhase('ask')} style={continueBtn}>
                {bio.trim() ? 'Continue ✦' : 'Skip for now ✦'}
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'ask' && (
          <motion.div
            key="ask"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
            style={{ ...cardStyle, width: 'min(520px, 95vw)', padding: 'clamp(36px,5vw,52px)' }}
          >
            <GoldLines />
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '10px' }}>Ask Me About</p>
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(16px,2.5vw,22px)', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6, marginBottom: '8px' }}>What kinds of things should people write to you about?</p>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>This appears on your hub card. You can always edit it later in your profile.</p>
            </div>

            <textarea
              value={askAbout}
              onChange={(e) => setAskAbout(e.target.value)}
              placeholder="music, late night thoughts, study abroad, photography, dreams..."
              rows={4}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.9)',
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '16px',
                lineHeight: 1.8,
                padding: '14px 16px',
                outline: 'none',
                resize: 'none',
                caretColor: '#e6c76e',
                marginBottom: '20px',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: isMobile ? 'column-reverse' : 'row', gap: '12px' }}>
              <button onClick={() => setPhase('bio')} style={backBtn}>
                ← Back
              </button>
              <button onClick={() => setPhase('welcome')} style={continueBtn}>
                {askAbout.trim() ? 'Continue ✦' : 'Skip for now ✦'}
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'welcome' && (
          <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.5 }}
            style={{ ...cardStyle, width: 'min(620px, 95vw)', padding: 'clamp(36px,5vw,52px)', maxHeight: isMobile || isShort ? `min(780px, ${Math.max(height - 32, 420)}px)` : '90vh', overflowY: 'auto' }}>
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
              style={{ width: '100%', padding: '16px', background: 'transparent', border: '1px solid rgba(230,199,110,0.55)', color: '#e6c76e', fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.35em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px' }}>
              Enter the Universe ✦
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const backBtn: CSSProperties = {
  fontFamily: "'Cinzel', serif",
  fontSize: '8px',
  letterSpacing: '0.25em',
  color: 'rgba(255,255,255,0.35)',
  padding: '8px 14px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent',
  cursor: 'pointer',
  textTransform: 'uppercase',
  borderRadius: '4px',
}

const continueBtn: CSSProperties = {
  fontFamily: "'Cinzel', serif",
  fontSize: '10px',
  letterSpacing: '0.3em',
  color: '#e6c76e',
  padding: '12px 28px',
  border: '1px solid rgba(230,199,110,0.5)',
  background: 'rgba(230,199,110,0.08)',
  cursor: 'pointer',
  textTransform: 'uppercase',
  borderRadius: '4px',
}
