import type { CSSProperties, ReactNode } from 'react'

export type HandwritingStyle = 'typed' | 'handwritten'
export type EmbellishmentId =
  | 'none'
  | 'pressed-flower'
  | 'margin-stars'
  | 'constellation'
  | 'ribbon-thread'
  | 'tea-stain'
  | 'moon-phase'
  | 'botanical-corners'
  | 'wax-drip'
  | 'aurora-wash'

export const HANDWRITING_STYLES: { id: HandwritingStyle; label: string; desc: string }[] = [
  { id: 'typed', label: 'Typed', desc: 'A clean typeset letter' },
  { id: 'handwritten', label: 'Handwritten', desc: 'Draw freely on the page' },
]

export const LETTER_EMBELLISHMENTS: { id: EmbellishmentId; label: string; desc: string }[] = [
  { id: 'none', label: 'None', desc: 'Keep it bare' },
  { id: 'pressed-flower', label: 'Pressed Flower', desc: 'A petal kept between pages' },
  { id: 'margin-stars', label: 'Margin Stars', desc: 'Small stars wandering the edges' },
  { id: 'constellation', label: 'Constellation', desc: 'A quiet chart in the margin' },
  { id: 'ribbon-thread', label: 'Ribbon Thread', desc: 'A tied thread across the page' },
  { id: 'tea-stain', label: 'Tea Stain', desc: 'A ring from a slow evening' },
  { id: 'moon-phase', label: 'Moon Phases', desc: 'A lunar cycle drifting over the page' },
  { id: 'botanical-corners', label: 'Botanical Corners', desc: 'Leafwork growing from the edges' },
  { id: 'wax-drip', label: 'Wax Drip', desc: 'A dramatic seal melting down the margin' },
  { id: 'aurora-wash', label: 'Aurora Wash', desc: 'A soft spectral glow behind the letter' },
]

export function getHandwritingStyleStyles(style: HandwritingStyle | string): CSSProperties {
  if (style === 'typed') {
    return {
      letterSpacing: '0.01em',
      transform: 'none',
      fontStyle: 'normal',
      textShadow: 'none',
      filter: 'none',
    }
  }
  // For 'handwritten' or any legacy style, return minimal styling
  return { letterSpacing: '0.02em' }
}

