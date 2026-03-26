'use client'

import { useEffect, useState } from 'react'

const FONT_MODES = [
  { className: 'fontsize-default', label: 'A', desc: 'Default' },
  { className: 'fontsize-large', label: 'A+', desc: 'Large' },
  { className: 'fontsize-xlarge', label: 'A++', desc: 'Extra Large' },
]
const STORAGE_KEY = 'ds-fontsize-mode'

export default function FontSizeControls() {
  const [mode, setMode] = useState('fontsize-default')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || 'fontsize-default'
    setMode(stored)
    document.documentElement.classList.remove('fontsize-default', 'fontsize-large', 'fontsize-xlarge')
    document.documentElement.classList.add(stored)
  }, [])

  function setFontMode(className: string) {
    setMode(className)
    localStorage.setItem(STORAGE_KEY, className)
    document.documentElement.classList.remove('fontsize-default', 'fontsize-large', 'fontsize-xlarge')
    document.documentElement.classList.add(className)
    setOpen(false)
  }

  return (
    <div
      className="fontsize-controls"
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
        FONT_MODES.map((m, i) => (
          <button
            key={m.className}
            onClick={() => setFontMode(m.className)}
            title={m.desc}
            style={{
              padding: '7px 16px',
              background:
                m.className === mode
                  ? 'rgba(230,199,110,0.22)'
                  : 'rgba(4,5,15,0.88)',
              border: `1px solid ${m.className === mode ? 'rgba(230,199,110,0.65)' : 'rgba(230,199,110,0.22)'}`,
              color: m.className === mode ? '#e6c76e' : 'rgba(255,255,255,0.55)',
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: `${14 + i * 3}px`,
              borderRadius: '6px',
              cursor: 'pointer',
              backdropFilter: 'blur(14px)',
              letterSpacing: '0.04em',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              if (m.className !== mode) {
                e.currentTarget.style.background = 'rgba(230,199,110,0.1)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
              }
            }}
            onMouseLeave={e => {
              if (m.className !== mode) {
                e.currentTarget.style.background = 'rgba(4,5,15,0.88)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
              }
            }}
          >
            {m.label}
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
