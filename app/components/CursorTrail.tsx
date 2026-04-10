'use client'

import { useEffect, useRef, useState } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  gold: boolean
}

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isTouch, setIsTouch] = useState<boolean | null>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)')
    const updateIsTouch = () => setIsTouch(mediaQuery.matches)
    updateIsTouch()

    const handleChange = () => updateIsTouch()
    mediaQuery.addEventListener?.('change', handleChange)

    // Skip the canvas entirely on touch / coarse-pointer devices (mobile, tablet)
    if (mediaQuery.matches) {
      return () => mediaQuery.removeEventListener?.('change', handleChange)
    }

    const canvas = canvasRef.current
    if (!canvas) {
      return () => mediaQuery.removeEventListener?.('change', handleChange)
    }
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: Particle[] = []

    const onMove = (e: MouseEvent) => {
      for (let i = 0; i < 4; i++) {
        particles.push({
          x: e.clientX + (Math.random() - 0.5) * 10,
          y: e.clientY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -Math.random() * 0.9 - 0.1,
          life: 1,
          size: Math.random() * 2 + 0.6,
          gold: Math.random() > 0.35,
        })
      }
    }
    window.addEventListener('mousemove', onMove)

    let frame: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.028
        if (p.life <= 0) { particles.splice(i, 1); continue }
        const alpha = p.life * 0.65
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fillStyle = p.gold
          ? `rgba(201,168,76,${alpha})`
          : `rgba(255,255,255,${alpha * 0.55})`
        ctx.fill()
      }
      frame = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      mediaQuery.removeEventListener?.('change', handleChange)
    }
  }, [])

  if (isTouch !== false) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  )
}
