'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getAllHubs,
  getMyLetters,
  getUniverseLetters,
  type HubRecord,
} from '../lib/auth'
import { playUiSound } from '../lib/sound'
import { useViewport } from '../lib/useViewport'
import {
  UNIVERSE_PROMPTS,
  type UniversePrompt,
} from '../lib/worldbuilding'
// ── HUB STYLE TYPES ──
export type HubStyle =
  | 'portal'
  | 'lantern'
  | 'ruin'
  | 'hourglass'
  | 'telescope'
  | 'greenhouse'
  | 'cathedral'
  | 'lotus'

export type HubPaletteId =
  | 'gilded'
  | 'rose'
  | 'tide'
  | 'violet'
  | 'ember'
  | 'jade'
  | 'pearl'
  | 'midnight'

export const DEFAULT_HUB_PALETTE: HubPaletteId = 'gilded'

export const HUB_STYLES: { id: HubStyle; label: string; desc: string; icon: string }[] = [
  { id: 'portal', label: 'Portal Ring', desc: 'A spinning cosmic gateway', icon: '◎' },
  { id: 'lantern', label: 'Floating Lantern', desc: 'A soft glowing orb drifting in space', icon: '◉' },
  { id: 'ruin', label: 'Moon Gate', desc: 'A silver-lit arch with a quiet lunar pull', icon: '☽' },
  { id: 'hourglass', label: 'Prism Bloom', desc: 'A faceted crystal flower suspended in light', icon: '◇' },
  { id: 'telescope', label: 'Starwatch Shrine', desc: 'A celestial shrine with a lens of focused light', icon: '✧' },
  { id: 'greenhouse', label: 'Greenhouse Bubble', desc: 'A glass dome brimming with quiet life', icon: '✦' },
  { id: 'cathedral', label: 'Stained Cathedral', desc: 'A luminous windowed sanctuary floating in the dark', icon: '⟡' },
  { id: 'lotus', label: 'Lotus Sanctuary', desc: 'A blooming cosmic flower with soft radiant petals', icon: '❀' },
]

const LEGACY_PORTAL_COLORS = [
  { ring: '#8b6fc0', glow: '130,80,200', inner: '#4a2a7a' },
  { ring: '#6faa88', glow: '80,160,120', inner: '#2a5a40' },
  { ring: '#aa6f6f', glow: '180,80,80', inner: '#6a2a2a' },
  { ring: '#6f8faa', glow: '80,120,180', inner: '#2a4a6a' },
  { ring: '#aa8f5a', glow: '180,140,60', inner: '#6a5a20' },
  { ring: '#8f5aaa', glow: '140,60,180', inner: '#4a1a6a' },
  { ring: '#5a8faa', glow: '60,130,180', inner: '#1a4a6a' },
  { ring: '#aa8f6f', glow: '180,140,80', inner: '#6a5a30' },
]

export const HUB_PALETTES: {
  id: HubPaletteId
  label: string
  desc: string
  swatch: string
  colors: { ring: string; glow: string; inner: string }
}[] = [
  {
    id: 'gilded',
    label: 'Gilded',
    desc: 'Warm gold and amber light',
    swatch: 'linear-gradient(135deg, #f2d37e, #8f6320)',
    colors: { ring: '#dcb45a', glow: '220,180,90', inner: '#6e4510' },
  },
  {
    id: 'rose',
    label: 'Roseglass',
    desc: 'Dusty blush and deep plum',
    swatch: 'linear-gradient(135deg, #f0a7c0, #7a315a)',
    colors: { ring: '#d97ea8', glow: '215,105,150', inner: '#541a38' },
  },
  {
    id: 'tide',
    label: 'Tide',
    desc: 'Sea-glass teal and moonlit blue',
    swatch: 'linear-gradient(135deg, #86dfd5, #27507a)',
    colors: { ring: '#69c9c2', glow: '90,200,190', inner: '#173d58' },
  },
  {
    id: 'violet',
    label: 'Violet',
    desc: 'Lavender haze and royal dusk',
    swatch: 'linear-gradient(135deg, #c7a7ff, #4e2b8b)',
    colors: { ring: '#b08df3', glow: '165,120,240', inner: '#351d63' },
  },
  {
    id: 'ember',
    label: 'Ember',
    desc: 'Crimson embers and molten copper',
    swatch: 'linear-gradient(135deg, #ff996f, #6b2318)',
    colors: { ring: '#e17a5f', glow: '225,110,85', inner: '#5b1c14' },
  },
  {
    id: 'jade',
    label: 'Jade',
    desc: 'Verdant green with glassy glow',
    swatch: 'linear-gradient(135deg, #8fe0a3, #1d5f44)',
    colors: { ring: '#74c88f', glow: '90,190,120', inner: '#184832' },
  },
  {
    id: 'pearl',
    label: 'Pearl',
    desc: 'Silver mist and pale moonlight',
    swatch: 'linear-gradient(135deg, #f4f2ff, #6a7197)',
    colors: { ring: '#cfd5ef', glow: '205,215,245', inner: '#49506a' },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    desc: 'Blue-black velvet with starfire edges',
    swatch: 'linear-gradient(135deg, #6f7ff0, #161d45)',
    colors: { ring: '#7c8bf0', glow: '95,110,240', inner: '#141a3f' },
  },
]

const DEFAULT_HUB_COLORS = HUB_PALETTES.find((palette) => palette.id === DEFAULT_HUB_PALETTE)!.colors
type HubColorSet = typeof DEFAULT_HUB_COLORS

interface Hub {
  id: string
  x: number; y: number
  name: string; bio: string; askAbout?: string
  avatarUrl?: string; avatarImage?: HTMLImageElement
  online: boolean; pulse: number; size: number
  isMe?: boolean; floatOffset: number; floatSpeed: number
  colorVariant: number; hubStyle: HubStyle; paletteId?: string | null
  isConstellated?: boolean
}

interface ShootingStar {
  id: number; x: number; y: number
  vx: number; vy: number; alpha: number
  tail: { x: number; y: number }[]
  letterId: string; senderName: string; preview: string
  age: number; maxAge: number; clicked: boolean
}

interface TooltipState { hub: Hub; sx: number; sy: number; scale: number }
interface ProfileState { hub: Hub; screenX: number; screenY: number; telescopeMode: boolean }
type ReturnPathMap = Record<string, number>
type UniverseLetterStarEventDetail = { id: string; senderName: string; preview: string }
type FloatingUniversePrompt = UniversePrompt & {
  instanceId: number
  left: number
  top: number
  driftX: number
  driftY: number
  maxWidth: number
  align: 'left' | 'center' | 'right'
}

const imageCache = new Map<string, HTMLImageElement>()
function loadImage(url: string): Promise<HTMLImageElement> {
  if (imageCache.has(url)) return Promise.resolve(imageCache.get(url)!)
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { imageCache.set(url, img); resolve(img) }
    img.onerror = () => resolve(img)
    img.src = url
  })
}

export function isHubPaletteId(value?: string | null): value is HubPaletteId {
  return HUB_PALETTES.some((palette) => palette.id === value)
}

function getPaletteColors(paletteId?: string | null, colorVariant = 0, isMe?: boolean) {
  if (paletteId && isHubPaletteId(paletteId)) {
    return HUB_PALETTES.find((palette) => palette.id === paletteId)!.colors
  }

  if (isMe) return DEFAULT_HUB_COLORS

  return LEGACY_PORTAL_COLORS[colorVariant % LEGACY_PORTAL_COLORS.length]
}

// ── DRAW FUNCTIONS PER STYLE ──

