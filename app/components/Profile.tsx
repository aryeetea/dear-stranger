'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { updateHub, signOut, deleteAccount, exportMyLetters, uploadAvatarToStorage, getVisitorBook, type VisitorBookEntry } from '../lib/auth'
import { supabase } from '../../lib/supabase'
import { HUB_COLOR_THEMES, HUB_STYLES, HUB_DECORATIONS, HUB_GLOW_LEVELS, type HubColor, type HubStyle, type HubDecoration, type HubGlowIntensity } from './UniverseMap'

const MAX_REGEN_ATTEMPTS = 1

type DeleteStep = 'idle' | 'exporting' | 'exported' | 'deleting' | 'deleted'

// regen_count is encoded as: cycleNumber * 10 + localRegenCount
// This lets us detect which cycle the regens belong to using a single DB integer.
const CYCLE_DAYS = 90

function getMirrorCycle(createdAt?: string) {
  if (!createdAt) return { cycleNumber: 0, daysLeft: CYCLE_DAYS, refreshProgress: 0 }
  const createdMs = new Date(createdAt).getTime()
  const nowMs = Date.now()
  const daysSinceCreation = Math.max(0, (nowMs - createdMs) / (1000 * 60 * 60 * 24))
  const cycleNumber = Math.floor(daysSinceCreation / CYCLE_DAYS)
  const daysInCycle = daysSinceCreation % CYCLE_DAYS
  return {
    cycleNumber,
    daysLeft: Math.max(1, Math.ceil(CYCLE_DAYS - daysInCycle)),
    refreshProgress: Math.min(100, (daysInCycle / CYCLE_DAYS) * 100),
  }
}

