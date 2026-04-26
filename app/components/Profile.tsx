'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { updateHub, signOut, deleteAccount, exportMyLetters, uploadAvatarToStorage, getVisitorBook, getMyAvatarBucketImages, deleteAvatarFromStorage, type VisitorBookEntry } from '../lib/auth'
import { supabase } from '../../lib/supabase'
import { HUB_COLOR_THEMES, HUB_STYLES, HUB_DECORATIONS, HUB_GLOW_LEVELS, type HubColor, type HubStyle, type HubDecoration, type HubGlowIntensity } from './UniverseMap'

const MAX_REGEN_ATTEMPTS = 2
type DeleteStep = 'idle' | 'exporting' | 'exported' | 'deleting' | 'deleted'
type SanctumPanel = 'appearance' | 'visitors' | 'settings' | 'share'
const CYCLE_DAYS = 20
const DAY_MS = 1000 * 60 * 60 * 24
const DEFAULT_WELCOME_URL = 'https://dear-stranger.vercel.app/?welcome=1'
const MAX_AVATAR_HISTORY = 8

function getWelcomeUrl(origin: string) {
  const url = new URL(origin)
  url.searchParams.set('welcome', '1')
  return url.toString()
}

function makeAvatarHistoryKey(userId: string) {
  return `ds_avatar_history_${userId}`
}

function normalizeAvatarHistory(urls: string[]) {
  return Array.from(new Set(urls.filter(Boolean))).slice(0, MAX_AVATAR_HISTORY)
}

function getLocalDayIndex(date: Date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS)
}

function getLocalDayProgress(nowMs: number) {
  const now = new Date(nowMs)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
  return (nowMs - startOfToday) / (startOfTomorrow - startOfToday)
}

function getReimagineCycle(createdAt?: string, nowMs = Date.now()) {
  if (!createdAt) return { cycleNumber: 0, daysLeft: CYCLE_DAYS, hoursLeft: 0, refreshProgress: 0 }
  const createdDate = new Date(createdAt)
  if (!Number.isFinite(createdDate.getTime())) return { cycleNumber: 0, daysLeft: CYCLE_DAYS, hoursLeft: 0, refreshProgress: 0 }

  const nowDate = new Date(nowMs)
  const localDaysSinceCreation = Math.max(0, getLocalDayIndex(nowDate) - getLocalDayIndex(createdDate))
  const cycleNumber = Math.floor(localDaysSinceCreation / CYCLE_DAYS)
  const dayProgress = getLocalDayProgress(nowMs)
  const daysInCycle = localDaysSinceCreation % CYCLE_DAYS
  const totalHoursLeft = Math.max(1, Math.ceil(((CYCLE_DAYS - daysInCycle - dayProgress) * DAY_MS) / (1000 * 60 * 60)))

  return {
    cycleNumber,
    daysLeft: Math.floor(totalHoursLeft / 24),
    hoursLeft: totalHoursLeft % 24,
    refreshProgress: Math.min(100, ((daysInCycle + dayProgress) / CYCLE_DAYS) * 100),
  }
}