function drawPortal(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, colors: HubColorSet, t: number, online: boolean, isMe: boolean, avatarImage?: HTMLImageElement) {
  const r = 28 * s
  const pulse = 0.85 + 0.15 * Math.sin(t * (isMe ? 1.2 : 0.8))
  const auraR = r * 2.2 * pulse
  const aura = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, auraR)
  aura.addColorStop(0, `rgba(${colors.glow},${isMe ? 0.18 : 0.1})`)
  aura.addColorStop(1, `rgba(${colors.glow},0)`)
  ctx.beginPath(); ctx.arc(cx, cy, auraR, 0, Math.PI * 2)
  ctx.fillStyle = aura; ctx.fill()
  const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.9)
  innerGrad.addColorStop(0, `rgba(${colors.glow},0.08)`)
  innerGrad.addColorStop(0.6, colors.inner + 'cc')
  innerGrad.addColorStop(1, '#020308')
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2)
  ctx.fillStyle = innerGrad; ctx.fill()
  if (avatarImage?.complete && avatarImage.naturalWidth > 0) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2); ctx.clip()
    ctx.drawImage(avatarImage, cx - r * 0.88, cy - r * 0.88, r * 1.76, r * 1.76); ctx.restore()
  } else {
    ctx.font = `${Math.max(10, 14 * s)}px serif`; ctx.fillStyle = `rgba(${colors.glow},0.6)`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✦', cx, cy); ctx.textBaseline = 'alphabetic'
  }
  // Outer spinning ring
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.8)
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.strokeStyle = colors.ring; ctx.lineWidth = 2.5 * s * pulse
  ctx.setLineDash([8, 6]); ctx.globalAlpha = 0.9; ctx.stroke()
  ctx.setLineDash([]); ctx.restore()
  // Inner counter-spinning ring
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-t * 0.5)
  ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${colors.glow},0.35)`; ctx.lineWidth = 1 * s
  ctx.setLineDash([4, 8]); ctx.stroke(); ctx.setLineDash([]); ctx.restore()
  // Orbiting particles
  for (let i = 0; i < (isMe ? 6 : 4); i++) {
    const angle = (i / (isMe ? 6 : 4)) * Math.PI * 2 + t * (isMe ? 0.7 : 0.4)
    const px = cx + Math.cos(angle) * r * 1.2; const py = cy + Math.sin(angle) * r * 1.2
    ctx.beginPath(); ctx.arc(px, py, 1.5 * s, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${colors.glow},${0.3 + 0.4 * Math.sin(t * 2 + i)})`; ctx.fill()
  }
  ctx.globalAlpha = 1
  // Online dot
  if (!isMe) {
    const dotX = cx + r * 0.7; const dotY = cy - r * 0.7
    ctx.beginPath(); ctx.arc(dotX, dotY, 3 * s, 0, Math.PI * 2)
    ctx.fillStyle = online ? '#7ecf7e' : 'rgba(255,255,255,0.2)'; ctx.fill()
  }
}

