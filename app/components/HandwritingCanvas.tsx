'use client'

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'

export interface HandwritingCanvasRef {
  toBlob: () => Promise<Blob | null>
  toDataURL: () => string
  isEmpty: () => boolean
  clear: () => void
}

interface Props {
  width?: number
  height?: number
  inkColor?: string
  lineWidth?: number
  style?: React.CSSProperties
  allowFingerDraw?: boolean
}

interface Point {
  x: number
  y: number
  pressure: number
  time: number
}

// ── Catmull-Rom spline: smoother than quadratic bezier ──
function catmullRomPoint(
  p0: Point, p1: Point, p2: Point, p3: Point, t: number
): { x: number; y: number } {
  const t2 = t * t
  const t3 = t2 * t
  return {
    x: 0.5 * (
      2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    ),
    y: 0.5 * (
      2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    ),
  }
}

const HandwritingCanvas = forwardRef<HandwritingCanvasRef, Props>(function HandwritingCanvas(
  { width = 600, height = 400, inkColor = '#1a1208', lineWidth = 1.8, style, allowFingerDraw = false },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')

  // Point buffer for Catmull-Rom — needs 4 points minimum
  const pointsRef = useRef<Point[]>([])
  const historyRef = useRef<ImageData[]>([])
  const dprRef = useRef(1)
  const activePointerIdRef = useRef<number | null>(null)

  const getInputKind = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const touchType = String((e.nativeEvent as PointerEvent & { touchType?: string }).touchType || '').toLowerCase()
    if (e.pointerType === 'pen' || touchType === 'stylus') return 'pen'
    if (e.pointerType === 'mouse') return 'mouse'
    return 'touch'
  }, [])

  const canDrawWithEvent = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const kind = getInputKind(e)
    if (kind === 'pen' || kind === 'mouse') return true
    return allowFingerDraw
  }, [allowFingerDraw, getInputKind])

  // ── Init canvas with correct DPR once ──
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1
    dprRef.current = dpr

    const w = container.clientWidth || width
    const h = Math.max(height, Math.floor(w * 0.65))

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [width, height])

  const getPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0, pressure: 0.5, time: Date.now() }
    const rect = canvas.getBoundingClientRect()

    // Apple Pencil sends real pressure (0–1). Mouse/finger sends 0 or 0.5.
    let pressure = e.pressure
    if (pressure < 0.01 || isNaN(pressure)) pressure = 0.5
    // Soften extreme pressure — makes thin strokes more achievable
    pressure = Math.pow(pressure, 0.7)

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const previous = pointsRef.current[pointsRef.current.length - 1]
    const distance = previous ? Math.hypot(x - previous.x, y - previous.y) : 0
    const smoothing = previous
      ? distance > 18
        ? 0.82
        : distance > 8
          ? 0.72
          : 0.58
      : 1

    return {
      x: previous ? previous.x + (x - previous.x) * smoothing : x,
      y: previous ? previous.y + (y - previous.y) * smoothing : y,
      pressure,
      time: Date.now(),
    }
  }, [])

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    if (historyRef.current.length > 40) historyRef.current.shift()
  }, [])

  // ── Draw a smooth stroke segment using Catmull-Rom ──
  function drawStrokeSegment(
    ctx: CanvasRenderingContext2D,
    pts: Point[],
    baseWidth: number,
    color: string
  ) {
    if (pts.length < 2) return

    // Catmull-Rom interpolates the segment between p1 and p2.
    // Drawing from p2 was causing the stroke to jump backward and loop.
    const p0 = pts[Math.max(0, pts.length - 4)]
    const p1 = pts[Math.max(0, pts.length - 3)]
    const p2 = pts[pts.length - 2]
    const p3 = pts[pts.length - 1]

    // Slight stabilization so quick strokes stay elegant instead of spiky.
    const dx = p3.x - p2.x
    const dy = p3.y - p2.y
    const dt = Math.max(1, p3.time - p2.time)
    const velocity = Math.sqrt(dx * dx + dy * dy) / dt
    const velocityFactor = Math.max(0.72, Math.min(1.12, 1.02 - velocity * 0.18))

    // Pressure-based width
    const avgPressure = (p2.pressure + p3.pressure) / 2
    const strokeWidth = baseWidth * (0.72 + avgPressure * 0.58) * velocityFactor

    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(0.5, strokeWidth)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Draw using Catmull-Rom interpolation with 8 steps per segment
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)

    const steps = 8
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const pt = catmullRomPoint(p0, p1, p2, p3, t)
      ctx.lineTo(pt.x, pt.y)
    }
    ctx.stroke()
  }

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary || !canDrawWithEvent(e)) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    activePointerIdRef.current = e.pointerId
    canvas.setPointerCapture(e.pointerId)
    saveToHistory()
    const pt = getPoint(e)
    pointsRef.current = [pt, pt] // duplicate first point for smooth start
    setIsDrawing(true)
    setHasContent(true)

    // Draw a dot for tap/click
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, lineWidth * 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = inkColor
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, (lineWidth * (0.5 + pt.pressure * 0.8)) / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [canDrawWithEvent, getPoint, saveToHistory, lineWidth, inkColor, tool])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activePointerIdRef.current !== e.pointerId || !canDrawWithEvent(e)) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pt = getPoint(e)

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, lineWidth * 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
      return
    }

    pointsRef.current.push(pt)
    // Keep a rolling buffer of last 8 points
    if (pointsRef.current.length > 8) pointsRef.current.shift()

    const previous = pointsRef.current[pointsRef.current.length - 2]
    if (previous && Math.hypot(pt.x - previous.x, pt.y - previous.y) < 0.45) return

    if (pointsRef.current.length >= 2) {
      drawStrokeSegment(ctx, pointsRef.current, lineWidth, inkColor)
    }
  }, [isDrawing, canDrawWithEvent, getPoint, lineWidth, inkColor, tool])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activePointerIdRef.current !== e.pointerId) return
    setIsDrawing(false)
    activePointerIdRef.current = null
    const canvas = canvasRef.current
    if (!canvas) return
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId)
    }
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.globalCompositeOperation = 'source-over'
    pointsRef.current = []
  }, [isDrawing])

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const prev = historyRef.current.pop()
    if (prev) {
      ctx.putImageData(prev, 0, 0)
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasContent(false)
    }
  }, [])

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    saveToHistory()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasContent(false)
  }, [saveToHistory])

  useImperativeHandle(ref, () => ({
    toBlob: () => new Promise<Blob | null>((resolve) => {
      const canvas = canvasRef.current
      if (!canvas) { resolve(null); return }
      canvas.toBlob(resolve, 'image/png')
    }),
    toDataURL: () => canvasRef.current?.toDataURL('image/png') ?? '',
    isEmpty: () => !hasContent,
    clear: handleClear,
  }), [hasContent, handleClear])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        position: 'relative',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
        {[
          { id: 'pen', label: '✎ Pencil / Stylus' },
          { id: 'eraser', label: '◯ Eraser' },
        ].map(t => (
          <button key={t.id} onClick={() => setTool(t.id as 'pen' | 'eraser')}
            style={{
              fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.18em',
              textTransform: 'uppercase', padding: '7px 18px', cursor: 'pointer',
              borderRadius: '4px', transition: 'all 0.15s',
              background: tool === t.id ? '#fffbe6' : '#f6e7c6',
              border: `2px solid ${tool === t.id ? '#e6c76e' : '#d6c090'}`,
              color: tool === t.id ? '#b48a1a' : '#a08a50',
              fontWeight: tool === t.id ? 700 : 400,
            }}>
            {t.label}
          </button>
        ))}
        <button onClick={handleUndo}
          style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', padding: '7px 18px', cursor: 'pointer', borderRadius: '4px', background: '#f6e7c6', border: '2px solid #d6c090', color: '#a08a50' }}>
          ↩ Undo
        </button>
        <button onClick={handleClear} disabled={!hasContent}
          style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', padding: '7px 18px', cursor: hasContent ? 'pointer' : 'default', borderRadius: '4px', background: '#f6e7c6', border: '2px solid #d6c090', color: hasContent ? '#a08a50' : '#e6e0c0', opacity: hasContent ? 1 : 0.5 }}>
          ✕ Clear
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={e => { handlePointerDown(e); e.stopPropagation(); }}
        onPointerMove={e => { handlePointerMove(e); e.stopPropagation(); }}
        onPointerUp={e => { handlePointerUp(e); e.stopPropagation(); }}
        onPointerLeave={e => { handlePointerUp(e); e.stopPropagation(); }}
        onPointerCancel={e => { handlePointerUp(e); e.stopPropagation(); }}
        draggable={false}
        tabIndex={-1}
        style={{
          width: '100%',
          display: 'block',
          borderRadius: '4px',
          touchAction: allowFingerDraw ? 'none' : 'manipulation',
          cursor: 'crosshair',
          background: 'transparent',
          border: '1.5px solid rgba(230,199,110,0.4)',
          position: 'relative',
          zIndex: 1,
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      />

      <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '6px 0 0', textAlign: 'center' }}>
        Built for Apple Pencil and stylus writing first.{' '}
        <span style={{ color: '#e6c76e' }}>Finger and palm touches stay out of the way unless finger drawing is enabled.</span>
      </p>
    </div>
  )
})

export default HandwritingCanvas
