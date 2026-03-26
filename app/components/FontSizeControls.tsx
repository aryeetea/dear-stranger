'use client'

import { useEffect, useState } from 'react'

const ZOOM_LEVELS = [1, 1.2, 1.4] as const
const ZOOM_LABELS = ['A', 'A+', 'A++']
const STORAGE_KEY = 'ds-zoom-level'

export default function FontSizeControls() {
  const [zoom, setZoom] = useState<number>(1)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const stored = parseFloat(localStorage.getItem(STORAGE_KEY) || '1')
    const valid = (ZOOM_LEVELS as readonly number[]).includes(stored) ? stored : 1
    setZoom(valid)
    if (valid !== 1) {
      ;(document.documentElement.style as any).zoom = String(valid)
    }
  }, [])

  function setLevel(level: number) {
    setZoom(level)
    localStorage.setItem(STORAGE_KEY, String(level))
    if (level === 1) {
      document.documentElement.style.removeProperty('zoom')
    } else {
      ;(document.documentElement.style as any).zoom = String(level)
    }
    setOpen(false)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '6px',
      }}
    >
      {open &&
        ZOOM_LEVELS.map((level, i) => (
          <button
            key={level}
            onClick={() => setLevel(level)}
            title={ZOOM_LABELS[i]}
            style={{
              padding: '7px 16px',
              background:
                level === zoom
                  ? 'rgba(230,199,110,0.22)'
                  : 'rgba(4,5,15,0.88)',
              border: `1px solid ${level === zoom ? 'rgba(230,199,110,0.65)' : 'rgba(230,199,110,0.22)'}`,
              color: level === zoom ? '#e6c76e' : 'rgba(255,255,255,0.55)',
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: `${14 + i * 3}px`,
              borderRadius: '6px',
              cursor: 'pointer',
              backdropFilter: 'blur(14px)',
              letterSpacing: '0.04em',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (level !== zoom) {
                e.currentTarget.style.background = 'rgba(230,199,110,0.1)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
              }
            }}
            onMouseLeave={(e) => {
              if (level !== zoom) {
                e.currentTarget.style.background = 'rgba(4,5,15,0.88)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
              }
            }}
          >
            {ZOOM_LABELS[i]}
          </button>
        ))}

      <button
        onClick={() => setOpen((o) => !o)}
        title="Text size"
        aria-label="Adjust text size"
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: open ? 'rgba(230,199,110,0.15)' : 'rgba(4,5,15,0.88)',
          border: `1px solid ${open ? 'rgba(230,199,110,0.55)' : 'rgba(230,199,110,0.28)'}`,
          color: open ? '#e6c76e' : 'rgba(230,199,110,0.65)',
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '15px',
          cursor: 'pointer',
          backdropFilter: 'blur(14px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          letterSpacing: '0.02em',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
      >
        Aa
      </button>
    </div>
  )
}