function drawLantern(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, colors: HubColorSet, t: number, online: boolean, isMe: boolean, avatarImage?: HTMLImageElement) {
  const r = 26 * s
  const breathe = 0.92 + 0.08 * Math.sin(t * 0.9)
  // Outer glow halo
  const halo = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 3 * breathe)
  halo.addColorStop(0, `rgba(${colors.glow},0.22)`)
  halo.addColorStop(0.5, `rgba(${colors.glow},0.07)`)
  halo.addColorStop(1, `rgba(${colors.glow},0)`)
  ctx.beginPath(); ctx.arc(cx, cy, r * 3 * breathe, 0, Math.PI * 2)
  ctx.fillStyle = halo; ctx.fill()
  // Main orb
  const orbGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r * breathe)
  orbGrad.addColorStop(0, `rgba(255,255,240,0.9)`)
  orbGrad.addColorStop(0.3, `rgba(${colors.glow},0.7)`)
  orbGrad.addColorStop(0.7, `rgba(${colors.glow},0.35)`)
  orbGrad.addColorStop(1, `rgba(${colors.glow},0.05)`)
  ctx.beginPath(); ctx.arc(cx, cy, r * breathe, 0, Math.PI * 2)
  ctx.fillStyle = orbGrad; ctx.fill()
  // Avatar inside orb
  if (avatarImage?.complete && avatarImage.naturalWidth > 0) {
    ctx.save(); ctx.globalAlpha = 0.6
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.75 * breathe, 0, Math.PI * 2); ctx.clip()
    ctx.drawImage(avatarImage, cx - r * 0.75, cy - r * 0.75, r * 1.5, r * 1.5); ctx.restore()
  }
  // Floating sparks
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + t * 0.3 + Math.sin(t * 0.5 + i) * 0.5
    const dist = r * (1.2 + 0.5 * Math.sin(t * 0.8 + i * 1.3))
    const sparkX = cx + Math.cos(angle) * dist; const sparkY = cy + Math.sin(angle) * dist - 4 * s
    const sa = 0.2 + 0.6 * Math.abs(Math.sin(t * 0.9 + i))
    ctx.beginPath(); ctx.arc(sparkX, sparkY, 1.5 * s, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,240,180,${sa})`; ctx.fill()
  }
  // String hanging from top
  ctx.beginPath(); ctx.moveTo(cx, cy - r * breathe)
  ctx.lineTo(cx, cy - r * breathe - 12 * s)
  ctx.strokeStyle = `rgba(${colors.glow},0.4)`; ctx.lineWidth = 1 * s; ctx.stroke()
  // Online dot
  if (!isMe) {
    ctx.beginPath(); ctx.arc(cx + r * 0.65, cy - r * 0.65, 3 * s, 0, Math.PI * 2)
    ctx.fillStyle = online ? '#7ecf7e' : 'rgba(255,255,255,0.2)'; ctx.fill()
  }
}

function drawRuin(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, colors: HubColorSet, t: number, online: boolean, isMe: boolean, avatarImage?: HTMLImageElement) {
  const r = 28 * s
  const sway = Math.sin(t * 0.3) * 1.5
  // Misty ground glow
  const mist = ctx.createRadialGradient(cx, cy + r * 0.8, 0, cx, cy + r * 0.8, r * 2)
  mist.addColorStop(0, `rgba(${colors.glow},0.12)`)
  mist.addColorStop(1, `rgba(${colors.glow},0)`)
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.8, r * 2, r * 0.6, 0, 0, Math.PI * 2)
  ctx.fillStyle = mist; ctx.fill()
  // Left pillar
  ctx.save(); ctx.translate(cx + sway * 0.5, cy)
  ctx.fillStyle = `rgba(${colors.glow},0.18)`
  ctx.fillRect(-r * 0.8 - 7 * s, -r * 0.6, 8 * s, r * 1.4)
  ctx.fillStyle = `rgba(${colors.glow},0.1)`
  ctx.restore()
  // Right pillar
  ctx.save(); ctx.translate(cx + sway * 0.3, cy)
  ctx.fillStyle = `rgba(${colors.glow},0.18)`
  ctx.fillRect(r * 0.8 - 4 * s, -r * 0.5, 8 * s, r * 1.3)
  ctx.restore()
  // Arch top
  ctx.save(); ctx.translate(cx + sway * 0.3, cy)
  ctx.beginPath()
  ctx.arc(0, -r * 0.55, r * 0.85, Math.PI, 0, false)
  ctx.strokeStyle = `rgba(${colors.glow},0.45)`; ctx.lineWidth = 5 * s; ctx.stroke()
  // Keystone
  ctx.fillStyle = `rgba(${colors.glow},0.35)`
  ctx.fillRect(-6 * s, -r * 0.55 - r * 0.85 - 4 * s, 12 * s, 10 * s)
  ctx.restore()
  // Crescent moon suspended in the arch
  ctx.save()
  ctx.translate(cx + r * 0.08, cy - r * 0.98)
  ctx.rotate(-0.2 + Math.sin(t * 0.35) * 0.04)
  ctx.beginPath()
  ctx.arc(0, 0, 8 * s, Math.PI * 0.2, Math.PI * 1.8)
  ctx.arc(3.5 * s, 0, 6 * s, Math.PI * 1.8, Math.PI * 0.2, true)
  ctx.closePath()
  ctx.fillStyle = `rgba(${colors.glow},0.55)`
  ctx.fill()
  ctx.restore()
  // Portal within archway
  if (avatarImage?.complete && avatarImage.naturalWidth > 0) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy - r * 0.2, r * 0.55, 0, Math.PI * 2); ctx.clip()
    ctx.globalAlpha = 0.75
    ctx.drawImage(avatarImage, cx - r * 0.55, cy - r * 0.2 - r * 0.55, r * 1.1, r * 1.1)
    ctx.restore()
  } else {
    const portalGrad = ctx.createRadialGradient(cx, cy - r * 0.2, 0, cx, cy - r * 0.2, r * 0.55)
    portalGrad.addColorStop(0, `rgba(${colors.glow},0.25)`)
    portalGrad.addColorStop(1, `rgba(${colors.glow},0.04)`)
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.2, r * 0.55, 0, Math.PI * 2)
    ctx.fillStyle = portalGrad; ctx.fill()
  }
  // Floating rune particles
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + t * 0.2
    const rx = cx + Math.cos(angle) * r * 1.1; const ry = cy + Math.sin(angle) * r * 0.7 - 5 * s
    const ra = 0.15 + 0.3 * Math.abs(Math.sin(t * 0.5 + i))
    ctx.fillStyle = `rgba(${colors.glow},${ra})`
    ctx.font = `${6 * s}px serif`; ctx.textAlign = 'center'; ctx.fillText('✦', rx, ry)
  }
  ctx.textAlign = 'left'
  if (!isMe) {
    ctx.beginPath(); ctx.arc(cx + r * 0.9, cy - r * 0.6, 3 * s, 0, Math.PI * 2)
    ctx.fillStyle = online ? '#7ecf7e' : 'rgba(255,255,255,0.2)'; ctx.fill()
  }
}

function drawHourglass(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, colors: HubColorSet, t: number, online: boolean, isMe: boolean, avatarImage?: HTMLImageElement) {
  const r = 30 * s
  const pulse = 0.92 + 0.08 * Math.sin(t * 0.8)
  const bloomR = r * pulse
  const points = [
    { x: cx, y: cy - bloomR },
    { x: cx + bloomR * 0.72, y: cy },
    { x: cx, y: cy + bloomR },
    { x: cx - bloomR * 0.72, y: cy },
  ]

  const aura = ctx.createRadialGradient(cx, cy, bloomR * 0.15, cx, cy, bloomR * 2.2)
  aura.addColorStop(0, `rgba(${colors.glow},0.18)`)
  aura.addColorStop(1, `rgba(${colors.glow},0)`)
  ctx.beginPath(); ctx.arc(cx, cy, bloomR * 2.2, 0, Math.PI * 2)
  ctx.fillStyle = aura; ctx.fill()

  const crystalGrad = ctx.createLinearGradient(cx, cy - bloomR, cx, cy + bloomR)
  crystalGrad.addColorStop(0, `rgba(230,245,255,0.34)`)
  crystalGrad.addColorStop(0.45, `rgba(${colors.glow},0.22)`)
  crystalGrad.addColorStop(1, `rgba(${colors.glow},0.08)`)
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  points.slice(1).forEach(point => ctx.lineTo(point.x, point.y))
  ctx.closePath()
  ctx.fillStyle = crystalGrad
  ctx.fill()
  ctx.strokeStyle = `rgba(${colors.glow},0.58)`
  ctx.lineWidth = 1.6 * s
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(cx, cy - bloomR)
  ctx.lineTo(cx, cy + bloomR)
  ctx.moveTo(cx - bloomR * 0.72, cy)
  ctx.lineTo(cx + bloomR * 0.72, cy)
  ctx.moveTo(cx - bloomR * 0.36, cy - bloomR * 0.5)
  ctx.lineTo(cx + bloomR * 0.36, cy - bloomR * 0.5)
  ctx.moveTo(cx - bloomR * 0.36, cy + bloomR * 0.5)
  ctx.lineTo(cx + bloomR * 0.36, cy + bloomR * 0.5)
  ctx.strokeStyle = `rgba(220,245,255,0.18)`
  ctx.lineWidth = 0.9 * s
  ctx.stroke()

  if (avatarImage?.complete && avatarImage.naturalWidth > 0) {
    ctx.save()
    ctx.globalAlpha = 0.3
    ctx.beginPath()
    ctx.moveTo(cx, cy - bloomR * 0.78)
    ctx.lineTo(cx + bloomR * 0.5, cy)
    ctx.lineTo(cx, cy + bloomR * 0.78)
    ctx.lineTo(cx - bloomR * 0.5, cy)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(avatarImage, cx - bloomR * 0.7, cy - bloomR * 0.7, bloomR * 1.4, bloomR * 1.4)
    ctx.restore()
  }

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + t * 0.45
    const px = cx + Math.cos(angle) * bloomR * 0.95
    const py = cy + Math.sin(angle) * bloomR * 0.95
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(angle + t * 0.2)
    ctx.beginPath()
    ctx.moveTo(0, -4 * s)
    ctx.lineTo(3 * s, 0)
    ctx.lineTo(0, 4 * s)
    ctx.lineTo(-3 * s, 0)
    ctx.closePath()
    ctx.fillStyle = `rgba(${colors.glow},${0.28 + 0.18 * Math.sin(t * 1.8 + i)})`
    ctx.fill()
    ctx.restore()
  }

  const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, bloomR * 0.5)
  coreGlow.addColorStop(0, `rgba(${colors.glow},0.35)`)
  coreGlow.addColorStop(1, `rgba(${colors.glow},0)`)
  ctx.beginPath(); ctx.arc(cx, cy, bloomR * 0.5, 0, Math.PI * 2)
  ctx.fillStyle = coreGlow; ctx.fill()

  if (!isMe) {
    ctx.beginPath(); ctx.arc(cx + bloomR * 0.8, cy - bloomR * 0.8, 3 * s, 0, Math.PI * 2)
    ctx.fillStyle = online ? '#7ecf7e' : 'rgba(255,255,255,0.2)'; ctx.fill()
  }
}

function drawTelescope(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, colors: HubColorSet, t: number, online: boolean, isMe: boolean, avatarImage?: HTMLImageElement) {
  const r = 28 * s
  const bob = Math.sin(t * 0.6) * 2 * s
  // Dome base shadow
  const shadow = ctx.createRadialGradient(cx, cy + r * 0.9 + bob, 0, cx, cy + r * 0.9 + bob, r)
  shadow.addColorStop(0, `rgba(${colors.glow},0.15)`)
  shadow.addColorStop(1, `rgba(${colors.glow},0)`)
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.9 + bob, r, r * 0.25, 0, 0, Math.PI * 2)
  ctx.fillStyle = shadow; ctx.fill()
  // Dome body
  const domeGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.1 + bob, 0, cx, cy + bob, r * 0.85)
  domeGrad.addColorStop(0, `rgba(200,220,255,0.25)`)
  domeGrad.addColorStop(0.4, `rgba(${colors.glow},0.18)`)
  domeGrad.addColorStop(0.8, colors.inner + 'aa')
  domeGrad.addColorStop(1, `rgba(${colors.glow},0.05)`)
  ctx.beginPath()
  ctx.arc(cx, cy + bob, r * 0.85, Math.PI, 0, false)
  ctx.lineTo(cx + r * 0.85, cy + r * 0.3 + bob)
  ctx.quadraticCurveTo(cx, cy + r * 0.7 + bob, cx - r * 0.85, cy + r * 0.3 + bob)
  ctx.closePath()
  ctx.fillStyle = domeGrad; ctx.fill()
  ctx.strokeStyle = `rgba(${colors.glow},0.5)`; ctx.lineWidth = 1.5 * s; ctx.stroke()
  // Dome slit (opening)
  const slitAngle = (t * 0.4) % (Math.PI * 2)
  ctx.save(); ctx.translate(cx, cy + bob)
  ctx.rotate(slitAngle * 0.1)
  ctx.fillStyle = `rgba(${colors.glow},0.12)`
  ctx.fillRect(-3 * s, -r * 0.85, 6 * s, r * 0.85)
  ctx.restore()
  // Glass reflection on dome
  ctx.save(); ctx.translate(cx, cy + bob)
  ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.35, r * 0.15, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(200,230,255,0.12)`; ctx.fill(); ctx.restore()
  // Telescope barrel pointing up-right
  ctx.save(); ctx.translate(cx + r * 0.1, cy - r * 0.3 + bob)
  ctx.rotate(-Math.PI / 5 + Math.sin(t * 0.3) * 0.05)
  ctx.fillStyle = `rgba(${colors.glow},0.55)`
  ctx.fillRect(-2.5 * s, -r * 0.55, 5 * s, r * 0.55)
  ctx.fillStyle = `rgba(${colors.glow},0.75)`
  ctx.fillRect(-4 * s, -r * 0.56, 8 * s, 6 * s)
  // Lens gleam
  ctx.fillStyle = `rgba(200,240,255,0.5)`
  ctx.fillRect(-2 * s, -r * 0.56, 4 * s, 2 * s)
  ctx.restore()
  // Avatar in dome window
  if (avatarImage?.complete && avatarImage.naturalWidth > 0) {
    ctx.save(); ctx.globalAlpha = 0.55
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.1 + bob, r * 0.45, 0, Math.PI * 2); ctx.clip()
    ctx.drawImage(avatarImage, cx - r * 0.45, cy + r * 0.1 - r * 0.45 + bob, r * 0.9, r * 0.9)
    ctx.restore()
  }
  // Scan beam (rotates)
  ctx.save(); ctx.translate(cx + r * 0.1, cy - r * 0.55 + bob)
  ctx.rotate(-Math.PI / 5 + Math.sin(t * 0.3) * 0.05)
  const beam = ctx.createLinearGradient(0, 0, 0, -r * 1.5)
  beam.addColorStop(0, `rgba(${colors.glow},0.3)`)
  beam.addColorStop(1, `rgba(${colors.glow},0)`)
  ctx.beginPath(); ctx.moveTo(-1 * s, 0); ctx.lineTo(1 * s, 0)
  ctx.lineTo(4 * s, -r * 1.5); ctx.lineTo(-4 * s, -r * 1.5); ctx.closePath()
  ctx.fillStyle = beam; ctx.fill(); ctx.restore()
  if (!isMe) {
    ctx.beginPath(); ctx.arc(cx + r * 0.8, cy - r * 0.6 + bob, 3 * s, 0, Math.PI * 2)
    ctx.fillStyle = online ? '#7ecf7e' : 'rgba(255,255,255,0.2)'; ctx.fill()
  }
}

