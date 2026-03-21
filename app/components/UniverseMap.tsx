'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAllHubs } from '../lib/auth'

const HOUSE_VARIANTS = [
  { wall: '#4a3a6b', roof: '#2d1f4a', trim: '#8b6fc0', window: '#ffd88a' },
  { wall: '#3a5a4a', roof: '#1f3a2d', trim: '#6faa88', window: '#aadeff' },
  { wall: '#5a3a3a', roof: '#3a1f1f', trim: '#aa6f6f', window: '#ffd8a0' },
  { wall: '#3a4a5a', roof: '#1f2d3a', trim: '#6f8faa', window: '#c8eeff' },
  { wall: '#5a4a2a', roof: '#3a2d10', trim: '#aa8f5a', window: '#ffe0a0' },
  { wall: '#4a2a5a', roof: '#2d1040', trim: '#8f5aaa', window: '#e8c8ff' },
  { wall: '#2a4a5a', roof: '#102838', trim: '#5a8faa', window: '#b8f0ff' },
  { wall: '#5a4a3a', roof: '#382d1a', trim: '#aa8f6f', window: '#ffecc8' },
]

const MY_HOUSE = { wall: '#3a2a0a', roof: '#1a1000', trim: '#c9a84c', window: '#ffd060' }

interface Hub {
  x: number
  y: number
  name: string
  bio: string
  askAbout?: string
  online: boolean
  pulse: number
  size: number
  isMe?: boolean
  floatOffset: number
  floatSpeed: number
  houseVariant: number
}

interface TooltipState { hub: Hub; sx: number; sy: number }
interface ProfileState { hub: Hub }

function shadeColor(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount))
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount))
  return `rgb(${r},${g},${b})`
}

function hexToRgb(hex: string): string {
  const num = parseInt(hex.slice(1), 16)
  return `${(num >> 16) & 255},${(num >> 8) & 255},${num & 255}`
}

