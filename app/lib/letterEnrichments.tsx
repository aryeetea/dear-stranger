import type { CSSProperties, ReactNode } from 'react'

export type HandwritingStyle = 'typed' | 'steady' | 'slanted' | 'lush' | 'diary'
export type EmbellishmentId = 'none' | 'pressed-flower' | 'margin-stars' | 'constellation' | 'ribbon-thread' | 'tea-stain'

export const HANDWRITING_STYLES: { id: HandwritingStyle; label: string; desc: string }[] = [
  { id: 'typed', label: 'Typed', desc: 'Set cleanly, without handwriting texture' },
  { id: 'steady', label: 'Steady Hand', desc: 'Clean and deliberate' },
  { id: 'slanted', label: 'Slanted Ink', desc: 'A little swept and breathy' },
  { id: 'lush', label: 'Lush Script', desc: 'Softly dramatic and ornate' },
  { id: 'diary', label: 'Diary Hand', desc: 'Intimate, close, and restless' },
]

export const LETTER_EMBELLISHMENTS: { id: EmbellishmentId; label: string; desc: string }[] = [
  { id: 'none', label: 'None', desc: 'Keep it bare' },
  { id: 'pressed-flower', label: 'Pressed Flower', desc: 'A petal kept between pages' },
  { id: 'margin-stars', label: 'Margin Stars', desc: 'Small stars wandering the edges' },
  { id: 'constellation', label: 'Constellation', desc: 'A quiet chart in the margin' },
  { id: 'ribbon-thread', label: 'Ribbon Thread', desc: 'A tied thread across the page' },
  { id: 'tea-stain', label: 'Tea Stain', desc: 'A ring from a slow evening' },
]

export function getHandwritingStyleStyles(style: HandwritingStyle): CSSProperties {
  switch (style) {
    case 'typed':
      return {
        letterSpacing: '0.01em',
        transform: 'none',
        fontStyle: 'normal',
        textShadow: 'none',
        filter: 'none',
      }
    case 'slanted':
      return {
        fontStyle: 'italic',
        letterSpacing: '0.03em',
        transform: 'rotate(-0.45deg)',
      }
    case 'lush':
      return {
        letterSpacing: '0.035em',
        lineHeight: 2.12,
        transform: 'rotate(0.35deg)',
        textShadow: '0.35px 0 rgba(0,0,0,0.08)',
      }
    case 'diary':
      return {
        letterSpacing: '0.018em',
        transform: 'rotate(-0.18deg)',
        filter: 'saturate(0.94)',
      }
    default:
      return {
        letterSpacing: '0.02em',
      }
  }
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

  return null
}