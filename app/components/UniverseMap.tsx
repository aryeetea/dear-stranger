'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAllHubs } from '../lib/auth'

const PORTAL_COLORS = [
  { ring: '#8b6fc0', glow: '130,80,200', inner: '#4a2a7a' },
  { ring: '#6faa88', glow: '80,160,120', inner: '#2a5a40' },
  { ring: '#aa6f6f', glow: '180,80,80', inner: '#6a2a2a' },
  { ring: '#6f8faa', glow: '80,120,180', inner: '#2a4a6a' },
  { ring: '#aa8f5a', glow: '180,140,60', inner: '#6a5a20' },
  { ring: '#8f5aaa', glow: '140,60,180', inner: '#4a1a6a' },
  { ring: '#5a8faa', glow: '60,130,180', inner: '#1a4a6a' },
  { ring: '#aa8f6f', glow: '180,140,80', inner: '#6a5a30' },
]

const MY_PORTAL = { ring: '#c9a84c', glow: '201,168,76', inner: '#6a4a10' }

const STYLE_PORTAL_MAP: Record<string, { ring: string; glow: string; inner: string }> = {
  fantasy: { ring: '#9b7cff', glow: '155,124,255', inner: '#36215f' },
  modern: { ring: '#d7dbe6', glow: '215,219,230', inner: '#3a4150' },
  'fantasy modern': { ring: '#c99cff', glow: '201,156,255', inner: '#44305f' },
  celestial: { ring: '#9fd6ff', glow: '159,214,255', inner: '#203a5c' },
  royal: { ring: '#f0c96b', glow: '240,201,107', inner: '#5a4315' },
  streetwear: { ring: '#ff8c6b', glow: '255,140,107', inner: '#5a2c20' },
  futuristic: { ring: '#6cf0ff', glow: '108,240,255', inner: '#173f47' },
  'nature inspired': { ring: '#87d68d', glow: '135,214,141', inner: '#23452b' },
}

interface Hub {
  x: number
  y: number
  name: string
  bio: string
  askAbout?: string
  avatarUrl?: string
  online: boolean
  pulse: number
  size: number
  isMe?: boolean
  floatOffset: number
  floatSpeed: number
  colorVariant: number
  avatarImage?: HTMLImageElement
  styleLabel?: string
  styleDesc?: string
}

interface TooltipState {
  hub: Hub
  sx: number
  sy: number
}

interface ProfileState {
  hub: Hub
}

const imageCache = new Map<string, HTMLImageElement>()

function loadImage(url: string): Promise<HTMLImageElement> {
  if (imageCache.has(url)) return Promise.resolve(imageCache.get(url)!)

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageCache.set(url, img)
      resolve(img)
    }
    img.onerror = () => resolve(img)
    img.src = url
  })
}

function getPortalColorsFromStyle(styleLabel?: string, isMe?: boolean, fallbackVariant?: number) {
  if (isMe) return MY_PORTAL
  if (!styleLabel) return PORTAL_COLORS[(fallbackVariant || 0) % PORTAL_COLORS.length]

  const normalized = styleLabel.trim().toLowerCase()
  return STYLE_PORTAL_MAP[normalized] || PORTAL_COLORS[(fallbackVariant || 0) % PORTAL_COLORS.length]
}

