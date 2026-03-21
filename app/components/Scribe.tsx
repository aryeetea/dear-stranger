'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── PAPER DEFINITIONS ──
const PAPERS = [
  {
    id: 'parchment',
    label: 'Parchment Scroll',
    sublabel: 'Rolled with ribbon',
    unlocksAt: 0,
    swatch: 'linear-gradient(135deg, #d4a855, #c09040)',
  },
  {
    id: 'sealed',
    label: 'Sealed Letter',
    sublabel: 'Folded with wax seal',
    unlocksAt: 0,
    swatch: 'linear-gradient(135deg, #f0e8d0, #e0d0b0)',
  },
  {
    id: 'torn',
    label: 'Torn & Aged',
    sublabel: 'Water-stained parchment',
    unlocksAt: 3,
    swatch: 'linear-gradient(135deg, #b89050, #a07838)',
  },
  {
    id: 'burnt',
    label: 'Burnt Letter',
    sublabel: 'Scorched at the edges',
    unlocksAt: 3,
    swatch: 'linear-gradient(135deg, #2a1808, #1a1004)',
  },
  {
    id: 'vellum',
    label: 'Illuminated Vellum',
    sublabel: 'Gold illuminated border',
    unlocksAt: 10,
    swatch: 'linear-gradient(135deg, #f4ead0, #e8d8b0)',
  },
  {
    id: 'map',
    label: "Navigator's Chart",
    sublabel: 'Weathered map paper',
    unlocksAt: 25,
    swatch: 'linear-gradient(135deg, #c09828, #a07818)',
  },
]

// ── PAPER COMPONENTS ──

function ParchmentScroll({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(160deg, #e8d090 0%, #d4b870 30%, #c8a858 70%, #d0b060 100%)',
      borderRadius: '4px',
      boxShadow: '0 12px 60px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.5), inset 0 0 40px rgba(0,0,0,0.08)',
      overflow: 'hidden',
    }}>
      {/* Noise texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
        backgroundSize: '200px',
        mixBlendMode: 'multiply',
      }} />

      {/* Top curl shadow */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '32px', background: 'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.08) 60%, transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />

      {/* Bottom curl shadow */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '32px', background: 'linear-gradient(0deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.08) 60%, transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />

      {/* Ribbon band */}
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '28px', marginTop: '-14px', background: 'rgba(100,35,15,0.12)', borderTop: '1px solid rgba(100,35,15,0.2)', borderBottom: '1px solid rgba(100,35,15,0.2)', zIndex: 3, pointerEvents: 'none' }} />

      {/* Ribbon bow SVG */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 4, pointerEvents: 'none' }}>
        <svg width="60" height="32" viewBox="0 0 60 32">
          <ellipse cx="15" cy="16" rx="13" ry="7" fill="#7a1a08" transform="rotate(-15, 15, 16)" />
          <ellipse cx="45" cy="16" rx="13" ry="7" fill="#7a1a08" transform="rotate(15, 45, 16)" />
          <ellipse cx="30" cy="16" rx="7" ry="7" fill="#9a2a10" />
          <ellipse cx="28" cy="14" rx="3" ry="2" fill="rgba(255,180,160,0.25)" />
        </svg>
      </div>

      {/* Top decorative border */}
      <div style={{ position: 'absolute', top: '36px', left: '24px', right: '24px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(120,70,20,0.5), transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '36px', left: '24px', right: '24px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(120,70,20,0.5), transparent)', zIndex: 2, pointerEvents: 'none' }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 5, padding: '48px 44px' }}>
        {children}
      </div>
    </div>
  )
}

