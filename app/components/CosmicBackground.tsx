'use client'

import { useEffect, useRef } from 'react'

// Deterministic pseudo-random — same stars on every load
function sr(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

export default function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animFrame: number
    let offscreen: HTMLCanvasElement | null = null

    interface Twinkler { x: number; y: number; r: number; alpha: number; phase: number; speed: number; warm: boolean }
    let twinklers: Twinkler[] = []

    function buildOffscreen(W: number, H: number): HTMLCanvasElement {
      const oc = document.createElement('canvas')
      oc.width = W; oc.height = H
      const c = oc.getContext('2d')!

      // Deep space base
      c.fillStyle = '#06040e'
      c.fillRect(0, 0, W, H)

      // Nebula clouds — large soft radial blobs
      const nebulae = [
        { xr: 0.08, yr: 0.28, r: H * 0.55, col: 'rgba(65,12,130,0.16)', sx: 1.9, sy: 0.65 },
        { xr: 0.80, yr: 0.70, r: H * 0.50, col: 'rgba(12,40,165,0.13)', sx: 1.3, sy: 0.85 },
        { xr: 0.48, yr: 0.06, r: H * 0.38, col: 'rgba(95,18,88,0.11)', sx: 2.1, sy: 0.45 },
        { xr: 0.92, yr: 0.16, r: H * 0.32, col: 'rgba(18,75,148,0.12)', sx: 0.85, sy: 1.55 },
        { xr: 0.25, yr: 0.90, r: H * 0.42, col: 'rgba(55,8,110,0.11)', sx: 1.6, sy: 0.60 },
        { xr: 0.62, yr: 0.48, r: H * 0.28, col: 'rgba(35,10,80,0.08)', sx: 1.0, sy: 1.0 },
      ]
      nebulae.forEach(n => {
        c.save()
        c.translate(n.xr * W, n.yr * H)
        c.scale(n.sx, n.sy)
        const grd = c.createRadialGradient(0, 0, 0, 0, 0, n.r)
        grd.addColorStop(0, n.col)
        grd.addColorStop(1, 'transparent')
        c.beginPath(); c.arc(0, 0, n.r, 0, Math.PI * 2)
        c.fillStyle = grd; c.fill()
        c.restore()
      })

      // ── Milky Way band ──
      const angle = -26 * Math.PI / 180
      c.save()
      c.translate(W / 2, H / 2)
      c.rotate(angle)

      // Outer haze
      const bw = H * 0.32
      const og = c.createLinearGradient(0, -bw, 0, bw)
      og.addColorStop(0, 'transparent')
      og.addColorStop(0.28, 'rgba(110,90,180,0.055)')
      og.addColorStop(0.5, 'rgba(145,125,210,0.10)')
      og.addColorStop(0.72, 'rgba(110,90,180,0.055)')
      og.addColorStop(1, 'transparent')
      c.fillStyle = og; c.fillRect(-W, -bw, W * 2, bw * 2)

      // Inner luminous core
      const cw = H * 0.052
      const cg = c.createLinearGradient(0, -cw, 0, cw)
      cg.addColorStop(0, 'transparent')
      cg.addColorStop(0.35, 'rgba(195,188,240,0.07)')
      cg.addColorStop(0.5, 'rgba(220,215,255,0.13)')
      cg.addColorStop(0.65, 'rgba(195,188,240,0.07)')
      cg.addColorStop(1, 'transparent')
      c.fillStyle = cg; c.fillRect(-W, -cw, W * 2, cw * 2)

      // Dark dust lane down the centre of the core
      const dw = H * 0.010
      const dg = c.createLinearGradient(0, -dw, 0, dw)
      dg.addColorStop(0, 'transparent')
      dg.addColorStop(0.5, 'rgba(4,2,10,0.28)')
      dg.addColorStop(1, 'transparent')
      c.fillStyle = dg; c.fillRect(-W, -dw, W * 2, dw * 2)

      c.restore()

      // ── Tiny distant stars ──
      for (let i = 0; i < 520; i++) {
        const x = sr(i * 3 + 1) * W
        const y = sr(i * 7 + 2) * H
        const r = sr(i * 11 + 3) * 0.6 + 0.18
        const a = sr(i * 13 + 5) * 0.30 + 0.07
        const warm = sr(i * 17 + 6) < 0.12
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2)
        c.fillStyle = warm ? `rgba(255,238,210,${a})` : `rgba(218,214,255,${a})`
        c.fill()
      }

      // ── Medium stars ──
      for (let i = 0; i < 100; i++) {
        const x = sr(i * 17 + 600) * W
        const y = sr(i * 19 + 601) * H
        const r = sr(i * 23 + 602) * 0.65 + 0.62
        const a = sr(i * 29 + 603) * 0.26 + 0.30
        const warm = sr(i * 31 + 604) < 0.15
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2)
        c.fillStyle = warm ? `rgba(255,235,195,${a})` : `rgba(225,222,255,${a})`
        c.fill()
      }

      // ── Dense stars along the Milky Way band ──
      const cos = Math.cos(angle); const sin = Math.sin(angle)
      let placed = 0
      for (let i = 0; placed < 750 && i < 4000; i++) {
        const bx = (sr(i * 59 + 900) - 0.5) * W * 2.5
        const by = (sr(i * 61 + 901) - 0.5) * H * 0.55
        const spread = H * 0.115
        const weight = Math.exp(-(by * by) / (2 * spread * spread))
        if (sr(i * 67 + 902) > weight * 0.82) continue
        const sx = W / 2 + bx * cos - by * sin
        const sy = H / 2 + bx * sin + by * cos
        if (sx < 0 || sx > W || sy < 0 || sy > H) continue
        const r = sr(i * 71 + 903) * 0.38 + 0.14
        const a = sr(i * 73 + 904) * 0.26 + 0.09
        c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2)
        c.fillStyle = `rgba(232,228,255,${a})`
        c.fill()
        placed++
      }

      return oc
    }

    function buildTwinklers(W: number, H: number) {
      twinklers = []
      for (let i = 0; i < 18; i++) {
        twinklers.push({
          x: sr(i * 31 + 700) * W,
          y: sr(i * 37 + 701) * H,
          r: sr(i * 41 + 702) * 1.1 + 1.2,
          alpha: sr(i * 43 + 703) * 0.20 + 0.62,
          phase: sr(i * 47 + 704) * Math.PI * 2,
          speed: sr(i * 53 + 705) * 0.32 + 0.10,
          warm: sr(i * 57 + 706) < 0.25,
        })
      }
    }

    function drawTwinkler(s: Twinkler, a: number) {
      // Soft halo
      const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5.5)
      const baseCol = s.warm ? `255,238,200` : `218,214,255`
      grd.addColorStop(0, `rgba(${baseCol},${a * 0.42})`)
      grd.addColorStop(1, 'transparent')
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 5.5, 0, Math.PI * 2)
      ctx.fillStyle = grd; ctx.fill()
      // Core
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fillStyle = s.warm ? `rgba(255,248,230,${a})` : `rgba(242,240,255,${a})`
      ctx.fill()
      // 4-point diffraction spike
      ctx.save()
      ctx.globalAlpha = a * 0.22
      ctx.strokeStyle = s.warm ? 'rgba(255,230,180,1)' : 'rgba(220,218,255,1)'
      ctx.lineWidth = 0.6
      const sp = s.r * 7.5
      ctx.beginPath(); ctx.moveTo(s.x - sp, s.y); ctx.lineTo(s.x + sp, s.y); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(s.x, s.y - sp); ctx.lineTo(s.x, s.y + sp); ctx.stroke()
      ctx.restore()
    }

    function init() {
      const W = window.innerWidth
      const H = window.innerHeight
      canvas!.width = W; canvas!.height = H
      offscreen = buildOffscreen(W, H)
      buildTwinklers(W, H)
    }

    function animate() {
      const W = canvas!.width; const H = canvas!.height
      ctx.clearRect(0, 0, W, H)
      if (offscreen) ctx.drawImage(offscreen, 0, 0)
      const t = Date.now() * 0.001
      twinklers.forEach(s => {
        const a = s.alpha * (0.55 + 0.45 * Math.sin(t * s.speed * 4.2 + s.phase))
        drawTwinkler(s, a)
      })
      animFrame = requestAnimationFrame(animate)
    }

    init()
    animFrame = requestAnimationFrame(animate)

    const onResize = () => { cancelAnimationFrame(animFrame); init(); animFrame = requestAnimationFrame(animate) }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(animFrame); window.removeEventListener('resize', onResize) }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
    />
  )
}