export function renderLetterEmbellishment(
  embellishmentId: EmbellishmentId | undefined,
  accentColor: string,
  mode: 'compose' | 'read' = 'read',
): ReactNode {
  if (!embellishmentId || embellishmentId === 'none') return null

  const opacity = mode === 'compose' ? 0.54 : 0.72
  const size = mode === 'compose' ? 82 : 96

  if (embellishmentId === 'pressed-flower') {
    return (
      <div style={{ position: 'absolute', top: '62px', right: '34px', opacity, pointerEvents: 'none' }}>
        <svg width={size} height={size} viewBox="0 0 96 96">
          <path d="M48 84 C44 64 46 44 50 18" fill="none" stroke="rgba(92,132,82,0.65)" strokeWidth="2" strokeLinecap="round" />
          <path d="M50 28 C32 18 22 28 28 40 C38 42 46 38 50 28Z" fill="rgba(214,146,164,0.34)" stroke="rgba(176,98,124,0.48)" strokeWidth="1.4" />
          <path d="M50 28 C66 18 76 28 70 40 C60 42 52 38 50 28Z" fill="rgba(240,190,160,0.3)" stroke="rgba(196,128,94,0.45)" strokeWidth="1.4" />
          <path d="M48 48 C30 38 20 50 28 62 C38 64 46 58 48 48Z" fill="rgba(226,182,118,0.26)" stroke="rgba(180,132,70,0.4)" strokeWidth="1.2" />
        </svg>
      </div>
    )
  }

  if (embellishmentId === 'margin-stars') {
    return (
      <div style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}>
        {[['18%', '18%'], ['84%', '26%'], ['12%', '72%'], ['88%', '76%'], ['22%', '88%']].map(([left, top], index) => (
          <div key={index} style={{ position: 'absolute', left, top, color: accentColor, fontSize: index % 2 === 0 ? '14px' : '10px' }}>✦</div>
        ))}
      </div>
    )
  }

  if (embellishmentId === 'constellation') {
    return (
      <div style={{ position: 'absolute', top: '74px', right: '30px', opacity, pointerEvents: 'none' }}>
        <svg width={size} height={size} viewBox="0 0 96 96">
          <path d="M12 26 L34 18 L52 34 L74 24 L84 48 L62 64 L30 58 L16 78" fill="none" stroke={accentColor} strokeWidth="1.2" strokeOpacity="0.38" />
          {[['12', '26', '2.8'], ['34', '18', '2.2'], ['52', '34', '2.6'], ['74', '24', '2.1'], ['84', '48', '2.9'], ['62', '64', '2.2'], ['30', '58', '2.4'], ['16', '78', '1.9']].map(([cx, cy, r], index) => (
            <circle key={index} cx={cx} cy={cy} r={r} fill={accentColor} fillOpacity="0.68" />
          ))}
        </svg>
      </div>
    )
  }

  if (embellishmentId === 'ribbon-thread') {
    return (
      <div style={{ position: 'absolute', top: '48px', left: '24px', right: '24px', height: '42px', opacity, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" viewBox="0 0 600 42" preserveAspectRatio="none">
          <path d="M0 22 C120 8 210 32 300 18 C382 6 472 30 600 12" fill="none" stroke={accentColor} strokeWidth="1.2" strokeOpacity="0.42" />
          <path d="M298 18 C288 8 278 8 276 18 C282 26 290 26 298 18Z" fill="rgba(201,88,106,0.28)" stroke="rgba(201,88,106,0.45)" strokeWidth="1" />
          <path d="M302 18 C312 8 322 8 324 18 C318 26 310 26 302 18Z" fill="rgba(201,88,106,0.28)" stroke="rgba(201,88,106,0.45)" strokeWidth="1" />
        </svg>
      </div>
    )
  }

  if (embellishmentId === 'tea-stain') {
    return (
      <div style={{ position: 'absolute', bottom: '72px', right: '38px', opacity, pointerEvents: 'none' }}>
        <svg width={size} height={size} viewBox="0 0 96 96">
          <circle cx="44" cy="48" r="22" fill="none" stroke="rgba(138,90,48,0.3)" strokeWidth="3" />
          <circle cx="44" cy="48" r="16" fill="none" stroke="rgba(138,90,48,0.16)" strokeWidth="2" />
          <path d="M60 40 C72 38 76 48 70 56 C68 60 62 62 58 56" fill="none" stroke="rgba(138,90,48,0.24)" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  if (embellishmentId === 'moon-phase') {
    return (
      <div style={{ position: 'absolute', top: '22px', left: '50%', transform: 'translateX(-50%)', opacity, pointerEvents: 'none' }}>
        <svg width={size + 36} height="30" viewBox="0 0 132 30">
          {[12, 34, 56, 78, 100, 122].map((cx, index) => (
            <g key={cx} opacity={0.8 - index * 0.06}>
              <circle cx={cx} cy="15" r={index === 2 || index === 3 ? 7 : 5.5} fill={accentColor} fillOpacity="0.22" />
              {index === 0 && <path d="M12 9 A6 6 0 1 0 12 21 A3.2 6 0 1 1 12 9Z" fill={accentColor} fillOpacity="0.68" />}
              {index === 1 && <path d="M34 8 A7 7 0 1 0 34 22 A5 7 0 1 1 34 8Z" fill={accentColor} fillOpacity="0.62" />}
              {index === 2 && <circle cx="56" cy="15" r="7" fill={accentColor} fillOpacity="0.72" />}
              {index === 3 && <path d="M78 8 A7 7 0 1 1 78 22 A5 7 0 1 0 78 8Z" fill={accentColor} fillOpacity="0.62" />}
              {index === 4 && <path d="M100 9 A6 6 0 1 1 100 21 A3.2 6 0 1 0 100 9Z" fill={accentColor} fillOpacity="0.68" />}
              {index === 5 && <circle cx="122" cy="15" r="2.2" fill={accentColor} fillOpacity="0.78" />}
            </g>
          ))}
        </svg>
      </div>
    )
  }

  if (embellishmentId === 'botanical-corners') {
    return (
      <div style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" viewBox="0 0 600 800" preserveAspectRatio="none">
          <g transform="translate(36 34)">
            <path d="M0 80 C22 38 56 10 110 0" fill="none" stroke={accentColor} strokeWidth="2" strokeOpacity="0.34" />
            <path d="M18 58 C30 38 48 26 70 18" fill="none" stroke={accentColor} strokeWidth="1.2" strokeOpacity="0.28" />
            <ellipse cx="26" cy="54" rx="12" ry="6" fill={accentColor} fillOpacity="0.18" transform="rotate(-32 26 54)" />
            <ellipse cx="48" cy="34" rx="13" ry="6" fill={accentColor} fillOpacity="0.16" transform="rotate(-18 48 34)" />
            <ellipse cx="78" cy="16" rx="14" ry="6" fill={accentColor} fillOpacity="0.16" transform="rotate(-6 78 16)" />
          </g>
          <g transform="translate(564 34) scale(-1 1)">
            <path d="M0 80 C22 38 56 10 110 0" fill="none" stroke={accentColor} strokeWidth="2" strokeOpacity="0.34" />
            <path d="M18 58 C30 38 48 26 70 18" fill="none" stroke={accentColor} strokeWidth="1.2" strokeOpacity="0.28" />
            <ellipse cx="26" cy="54" rx="12" ry="6" fill={accentColor} fillOpacity="0.18" transform="rotate(-32 26 54)" />
            <ellipse cx="48" cy="34" rx="13" ry="6" fill={accentColor} fillOpacity="0.16" transform="rotate(-18 48 34)" />
            <ellipse cx="78" cy="16" rx="14" ry="6" fill={accentColor} fillOpacity="0.16" transform="rotate(-6 78 16)" />
          </g>
          <g transform="translate(42 744) scale(1 -1)">
            <path d="M0 80 C22 38 56 10 110 0" fill="none" stroke={accentColor} strokeWidth="2" strokeOpacity="0.24" />
            <ellipse cx="24" cy="52" rx="11" ry="5.5" fill={accentColor} fillOpacity="0.14" transform="rotate(-34 24 52)" />
            <ellipse cx="56" cy="24" rx="13" ry="6" fill={accentColor} fillOpacity="0.14" transform="rotate(-10 56 24)" />
          </g>
        </svg>
      </div>
    )
  }

  if (embellishmentId === 'wax-drip') {
    return (
      <div style={{ position: 'absolute', top: '34px', right: '28px', opacity, pointerEvents: 'none' }}>
        <svg width={size} height={size + 30} viewBox="0 0 96 126">
          <circle cx="62" cy="26" r="18" fill="rgba(134,18,24,0.72)" stroke="rgba(98,8,12,0.44)" strokeWidth="2" />
          <circle cx="62" cy="26" r="12" fill="rgba(164,28,36,0.5)" />
          <path d="M56 42 C54 58 60 70 54 86 C50 96 54 108 60 118 C68 106 66 94 70 82 C74 68 68 54 70 42Z" fill="rgba(148,22,28,0.42)" stroke="rgba(110,10,14,0.3)" strokeWidth="1.4" />
          <path d="M68 40 C74 58 82 74 76 90 C73 98 76 110 82 118 C86 108 88 96 86 84 C84 68 80 56 76 42Z" fill="rgba(168,36,44,0.28)" />
        </svg>
      </div>
    )
  }

  if (embellishmentId === 'aurora-wash') {
    return (
      <div style={{ position: 'absolute', inset: 0, opacity: mode === 'compose' ? 0.36 : 0.42, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" viewBox="0 0 600 800" preserveAspectRatio="none">
          <defs>
            <filter id="aurora-blur">
              <feGaussianBlur stdDeviation="26" />
            </filter>
          </defs>
          <ellipse cx="140" cy="180" rx="110" ry="54" fill="rgba(100,220,200,0.32)" filter="url(#aurora-blur)" />
          <ellipse cx="420" cy="150" rx="130" ry="60" fill="rgba(180,120,255,0.24)" filter="url(#aurora-blur)" />
          <ellipse cx="300" cy="620" rx="180" ry="70" fill="rgba(255,160,120,0.18)" filter="url(#aurora-blur)" />
          <path d="M40 220 C120 180 190 260 280 210 C360 166 450 242 560 196" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="9" strokeLinecap="round" filter="url(#aurora-blur)" />
        </svg>
      </div>
    )
  }

  return null
}