function SealedLetter({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(160deg, #f2ead8 0%, #ebe0c4 100%)',
      borderRadius: '2px',
      boxShadow: '0 12px 60px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.5)',
      overflow: 'hidden',
    }}>
      {/* Age spots */}
      {[
        { left: '12%', top: '18%', size: '60px', opacity: 0.06 },
        { left: '72%', top: '55%', size: '80px', opacity: 0.05 },
        { left: '45%', top: '82%', size: '50px', opacity: 0.06 },
        { left: '85%', top: '12%', size: '40px', opacity: 0.05 },
      ].map((spot, i) => (
        <div key={i} style={{
          position: 'absolute', borderRadius: '50%',
          left: spot.left, top: spot.top,
          width: spot.size, height: spot.size,
          background: `radial-gradient(circle, rgba(140,90,30,${spot.opacity}) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Fold lines */}
      <div style={{ position: 'absolute', top: '33%', left: 0, right: 0, height: '1px', background: 'rgba(140,100,50,0.2)', boxShadow: '0 1px 0 rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '66%', left: 0, right: 0, height: '1px', background: 'rgba(140,100,50,0.15)', boxShadow: '0 1px 0 rgba(255,255,255,0.25)', pointerEvents: 'none' }} />

      {/* Fold shadows */}
      <div style={{ position: 'absolute', top: 'calc(33% - 4px)', left: 0, right: 0, height: '8px', background: 'linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.02) 50%, rgba(0,0,0,0.04) 100%)', pointerEvents: 'none' }} />

      {/* Header ornament */}
      <div style={{ position: 'absolute', top: '20px', left: 0, right: 0, textAlign: 'center', fontFamily: "'Cinzel', serif", fontSize: '12px', color: 'rgba(100,60,20,0.45)', pointerEvents: 'none' }}>— ✦ —</div>

      {/* Wax seal */}
      <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
        <svg width="72" height="72" viewBox="0 0 72 72">
          {/* Wax drips */}
          <ellipse cx="14" cy="38" rx="7" ry="5" fill="#6a1010" transform="rotate(-30,14,38)" />
          <ellipse cx="58" cy="40" rx="7" ry="5" fill="#6a1010" transform="rotate(30,58,40)" />
          <ellipse cx="36" cy="60" rx="6" ry="8" fill="#7a1515" />
          <ellipse cx="22" cy="55" rx="5" ry="4" fill="#7a1515" transform="rotate(-20,22,55)" />
          <ellipse cx="50" cy="56" rx="5" ry="4" fill="#7a1515" transform="rotate(20,50,56)" />
          {/* Main seal */}
          <circle cx="36" cy="34" r="26" fill="#8b1515" />
          <circle cx="36" cy="34" r="22" fill="#9a1a1a" />
          {/* Shine */}
          <ellipse cx="30" cy="27" rx="8" ry="5" fill="rgba(255,180,180,0.18)" transform="rotate(-20,30,27)" />
          {/* Imprint */}
          <text x="36" y="41" textAnchor="middle" fontSize="18" fontFamily="serif" fill="rgba(255,210,200,0.75)">✦</text>
          {/* Outer ring detail */}
          <circle cx="36" cy="34" r="20" fill="none" stroke="rgba(255,150,150,0.2)" strokeWidth="1" strokeDasharray="3,3" />
        </svg>
      </div>

      {/* Content */}
      <div style={{ padding: '44px 44px 100px' }}>
        {children}
      </div>
    </div>
  )
}

function TornAged({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      {/* Main paper */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(155deg, #c8a060 0%, #b89050 40%, #c0a058 100%)',
        clipPath: `polygon(
          0% 2%, 1.5% 0%, 3% 1.8%, 4.5% 0.5%, 6% 2%, 7% 0%, 9% 1.5%, 11% 0.2%, 13% 1.8%, 15% 0%, 17% 2%, 19% 0.5%, 21% 1.8%, 23% 0%, 25% 2%, 27% 0.5%, 29% 1.5%, 32% 0%, 34% 1.8%, 37% 0.2%, 40% 1.5%, 43% 0%, 46% 1.8%, 50% 0.5%, 54% 1.5%, 58% 0%, 62% 2%, 66% 0.5%, 70% 1.8%, 74% 0%, 78% 1.5%, 82% 0.2%, 86% 1.8%, 90% 0%, 94% 1.5%, 97% 0.2%, 100% 1.5%,
          100% 97%, 98.5% 100%, 97% 98%, 95% 100%, 93% 98.5%, 91% 100%, 89% 98%, 87% 100%, 84% 98.5%, 81% 100%, 78% 98%, 75% 100%, 72% 98.5%, 68% 100%, 64% 98%, 60% 100%, 56% 98.5%, 52% 100%, 48% 98%, 44% 100%, 40% 98.5%, 36% 100%, 32% 98%, 28% 100%, 24% 98.5%, 20% 100%, 16% 98%, 12% 100%, 8% 98.5%, 4% 100%, 1.5% 98%, 0% 100%
        )`,
        boxShadow: '0 12px 60px rgba(0,0,0,0.8)',
        overflow: 'hidden',
      }}>
        {/* Water stains */}
        <div style={{ position: 'absolute', left: '65%', top: '35%', width: '140px', height: '100px', background: 'radial-gradient(ellipse, rgba(80,50,10,0.1) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '65%', top: '35%', width: '140px', height: '100px', border: '2px solid rgba(80,50,10,0.08)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '68%', top: '38%', width: '90px', height: '65px', border: '1.5px solid rgba(80,50,10,0.06)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '10%', top: '65%', width: '90px', height: '70px', background: 'radial-gradient(ellipse, rgba(80,50,10,0.07) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        {/* Foxing spots */}
        {[
          { l: '8%', t: '15%', s: '18px' }, { l: '78%', t: '8%', s: '14px' },
          { l: '55%', t: '72%', s: '20px' }, { l: '20%', t: '85%', s: '12px' },
          { l: '90%', t: '55%', s: '16px' }, { l: '35%', t: '5%', s: '10px' },
        ].map((f, i) => (
          <div key={i} style={{ position: 'absolute', left: f.l, top: f.t, width: f.s, height: f.s, background: 'radial-gradient(circle, rgba(100,55,10,0.18) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        ))}

        {/* Ruled lines */}
        <div style={{ position: 'absolute', inset: '0', pointerEvents: 'none' }}>
          {[...Array(16)].map((_, i) => (
            <div key={i} style={{ position: 'absolute', left: '36px', right: '36px', top: `${90 + i * 30}px`, height: '1px', background: 'rgba(80,40,10,0.12)' }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '44px 44px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function BurntLetter({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        position: 'relative',
        background: 'linear-gradient(155deg, #2a1808 0%, #1e1004 50%, #261508 100%)',
        clipPath: `polygon(
          0% 8%, 2% 5%, 4% 9%, 6% 4%, 8% 7%, 10% 3%, 13% 8%, 16% 4%, 19% 9%, 22% 5%, 26% 10%, 30% 4%, 34% 8%, 38% 3%, 43% 9%, 48% 4%, 53% 8%, 58% 3%, 63% 9%, 68% 5%, 73% 10%, 78% 4%, 83% 8%, 88% 3%, 92% 7%, 96% 4%, 100% 8%,
          100% 92%, 97% 96%, 94% 91%, 91% 97%, 88% 92%, 85% 96%, 81% 91%, 77% 96%, 73% 91%, 69% 97%, 65% 92%, 61% 96%, 57% 91%, 53% 96%, 49% 91%, 45% 97%, 41% 92%, 37% 96%, 33% 91%, 29% 96%, 25% 91%, 21% 96%, 17% 92%, 13% 97%, 9% 92%, 5% 96%, 2% 91%, 0% 92%
        )`,
        boxShadow: '0 12px 60px rgba(0,0,0,0.9), 0 0 40px rgba(180,60,10,0.15)',
        overflow: 'hidden',
      }}>
        {/* Inner lighter unburnt center */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(60,35,10,0.6) 0%, transparent 100%)', pointerEvents: 'none' }} />

        {/* Ember glow along top burn edge */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(180deg, rgba(200,70,10,0.2) 0%, rgba(200,70,10,0.06) 60%, transparent 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50px', background: 'linear-gradient(0deg, rgba(200,70,10,0.15) 0%, rgba(200,70,10,0.04) 60%, transparent 100%)', pointerEvents: 'none' }} />

        {/* Charred texture */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
          backgroundSize: '200px', mixBlendMode: 'screen',
        }} />

        {/* Ash particles */}
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{ position: 'absolute', width: `${2 + Math.random() * 3}px`, height: `${2 + Math.random() * 3}px`, borderRadius: '50%', background: `rgba(200,160,80,${0.08 + Math.random() * 0.12})`, left: `${Math.random() * 90 + 5}%`, top: `${Math.random() * 90 + 5}%`, pointerEvents: 'none' }} />
        ))}

        {/* Content */}
        <div style={{ padding: '52px 44px 44px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function IlluminatedVellum({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(155deg, #f4ead0 0%, #ece0bc 100%)',
      boxShadow: '0 12px 60px rgba(0,0,0,0.8), 0 0 30px rgba(201,168,76,0.08)',
      overflow: 'hidden',
    }}>
      {/* Vellum grain */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
        backgroundSize: '200px', mixBlendMode: 'multiply',
      }} />

      {/* Illuminated border SVG */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          {/* Outer gold border */}
          <rect x="12" y="12" width="calc(100% - 24px)" height="calc(100% - 24px)"
            fill="none" stroke="#c9a84c" strokeWidth="2"
            style={{ width: 'calc(100% - 24px)', height: 'calc(100% - 24px)' }} />
          {/* Inner border */}
          <rect x="20" y="20" width="calc(100% - 40px)" height="calc(100% - 40px)"
            fill="none" stroke="rgba(180,130,50,0.4)" strokeWidth="1"
            style={{ width: 'calc(100% - 40px)', height: 'calc(100% - 40px)' }} />
        </svg>

        {/* Corner ornaments */}
        {[['12px', '12px', '0'], ['calc(100% - 12px)', '12px', '90deg'], ['12px', 'calc(100% - 12px)', '-90deg'], ['calc(100% - 12px)', 'calc(100% - 12px)', '180deg']].map(([l, t, rot], i) => (
          <div key={i} style={{ position: 'absolute', left: l, top: t, transform: `translate(-50%, -50%) rotate(${rot})`, fontSize: '14px', color: '#c9a84c', lineHeight: 1 }}>✦</div>
        ))}

        {/* Left vine decoration */}
        <svg style={{ position: 'absolute', left: '14px', top: '50px', height: 'calc(100% - 100px)', width: '16px' }}>
          {[...Array(6)].map((_, i) => (
            <g key={i}>
              <circle cx="8" cy={`${10 + i * 60}px`} r="3" fill="rgba(180,130,50,0.5)" />
              <path d={`M8 ${10 + i * 60} C16 ${10 + i * 60 - 14} 20 ${10 + i * 60 + 8} 8 ${10 + i * 60 + 20}`} fill="none" stroke="rgba(180,130,50,0.35)" strokeWidth="1" />
            </g>
          ))}
        </svg>

        {/* Right vine decoration */}
        <svg style={{ position: 'absolute', right: '14px', top: '50px', height: 'calc(100% - 100px)', width: '16px' }}>
          {[...Array(6)].map((_, i) => (
            <g key={i}>
              <circle cx="8" cy={`${10 + i * 60}px`} r="3" fill="rgba(180,130,50,0.5)" />
              <path d={`M8 ${10 + i * 60} C0 ${10 + i * 60 - 14} -4 ${10 + i * 60 + 8} 8 ${10 + i * 60 + 20}`} fill="none" stroke="rgba(180,130,50,0.35)" strokeWidth="1" />
            </g>
          ))}
        </svg>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '28px 48px 0', position: 'relative', zIndex: 2 }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.4em', color: '#c9a84c', textTransform: 'uppercase' }}>✦  Dear Stranger  ✦</p>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(180,130,50,0.4), transparent)', marginTop: '8px' }} />
      </div>

      {/* Ruled lines */}
      <div style={{ position: 'absolute', left: '48px', right: '48px', top: '80px', bottom: '48px', pointerEvents: 'none' }}>
        {[...Array(18)].map((_, i) => (
          <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${i * 32}px`, height: '1px', background: 'rgba(160,120,50,0.1)' }} />
        ))}
      </div>

      {/* Bottom ornament */}
      <div style={{ position: 'absolute', bottom: '18px', left: 0, right: 0, textAlign: 'center', fontFamily: "'Cinzel', serif", fontSize: '11px', color: 'rgba(180,130,50,0.4)', pointerEvents: 'none' }}>— ✦ —</div>

      {/* Content */}
      <div style={{ padding: '16px 48px 52px', position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </div>
  )
}

function NavigatorsChart({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(155deg, #c09828 0%, #a88018 50%, #b09020 100%)',
      boxShadow: '0 12px 60px rgba(0,0,0,0.8)',
      overflow: 'hidden',
    }}>
      {/* Map grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(60,35,5,0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(60,35,5,0.07) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }} />

      {/* Age texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.09'/%3E%3C/svg%3E")`,
        backgroundSize: '200px', mixBlendMode: 'multiply',
      }} />

      {/* Foxing */}
      {[
        { l: '8%', t: '12%', s: '22px' }, { l: '78%', t: '8%', s: '16px' },
        { l: '55%', t: '75%', s: '24px' }, { l: '20%', t: '80%', s: '14px' },
        { l: '88%', t: '50%', s: '18px' },
      ].map((f, i) => (
        <div key={i} style={{ position: 'absolute', left: f.l, top: f.t, width: f.s, height: f.s, background: 'radial-gradient(circle, rgba(80,40,5,0.18) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      ))}

      {/* Compass rose — top right */}
      <div style={{ position: 'absolute', top: '20px', right: '28px', pointerEvents: 'none' }}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(60,35,5,0.25)" strokeWidth="1.5" />
          <circle cx="40" cy="40" r="24" fill="none" stroke="rgba(60,35,5,0.15)" strokeWidth="1" strokeDasharray="3,3" />
          {/* Cardinal lines */}
          <line x1="40" y1="8" x2="40" y2="72" stroke="rgba(60,35,5,0.3)" strokeWidth="1" />
          <line x1="8" y1="40" x2="72" y2="40" stroke="rgba(60,35,5,0.3)" strokeWidth="1" />
          {/* Diagonal lines */}
          <line x1="17" y1="17" x2="63" y2="63" stroke="rgba(60,35,5,0.15)" strokeWidth="0.8" />
          <line x1="63" y1="17" x2="17" y2="63" stroke="rgba(60,35,5,0.15)" strokeWidth="0.8" />
          {/* Compass points */}
          <polygon points="40,10 36,30 44,30" fill="rgba(60,35,5,0.5)" />
          <polygon points="40,70 36,50 44,50" fill="rgba(60,35,5,0.3)" />
          <polygon points="10,40 30,36 30,44" fill="rgba(60,35,5,0.3)" />
          <polygon points="70,40 50,36 50,44" fill="rgba(60,35,5,0.3)" />
          {/* Center */}
          <circle cx="40" cy="40" r="5" fill="rgba(60,35,5,0.4)" />
          <circle cx="40" cy="40" r="2" fill="rgba(60,35,5,0.6)" />
          {/* Labels */}
          <text x="40" y="6" textAnchor="middle" fontSize="9" fontFamily="serif" fill="rgba(50,28,5,0.6)" fontWeight="bold">N</text>
          <text x="40" y="78" textAnchor="middle" fontSize="9" fontFamily="serif" fill="rgba(50,28,5,0.5)">S</text>
          <text x="4" y="43" textAnchor="middle" fontSize="9" fontFamily="serif" fill="rgba(50,28,5,0.5)">W</text>
          <text x="76" y="43" textAnchor="middle" fontSize="9" fontFamily="serif" fill="rgba(50,28,5,0.5)">E</text>
        </svg>
      </div>

      {/* Dotted travel route */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <path d="M 60 60% C 30% 40%, 60% 70%, 85% 45%" fill="none" stroke="rgba(100,55,10,0.18)" strokeWidth="1.5" strokeDasharray="5,7" />
        </svg>
      </div>

      {/* Title banner */}
      <div style={{ margin: '16px 100px 0 28px', padding: '8px 16px', background: 'rgba(60,35,5,0.1)', borderTop: '1px solid rgba(60,35,5,0.2)', borderBottom: '1px solid rgba(60,35,5,0.2)', pointerEvents: 'none' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.35em', color: 'rgba(50,28,5,0.55)', textTransform: 'uppercase', textAlign: 'center' }}>Correspondence — Across the Known Universe</p>
      </div>

      {/* Coordinate marks */}
      <div style={{ position: 'absolute', top: 0, left: '28px', right: '108px', height: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pointerEvents: 'none' }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
            <div style={{ width: '1px', height: '6px', background: 'rgba(60,35,5,0.3)' }} />
            <span style={{ fontFamily: 'serif', fontSize: '7px', color: 'rgba(50,28,5,0.4)' }}>{(i + 1) * 10}°</span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '12px 44px 36px 28px', position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </div>
  )
}

// ── SHARED TEXT CONTENT ──
function LetterContent({
  ink, inkSecondary, accentColor, recipient, sender, date, body, setBody, textareaRef,
}: {
  ink: string, inkSecondary: string, accentColor: string,
  recipient?: string, sender?: string, date: string,
  body: string, setBody: (v: string) => void,
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  return (
    <div>
      <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '12px', color: inkSecondary, marginBottom: '16px', opacity: 0.7 }}>{date}</p>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '17px', fontStyle: 'italic', color: inkSecondary, marginBottom: '18px', lineHeight: 1.8 }}>
        {recipient ? `Dear ${recipient},` : 'Dear Stranger,'}
      </p>
      <textarea
        ref={textareaRef}
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Begin your letter here..."
        rows={9}
        style={{
          width: '100%', background: 'transparent', border: 'none', outline: 'none',
          color: ink, caretColor: accentColor,
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '16px', lineHeight: 2, resize: 'none',
          letterSpacing: '0.015em',
        }}
      />
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '14px', color: inkSecondary, marginTop: '8px', lineHeight: 1.9, opacity: 0.7 }}>
        Yours across the distance,<br />
        <span style={{ color: accentColor }}>{sender || 'A Stranger'}</span>
      </p>
    </div>
  )
}

// ── INK COLORS PER PAPER ──
const PAPER_INK: Record<string, { ink: string, inkSecondary: string, accentColor: string }> = {
  parchment: { ink: '#2c1a08', inkSecondary: 'rgba(60,30,8,0.6)', accentColor: '#8b4a10' },
  sealed: { ink: '#1a120a', inkSecondary: 'rgba(40,25,10,0.6)', accentColor: '#8b1a1a' },
  torn: { ink: '#1e1008', inkSecondary: 'rgba(40,20,5,0.55)', accentColor: '#7a5020' },
  burnt: { ink: 'rgba(240,210,150,0.88)', inkSecondary: 'rgba(220,180,100,0.55)', accentColor: '#e07018' },
  vellum: { ink: '#1a1408', inkSecondary: 'rgba(50,35,10,0.55)', accentColor: '#c9a84c' },
  map: { ink: '#1a1005', inkSecondary: 'rgba(40,22,5,0.55)', accentColor: '#6a4010' },
}

// ── MAIN COMPONENT ──
export default function Scribe({
  recipientName,
  senderName,
  lettersSent = 0,
  onClose,
  onSend,
}: {
  recipientName?: string
  senderName?: string
  lettersSent?: number
  onClose?: () => void
  onSend?: (letter: { to?: string; body: string; paperId: string }) => void
}) {
  const unlockedPapers = PAPERS.filter(p => p.unlocksAt <= lettersSent)
  const [selected, setSelected] = useState(unlockedPapers[0])
  const [body, setBody] = useState('')
  const [sent, setSent] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const wordCount = body.trim() === '' ? 0 : body.trim().split(/\s+/).length
  const inks = PAPER_INK[selected.id]

  useEffect(() => {
    if (!showPicker) setTimeout(() => textareaRef.current?.focus(), 300)
  }, [showPicker, selected])

  async function handleRelease() {
    if (!body.trim()) return
    setReleasing(true)
    await new Promise(r => setTimeout(r, 1800))
    setSent(true)
    setTimeout(() => { onSend?.({ to: recipientName, body, paperId: selected.id }); onClose?.() }, 2800)
  }

  const letterContent = (
    <LetterContent
      ink={inks.ink} inkSecondary={inks.inkSecondary} accentColor={inks.accentColor}
      recipient={recipientName} sender={senderName} date={today}
      body={body} setBody={setBody} textareaRef={textareaRef}
    />
  )

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,5,0.97)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: '20px', overflowY: 'auto' }}
    >
      {/* Ambient */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 50% 40% at 20% 30%, rgba(30,15,70,0.2) 0%, transparent 65%)' }} />

      {/* Stars */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        {[...Array(25)].map((_, i) => (
          <div key={i} style={{ position: 'absolute', width: `${Math.random() * 1.2 + 0.3}px`, height: `${Math.random() * 1.2 + 0.3}px`, borderRadius: '50%', background: `rgba(255,255,255,${Math.random() * 0.25 + 0.05})`, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }} />
        ))}
      </div>

      {/* Return */}
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} onClick={onClose}
        style={{ position: 'fixed', top: '28px', right: '28px', background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)', fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.3em', padding: '8px 16px', cursor: 'pointer', textTransform: 'uppercase', zIndex: 80 }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
        ← Return
      </motion.button>

      <AnimatePresence mode="wait">

        {/* PICKER */}
        {showPicker && !sent && (
          <motion.div key="picker" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            style={{ width: 'min(720px, 95vw)', position: 'relative', zIndex: 2 }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Choose Your Paper</span>
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '14px', color: 'rgba(255,255,255,0.28)' }}>Each paper carries its own history</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px', marginBottom: '28px' }}>
              {PAPERS.map(p => {
                const unlocked = p.unlocksAt <= lettersSent
                const isSelected = selected.id === p.id
                return (
                  <motion.div key={p.id} whileTap={unlocked ? { scale: 0.97 } : {}} onClick={() => unlocked && setSelected(p)}
                    style={{ cursor: unlocked ? 'pointer' : 'default', opacity: unlocked ? 1 : 0.35 }}>
                    <div style={{ height: '100px', background: p.swatch, borderRadius: '3px', border: isSelected ? '2px solid #c9a84c' : '1px solid rgba(255,255,255,0.08)', boxShadow: isSelected ? '0 0 18px rgba(201,168,76,0.3)' : '0 4px 16px rgba(0,0,0,0.5)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                      {isSelected && <div style={{ position: 'absolute', top: '6px', right: '6px', width: '18px', height: '18px', borderRadius: '50%', background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#000' }}>✓</div>}
                    </div>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.2em', color: isSelected ? '#c9a84c' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase', textAlign: 'center' }}>{p.label}</p>
                    <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '10px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '2px' }}>{unlocked ? p.sublabel : `Unlocks at ${p.unlocksAt} letters`}</p>
                  </motion.div>
                )
              })}
            </div>
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setShowPicker(false)}
                style={{ padding: '12px 36px', background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Write on {selected.label} ✦
              </button>
            </div>
          </motion.div>
        )}

        {/* WRITING */}
        {!showPicker && !sent && (
          <motion.div key="writing" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
            style={{ width: 'min(660px, 95vw)', position: 'relative', zIndex: 2 }}>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ textAlign: 'center', marginBottom: '18px' }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.5em', color: 'rgba(201,168,76,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>The Scribe</span>
              <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '15px', color: 'rgba(255,255,255,0.28)' }}>
                {recipientName ? `a letter to · ${recipientName}` : 'a letter into the universe'}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              {selected.id === 'parchment' && <ParchmentScroll>{letterContent}</ParchmentScroll>}
              {selected.id === 'sealed' && <SealedLetter>{letterContent}</SealedLetter>}
              {selected.id === 'torn' && <TornAged>{letterContent}</TornAged>}
              {selected.id === 'burnt' && <BurntLetter>{letterContent}</BurntLetter>}
              {selected.id === 'vellum' && <IlluminatedVellum>{letterContent}</IlluminatedVellum>}
              {selected.id === 'map' && <NavigatorsChart>{letterContent}</NavigatorsChart>}
            </motion.div>

            {/* Footer */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>{wordCount} words</span>
                <button onClick={() => setShowPicker(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', fontFamily: "'Cinzel', serif", fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '6px 10px', cursor: 'pointer', borderRadius: '2px' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '1px', background: selected.swatch, border: '1px solid rgba(255,255,255,0.2)' }} />
                  {selected.label}
                </button>
              </div>
              <motion.button onClick={handleRelease} disabled={!body.trim() || releasing} whileTap={body.trim() ? { scale: 0.97 } : {}}
                style={{ padding: '12px 28px', background: 'transparent', border: `1px solid ${body.trim() ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.07)'}`, color: body.trim() ? '#c9a84c' : 'rgba(255,255,255,0.18)', fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', cursor: body.trim() ? 'pointer' : 'default', opacity: releasing ? 0.6 : 1 }}
                onMouseEnter={e => { if (!body.trim()) return; e.currentTarget.style.background = 'rgba(201,168,76,0.08)'; e.currentTarget.style.borderColor = '#c9a84c' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = body.trim() ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.07)' }}>
                {releasing ? 'Releasing ✦' : 'Release into the Universe ✦'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {/* SENT */}
        {sent && (
          <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
            <motion.div initial={{ scale: 0, opacity: 0.8 }} animate={{ scale: 5, opacity: 0 }} transition={{ duration: 2.2, ease: 'easeOut' }}
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '60px', height: '60px', borderRadius: '50%', border: '1px solid #c9a84c', pointerEvents: 'none' }} />
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ fontSize: '36px', marginBottom: '20px' }}>✦</motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(13px,2vw,17px)', letterSpacing: '0.3em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '12px' }}>
              Your letter drifts into the universe
            </motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 'clamp(13px,1.8vw,15px)', color: 'rgba(255,255,255,0.3)' }}>
              {recipientName ? `traveling toward ${recipientName}...` : 'finding its way to a stranger...'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}