function drawGreenhouse(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, colors: HubColorSet, t: number, online: boolean, isMe: boolean, avatarImage?: HTMLImageElement) {
  const r = 26 * s
  const breathe = 0.96 + 0.04 * Math.sin(t * 0.7)
  // Outer mist
  const mist = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.2)
  mist.addColorStop(0, `rgba(100,220,150,0.12)`)
  mist.addColorStop(0.5, `rgba(${colors.glow},0.05)`)
  mist.addColorStop(1, `rgba(${colors.glow},0)`)
  ctx.beginPath(); ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2); ctx.fillStyle = mist; ctx.fill()
  // Glass dome
  const glassGrad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, 0, cx, cy, r * breathe)
  glassGrad.addColorStop(0, `rgba(200,255,220,0.18)`)
  glassGrad.addColorStop(0.5, `rgba(100,200,140,0.1)`)
  glassGrad.addColorStop(0.85, `rgba(60,160,100,0.08)`)
  glassGrad.addColorStop(1, `rgba(40,120,80,0.03)`)
  ctx.beginPath(); ctx.arc(cx, cy, r * breathe, 0, Math.PI * 2)
  ctx.fillStyle = glassGrad; ctx.fill()
  // Glass panels (hexagonal lines)
  ctx.save(); ctx.translate(cx, cy)
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    ctx.beginPath(); ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(angle) * r * breathe, Math.sin(angle) * r * breathe)
    ctx.strokeStyle = `rgba(180,255,210,0.12)`; ctx.lineWidth = 0.8 * s; ctx.stroke()
  }
  ctx.restore()
  // Avatar inside
  if (avatarImage?.complete && avatarImage.naturalWidth > 0) {
    ctx.save(); ctx.globalAlpha = 0.55
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.82 * breathe, 0, Math.PI * 2); ctx.clip()
    ctx.drawImage(avatarImage, cx - r * 0.82, cy - r * 0.82, r * 1.64, r * 1.64)
    ctx.restore()
  }
  // Floating leaves / petal particles
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + t * 0.25 + Math.sin(t * 0.4 + i) * 0.8
    const dist = r * (0.45 + 0.35 * Math.abs(Math.sin(t * 0.3 + i * 0.7)))
    const lx = cx + Math.cos(angle) * dist; const ly = cy + Math.sin(angle) * dist
    const la = 0.25 + 0.5 * Math.abs(Math.sin(t * 0.6 + i))
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(angle + t * 0.5)
    ctx.beginPath(); ctx.ellipse(0, 0, 3 * s, 1.5 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(100,220,140,${la})`; ctx.fill(); ctx.restore()
  }
  // Glass reflection highlight
  ctx.save(); ctx.globalAlpha = 0.18
  ctx.beginPath(); ctx.arc(cx - r * 0.28, cy - r * 0.28, r * 0.22, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(220,255,240,0.9)'; ctx.fill(); ctx.restore()
  // Outer ring
  ctx.beginPath(); ctx.arc(cx, cy, r * breathe, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(100,220,150,0.45)`; ctx.lineWidth = 1.5 * s; ctx.stroke()
  if (!isMe) {
    ctx.beginPath(); ctx.arc(cx + r * 0.7, cy - r * 0.7, 3 * s, 0, Math.PI * 2)
    ctx.fillStyle = online ? '#7ecf7e' : 'rgba(255,255,255,0.2)'; ctx.fill()
  }
}

function drawCathedral(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, colors: HubColorSet, t: number, online: boolean, isMe: boolean, avatarImage?: HTMLImageElement) {
  const r = 28 * s
  const shimmer = 0.9 + 0.1 * Math.sin(t * 0.9)
  const aura = ctx.createRadialGradient(cx, cy - r * 0.2, r * 0.1, cx, cy, r * 2.4)
  aura.addColorStop(0, `rgba(${colors.glow},0.16)`)
  aura.addColorStop(1, `rgba(${colors.glow},0)`)
  ctx.beginPath(); ctx.arc(cx, cy, r * 2.3, 0, Math.PI * 2)
  ctx.fillStyle = aura; ctx.fill()

  ctx.beginPath()
  ctx.moveTo(cx, cy - r * 1.2)
  ctx.lineTo(cx + r * 0.72, cy - r * 0.3)
  ctx.lineTo(cx + r * 0.72, cy + r * 0.95)
  ctx.lineTo(cx - r * 0.72, cy + r * 0.95)
  ctx.lineTo(cx - r * 0.72, cy - r * 0.3)
  ctx.closePath()
  const glass = ctx.createLinearGradient(cx, cy - r * 1.2, cx, cy + r)
  glass.addColorStop(0, `rgba(235,240,255,0.28)`)
  glass.addColorStop(0.35, `rgba(${colors.glow},0.22)`)
  glass.addColorStop(1, `${colors.inner}d9`)
  ctx.fillStyle = glass
  ctx.fill()
  ctx.strokeStyle = `rgba(${colors.glow},0.52)`
  ctx.lineWidth = 1.6 * s
  ctx.stroke()

  const columns = [-0.42, 0, 0.42]
  columns.forEach((column) => {
    ctx.beginPath()
    ctx.moveTo(cx + r * column, cy - r * 0.45)
    ctx.lineTo(cx + r * column, cy + r * 0.95)
    ctx.strokeStyle = `rgba(245,248,255,0.18)`
    ctx.lineWidth = 1 * s
    ctx.stroke()
  })

  ctx.beginPath()
  ctx.arc(cx, cy - r * 0.25, r * 0.4, Math.PI, 0, false)
  ctx.strokeStyle = `rgba(245,248,255,0.25)`
  ctx.lineWidth = 1.2 * s
  ctx.stroke()

  if (avatarImage?.complete && avatarImage.naturalWidth > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(cx, cy - r * 0.92)
    ctx.lineTo(cx + r * 0.48, cy - r * 0.18)
    ctx.lineTo(cx + r * 0.48, cy + r * 0.62)
    ctx.lineTo(cx - r * 0.48, cy + r * 0.62)
    ctx.lineTo(cx - r * 0.48, cy - r * 0.18)
    ctx.closePath()
    ctx.clip()
    ctx.globalAlpha = 0.6
    ctx.drawImage(avatarImage, cx - r * 0.52, cy - r * 0.72, r * 1.04, r * 1.25)
    ctx.restore()
  }

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + t * 0.28
    const px = cx + Math.cos(angle) * r * 1.08
    const py = cy + Math.sin(angle) * r * 0.9
    ctx.beginPath()
    ctx.arc(px, py, 1.6 * s * shimmer, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${colors.glow},${0.25 + 0.18 * Math.sin(t * 1.5 + i)})`
    ctx.fill()
  }

  if (!isMe) {
    ctx.beginPath(); ctx.arc(cx + r * 0.82, cy - r * 0.65, 3 * s, 0, Math.PI * 2)
    ctx.fillStyle = online ? '#7ecf7e' : 'rgba(255,255,255,0.2)'; ctx.fill()
  }
}

function drawLotus(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, colors: HubColorSet, t: number, online: boolean, isMe: boolean, avatarImage?: HTMLImageElement) {
  const r = 28 * s
  const bloom = 0.94 + 0.06 * Math.sin(t * 0.8)
  const aura = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 2.5)
  aura.addColorStop(0, `rgba(${colors.glow},0.2)`)
  aura.addColorStop(1, `rgba(${colors.glow},0)`)
  ctx.beginPath(); ctx.arc(cx, cy, r * 2.4, 0, Math.PI * 2)
  ctx.fillStyle = aura; ctx.fill()

  for (let layer = 0; layer < 2; layer++) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + (layer === 0 ? 0 : Math.PI / 6) + Math.sin(t * 0.3 + i) * 0.04
      const petalLength = r * (layer === 0 ? 1.05 : 0.78) * bloom
      const petalWidth = r * (layer === 0 ? 0.34 : 0.24)
      ctx.save()
      ctx.translate(cx, cy + r * 0.18)
      ctx.rotate(angle)
      const petal = ctx.createLinearGradient(0, 0, 0, -petalLength)
      petal.addColorStop(0, `${colors.inner}ee`)
      petal.addColorStop(0.45, `rgba(${colors.glow},0.35)`)
      petal.addColorStop(1, 'rgba(250,250,255,0.55)')
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(petalWidth, -petalLength * 0.35, 0, -petalLength)
      ctx.quadraticCurveTo(-petalWidth, -petalLength * 0.35, 0, 0)
      ctx.closePath()
      ctx.fillStyle = petal
      ctx.fill()
      ctx.strokeStyle = `rgba(${colors.glow},0.28)`
      ctx.lineWidth = 0.9 * s
      ctx.stroke()
      ctx.restore()
    }
  }

  if (avatarImage?.complete && avatarImage.naturalWidth > 0) {
    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.06, r * 0.52, 0, Math.PI * 2); ctx.clip()
    ctx.globalAlpha = 0.72
    ctx.drawImage(avatarImage, cx - r * 0.52, cy - r * 0.58, r * 1.04, r * 1.04)
    ctx.restore()
  }

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.58)
  core.addColorStop(0, `rgba(250,245,255,0.46)`)
  core.addColorStop(0.5, `rgba(${colors.glow},0.28)`)
  core.addColorStop(1, `${colors.inner}00`)
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.58, 0, Math.PI * 2)
  ctx.fillStyle = core; ctx.fill()

  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + t * 0.5
    const px = cx + Math.cos(angle) * r * 1.2
    const py = cy + Math.sin(angle) * r * 0.62
    ctx.beginPath()
    ctx.arc(px, py, 1.5 * s, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${colors.glow},${0.22 + 0.2 * Math.sin(t * 1.7 + i)})`
    ctx.fill()
  }

  if (!isMe) {
    ctx.beginPath(); ctx.arc(cx + r * 0.82, cy - r * 0.66, 3 * s, 0, Math.PI * 2)
    ctx.fillStyle = online ? '#7ecf7e' : 'rgba(255,255,255,0.2)'; ctx.fill()
  }
}

