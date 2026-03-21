'use client'

import { useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { updateHub } from '../lib/auth'

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

export default function Profile({
  hubName,
  bio,
  askAbout,
  avatarUrl,
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

  const [editingHub, setEditingHub] = useState(false)
  const [editingBio, setEditingBio] = useState(false)
  const [editingAsk, setEditingAsk] = useState(false)
  const [saving, setSaving] = useState(false)

  const [hubDraft, setHubDraft] = useState(profile.hubName)
  const [bioDraft, setBioDraft] = useState(profile.bio)
  const [askDraft, setAskDraft] = useState(profile.askAbout)

  const refreshProgress =
    ((AVATAR_REFRESH_DAYS - profile.avatarRefreshDaysLeft) / AVATAR_REFRESH_DAYS) * 100

  async function saveHub() {
    try {
      setSaving(true)
      await updateHub({ hub_name: hubDraft })
      setProfile((p) => ({ ...p, hubName: hubDraft }))
      onUpdateHub?.(hubDraft)
      setEditingHub(false)
    } catch (err) {
      console.error('Failed to save hub name:', err)
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
      console.error('Failed to save bio:', err)
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
      console.error('Failed to save askAbout:', err)
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
        padding: '80px 20px 120px',
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background: `
          radial-gradient(ellipse 55% 40% at 15% 25%, rgba(40,15,80,0.25) 0%, transparent 65%),
          radial-gradient(ellipse 45% 55% at 85% 75%, rgba(10,20,70,0.2) 0%, transparent 65%)
        `,
        }}
      />

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
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

      <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: '48px' }}
        >
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 300, letterSpacing: '0.4em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px' }}>
            Your Hub
          </p>
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '15px', color: 'rgba(255,255,255,0.3)' }}>
            your place in the universe
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            background: 'rgba(8,10,28,0.85)',
            border: '1px solid rgba(201,168,76,0.15)',
            borderRadius: '12px',
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 80px rgba(0,0,0,0.8), 0 0 40px rgba(201,168,76,0.05)',
          }}
        >
          {/* Top: avatar + info */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

            {/* Avatar panel */}
            <div style={{
              width: '260px',
              flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(20,25,60,0.9), rgba(10,15,40,0.95))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 24px',
              borderRight: '1px solid rgba(255,255,255,0.05)',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '320px',
            }}>
              <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,140,255,0.1) 0%, transparent 70%)', border: '1px solid rgba(150,180,255,0.08)' }} />

              {/* Avatar — shows image if available, else placeholder */}
              <div style={{
                width: '140px',
                height: '190px',
                borderRadius: '8px',
                background: 'linear-gradient(180deg, rgba(60,80,160,0.4), rgba(20,30,80,0.7))',
                border: '1px solid rgba(201,168,76,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
                position: 'relative',
                zIndex: 2,
                boxShadow: '0 0 30px rgba(100,140,255,0.1)',
                marginBottom: '20px',
                overflow: 'hidden',
              }}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Soul Mirror Avatar"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '8px',
                    }}
                  />
                ) : (
                  '✦'
                )}
              </div>

              {/* Soul Cycle ring */}
              <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 10px' }}>
                  <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                    <circle cx="30" cy="30" r="26" fill="none" stroke="#c9a84c" strokeWidth="2"
                      strokeDasharray={`${2 * Math.PI * 26}`}
                      strokeDashoffset={`${2 * Math.PI * 26 * (1 - refreshProgress / 100)}`}
                      strokeLinecap="round" style={{ opacity: 0.6 }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontSize: '9px', color: 'rgba(201,168,76,0.6)' }}>
                    {profile.avatarRefreshDaysLeft}d
                  </div>
                </div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>Soul Cycle</p>
              </div>

              {[...Array(8)].map((_, i) => (
                <div key={i} style={{ position: 'absolute', width: '2px', height: '2px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', left: `${10 + Math.random() * 80}%`, top: `${5 + Math.random() * 90}%` }} />
              ))}
            </div>

            {/* Info panel */}
            <div style={{ flex: 1, padding: '36px 40px' }}>

              {/* Hub name */}
              <div style={{ marginBottom: '28px' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.45)', textTransform: 'uppercase', marginBottom: '10px' }}>Hub Name</p>
                {editingHub ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input value={hubDraft} onChange={(e) => setHubDraft(e.target.value)} autoFocus
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.3)', color: 'rgba(255,255,255,0.9)', fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', letterSpacing: '0.06em', padding: '8px 12px', outline: 'none', borderRadius: '2px', flex: 1, caretColor: '#c9a84c' }}
                      onKeyDown={(e) => { if (e.key === 'Enter') void saveHub(); if (e.key === 'Escape') setEditingHub(false) }} />
                    <button onClick={() => void saveHub()} style={saveBtn} disabled={saving}>Save</button>
                    <button onClick={() => setEditingHub(false)} style={cancelBtn} disabled={saving}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(18px, 2.5vw, 26px)', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.9)' }}>{profile.hubName}</p>
                    <button onClick={() => { setHubDraft(profile.hubName); setEditingHub(true) }} style={editBtn}>Edit</button>
                  </div>
                )}
              </div>

              {/* Bio */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.45)', textTransform: 'uppercase' }}>Bio</p>
                  {!editingBio && <button onClick={() => { setBioDraft(profile.bio); setEditingBio(true) }} style={editBtn}>Edit</button>}
                </div>
                {editingBio ? (
                  <div>
                    <textarea value={bioDraft} onChange={(e) => setBioDraft(e.target.value)} autoFocus rows={3}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.25)', color: 'rgba(255,255,255,0.88)', fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '15px', lineHeight: 1.7, padding: '10px 14px', outline: 'none', resize: 'none', borderRadius: '2px', caretColor: '#c9a84c', marginBottom: '8px' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => void saveBio()} style={saveBtn} disabled={saving}>Save</button>
                      <button onClick={() => setEditingBio(false)} style={cancelBtn} disabled={saving}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(14px, 1.8vw, 16px)', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>{profile.bio}</p>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', marginTop: '6px' }}>AI drafted · you can edit anytime</p>
                  </div>
                )}
              </div>

              {/* Ask me about */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.45)', textTransform: 'uppercase' }}>Ask me about</p>
                  {!editingAsk && <button onClick={() => { setAskDraft(profile.askAbout); setEditingAsk(true) }} style={editBtn}>Edit</button>}
                </div>
                {editingAsk ? (
                  <div>
                    <textarea value={askDraft} onChange={(e) => setAskDraft(e.target.value)} autoFocus rows={2}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.25)', color: 'rgba(255,255,255,0.88)', fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '15px', lineHeight: 1.7, padding: '10px 14px', outline: 'none', resize: 'none', borderRadius: '2px', caretColor: '#c9a84c', marginBottom: '8px' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => void saveAsk()} style={saveBtn} disabled={saving}>Save</button>
                      <button onClick={() => setEditingAsk(false)} style={cancelBtn} disabled={saving}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(14px, 1.8vw, 16px)', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{profile.askAbout}</p>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { label: 'Letters Sent', value: profile.lettersSent },
              { label: 'Letters Received', value: profile.lettersReceived },
              { label: 'Days in Universe', value: profile.daysInUniverse },
            ].map((stat, i) => (
              <div key={i} style={{ flex: 1, padding: '20px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none', textAlign: 'center' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 300, color: '#c9a84c', marginBottom: '4px', textShadow: '0 0 20px rgba(201,168,76,0.3)' }}>{stat.value}</p>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Soul Mirror */}
          <div style={{ padding: '28px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.45)', textTransform: 'uppercase', marginBottom: '6px' }}>Soul Mirror</p>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.35)' }}>
                  {profile.avatarRefreshDaysLeft > 0
                    ? `Your avatar can be renewed in ${profile.avatarRefreshDaysLeft} days`
                    : 'Your soul cycle is complete — you may renew your presence'}
                </p>
              </div>
              <button
                disabled={profile.avatarRefreshDaysLeft > 0}
                style={{
                  fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em',
                  color: profile.avatarRefreshDaysLeft > 0 ? 'rgba(255,255,255,0.15)' : '#c9a84c',
                  padding: '10px 20px',
                  border: `1px solid ${profile.avatarRefreshDaysLeft > 0 ? 'rgba(255,255,255,0.06)' : 'rgba(201,168,76,0.3)'}`,
                  background: 'transparent',
                  cursor: profile.avatarRefreshDaysLeft > 0 ? 'default' : 'pointer',
                  textTransform: 'uppercase', borderRadius: '2px',
                }}
              >
                Renew Soul Mirror ✦
              </button>
            </div>
          </div>

          {/* Settings */}
          <div style={{ padding: '28px 40px' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.45)', textTransform: 'uppercase', marginBottom: '16px' }}>Settings</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Receive Universe Letters', desc: 'Allow random letters from strangers to find you', enabled: true },
                { label: 'Show Online Status', desc: 'Let others see when your hub is glowing', enabled: true },
                { label: 'Letter Travel Time', desc: 'Slow — letters arrive over 1 to 7 days', enabled: true },
              ].map((s, i) => (
                <SettingRow key={i} label={s.label} desc={s.desc} enabled={s.enabled} />
              ))}
            </div>

            <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em', color: 'rgba(200,60,60,0.4)', padding: '8px 16px', border: '1px solid rgba(200,60,60,0.15)', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(200,60,60,0.7)'; e.currentTarget.style.borderColor = 'rgba(200,60,60,0.3)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(200,60,60,0.4)'; e.currentTarget.style.borderColor = 'rgba(200,60,60,0.15)' }}
              >
                Leave the Universe
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