function drawHouse(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  s: number,
  variant: typeof MY_HOUSE,
  t: number,
  online: boolean,
  isMe: boolean,
) {
  const w = 28 * s, h = 22 * s, rh = 14 * s, dep = 8 * s
  const iw = 44 * s, id = 6 * s

  const shadowGrad = ctx.createRadialGradient(cx, cy + id * 1.5, 0, cx, cy + id * 1.5, iw * 0.8)
  shadowGrad.addColorStop(0, isMe ? 'rgba(201,168,76,0.22)' : 'rgba(80,60,120,0.2)')
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.beginPath()
  ctx.ellipse(cx, cy + id * 1.6, iw * 0.85, id * 0.6, 0, 0, Math.PI * 2)
  ctx.fillStyle = shadowGrad
  ctx.fill()

  ctx.beginPath()
  ctx.ellipse(cx, cy, iw * 0.5, id * 0.3, 0, 0, Math.PI * 2)
  ctx.fillStyle = isMe ? '#8a6b20' : '#2a3a28'
  ctx.fill()

  ctx.beginPath()
  ctx.ellipse(cx, cy - id * 0.06, iw * 0.5, id * 0.25, 0, 0, Math.PI * 2)
  ctx.fillStyle = isMe ? '#c9a84c' : (online ? '#3a6a48' : '#2a3a2a')
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(cx - iw * 0.5, cy)
  ctx.bezierCurveTo(cx - iw * 0.52, cy + id * 0.8, cx - iw * 0.38, cy + id * 1.4, cx - iw * 0.28, cy + id * 1.6)
  ctx.lineTo(cx + iw * 0.28, cy + id * 1.6)
  ctx.bezierCurveTo(cx + iw * 0.38, cy + id * 1.4, cx + iw * 0.52, cy + id * 0.8, cx + iw * 0.5, cy)
  ctx.closePath()
  const ig = ctx.createLinearGradient(cx, cy, cx, cy + id * 1.6)
  ig.addColorStop(0, isMe ? '#6b4a18' : '#3a2e20')
  ig.addColorStop(1, isMe ? '#3a2800' : '#1e1810')
  ctx.fillStyle = ig
  ctx.fill()

  const hy = cy - id * 0.1

  ctx.beginPath()
  ctx.moveTo(cx + w * 0.5, hy - h)
  ctx.lineTo(cx + w * 0.5 + dep * 0.7, hy - h + dep * 0.4)
  ctx.lineTo(cx + w * 0.5 + dep * 0.7, hy + dep * 0.4)
  ctx.lineTo(cx + w * 0.5, hy)
  ctx.closePath()
  ctx.fillStyle = shadeColor(variant.wall, -30)
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(cx - w * 0.5, hy - h)
  ctx.lineTo(cx + w * 0.5, hy - h)
  ctx.lineTo(cx + w * 0.5, hy)
  ctx.lineTo(cx - w * 0.5, hy)
  ctx.closePath()
  ctx.fillStyle = variant.wall
  ctx.fill()

  const dw = w * 0.22, dh = h * 0.48
  ctx.beginPath()
  ctx.roundRect(cx - dw * 0.5, hy - dh, dw, dh, [dw * 0.5, dw * 0.5, 0, 0])
  ctx.fillStyle = shadeColor(variant.wall, -50)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx - dw * 0.5 + dw * 0.7, hy - dh * 0.35, 1.2 * s, 0, Math.PI * 2)
  ctx.fillStyle = variant.trim
  ctx.fill()

  const ws = w * 0.2, wx = cx - w * 0.3, wy = hy - h * 0.75
  const wg = 0.6 + 0.4 * Math.sin(t * 1.5 + 1)
  ctx.beginPath()
  ctx.rect(wx - ws * 0.5, wy - ws * 0.5, ws, ws)
  ctx.fillStyle = variant.trim
  ctx.fill()
  ctx.beginPath()
  ctx.rect(wx - ws * 0.35, wy - ws * 0.35, ws * 0.7, ws * 0.7)
  ctx.fillStyle = `rgba(${hexToRgb(variant.window)},${wg * 0.9})`
  ctx.fill()
  ctx.strokeStyle = variant.trim
  ctx.lineWidth = 0.8 * s
  ctx.beginPath()
  ctx.moveTo(wx, wy - ws * 0.35); ctx.lineTo(wx, wy + ws * 0.35)
  ctx.moveTo(wx - ws * 0.35, wy); ctx.lineTo(wx + ws * 0.35, wy)
  ctx.stroke()

  const wgg = ctx.createRadialGradient(wx, wy, 0, wx, wy, ws * 2)
  wgg.addColorStop(0, `rgba(${hexToRgb(variant.window)},${wg * 0.15})`)
  wgg.addColorStop(1, 'rgba(255,220,100,0)')
  ctx.beginPath()
  ctx.arc(wx, wy, ws * 2, 0, Math.PI * 2)
  ctx.fillStyle = wgg
  ctx.fill()

  const rwx = cx + w * 0.5 + dep * 0.35, rwy = hy - h * 0.65
  ctx.beginPath()
  ctx.rect(rwx - ws * 0.3, rwy - ws * 0.35, ws * 0.55, ws * 0.7)
  ctx.fillStyle = variant.trim
  ctx.fill()
  ctx.beginPath()
  ctx.rect(rwx - ws * 0.18, rwy - ws * 0.22, ws * 0.35, ws * 0.44)
  ctx.fillStyle = `rgba(${hexToRgb(variant.window)},${wg * 0.7})`
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(cx, hy - h - rh)
  ctx.lineTo(cx + w * 0.5, hy - h)
  ctx.lineTo(cx + w * 0.5 + dep * 0.7, hy - h + dep * 0.4)
  ctx.lineTo(cx + dep * 0.7, hy - h - rh + dep * 0.4)
  ctx.closePath()
  ctx.fillStyle = shadeColor(variant.roof, -20)
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(cx, hy - h - rh)
  ctx.lineTo(cx - w * 0.5, hy - h)
  ctx.lineTo(cx + w * 0.5, hy - h)
  ctx.closePath()
  ctx.fillStyle = variant.roof
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(cx, hy - h - rh)
  ctx.lineTo(cx + dep * 0.7, hy - h - rh + dep * 0.4)
  ctx.strokeStyle = variant.trim
  ctx.lineWidth = 1.2 * s
  ctx.globalAlpha = 0.5
  ctx.stroke()
  ctx.globalAlpha = 1

  const chx = cx + w * 0.2, chy = hy - h - rh * 0.55
  ctx.beginPath()
  ctx.rect(chx, chy - 7 * s, 4 * s, 7 * s)
  ctx.fillStyle = shadeColor(variant.roof, -10)
  ctx.fill()
  ctx.beginPath()
  ctx.rect(chx - s, chy - 8 * s, 6 * s, 2 * s)
  ctx.fillStyle = variant.trim
  ctx.fill()

  if (online || isMe) {
    for (let i = 0; i < 3; i++) {
      const st = t * 0.8 + i * 0.8
      const sx2 = chx + 2 * s + Math.sin(st * 2) * 2 * s
      const sy2 = chy - 8 * s - ((st % 2) / 2) * 14 * s
      const sa = 0.12 - ((st % 2) / 2) * 0.12
      ctx.beginPath()
      ctx.arc(sx2, sy2, (2 + i * 1.5) * s, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(200,200,220,${sa})`
      ctx.fill()
    }
  }

  const ar = iw * (0.75 + 0.06 * Math.sin(t * 1.0))
  const ag = ctx.createRadialGradient(cx, cy, 0, cx, cy, ar)
  if (isMe) { ag.addColorStop(0, 'rgba(201,168,76,0.2)'); ag.addColorStop(1, 'rgba(201,168,76,0)') }
  else if (online) { ag.addColorStop(0, 'rgba(100,150,255,0.1)'); ag.addColorStop(1, 'rgba(100,150,255,0)') }
  else { ag.addColorStop(0, 'rgba(80,80,100,0.06)'); ag.addColorStop(1, 'rgba(80,80,100,0)') }
  ctx.beginPath()
  ctx.arc(cx, cy, ar, 0, Math.PI * 2)
  ctx.fillStyle = ag
  ctx.fill()

  if (isMe) {
    [{ dx: -iw * 0.55, dy: -h * 1.6 }, { dx: iw * 0.55, dy: -h * 1.8 }, { dx: iw * 0.1, dy: -h * 2.2 }].forEach(({ dx, dy }, i) => {
      const a = 0.4 + 0.5 * Math.sin(t * 2.2 + i * 1.4)
      ctx.font = `${Math.max(7, 9 * s)}px serif`
      ctx.fillStyle = `rgba(201,168,76,${a})`
      ctx.textAlign = 'center'
      ctx.fillText('✦', cx + dx, cy + dy)
    })
  }
}

export default function UniverseMap({
  hubName,
  onWriteLetter,
  onObservatory,
  onProfile,
}: {
  hubName?: string
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
    const init = async () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')!

      const resize = () => {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        offsetRef.current = { x: canvas.width / 2, y: canvas.height / 2 }
      }
      resize()
      window.addEventListener('resize', resize)

      // Load real hubs from Supabase
      const realHubs = await getAllHubs()
      console.log('Real hubs loaded:', realHubs.length)

      hubsRef.current = [
        // User's own hub at center
        {
          x: 0, y: 0,
          name: hubName || 'Your Hub',
          bio: 'This is your place in the universe.',
          online: true, pulse: 0, size: 1.2, isMe: true,
          floatOffset: 0, floatSpeed: 0.5, houseVariant: 0,
        },
        // Real hubs from Supabase
        ...realHubs.map((hub: any, i: number) => {
          const angle = (i / Math.max(realHubs.length, 1)) * Math.PI * 2 + Math.random() * 0.5
          const dist = 180 + Math.random() * 320
          return {
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            name: hub.hub_name,
            bio: hub.bio || '',
            askAbout: hub.ask_about || '',
            online: hub.online ?? true,
            pulse: Math.random() * Math.PI * 2,
            size: 0.9 + Math.random() * 0.3,
            floatOffset: Math.random() * Math.PI * 2,
            floatSpeed: 0.4 + Math.random() * 0.3,
            houseVariant: i % HOUSE_VARIANTS.length,
          }
        })
      ]

      // Stars
      const starCanvas = document.createElement('canvas')
      starCanvas.width = canvas.width
      starCanvas.height = canvas.height
      const sCtx = starCanvas.getContext('2d')!
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
          if (sx < -300 || sx > canvas.width + 300 || sy < -300 || sy > canvas.height + 300) return
          const floatY = Math.sin(t * hub.floatSpeed + hub.floatOffset) * 5
          const s = hub.size * scale
          const variant = hub.isMe ? MY_HOUSE : HOUSE_VARIANTS[hub.houseVariant % HOUSE_VARIANTS.length]
          ctx.save()
          drawHouse(ctx, sx, sy + floatY, s, variant, t, hub.online, !!hub.isMe)
          ctx.restore()
        })

        animFrameRef.current = requestAnimationFrame(draw)
      }
      draw()

      return () => {
        cancelAnimationFrame(animFrameRef.current)
        window.removeEventListener('resize', resize)
      }
    }

    init()
  }, [hubName])

  const getHubAt = useCallback((mx: number, my: number): Hub | null => {
    const scale = scaleRef.current
    const offset = offsetRef.current
    let found: Hub | null = null
    hubsRef.current.forEach(hub => {
      const sx = offset.x + hub.x * scale
      const sy = offset.y + hub.y * scale
      if (Math.abs(mx - sx) < hub.size * scale * 50 && Math.abs(my - sy) < hub.size * scale * 50) found = hub
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
      if (hub) setTooltip({ hub, sx: offsetRef.current.x + hub.x * scaleRef.current, sy: offsetRef.current.y + hub.y * scaleRef.current })
      else setTooltip(null)
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!hasDraggedRef.current) {
      const hub = getHubAt(e.clientX, e.clientY)
      if (hub) { setProfile({ hub }); setTooltip(null) }
      else setProfile(null)
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

      <canvas ref={canvasRef}
        style={{ position: 'absolute', inset: 0, cursor: 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isDraggingRef.current = false; setTooltip(null) }}
        onWheel={handleWheel}
      />

      {/* Name pill */}
      <AnimatePresence>
        {tooltip && !profile && (
          <motion.div key="tip" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ position: 'fixed', left: tooltip.sx, top: tooltip.sy - tooltip.hub.size * scaleRef.current * 60, transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 60 }}>
            <div style={{ background: 'rgba(8,10,28,0.9)', border: `1px solid ${tooltip.hub.isMe ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '20px', padding: '6px 16px', backdropFilter: 'blur(12px)', boxShadow: tooltip.hub.isMe ? '0 0 14px rgba(201,168,76,0.25)' : '0 4px 16px rgba(0,0,0,0.6)' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.18em', color: tooltip.hub.isMe ? '#c9a84c' : 'rgba(255,255,255,0.78)', whiteSpace: 'nowrap' }}>{tooltip.hub.name}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile card */}
      <AnimatePresence>
        {profile && (
          <motion.div key="profile" initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
            style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '20px', background: 'rgba(0,0,5,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setProfile(null)}>
            <motion.div onClick={e => e.stopPropagation()}
              style={{ background: 'rgba(8,10,28,0.9)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px', width: 'min(780px, 95vw)', minHeight: '420px', display: 'flex', overflow: 'hidden', boxShadow: '0 0 80px rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)', position: 'relative' }}>

              {/* Avatar panel */}
              <div style={{ width: '45%', minHeight: '420px', background: 'linear-gradient(135deg, rgba(20,25,60,0.9), rgba(10,15,40,0.95))', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ position: 'absolute', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,140,255,0.12) 0%, transparent 70%)', border: '1px solid rgba(150,180,255,0.1)' }} />
                <div style={{ width: '160px', height: '220px', borderRadius: '8px', background: 'linear-gradient(180deg, rgba(60,80,160,0.4), rgba(20,30,80,0.6))', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', position: 'relative', zIndex: 2, boxShadow: '0 0 30px rgba(100,140,255,0.12)' }}>✦</div>
                {[...Array(12)].map((_, i) => <div key={i} style={{ position: 'absolute', width: '2px', height: '2px', borderRadius: '50%', background: 'rgba(255,255,255,0.35)', left: `${10 + Math.random() * 80}%`, top: `${5 + Math.random() * 90}%` }} />)}
                <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)' }}>
                  <button style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.25em', color: 'rgba(201,168,76,0.7)', padding: '8px 20px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', cursor: 'pointer' }}>Soul Mirror</button>
                </div>
              </div>

              {/* Info */}
              <div style={{ flex: 1, padding: 'clamp(24px,4vw,40px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(16px,2.5vw,22px)', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.92)', marginBottom: '6px' }}>{profile.hub.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: profile.hub.online ? '#7ecf7e' : 'rgba(255,255,255,0.2)', boxShadow: profile.hub.online ? '0 0 6px rgba(126,207,126,0.6)' : 'none' }} />
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: profile.hub.online ? 'rgba(126,207,126,0.7)' : 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>{profile.hub.online ? 'online' : 'away'}</span>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>Bio</p>
                    <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(13px,1.8vw,15px)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>{profile.hub.bio}</p>
                  </div>
                  {!profile.hub.isMe && profile.hub.askAbout && (
                    <div>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>Ask me about</p>
                      <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(13px,1.8vw,15px)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{profile.hub.askAbout}</p>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '28px', flexWrap: 'wrap' }}>
                  <button onClick={() => setProfile(null)}
                    style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.35)', padding: '10px 18px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}>✦ Dismiss</button>
                  {!profile.hub.isMe && (
                    <button onClick={() => { setProfile(null); onWriteLetter?.(profile.hub.name) }}
                      style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(201,168,76,0.8)', padding: '10px 18px', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '4px', background: 'rgba(201,168,76,0.05)', cursor: 'pointer', textTransform: 'uppercase' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#c9a84c'; e.currentTarget.style.borderColor = '#c9a84c'; e.currentTarget.style.boxShadow = '0 0 16px rgba(201,168,76,0.15)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(201,168,76,0.8)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'; e.currentTarget.style.boxShadow = 'none' }}>✦ Send Shooting Star</button>
                  )}
                </div>
              </div>

              <button onClick={() => setProfile(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', fontSize: '18px', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}>×</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <motion.nav initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}
        style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px', background: 'rgba(8,10,28,0.82)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', backdropFilter: 'blur(20px)', padding: '8px 12px', boxShadow: '0 4px 40px rgba(0,0,0,0.6)', zIndex: 50 }}>
        {navItems.map((item, i) => (
          <button key={item.label}
            onClick={() => { setActiveNav(i); if (i === 1) onWriteLetter?.(); if (i === 2) onObservatory?.(); if (i === 3) onProfile?.() }}
            onMouseEnter={() => setHoveredNav(i)} onMouseLeave={() => setHoveredNav(null)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '10px 18px', background: activeNav === i ? 'rgba(201,168,76,0.1)' : hoveredNav === i ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none', borderRadius: '10px', cursor: 'pointer', minWidth: '64px' }}>
            <span style={{ fontSize: '18px', lineHeight: 1, color: activeNav === i ? '#c9a84c' : 'rgba(255,255,255,0.55)', filter: activeNav === i ? 'drop-shadow(0 0 6px rgba(201,168,76,0.5))' : 'none' }}>{item.icon}</span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: activeNav === i ? 'rgba(201,168,76,0.8)' : 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>{item.label}</span>
          </button>
        ))}
      </motion.nav>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.8 }}
        style={{ position: 'fixed', top: '28px', left: '50%', transform: 'translateX(-50%)', fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.16)', letterSpacing: '0.08em', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 50 }}>
        drag to explore · scroll to zoom
      </motion.p>
    </div>
  )
}