export default function Profile({
  hubName, bio, askAbout, avatarUrl: initialAvatarUrl, avatarPromptPending, regenCount: initialRegenCount,
  hubCreatedAt,
  visitorBookEnabled: initialVisitorBookEnabled = true,
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
  const [regenCount, setRegenCount] = useState(initialRegenCount ?? 0)
  const [cycleNow, setCycleNow] = useState(() => Date.now())
  const [regenLoading, setRegenLoading] = useState(false)
  const [regenFeedback, setRegenFeedback] = useState('')
  const [showRegenInput, setShowRegenInput] = useState(false)
  const [editCurrentAvatar, setEditCurrentAvatar] = useState(true)
  const [forceNewAvatar, setForceNewAvatar] = useState(false)
  const [regenError, setRegenError] = useState('')
  const [userId, setUserId] = useState('')
  const [avatarHistory, setAvatarHistory] = useState<string[]>([])
  const [restoringAvatar, setRestoringAvatar] = useState('')

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
  const [activeSanctumPanel, setActiveSanctumPanel] = useState<SanctumPanel>('appearance')
  const profileScrollRef = useRef<HTMLDivElement | null>(null)

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

  const [appUrl, setAppUrl] = useState(DEFAULT_WELCOME_URL)
  const [copied, setCopied] = useState(false)

  const [leavingConfirm, setLeavingConfirm] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState('')
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle')
  const [exportedText, setExportedText] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const persistAvatarHistory = useCallback((nextHistory: string[]) => {
    const normalized = normalizeAvatarHistory(nextHistory)
    setAvatarHistory(normalized)
    if (userId && typeof window !== 'undefined') {
      localStorage.setItem(makeAvatarHistoryKey(userId), JSON.stringify(normalized))
    }
  }, [userId])

  function rememberAvatar(url?: string, extras: string[] = []) {
    persistAvatarHistory([url || '', ...extras, ...avatarHistory])
  }

  async function handleDeleteAvatar(url: string) {
    if (!url) return
    try {
      await deleteAvatarFromStorage?.(url)
    } catch (err) {
      console.error('Failed to delete avatar from storage:', err)
    }

    const updated = avatarHistory.filter((avatar) => avatar !== url)
    persistAvatarHistory(updated)

    if (url === currentAvatarUrl) {
      setCurrentAvatarUrl('')
      await updateHub({ avatar_url: '' })
      onUpdateHub?.({ avatarUrl: '' })
    }
  }

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)
      } catch {}
    }
    void loadUser()
  }, [])

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(makeAvatarHistoryKey(userId))
      const parsed = raw ? JSON.parse(raw) as unknown : []
      const urls = Array.isArray(parsed)
        ? normalizeAvatarHistory([currentAvatarUrl, ...parsed.filter((value): value is string => typeof value === 'string')])
        : normalizeAvatarHistory([currentAvatarUrl])
      setAvatarHistory(urls)
    } catch {
      setAvatarHistory(normalizeAvatarHistory([currentAvatarUrl]))
    }
  }, [userId, currentAvatarUrl])

  useEffect(() => {
    if (!userId) return
    async function loadAvatarHistory() {
      try {
        const bucketImages = await getMyAvatarBucketImages()
        if (!bucketImages.length) return
        persistAvatarHistory([currentAvatarUrl, ...bucketImages])
      } catch (err) {
        console.error('Failed to load avatar history:', err)
      }
    }
    void loadAvatarHistory()
  }, [userId, currentAvatarUrl, persistAvatarHistory])

  useEffect(() => {
    // Only update local state if the prop actually changed (not just on every mount)
    if (initialAvatarUrl && initialAvatarUrl !== lastAvatarProp) {
      setCurrentAvatarUrl(initialAvatarUrl)
      setLastAvatarProp(initialAvatarUrl)
      persistAvatarHistory([initialAvatarUrl, ...avatarHistory])
    }
    // If avatar is cleared (e.g. on onboarding), also clear local state
    if (!initialAvatarUrl && lastAvatarProp) {
      setCurrentAvatarUrl('')
      setLastAvatarProp('')
    }
  }, [initialAvatarUrl, lastAvatarProp, avatarHistory, userId, persistAvatarHistory])

  useEffect(() => {
    if (typeof window !== 'undefined') setAppUrl(getWelcomeUrl(window.location.origin))
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setCycleNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
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

  useEffect(() => {
    if (!hubCreatedAt) return
    const localCount = regenCount % 10
    if (localCount < MAX_REGEN_ATTEMPTS) return
    const cycle = getReimagineCycle(hubCreatedAt, cycleNow).cycleNumber
    const storedCycle = Math.floor(regenCount / 10)
    if (cycle > storedCycle) {
      const newCount = cycle * 10
      setRegenCount(newCount)
      void updateHub({ regen_count: newCount }).catch(() => {})
    }
  }, [cycleNow, hubCreatedAt, regenCount])

  const localRegenCount = regenCount % 10
  const attemptsLeft = Math.max(0, MAX_REGEN_ATTEMPTS - localRegenCount)
  const { cycleNumber, daysLeft, hoursLeft, refreshProgress } = getReimagineCycle(hubCreatedAt, cycleNow)
  const cycleBadgePrimary = `${daysLeft}d`
  const cycleBadgeSecondary = attemptsLeft > 0 ? `${attemptsLeft}x` : `${hoursLeft}h`

  function handleLeavePrompt() {
    setLeaveError('')
    setLeavingConfirm(true)
  }

  function handleCancelLeave() {
    if (leaving) return
    setLeaveError('')
    setLeavingConfirm(false)
  }

  async function handleConfirmLeave() {
    if (leaving) return
    setLeaveError('')
    setLeaving(true)
    try {
      await signOut()
      window.location.reload()
    } catch (err) {
      console.error('leave failed:', err)
      setLeaveError('Sign out failed. Please try again.')
      setLeaving(false)
    }
  }

  async function handleStartDelete() {
    profileScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    if (deleteStep === 'deleting' || deleteStep === 'deleted') return
    setDeleteStep('deleting')
    const result = await deleteAccount()
    if (result.success) {
      setDeleteStep('deleted')
      try {
        localStorage.removeItem('ds_last_overlay')
      } catch {}
      setTimeout(() => window.location.replace('/'), 1800)
    } else {
      setDeleteError(result.error || 'Something went wrong.'); setDeleteStep('exported')
    }
  }

  async function regenerateAvatar() {
    if (regenLoading || attemptsLeft <= 0) return
    setRegenError('')
    try {
      setRegenLoading(true); setShowRegenInput(false)
      // If there's no existing avatar but we have the original description, generate fresh
      const hasExistingAvatar = Boolean(currentAvatarUrl)
      const requestBody = !hasExistingAvatar && avatarPromptPending
        ? { answers: { 0: avatarPromptPending }, feedback: regenFeedback || undefined, mode: 'create', identityDescription: avatarPromptPending || undefined }
        : {
            answers: { 0: bioState, 1: askState },
            feedback: regenFeedback,
            mode: 'reimagine',
            previousImageUrl: currentAvatarUrl || undefined,
            editCurrentAvatar: editCurrentAvatar && !forceNewAvatar,
            forceNewAvatar,
            identityDescription: avatarPromptPending || undefined,
          }
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

      const newCount = cycleNumber * 10 + (localRegenCount + 1)
      const previousAvatar = currentAvatarUrl
      setCurrentAvatarUrl(data.imageUrl)
      setRegenCount(newCount)
      setRegenFeedback('')
      setEditCurrentAvatar(true)
      setForceNewAvatar(false)
      setRegenLoading(false)
      rememberAvatar(data.imageUrl, previousAvatar ? [previousAvatar] : [])

      // ── Upload to Storage in the background ──
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const permanentUrl = await uploadAvatarToStorage(data.imageUrl, user.id)
      // Append cache-buster so the browser fetches the new image on next load
      const freshUrl = `${permanentUrl}?t=${Date.now()}`
      // Keep showing the fresh base64 locally — don't swap to the same-path URL
      // (browser would serve cached old image). Update DB + parent with busted URL.
      await updateHub({ avatar_url: freshUrl, regen_count: newCount })
      rememberAvatar(freshUrl)
      onUpdateHub?.({ avatarUrl: freshUrl })
    } catch (err) {
      console.error('Regen failed:', err)
      setRegenError(err instanceof Error ? err.message : 'Something went wrong. Your attempt was not used — try again.')
      setRegenLoading(false)
    }
  }

  async function restoreAvatar(url: string) {
    if (!url || url === currentAvatarUrl || restoringAvatar) return
    try {
      setRestoringAvatar(url)
      setRegenError('')
      setCurrentAvatarUrl(url)
      await updateHub({ avatar_url: url })
      rememberAvatar(url)
      onUpdateHub?.({ avatarUrl: url })
    } catch (err) {
      console.error('Restore avatar failed:', err)
      setRegenError('Could not switch back to that avatar right now.')
    } finally {
      setRestoringAvatar('')
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

  const groupedVisitorBookEntries = Array.from(
    visitorBookEntries.reduce((map, entry) => {
      const key = entry.visitorId || entry.visitorName
      const existing = map.get(key)
      if (!existing) {
        map.set(key, { ...entry, visitCount: 1 })
        return map
      }

      const latestVisitedAt =
        new Date(entry.visitedAt).getTime() > new Date(existing.visitedAt).getTime()
          ? entry.visitedAt
          : existing.visitedAt

      map.set(key, {
        ...existing,
        visitedAt: latestVisitedAt,
        visitCount: existing.visitCount + 1,
        avatarUrl: existing.avatarUrl || entry.avatarUrl,
      })
      return map
    }, new Map<string, VisitorBookEntry & { visitCount: number }>()),
  ).map(([, entry]) => entry)

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
  const sanctumPanels: { id: SanctumPanel; label: string; glyph: string; line: string }[] = [
    { id: 'appearance', label: 'Appearance', glyph: '✦', line: 'Shape the light of your hub.' },
    { id: 'visitors', label: 'Visitors', glyph: '◌', line: 'See who has passed through quietly.' },
    { id: 'settings', label: 'Settings', glyph: '☽', line: 'Keep the rules of your space.' },
    { id: 'share', label: 'Share', glyph: '⌁', line: 'Open a small door for someone else.' },
  ]
  const activePanel = sanctumPanels.find(panel => panel.id === activeSanctumPanel) || sanctumPanels[0]

  return (
    <motion.div ref={profileScrollRef} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg, rgba(2,4,12,0.96), rgba(5,6,18,0.93) 48%, rgba(2,2,8,0.97))', backdropFilter: 'blur(20px)', zIndex: 70, overflowY: 'auto' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 70% 55% at 16% 24%, rgba(${hubGlowRgb},${hubGlowIntensityValue * 0.22}) 0%, transparent 64%), radial-gradient(ellipse 46% 54% at 84% 72%, rgba(${hubGlowRgb},${hubGlowIntensityValue * 0.11}) 0%, transparent 58%), linear-gradient(90deg, rgba(255,255,255,0.025), transparent 42%)` }} />

      {/* ── Ambient hub glow pulse ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <motion.div
          animate={{ opacity: [hubGlowIntensityValue * 0.12, hubGlowIntensityValue * 0.22, hubGlowIntensityValue * 0.12] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '8%', left: '8%', width: '440px', height: '440px', borderRadius: '50%', background: `radial-gradient(circle, rgba(${hubGlowRgb},0.22) 0%, transparent 70%)`, filter: 'blur(72px)', pointerEvents: 'none' }}
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
          <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', background: 'linear-gradient(to right, transparent 78%, rgba(0,0,5,0.82) 100%), linear-gradient(to bottom, rgba(0,0,5,0.14) 0%, transparent 12%, transparent 88%, rgba(0,0,5,0.28) 100%)' }} />

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentAvatarUrl} alt="Avatar"
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: '100%', width: '100%',
                  objectFit: 'contain', objectPosition: 'top center',
                  filter: `brightness(1.06) saturate(0.92) drop-shadow(0 0 20px rgba(${hubGlowRgb},0.28)) drop-shadow(0 0 8px rgba(0,190,255,0.18)) drop-shadow(0 12px 28px rgba(0,0,0,0.28))`,
                  animation: 'holo-flicker 7s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 3,
                  pointerEvents: 'none',
                  background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,200,255,0.018) 3px, rgba(0,200,255,0.018) 4px)',
                  mixBlendMode: 'screen',
                  opacity: 0.45,
                  animation: 'holo-scan 10s linear infinite',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 3,
                  pointerEvents: 'none',
                  background: `linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 18%, transparent 72%, rgba(${hubGlowRgb},0.06) 100%), linear-gradient(90deg, rgba(0,210,255,0.08) 0%, transparent 24%, transparent 78%, rgba(${hubGlowRgb},0.08) 100%)`,
                }}
              />
              <motion.div
                animate={{ opacity: [0.74, 1, 0.74] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', bottom: '14%', left: '50%', transform: 'translateX(-50%)', width: '74%', zIndex: 4, pointerEvents: 'none' }}
              >
                <svg width="100%" viewBox="0 0 200 58" overflow="visible" style={{ display: 'block' }}>
                  <defs>
                    <filter id="php-live-glow-wide" x="-70%" y="-70%" width="240%" height="240%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="7" />
                    </filter>
                    <filter id="php-live-glow-soft" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                    </filter>
                  </defs>
                  <ellipse cx="100" cy="29" rx="95" ry="22" fill="none" stroke={`rgba(${hubGlowRgb},0.42)`} strokeWidth="10" filter="url(#php-live-glow-wide)" />
                  <ellipse cx="100" cy="29" rx="95" ry="22" fill="none" stroke="rgba(0,210,255,0.28)" strokeWidth="5" filter="url(#php-live-glow-soft)" />
                  <ellipse cx="100" cy="29" rx="94" ry="21" fill="none" stroke={`rgba(${hubGlowRgb},0.86)`} strokeWidth="1.2" />
                  <ellipse cx="100" cy="29" rx="79" ry="17" fill="none" stroke={`rgba(${hubGlowRgb},0.32)`} strokeWidth="0.9" strokeDasharray="5 3.5">
                    <animateTransform attributeName="transform" type="rotate" from="0 100 29" to="360 100 29" dur="20s" repeatCount="indefinite" />
                  </ellipse>
                  <ellipse cx="100" cy="29" rx="94" ry="21" fill={`rgba(${hubGlowRgb},0.045)`} />
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', width: '44px', height: '44px', filter: 'drop-shadow(0 0 12px #fffbe6), drop-shadow(0 0 18px #ffe07a), drop-shadow(0 0 24px #00ffe7)' }}>
                  <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
                    <defs>
                      <linearGradient id="soul-neon" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fffbe6" />
                        <stop offset="60%" stopColor="#ffe07a" />
                        <stop offset="100%" stopColor="#00ffe7" />
                      </linearGradient>
                    </defs>
                    <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="4" />
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      fill="none"
                      stroke="url(#soul-neon)"
                      strokeWidth="5"
                      strokeDasharray={`${2 * Math.PI * 18}`}
                      strokeDashoffset={`${2 * Math.PI * 18 * (1 - refreshProgress / 100)}`}
                      strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 10px #ffe07a), drop-shadow(0 0 18px #00ffe7)', opacity: 1 }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '12px', fontWeight: 800, color: '#fffbe6', lineHeight: 1, textShadow: '0 0 10px #ffe07a, 0 0 18px #00ffe7, 0 1px 0 #fff8' }}>{cycleBadgePrimary}</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', fontWeight: 800, color: '#00ffe7', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: '1px', lineHeight: 1, textShadow: '0 0 8px #00ffe7' }}>{cycleBadgeSecondary}</span>
                  </div>
                </div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.25em', color: '#00ffe7', textTransform: 'uppercase', textShadow: '0 0 10px #ffe07a, 0 0 18px #00ffe7, 0 1px 0 #fff8' }}>
                  Soul Cycle
                </p>
              </div>
              <button onClick={() => setShowRegenInput(v => !v)} disabled={regenLoading || attemptsLeft <= 0}
                style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: attemptsLeft > 0 ? 'rgba(201,168,76,0.7)' : 'rgba(255,255,255,0.28)', padding: '6px 12px', border: `1px solid ${attemptsLeft > 0 ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.12)'}`, background: 'transparent', cursor: attemptsLeft > 0 ? 'pointer' : 'default', textTransform: 'uppercase', borderRadius: '4px' }}
                onMouseEnter={e => {
                  if (attemptsLeft <= 0) return
                  e.currentTarget.style.color = '#c9a84c'
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = attemptsLeft > 0 ? 'rgba(201,168,76,0.7)' : 'rgba(255,255,255,0.28)'
                  e.currentTarget.style.borderColor = attemptsLeft > 0 ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.12)'
                }}>
                ✦ Reimagine{attemptsLeft > 0 ? ` · ${attemptsLeft} left` : ''}
              </button>
              {attemptsLeft <= 0 && (
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.46)' }}>
                  Your 20-day reimagines are used. The next one opens in {daysLeft}d {hoursLeft}h. You can still restore any past avatar below for free.
                </p>
              )}
            </div>

            {showRegenInput && attemptsLeft > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '12px' }}>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Tell the mirror what to change. It will edit your current avatar by default. Describe a completely new avatar only if you want a full replacement.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '10px', alignItems: 'start' }}>
                  <textarea
                    value={regenFeedback}
                    onChange={e => setRegenFeedback(e.target.value)}
                    placeholder="Describe exactly what you want the mirror to create or change..."
                    rows={5}
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(201,168,76,0.24)',
                      borderRadius: '10px',
                      color: 'rgba(255,255,255,0.92)',
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: '18px',
                      lineHeight: 1.55,
                      padding: '16px 18px',
                      outline: 'none',
                      caretColor: '#c9a84c',
                      resize: 'vertical',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                    }}
                  />
                  <button onClick={() => void regenerateAvatar()} disabled={regenLoading}
                    style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: '#c9a84c', padding: '14px 18px', border: '1px solid rgba(201,168,76,0.35)', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', borderRadius: '10px', whiteSpace: 'nowrap', minHeight: '52px' }}>
                    Reimagine ✦
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.62)', fontFamily: "'EB Garamond', serif", fontSize: '14px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editCurrentAvatar}
                      onChange={e => {
                        const checked = e.target.checked
                        setEditCurrentAvatar(checked)
                        if (checked) setForceNewAvatar(false)
                      }}
                      style={{ accentColor: '#c9a84c' }}
                    />
                    Edit this avatar
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.62)', fontFamily: "'EB Garamond', serif", fontSize: '14px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={forceNewAvatar}
                      onChange={e => {
                        const checked = e.target.checked
                        setForceNewAvatar(checked)
                        if (checked) setEditCurrentAvatar(false)
                        if (!checked && !editCurrentAvatar) setEditCurrentAvatar(true)
                      }}
                      style={{ accentColor: '#c9a84c' }}
                    />
                    Create a completely new avatar
                  </label>
                </div>
                {regenError && (
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(220,100,100,0.85)', marginTop: '8px' }}>{regenError}</p>
                )}
              </motion.div>
            )}

            {avatarHistory.length > 1 && (
              <div style={{ marginTop: '18px' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.34)', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Past Avatars
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: '10px' }}>
                  {avatarHistory.map((url, index) => {
                    const isCurrent = url === currentAvatarUrl;
                    const isBusy = Boolean(restoringAvatar);
                    return (
                      <div
                        key={`${url}-${index}`}
                        style={{
                          position: 'relative',
                          background: isCurrent ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isCurrent ? 'rgba(201,168,76,0.44)' : 'rgba(255,255,255,0.12)'}`,
                          borderRadius: '8px',
                          padding: '6px',
                          textAlign: 'center',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={isCurrent ? 'Current avatar' : `Saved avatar ${index + 1}`}
                          style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: '6px', display: 'block' }}
                        />
                        <span style={{ display: 'block', marginTop: '6px', fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.12em', color: isCurrent ? '#c9a84c' : 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                          {isCurrent ? 'Current' : restoringAvatar === url ? 'Switching...' : 'Use This'}
                        </span>
                        {/* Delete button, top right */}
                        <button
                          onClick={() => handleDeleteAvatar(url)}
                          title="Delete this avatar"
                          disabled={isCurrent || isBusy}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            background: 'rgba(32,28,12,0.82)',
                            border: '1px solid rgba(201,168,76,0.22)',
                            color: '#c9a84c',
                            borderRadius: '50%',
                            width: 22,
                            height: 22,
                            fontSize: 13,
                            fontFamily: "'Cinzel', serif",
                            cursor: isCurrent || isBusy ? 'not-allowed' : 'pointer',
                            opacity: 0.82,
                            transition: 'opacity 0.2s',
                            zIndex: 2,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0.82')}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
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

          <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)', marginBottom: '18px' }} />

          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.42em', color: `rgba(${hubGlowRgb},0.62)`, textTransform: 'uppercase', marginBottom: '8px' }}>Sanctum</p>
            <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.46)', lineHeight: 1.6, marginBottom: '14px' }}>{activePanel.line}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
            {sanctumPanels.map(tab => {
              const isSelected = activeSanctumPanel === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSanctumPanel(tab.id)}
                  style={{
                    minWidth: 0,
                    fontFamily: "'Cinzel', serif",
                    fontSize: '8px',
                    letterSpacing: '0.16em',
                    color: isSelected ? '#c9a84c' : 'rgba(255,255,255,0.48)',
                    padding: '10px 8px',
                    border: `1px solid ${isSelected ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    background: isSelected ? `linear-gradient(180deg, rgba(${hubGlowRgb},0.12), rgba(255,255,255,0.025))` : 'rgba(255,255,255,0.018)',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    borderRadius: '6px',
                    boxShadow: isSelected ? `0 0 24px rgba(${hubGlowRgb},0.11)` : 'none',
                  }}
                >
                  <span style={{ display: 'block', fontSize: '12px', marginBottom: '4px', opacity: isSelected ? 0.9 : 0.45 }}>{tab.glyph}</span>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.label}</span>
                </button>
              )
            })}
            </div>
          </div>

          <motion.div
            key={activeSanctumPanel}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            style={{ marginBottom: '32px', padding: '20px', border: '1px solid rgba(255,255,255,0.085)', borderRadius: '8px', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.018))', boxShadow: '0 22px 80px rgba(0,0,0,0.2)' }}
          >

          {/* ── Hub Appearance ── */}
          {activeSanctumPanel === 'appearance' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.34em', color: 'rgba(201,168,76,0.72)', textTransform: 'uppercase', marginBottom: '5px' }}>Hub Appearance</p>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.46)', margin: 0 }}>{hubStyleDef.label} · {hubTheme?.label || 'Gold'} · {HUB_DECORATIONS.find(d => d.id === selectedDecoration)?.label || 'None'} · {HUB_GLOW_LEVELS.find(g => g.id === selectedGlowIntensity)?.label || 'Normal'}</p>
              </div>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: `1px solid rgba(${hubGlowRgb},0.42)`, background: `radial-gradient(circle, rgba(${hubGlowRgb},0.18), rgba(255,255,255,0.02) 68%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 28px rgba(${hubGlowRgb},0.16)`, flexShrink: 0 }}>
                <span style={{ fontSize: '22px', filter: `drop-shadow(0 0 8px rgba(${hubGlowRgb},0.55))` }}>{centerpiece.symbol}</span>
              </div>
            </div>

            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.24em', color: 'rgba(255,255,255,0.36)', textTransform: 'uppercase', marginBottom: '10px' }}>Structure</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(82px, 1fr))', gap: '7px', marginBottom: '22px' }}>
              {HUB_STYLES.map(style => {
                const isSelected = selectedHubStyle === style.id
                return (
                  <button key={style.id}
                    title={style.desc}
                    onClick={() => setSelectedHubStyle(style.id)}
                    style={{ minHeight: '74px', textAlign: 'center', padding: '10px 6px', borderRadius: '6px', border: isSelected ? '1px solid rgba(201,168,76,0.58)' : '1px solid rgba(255,255,255,0.085)', background: isSelected ? `linear-gradient(180deg, rgba(${hubGlowRgb},0.12), rgba(201,168,76,0.045))` : 'rgba(255,255,255,0.018)', cursor: 'pointer', transition: 'all 0.18s', boxShadow: isSelected ? `inset 0 0 0 1px rgba(255,255,255,0.035), 0 0 18px rgba(${hubGlowRgb},0.12)` : 'none' }}>
                    <span style={{ display: 'block', fontSize: '18px', marginBottom: '7px', opacity: isSelected ? 1 : 0.56 }}>{style.icon}</span>
                    <span style={{ display: 'block', fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.11em', color: isSelected ? '#c9a84c' : 'rgba(255,255,255,0.54)', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{style.label}</span>
                  </button>
                )
              })}
            </div>

            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.24em', color: 'rgba(255,255,255,0.36)', textTransform: 'uppercase', marginBottom: '10px' }}>Color</p>
            <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap', marginBottom: '22px' }}>
              {HUB_COLOR_THEMES.map(theme => {
                const isSelected = selectedHubColor === theme.id
                return (
                  <button key={theme.id}
                    title={theme.label}
                    onClick={() => setSelectedHubColor(theme.id)}
                    style={{ width: '34px', height: '34px', borderRadius: '50%', padding: '4px', border: isSelected ? '1px solid rgba(201,168,76,0.78)' : '1px solid rgba(255,255,255,0.12)', background: isSelected ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.025)', cursor: 'pointer', boxShadow: isSelected ? `0 0 18px rgba(${theme.glow},0.24)` : 'none' }}>
                    <span style={{ display: 'block', width: '100%', height: '100%', borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.88), ${theme.ring})`, boxShadow: `0 0 10px rgba(${theme.glow},0.22)` }} />
                  </button>
                )
              })}
            </div>

            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.24em', color: 'rgba(255,255,255,0.36)', textTransform: 'uppercase', marginBottom: '10px' }}>Decoration</p>
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '22px' }}>
              {HUB_DECORATIONS.map(dec => {
                const isSelected = selectedDecoration === dec.id
                return (
                  <button key={dec.id}
                    onClick={() => setSelectedDecoration(dec.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 10px', borderRadius: '999px', border: isSelected ? '1px solid rgba(201,168,76,0.52)' : '1px solid rgba(255,255,255,0.09)', background: isSelected ? 'rgba(201,168,76,0.09)' : 'rgba(255,255,255,0.018)', cursor: 'pointer', transition: 'all 0.18s' }}>
                    <span style={{ fontSize: '13px', opacity: isSelected ? 1 : 0.55 }}>{dec.icon}</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.12em', textTransform: 'uppercase', color: isSelected ? '#c9a84c' : 'rgba(255,255,255,0.54)', whiteSpace: 'nowrap' }}>{dec.label}</span>
                  </button>
                )
              })}
            </div>

            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.24em', color: 'rgba(255,255,255,0.36)', textTransform: 'uppercase', marginBottom: '10px' }}>Glow</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '7px', marginBottom: '20px' }}>
              {HUB_GLOW_LEVELS.map(glow => {
                const isSelected = selectedGlowIntensity === glow.id
                return (
                  <button key={glow.id}
                    title={glow.desc}
                    onClick={() => setSelectedGlowIntensity(glow.id)}
                    style={{ minWidth: 0, padding: '10px 8px', borderRadius: '6px', border: isSelected ? '1px solid rgba(201,168,76,0.52)' : '1px solid rgba(255,255,255,0.09)', background: isSelected ? 'rgba(201,168,76,0.09)' : 'rgba(255,255,255,0.018)', cursor: 'pointer', transition: 'all 0.18s', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: isSelected ? '#c9a84c' : 'rgba(255,255,255,0.58)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{glow.label}</span>
                    <span style={{ display: 'block', width: '46px', maxWidth: '80%', height: '2px', margin: '8px auto 0', borderRadius: '999px', background: `rgba(${hubGlowRgb},${glow.id === 'dim' ? 0.22 : glow.id === 'normal' ? 0.42 : 0.72})`, boxShadow: `0 0 ${glow.id === 'dim' ? 6 : glow.id === 'normal' ? 10 : 16}px rgba(${hubGlowRgb},0.45)` }} />
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
          )}

          {activeSanctumPanel === 'visitors' && (
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '18px' }}>
                {visitorBookLoading ? (
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Gathering recent visitors...</p>
                ) : visitorBookError ? (
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(220,100,100,0.85)' }}>{visitorBookError}</p>
                ) : groupedVisitorBookEntries.length === 0 ? (
                  <div style={{ padding: '18px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                    <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.55)', margin: 0 }}>No one has signed the quiet yet.</p>
                  </div>
                ) : groupedVisitorBookEntries.map((entry) => (
                  <div key={entry.visitorId || entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', padding: '16px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                      {entry.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.avatarUrl} alt={entry.visitorName} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(201,168,76,0.22)' }} />
                      ) : (
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(201,168,76,0.55)', fontSize: '14px' }}>✦</div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.82)', textTransform: 'uppercase', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.visitorName}</p>
                          {entry.visitCount > 1 && (
                            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.16em', color: 'rgba(201,168,76,0.72)', textTransform: 'uppercase' }}>
                              {entry.visitCount}x
                            </span>
                          )}
                        </div>
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
          )}

          {activeSanctumPanel === 'settings' && (
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
          )}

          {activeSanctumPanel === 'share' && (
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
          )}

          </motion.div>

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
                  <button onClick={() => void handleConfirmLeave()} disabled={leaving}
                    style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.9)', padding: '7px 14px', border: '1px solid rgba(201,168,76,0.4)', background: 'transparent', cursor: leaving ? 'default' : 'pointer', textTransform: 'uppercase', borderRadius: '2px', opacity: leaving ? 0.6 : 1 }}>
                    {leaving ? 'Signing out...' : 'Yes, sign out'}
                  </button>
                  <button onClick={handleCancelLeave} disabled={leaving}
                    style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', padding: '7px 14px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: leaving ? 'default' : 'pointer', textTransform: 'uppercase', borderRadius: '2px', opacity: leaving ? 0.45 : 1 }}>
                    Stay
                  </button>
                  {leaveError && (
                    <p style={{ width: '100%', fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(220,100,100,0.85)', margin: '0' }}>{leaveError}</p>
                  )}
                </div>
              ) : (
                <button onClick={handleLeavePrompt}
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
