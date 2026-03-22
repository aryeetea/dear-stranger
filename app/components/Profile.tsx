'use client'

import { useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { updateHub, signOut } from '../lib/auth'

interface ProfileData {
  hubName: string
  bio: string
  askAbout: string
  lettersSent: number
  lettersReceived: number
  daysInUniverse: number
  avatarRefreshDaysLeft: number
}

const AVATAR_REFRESH_DAYS = 90
const MAX_REGEN_ATTEMPTS = 3

export default function Profile({
  hubName,
  bio,
  askAbout,
  avatarUrl: initialAvatarUrl,
  onClose,
  onUpdateHub,
}: {
  hubName?: string
  bio?: string
  askAbout?: string
  avatarUrl?: string
  onClose?: () => void
  onUpdateHub?: (name: string) => void
}) {
  const [profile, setProfile] = useState<ProfileData>({
    hubName: hubName || 'Your Hub',
    bio: bio || 'A wanderer who arrived here quietly, carrying something unspoken.',
    askAbout: askAbout || 'Silence, slow mornings, and letters that take their time.',
    lettersSent: 0,
    lettersReceived: 0,
    daysInUniverse: 1,
    avatarRefreshDaysLeft: 90,
  })

  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(initialAvatarUrl || '')
  const [regenCount, setRegenCount] = useState(0)
  const [regenLoading, setRegenLoading] = useState(false)
  const [regenFeedback, setRegenFeedback] = useState('')
  const [showRegenInput, setShowRegenInput] = useState(false)
  const [leavingConfirm, setLeavingConfirm] = useState(false)

  const [editingHub, setEditingHub] = useState(false)
  const [editingBio, setEditingBio] = useState(false)
  const [editingAsk, setEditingAsk] = useState(false)
  const [saving, setSaving] = useState(false)

  const [hubDraft, setHubDraft] = useState(profile.hubName)
  const [bioDraft, setBioDraft] = useState(profile.bio)
  const [askDraft, setAskDraft] = useState(profile.askAbout)

  const refreshProgress =
    ((AVATAR_REFRESH_DAYS - profile.avatarRefreshDaysLeft) / AVATAR_REFRESH_DAYS) * 100
  const attemptsLeft = MAX_REGEN_ATTEMPTS - regenCount

  async function handleLeaveUniverse() {
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
    try {
      setRegenLoading(true)
      setShowRegenInput(false)
      const res = await fetch('/api/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: { 0: profile.bio, 1: profile.askAbout, 2: regenFeedback },
          feedback: regenFeedback,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed')
      const newUrl = data.imageUrl
      setCurrentAvatarUrl(newUrl)
      setRegenCount((c) => c + 1)
      setRegenFeedback('')
      await updateHub({ avatar_url: newUrl })
    } catch (err) {
      console.error('Regen failed:', err)
    } finally {
      setRegenLoading(false)
    }
  }

  async function saveHub() {
    try {
      setSaving(true)
      await updateHub({ hub_name: hubDraft })
      setProfile((p) => ({ ...p, hubName: hubDraft }))
      onUpdateHub?.(hubDraft)
      setEditingHub(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function saveBio() {
    try {
      setSaving(true)
      await updateHub({ bio: bioDraft })
      setProfile((p) => ({ ...p, bio: bioDraft }))
      setEditingBio(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function saveAsk() {
    try {
      setSaving(true)
      await updateHub({ ask_about: askDraft })
      setProfile((p) => ({ ...p, askAbout: askDraft }))
      setEditingAsk(false)
    } catch (err) {
      console.error(err)
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
        padding: '0',
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

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${Math.random() * 1.5 + 0.3}px`,
              height: `${Math.random() * 1.5 + 0.3}px`,
              borderRadius: '50%',
              background: `rgba(255,255,255,${Math.random() * 0.4 + 0.05})`,
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
          border: '1px solid rgba(255,255,255,0.22)',
          color: 'rgba(255,255,255,0.82)',
          fontFamily: "'Cinzel', serif",
          fontSize: '9px',
          letterSpacing: '0.3em',
          padding: '8px 16px',
          cursor: 'pointer',
          textTransform: 'uppercase',
          zIndex: 80,
          textShadow: '0 0 6px rgba(0,0,0,0.45)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.98)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.82)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'
          e.currentTarget.style.background = 'none'
        }}
      >
        ← Universe
      </motion.button>

      <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 2 }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          style={{ width: '42%', flexShrink: 0, position: 'relative', overflow: 'hidden' }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 3,
              pointerEvents: 'none',
              background:
                'linear-gradient(to right, transparent 65%, rgba(0,0,5,0.97) 100%), linear-gradient(to bottom, rgba(0,0,5,0.3) 0%, transparent 15%, transparent 85%, rgba(0,0,5,0.6) 100%)',
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
                    border: '2px solid rgba(230,199,110,0.28)',
                    borderTopColor: '#e6c76e',
                    margin: '0 auto 16px',
                  }}
                />
                <p
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '9px',
                    letterSpacing: '0.3em',
                    color: '#e6c76e',
                    textTransform: 'uppercase',
                    textShadow: '0 0 8px rgba(230,199,110,0.22)',
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
              alt="Soul Mirror Avatar"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'top center',
                display: 'block',
                minHeight: '100vh',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                minHeight: '100vh',
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
                  border: '1px solid rgba(230,199,110,0.32)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  color: '#e6c76e',
                  textShadow: '0 0 10px rgba(230,199,110,0.25)',
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
            padding: 'clamp(60px, 8vh, 100px) clamp(28px, 5vw, 60px) 80px',
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
                color: '#e6c76e',
                textTransform: 'uppercase',
                marginBottom: '6px',
                textShadow: '0 0 8px rgba(230,199,110,0.2)',
              }}
            >
              Soul Mirror
            </p>

            {editingHub ? (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  marginBottom: '8px',
                }}
              >
                <input
                  value={hubDraft}
                  onChange={(e) => setHubDraft(e.target.value)}
                  autoFocus
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(230,199,110,0.35)',
                    color: 'rgba(255,255,255,0.97)',
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 'clamp(22px, 3vw, 32px)',
                    letterSpacing: '0.06em',
                    padding: '8px 12px',
                    outline: 'none',
                    borderRadius: '2px',
                    flex: 1,
                    caretColor: '#e6c76e',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void saveHub()
                    if (e.key === 'Escape') setEditingHub(false)
                  }}
                />
                <button onClick={() => void saveHub()} style={saveBtn} disabled={saving}>
                  Save
                </button>
                <button onClick={() => setEditingHub(false)} style={cancelBtn} disabled={saving}>
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <p
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 'clamp(28px, 4vw, 48px)',
                    letterSpacing: '0.06em',
                    color: 'rgba(255,255,255,0.97)',
                    lineHeight: 1.1,
                    textShadow: '0 0 8px rgba(0,0,0,0.45)',
                  }}
                >
                  {profile.hubName}
                </p>
                <button
                  onClick={() => {
                    setHubDraft(profile.hubName)
                    setEditingHub(true)
                  }}
                  style={editBtn}
                >
                  Edit
                </button>
              </div>
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
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="2"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="#e6c76e"
                      strokeWidth="2"
                      strokeDasharray={`${2 * Math.PI * 15}`}
                      strokeDashoffset={`${2 * Math.PI * 15 * (1 - refreshProgress / 100)}`}
                      strokeLinecap="round"
                      style={{ opacity: 0.78 }}
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
                      color: '#e6c76e',
                      textShadow: '0 0 6px rgba(230,199,110,0.18)',
                    }}
                  >
                    {profile.avatarRefreshDaysLeft}d
                  </div>
                </div>
                <p
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '8px',
                    letterSpacing: '0.2em',
                    color: 'rgba(255,255,255,0.62)',
                    textTransform: 'uppercase',
                  }}
                >
                  Soul Cycle
                </p>
              </div>

              {attemptsLeft > 0 && (
                <button
                  onClick={() => setShowRegenInput((v) => !v)}
                  disabled={regenLoading}
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '8px',
                    letterSpacing: '0.2em',
                    color: '#e6c76e',
                    padding: '6px 12px',
                    border: '1px solid rgba(230,199,110,0.35)',
                    background: 'transparent',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                    textShadow: '0 0 8px rgba(230,199,110,0.15)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#f0d58a'
                    e.currentTarget.style.borderColor = 'rgba(230,199,110,0.55)'
                    e.currentTarget.style.background = 'rgba(230,199,110,0.06)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#e6c76e'
                    e.currentTarget.style.borderColor = 'rgba(230,199,110,0.35)'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  ✦ Reimagine · {attemptsLeft} left
                </button>
              )}

              {attemptsLeft === 0 && (
                <p
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '8px',
                    letterSpacing: '0.15em',
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                  }}
                >
                  Your form is sealed · {profile.avatarRefreshDaysLeft} days until the mirror opens
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
                    color: 'rgba(255,255,255,0.78)',
                    marginBottom: '8px',
                    textShadow: '0 0 5px rgba(0,0,0,0.35)',
                  }}
                >
                  Tell the mirror what to change — or leave blank to reimagine freely.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={regenFeedback}
                    onChange={(e) => setRegenFeedback(e.target.value)}
                    placeholder="e.g. more dark and moody, different outfit..."
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(230,199,110,0.24)',
                      borderRadius: '6px',
                      color: 'rgba(255,255,255,0.92)',
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: '14px',
                      padding: '8px 12px',
                      outline: 'none',
                      caretColor: '#e6c76e',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void regenerateAvatar()
                    }}
                  />
                  <button
                    onClick={() => void regenerateAvatar()}
                    disabled={regenLoading}
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '9px',
                      letterSpacing: '0.2em',
                      color: '#e6c76e',
                      padding: '8px 16px',
                      border: '1px solid rgba(230,199,110,0.38)',
                      background: 'transparent',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                      textShadow: '0 0 8px rgba(230,199,110,0.15)',
                    }}
                  >
                    Reimagine ✦
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, rgba(230,199,110,0.35), transparent)',
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
                  color: '#e6c76e',
                  textTransform: 'uppercase',
                  textShadow: '0 0 8px rgba(230,199,110,0.18)',
                }}
              >
                Bio
              </p>
              {!editingBio && (
                <button
                  onClick={() => {
                    setBioDraft(profile.bio)
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
                    border: '1px solid rgba(230,199,110,0.25)',
                    color: 'rgba(255,255,255,0.94)',
                    fontFamily: "'IM Fell English', serif",
                    fontStyle: 'italic',
                    fontSize: '16px',
                    lineHeight: 1.7,
                    padding: '12px 16px',
                    outline: 'none',
                    resize: 'none',
                    borderRadius: '4px',
                    caretColor: '#e6c76e',
                    marginBottom: '10px',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => void saveBio()} style={saveBtn} disabled={saving}>
                    Save
                  </button>
                  <button onClick={() => setEditingBio(false)} style={cancelBtn} disabled={saving}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p
                  style={{
                    fontFamily: "'IM Fell English', serif",
                    fontStyle: 'italic',
                    fontSize: 'clamp(15px, 1.8vw, 18px)',
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: 1.8,
                    textShadow: '0 0 4px rgba(0,0,0,0.35)',
                  }}
                >
                  {profile.bio}
                </p>
                <p
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '7px',
                    letterSpacing: '0.2em',
                    color: 'rgba(255,255,255,0.48)',
                    textTransform: 'uppercase',
                    marginTop: '8px',
                  }}
                >
                  AI drafted · you can edit anytime
                </p>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <p
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '9px',
                  letterSpacing: '0.4em',
                  color: '#e6c76e',
                  textTransform: 'uppercase',
                  textShadow: '0 0 8px rgba(230,199,110,0.18)',
                }}
              >
                Ask me about
              </p>
              {!editingAsk && (
                <button
                  onClick={() => {
                    setAskDraft(profile.askAbout)
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
                    border: '1px solid rgba(230,199,110,0.25)',
                    color: 'rgba(255,255,255,0.94)',
                    fontFamily: "'IM Fell English', serif",
                    fontStyle: 'italic',
                    fontSize: '16px',
                    lineHeight: 1.7,
                    padding: '12px 16px',
                    outline: 'none',
                    resize: 'none',
                    borderRadius: '4px',
                    caretColor: '#e6c76e',
                    marginBottom: '10px',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => void saveAsk()} style={saveBtn} disabled={saving}>
                    Save
                  </button>
                  <button onClick={() => setEditingAsk(false)} style={cancelBtn} disabled={saving}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p
                style={{
                  fontFamily: "'IM Fell English', serif",
                  fontStyle: 'italic',
                  fontSize: 'clamp(15px, 1.8vw, 18px)',
                  color: 'rgba(255,255,255,0.82)',
                  lineHeight: 1.7,
                  textShadow: '0 0 4px rgba(0,0,0,0.3)',
                }}
              >
                {profile.askAbout}
              </p>
            )}
          </div>

          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.12), transparent)',
              marginBottom: '28px',
            }}
          />

          <div style={{ display: 'flex', marginBottom: '36px' }}>
            {[
              { label: 'Letters Sent', value: profile.lettersSent },
              { label: 'Letters Received', value: profile.lettersReceived },
              { label: 'Days in Universe', value: profile.daysInUniverse },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  borderRight: i < 2 ? '1px solid rgba(255,255,255,0.12)' : 'none',
                  paddingRight: i < 2 ? '20px' : '0',
                  paddingLeft: i > 0 ? '20px' : '0',
                }}
              >
                <p
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 'clamp(22px, 3vw, 32px)',
                    fontWeight: 300,
                    color: '#e6c76e',
                    marginBottom: '4px',
                    textShadow: '0 0 20px rgba(230,199,110,0.28)',
                  }}
                >
                  {stat.value}
                </p>
                <p
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '8px',
                    letterSpacing: '0.2em',
                    color: 'rgba(255,255,255,0.62)',
                    textTransform: 'uppercase',
                  }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '32px' }}>
            <p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '9px',
                letterSpacing: '0.4em',
                color: '#e6c76e',
                textTransform: 'uppercase',
                marginBottom: '16px',
                textShadow: '0 0 8px rgba(230,199,110,0.18)',
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

          <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.09)' }}>
            {leavingConfirm ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <p
                  style={{
                    fontFamily: "'IM Fell English', serif",
                    fontStyle: 'italic',
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.82)',
                    textShadow: '0 0 4px rgba(0,0,0,0.35)',
                  }}
                >
                  Are you sure? This will sign you out.
                </p>
                <button
                  onClick={() => void handleLeaveUniverse()}
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '8px',
                    letterSpacing: '0.25em',
                    color: 'rgba(240,120,120,0.95)',
                    padding: '8px 16px',
                    border: '1px solid rgba(220,80,80,0.5)',
                    background: 'rgba(220,80,80,0.08)',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    borderRadius: '2px',
                  }}
                >
                  Yes, leave
                </button>
                <button
                  onClick={() => setLeavingConfirm(false)}
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '8px',
                    letterSpacing: '0.25em',
                    color: 'rgba(255,255,255,0.72)',
                    padding: '8px 16px',
                    border: '1px solid rgba(255,255,255,0.2)',
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
                onClick={() => void handleLeaveUniverse()}
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '8px',
                  letterSpacing: '0.25em',
                  color: 'rgba(220,90,90,0.78)',
                  padding: '8px 16px',
                  border: '1px solid rgba(220,90,90,0.28)',
                  background: 'transparent',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(240,120,120,0.98)'
                  e.currentTarget.style.borderColor = 'rgba(220,80,80,0.48)'
                  e.currentTarget.style.background = 'rgba(220,80,80,0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(220,90,90,0.78)'
                  e.currentTarget.style.borderColor = 'rgba(220,90,90,0.28)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                Leave the Universe
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

const editBtn: CSSProperties = {
  background: 'none',
  border: '1px solid rgba(255,255,255,0.22)',
  color: 'rgba(255,255,255,0.78)',
  fontFamily: "'Cinzel', serif",
  fontSize: '7px',
  letterSpacing: '0.25em',
  padding: '5px 10px',
  cursor: 'pointer',
  textTransform: 'uppercase',
  textShadow: '0 0 5px rgba(0,0,0,0.35)',
}

const saveBtn: CSSProperties = {
  fontFamily: "'Cinzel', serif",
  fontSize: '8px',
  letterSpacing: '0.25em',
  color: '#e6c76e',
  padding: '7px 14px',
  border: '1px solid rgba(230,199,110,0.38)',
  background: 'transparent',
  cursor: 'pointer',
  textTransform: 'uppercase',
  textShadow: '0 0 8px rgba(230,199,110,0.15)',
}

const cancelBtn: CSSProperties = {
  fontFamily: "'Cinzel', serif",
  fontSize: '8px',
  letterSpacing: '0.25em',
  color: 'rgba(255,255,255,0.72)',
  padding: '7px 14px',
  border: '1px solid rgba(255,255,255,0.2)',
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

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
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
            color: 'rgba(255,255,255,0.88)',
            textTransform: 'uppercase',
            marginBottom: '3px',
            textShadow: '0 0 4px rgba(0,0,0,0.35)',
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontFamily: "'IM Fell English', serif",
            fontStyle: 'italic',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.72)',
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
          background: enabled ? 'rgba(230,199,110,0.32)' : 'rgba(255,255,255,0.1)',
          border: `1px solid ${
            enabled ? 'rgba(230,199,110,0.5)' : 'rgba(255,255,255,0.16)'
          }`,
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.3s',
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
            background: enabled ? '#e6c76e' : 'rgba(255,255,255,0.5)',
            boxShadow: enabled ? '0 0 8px rgba(230,199,110,0.22)' : 'none',
          }}
        />
      </div>
    </div>
  )
}