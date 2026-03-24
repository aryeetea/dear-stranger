'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import {
  updateHub,
  signOut,
  uploadAvatarToStorage,
} from '../lib/auth'
import { supabase } from '../../lib/supabase'
import { useViewport } from '../lib/useViewport'
import {
  DEFAULT_HUB_PALETTE,
  HUB_PALETTES,
  HUB_STYLES,
  type HubPaletteId,
  type HubStyle,
} from './UniverseMap'

const MAX_REGEN_ATTEMPTS = 3

export default function Profile({
  hubName,
  bio,
  askAbout,
  avatarUrl: initialAvatarUrl,
  hubStyle: initialHubStyle = 'portal',
  hubPaletteId: initialHubPaletteId = DEFAULT_HUB_PALETTE,
  regenCount: initialRegenCount,
  onClose,
  onUpdateHub,
}: {
  hubName?: string
  bio?: string
  askAbout?: string
  avatarUrl?: string
  hubStyle?: HubStyle
  hubPaletteId?: HubPaletteId
  regenCount?: number
  onClose?: () => void
  onUpdateHub?: (updates: {
    hubName?: string
    bio?: string
    askAbout?: string
    avatarUrl?: string
    hubStyle?: HubStyle
    hubPaletteId?: HubPaletteId
  }) => void
}) {
  const { isMobile, isTablet, isNarrow } = useViewport()

  const [hubNameState, setHubNameState] = useState(hubName || 'Your Hub')
  const [bioState, setBioState] = useState(
    bio || 'A wanderer who arrived here quietly, carrying something unspoken.',
  )
  const [askState, setAskState] = useState(
    askAbout || 'Silence, slow mornings, and letters that take their time.',
  )
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(initialAvatarUrl || '')
  const [currentHubStyle, setCurrentHubStyle] = useState<HubStyle>(initialHubStyle)
  const [currentHubPaletteId, setCurrentHubPaletteId] =
    useState<HubPaletteId>(initialHubPaletteId)

  const [regenCount, setRegenCount] = useState(initialRegenCount ?? 0)
  const [regenLoading, setRegenLoading] = useState(false)
  const [regenFeedback, setRegenFeedback] = useState('')
  const [showRegenInput, setShowRegenInput] = useState(false)
  const [regenError, setRegenError] = useState('')

  const [editingHub, setEditingHub] = useState(false)
  const [editingBio, setEditingBio] = useState(false)
  const [editingAsk, setEditingAsk] = useState(false)
  const [editingAppearance, setEditingAppearance] = useState(false)
  const [saving, setSaving] = useState(false)

  const [hubDraft, setHubDraft] = useState(hubName || 'Your Hub')
  const [bioDraft, setBioDraft] = useState(
    bio || 'A wanderer who arrived here quietly, carrying something unspoken.',
  )
  const [askDraft, setAskDraft] = useState(
    askAbout || 'Silence, slow mornings, and letters that take their time.',
  )
  const [hubStyleDraft, setHubStyleDraft] = useState<HubStyle>(initialHubStyle)
  const [hubPaletteDraft, setHubPaletteDraft] = useState<HubPaletteId>(initialHubPaletteId)
  const [saveError, setSaveError] = useState('')

  const [leavingConfirm, setLeavingConfirm] = useState(false)
  useEffect(() => {
    setHubNameState(hubName || 'Your Hub')
    setHubDraft(hubName || 'Your Hub')
  }, [hubName])

  useEffect(() => {
    setBioState(bio || 'A wanderer who arrived here quietly, carrying something unspoken.')
    setBioDraft(bio || 'A wanderer who arrived here quietly, carrying something unspoken.')
  }, [bio])

  useEffect(() => {
    setAskState(askAbout || 'Silence, slow mornings, and letters that take their time.')
    setAskDraft(askAbout || 'Silence, slow mornings, and letters that take their time.')
  }, [askAbout])

  useEffect(() => {
    setCurrentAvatarUrl(initialAvatarUrl || '')
  }, [initialAvatarUrl])

  useEffect(() => {
    setCurrentHubStyle(initialHubStyle)
    setHubStyleDraft(initialHubStyle)
  }, [initialHubStyle])

  useEffect(() => {
    setCurrentHubPaletteId(initialHubPaletteId)
    setHubPaletteDraft(initialHubPaletteId)
  }, [initialHubPaletteId])

  useEffect(() => {
    async function loadRegenCount() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) return

        const { data, error } = await supabase
          .from('hubs')
          .select('regen_count')
          .eq('id', user.id)
          .maybeSingle()

        if (error || !data) return

        if (data.regen_count !== undefined && data.regen_count !== null) {
          setRegenCount(data.regen_count)
        }
      } catch {}
    }

    void loadRegenCount()
  }, [])

  const attemptsLeft = MAX_REGEN_ATTEMPTS - regenCount
  const refreshProgress = 0

  async function handleLeave() {
    if (!leavingConfirm) {
      setLeavingConfirm(true)
      setTimeout(() => setLeavingConfirm(false), 4000)
      return
    }

    await signOut()
    window.location.reload()
  }

  async function regenerateAvatar() {
    if (regenCount >= MAX_REGEN_ATTEMPTS || regenLoading) return

    setRegenError('')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)

    try {
      setRegenLoading(true)
      setShowRegenInput(false)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setRegenError('No user found. Please sign in again.')
        return
      }

      const res = await fetch('/api/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: { 0: bioState, 1: askState },
          feedback: regenFeedback,
          style: initialHubStyle,
          mode: 'reimagine',
          userId: user.id,
        }),
        signal: controller.signal,
      })

      let data: { imageUrl?: string; error?: string }
      try {
        data = await res.json()
      } catch {
        throw new Error('Failed to parse avatar response. Please try again later.')
      }

      if (!res.ok || data.error) {
        let errorMsg = data?.error || `Avatar generation failed (status ${res.status}).`
        if (res.status === 500 && errorMsg.includes('OPENAI_API_KEY')) {
          errorMsg = 'Avatar generation is currently unavailable. Please try again later.'
        }
        setRegenError(errorMsg)
        return
      }

      if (!data.imageUrl) {
        setRegenError(
          'No avatar image came back from the mirror. Please try again or contact support.',
        )
        return
      }

      const permanentUrl = await uploadAvatarToStorage(data.imageUrl, user.id)

      const newCount = regenCount + 1
      setCurrentAvatarUrl(permanentUrl)
      setRegenCount(newCount)
      setRegenFeedback('')
      await updateHub({ avatar_url: permanentUrl, regen_count: newCount })
      onUpdateHub?.({ avatarUrl: permanentUrl })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setRegenError(
          'The mirror took too long to respond. Your attempt was not used. Try again.',
        )
      } else {
        console.error('Regen failed:', err)
        setRegenError(
          err instanceof Error && err.message
            ? err.message
            : 'Something went wrong. Your attempt was not used. Try again.',
        )
      }
    } finally {
      clearTimeout(timeout)
      setRegenLoading(false)
    }
  }

  async function saveHub() {
    try {
      setSaving(true)
      setSaveError('')
      await updateHub({ hub_name: hubDraft })
      setHubNameState(hubDraft)
      onUpdateHub?.({ hubName: hubDraft })
      setEditingHub(false)
    } catch (err) {
      console.error(err)
      setSaveError(err instanceof Error ? err.message : 'Could not save hub name.')
    } finally {
      setSaving(false)
    }
  }

  async function saveBio() {
    try {
      setSaving(true)
      setSaveError('')
      await updateHub({ bio: bioDraft })
      setBioState(bioDraft)
      onUpdateHub?.({ bio: bioDraft })
      setEditingBio(false)
    } catch (err) {
      console.error(err)
      setSaveError(err instanceof Error ? err.message : 'Could not save bio.')
    } finally {
      setSaving(false)
    }
  }

  async function saveAsk() {
    try {
      setSaving(true)
      setSaveError('')
      await updateHub({ ask_about: askDraft })
      setAskState(askDraft)
      onUpdateHub?.({ askAbout: askDraft })
      setEditingAsk(false)
    } catch (err) {
      console.error(err)
      setSaveError(err instanceof Error ? err.message : 'Could not save ask me about.')
    } finally {
      setSaving(false)
    }
  }

  async function saveAppearance() {
    try {
      setSaving(true)
      setSaveError('')
      await updateHub({ hub_style: hubStyleDraft, backdrop_id: hubPaletteDraft })
      setCurrentHubStyle(hubStyleDraft)
      setCurrentHubPaletteId(hubPaletteDraft)
      onUpdateHub?.({ hubStyle: hubStyleDraft, hubPaletteId: hubPaletteDraft })
      setEditingAppearance(false)
    } catch (err) {
      console.error(err)
      setSaveError(err instanceof Error ? err.message : 'Could not save hub appearance.')
    } finally {
      setSaving(false)
    }
  }

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
        zIndex: 70,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 55% 40% at 15% 25%, rgba(40,15,80,0.3) 0%, transparent 65%), radial-gradient(ellipse 45% 55% at 85% 75%, rgba(10,20,70,0.25) 0%, transparent 65%)',
        }}
      />

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          top: isMobile ? 'max(16px, env(safe-area-inset-top))' : '28px',
          right: isMobile ? '16px' : '28px',
          background: 'none',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.55)',
          fontFamily: "'Cinzel', serif",
          fontSize: '9px',
          letterSpacing: '0.3em',
          padding: '8px 16px',
          cursor: 'pointer',
          textTransform: 'uppercase',
          zIndex: 80,
        }}
      >
        ← Universe
      </motion.button>

      <div
        style={{
          display: 'flex',
          flexDirection: isTablet ? 'column' : 'row',
          minHeight: '100svh',
          position: 'relative',
          zIndex: 2,
          paddingTop: isMobile ? '64px' : 0,
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            width: isTablet ? '100%' : '42%',
            minHeight: isTablet ? (isMobile ? '40vh' : '46vh') : undefined,
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 3,
              pointerEvents: 'none',
              background: isTablet
                ? 'linear-gradient(to bottom, transparent 55%, rgba(0,0,5,0.92) 100%)'
                : 'linear-gradient(to right, transparent 65%, rgba(0,0,5,0.97) 100%), linear-gradient(to bottom, rgba(0,0,5,0.3) 0%, transparent 15%, transparent 85%, rgba(0,0,5,0.6) 100%)',
            }}
          />

          {regenLoading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,5,0.7)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '2px solid rgba(201,168,76,0.3)',
                    borderTopColor: '#c9a84c',
                    margin: '0 auto 16px',
                  }}
                />
                <p
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '9px',
                    letterSpacing: '0.3em',
                    color: 'rgba(201,168,76,0.7)',
                    textTransform: 'uppercase',
                  }}
                >
                  Reimagining...
                </p>
              </div>
            </div>
          )}

          {currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt="Avatar"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'top center',
                display: 'block',
                minHeight: isTablet ? (isMobile ? '40vh' : '46vh') : '100vh',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                minHeight: isTablet ? (isMobile ? '40vh' : '46vh') : '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(180deg, rgba(20,25,60,0.8), rgba(5,8,20,0.9))',
              }}
            >
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  border: '1px solid rgba(201,168,76,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                }}
              >
                ✦
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            flex: 1,
            padding: isTablet
              ? 'clamp(28px, 5vw, 40px) clamp(20px, 5vw, 32px) max(28px, env(safe-area-inset-bottom))'
              : 'clamp(60px,8vh,100px) clamp(28px,5vw,60px) 80px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ marginBottom: '40px' }}>
            <p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '9px',
                letterSpacing: '0.5em',
                color: 'rgba(201,168,76,0.6)',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Soul Mirror
            </p>

            {editingHub ? (
              <div style={{ marginBottom: '8px' }}>
                <input
                  value={hubDraft}
                  onChange={(e) => setHubDraft(e.target.value)}
                  autoFocus
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(201,168,76,0.3)',
                    color: 'rgba(255,255,255,0.95)',
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 'clamp(22px,3vw,32px)',
                    letterSpacing: '0.06em',
                    padding: '8px 12px',
                    outline: 'none',
                    borderRadius: '2px',
                    width: '100%',
                    caretColor: '#c9a84c',
                    marginBottom: '10px',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => void saveHub()} style={saveBtn} disabled={saving}>
                    Save
                  </button>
                  <button onClick={() => setEditingHub(false)} style={cancelBtn}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: isNarrow ? 'flex-start' : 'center',
                  flexDirection: isNarrow ? 'column' : 'row',
                  gap: '16px',
                }}
              >
                <p
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 'clamp(28px,4vw,48px)',
                    letterSpacing: '0.06em',
                    color: 'rgba(255,255,255,0.95)',
                    lineHeight: 1.1,
                  }}
                >
                  {hubNameState}
                </p>
                <button
                  onClick={() => {
                    setHubDraft(hubNameState)
                    setEditingHub(true)
                  }}
                  style={editBtn}
                >
                  Edit
                </button>
              </div>
            )}

            {saveError && (
              <p
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontStyle: 'italic',
                  fontSize: '13px',
                  color: 'rgba(235,140,140,0.9)',
                  marginTop: '10px',
                }}
              >
                {saveError}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginTop: '14px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', width: '36px', height: '36px' }}>
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 36 36"
                    style={{ transform: 'rotate(-90deg)' }}
                  >
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="2"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="#c9a84c"
                      strokeWidth="2"
                      strokeDasharray={`${2 * Math.PI * 15}`}
                      strokeDashoffset={`${2 * Math.PI * 15 * (1 - refreshProgress / 100)}`}
                      strokeLinecap="round"
                      style={{ opacity: 0.6 }}
                    />
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'Cinzel', serif",
                      fontSize: '7px',
                      color: 'rgba(201,168,76,0.7)',
                    }}
                  >
                    90d
                  </div>
                </div>
                <p
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '8px',
                    letterSpacing: '0.2em',
                    color: 'rgba(255,255,255,0.35)',
                    textTransform: 'uppercase',
                  }}
                >
                  Soul Cycle
                </p>
              </div>

              {attemptsLeft > 0 ? (
                <button
                  onClick={() => setShowRegenInput((v) => !v)}
                  disabled={regenLoading}
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '8px',
                    letterSpacing: '0.2em',
                    color: 'rgba(201,168,76,0.7)',
                    padding: '6px 12px',
                    border: '1px solid rgba(201,168,76,0.25)',
                    background: 'transparent',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    borderRadius: '4px',
                  }}
                >
                  ✦ Reimagine · {attemptsLeft} left
                </button>
              ) : (
                <p
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '8px',
                    letterSpacing: '0.15em',
                    color: 'rgba(255,255,255,0.25)',
                    textTransform: 'uppercase',
                  }}
                >
                  Your form is sealed · 90 days until the mirror opens
                </p>
              )}
            </div>

            {showRegenInput && attemptsLeft > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: '12px' }}
              >
                <p
                  style={{
                    fontFamily: "'IM Fell English', serif",
                    fontStyle: 'italic',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: '8px',
                  }}
                >
                  Tell the mirror what to change — or leave blank to reimagine freely.
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexDirection: isNarrow ? 'column' : 'row',
                  }}
                >
                  <input
                    value={regenFeedback}
                    onChange={(e) => setRegenFeedback(e.target.value)}
                    placeholder="e.g. more realistic, darker mood, different outfit..."
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(201,168,76,0.2)',
                      borderRadius: '6px',
                      color: 'rgba(255,255,255,0.85)',
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: '14px',
                      padding: '8px 12px',
                      outline: 'none',
                      caretColor: '#c9a84c',
                    }}
                  />
                  <button
                    onClick={() => void regenerateAvatar()}
                    disabled={regenLoading}
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '9px',
                      letterSpacing: '0.2em',
                      color: '#c9a84c',
                      padding: '8px 16px',
                      border: '1px solid rgba(201,168,76,0.35)',
                      background: 'transparent',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Reimagine ✦
                  </button>
                </div>

                {regenError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginTop: '8px' }}
                  >
                    <p
                      style={{
                        fontFamily: "'IM Fell English', serif",
                        fontStyle: 'italic',
                        fontSize: '15px',
                        color: 'rgba(220,100,100,0.95)',
                        background: 'rgba(40,0,0,0.13)',
                        border: '1px solid rgba(220,100,100,0.25)',
                        borderRadius: '6px',
                        padding: '10px 14px',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-line',
                        maxWidth: 480,
                      }}
                    >
                      {regenError}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>

          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, rgba(201,168,76,0.3), transparent)',
              marginBottom: '32px',
            }}
          />

          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <p
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '9px',
                  letterSpacing: '0.4em',
                  color: 'rgba(201,168,76,0.65)',
                  textTransform: 'uppercase',
                }}
              >
                Bio
              </p>
              {!editingBio && (
                <button
                  onClick={() => {
                    setBioDraft(bioState)
                    setEditingBio(true)
                  }}
                  style={editBtn}
                >
                  Edit
                </button>
              )}
            </div>

            {editingBio ? (
              <div>
                <textarea
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                  autoFocus
                  rows={4}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(201,168,76,0.25)',
                    color: 'rgba(255,255,255,0.92)',
                    fontFamily: "'IM Fell English', serif",
                    fontStyle: 'italic',
                    fontSize: '16px',
                    lineHeight: 1.7,
                    padding: '12px 16px',
                    outline: 'none',
                    resize: 'none',
                    borderRadius: '4px',
                    caretColor: '#c9a84c',
                    marginBottom: '10px',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => void saveBio()} style={saveBtn} disabled={saving}>
                    Save
                  </button>
                  <button onClick={() => setEditingBio(false)} style={cancelBtn}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontStyle: 'italic',
                  fontSize: 'clamp(15px,1.8vw,18px)',
                  color: 'rgba(255,255,255,0.82)',
                  lineHeight: 1.8,
                }}
              >
                {bioState}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <p
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '9px',
                  letterSpacing: '0.4em',
                  color: 'rgba(201,168,76,0.65)',
                  textTransform: 'uppercase',
                }}
              >
                Ask me about
              </p>
              {!editingAsk && (
                <button
                  onClick={() => {
                    setAskDraft(askState)
                    setEditingAsk(true)
                  }}
                  style={editBtn}
                >
                  Edit
                </button>
              )}
            </div>

            {editingAsk ? (
              <div>
                <textarea
                  value={askDraft}
                  onChange={(e) => setAskDraft(e.target.value)}
                  autoFocus
                  rows={2}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(201,168,76,0.25)',
                    color: 'rgba(255,255,255,0.92)',
                    fontFamily: "'IM Fell English', serif",
                    fontStyle: 'italic',
                    fontSize: '16px',
                    lineHeight: 1.7,
                    padding: '12px 16px',
                    outline: 'none',
                    resize: 'none',
                    borderRadius: '4px',
                    caretColor: '#c9a84c',
                    marginBottom: '10px',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => void saveAsk()} style={saveBtn} disabled={saving}>
                    Save
                  </button>
                  <button onClick={() => setEditingAsk(false)} style={cancelBtn}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontStyle: 'italic',
                  fontSize: 'clamp(15px,1.8vw,18px)',
                  color: 'rgba(255,255,255,0.72)',
                  lineHeight: 1.7,
                }}
              >
                {askState}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <p
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '9px',
                  letterSpacing: '0.4em',
                  color: 'rgba(201,168,76,0.65)',
                  textTransform: 'uppercase',
                }}
              >
                Hub Appearance
              </p>
              {!editingAppearance && (
                <button
                  onClick={() => {
                    setHubStyleDraft(currentHubStyle)
                    setHubPaletteDraft(currentHubPaletteId)
                    setEditingAppearance(true)
                  }}
                  style={editBtn}
                >
                  Edit
                </button>
              )}
            </div>

            {editingAppearance ? (
              <div>
                <p
                  style={{
                    fontFamily: "'IM Fell English', serif",
                    fontStyle: 'italic',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: '10px',
                  }}
                >
                  Choose a shape and a glow palette for how your place appears on the map.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isNarrow ? '1fr' : 'repeat(auto-fill, minmax(170px, 1fr))',
                    gap: '10px',
                    marginBottom: '16px',
                  }}
                >
                  {HUB_STYLES.map((style) => {
                    const isSelected = hubStyleDraft === style.id
                    return (
                      <button
                        key={style.id}
                        onClick={() => setHubStyleDraft(style.id)}
                        style={{
                          textAlign: 'left',
                          padding: '14px 12px',
                          borderRadius: '10px',
                          border: isSelected
                            ? '1px solid rgba(230,199,110,0.6)'
                            : '1px solid rgba(255,255,255,0.08)',
                          background: isSelected
                            ? 'rgba(230,199,110,0.1)'
                            : 'rgba(255,255,255,0.03)',
                          color: 'rgba(255,255,255,0.88)',
                          cursor: 'pointer',
                        }}
                      >
                        <p style={{ fontSize: '18px', marginBottom: '8px' }}>{style.icon}</p>
                        <p
                          style={{
                            fontFamily: "'Cinzel', serif",
                            fontSize: '9px',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            color: isSelected ? '#e6c76e' : 'rgba(255,255,255,0.75)',
                            marginBottom: '6px',
                          }}
                        >
                          {style.label}
                        </p>
                        <p
                          style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: '13px',
                            color: 'rgba(255,255,255,0.55)',
                            lineHeight: 1.45,
                          }}
                        >
                          {style.desc}
                        </p>
                      </button>
                    )
                  })}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isNarrow ? '1fr' : 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '10px',
                    marginBottom: '14px',
                  }}
                >
                  {HUB_PALETTES.map((palette) => {
                    const isSelected = hubPaletteDraft === palette.id
                    return (
                      <button
                        key={palette.id}
                        onClick={() => setHubPaletteDraft(palette.id)}
                        style={{
                          textAlign: 'left',
                          padding: '12px',
                          borderRadius: '10px',
                          border: isSelected
                            ? '1px solid rgba(230,199,110,0.6)'
                            : '1px solid rgba(255,255,255,0.08)',
                          background: isSelected
                            ? 'rgba(230,199,110,0.1)'
                            : 'rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: '36px',
                            borderRadius: '999px',
                            background: palette.swatch,
                            marginBottom: '10px',
                            border: '1px solid rgba(255,255,255,0.12)',
                          }}
                        />
                        <p
                          style={{
                            fontFamily: "'Cinzel', serif",
                            fontSize: '8px',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: isSelected ? '#e6c76e' : 'rgba(255,255,255,0.76)',
                            marginBottom: '5px',
                          }}
                        >
                          {palette.label}
                        </p>
                        <p
                          style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.52)',
                            lineHeight: 1.45,
                          }}
                        >
                          {palette.desc}
                        </p>
                      </button>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => void saveAppearance()} style={saveBtn} disabled={saving}>
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setHubStyleDraft(currentHubStyle)
                      setHubPaletteDraft(currentHubPaletteId)
                      setEditingAppearance(false)
                    }}
                    style={cancelBtn}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <p
                  style={{
                    fontFamily: "'IM Fell English', serif",
                    fontStyle: 'italic',
                    fontSize: 'clamp(15px,1.8vw,18px)',
                    color: 'rgba(255,255,255,0.74)',
                    lineHeight: 1.7,
                  }}
                >
                  {HUB_STYLES.find((style) => style.id === currentHubStyle)?.label || 'Portal Ring'} ·{' '}
                  {HUB_PALETTES.find((palette) => palette.id === currentHubPaletteId)?.label ||
                    'Gilded'}
                </p>
                <div
                  style={{
                    width: '84px',
                    height: '18px',
                    borderRadius: '999px',
                    background:
                      HUB_PALETTES.find((palette) => palette.id === currentHubPaletteId)?.swatch ||
                      HUB_PALETTES.find((palette) => palette.id === DEFAULT_HUB_PALETTE)!.swatch,
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ marginBottom: '32px' }}>
            <p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '9px',
                letterSpacing: '0.4em',
                color: 'rgba(201,168,76,0.65)',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}
            >
              Settings
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                {
                  label: 'Receive Universe Letters',
                  desc: 'Allow random letters from strangers to find you',
                  enabled: true,
                },
                {
                  label: 'Show Online Status',
                  desc: 'Let others see when your hub is glowing',
                  enabled: true,
                },
                {
                  label: 'Letter Travel Time',
                  desc: 'Slow — letters arrive over 1 to 7 days',
                  enabled: true,
                },
              ].map((s, i) => (
                <SettingRow key={i} label={s.label} desc={s.desc} enabled={s.enabled} />
              ))}
            </div>
          </div>

          <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {leavingConfirm ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <p
                    style={{
                      fontFamily: "'IM Fell English', serif",
                      fontStyle: 'italic',
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    Sign out and come back later?
                  </p>
                  <button
                    onClick={() => void handleLeave()}
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '8px',
                      letterSpacing: '0.2em',
                      color: 'rgba(201,168,76,0.9)',
                      padding: '7px 14px',
                      border: '1px solid rgba(201,168,76,0.4)',
                      background: 'transparent',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      borderRadius: '2px',
                    }}
                  >
                    Yes, sign out
                  </button>
                  <button
                    onClick={() => setLeavingConfirm(false)}
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '8px',
                      letterSpacing: '0.2em',
                      color: 'rgba(255,255,255,0.35)',
                      padding: '7px 14px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'transparent',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      borderRadius: '2px',
                    }}
                  >
                    Stay
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => void handleLeave()}
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '8px',
                    letterSpacing: '0.25em',
                    color: 'rgba(255,255,255,0.4)',
                    padding: '8px 16px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'transparent',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  Leave the Universe
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

