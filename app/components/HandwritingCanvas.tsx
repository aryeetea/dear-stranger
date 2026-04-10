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
}

const HandwritingCanvas = forwardRef<HandwritingCanvasRef, Props>(function HandwritingCanvas(
  { width = 600, height = 400, inkColor = '#1a1208', lineWidth = 2, style },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ w: width, h: height })
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const historyRef = useRef<ImageData[]>([])
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')

  // Responsive canvas sizing
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width)
        if (w > 0) setCanvasSize(prev => ({ w, h: Math.max(prev.h, Math.floor(w * 0.65)) }))
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Redraw on resize (scale existing content)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Save current content
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const tempCtx = tempCanvas.getContext('2d')
    tempCtx?.drawImage(canvas, 0, 0)
    // Resize
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.w * dpr
    canvas.height = canvasSize.h * dpr
    canvas.style.width = `${canvasSize.w}px`
    canvas.style.height = `${canvasSize.h}px`
    ctx.scale(dpr, dpr)
    // Restore content scaled
    if (tempCanvas.width > 0 && tempCanvas.height > 0) {
      ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, canvasSize.w, canvasSize.h)
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [canvasSize])

  const getPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
    }
  }, [])

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    if (historyRef.current.length > 30) historyRef.current.shift()
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    saveToHistory()
    const pt = getPoint(e)
    lastPointRef.current = pt
    setIsDrawing(true)
    setHasContent(true)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = lineWidth * 6
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = inkColor
      ctx.lineWidth = lineWidth * (0.5 + pt.pressure)
    }
    ctx.moveTo(pt.x, pt.y)
    ctx.lineTo(pt.x + 0.1, pt.y + 0.1)
    ctx.stroke()
  }, [getPoint, saveToHistory, inkColor, lineWidth, tool])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pt = getPoint(e)
    const last = lastPointRef.current
    if (!last) { lastPointRef.current = pt; return }
    ctx.beginPath()
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = lineWidth * 6
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = inkColor
      ctx.lineWidth = lineWidth * (0.5 + pt.pressure)
    }
    // Smooth with midpoint for natural curves
    const mid = { x: (last.x + pt.x) / 2, y: (last.y + pt.y) / 2 }
    ctx.moveTo(last.x, last.y)
    ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y)
    ctx.stroke()
    lastPointRef.current = pt
  }, [isDrawing, getPoint, inkColor, lineWidth, tool])

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false)
    lastPointRef.current = null
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.globalCompositeOperation = 'source-over'
  }, [])

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
    <div ref={containerRef} style={{ width: '100%', ...style }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setTool('pen')}
          style={{
            fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase',
            padding: '5px 12px', cursor: 'pointer', borderRadius: '2px', transition: 'all 0.15s',
            background: tool === 'pen' ? 'rgba(230,199,110,0.12)' : 'transparent',
            border: `1px solid ${tool === 'pen' ? 'rgba(230,199,110,0.5)' : 'rgba(255,255,255,0.16)'}`,
            color: tool === 'pen' ? '#e6c76e' : 'rgba(255,255,255,0.6)',
          }}>
          ✎ Pen
        </button>
        <button
          onClick={() => setTool('eraser')}
          style={{
            fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase',
            padding: '5px 12px', cursor: 'pointer', borderRadius: '2px', transition: 'all 0.15s',
            background: tool === 'eraser' ? 'rgba(230,199,110,0.12)' : 'transparent',
            border: `1px solid ${tool === 'eraser' ? 'rgba(230,199,110,0.5)' : 'rgba(255,255,255,0.16)'}`,
            color: tool === 'eraser' ? '#e6c76e' : 'rgba(255,255,255,0.6)',
          }}>
          ◯ Eraser
        </button>
        <button
          onClick={handleUndo}
          style={{
            fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase',
            padding: '5px 12px', cursor: 'pointer', borderRadius: '2px', transition: 'all 0.15s',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.6)',
          }}>
          ↩ Undo
        </button>
        <button
          onClick={handleClear}
          disabled={!hasContent}
          style={{
            fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase',
            padding: '5px 12px', cursor: hasContent ? 'pointer' : 'default', borderRadius: '2px', transition: 'all 0.15s',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.16)',
            color: hasContent ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
          }}>
          ✕ Clear
        </button>
      </div>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          width: '100%',
          height: `${canvasSize.h}px`,
          borderRadius: '4px',
          touchAction: 'none',
          cursor: tool === 'eraser' ? 'crosshair' : 'crosshair',
          background: 'transparent',
        }}
      />
      <p style={{
        fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '11px',
        color: 'rgba(255,255,255,0.35)', margin: '6px 0 0', textAlign: 'center',
      }}>
        Draw with your finger, stylus, or mouse
      </p>
    </div>
  )
})

export default HandwritingCanvas