function drawHub(ctx: CanvasRenderingContext2D, hub: Hub, sx: number, sy: number, s: number, t: number) {
  const colors = getPaletteColors(hub.paletteId, hub.colorVariant, hub.isMe)
  ctx.save()
  if (hub.isConstellated) {
    const ringRadius = 36 * s
    ctx.beginPath()
    ctx.arc(sx, sy, ringRadius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${colors.glow},0.28)`
    ctx.lineWidth = 1.2 * s
    ctx.setLineDash([4, 7])
    ctx.stroke()
    ctx.setLineDash([])

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + t * 0.28
      const px = sx + Math.cos(angle) * ringRadius
      const py = sy + Math.sin(angle) * ringRadius
      ctx.beginPath()
      ctx.arc(px, py, 1.7 * s, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,235,170,${0.35 + 0.2 * Math.sin(t * 1.4 + i)})`
      ctx.fill()
    }
  }
  switch (hub.hubStyle) {
    case 'lantern': drawLantern(ctx, sx, sy, s, colors, t, hub.online, !!hub.isMe, hub.avatarImage); break
    case 'ruin': drawRuin(ctx, sx, sy, s, colors, t, hub.online, !!hub.isMe, hub.avatarImage); break
    case 'hourglass': drawHourglass(ctx, sx, sy, s, colors, t, hub.online, !!hub.isMe, hub.avatarImage); break
    case 'telescope': drawTelescope(ctx, sx, sy, s, colors, t, hub.online, !!hub.isMe, hub.avatarImage); break
    case 'greenhouse': drawGreenhouse(ctx, sx, sy, s, colors, t, hub.online, !!hub.isMe, hub.avatarImage); break
    case 'cathedral': drawCathedral(ctx, sx, sy, s, colors, t, hub.online, !!hub.isMe, hub.avatarImage); break
    case 'lotus': drawLotus(ctx, sx, sy, s, colors, t, hub.online, !!hub.isMe, hub.avatarImage); break
    default: drawPortal(ctx, sx, sy, s, colors, t, hub.online, !!hub.isMe, hub.avatarImage)
  }
  // Hub name label
  ctx.font = `${Math.max(9, 10 * s)}px Cinzel, serif`
  ctx.fillStyle = `rgba(255,255,255,${hub.isMe ? 0.9 : 0.65})`
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText(hub.name, sx, sy + 34 * s)
  ctx.textBaseline = 'alphabetic'
  ctx.restore()
}