const editBtn: CSSProperties = {
  background: 'none',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.25)',
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
  color: 'rgba(255,255,255,0.3)',
  padding: '7px 14px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent',
  cursor: 'pointer',
  textTransform: 'uppercase',
}

function SettingRow({ label, desc, enabled: init }: { label: string; desc: string; enabled: boolean }) {
  const [enabled, setEnabled] = useState(init)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '2px', gap: '16px' }}>
      <div>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</p>
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.28)' }}>{desc}</p>
      </div>
      <div onClick={() => setEnabled(!enabled)} style={{ width: '40px', height: '22px', borderRadius: '11px', background: enabled ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.08)', border: `1px solid ${enabled ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.1)'}`, position: 'relative', cursor: 'pointer', transition: 'all 0.3s', flexShrink: 0, boxShadow: enabled ? '0 0 10px rgba(201,168,76,0.2)' : 'none' }}>
        <motion.div animate={{ left: enabled ? '20px' : '3px' }} transition={{ duration: 0.2 }} style={{ position: 'absolute', top: '3px', width: '14px', height: '14px', borderRadius: '50%', background: enabled ? '#c9a84c' : 'rgba(255,255,255,0.3)', boxShadow: enabled ? '0 0 6px rgba(201,168,76,0.6)' : 'none' }} />
      </div>
    </div>
  )
}