const editBtn: CSSProperties = {
  background: 'none',
  border: '1px solid rgba(255,255,255,0.15)',
  color: 'rgba(255,255,255,0.5)',
  fontFamily: "'Cinzel', serif",
  fontSize: '7px',
  letterSpacing: '0.25em',
  padding: '5px 10px',
  cursor: 'pointer',
  textTransform: 'uppercase',
}

const saveBtn: CSSProperties = {
  fontFamily: "'Cinzel', serif",
  fontSize: '8px',
  letterSpacing: '0.25em',
  color: '#c9a84c',
  padding: '7px 14px',
  border: '1px solid rgba(201,168,76,0.3)',
  background: 'transparent',
  cursor: 'pointer',
  textTransform: 'uppercase',
}

const cancelBtn: CSSProperties = {
  fontFamily: "'Cinzel', serif",
  fontSize: '8px',
  letterSpacing: '0.25em',
  color: 'rgba(255,255,255,0.45)',
  padding: '7px 14px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'transparent',
  cursor: 'pointer',
  textTransform: 'uppercase',
}

function SettingRow({
  label,
  desc,
  enabled: init,
}: {
  label: string
  desc: string
  enabled: boolean
}) {
  const [enabled, setEnabled] = useState(init)
  const { isNarrow } = useViewport()

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isNarrow ? 'flex-start' : 'center',
        flexDirection: isNarrow ? 'column' : 'row',
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '2px',
        gap: '16px',
      }}
    >
      <div>
        <p
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '10px',
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.78)',
            textTransform: 'uppercase',
            marginBottom: '3px',
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontFamily: "'IM Fell English', serif",
            fontStyle: 'italic',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.45)',
          }}
        >
          {desc}
        </p>
      </div>

      <div
        onClick={() => setEnabled(!enabled)}
        style={{
          width: '40px',
          height: '22px',
          borderRadius: '11px',
          background: enabled ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.08)',
          border: `1px solid ${
            enabled ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.12)'
          }`,
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <motion.div
          animate={{ left: enabled ? '20px' : '3px' }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute',
            top: '3px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: enabled ? '#c9a84c' : 'rgba(255,255,255,0.35)',
          }}
        />
      </div>
    </div>
  )
}