// ── SHOOTING STAR ──
function drawShootingStar(ctx: CanvasRenderingContext2D, star: ShootingStar) {
  if (star.tail.length < 2) return
  const alpha = star.alpha * (1 - star.age / star.maxAge)
  // Tail
  for (let i = 0; i < star.tail.length - 1; i++) {
    const t = i / star.tail.length
    ctx.beginPath()
    ctx.moveTo(star.tail[i].x, star.tail[i].y)
    ctx.lineTo(star.tail[i + 1].x, star.tail[i + 1].y)
    ctx.strokeStyle = `rgba(201,168,76,${alpha * t * 0.6})`
    ctx.lineWidth = (1 - t) * 3 + 0.5
    ctx.stroke()
  }
  // Head glow
  const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, 8)
  glow.addColorStop(0, `rgba(255,240,180,${alpha})`)
  glow.addColorStop(0.3, `rgba(201,168,76,${alpha * 0.6})`)
  glow.addColorStop(1, `rgba(201,168,76,0)`)
  ctx.beginPath(); ctx.arc(star.x, star.y, 8, 0, Math.PI * 2)
  ctx.fillStyle = glow; ctx.fill()
  // Sparkle
  ctx.beginPath(); ctx.arc(star.x, star.y, 2.5, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(255,255,220,${alpha})`; ctx.fill()
}

function drawReturnPath(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  exchangeCount: number,
  t: number,
) {
  const strength = Math.min(1, 0.45 + exchangeCount * 0.12)
  const drift = Math.sin(t * 0.8 + exchangeCount) * 10
  const controlX = (fromX + toX) / 2 + drift
  const controlY = Math.min(fromY, toY) - 36 - exchangeCount * 4

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.quadraticCurveTo(controlX, controlY, toX, toY)
  ctx.strokeStyle = `rgba(230,199,110,${0.12 * strength})`
  ctx.lineWidth = 1.2
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.quadraticCurveTo(controlX, controlY, toX, toY)
  ctx.strokeStyle = `rgba(255,238,190,${0.05 * strength})`
  ctx.lineWidth = 4
  ctx.stroke()

  const pulse = (Math.sin(t * 1.4 + exchangeCount) + 1) / 2
  const sparkleT = 0.15 + pulse * 0.7
  const sparkleX =
    (1 - sparkleT) * (1 - sparkleT) * fromX +
    2 * (1 - sparkleT) * sparkleT * controlX +
    sparkleT * sparkleT * toX
  const sparkleY =
    (1 - sparkleT) * (1 - sparkleT) * fromY +
    2 * (1 - sparkleT) * sparkleT * controlY +
    sparkleT * sparkleT * toY

  const glow = ctx.createRadialGradient(sparkleX, sparkleY, 0, sparkleX, sparkleY, 10)
  glow.addColorStop(0, `rgba(255,248,220,${0.7 * strength})`)
  glow.addColorStop(0.4, `rgba(230,199,110,${0.4 * strength})`)
  glow.addColorStop(1, 'rgba(230,199,110,0)')
  ctx.beginPath()
  ctx.arc(sparkleX, sparkleY, 10, 0, Math.PI * 2)
  ctx.fillStyle = glow
  ctx.fill()
  ctx.restore()
}

export default function UniverseMap({
  hubName, hubBio, hubAvatarUrl, hubStyle = 'portal', hubPaletteId = DEFAULT_HUB_PALETTE,
  onWriteLetter, onUniversePrompt, onObservatory, onProfile,
}: {
  hubName?: string; hubBio?: string; hubAvatarUrl?: string; hubStyle?: HubStyle; hubPaletteId?: HubPaletteId
  onWriteLetter?: (recipientName?: string) => void
  onUniversePrompt?: (prompt: { subject: string; bodyStarter: string }) => void
  onObservatory?: () => void; onProfile?: () => void
}) {
  const { isMobile, isTablet, isNarrow } = useViewport()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hubsRef = useRef<Hub[]>([])
  const offsetRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const isDraggingRef = useRef(false)
  const hasDraggedRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const touchPointRef = useRef({ x: 0, y: 0 })
  const animFrameRef = useRef<number>(0)
  const shootingStarsRef = useRef<ShootingStar[]>([])
  const starIdRef = useRef(0)
  const returnPathsRef = useRef<ReturnPathMap>({})
  const universePromptInstanceRef = useRef(0)
  const lastUniversePromptIdRef = useRef<string | null>(null)

  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [profile, setProfile] = useState<ProfileState | null>(null)
  const [starPreview, setStarPreview] = useState<ShootingStar | null>(null)
  const [activeNav, setActiveNav] = useState(0)
  const [hoveredNav, setHoveredNav] = useState<number | null>(null)
  const [returnPaths, setReturnPaths] = useState<ReturnPathMap>({})
  const [floatingPrompt, setFloatingPrompt] = useState<FloatingUniversePrompt | null>(null)

  useEffect(() => {
    returnPathsRef.current = returnPaths
  }, [returnPaths])

  // Spawn a shooting star from a universe letter
  function spawnShootingStar(
    letter?: { id: string; senderName: string; preview: string },
    origin: 'edge' | 'hub' = 'edge',
  ) {
    const canvas = canvasRef.current
    if (!canvas) return
    let x = 0; let y = 0
    let targetX = 0
    let targetY = 0

    if (origin === 'hub') {
      x = offsetRef.current.x
      y = offsetRef.current.y
      const angle = Math.random() * Math.PI * 2
      const distance = Math.max(canvas.width, canvas.height) * (0.6 + Math.random() * 0.35)
      targetX = x + Math.cos(angle) * distance
      targetY = y + Math.sin(angle) * distance
    } else {
      const edge = Math.floor(Math.random() * 4)
      if (edge === 0) { x = Math.random() * canvas.width; y = -20 }
      else if (edge === 1) { x = canvas.width + 20; y = Math.random() * canvas.height }
      else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height + 20 }
      else { x = -20; y = Math.random() * canvas.height }
      targetX = canvas.width * 0.2 + Math.random() * canvas.width * 0.6
      targetY = canvas.height * 0.2 + Math.random() * canvas.height * 0.6
    }

    const dist = Math.sqrt((targetX - x) ** 2 + (targetY - y) ** 2)
    const speed = origin === 'hub' ? 0.9 + Math.random() * 0.35 : 0.3 + Math.random() * 0.2
    const star: ShootingStar = {
      id: starIdRef.current++,
      x, y,
      vx: ((targetX - x) / dist) * speed,
      vy: ((targetY - y) / dist) * speed,
      alpha: 0.9, tail: [],
      letterId: letter?.id || '', senderName: letter?.senderName || 'A Stranger',
      preview: letter?.preview || 'A letter drifts through the universe...',
      age: 0, maxAge: dist / speed,
      clicked: false,
    }
    shootingStarsRef.current.push(star)
  }

  useEffect(() => {
    let cancelled = false
    let universeLetters: { id: string; senderName: string; preview: string }[] = []

    async function refreshUniverseLetters() {
      const letters = await getUniverseLetters()
      if (!cancelled) {
        universeLetters = letters.filter(letter => letter.preview.trim().length > 0)
      }
    }

    function spawnRealStar() {
      if (universeLetters.length === 0) return
      const letter = universeLetters[Math.floor(Math.random() * universeLetters.length)]
      spawnShootingStar(letter)
    }

    const initial = setTimeout(() => {
      void refreshUniverseLetters().then(spawnRealStar)
    }, 3000)

    const interval = setInterval(() => {
      void refreshUniverseLetters().then(spawnRealStar)
    }, 20000)

    return () => {
      cancelled = true
      clearInterval(interval)
      clearTimeout(initial)
    }
  }, [])

  useEffect(() => {
    function handleUniverseLetterSent(event: Event) {
      const detail = (event as CustomEvent<UniverseLetterStarEventDetail>).detail
      if (!detail?.preview?.trim()) return
      spawnShootingStar(detail, 'hub')
    }

    window.addEventListener(
      'dear-stranger:universe-letter-sent',
      handleUniverseLetterSent as EventListener,
    )

    return () => {
      window.removeEventListener(
        'dear-stranger:universe-letter-sent',
        handleUniverseLetterSent as EventListener,
      )
    }
  }, [])

  const spawnFloatingPrompt = useCallback(() => {
    if (typeof window === 'undefined' || UNIVERSE_PROMPTS.length === 0) return

    const promptPool = UNIVERSE_PROMPTS.filter(
      (prompt) => prompt.id !== lastUniversePromptIdRef.current,
    )
    const nextPrompt =
      (promptPool.length > 0 ? promptPool : UNIVERSE_PROMPTS)[
        Math.floor(Math.random() * (promptPool.length > 0 ? promptPool.length : UNIVERSE_PROMPTS.length))
      ]

    lastUniversePromptIdRef.current = nextPrompt.id

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const maxWidth = Math.min(isMobile ? viewportWidth - 64 : viewportWidth * 0.24, isMobile ? 280 : 300)

    const horizontalZones = isMobile
      ? [{ min: 24, max: Math.max(48, viewportWidth - maxWidth - 24), align: 'left' as const }]
      : [
          { min: viewportWidth * 0.08, max: viewportWidth * 0.24, align: 'left' as const },
          { min: viewportWidth * 0.37, max: viewportWidth * 0.63, align: 'center' as const },
          { min: viewportWidth * 0.76, max: viewportWidth * 0.92, align: 'right' as const },
        ]
    const verticalZones = isMobile
      ? [
          { min: viewportHeight * 0.12, max: viewportHeight * 0.22 },
          { min: viewportHeight * 0.3, max: viewportHeight * 0.42 },
          { min: viewportHeight * 0.5, max: viewportHeight * 0.62 },
        ]
      : [
          { min: viewportHeight * 0.12, max: viewportHeight * 0.24 },
          { min: viewportHeight * 0.3, max: viewportHeight * 0.46 },
          { min: viewportHeight * 0.52, max: viewportHeight * 0.68 },
        ]

    const horizontalZone =
      horizontalZones[Math.floor(Math.random() * horizontalZones.length)]
    const verticalZone = verticalZones[Math.floor(Math.random() * verticalZones.length)]
    const align = horizontalZone.align
    const left = horizontalZone.min + Math.random() * Math.max(12, horizontalZone.max - horizontalZone.min)
    const top = verticalZone.min + Math.random() * Math.max(12, verticalZone.max - verticalZone.min)

    setFloatingPrompt({
      ...nextPrompt,
      instanceId: universePromptInstanceRef.current++,
      left,
      top,
      driftX: (Math.random() - 0.5) * (isMobile ? 26 : 54),
      driftY: (Math.random() - 0.5) * (isMobile ? 32 : 60),
      maxWidth,
      align,
    })
  }, [isMobile])

  useEffect(() => {
    if (!onUniversePrompt) return

    spawnFloatingPrompt()
    const interval = setInterval(spawnFloatingPrompt, 14000)

    return () => clearInterval(interval)
  }, [onUniversePrompt, spawnFloatingPrompt])

  useEffect(() => {
    let resizeHandler: (() => void) | undefined
    async function init() {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      resizeHandler = () => {
        canvas.width = window.innerWidth; canvas.height = window.innerHeight
        offsetRef.current = { x: canvas.width / 2, y: canvas.height / 2 }
      }
      resizeHandler()
      window.addEventListener('resize', resizeHandler)

      const [realHubs, myLetters] = await Promise.all([getAllHubs(), getMyLetters()])
      const myAvatarImg = hubAvatarUrl ? await loadImage(hubAvatarUrl) : undefined

      const sentCounts = new Map<string, number>()
      const receivedCounts = new Map<string, number>()
      const allLetters = [...myLetters.transit, ...myLetters.arrived, ...myLetters.archive] as Array<{
        sender_id?: string | null
        recipient_id?: string | null
      }>

      allLetters.forEach((letter) => {
        if (letter.recipient_id) {
          sentCounts.set(letter.recipient_id, (sentCounts.get(letter.recipient_id) || 0) + 1)
        }

        if (letter.sender_id) {
          receivedCounts.set(letter.sender_id, (receivedCounts.get(letter.sender_id) || 0) + 1)
        }
      })

      const reciprocalPaths = realHubs.reduce<ReturnPathMap>((acc, hub: HubRecord) => {
        const sent = sentCounts.get(hub.id) || 0
        const received = receivedCounts.get(hub.id) || 0

        if (sent > 0 && received > 0) {
          acc[hub.id] = sent + received
        }

        return acc
      }, {})

      returnPathsRef.current = reciprocalPaths
      setReturnPaths(reciprocalPaths)

      const otherHubs = await Promise.all(realHubs.map(async (hub: HubRecord, i: number) => {
        const angle = (i / Math.max(realHubs.length, 1)) * Math.PI * 2 + 0.3
        const dist = 180 + (i * 73) % 320
        const avatarImg = hub.avatar_url ? await loadImage(hub.avatar_url) : undefined
        const styles: HubStyle[] = ['portal', 'lantern', 'ruin', 'hourglass', 'telescope', 'greenhouse', 'cathedral', 'lotus']
        return {
          id: hub.id,
          x: Math.cos(angle) * dist, y: Math.sin(angle) * dist,
          name: hub.hub_name || 'Unknown Hub', bio: hub.bio || '', askAbout: hub.ask_about || '',
          avatarUrl: hub.avatar_url || '', avatarImage: avatarImg,
          online: hub.online ?? true, pulse: 0,
          size: 0.9 + (i * 17 % 10) / 30,
          floatOffset: (i * 137) % (Math.PI * 2),
          floatSpeed: 0.4 + (i * 23 % 10) / 30,
          colorVariant: i % LEGACY_PORTAL_COLORS.length,
          hubStyle: (hub.hub_style as HubStyle) || styles[i % styles.length],
          paletteId: hub.backdrop_id || null,
        } as Hub
      }))

      hubsRef.current = [{
  id: 'me',
  x: 0,
  y: 0,
  name: hubName || 'Your Hub',
  bio: hubBio || 'A wanderer who arrived here quietly, carrying something unspoken.',
  avatarUrl: hubAvatarUrl || '',
  avatarImage: myAvatarImg,
  online: true,
  pulse: 0,
  size: 1.1,
  isMe: true,
  floatOffset: 0,
  floatSpeed: 0.5,
  colorVariant: 0,
  hubStyle,
  paletteId: hubPaletteId,
  isConstellated: false,
}, ...otherHubs]

      // Star field background
      const starCanvas = document.createElement('canvas')
      starCanvas.width = canvas.width; starCanvas.height = canvas.height
      const sCtx = starCanvas.getContext('2d')!
      for (let i = 0; i < Math.floor((canvas.width * canvas.height) / 2600); i++) {
        sCtx.beginPath()
        sCtx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 1.1, 0, Math.PI * 2)
        sCtx.fillStyle = `rgba(255,255,255,${Math.random() * 0.55 + 0.08})`
        sCtx.fill()
      }

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(starCanvas, 0, 0)
        const t = Date.now() * 0.001
        const offset = offsetRef.current; const scale = scaleRef.current

        hubsRef.current
          .filter((hub) => !hub.isMe && returnPathsRef.current[hub.id])
          .forEach((hub) => {
            const sx = offset.x + hub.x * scale
            const sy = offset.y + hub.y * scale + Math.sin(t * hub.floatSpeed + hub.floatOffset) * 4
            if (sx < -220 || sx > canvas.width + 220 || sy < -220 || sy > canvas.height + 220) return
            drawReturnPath(
              ctx,
              offset.x,
              offset.y,
              sx,
              sy,
              returnPathsRef.current[hub.id],
              t,
            )
          })

        // Draw hubs
        hubsRef.current.forEach(hub => {
          const sx = offset.x + hub.x * scale
          const sy = offset.y + hub.y * scale
          if (sx < -200 || sx > canvas.width + 200 || sy < -200 || sy > canvas.height + 200) return
          const floatY = Math.sin(t * hub.floatSpeed + hub.floatOffset) * 4
          const s = hub.size * scale
          drawHub(ctx, hub, sx, sy + floatY, s, t)
        })

        // Update & draw shooting stars
        shootingStarsRef.current = shootingStarsRef.current.filter(star => {
          if (star.clicked) return false
          star.age++
          if (star.age > star.maxAge + 60) return false
          star.tail.push({ x: star.x, y: star.y })
          if (star.tail.length > 30) star.tail.shift()
          if (star.age <= star.maxAge) {
            star.x += star.vx; star.y += star.vy
          } else {
            // Fade out hovering
            star.alpha *= 0.98
          }
          drawShootingStar(ctx, star)
          return true
        })

        animFrameRef.current = requestAnimationFrame(draw)
      }
      draw()
    }
    void init()
    return () => { cancelAnimationFrame(animFrameRef.current); if (resizeHandler) window.removeEventListener('resize', resizeHandler) }
  }, [hubName, hubBio, hubAvatarUrl, hubStyle, hubPaletteId])

  const getHubAt = useCallback((mx: number, my: number): Hub | null => {
    const scale = scaleRef.current; const offset = offsetRef.current
    let found: Hub | null = null
    hubsRef.current.forEach(hub => {
      const sx = offset.x + hub.x * scale; const sy = offset.y + hub.y * scale
      const r = 32 * hub.size * scale
      if (Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2) < r) found = hub
    })
    return found
  }, [])

  const getStarAt = useCallback((mx: number, my: number): ShootingStar | null => {
    return shootingStarsRef.current.find(star => {
      return Math.sqrt((mx - star.x) ** 2 + (my - star.y) ** 2) < 20
    }) || null
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true; hasDraggedRef.current = false
    dragStartRef.current = { x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = Math.abs(e.clientX - (dragStartRef.current.x + offsetRef.current.x))
    const dy = Math.abs(e.clientY - (dragStartRef.current.y + offsetRef.current.y))
    if (isDraggingRef.current && (dx > 4 || dy > 4)) {
      hasDraggedRef.current = true
      offsetRef.current = { x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y }
      setTooltip(null); return
    }
    if (!isDraggingRef.current) {
      const hub = getHubAt(e.clientX, e.clientY)
      if (hub) {
        setTooltip({ hub, sx: offsetRef.current.x + hub.x * scaleRef.current, sy: offsetRef.current.y + hub.y * scaleRef.current, scale: scaleRef.current })
      } else setTooltip(null)
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!hasDraggedRef.current) {
      // Check shooting star click first
      const star = getStarAt(e.clientX, e.clientY)
      if (star) { setStarPreview(star); isDraggingRef.current = false; return }
      const hub = getHubAt(e.clientX, e.clientY)
      if (hub) {
        const isTelescope = hub.hubStyle === 'telescope'
        playUiSound('focus')
        setProfile({ hub, screenX: e.clientX, screenY: e.clientY, telescopeMode: isTelescope })
        setTooltip(null)
      } else setProfile(null)
    }
    isDraggingRef.current = false
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    scaleRef.current = Math.min(3.5, Math.max(0.25, scaleRef.current * (e.deltaY > 0 ? 0.88 : 1.12)))
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    isDraggingRef.current = true
    hasDraggedRef.current = false
    dragStartRef.current = { x: touch.clientX - offsetRef.current.x, y: touch.clientY - offsetRef.current.y }
    touchPointRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return

    const dx = Math.abs(touch.clientX - touchPointRef.current.x)
    const dy = Math.abs(touch.clientY - touchPointRef.current.y)

    if (isDraggingRef.current && (dx > 4 || dy > 4)) {
      hasDraggedRef.current = true
      offsetRef.current = {
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      }
      touchPointRef.current = { x: touch.clientX, y: touch.clientY }
      setTooltip(null)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0]
    if (!touch) return

    if (!hasDraggedRef.current) {
      const star = getStarAt(touch.clientX, touch.clientY)
      if (star) {
        setStarPreview(star)
        isDraggingRef.current = false
        return
      }

      const hub = getHubAt(touch.clientX, touch.clientY)
      if (hub) {
        playUiSound('focus')
        setProfile({
          hub,
          screenX: touch.clientX,
          screenY: touch.clientY,
          telescopeMode: hub.hubStyle === 'telescope',
        })
      } else {
        setProfile(null)
      }
    }

    isDraggingRef.current = false
  }

  const navItems = [
    { label: 'Starmap', icon: '✦' },
    { label: 'Scribe', icon: '✒' },
    { label: 'Observatory', icon: '⟡' },
    { label: 'Profile', icon: '◎' },
  ]
  const profileReturnPathCount = profile ? returnPaths[profile.hub.id] || 0 : 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#04050f' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 40% at 15% 25%, rgba(50,20,100,0.28) 0%, transparent 65%), radial-gradient(ellipse 50% 55% at 82% 72%, rgba(15,28,90,0.22) 0%, transparent 65%)' }} />

      <canvas ref={canvasRef}
        style={{ position: 'absolute', inset: 0, cursor: isMobile ? 'default' : tooltip?.hub?.hubStyle === 'telescope' ? 'zoom-in' : 'grab', touchAction: 'none' }}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        onMouseLeave={() => { isDraggingRef.current = false; setTooltip(null) }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { isDraggingRef.current = false }}
        onWheel={handleWheel} />

      {/* Tooltip */}
      <AnimatePresence>
        {onUniversePrompt && floatingPrompt && !profile && !starPreview && (
          <motion.button
            key={`floating-prompt-${floatingPrompt.instanceId}`}
            initial={{ opacity: 0, x: 0, y: 10 }}
            animate={{
              opacity: [0, 0.7, 0.7, 0],
              x: [0, floatingPrompt.driftX * 0.45, floatingPrompt.driftX],
              y: [10, floatingPrompt.driftY * 0.55, floatingPrompt.driftY],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 13.5, ease: 'easeInOut' }}
            onClick={() => {
              playUiSound('open')
              onUniversePrompt?.({
                subject: floatingPrompt.subject,
                bodyStarter: floatingPrompt.bodyStarter,
              })
            }}
            style={{
              position: 'fixed',
              left: floatingPrompt.left,
              top: floatingPrompt.top,
              transform:
                floatingPrompt.align === 'center'
                  ? 'translateX(-50%)'
                  : floatingPrompt.align === 'right'
                    ? 'translateX(-100%)'
                    : 'none',
              width: floatingPrompt.maxWidth,
              background: 'transparent',
              border: 'none',
              padding: 0,
              textAlign: floatingPrompt.align,
              cursor: 'pointer',
              zIndex: 40,
            }}
          >
            <p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: isMobile ? '7px' : '8px',
                letterSpacing: '0.24em',
                color: 'rgba(201,168,76,0.42)',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              {floatingPrompt.title}
            </p>
            <p
              style={{
                fontFamily: "'IM Fell English', serif",
                fontStyle: 'italic',
                fontSize: isMobile ? '17px' : 'clamp(18px, 1.45vw, 24px)',
                lineHeight: 1.42,
                color: 'rgba(255,255,255,0.64)',
                textShadow: '0 0 14px rgba(0,0,0,0.24)',
              }}
            >
              {floatingPrompt.prompt}
            </p>
          </motion.button>
        )}

        {tooltip && !profile && !isMobile && (
          <motion.div key="tip" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ position: 'fixed', left: tooltip.sx, top: tooltip.sy - tooltip.hub.size * tooltip.scale * 48, transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 60 }}>
            <div style={{ background: 'rgba(8,10,28,0.92)', border: `1px solid ${tooltip.hub.isMe ? 'rgba(230,199,110,0.55)' : 'rgba(255,255,255,0.2)'}`, borderRadius: '20px', padding: '6px 16px', backdropFilter: 'blur(12px)' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.18em', color: tooltip.hub.isMe ? '#e6c76e' : 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap' }}>
                {tooltip.hub.name}
                {tooltip.hub.hubStyle === 'telescope' && <span style={{ fontSize: '8px', opacity: 0.6, marginLeft: '6px' }}>· click to zoom</span>}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shooting Star Preview */}
      <AnimatePresence>
        {starPreview && (
          <motion.div key="star-preview" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            onClick={() => setStarPreview(null)}
            style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, background: 'rgba(0,0,5,0.7)', backdropFilter: 'blur(6px)', padding: isMobile ? '16px' : 0 }}>
            <motion.div onClick={e => e.stopPropagation()}
              style={{ background: 'rgba(8,10,28,0.95)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '12px', padding: isMobile ? '28px 22px' : '36px 40px', width: 'min(480px, 100%)', boxShadow: '0 0 60px rgba(201,168,76,0.15)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)' }} />
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: '8px' }}>✦ Universe Letter</p>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.7)', marginBottom: '20px' }}>From · {starPreview.senderName}</p>
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '18px', color: 'rgba(255,255,255,0.88)', lineHeight: 1.7, marginBottom: '28px' }}>
                &ldquo;{starPreview.preview}&rdquo;
              </p>
              <div style={{ display: 'flex', gap: '10px', flexDirection: isNarrow ? 'column' : 'row' }}>
                <button onClick={() => setStarPreview(null)}
                  style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.5)', padding: '10px 18px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', borderRadius: '4px' }}>
                  Let it pass
                </button>
                <button onClick={() => { setStarPreview(null); onWriteLetter?.() }}
                  style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: '#c9a84c', padding: '10px 18px', border: '1px solid rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.08)', cursor: 'pointer', textTransform: 'uppercase', borderRadius: '4px' }}>
                  Reply into the universe ✦
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hub Profile Card — Telescope gets zoom effect */}
      <AnimatePresence>
        {profile && (
          <motion.div key="profile"
            initial={{ opacity: 0, scale: profile.telescopeMode ? 0.3 : 0.95, y: profile.telescopeMode ? 0 : 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: profile.telescopeMode ? 0.3 : 0.95 }}
            transition={{ duration: profile.telescopeMode ? 0.5 : 0.3, ease: profile.telescopeMode ? [0.16, 1, 0.3, 1] : 'easeOut' }}
            style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: isMobile ? '16px' : '20px', background: 'rgba(0,0,5,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setProfile(null)}>
            <motion.div onClick={e => e.stopPropagation()}
              style={{ background: 'rgba(8,10,28,0.95)', border: '1px solid rgba(230,199,110,0.22)', borderRadius: '16px', width: 'min(780px, 100%)', maxHeight: isMobile ? 'calc(100svh - 32px)' : '90vh', minHeight: isMobile ? undefined : '380px', display: 'flex', flexDirection: isTablet ? 'column' : 'row', overflow: 'hidden', boxShadow: '0 0 80px rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)', position: 'relative' }}>
              {/* Avatar panel */}
              <div style={{ width: isTablet ? '100%' : '42%', minHeight: isTablet ? '260px' : '380px', background: 'linear-gradient(135deg, rgba(20,25,60,0.9), rgba(10,15,40,0.95))', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                {profile.hub.avatarUrl ? (
                  <img src={profile.hub.avatarUrl} alt="Avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', position: 'absolute', inset: 0 }} />
                ) : (
                  <div style={{ fontSize: '48px', color: 'rgba(201,168,76,0.5)' }}>✦</div>
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, rgba(8,10,28,0.95) 100%)' }} />
                {profile.telescopeMode && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                    style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '20px', padding: '4px 10px' }}>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '7px', letterSpacing: '0.25em', color: 'rgba(201,168,76,0.8)', textTransform: 'uppercase' }}>⟡ Magnified</p>
                  </motion.div>
                )}
              </div>
              {/* Info panel */}
              <div style={{ flex: 1, padding: 'clamp(24px,4vw,40px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowY: 'auto' }}>
                <div>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.4em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    {HUB_STYLES.find(s => s.id === profile.hub.hubStyle)?.label || 'Hub'}
                  </p>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(18px,2.5vw,26px)', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.95)', marginBottom: '8px' }}>{profile.hub.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: profile.hub.online ? '#7ecf7e' : 'rgba(255,255,255,0.3)', boxShadow: profile.hub.online ? '0 0 6px rgba(126,207,126,0.6)' : 'none' }} />
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: profile.hub.online ? 'rgba(126,207,126,0.9)' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                      {profile.hub.online ? 'online' : 'away'}
                    </span>
                  </div>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '8px' }}>Bio</p>
                  <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(13px,1.8vw,15px)', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, marginBottom: '20px' }}>{profile.hub.bio}</p>
                  {!profile.hub.isMe && profile.hub.askAbout && (
                    <>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '8px' }}>Ask me about</p>
                      <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(13px,1.8vw,15px)', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>{profile.hub.askAbout}</p>
                    </>
                  )}
                  {!profile.hub.isMe && profileReturnPathCount > 0 && (
                    <div style={{ marginTop: '20px', padding: '10px 12px', border: '1px solid rgba(230,199,110,0.12)', borderRadius: '10px', background: 'rgba(230,199,110,0.05)' }}>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.22em', color: '#e6c76e', textTransform: 'uppercase', marginBottom: '6px' }}>Return Path</p>
                      <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                        A path already glows between your hubs through {profileReturnPathCount} exchanged {profileReturnPathCount === 1 ? 'letter' : 'letters'}.
                      </p>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
                  <button onClick={() => setProfile(null)}
                    style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.65)', padding: '10px 18px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }}>
                    Dismiss
                  </button>
                  {!profile.hub.isMe && (
                    <button onClick={() => { setProfile(null); onWriteLetter?.(profile.hub.name) }}
                      style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.25em', color: '#e6c76e', padding: '10px 18px', border: '1px solid rgba(230,199,110,0.4)', borderRadius: '4px', background: 'rgba(230,199,110,0.08)', cursor: 'pointer', textTransform: 'uppercase' }}>
                      ✦ Send a Letter
                    </button>
                  )}
                </div>
              </div>
              <button onClick={() => setProfile(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <motion.nav initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}
        style={{ position: 'fixed', bottom: isMobile ? 'max(12px, env(safe-area-inset-bottom))' : '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: isMobile ? '2px' : '4px', background: 'rgba(8,10,28,0.86)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(20px)', padding: isMobile ? '8px 6px' : '8px 12px', boxShadow: '0 4px 40px rgba(0,0,0,0.6)', zIndex: 50, width: 'fit-content', maxWidth: 'min(calc(100vw - 20px), 460px)' }}>
        {navItems.map((item, i) => (
          <button key={item.label}
            onClick={() => {
              playUiSound(i === 0 ? 'select' : 'open')
              setActiveNav(i)
              if (i === 1) onWriteLetter?.()
              if (i === 2) onObservatory?.()
              if (i === 3) onProfile?.()
            }}
            onMouseEnter={() => setHoveredNav(i)} onMouseLeave={() => setHoveredNav(null)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: isMobile ? '10px 10px' : '10px 18px', background: activeNav === i ? 'rgba(230,199,110,0.1)' : hoveredNav === i ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: '10px', cursor: 'pointer', minWidth: isMobile ? '64px' : '64px' }}>
            <span style={{ fontSize: isMobile ? '16px' : '18px', lineHeight: 1, color: activeNav === i ? '#e6c76e' : 'rgba(255,255,255,0.75)', filter: activeNav === i ? 'drop-shadow(0 0 6px rgba(230,199,110,0.5))' : 'none' }}>{item.icon}</span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: isMobile ? '7px' : '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: activeNav === i ? '#e6c76e' : 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>{item.label}</span>
          </button>
        ))}
      </motion.nav>

      {isMobile && (
        <div style={{ position: 'fixed', right: '12px', bottom: 'calc(max(12px, env(safe-area-inset-bottom)) + 78px)', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 50 }}>
          {['+', '-'].map((label) => (
            <button
              key={label}
              onClick={() => {
                const multiplier = label === '+' ? 1.18 : 0.84
                scaleRef.current = Math.min(3.5, Math.max(0.25, scaleRef.current * multiplier))
              }}
              style={{ width: '42px', height: '42px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(8,10,28,0.9)', color: '#e6c76e', fontFamily: "'Cinzel', serif", fontSize: '20px', lineHeight: 1, cursor: 'pointer', backdropFilter: 'blur(16px)' }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.8 }}
        style={{ position: 'fixed', top: isMobile ? 'max(16px, env(safe-area-inset-top))' : '28px', left: '50%', transform: 'translateX(-50%)', fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', pointerEvents: 'none', whiteSpace: isMobile ? 'normal' : 'nowrap', textAlign: 'center', width: isMobile ? 'calc(100vw - 96px)' : 'auto', zIndex: 50 }}>
        {isMobile ? 'drag to explore · tap hubs · use +/- to zoom' : 'drag to explore · scroll to zoom · catch shooting stars'}
      </motion.p>
    </div>
  )
}