function drawPortal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  colors: typeof MY_PORTAL,
  t: number,
  online: boolean,
  isMe: boolean,
  avatarImage?: HTMLImageElement,
) {
  const r = 28 * s
  const pulse = 0.85 + 0.15 * Math.sin(t * (isMe ? 1.2 : 0.8))

  const auraR = r * 2.2 * pulse
  const aura = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, auraR)
  aura.addColorStop(0, `rgba(${colors.glow},${isMe ? 0.18 : 0.1})`)
  aura.addColorStop(1, `rgba(${colors.glow},0)`)
  ctx.beginPath()
  ctx.arc(cx, cy, auraR, 0, Math.PI * 2)
  ctx.fillStyle = aura
  ctx.fill()

  if (isMe || online) {
    for (let i = 0; i < (isMe ? 8 : 5); i++) {
      const angle = (i / (isMe ? 8 : 5)) * Math.PI * 2 + t * (isMe ? 0.6 : 0.4)
      const px = cx + Math.cos(angle) * r * 1.25
      const py = cy + Math.sin(angle) * r * 1.25
      const pa = 0.3 + 0.4 * Math.sin(t * 2 + i)
      ctx.beginPath()
      ctx.arc(px, py, 1.5 * s, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${colors.glow},${pa})`
      ctx.fill()
    }
  }

  const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.9)
  innerGrad.addColorStop(0, `rgba(${colors.glow},0.08)`)
  innerGrad.addColorStop(0.6, colors.inner + 'cc')
  innerGrad.addColorStop(1, '#020308')
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2)
  ctx.fillStyle = innerGrad
  ctx.fill()

  if (avatarImage && avatarImage.complete && avatarImage.naturalWidth > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(avatarImage, cx - r * 0.88, cy - r * 0.88, r * 1.76, r * 1.76)
    ctx.restore()
  } else {
    ctx.font = `${Math.max(10, 14 * s)}px serif`
    ctx.fillStyle = `rgba(${colors.glow},${0.5 + 0.3 * Math.sin(t * 1.5)})`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('✦', cx, cy)
    ctx.textBaseline = 'alphabetic'
  }

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = colors.ring
  ctx.lineWidth = 2.5 * s * pulse
  ctx.globalAlpha = 0.9
  ctx.stroke()
  ctx.globalAlpha = 1

  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${colors.glow},0.35)`
  ctx.lineWidth = 1 * s
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${colors.glow},${0.3 * pulse})`
  ctx.lineWidth = 6 * s * pulse
  ctx.globalAlpha = 0.6
  ctx.stroke()
  ctx.globalAlpha = 1

  if (!isMe) {
    const dotX = cx + r * 0.7
    const dotY = cy - r * 0.7
    ctx.beginPath()
    ctx.arc(dotX, dotY, 3 * s, 0, Math.PI * 2)
    ctx.fillStyle = online ? '#7ecf7e' : 'rgba(255,255,255,0.2)'
    if (online) {
      const dotGlow = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 6 * s)
      dotGlow.addColorStop(0, 'rgba(126,207,126,0.8)')
      dotGlow.addColorStop(1, 'rgba(126,207,126,0)')
      ctx.fillStyle = dotGlow
      ctx.beginPath()
      ctx.arc(dotX, dotY, 6 * s, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(dotX, dotY, 3 * s, 0, Math.PI * 2)
      ctx.fillStyle = '#7ecf7e'
    }
    ctx.fill()
  }

  if (isMe) {
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + t * 0.5
      const sparkR = r * 1.5
      const sparkX = cx + Math.cos(angle) * sparkR
      const sparkY = cy + Math.sin(angle) * sparkR
      const sa = 0.4 + 0.5 * Math.sin(t * 2.2 + i * 1.4)
      ctx.font = `${Math.max(7, 9 * s)}px serif`
      ctx.fillStyle = `rgba(201,168,76,${sa})`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('✦', sparkX, sparkY)
      ctx.textBaseline = 'alphabetic'
    }
  }
}

export default function UniverseMap({
  hubName,
  hubAvatarUrl,
  selectedStyle,
  onWriteLetter,
  onObservatory,
  onProfile,
}: {
  hubName?: string
  hubAvatarUrl?: string
  selectedStyle?: {
    label?: string
    desc?: string
  }
  onWriteLetter?: (recipientName?: string) => void
  onObservatory?: () => void
  onProfile?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hubsRef = useRef<Hub[]>([])
  const offsetRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const isDraggingRef = useRef(false)
  const hasDraggedRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const animFrameRef = useRef<number>(0)

  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [profile, setProfile] = useState<ProfileState | null>(null)
  const [activeNav, setActiveNav] = useState(0)
  const [hoveredNav, setHoveredNav] = useState<number | null>(null)

  useEffect(() => {
    let resizeHandler: (() => void) | undefined

    async function init() {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      resizeHandler = () => {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        offsetRef.current = { x: canvas.width / 2, y: canvas.height / 2 }
      }
      resizeHandler()
      window.addEventListener('resize', resizeHandler)

      const realHubs = await getAllHubs()
      const myAvatarImg = hubAvatarUrl ? await loadImage(hubAvatarUrl) : undefined

      const otherHubs = await Promise.all(
        realHubs.map(async (hub: any, i: number) => {
          const angle = (i / Math.max(realHubs.length, 1)) * Math.PI * 2 + Math.random() * 0.5
          const dist = 180 + Math.random() * 320
          const avatarImg = hub.avatar_url ? await loadImage(hub.avatar_url) : undefined
          return {
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            name: hub.hub_name,
            bio: hub.bio || '',
            askAbout: hub.ask_about || '',
            avatarUrl: hub.avatar_url || '',
            avatarImage: avatarImg,
            styleLabel: hub.avatar_style_label || 'Unknown',
            styleDesc: hub.avatar_style_desc || '',
            online: hub.online ?? true,
            pulse: Math.random() * Math.PI * 2,
            size: 0.9 + Math.random() * 0.3,
            floatOffset: Math.random() * Math.PI * 2,
            floatSpeed: 0.4 + Math.random() * 0.3,
            colorVariant: i % PORTAL_COLORS.length,
          } as Hub
        })
      )

      hubsRef.current = [
        {
          x: 0,
          y: 0,
          name: hubName || 'Your Hub',
          bio: 'This is your place in the universe.',
          avatarUrl: hubAvatarUrl || '',
          avatarImage: myAvatarImg,
          styleLabel: selectedStyle?.label || 'Unknown',
          styleDesc: selectedStyle?.desc || '',
          online: true,
          pulse: 0,
          size: 1.2,
          isMe: true,
          floatOffset: 0,
          floatSpeed: 0.5,
          colorVariant: 0,
        },
        ...otherHubs,
      ]

      const starCanvas = document.createElement('canvas')
      starCanvas.width = canvas.width
      starCanvas.height = canvas.height
      const sCtx = starCanvas.getContext('2d')
      if (!sCtx) return

      const sc = Math.floor((canvas.width * canvas.height) / 2600)
      for (let i = 0; i < sc; i++) {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        sCtx.beginPath()
        sCtx.arc(x, y, Math.random() * 1.1, 0, Math.PI * 2)
        sCtx.fillStyle = `rgba(255,255,255,${Math.random() * 0.55 + 0.08})`
        sCtx.fill()
      }

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(starCanvas, 0, 0)
        const t = Date.now() * 0.001
        const offset = offsetRef.current
        const scale = scaleRef.current

        hubsRef.current.forEach(hub => {
          const sx = offset.x + hub.x * scale
          const sy = offset.y + hub.y * scale
          if (sx < -200 || sx > canvas.width + 200 || sy < -200 || sy > canvas.height + 200) return
          const floatY = Math.sin(t * hub.floatSpeed + hub.floatOffset) * 4
          const s = hub.size * scale
          const colors = getPortalColorsFromStyle(hub.styleLabel, !!hub.isMe, hub.colorVariant)
          ctx.save()
          drawPortal(ctx, sx, sy + floatY, s, colors, t, hub.online, !!hub.isMe, hub.avatarImage)
          ctx.restore()
        })

        animFrameRef.current = requestAnimationFrame(draw)
      }

      draw()
    }

    void init()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      if (resizeHandler) window.removeEventListener('resize', resizeHandler)
    }
  }, [hubName, hubAvatarUrl, selectedStyle])

  const getHubAt = useCallback((mx: number, my: number): Hub | null => {
    const scale = scaleRef.current
    const offset = offsetRef.current
    let found: Hub | null = null
    hubsRef.current.forEach(hub => {
      const sx = offset.x + hub.x * scale
      const sy = offset.y + hub.y * scale
      const r = 28 * hub.size * scale
      const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2)
      if (dist < r * 1.3) found = hub
    })
    return found
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    hasDraggedRef.current = false
    dragStartRef.current = { x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = Math.abs(e.clientX - (dragStartRef.current.x + offsetRef.current.x))
    const dy = Math.abs(e.clientY - (dragStartRef.current.y + offsetRef.current.y))
    if (isDraggingRef.current && (dx > 4 || dy > 4)) {
      hasDraggedRef.current = true
      offsetRef.current = { x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y }
      setTooltip(null)
      return
    }
    if (!isDraggingRef.current) {
      const hub = getHubAt(e.clientX, e.clientY)
      if (hub) {
        setTooltip({
          hub,
          sx: offsetRef.current.x + hub.x * scaleRef.current,
          sy: offsetRef.current.y + hub.y * scaleRef.current,
        })
      } else {
        setTooltip(null)
      }
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!hasDraggedRef.current) {
      const hub = getHubAt(e.clientX, e.clientY)
      if (hub) {
        setProfile({ hub })
        setTooltip(null)
      } else {
        setProfile(null)
      }
    }
    isDraggingRef.current = false
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    scaleRef.current = Math.min(3.5, Math.max(0.25, scaleRef.current * (e.deltaY > 0 ? 0.88 : 1.12)))
  }

  const navItems = [
    { label: 'Starmap', icon: '✦' },
    { label: 'Scribe', icon: '✒' },
    { label: 'Observatory', icon: '⟡' },
    { label: 'Profile', icon: '◎' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#04050f' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 40% at 15% 25%, rgba(50,20,100,0.28) 0%, transparent 65%), radial-gradient(ellipse 50% 55% at 82% 72%, rgba(15,28,90,0.22) 0%, transparent 65%)' }} />

      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, cursor: 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          isDraggingRef.current = false
          setTooltip(null)
        }}
        onWheel={handleWheel}
      />

      <AnimatePresence>
        {tooltip && !profile && (
          <motion.div
            key="tip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              left: tooltip.sx,
              top: tooltip.sy - tooltip.hub.size * scaleRef.current * 48,
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              zIndex: 60,
            }}
          >
            <div style={{ background: 'rgba(8,10,28,0.9)', border: `1px solid ${tooltip.hub.isMe ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '20px', padding: '6px 16px', backdropFilter: 'blur(12px)', boxShadow: tooltip.hub.isMe ? '0 0 14px rgba(201,168,76,0.25)' : '0 4px 16px rgba(0,0,0,0.6)' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.18em', color: tooltip.hub.isMe ? '#c9a84c' : 'rgba(255,255,255,0.78)', whiteSpace: 'nowrap' }}>
                {tooltip.hub.name}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profile && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '20px', background: 'rgba(0,0,5,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setProfile(null)}
          >
            <motion.div
              onClick={e => e.stopPropagation()}
              style={{ background: 'rgba(8,10,28,0.9)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px', width: 'min(780px, 95vw)', minHeight: '420px', display: 'flex', overflow: 'hidden', boxShadow: '0 0 80px rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)', position: 'relative' }}
            >
              <div style={{ width: '45%', minHeight: '420px', background: 'linear-gradient(135deg, rgba(20,25,60,0.9), rgba(10,15,40,0.95))', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ position: 'absolute', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,140,255,0.12) 0%, transparent 70%)', border: '1px solid rgba(150,180,255,0.1)' }} />
                <div style={{ width: '200px', height: '280px', borderRadius: '8px', background: 'linear-gradient(180deg, rgba(60,80,160,0.4), rgba(20,30,80,0.6))', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', position: 'relative', zIndex: 2, boxShadow: '0 0 30px rgba(100,140,255,0.12)', overflow: 'hidden' }}>
                  {profile.hub.avatarUrl ? (
                    <img src={profile.hub.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                  ) : '✦'}
                </div>
                {[...Array(12)].map((_, i) => (
                  <div key={i} style={{ position: 'absolute', width: '2px', height: '2px', borderRadius: '50%', background: 'rgba(255,255,255,0.35)', left: `${10 + Math.random() * 80}%`, top: `${5 + Math.random() * 90}%` }} />
                ))}
              </div>

              <div style={{ flex: 1, padding: 'clamp(24px,4vw,40px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(16px,2.5vw,22px)', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.92)', marginBottom: '6px' }}>
                    {profile.hub.name}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: profile.hub.online ? '#7ecf7e' : 'rgba(255,255,255,0.2)', boxShadow: profile.hub.online ? '0 0 6px rgba(126,207,126,0.6)' : 'none' }} />
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: profile.hub.online ? 'rgba(126,207,126,0.7)' : 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
                      {profile.hub.online ? 'online' : 'away'}
                    </span>
                  </div>

                  {profile.hub.styleLabel && (
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Style
                      </p>
                      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '15px', color: 'rgba(255,255,255,0.6)', marginBottom: profile.hub.styleDesc ? '4px' : '0' }}>
                        {profile.hub.styleLabel}
                      </p>
                      {profile.hub.styleDesc && (
                        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.5 }}>
                          {profile.hub.styleDesc}
                        </p>
                      )}
                    </div>
                  )}

                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Bio
                    </p>
                    <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(13px,1.8vw,15px)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                      {profile.hub.bio}
                    </p>
                  </div>

                  {!profile.hub.isMe && profile.hub.askAbout && (
                    <div>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Ask me about
                      </p>
                      <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(13px,1.8vw,15px)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                        {profile.hub.askAbout}
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '28px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setProfile(null)}
                    style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.35)', padding: '10px 18px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }}
                  >
                    ✦ Dismiss
                  </button>

                  {!profile.hub.isMe && (
                    <button
                      onClick={() => {
                        setProfile(null)
                        onWriteLetter?.(profile.hub.name)
                      }}
                      style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(201,168,76,0.8)', padding: '10px 18px', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '4px', background: 'rgba(201,168,76,0.05)', cursor: 'pointer', textTransform: 'uppercase' }}
                    >
                      ✦ Send Shooting Star
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => setProfile(null)}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', fontSize: '18px', cursor: 'pointer' }}
              >
                ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px', background: 'rgba(8,10,28,0.82)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', backdropFilter: 'blur(20px)', padding: '8px 12px', boxShadow: '0 4px 40px rgba(0,0,0,0.6)', zIndex: 50 }}
      >
        {navItems.map((item, i) => (
          <button
            key={item.label}
            onClick={() => {
              setActiveNav(i)
              if (i === 1) onWriteLetter?.()
              if (i === 2) onObservatory?.()
              if (i === 3) onProfile?.()
            }}
            onMouseEnter={() => setHoveredNav(i)}
            onMouseLeave={() => setHoveredNav(null)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '10px 18px', background: activeNav === i ? 'rgba(201,168,76,0.1)' : hoveredNav === i ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none', borderRadius: '10px', cursor: 'pointer', minWidth: '64px' }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1, color: activeNav === i ? '#c9a84c' : 'rgba(255,255,255,0.55)', filter: activeNav === i ? 'drop-shadow(0 0 6px rgba(201,168,76,0.5))' : 'none' }}>
              {item.icon}
            </span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: activeNav === i ? 'rgba(201,168,76,0.8)' : 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
          </button>
        ))}
      </motion.nav>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        style={{ position: 'fixed', top: '28px', left: '50%', transform: 'translateX(-50%)', fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.16)', letterSpacing: '0.08em', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 50 }}
      >
        drag to explore · scroll to zoom
      </motion.p>
    </div>
  )
}