export default function Profile({
  hubName, bio, askAbout, avatarUrl: initialAvatarUrl, avatarPromptPending, regenCount: initialRegenCount,
  hubCreatedAt,
  visitorBookEnabled: initialVisitorBookEnabled = false,
  hubStyle: initialHubStyle = 'portal', hubColor: initialHubColor = 'gold',
  hubDecoration: initialHubDecoration = 'none', hubGlowIntensity: initialHubGlowIntensity = 'normal',
  onClose, onUpdateHub,
}: {
  hubName?: string; bio?: string; askAbout?: string; avatarUrl?: string; avatarPromptPending?: string | null; regenCount?: number
  hubCreatedAt?: string
  visitorBookEnabled?: boolean
  hubStyle?: HubStyle; hubColor?: HubColor
  hubDecoration?: HubDecoration; hubGlowIntensity?: HubGlowIntensity
  onClose?: () => void
  onUpdateHub?: (updates: { hubName?: string; bio?: string; askAbout?: string; avatarUrl?: string; hubStyle?: HubStyle; hubColor?: HubColor; hubDecoration?: HubDecoration; hubGlowIntensity?: HubGlowIntensity; visitorBookEnabled?: boolean }) => void
}) {
  const [hubNameState, setHubNameState] = useState(hubName || 'Your Hub')
  const [bioState, setBioState] = useState(bio || 'A wanderer who arrived here quietly, carrying something unspoken.')
  const [askState, setAskState] = useState(askAbout || 'Silence, slow mornings, and letters that take their time.')
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(initialAvatarUrl || '')
  // Track last prop value to only update if it changes
  const [lastAvatarProp, setLastAvatarProp] = useState(initialAvatarUrl || '')
  // regen_count is encoded: cycleNumber*10 + localRegenCount
  const [regenCount, setRegenCount] = useState(initialRegenCount ?? 0)
  const [regenLoading, setRegenLoading] = useState(false)
  const [regenFeedback, setRegenFeedback] = useState('')
  const [showRegenInput, setShowRegenInput] = useState(false)
  const [regenError, setRegenError] = useState('')

  const [editingHub, setEditingHub] = useState(false)
  const [editingBio, setEditingBio] = useState(false)
  const [editingAsk, setEditingAsk] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hubDraft, setHubDraft] = useState(hubNameState)
  const [bioDraft, setBioDraft] = useState(bioState)
  const [askDraft, setAskDraft] = useState(askState)
  const [saveError, setSaveError] = useState('')

  const [selectedHubStyle, setSelectedHubStyle] = useState<HubStyle>(initialHubStyle)
  const [selectedHubColor, setSelectedHubColor] = useState<HubColor>(initialHubColor)
  const [selectedDecoration, setSelectedDecoration] = useState<HubDecoration>(initialHubDecoration)
  const [selectedGlowIntensity, setSelectedGlowIntensity] = useState<HubGlowIntensity>(initialHubGlowIntensity)
  const [appearanceSaving, setAppearanceSaving] = useState(false)
  const [appearanceSaved, setAppearanceSaved] = useState(false)
  const [visitorBookEnabledState, setVisitorBookEnabledState] = useState(initialVisitorBookEnabled)
  const [visitorBookSaving, setVisitorBookSaving] = useState(false)
  const [visitorBookEntries, setVisitorBookEntries] = useState<VisitorBookEntry[]>([])
  const [visitorBookLoading, setVisitorBookLoading] = useState(false)
  const [visitorBookError, setVisitorBookError] = useState('')

  const appearanceChanged = selectedHubStyle !== initialHubStyle || selectedHubColor !== initialHubColor || selectedDecoration !== initialHubDecoration || selectedGlowIntensity !== initialHubGlowIntensity

  async function saveAppearance() {
    try {
      setAppearanceSaving(true)
      await updateHub({ hub_style: selectedHubStyle, backdrop_id: selectedHubColor, decoration: selectedDecoration, glow_intensity: selectedGlowIntensity })
      onUpdateHub?.({ hubStyle: selectedHubStyle, hubColor: selectedHubColor, hubDecoration: selectedDecoration, hubGlowIntensity: selectedGlowIntensity })
      setAppearanceSaved(true)
      setTimeout(() => setAppearanceSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally { setAppearanceSaving(false) }
  }

  function handleCopyUrl() {
    void navigator.clipboard.writeText(appUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const [appUrl, setAppUrl] = useState('https://dear-stranger.vercel.app')
  const [copied, setCopied] = useState(false)

  const [leavingConfirm, setLeavingConfirm] = useState(false)
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle')
  const [exportedText, setExportedText] = useState('')
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    // Only update local state if the prop actually changed (not just on every mount)
    if (initialAvatarUrl && initialAvatarUrl !== lastAvatarProp) {
      setCurrentAvatarUrl(initialAvatarUrl)
      setLastAvatarProp(initialAvatarUrl)
    }
    // If avatar is cleared (e.g. on onboarding), also clear local state
    if (!initialAvatarUrl && lastAvatarProp) {
      setCurrentAvatarUrl('')
      setLastAvatarProp('')
    }
  }, [initialAvatarUrl, lastAvatarProp])

  useEffect(() => {
    if (typeof window !== 'undefined') setAppUrl(window.location.origin)
  }, [])

  useEffect(() => {
    setVisitorBookEnabledState(initialVisitorBookEnabled)
  }, [initialVisitorBookEnabled])

  useEffect(() => {
    if (!visitorBookEnabledState) {
      setVisitorBookEntries([])
      setVisitorBookError('')
      return
    }
    void loadVisitorBook()
  }, [visitorBookEnabledState])

  // ── load regen count from DB on mount ──
  useEffect(() => {
    async function loadRegenCount() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('hubs').select('regen_count').eq('id', user.id).single()
        if (data?.regen_count !== undefined) setRegenCount(data.regen_count)
      } catch {}
    }
    loadRegenCount()
  }, [])

  // ── Auto-reset regen count when a new 90-day cycle begins ──
  useEffect(() => {
    if (!hubCreatedAt) return
    const local = regenCount % 10
    if (local < MAX_REGEN_ATTEMPTS) return // still have attempts, nothing to reset
    const cycle = Math.floor(
      Math.max(0, Date.now() - new Date(hubCreatedAt).getTime()) / (1000 * 60 * 60 * 24 * CYCLE_DAYS)
    )
    const storedCycle = Math.floor(regenCount / 10)
    if (cycle > storedCycle) {
      const newCount = cycle * 10
      setRegenCount(newCount)
      void updateHub({ regen_count: newCount }).catch(() => {})
    }
  }, [hubCreatedAt, regenCount])

  // Decode the encoded regen_count
  const localRegenCount = regenCount % 10
  const attemptsLeft = MAX_REGEN_ATTEMPTS - localRegenCount

  // Compute real cycle info from hub creation date
  const { cycleNumber, daysLeft, refreshProgress } = getMirrorCycle(hubCreatedAt)

  async function handleLeave() {
    if (!leavingConfirm) { setLeavingConfirm(true); setTimeout(() => setLeavingConfirm(false), 4000); return }
    await signOut(); window.location.reload()
  }

  async function handleStartDelete() {
    setDeleteStep('exporting'); setDeleteError('')
    try {
      const text = await exportMyLetters()
      setExportedText(text); setDeleteStep('exported')
    } catch {
      setDeleteError('Export failed — you can still delete without exporting.')
      setDeleteStep('exported')
    }
  }

  function handleDownloadExport() {
    const blob = new Blob([exportedText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `dear-stranger-letters-${Date.now()}.txt`
    a.click(); URL.revokeObjectURL(url)
  }

  async function handleConfirmDelete() {
    setDeleteStep('deleting')
    const result = await deleteAccount()
    if (result.success) {
      setDeleteStep('deleted')
      setTimeout(() => window.location.reload(), 2500)
    } else {
      setDeleteError(result.error || 'Something went wrong.'); setDeleteStep('exported')
    }
  }

  async function regenerateAvatar() {
    if (localRegenCount >= MAX_REGEN_ATTEMPTS || regenLoading) return
    setRegenError('')
    try {
      setRegenLoading(true); setShowRegenInput(false)
      // If there's no existing avatar but we have the original description, generate fresh
      const hasExistingAvatar = Boolean(currentAvatarUrl)
      const requestBody = !hasExistingAvatar && avatarPromptPending
        ? { answers: { 0: avatarPromptPending }, feedback: regenFeedback || undefined, mode: 'create' }
        : { answers: { 0: bioState, 1: askState }, feedback: regenFeedback, mode: 'reimagine', previousImageUrl: currentAvatarUrl || undefined }
      let avatarToken: string | undefined
      try {
        const { data, error } = await supabase.auth.refreshSession()
        if (!error && data.session?.access_token) avatarToken = data.session.access_token
      } catch {}
      if (!avatarToken) {
        const { data: { session } } = await supabase.auth.getSession()
        avatarToken = session?.access_token
      }
      const res = await fetch('/api/generate-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(avatarToken ? { 'Authorization': `Bearer ${avatarToken}` } : {}),
        },
        body: JSON.stringify(requestBody),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed')
      if (!data.imageUrl) throw new Error('No avatar image came back from the mirror.')

      // ── Show the new image immediately — don't wait for storage upload ──
      // Encode: cycleNumber * 10 + (localRegenCount + 1)
      const newCount = cycleNumber * 10 + (localRegenCount + 1)
      setCurrentAvatarUrl(data.imageUrl)
      setRegenCount(newCount)
      setRegenFeedback('')
      setRegenLoading(false)

      // ── Upload to Storage in the background ──
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const permanentUrl = await uploadAvatarToStorage(data.imageUrl, user.id)
      // Append cache-buster so the browser fetches the new image on next load
      const freshUrl = `${permanentUrl}?t=${Date.now()}`
      // Keep showing the fresh base64 locally — don't swap to the same-path URL
      // (browser would serve cached old image). Update DB + parent with busted URL.
      await updateHub({ avatar_url: freshUrl, regen_count: newCount, avatar_prompt_pending: null })
      onUpdateHub?.({ avatarUrl: freshUrl })
    } catch (err) {
      console.error('Regen failed:', err)
      try {
        const pendingDescription = [bioState, askState, regenFeedback].filter(Boolean).join(' — ')
        await updateHub({ avatar_prompt_pending: pendingDescription })
      } catch {}
      setRegenError('Something went wrong. Your attempt was not used — try again.')
      setRegenLoading(false)
    }
  }

  async function saveHub() {
    try {
      setSaving(true); setSaveError('')
      await updateHub({ hub_name: hubDraft })
      setHubNameState(hubDraft)
      onUpdateHub?.({ hubName: hubDraft })
      setEditingHub(false)
    } catch (err) {
      console.error(err)
      setSaveError(err instanceof Error ? err.message : 'Could not save hub name.')
    } finally { setSaving(false) }
  }

  async function saveBio() {
    try {
      setSaving(true); setSaveError('')
      await updateHub({ bio: bioDraft })
      setBioState(bioDraft)
      onUpdateHub?.({ bio: bioDraft })
      setEditingBio(false)
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  async function saveAsk() {
    try {
      setSaving(true); setSaveError('')
      await updateHub({ ask_about: askDraft })
      setAskState(askDraft)
      onUpdateHub?.({ askAbout: askDraft })
      setEditingAsk(false)
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  async function loadVisitorBook() {
    try {
      setVisitorBookLoading(true)
      setVisitorBookError('')
      const entries = await getVisitorBook()
      setVisitorBookEntries(entries)
    } catch (err) {
      console.error(err)
      const message =
        err instanceof Error && err.message
          ? err.message
          : typeof err === 'string'
            ? err
            : err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
              ? (err as { message: string }).message
              : err && typeof err === 'object'
                ? JSON.stringify(err)
                : 'Could not load the visitor book right now.'
      setVisitorBookError(message)
    } finally {
      setVisitorBookLoading(false)
    }
  }

  async function toggleVisitorBook() {
    const nextValue = !visitorBookEnabledState
    try {
      setVisitorBookSaving(true)
      setVisitorBookError('')
      await updateHub({ visitor_book_enabled: nextValue })
      setVisitorBookEnabledState(nextValue)
      onUpdateHub?.({ visitorBookEnabled: nextValue })
    } catch (err) {
      console.error(err)
      setVisitorBookError('Could not update visitor book visibility.')
    } finally {
      setVisitorBookSaving(false)
    }
  }

  function formatVisitTime(dateString: string) {
    const diffMs = Date.now() - new Date(dateString).getTime()
    const diffHours = Math.max(1, Math.floor(diffMs / 3600000))
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays}d ago`
    const diffMonths = Math.floor(diffDays / 30)
    return `${diffMonths}mo ago`
  }

  // ── Hub style visual map ──
  const hubTheme = HUB_COLOR_THEMES.find(t => t.id === selectedHubColor)
  const hubGlowRgb = hubTheme?.glow || '201,168,76'
  const hubGlowIntensityValue =
    selectedGlowIntensity === 'dim'
      ? 0.25
      : selectedGlowIntensity === 'normal'
        ? 0.5
        : 0.85

  // Use the real icon + label from HUB_STYLES so every style gets its correct symbol
  const hubStyleDef = HUB_STYLES.find(s => s.id === selectedHubStyle) || HUB_STYLES[0]
  const centerpiece = { symbol: hubStyleDef.icon, label: hubStyleDef.label }

  return (
    <motion.div initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,5,0.88)', backdropFilter: 'blur(20px)', zIndex: 70, overflowY: 'auto' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 70% 55% at 20% 30%, rgba(${hubGlowRgb},${hubGlowIntensityValue * 0.7}) 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 80% 70%, rgba(${hubGlowRgb},${hubGlowIntensityValue * 0.35}) 0%, transparent 55%)` }} />

      {/* ── Ambient hub glow pulse ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <motion.div
          animate={{ opacity: [hubGlowIntensityValue * 0.3, hubGlowIntensityValue * 0.55, hubGlowIntensityValue * 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '5%', left: '5%', width: '520px', height: '520px', borderRadius: '50%', background: `radial-gradient(circle, rgba(${hubGlowRgb},0.28) 0%, transparent 70%)`, filter: 'blur(60px)', pointerEvents: 'none' }}
        />
      </div>

      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} onClick={onClose}
        style={{ position: 'fixed', top: '28px', right: '28px', background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.55)', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em', padding: '8px 16px', cursor: 'pointer', textTransform: 'uppercase', zIndex: 80 }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}>
        ← Universe
      </motion.button>

      <div className="profile-layout">
        {/* LEFT — Avatar + Hub Centerpiece */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
          className="profile-avatar-col">
          <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', background: 'linear-gradient(to right, transparent 65%, rgba(0,0,5,0.97) 100%), linear-gradient(to bottom, rgba(0,0,5,0.3) 0%, transparent 15%, transparent 85%, rgba(0,0,5,0.6) 100%)' }} />

          {/* Hub structure centerpiece ring — removed from avatar col, now in info col */}

          {regenLoading && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,5,0.7)', backdropFilter: 'blur(8px)' }}>
              <div style={{ textAlign: 'center' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid rgba(201,168,76,0.3)', borderTopColor: '#c9a84c', margin: '0 auto 16px' }} />
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase' }}>Reimagining...</p>
              </div>
            </div>
          )}
          {currentAvatarUrl ? (
            <>
              {/* Holographic projection cone — light beams rising from portal ring */}
              <div style={{
                position: 'absolute', bottom: '10%', left: '50%',
                transform: 'translateX(-50%)',
                width: '120%', height: '78%',
                background: `radial-gradient(ellipse at 50% 100%, rgba(${hubGlowRgb},0.20) 0%, rgba(0,170,255,0.09) 20%, transparent 64%)`,
                pointerEvents: 'none', zIndex: 2,
                mixBlendMode: 'screen' as CSSProperties['mixBlendMode'],
              }} />
              {/* Pulsing secondary beam for depth */}
              <motion.div
                animate={{ opacity: [0.38, 0.72, 0.38] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', bottom: '10%', left: '50%',
                  transform: 'translateX(-50%)',
                  width: '80%', height: '60%',
                  background: 'radial-gradient(ellipse at 50% 100%, rgba(0,160,255,0.16) 0%, transparent 70%)',
                  pointerEvents: 'none', zIndex: 2,
                  mixBlendMode: 'screen' as CSSProperties['mixBlendMode'],
                  filter: 'blur(5px)',
                }}
              />
              {/* Avatar — top 85% of container so feet clear the ring */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentAvatarUrl} alt="Avatar"
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: '85%', width: '100%',
                  objectFit: 'contain', objectPosition: 'top center',
                  filter: `brightness(1.08) saturate(0.82) drop-shadow(0 0 ${Math.round(hubGlowIntensityValue * 28)}px rgba(${hubGlowRgb},0.45)) drop-shadow(0 0 10px rgba(0,190,255,0.28))`,
                  animation: 'holo-flicker 7s ease-in-out infinite',
                }}
              />
              {/* Scanlines */}
              <div style={{
                position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
                background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,200,255,0.022) 3px, rgba(0,200,255,0.022) 4px)',
                animation: 'holo-scan 10s linear infinite',
              }} />
              {/* Portal ring — at ground level, clearly below the feet */}
              <motion.div
                animate={{ opacity: [0.72, 1, 0.72] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', bottom: '4%', left: '50%', transform: 'translateX(-50%)', width: '74%', zIndex: 5, pointerEvents: 'none' }}
              >
                <svg width="100%" viewBox="0 0 200 58" overflow="visible" style={{ display: 'block' }}>
                  <defs>
                    <filter id="php-glow-wide" x="-70%" y="-70%" width="240%" height="240%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="7" />
                    </filter>
                    <filter id="php-glow-soft" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                    </filter>
                  </defs>
                  {/* Broad colour halo matching hub theme */}
                  <ellipse cx="100" cy="29" rx="95" ry="22" fill="none" stroke={`rgba(${hubGlowRgb},0.5)`} strokeWidth="10" filter="url(#php-glow-wide)" />
                  {/* Teal accent halo */}
                  <ellipse cx="100" cy="29" rx="95" ry="22" fill="none" stroke="rgba(0,210,255,0.35)" strokeWidth="5" filter="url(#php-glow-soft)" />
                  {/* Main crisp ring */}
                  <ellipse cx="100" cy="29" rx="94" ry="21" fill="none" stroke={`rgba(${hubGlowRgb},0.92)`} strokeWidth="1.3" />
                  {/* Teal inner accent */}
                  <ellipse cx="100" cy="29" rx="94" ry="21" fill="none" stroke="rgba(0,220,255,0.38)" strokeWidth="0.5" />
                  {/* Auto-rotating dashed mid ring */}
                  <ellipse cx="100" cy="29" rx="79" ry="17" fill="none" stroke={`rgba(${hubGlowRgb},0.38)`} strokeWidth="0.9" strokeDasharray="5 3.5">
                    <animateTransform attributeName="transform" type="rotate" from="0 100 29" to="360 100 29" dur="20s" repeatCount="indefinite" />
                  </ellipse>
                  {/* Innermost fine ring */}
                  <ellipse cx="100" cy="29" rx="61" ry="13" fill="none" stroke="rgba(0,210,255,0.20)" strokeWidth="0.7" />
                  {/* Translucent inner fill */}
                  <ellipse cx="100" cy="29" rx="94" ry="21" fill={`rgba(${hubGlowRgb},0.055)`} />
                </svg>
              </motion.div>
            </>
          ) : (
            <>
              {/* No-avatar: symbol floating above portal ring */}
              <motion.div
                animate={{ opacity: [0.72, 1, 0.72] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', bottom: '14%', left: '50%', transform: 'translateX(-50%)', width: '74%', zIndex: 5, pointerEvents: 'none' }}
              >
                <svg width="100%" viewBox="0 0 200 58" overflow="visible" style={{ display: 'block' }}>
                  <defs>
                    <filter id="php-glow-wide-e" x="-70%" y="-70%" width="240%" height="240%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="7" />
                    </filter>
                    <filter id="php-glow-soft-e" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                    </filter>
                  </defs>
                  <ellipse cx="100" cy="29" rx="95" ry="22" fill="none" stroke={`rgba(${hubGlowRgb},0.5)`} strokeWidth="10" filter="url(#php-glow-wide-e)" />
                  <ellipse cx="100" cy="29" rx="95" ry="22" fill="none" stroke="rgba(0,210,255,0.35)" strokeWidth="5" filter="url(#php-glow-soft-e)" />
                  <ellipse cx="100" cy="29" rx="94" ry="21" fill="none" stroke={`rgba(${hubGlowRgb},0.92)`} strokeWidth="1.3" />
                  <ellipse cx="100" cy="29" rx="79" ry="17" fill="none" stroke={`rgba(${hubGlowRgb},0.38)`} strokeWidth="0.9" strokeDasharray="5 3.5">
                    <animateTransform attributeName="transform" type="rotate" from="0 100 29" to="360 100 29" dur="20s" repeatCount="indefinite" />
                  </ellipse>
                  <ellipse cx="100" cy="29" rx="94" ry="21" fill={`rgba(${hubGlowRgb},0.055)`} />
                </svg>
              </motion.div>
              <div className="profile-avatar-fill" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, rgba(10,14,40,0.9), rgba(4,6,18,0.95))' }}>
                <motion.div
                  animate={{ y: [-6, 6, -6] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ fontSize: '54px', lineHeight: 1, filter: `drop-shadow(0 0 18px rgba(${hubGlowRgb},0.75)) drop-shadow(0 0 8px rgba(0,200,255,0.4))`, animation: 'holo-flicker 7s ease-in-out infinite' }}
                >
                  {centerpiece.symbol}
                </motion.div>
              </div>
            </>
          )}
        </motion.div>

        {/* RIGHT — Info */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="profile-info-col">

          <div style={{ marginBottom: '40px' }}>
            {/* ── Centered hub style symbol ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '22px' }}>
              <motion.div
                animate={{ scale: [1, 1.07, 1], boxShadow: [`0 0 18px rgba(${hubGlowRgb},${hubGlowIntensityValue * 0.4})`, `0 0 36px rgba(${hubGlowRgb},${hubGlowIntensityValue * 0.75})`, `0 0 18px rgba(${hubGlowRgb},${hubGlowIntensityValue * 0.4})`] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '50%', border: `1px solid rgba(${hubGlowRgb},0.55)`, background: `radial-gradient(circle, rgba(${hubGlowRgb},0.12) 0%, transparent 75%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                {/* Orbiting dots */}
                {[0, 120, 240].map((deg, i) => (
                  <motion.div key={i} animate={{ rotate: [deg, deg + 360] }} transition={{ duration: 14 + i * 3, repeat: Infinity, ease: 'linear' }}
                    style={{ position: 'absolute', width: '78px', height: '78px', top: '-7px', left: '-7px' }}>
                    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '5px', height: '5px', borderRadius: '50%', background: `rgba(${hubGlowRgb},${0.55 + i * 0.12})`, boxShadow: `0 0 8px rgba(${hubGlowRgb},0.5)` }} />
                  </motion.div>
                ))}
                <span style={{ fontSize: '26px', lineHeight: 1, filter: `drop-shadow(0 0 10px rgba(${hubGlowRgb},0.8))` }}>{centerpiece.symbol}</span>
              </motion.div>
              <div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: `rgba(${hubGlowRgb},0.7)`, textTransform: 'uppercase', marginBottom: '4px' }}>Soul Hub</p>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.28em', color: `rgba(${hubGlowRgb},0.42)`, textTransform: 'uppercase' }}>{centerpiece.label}</p>
              </div>
            </div>
            {editingHub ? (
              <div style={{ marginBottom: '8px' }}>
                <input value={hubDraft} onChange={e => setHubDraft(e.target.value)} autoFocus
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.3)', color: 'rgba(255,255,255,0.95)', fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(22px,3vw,32px)', letterSpacing: '0.06em', padding: '8px 12px', outline: 'none', borderRadius: '2px', width: '100%', caretColor: '#c9a84c', marginBottom: '10px' }}
                  onKeyDown={e => { if (e.key === 'Enter') void saveHub(); if (e.key === 'Escape') setEditingHub(false) }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => void saveHub()} style={saveBtn} disabled={saving}>Save</button>
                  <button onClick={() => setEditingHub(false)} style={cancelBtn}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <motion.p
                  animate={{ textShadow: [`0 0 18px rgba(${hubGlowRgb},0.0)`, `0 0 24px rgba(${hubGlowRgb},0.35)`, `0 0 18px rgba(${hubGlowRgb},0.0)`] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(28px,4vw,48px)', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.95)', lineHeight: 1.1 }}>{hubNameState}</motion.p>
                <button onClick={() => { setHubDraft(hubNameState); setEditingHub(true) }} style={editBtn}>Edit</button>
              </div>
            )}

            {saveError && (
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(235,140,140,0.9)', marginTop: '10px' }}>{saveError}</p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '14px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', width: '40px', height: '40px', filter: 'drop-shadow(0 0 6px #c9a84c88)' }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
                    <circle cx="20" cy="20" r="16" fill="none" stroke="#ffe07a" strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 16}`}
                      strokeDashoffset={`${2 * Math.PI * 16 * (1 - refreshProgress / 100)}`}
                      strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px #ffe07a)', opacity: 0.92 }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '13px', fontWeight: 700, color: '#ffe07a', textShadow: '0 0 6px #c9a84c, 0 1px 0 #fff8' }}>{daysLeft}</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', color: '#c9a84c', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '-2px' }}>days</span>
                  </div>
                </div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.22em', color: '#ffe07a', textTransform: 'uppercase', textShadow: '0 0 6px #c9a84c, 0 1px 0 #fff8' }}>Soul Cycle</p>
              </div>
              {attemptsLeft > 0 ? (
                <button onClick={() => setShowRegenInput(v => !v)} disabled={regenLoading}
                  style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.7)', padding: '6px 12px', border: '1px solid rgba(201,168,76,0.25)', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', borderRadius: '4px' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#c9a84c'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(201,168,76,0.7)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)' }}>
                  ✦ Reimagine · {attemptsLeft} left
                </button>
              ) : (
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>Your form is sealed · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} until the mirror opens</p>
              )}
            </div>

            {showRegenInput && attemptsLeft > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '12px' }}>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Tell the mirror what to change — or leave blank to reimagine freely.</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={regenFeedback} onChange={e => setRegenFeedback(e.target.value)} placeholder="e.g. more dark and moody, different outfit..."
                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '6px', color: 'rgba(255,255,255,0.85)', fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', padding: '8px 12px', outline: 'none', caretColor: '#c9a84c' }}
                    onKeyDown={e => { if (e.key === 'Enter') void regenerateAvatar() }} />
                  <button onClick={() => void regenerateAvatar()} disabled={regenLoading}
                    style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: '#c9a84c', padding: '8px 16px', border: '1px solid rgba(201,168,76,0.35)', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                    Reimagine ✦
                  </button>
                </div>
                {regenError && (
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(220,100,100,0.85)', marginTop: '8px' }}>{regenError}</p>
                )}
              </motion.div>
            )}
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.3), transparent)', marginBottom: '32px' }} />

          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: `rgba(${hubGlowRgb},0.75)`, textTransform: 'uppercase' }}>Bio</p>
              {!editingBio && <button onClick={() => { setBioDraft(bioState); setEditingBio(true) }} style={editBtn}>Edit</button>}
            </div>
            {editingBio ? (
              <div>
                <textarea value={bioDraft} onChange={e => setBioDraft(e.target.value)} autoFocus rows={4}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.25)', color: 'rgba(255,255,255,0.92)', fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '16px', lineHeight: 1.7, padding: '12px 16px', outline: 'none', resize: 'none', borderRadius: '4px', caretColor: '#c9a84c', marginBottom: '10px' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => void saveBio()} style={saveBtn} disabled={saving}>Save</button>
                  <button onClick={() => setEditingBio(false)} style={cancelBtn}>Cancel</button>
                </div>
              </div>
            ) : (
              <motion.p
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(15px,1.8vw,18px)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.8 }}>{bioState}</motion.p>
            )}
          </div>

          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(126,207,180,0.75)', textTransform: 'uppercase' }}>Open to letters about</p>
              {!editingAsk && <button onClick={() => { setAskDraft(askState); setEditingAsk(true) }} style={editBtn}>Edit</button>}
            </div>
            {editingAsk ? (
              <div>
                <textarea value={askDraft} onChange={e => setAskDraft(e.target.value)} autoFocus rows={2}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.25)', color: 'rgba(255,255,255,0.92)', fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '16px', lineHeight: 1.7, padding: '12px 16px', outline: 'none', resize: 'none', borderRadius: '4px', caretColor: '#c9a84c', marginBottom: '10px' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => void saveAsk()} style={saveBtn} disabled={saving}>Save</button>
                  <button onClick={() => setEditingAsk(false)} style={cancelBtn}>Cancel</button>
                </div>
              </div>
            ) : (
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(15px,1.8vw,18px)', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7 }}>{askState}</p>
            )}
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)', marginBottom: '28px' }} />

          {/* ── Hub Appearance ── */}
          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.65)', textTransform: 'uppercase' }}>Hub Appearance</p>
            </div>

            {/* Style grid */}
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.26em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: '10px' }}>Structure</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', marginBottom: '20px' }}>
              {HUB_STYLES.map(style => {
                const isSelected = selectedHubStyle === style.id
                return (
                  <button key={style.id}
                    onClick={() => setSelectedHubStyle(style.id)}
                    style={{ textAlign: 'left', padding: '12px 12px', borderRadius: '10px', border: isSelected ? '1px solid rgba(201,168,76,0.65)' : '1px solid rgba(255,255,255,0.1)', background: isSelected ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.18s', position: 'relative' }}
                    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(201,168,76,0.06)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' } }}
                    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}>
                    {isSelected && <div style={{ position: 'absolute', top: '8px', right: '10px', width: '14px', height: '14px', borderRadius: '50%', background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#000', fontWeight: 'bold' }}>✓</div>}
                    <p style={{ fontSize: '16px', marginBottom: '5px' }}>{style.icon}</p>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.15em', color: isSelected ? '#c9a84c' : 'rgba(255,255,255,0.65)', textTransform: 'uppercase', marginBottom: '3px' }}>{style.label}</p>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{style.desc}</p>
                  </button>
                )
              })}
            </div>

            {/* Color grid */}
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.26em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: '10px' }}>Color</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '8px', marginBottom: '20px' }}>
              {HUB_COLOR_THEMES.map(theme => {
                const isSelected = selectedHubColor === theme.id
                return (
                  <button key={theme.id}
                    onClick={() => setSelectedHubColor(theme.id)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', padding: '10px 6px', borderRadius: '10px', border: isSelected ? '1px solid rgba(201,168,76,0.65)' : '1px solid rgba(255,255,255,0.1)', background: isSelected ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.18s' }}
                    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(201,168,76,0.06)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' } }}
                    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.85), ${theme.ring})`, boxShadow: `0 0 14px rgba(${theme.glow},0.3)`, border: '1px solid rgba(255,255,255,0.15)' }} />
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase', color: isSelected ? '#c9a84c' : 'rgba(255,255,255,0.55)' }}>{theme.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Decoration picker */}
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.26em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: '10px' }}>Decoration</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))', gap: '8px', marginBottom: '20px' }}>
              {HUB_DECORATIONS.map(dec => {
                const isSelected = selectedDecoration === dec.id
                return (
                  <button key={dec.id}
                    onClick={() => setSelectedDecoration(dec.id)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '10px 6px', borderRadius: '10px', border: isSelected ? '1px solid rgba(201,168,76,0.65)' : '1px solid rgba(255,255,255,0.1)', background: isSelected ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.18s' }}
                    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(201,168,76,0.06)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' } }}
                    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}>
                    <span style={{ fontSize: '16px' }}>{dec.icon}</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase', color: isSelected ? '#c9a84c' : 'rgba(255,255,255,0.55)' }}>{dec.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Glow intensity picker */}
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.26em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: '10px' }}>Glow</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {HUB_GLOW_LEVELS.map(glow => {
                const isSelected = selectedGlowIntensity === glow.id
                return (
                  <button key={glow.id}
                    onClick={() => setSelectedGlowIntensity(glow.id)}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 8px', borderRadius: '10px', border: isSelected ? '1px solid rgba(201,168,76,0.65)' : '1px solid rgba(255,255,255,0.1)', background: isSelected ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.18s' }}
                    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(201,168,76,0.06)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' } }}
                    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: isSelected ? '#c9a84c' : 'rgba(255,255,255,0.65)' }}>{glow.label}</span>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '11px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.3, textAlign: 'center' }}>{glow.desc}</span>
                  </button>
                )
              })}
            </div>

            {/* Save button */}
            <AnimatePresence>
              {(appearanceChanged || appearanceSaved) && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <button onClick={() => void saveAppearance()} disabled={appearanceSaving || appearanceSaved}
                    style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: appearanceSaved ? 'rgba(100,200,130,0.9)' : '#c9a84c', padding: '9px 20px', border: `1px solid ${appearanceSaved ? 'rgba(100,200,130,0.4)' : 'rgba(201,168,76,0.4)'}`, background: 'transparent', cursor: appearanceSaving || appearanceSaved ? 'default' : 'pointer', borderRadius: '6px', textTransform: 'uppercase', transition: 'all 0.2s' }}>
                    {appearanceSaving ? 'Saving...' : appearanceSaved ? '✓ Saved' : 'Save Appearance'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)', marginBottom: '28px' }} />

          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.65)', textTransform: 'uppercase', marginBottom: '6px' }}>Visitor Book</p>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>A private log of who opened your hub card.</p>
              </div>
              <button onClick={() => void toggleVisitorBook()} disabled={visitorBookSaving}
                style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: visitorBookEnabledState ? '#c9a84c' : 'rgba(255,255,255,0.6)', padding: '7px 14px', border: `1px solid ${visitorBookEnabledState ? 'rgba(201,168,76,0.38)' : 'rgba(255,255,255,0.14)'}`, background: visitorBookEnabledState ? 'rgba(201,168,76,0.08)' : 'transparent', cursor: visitorBookSaving ? 'default' : 'pointer', textTransform: 'uppercase', borderRadius: '4px' }}>
                {visitorBookSaving ? 'Saving...' : visitorBookEnabledState ? 'Visitor Book On' : 'Visitor Book Off'}
              </button>
            </div>

            {visitorBookEnabledState ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                {visitorBookLoading ? (
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Gathering recent visitors...</p>
                ) : visitorBookError ? (
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(220,100,100,0.85)' }}>{visitorBookError}</p>
                ) : visitorBookEntries.length === 0 ? (
                  <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px' }}>
                    <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.55)', margin: 0 }}>No one has signed the quiet yet.</p>
                  </div>
                ) : visitorBookEntries.map((entry) => (
                  <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      {entry.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.avatarUrl} alt={entry.visitorName} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(201,168,76,0.22)' }} />
                      ) : (
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(201,168,76,0.55)', fontSize: '14px' }}>✦</div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.82)', textTransform: 'uppercase', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.visitorName}</p>
                        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>looked in for a moment</p>
                      </div>
                    </div>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.18em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{formatVisitTime(entry.visitedAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.7 }}>When this is off, new visits are not recorded and the book stays private to you.</p>
            )}
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)', marginBottom: '28px' }} />

          <div style={{ marginBottom: '32px' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.65)', textTransform: 'uppercase', marginBottom: '16px' }}>Settings</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Receive Universe Letters', desc: 'Allow random letters from strangers to find you', enabled: true },
                { label: 'Show Online Status', desc: 'Let others see when your hub is glowing', enabled: true },
                { label: 'Letter Travel Time', desc: 'Slow — letters arrive over 1 to 7 days', enabled: true },
              ].map((s, i) => <SettingRow key={i} label={s.label} desc={s.desc} enabled={s.enabled} />)}
            </div>
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)', marginBottom: '28px' }} />

          <div style={{ marginBottom: '32px' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.65)', textTransform: 'uppercase', marginBottom: '6px' }}>Share This App</p>
            <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '20px' }}>Scan to open Dear Stranger on any device</p>
            <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ padding: '12px', background: '#fff', borderRadius: '6px', lineHeight: 0, flexShrink: 0 }}>
                <QRCodeSVG value={appUrl} size={120} bgColor="#ffffff" fgColor="#0a0a14" level="M" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: '240px' }}>
                  Point a phone camera at the code to visit the app — or add it to your home screen to install as a PWA.
                </p>
                <button onClick={handleCopyUrl}
                  style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em', color: copied ? 'rgba(100,200,140,0.9)' : 'rgba(201,168,76,0.85)', padding: '8px 16px', border: `1px solid ${copied ? 'rgba(100,200,140,0.4)' : 'rgba(201,168,76,0.3)'}`, background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', borderRadius: '2px', width: 'fit-content', transition: 'all 0.2s' }}>
                  {copied ? '✓ Copied' : '⎘ Copy Link'}
                </button>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <AnimatePresence>
              {deleteStep !== 'idle' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,5,0.88)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ background: 'rgba(8,10,28,0.98)', border: '1px solid rgba(220,80,80,0.3)', borderRadius: '12px', width: 'min(520px,95vw)', padding: 'clamp(28px,5vw,44px)', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(220,80,80,0.4), transparent)' }} />

                    {deleteStep === 'exporting' && (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(201,168,76,0.3)', borderTopColor: '#c9a84c', margin: '0 auto 16px' }} />
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase' }}>Gathering your letters...</p>
                      </div>
                    )}

                    {deleteStep === 'exported' && (
                      <div>
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.4em', color: 'rgba(220,80,80,0.8)', textTransform: 'uppercase', marginBottom: '12px' }}>Delete Your Hub</p>
                        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '18px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6, marginBottom: '14px' }}>Before you go — your letters are ready to download.</p>
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: '22px' }}>This will permanently delete your hub, avatar, and all letters. This cannot be undone.</p>
                        {deleteError && <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(220,100,100,0.8)', marginBottom: '12px' }}>{deleteError}</p>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <button onClick={handleDownloadExport}
                            style={{ padding: '12px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.15)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.08)' }}>
                            ↓ Download My Letters
                          </button>
                          <button onClick={() => void handleConfirmDelete()}
                            style={{ padding: '12px', background: 'rgba(220,60,60,0.1)', border: '1px solid rgba(220,60,60,0.4)', color: 'rgba(220,80,80,0.9)', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,60,60,0.2)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,60,60,0.1)' }}>
                            Delete Everything Permanently
                          </button>
                          <button onClick={() => { setDeleteStep('idle'); setDeleteError('') }}
                            style={{ padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '4px' }}>
                            Cancel — Keep My Hub
                          </button>
                        </div>
                      </div>
                    )}

                    {deleteStep === 'deleting' && (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(220,80,80,0.3)', borderTopColor: 'rgba(220,80,80,0.8)', margin: '0 auto 16px' }} />
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(220,80,80,0.7)', textTransform: 'uppercase' }}>Erasing your presence...</p>
                      </div>
                    )}

                    {deleteStep === 'deleted' && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                        <p style={{ fontSize: '32px', marginBottom: '16px', opacity: 0.4 }}>✦</p>
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '10px' }}>Your hub is gone</p>
                        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '15px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>The universe remembers nothing. Returning to the entry screen...</p>
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {leavingConfirm ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>Sign out and come back later?</p>
                  <button onClick={() => void handleLeave()}
                    style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.9)', padding: '7px 14px', border: '1px solid rgba(201,168,76,0.4)', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', borderRadius: '2px' }}>
                    Yes, sign out
                  </button>
                  <button onClick={() => setLeavingConfirm(false)}
                    style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', padding: '7px 14px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', borderRadius: '2px' }}>
                    Stay
                  </button>
                </div>
              ) : (
                <button onClick={() => void handleLeave()}
                  style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', padding: '8px 16px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}>
                  Leave the Universe
                </button>
              )}
              {deleteStep === 'idle' && !leavingConfirm && (
                <button onClick={() => void handleStartDelete()}
                  style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em', color: 'rgba(200,60,60,0.5)', padding: '8px 16px', border: '1px solid rgba(200,60,60,0.18)', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgba(220,80,80,0.85)'; e.currentTarget.style.borderColor = 'rgba(220,80,80,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(200,60,60,0.5)'; e.currentTarget.style.borderColor = 'rgba(200,60,60,0.18)' }}>
                  Delete My Hub
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

const editBtn: CSSProperties = { background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.25em', padding: '5px 10px', cursor: 'pointer', textTransform: 'uppercase' }
const saveBtn: CSSProperties = { fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em', color: '#c9a84c', padding: '7px 14px', border: '1px solid rgba(201,168,76,0.3)', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }
const cancelBtn: CSSProperties = { fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.45)', padding: '7px 14px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }

function SettingRow({ label, desc, enabled: init }: { label: string; desc: string; enabled: boolean }) {
  const [enabled, setEnabled] = useState(init)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px', gap: '16px' }}>
      <div>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.78)', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</p>
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>{desc}</p>
      </div>
      <div onClick={() => setEnabled(!enabled)}
        style={{ width: '40px', height: '22px', borderRadius: '11px', background: enabled ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.08)', border: `1px solid ${enabled ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.12)'}`, position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
        <motion.div animate={{ left: enabled ? '20px' : '3px' }} transition={{ duration: 0.2 }}
          style={{ position: 'absolute', top: '3px', width: '14px', height: '14px', borderRadius: '50%', background: enabled ? '#c9a84c' : 'rgba(255,255,255,0.35)' }} />
      </div>
    </div>
  )
}
