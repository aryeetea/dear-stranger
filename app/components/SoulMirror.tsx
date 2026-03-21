'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const RULES = [
  {
    icon: '✦',
    title: 'Letters take time',
    desc: 'Nothing arrives instantly. Letters drift through space and arrive over days. Anticipation is part of the experience.',
  },
  {
    icon: '◎',
    title: 'Hubs are people, not profiles',
    desc: 'Every glowing point in the universe is a real person. Click to see their presence. Write to connect.',
  },
  {
    icon: '✒',
    title: 'Write slowly',
    desc: 'There are no likes, no followers, no feeds. Only letters. Take your time. Say what matters.',
  },
  {
    icon: '⟡',
    title: 'The Observatory holds your correspondence',
    desc: 'Track letters in transit, read ones that have arrived, and revisit your archive of past exchanges.',
  },
  {
    icon: '🌀',
    title: 'Your Soul Mirror evolves',
    desc: 'Your avatar renews every 90 days. Identity here is not fixed — it drifts, like everything else.',
  },
]

const TOTAL_AI_STEPS = 3

export default function SoulMirror({
  onComplete,
}: {
  onComplete?: (answers: Record<number, string>) => void
}) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [value, setValue] = useState('')
  const [showWelcome, setShowWelcome] = useState(false)

  const [aiQuestions, setAiQuestions] = useState<string[]>([])
  const [loadingQuestion, setLoadingQuestion] = useState(true)
  const [error, setError] = useState('')

  const isHubNameStep = currentStep === TOTAL_AI_STEPS
  const totalSteps = TOTAL_AI_STEPS + 1
  const isLastQuestion = currentStep === totalSteps - 1

  const currentQuestion = isHubNameStep
    ? 'What would you name your place in the universe?'
    : aiQuestions[currentStep] || ''

  const currentPlaceholder = isHubNameStep
    ? 'Your hub name...'
    : 'Let the mirror answer slowly...'

  async function fetchNextQuestion(existingAnswers: Record<number, string>) {
    try {
      setLoadingQuestion(true)
      setError('')

      const response = await fetch('/api/soul-mirror-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: existingAnswers,
          step: Object.keys(existingAnswers).length,
          totalAiSteps: TOTAL_AI_STEPS,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate question')
      }

      setAiQuestions((prev) => {
        const next = [...prev]
        next[Object.keys(existingAnswers).length] = data.question
        return next
      })
    } catch (err) {
      console.error('Failed to fetch Soul Mirror question:', err)
      setError('The mirror is quiet right now. Please try again.')
    } finally {
      setLoadingQuestion(false)
    }
  }

  useEffect(() => {
    void fetchNextQuestion({})
  }, [])

  async function handleNext() {
    if (!value.trim()) return

    const updated = { ...answers, [currentStep]: value.trim() }
    setAnswers(updated)
    setValue('')

    if (isLastQuestion) {
      setShowWelcome(true)
      return
    }

    const nextStep = currentStep + 1
    setCurrentStep(nextStep)

    if (nextStep < TOTAL_AI_STEPS && !aiQuestions[nextStep]) {
      await fetchNextQuestion(updated)
    } else {
      setLoadingQuestion(false)
    }
  }

  function handleEnter() {
    onComplete?.(answers)
  }

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
          background: `
          radial-gradient(ellipse 60% 40% at 20% 30%, rgba(40,20,80,0.25) 0%, transparent 70%),
          radial-gradient(ellipse 50% 60% at 80% 70%, rgba(10,30,80,0.2) 0%, transparent 70%)
        `,
        }}
      />

      <AnimatePresence mode="wait">
        {!showWelcome && (
          <motion.div
            key={`step-${currentStep}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
            style={{
              background: 'rgba(10,12,30,0.75)',
              border: '1px solid rgba(201,168,76,0.15)',
              borderRadius: '4px',
              padding: 'clamp(36px, 5vw, 60px)',
              width: 'min(500px, 95vw)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 0 80px rgba(0,0,0,0.8), 0 0 40px rgba(201,168,76,0.06)',
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
                background:
                  'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)',
              }}
            />

            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'center',
                marginBottom: '28px',
              }}
            >
              {[...Array(totalSteps)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    background:
                      i === currentStep
                        ? '#c9a84c'
                        : i < currentStep
                          ? 'rgba(201,168,76,0.3)'
                          : 'rgba(255,255,255,0.12)',
                    boxShadow: i === currentStep ? '0 0 8px rgba(201,168,76,0.6)' : 'none',
                  }}
                  transition={{ duration: 0.4 }}
                  style={{ width: '6px', height: '6px', borderRadius: '50%' }}
                />
              ))}
            </div>

            <p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '10px',
                letterSpacing: '0.4em',
                color: 'rgba(201,168,76,0.5)',
                textTransform: 'uppercase',
                marginBottom: '24px',
              }}
            >
              Soul Mirror · Step {currentStep + 1} of {totalSteps}
            </p>

            <p
              style={{
                fontFamily: "'IM Fell English', serif",
                fontStyle: 'italic',
                fontSize: 'clamp(17px, 2.8vw, 22px)',
                color: 'rgba(255,255,255,0.88)',
                lineHeight: 1.6,
                marginBottom: '28px',
              }}
            >
              {loadingQuestion && !isHubNameStep
                ? 'The mirror is gathering a question...'
                : currentQuestion}
            </p>

            {isHubNameStep ? (
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={currentPlaceholder}
                type="text"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.88)',
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '20px',
                  lineHeight: 1.6,
                  padding: '10px 4px',
                  outline: 'none',
                  textAlign: 'center',
                  letterSpacing: '0.08em',
                  caretColor: '#c9a84c',
                }}
                onFocus={(e) => {
                  e.target.style.borderBottomColor = '#c9a84c'
                }}
                onBlur={(e) => {
                  e.target.style.borderBottomColor = 'rgba(255,255,255,0.12)'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleNext()
                }}
              />
            ) : (
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={currentPlaceholder}
                rows={4}
                disabled={loadingQuestion}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '2px',
                  color: 'rgba(255,255,255,0.88)',
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '16px',
                  lineHeight: 1.8,
                  padding: '14px 18px',
                  resize: 'none',
                  outline: 'none',
                  letterSpacing: '0.02em',
                  caretColor: '#c9a84c',
                  opacity: loadingQuestion ? 0.6 : 1,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(201,168,76,0.4)'
                  e.target.style.boxShadow = '0 0 20px rgba(201,168,76,0.08)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            )}

            {error && (
              <p
                style={{
                  marginTop: '14px',
                  fontFamily: "'IM Fell English', serif",
                  fontStyle: 'italic',
                  fontSize: '13px',
                  color: 'rgba(220,120,120,0.75)',
                  lineHeight: 1.5,
                }}
              >
                {error}
              </p>
            )}

            <motion.button
              onClick={() => void handleNext()}
              whileTap={{ scale: 0.98 }}
              disabled={loadingQuestion || !value.trim()}
              style={{
                marginTop: '24px',
                width: '100%',
                padding: '14px',
                background: 'transparent',
                border: '1px solid rgba(201,168,76,0.35)',
                color: loadingQuestion || !value.trim() ? 'rgba(201,168,76,0.35)' : '#c9a84c',
                fontFamily: "'Cinzel', serif",
                fontSize: '11px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                cursor: loadingQuestion || !value.trim() ? 'default' : 'pointer',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                if (loadingQuestion || !value.trim()) return
                e.currentTarget.style.background = 'rgba(201,168,76,0.08)'
                e.currentTarget.style.borderColor = '#c9a84c'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(201,168,76,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {loadingQuestion && !isHubNameStep ? 'Listening...' : 'Continue'}
            </motion.button>

            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: '20%',
                right: '20%',
                height: '1px',
                background:
                  'linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)',
              }}
            />
          </motion.div>
        )}

        {showWelcome && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5 }}
            style={{
              background: 'rgba(10,12,30,0.75)',
              border: '1px solid rgba(201,168,76,0.15)',
              borderRadius: '4px',
              padding: 'clamp(36px, 5vw, 56px)',
              width: 'min(560px, 95vw)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 0 80px rgba(0,0,0,0.8), 0 0 40px rgba(201,168,76,0.06)',
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
                background:
                  'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)',
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
              <div
                style={{
                  height: '1px',
                  background:
                    'linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)',
                  marginTop: '16px',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                marginBottom: '36px',
              }}
            >
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(201,168,76,0.1)'
                e.currentTarget.style.borderColor = '#c9a84c'
                e.currentTarget.style.boxShadow = '0 0 28px rgba(201,168,76,0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'
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
                background:
                  'linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}