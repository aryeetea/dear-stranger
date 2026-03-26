'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SCRIBE_STARS = Array.from({ length: 20 }, (_, i) => ({
  width: `${(i % 3) * 0.45 + 0.3}px`,
  left: `${((i * 47 + 13) % 100)}%`,
  top: `${((i * 61 + 7) % 100)}%`,
  opacity: (i % 5) * 0.04 + 0.04,
}))

const PAPERS = [
  { id: 'ornate', label: 'Ornate Stationery', sublabel: 'Gold border, cream paper', unlocksAt: 0, swatch: 'linear-gradient(135deg, #f4ead0, #e8d090)' },
  { id: 'floral', label: 'Floral Letter', sublabel: 'Soft pink flower outlines', unlocksAt: 0, swatch: 'linear-gradient(135deg, #f8f0f4, #f0e0ea)' },
  { id: 'plain', label: 'Plain White', sublabel: 'Minimal, clean, classic', unlocksAt: 0, swatch: 'linear-gradient(135deg, #fff, #f7f7f7)' },
  { id: 'starfield', label: 'Starfield', sublabel: 'Dark with subtle stars', unlocksAt: 2, swatch: 'linear-gradient(135deg, #181c2a, #232946)' },
  { id: 'vellum', label: 'Vellum', sublabel: 'Translucent, soft texture', unlocksAt: 4, swatch: 'linear-gradient(135deg, #f9f7f3, #ece9e6)' },
  { id: 'notepad', label: 'Spiral Notepad', sublabel: 'Ruled with spiral binding', unlocksAt: 3, swatch: 'linear-gradient(135deg, #e8f4ff, #d0e8f8)' },
  { id: 'blue-ruled', label: 'Blue Ruled', sublabel: 'Classic blue lined paper', unlocksAt: 6, swatch: 'linear-gradient(135deg, #eaf6ff, #dbefff)' },
  { id: 'kraft', label: 'Kraft Paper', sublabel: 'Brown recycled look', unlocksAt: 8, swatch: 'linear-gradient(135deg, #e2c9a0, #cbb484)' },
  { id: 'scrapbook', label: 'Scrapbook Letter', sublabel: 'Corkboard with tape', unlocksAt: 3, swatch: 'linear-gradient(135deg, #e8d8b0, #d8c090)' },
  { id: 'ribbon', label: 'Ribbon Letter', sublabel: 'Red ribbon bow border', unlocksAt: 5, swatch: 'linear-gradient(135deg, #f8f0ec, #f0e0d8)' },
  { id: 'postage', label: 'Postage Letter', sublabel: 'Stamp corners, postmark', unlocksAt: 8, swatch: 'linear-gradient(135deg, #f0ece8, #e4dcd4)' },
  { id: 'sakura', label: 'Cherry Blossom', sublabel: 'Soft pink floral border', unlocksAt: 10, swatch: 'linear-gradient(135deg, #fce8f0, #f0c8d8)' },
  { id: 'aged', label: 'Aged & Distressed', sublabel: 'Time-worn parchment', unlocksAt: 25, swatch: 'linear-gradient(135deg, #c8a870, #b89050)' },
]

const STAMPS = [
  { id: 'moon-seal', category: 'Wax Seal', label: 'Moon Seal' },
  { id: 'sun-seal', category: 'Wax Seal', label: 'Sun Seal' },
  { id: 'star-seal', category: 'Wax Seal', label: 'Star Seal' },
  { id: 'veilmore', category: 'Postmark', label: 'Veilmore' },
  { id: 'ashpoint', category: 'Postmark', label: 'Ashpoint' },
  { id: 'duskhollow', category: 'Postmark', label: 'Duskhollow' },
  { id: 'compass', category: 'Illustrated', label: 'Compass' },
  { id: 'feather', category: 'Illustrated', label: 'Feather' },
  { id: 'key', category: 'Illustrated', label: 'Key' },
  { id: 'eye', category: 'Illustrated', label: 'Eye' },
  { id: 'orion', category: 'Constellation', label: 'Orion' },
  { id: 'cassiopeia', category: 'Constellation', label: 'Cassiopeia' },
  { id: 'lyra', category: 'Constellation', label: 'Lyra' },
  { id: 'spiral', category: 'Abstract', label: 'Spiral' },
  { id: 'diamond', category: 'Abstract', label: 'Diamond' },
  { id: 'wave', category: 'Abstract', label: 'Wave' },
]

const FONTS = [
  { id: 'cormorant', label: 'Cormorant', family: "'Cormorant Garamond', serif", preview: 'A letter across the stars' },
  { id: 'im-fell', label: 'IM Fell', family: "'IM Fell English', serif", preview: 'A letter across the stars' },
  { id: 'georgia', label: 'Georgia', family: "Georgia, serif", preview: 'A letter across the stars' },
  { id: 'times', label: 'Times New Roman', family: "'Times New Roman', Times, serif", preview: 'A letter across the stars' },
  { id: 'playfair', label: 'Playfair', family: "'Playfair Display', serif", preview: 'A letter across the stars' },
  { id: 'dancing', label: 'Dancing Script', family: "'Dancing Script', cursive", preview: 'A letter across the stars' },
  { id: 'parisienne', label: 'Parisienne', family: "'Parisienne', cursive", preview: 'A dreamy letter across the stars' },
  { id: 'allura', label: 'Allura', family: "'Allura', cursive", preview: 'A dreamy letter across the stars' },
  { id: 'sacramento', label: 'Sacramento', family: "'Sacramento', cursive", preview: 'A letter across the stars' },
  { id: 'style-script', label: 'Style Script', family: "'Style Script', cursive", preview: 'A dreamy letter across the stars' },
  { id: 'satisfy', label: 'Satisfy', family: "'Satisfy', cursive", preview: 'A letter across the stars' },
  { id: 'pacifico', label: 'Pacifico', family: "'Pacifico', cursive", preview: 'A letter across the stars' },
  { id: 'special-elite', label: 'Special Elite', family: "'Special Elite', cursive", preview: 'A letter across the stars' },
  { id: 'bellefair', label: 'Bellefair', family: "'Bellefair', serif", preview: 'A letter across the stars' },
  { id: 'baskervville', label: 'Baskervville', family: "'Baskervville', serif", preview: 'A letter across the stars' },
  { id: 'marcellus', label: 'Marcellus', family: "'Marcellus', serif", preview: 'A letter across the stars' },
  { id: 'courier', label: 'Courier Prime', family: "'Courier Prime', monospace", preview: 'A letter across the stars' },
  { id: 'indie', label: 'Indie Flower', family: "'Indie Flower', cursive", preview: 'A letter across the stars' },
  { id: 'roboto-slab', label: 'Roboto Slab', family: "'Roboto Slab', serif", preview: 'A letter across the stars' },
  { id: 'lora', label: 'Lora', family: "'Lora', serif", preview: 'A letter across the stars' },
  { id: 'quicksand', label: 'Quicksand', family: "'Quicksand', sans-serif", preview: 'A letter across the stars' },
  { id: 'source-sans', label: 'Source Sans Pro', family: "'Source Sans Pro', sans-serif", preview: 'A letter across the stars' },
  { id: 'cinzel', label: 'Cinzel', family: "'Cinzel', serif", preview: 'A LETTER ACROSS THE STARS' },
  { id: 'roboto', label: 'Roboto', family: "'Roboto', sans-serif", preview: 'A letter across the stars' },
  { id: 'lato', label: 'Lato', family: "'Lato', sans-serif", preview: 'A letter across the stars' },
]

const FONT_COLORS = [
  { id: 'iron-gall',  label: 'Iron Gall',     color: '#1a0e04', desc: 'Classic black ink'   },
  { id: 'prussian',  label: 'Prussian Blue',  color: '#0c2040', desc: 'Deep ocean blue'     },
  { id: 'forest',    label: 'Forest Green',   color: '#0c2410', desc: 'Dark forest green'   },
  { id: 'burgundy',  label: 'Burgundy',       color: '#380614', desc: 'Rich wine red'       },
  { id: 'amethyst',  label: 'Amethyst',       color: '#260c38', desc: 'Deep violet'         },
  { id: 'sepia',     label: 'Sepia',          color: '#4a2a08', desc: 'Warm aged brown'     },
  { id: 'midnight',  label: 'Midnight',       color: '#08081c', desc: 'Deep indigo'         },
  { id: 'jade',      label: 'Jade',           color: '#0a2820', desc: 'Dark jade green'     },
  { id: 'crimson',   label: 'Crimson',        color: '#420808', desc: 'Deep crimson red'    },
  { id: 'slate',     label: 'Slate',          color: '#161620', desc: 'Cool blue-grey'      },
  { id: 'teak',      label: 'Teak',           color: '#3a1c06', desc: 'Warm teak wood'      },
  { id: 'navy',      label: 'Navy',           color: '#060a28', desc: 'Deep navy blue'      },
]

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const PAPER_TONES = [
  { id: 'parchment', label: 'Parchment',   bg: 'linear-gradient(160deg, #fdf6e0, #f8efcc)', desc: 'Warm cream'    },
  { id: 'ivory',     label: 'Ivory',        bg: 'linear-gradient(160deg, #fefefc, #f8f8f0)', desc: 'Pure ivory'    },
  { id: 'rose',      label: 'Rose Blush',   bg: 'linear-gradient(160deg, #fef0f3, #fce0e8)', desc: 'Soft pink'     },
  { id: 'sky',       label: 'Sky',          bg: 'linear-gradient(160deg, #f0f6fe, #e4eefb)', desc: 'Pale blue'     },
  { id: 'sage',      label: 'Sage',         bg: 'linear-gradient(160deg, #f0f6f0, #e4eee4)', desc: 'Pale green'    },
  { id: 'lavender',  label: 'Lavender',     bg: 'linear-gradient(160deg, #f4f0fc, #eae0f8)', desc: 'Soft violet'   },
  { id: 'peach',     label: 'Peach',        bg: 'linear-gradient(160deg, #fef4ec, #fce8d8)', desc: 'Warm peach'    },
  { id: 'mist',      label: 'Silver Mist',  bg: 'linear-gradient(160deg, #f4f4f8, #eaeaf0)', desc: 'Cool grey'     },
  { id: 'gold',      label: 'Golden',       bg: 'linear-gradient(160deg, #fef8e0, #faecc8)', desc: 'Warm gold'     },
  { id: 'lilac',     label: 'Lilac',        bg: 'linear-gradient(160deg, #faf0fc, #f2e0f8)', desc: 'Soft lilac'    },
  { id: 'mint',      label: 'Mint',         bg: 'linear-gradient(160deg, #f0faf6, #e4f4ec)', desc: 'Cool mint'     },
]

function StampSVG({ id, size = 60 }: { id: string; size?: number }) {
  const s = size
  if (id === 'moon-seal') return <svg width={s} height={s} viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#8b1a1a"/><circle cx="30" cy="30" r="24" fill="#9a2020"/><path d="M22 20 Q30 14 38 20 Q32 22 30 30 Q24 22 22 20Z" fill="rgba(255,220,200,0.7)"/><text x="30" y="45" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(255,200,180,0.7)" letterSpacing="1">SEALED</text></svg>
  if (id === 'sun-seal') return <svg width={s} height={s} viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#8b6010"/><circle cx="30" cy="30" r="24" fill="#a07018"/>{[...Array(8)].map((_,i)=>{const a=(i/8)*Math.PI*2;return <line key={i} x1={30+Math.cos(a)*14} y1={30+Math.sin(a)*14} x2={30+Math.cos(a)*22} y2={30+Math.sin(a)*22} stroke="rgba(255,220,100,0.5)" strokeWidth="2" strokeLinecap="round"/>})}<circle cx="30" cy="30" r="10" fill="#c9a040"/></svg>
  if (id === 'star-seal') return <svg width={s} height={s} viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#1a1a5a"/><circle cx="30" cy="30" r="24" fill="#22226a"/><polygon points="30,12 33,22 44,22 35,28 38,40 30,33 22,40 25,28 16,22 27,22" fill="rgba(200,200,255,0.7)"/></svg>
  if (id === 'veilmore') return <svg width={s} height={s} viewBox="0 0 80 80"><rect x="2" y="2" width="76" height="76" fill="none" stroke="rgba(80,40,20,0.7)" strokeWidth="2" rx="4"/><text x="40" y="28" textAnchor="middle" fontSize="9" fontFamily="serif" fill="rgba(60,30,10,0.8)" letterSpacing="2" fontWeight="bold">VEILMORE</text><line x1="12" y1="34" x2="68" y2="34" stroke="rgba(80,40,20,0.4)" strokeWidth="1"/><text x="40" y="48" textAnchor="middle" fontSize="7" fontFamily="serif" fill="rgba(60,30,10,0.6)">COSMIC POST</text></svg>
  if (id === 'ashpoint') return <svg width={s} height={s} viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="none" stroke="rgba(60,30,20,0.7)" strokeWidth="2"/><text x="40" y="36" textAnchor="middle" fontSize="9" fontFamily="serif" fill="rgba(50,25,10,0.85)" letterSpacing="2" fontWeight="bold">ASHPOINT</text><text x="40" y="52" textAnchor="middle" fontSize="7" fontFamily="serif" fill="rgba(50,25,10,0.5)">BETWEEN WORLDS</text></svg>
  if (id === 'duskhollow') return <svg width={s} height={s} viewBox="0 0 80 80"><ellipse cx="40" cy="40" rx="36" ry="28" fill="none" stroke="rgba(40,20,60,0.7)" strokeWidth="2"/><text x="40" y="36" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(40,20,60,0.85)" letterSpacing="2" fontWeight="bold">DUSKHOLLOW</text><text x="40" y="54" textAnchor="middle" fontSize="6" fontFamily="serif" fill="rgba(40,20,60,0.5)">WHERE LETTERS REST</text></svg>
  if (id === 'compass') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(200,170,100,0.15)" stroke="rgba(120,80,20,0.6)" strokeWidth="1.5" rx="2"/><circle cx="30" cy="28" r="16" fill="none" stroke="rgba(100,60,10,0.5)" strokeWidth="1"/><line x1="30" y1="14" x2="30" y2="42" stroke="rgba(100,60,10,0.4)" strokeWidth="1"/><line x1="16" y1="28" x2="44" y2="28" stroke="rgba(100,60,10,0.4)" strokeWidth="1"/><polygon points="30,14 28,24 32,24" fill="rgba(140,20,20,0.7)"/><circle cx="30" cy="28" r="3" fill="rgba(100,60,10,0.6)"/></svg>
  if (id === 'feather') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(200,230,200,0.15)" stroke="rgba(60,100,60,0.5)" strokeWidth="1.5" rx="2"/><path d="M30 10 C 45 15 50 30 30 50 C 20 35 15 20 30 10Z" fill="rgba(100,150,100,0.3)" stroke="rgba(60,100,60,0.5)" strokeWidth="1"/><line x1="30" y1="10" x2="30" y2="50" stroke="rgba(60,100,60,0.5)" strokeWidth="1.5"/></svg>
  if (id === 'key') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(220,190,120,0.15)" stroke="rgba(120,90,20,0.6)" strokeWidth="1.5" rx="2"/><circle cx="24" cy="24" r="10" fill="none" stroke="rgba(140,100,20,0.7)" strokeWidth="2"/><line x1="31" y1="31" x2="46" y2="46" stroke="rgba(140,100,20,0.7)" strokeWidth="2.5" strokeLinecap="round"/></svg>
  if (id === 'eye') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(200,220,240,0.1)" stroke="rgba(40,60,100,0.5)" strokeWidth="1.5" rx="2"/><path d="M 10 30 Q 30 14 50 30 Q 30 46 10 30Z" fill="rgba(100,140,200,0.2)" stroke="rgba(40,80,160,0.6)" strokeWidth="1.5"/><circle cx="30" cy="30" r="8" fill="rgba(40,80,160,0.35)"/><circle cx="30" cy="30" r="4" fill="rgba(20,40,100,0.6)"/></svg>
  if (id === 'orion') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(10,10,30,0.6)" stroke="rgba(150,160,220,0.4)" strokeWidth="1.5" rx="2"/>{[[20,12],[22,22],[30,26],[38,22],[40,12],[18,36],[30,40],[42,36]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2" fill="rgba(200,210,255,0.85)"/>)}</svg>
  if (id === 'cassiopeia') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(10,10,30,0.6)" stroke="rgba(150,160,220,0.4)" strokeWidth="1.5" rx="2"/>{[[12,30],[22,20],[30,28],[38,18],[48,26]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2.5" fill="rgba(200,210,255,0.85)"/>)}<polyline points="12,30 22,20 30,28 38,18 48,26" fill="none" stroke="rgba(150,160,220,0.35)" strokeWidth="0.8"/></svg>
  if (id === 'lyra') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(10,10,30,0.6)" stroke="rgba(150,160,220,0.4)" strokeWidth="1.5" rx="2"/><circle cx="30" cy="16" r="3" fill="rgba(255,240,180,0.9)"/>{[[22,28],[38,28],[20,40],[40,40],[30,46]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="1.8" fill="rgba(200,210,255,0.8)"/>)}</svg>
  if (id === 'spiral') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(180,160,220,0.1)" stroke="rgba(100,80,160,0.5)" strokeWidth="1.5" rx="2"/><path d="M30 30 Q36 24 30 18 Q20 18 18 28 Q16 42 30 44 Q46 44 48 28 Q50 10 30 8 Q8 8 6 30" fill="none" stroke="rgba(100,80,160,0.6)" strokeWidth="1.5" strokeLinecap="round"/></svg>
  if (id === 'diamond') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(180,220,240,0.1)" stroke="rgba(60,120,160,0.5)" strokeWidth="1.5" rx="2"/><polygon points="30,8 52,30 30,52 8,30" fill="none" stroke="rgba(60,120,160,0.6)" strokeWidth="1.5"/></svg>
  if (id === 'wave') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(180,230,240,0.1)" stroke="rgba(40,120,160,0.5)" strokeWidth="1.5" rx="2"/>{[18,26,34,42].map((y,i)=><path key={i} d={`M8 ${y} Q18 ${y-6} 22 ${y} Q26 ${y+6} 30 ${y} Q34 ${y-6} 38 ${y} Q42 ${y+6} 46 ${y} Q50 ${y-6} 54 ${y}`} fill="none" stroke={`rgba(40,120,160,${0.3+i*0.1})`} strokeWidth="1.2" strokeLinecap="round"/>)}</svg>
  return <svg width={s} height={s} viewBox="0 0 60 60"><circle cx="30" cy="30" r="25" fill="none" stroke="rgba(200,168,76,0.4)" strokeWidth="1.5"/><text x="30" y="34" textAnchor="middle" fontSize="14" fill="rgba(200,168,76,0.6)">✦</text></svg>
}

function EnvelopeSVG({ color = '#c8a050' }: { color?: string }) {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80">
      <rect x="2" y="20" width="116" height="58" rx="3" fill={color} stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
      <path d="M2 20 L60 56 L118 20 Z" fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth="1"/>
      <path d="M2 78 L60 46 L118 78" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1"/>
      <line x1="2" y1="20" x2="60" y2="46" stroke="rgba(0,0,0,0.1)" strokeWidth="0.8"/>
      <line x1="118" y1="20" x2="60" y2="46" stroke="rgba(0,0,0,0.1)" strokeWidth="0.8"/>
    </svg>
  )
}

function OrnateStationery({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || 'linear-gradient(160deg, #fdf6e0 0%, #f8efcc 100%)', boxShadow:'0 20px 80px rgba(0,0,0,0.7)', overflow:'hidden' }}>
      {[['0','0','0deg'],['100%','0','90deg'],['0','100%','-90deg'],['100%','100%','180deg']].map(([l,t,rot],i)=>(
        <div key={i} style={{ position:'absolute', left:l, top:t, transform:`translate(${i%2?'-100%':'0'},${i>1?'-100%':'0'})`, zIndex:3, pointerEvents:'none' }}>
          <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform:`rotate(${rot})` }}>
            <path d="M0 0 L36 0 Q45 0 45 9 L45 36" fill="none" stroke="rgba(180,130,40,0.6)" strokeWidth="2"/>
            <path d="M0 0 Q45 0 45 45 Q0 45 0 0Z" fill="none" stroke="rgba(180,130,40,0.4)" strokeWidth="1"/>
            <circle cx="4" cy="4" r="3" fill="rgba(180,130,40,0.5)"/>
            <path d="M18 18 Q24 12 26 18 Q32 20 26 26 Q24 32 18 28 Q12 24 18 18Z" fill="rgba(180,130,40,0.2)" stroke="rgba(180,130,40,0.4)" strokeWidth="0.8"/>
            <circle cx="22" cy="22" r="2" fill="rgba(180,130,40,0.4)"/>
          </svg>
        </div>
      ))}
      <div style={{ position:'absolute', inset:'14px', border:'1.5px solid rgba(180,130,40,0.45)', pointerEvents:'none', zIndex:2 }}/>
      <div style={{ position:'absolute', inset:'20px', border:'1px solid rgba(180,130,40,0.2)', pointerEvents:'none', zIndex:2 }}/>
      <div style={{ textAlign:'center', paddingTop:'36px', paddingBottom:'4px', position:'relative', zIndex:3 }}>
        <p style={{ fontFamily:"'Cinzel', serif", fontSize:'10px', letterSpacing:'0.5em', color:'rgba(150,100,20,0.72)', textTransform:'uppercase' }}>✦ Dear Stranger ✦</p>
        <div style={{ height:'1px', background:'linear-gradient(90deg, transparent, rgba(180,130,40,0.5), transparent)', margin:'8px 40px 0' }}/>
      </div>
      {[...Array(20)].map((_,i)=><div key={i} style={{ position:'absolute', left:'44px', right:'44px', top:`${90+i*30}px`, height:'1px', background:'rgba(150,110,30,0.1)' }}/>)}
      <div style={{ padding:'8px 52px 52px', position:'relative', zIndex:3 }}>{children}</div>
      <div style={{ textAlign:'center', paddingBottom:'28px', position:'relative', zIndex:3 }}>
        <p style={{ fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.4em', color:'rgba(150,100,20,0.58)' }}>— ✦ —</p>
      </div>
    </div>
  )
}

function FloralLetter({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || 'linear-gradient(160deg, #fefafa 0%, #faf4f6 100%)', boxShadow:'0 20px 80px rgba(0,0,0,0.6)', overflow:'hidden' }}>
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:'60px', pointerEvents:'none', zIndex:1 }}>
        <svg width="60" height="100%" viewBox="0 0 60 600" preserveAspectRatio="none">
          {[50,130,210,290,370,450].map((y,i)=>(
            <g key={i} transform={`translate(30,${y})`}>
              {[0,72,144,216,288].map((rot,j)=><ellipse key={j} cx="0" cy="-11" rx="8" ry="5" fill="rgba(210,150,170,0.3)" transform={`rotate(${rot})`}/>)}
              <circle cx="0" cy="0" r="3.5" fill="rgba(210,150,170,0.5)"/>
            </g>
          ))}
          <path d="M30 0 Q25 75 30 150 Q35 225 30 300 Q25 375 30 450 Q35 525 30 600" fill="none" stroke="rgba(180,120,140,0.15)" strokeWidth="1"/>
        </svg>
      </div>
      <div style={{ position:'absolute', inset:'12px', border:'1px solid rgba(200,150,170,0.25)', pointerEvents:'none', zIndex:2 }}/>
      {[...Array(20)].map((_,i)=><div key={i} style={{ position:'absolute', left:'36px', right:'70px', top:`${60+i*30}px`, height:'1px', background:'rgba(200,150,170,0.12)' }}/>)}
      <div style={{ padding:'36px 76px 44px 40px', position:'relative', zIndex:2 }}>{children}</div>
    </div>
  )
}

function RibbonLetter({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || 'linear-gradient(160deg, #fdf8f4 0%, #f8f0e8 100%)', boxShadow:'0 20px 80px rgba(0,0,0,0.6)', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1 }}>
        <svg width="100%" height="100%" style={{ position:'absolute', inset:0 }}>
          <path d="M0 8 Q50 2 100 8 Q150 14 200 8 Q250 2 300 8 Q350 14 400 8 Q450 2 500 8 Q550 14 600 8" fill="none" stroke="rgba(160,30,30,0.6)" strokeWidth="3" strokeLinecap="round"/>
          <path d="M8 0 Q2 50 8 100 Q14 150 8 200 Q2 250 8 300 Q14 350 8 400 Q2 450 8 500" fill="none" stroke="rgba(160,30,30,0.5)" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <div style={{ position:'absolute', top:'-4px', left:'50%', transform:'translateX(-50%)', zIndex:3 }}>
          <svg width="80" height="44" viewBox="0 0 80 44">
            <ellipse cx="20" cy="22" rx="18" ry="10" fill="rgba(140,20,20,0.7)" transform="rotate(-15,20,22)"/>
            <ellipse cx="60" cy="22" rx="18" ry="10" fill="rgba(140,20,20,0.7)" transform="rotate(15,60,22)"/>
            <ellipse cx="40" cy="22" rx="10" ry="10" fill="rgba(160,30,30,0.85)"/>
            <ellipse cx="38" cy="20" rx="4" ry="3" fill="rgba(200,80,80,0.3)"/>
            <path d="M34 32 Q30 42 26 44" fill="none" stroke="rgba(140,20,20,0.6)" strokeWidth="3" strokeLinecap="round"/>
            <path d="M46 32 Q50 42 54 44" fill="none" stroke="rgba(140,20,20,0.6)" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ position:'absolute', bottom:'20px', left:'50%', transform:'translateX(-50%)', zIndex:3 }}>
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="26" fill="rgba(140,20,20,0.85)"/>
            <circle cx="30" cy="30" r="22" fill="rgba(160,30,30,0.7)"/>
            <path d="M30,18 L32,26 L40,26 L34,31 L36,39 L30,34 L24,39 L26,31 L20,26 L28,26Z" fill="rgba(255,200,200,0.6)"/>
          </svg>
        </div>
      </div>
      {[...Array(18)].map((_,i)=><div key={i} style={{ position:'absolute', left:'32px', right:'32px', top:`${72+i*30}px`, height:'1px', background:'rgba(160,30,30,0.07)' }}/>)}
      <div style={{ padding:'52px 40px 80px', position:'relative', zIndex:2 }}>{children}</div>
    </div>
  )
}

function PostageLetter({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || 'linear-gradient(160deg, #f5f0ec 0%, #ede8e0 100%)', boxShadow:'0 20px 80px rgba(0,0,0,0.65)', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1 }}>
        <div style={{ position:'absolute', inset:'12px', border:'2px solid rgba(100,60,140,0.4)' }}/>
        <div style={{ position:'absolute', top:'20px', left:'20px', width:'70px', height:'80px', border:'1.5px solid rgba(160,40,40,0.5)', background:'rgba(255,255,255,0.5)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'4px' }}>
          <svg width="40" height="36" viewBox="0 0 40 36"><path d="M20 4 C14 4 8 8 8 16 C8 24 20 32 20 32 C20 32 32 24 32 16 C32 8 26 4 20 4Z" fill="rgba(200,60,80,0.3)" stroke="rgba(180,40,60,0.5)" strokeWidth="1"/></svg>
          <p style={{ fontFamily:'serif', fontSize:'7px', color:'rgba(140,30,30,0.7)', letterSpacing:'0.5px', fontWeight:'bold' }}>POSTAGE</p>
        </div>
        <div style={{ position:'absolute', top:'20px', right:'20px', width:'70px', height:'80px', border:'1.5px solid rgba(160,40,40,0.5)', background:'rgba(255,255,255,0.5)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'4px' }}>
          <svg width="40" height="36" viewBox="0 0 40 36"><circle cx="16" cy="16" r="10" fill="none" stroke="rgba(180,40,60,0.5)" strokeWidth="1.5"/><path d="M22 12 L28 8 L30 14 L24 18" fill="none" stroke="rgba(180,40,60,0.5)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <p style={{ fontFamily:'serif', fontSize:'7px', color:'rgba(140,30,30,0.7)', letterSpacing:'0.5px', fontWeight:'bold' }}>POSTAGE</p>
        </div>
        <div style={{ position:'absolute', bottom:'28px', right:'28px', transform:'rotate(12deg)', opacity:0.45 }}>
          <svg width="80" height="70" viewBox="0 0 80 70"><ellipse cx="40" cy="35" rx="36" ry="30" fill="none" stroke="rgba(140,60,40,0.8)" strokeWidth="2"/><text x="40" y="30" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(120,50,30,0.8)" fontWeight="bold">SENT</text></svg>
        </div>
        <div style={{ position:'absolute', top:'110px', left:'50%', transform:'translateX(-50%)', whiteSpace:'nowrap' }}>
          <p style={{ fontFamily:"'Cinzel', serif", fontSize:'11px', letterSpacing:'0.5em', color:'rgba(100,60,140,0.74)', textTransform:'uppercase' }}>A Letter</p>
          <div style={{ height:'1px', background:'linear-gradient(90deg, transparent, rgba(100,60,140,0.3), transparent)', marginTop:'4px' }}/>
        </div>
      </div>
      {[...Array(18)].map((_,i)=><div key={i} style={{ position:'absolute', left:'28px', right:'28px', top:`${140+i*28}px`, height:'1px', background:'rgba(100,60,140,0.08)' }}/>)}
      <div style={{ padding:'140px 36px 60px', position:'relative', zIndex:2 }}>{children}</div>
    </div>
  )
}

function SpiralNotepad({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', display:'flex' }}>
      <div style={{ width:'28px', flexShrink:0, background:'linear-gradient(180deg, #d0d8e0 0%, #c0c8d0 100%)', borderRadius:'4px 0 0 4px', boxShadow:'2px 0 8px rgba(0,0,0,0.2)', position:'relative', zIndex:2 }}>
        {[...Array(14)].map((_,i)=><div key={i} style={{ position:'absolute', left:'4px', top:`${20+i*30}px`, width:'20px', height:'14px', borderRadius:'50%', border:'2.5px solid rgba(100,120,140,0.7)', background:'rgba(160,180,200,0.3)' }}/>)}
      </div>
      <div style={{ flex:1, background: paperBg || '#f8fbff', boxShadow:'0 20px 80px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden' }}>
        <div style={{ background:'linear-gradient(180deg, #d4e8f8 0%, #c8e0f4 100%)', padding:'12px 20px', borderBottom:'2px solid rgba(100,160,220,0.3)', display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'28px', height:'28px', borderRadius:'50%', border:'2px solid rgba(100,160,220,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:'rgba(100,160,220,0.6)' }}/>
          </div>
          <p style={{ fontFamily:"'Cinzel', serif", fontSize:'10px', letterSpacing:'0.3em', color:'rgba(60,100,160,0.78)', textTransform:'uppercase' }}>Letter</p>
        </div>
        {[...Array(22)].map((_,i)=><div key={i} style={{ position:'absolute', left:'48px', right:'16px', top:`${64+i*28}px`, height:'1px', background:'rgba(100,160,220,0.2)' }}/>)}
        <div style={{ position:'absolute', left:'40px', top:'64px', bottom:'16px', width:'1px', background:'rgba(220,80,80,0.3)' }}/>
        <div style={{ padding:'14px 20px 20px 52px', position:'relative', zIndex:1 }}>{children}</div>
      </div>
    </div>
  )
}

function ScrapbookLetter({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background:'linear-gradient(155deg, #d4c090 0%, #c8b078 100%)', padding:'24px', boxShadow:'0 20px 80px rgba(0,0,0,0.7)' }}>
      <div style={{ position:'absolute', top:'8px', left:'30%', width:'80px', height:'18px', background:'rgba(200,220,240,0.55)', transform:'rotate(-2deg)', border:'1px solid rgba(180,200,220,0.4)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', top:'8px', right:'25%', width:'60px', height:'18px', background:'rgba(200,220,240,0.55)', transform:'rotate(3deg)', border:'1px solid rgba(180,200,220,0.4)', pointerEvents:'none' }}/>
      <div style={{ position:'relative', background: paperBg || 'linear-gradient(160deg, #fef8e8 0%, #faf2d8 100%)', padding:'32px 28px', transform:'rotate(-0.5deg)', boxShadow:'2px 4px 20px rgba(0,0,0,0.2)', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'-8px', left:'50%', transform:'translateX(-50%)', width:'16px', height:'16px', borderRadius:'50%', background:'radial-gradient(circle at 35% 35%, #e87070, #8b2020)', boxShadow:'0 2px 6px rgba(0,0,0,0.4)' }}/>
        {[...Array(18)].map((_,i)=><div key={i} style={{ position:'absolute', left:'20px', right:'20px', top:`${48+i*28}px`, height:'1px', background:'rgba(140,100,40,0.12)' }}/>)}
        <div style={{ position:'relative', zIndex:1 }}>{children}</div>
      </div>
      <div style={{ position:'absolute', bottom:'16px', right:'20px', fontSize:'20px', opacity:0.6, transform:'rotate(8deg)' }}>🌿</div>
    </div>
  )
}

function CherryBlossom({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || '#fff8fc', boxShadow:'0 20px 80px rgba(0,0,0,0.6)', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1 }}>
        <svg width="100%" height="100%" style={{ position:'absolute', inset:0 }}>
          <path d="M0 50 Q40 20 80 40 Q120 55 160 25 Q200 5 280 20 Q350 35 420 15" fill="none" stroke="rgba(120,60,40,0.5)" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M0 0 Q18 40 8 80 Q0 120 12 160 Q24 200 8 240" fill="none" stroke="rgba(120,60,40,0.45)" strokeWidth="2" strokeLinecap="round"/>
          {[[30,30],[70,16],[110,32],[150,14],[200,22]].map(([x,y],i)=>(
            <g key={i}>{[0,72,144,216,288].map((rot,j)=><ellipse key={j} cx={x+Math.cos(rot*Math.PI/180)*7} cy={y+Math.sin(rot*Math.PI/180)*7} rx="5" ry="4" fill="rgba(255,182,193,0.65)" transform={`rotate(${rot},${x},${y})`}/>)}<circle cx={x} cy={y} r="2.5" fill="rgba(255,220,230,0.8)"/></g>
          ))}
          {[[8,90],[12,140],[6,190]].map(([x,y],i)=>(
            <g key={i}>{[0,72,144,216,288].map((rot,j)=><ellipse key={j} cx={x+Math.cos(rot*Math.PI/180)*6} cy={y+Math.sin(rot*Math.PI/180)*6} rx="5" ry="4" fill="rgba(255,182,193,0.55)" transform={`rotate(${rot},${x},${y})`}/>)}<circle cx={x} cy={y} r="2" fill="rgba(255,220,230,0.8)"/></g>
          ))}
        </svg>
      </div>
      <div style={{ position:'absolute', inset:'10px', border:'1px solid rgba(220,160,180,0.3)', pointerEvents:'none', zIndex:2 }}/>
      {[...Array(20)].map((_,i)=><div key={i} style={{ position:'absolute', left:'40px', right:'40px', top:`${80+i*28}px`, height:'1px', background:'rgba(220,160,180,0.15)' }}/>)}
      <div style={{ padding:'44px', position:'relative', zIndex:3 }}>{children}</div>
    </div>
  )
}

function AgedDistressed({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative' }}>
      <div style={{ position:'relative', background: paperBg || 'linear-gradient(155deg, #c8a870 0%, #b89050 40%, #c0a060 100%)', clipPath:`polygon(0% 1.5%, 1% 0%, 2.5% 1.8%, 4% 0.3%, 6% 1.5%, 8% 0%, 10% 1.8%, 13% 0.5%, 16% 1.5%, 20% 0%, 24% 1.8%, 28% 0.3%, 32% 1.5%, 37% 0%, 42% 1.8%, 48% 0.5%, 54% 1.5%, 60% 0%, 66% 1.8%, 72% 0.3%, 78% 1.5%, 84% 0%, 90% 1.8%, 95% 0.3%, 100% 1.5%, 100% 98.5%, 99% 100%, 97.5% 98.2%, 96% 99.7%, 94% 98.5%, 91% 100%, 88% 98.2%, 85% 99.5%, 81% 98.5%, 76% 100%, 71% 98.2%, 66% 99.7%, 61% 98.5%, 55% 100%, 49% 98.2%, 43% 99.5%, 37% 98.5%, 31% 100%, 25% 98.2%, 19% 99.7%, 14% 98.5%, 9% 100%, 5% 98.2%, 2% 99.5%, 0% 98.5%)`, boxShadow:'0 20px 80px rgba(0,0,0,0.7)', overflow:'hidden', minHeight:'400px' }}>
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0.3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.12'/%3E%3C/svg%3E")`, backgroundSize:'200px', mixBlendMode:'multiply' }}/>
        {[[8,15,18],[78,8,14],[55,72,20],[20,85,12]].map(([l,t,sz],i)=><div key={i} style={{ position:'absolute', left:`${l}%`, top:`${t}%`, width:`${sz}px`, height:`${sz}px`, background:'radial-gradient(circle, rgba(100,55,10,0.18) 0%, transparent 70%)', borderRadius:'50%', pointerEvents:'none' }}/>)}
        {[...Array(16)].map((_,i)=><div key={i} style={{ position:'absolute', left:'36px', right:'36px', top:`${72+i*30}px`, height:'1px', background:'rgba(80,40,10,0.12)' }}/>)}
        <div style={{ padding:'44px' }}>{children}</div>
      </div>
    </div>
  )
}

const PAPER_INK: Record<string, { main: string; secondary: string; accent: string }> = {
  ornate: { main: '#140c04', secondary: 'rgba(35,20,6,0.72)', accent: '#8b6010' },
  floral: { main: '#140810', secondary: 'rgba(35,12,22,0.72)', accent: '#8b2050' },
  notepad: { main: '#0a0c18', secondary: 'rgba(20,25,50,0.72)', accent: '#3060a0' },
  scrapbook: { main: '#160c04', secondary: 'rgba(30,14,4,0.72)', accent: '#6a3a0e' },
  ribbon: { main: '#140408', secondary: 'rgba(35,8,12,0.72)', accent: '#8b1020' },
  postage: { main: '#100c18', secondary: 'rgba(25,18,40,0.72)', accent: '#6040a0' },
  sakura: { main: '#18080e', secondary: 'rgba(40,15,20,0.72)', accent: '#8b2050' },
  aged: { main: '#160c04', secondary: 'rgba(30,14,4,0.74)', accent: '#7a4010' },
}

const PAPER_ENVELOPE_COLOR: Record<string, string> = {
  ornate: '#e0c870', floral: '#f0b8cc', notepad: '#b0c8e0',
  scrapbook: '#c0a868', ribbon: '#e8a0a0', postage: '#c8c0b0',
  sakura: '#f0b8cc', aged: '#b89050',
}

function LetterContent({ fontFamily, ink, recipient, senderName, date, body, setBody, textareaRef }: {
  fontFamily: string; ink: { main: string; secondary: string; accent: string }
  recipient?: string; senderName?: string; date: string
  body: string; setBody: (v: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  return (
    <div>
      <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'12px', color:ink.secondary, marginBottom:'16px', textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}>{date}</p>
      <p style={{ fontFamily, fontSize:'18px', fontStyle:'italic', color:ink.secondary, marginBottom:'18px', lineHeight:1.8, textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}>
        {recipient ? `Dear ${recipient},` : 'Dear Stranger,'}
      </p>
      <textarea ref={textareaRef} value={body} onChange={e=>setBody(e.target.value)}
        placeholder="Begin your letter here..." rows={9}
        style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:ink.main, caretColor:ink.accent, fontFamily, fontSize:'16px', lineHeight:2, resize:'none', letterSpacing:'0.01em', textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}/>
      <p style={{ fontFamily, fontStyle:'italic', fontSize:'15px', color:ink.secondary, marginTop:'10px', lineHeight:1.9, textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}>
        Yours across the distance,<br/>
        <span style={{ color:ink.accent }}>{senderName || 'A Stranger'}</span>
      </p>
    </div>
  )
}

export default function Scribe({ recipientName, senderName, lettersSent = 0, onClose, onSend }: {
  recipientName?: string; senderName?: string; lettersSent?: number
  onClose?: () => void
  onSend?: (letter: { to?: string; body: string; paperId: string; subject: string; fontId: string; stampId?: string }) => void
}) {
  const unlockedPapers = PAPERS.filter(p => p.unlocksAt <= lettersSent)
  const [selectedPaper, setSelectedPaper] = useState(unlockedPapers[0])
  const [selectedFont, setSelectedFont] = useState(FONTS[0])
  const [selectedStamp, setSelectedStamp] = useState<string | undefined>()
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedPaperColor, setSelectedPaperColor] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [subjectError, setSubjectError] = useState(false)
  const [body, setBody] = useState('')
  const [sent, setSent] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [view, setView] = useState<'write'|'papers'|'fonts'|'stamps'|'colors'|'paper-color'|'envelope'>('write')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const today = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
  const ink = PAPER_INK[selectedPaper.id] || PAPER_INK.ornate
  const _fontColor = selectedColor ? (FONT_COLORS.find(c => c.id === selectedColor)?.color ?? ink.main) : null
  const effectiveInk = _fontColor
    ? { main: _fontColor, secondary: hexToRgba(_fontColor, 0.72), accent: ink.accent }
    : ink
  const fontFamily = selectedFont.family
  const envelopeColor = PAPER_ENVELOPE_COLOR[selectedPaper.id]

  useEffect(() => {
    if (view === 'write') setTimeout(() => textareaRef.current?.focus(), 300)
  }, [view, selectedPaper])

  async function handleRelease() {
    if (!body.trim()) return
    if (!subject.trim()) {
      setSubjectError(true)
      setTimeout(() => setSubjectError(false), 3500)
      return
    }
    setSubjectError(false)
    setView('envelope')
    setReleasing(true)
    await new Promise(r => setTimeout(r, 2200))
    setSent(true)
    setTimeout(() => {
      onSend?.({ to: recipientName, body, paperId: selectedPaper.id, subject, fontId: selectedFont.id, stampId: selectedStamp })
      onClose?.()
    }, 2400)
  }

  const renderPaper = () => {
    const content = <LetterContent fontFamily={fontFamily} ink={effectiveInk} recipient={recipientName} senderName={senderName} date={today} body={body} setBody={setBody} textareaRef={textareaRef}/>
    const pbg = selectedPaperColor ? (PAPER_TONES.find(t => t.id === selectedPaperColor)?.bg ?? undefined) : undefined
    switch (selectedPaper.id) {
      case 'ornate': return <OrnateStationery paperBg={pbg}>{content}</OrnateStationery>
      case 'floral': return <FloralLetter paperBg={pbg}>{content}</FloralLetter>
      case 'notepad': return <SpiralNotepad paperBg={pbg}>{content}</SpiralNotepad>
      case 'scrapbook': return <ScrapbookLetter paperBg={pbg}>{content}</ScrapbookLetter>
      case 'ribbon': return <RibbonLetter paperBg={pbg}>{content}</RibbonLetter>
      case 'postage': return <PostageLetter paperBg={pbg}>{content}</PostageLetter>
      case 'sakura': return <CherryBlossom paperBg={pbg}>{content}</CherryBlossom>
      case 'aged': return <AgedDistressed paperBg={pbg}>{content}</AgedDistressed>
      default: return <OrnateStationery paperBg={pbg}>{content}</OrnateStationery>
    }
  }

  const stampCategories = [...new Set(STAMPS.map(s => s.category))]

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.4 }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,5,0.97)', backdropFilter:'blur(20px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', zIndex:70, padding:'72px 20px 40px', overflowY:'auto' }}>

      <div style={{ position:'fixed', inset:0, pointerEvents:'none', background:'radial-gradient(ellipse 50% 40% at 20% 30%, rgba(30,15,70,0.2) 0%, transparent 65%)' }}/>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
        {SCRIBE_STARS.map((star, i) => (
          <div key={i} style={{ position:'absolute', width:star.width, height:star.width, borderRadius:'50%', background:`rgba(255,255,255,${star.opacity})`, left:star.left, top:star.top }}/>
        ))}
      </div>

      <motion.button initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }}
        onClick={view==='write'?onClose:()=>setView('write')}
        style={{ position:'fixed', top:'24px', right:'24px', background:'none', border:'1px solid rgba(255,255,255,0.18)', color:'rgba(255,255,255,0.78)', fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.3em', padding:'8px 16px', cursor:'pointer', textTransform:'uppercase', zIndex:80 }}
        onMouseEnter={e=>{e.currentTarget.style.color='rgba(255,255,255,0.96)';e.currentTarget.style.borderColor='rgba(255,255,255,0.32)';e.currentTarget.style.background='rgba(255,255,255,0.04)'}}
        onMouseLeave={e=>{e.currentTarget.style.color='rgba(255,255,255,0.78)';e.currentTarget.style.borderColor='rgba(255,255,255,0.18)';e.currentTarget.style.background='none'}}>
        {view==='write'?'← Return':'← Back'}
      </motion.button>

      <AnimatePresence mode="wait">
        {view==='papers' && (
          <motion.div key="papers" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} style={{ width:'min(760px, 95vw)', zIndex:2 }}>
            <div style={{ textAlign:'center', marginBottom:'24px' }}>
              <p style={{ fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.5em', color:'#e6c76e', textTransform:'uppercase', marginBottom:'5px' }}>Choose Your Paper</p>
              <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'13px', color:'rgba(255,255,255,0.8)' }}>Each carries its own history</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:'12px', marginBottom:'24px' }}>
              {PAPERS.map(p => {
                const unlocked = p.unlocksAt <= lettersSent
                const isSelected = selectedPaper.id === p.id
                return (
                  <motion.div key={p.id} whileTap={unlocked?{scale:0.97}:{}} onClick={()=>unlocked&&setSelectedPaper(p)} style={{ cursor:unlocked?'pointer':'default', opacity:unlocked?1:0.42 }}>
                    <div style={{ height:'100px', background:p.swatch, borderRadius:'4px', border:isSelected?'2px solid #e6c76e':'1px solid rgba(255,255,255,0.12)', boxShadow:isSelected?'0 0 20px rgba(230,199,110,0.35)':'0 4px 16px rgba(0,0,0,0.5)', marginBottom:'8px', position:'relative' }}>
                      {isSelected&&<div style={{ position:'absolute', top:'8px', right:'8px', width:'20px', height:'20px', borderRadius:'50%', background:'#e6c76e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', color:'#000', fontWeight:'bold' }}>✓</div>}
                    </div>
                    <p style={{ fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.18em', color:isSelected?'#e6c76e':'rgba(255,255,255,0.84)', textTransform:'uppercase', textAlign:'center' }}>{p.label}</p>
                    <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'10px', color:'rgba(255,255,255,0.6)', textAlign:'center', marginTop:'2px' }}>{unlocked?p.sublabel:`Unlocks at ${p.unlocksAt}`}</p>
                  </motion.div>
                )
              })}
            </div>
            <div style={{ textAlign:'center' }}>
              <button onClick={()=>setView('write')} style={{ padding:'12px 32px', background:'transparent', border:'1px solid rgba(230,199,110,0.45)', color:'#e6c76e', fontFamily:"'Cinzel', serif", fontSize:'10px', letterSpacing:'0.3em', textTransform:'uppercase', cursor:'pointer', borderRadius:'2px' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(230,199,110,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                Write on {selectedPaper.label} ✦
              </button>
            </div>
          </motion.div>
        )}

        {view==='fonts' && (
          <motion.div key="fonts" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} style={{ width:'min(560px, 95vw)', zIndex:2 }}>
            <div style={{ textAlign:'center', marginBottom:'24px' }}>
              <p style={{ fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.5em', color:'#e6c76e', textTransform:'uppercase', marginBottom:'5px' }}>Choose Your Script</p>
              <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'13px', color:'rgba(255,255,255,0.8)' }}>The hand your words are written in</p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'24px' }}>
              {FONTS.map(f => {
                const isSelected = selectedFont.id === f.id
                return (
                  <motion.div key={f.id} whileTap={{scale:0.99}} onClick={()=>setSelectedFont(f)}
                    style={{ padding:'12px 18px', background:isSelected?'rgba(230,199,110,0.12)':'rgba(255,255,255,0.03)', border:isSelected?'1px solid rgba(230,199,110,0.45)':'1px solid rgba(255,255,255,0.08)', borderRadius:'4px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'14px' }}>
                    <span style={{ fontFamily:"'Cinzel', serif", fontSize:'8px', letterSpacing:'0.2em', color:isSelected?'#e6c76e':'rgba(255,255,255,0.76)', textTransform:'uppercase', minWidth:'100px' }}>{f.label}</span>
                    <span style={{ fontFamily:f.family, fontSize:'17px', color:isSelected?'rgba(255,255,255,0.94)':'rgba(255,255,255,0.78)', flex:1, textAlign:'right' }}>{f.preview}</span>
                  </motion.div>
                )
              })}
            </div>
            <div style={{ textAlign:'center' }}>
              <button onClick={()=>setView('write')} style={{ padding:'12px 32px', background:'transparent', border:'1px solid rgba(230,199,110,0.45)', color:'#e6c76e', fontFamily:"'Cinzel', serif", fontSize:'10px', letterSpacing:'0.3em', textTransform:'uppercase', cursor:'pointer', borderRadius:'2px' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(230,199,110,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                Write in {selectedFont.label} ✦
              </button>
            </div>
          </motion.div>
        )}

        {view==='stamps' && (
          <motion.div key="stamps" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} style={{ width:'min(680px, 95vw)', zIndex:2 }}>
            <div style={{ textAlign:'center', marginBottom:'24px' }}>
              <p style={{ fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.5em', color:'#e6c76e', textTransform:'uppercase', marginBottom:'5px' }}>Choose a Stamp</p>
              <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'13px', color:'rgba(255,255,255,0.8)' }}>Optional — appears on your sealed letter</p>
            </div>
            {stampCategories.map(cat => (
              <div key={cat} style={{ marginBottom:'24px' }}>
                <p style={{ fontFamily:"'Cinzel', serif", fontSize:'8px', letterSpacing:'0.3em', color:'rgba(255,255,255,0.76)', textTransform:'uppercase', marginBottom:'12px' }}>{cat}</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'12px' }}>
                  {STAMPS.filter(s=>s.category===cat).map(stamp => {
                    const isSelected = selectedStamp === stamp.id
                    return (
                      <motion.div key={stamp.id} whileTap={{scale:0.95}} onClick={()=>setSelectedStamp(isSelected?undefined:stamp.id)}
                        style={{ cursor:'pointer', padding:'8px', background:isSelected?'rgba(230,199,110,0.12)':'rgba(255,255,255,0.03)', border:isSelected?'1px solid rgba(230,199,110,0.5)':'1px solid rgba(255,255,255,0.12)', borderRadius:'6px', display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', boxShadow:isSelected?'0 0 16px rgba(230,199,110,0.2)':'none' }}>
                        <StampSVG id={stamp.id} size={56}/>
                        <p style={{ fontFamily:"'Cinzel', serif", fontSize:'7px', letterSpacing:'0.15em', color:isSelected?'#e6c76e':'rgba(255,255,255,0.76)', textTransform:'uppercase' }}>{stamp.label}</p>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}
            <div style={{ textAlign:'center', marginTop:'8px' }}>
              <button onClick={()=>setView('write')} style={{ padding:'12px 32px', background:'transparent', border:'1px solid rgba(230,199,110,0.45)', color:'#e6c76e', fontFamily:"'Cinzel', serif", fontSize:'10px', letterSpacing:'0.3em', textTransform:'uppercase', cursor:'pointer', borderRadius:'2px' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(230,199,110,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                {selectedStamp?`Seal with ${STAMPS.find(s=>s.id===selectedStamp)?.label} ✦`:'Continue without stamp ✦'}
              </button>
            </div>
          </motion.div>
        )}

        {view==='colors' && (
          <motion.div key="colors" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} style={{ width:'min(560px, 95vw)', zIndex:2 }}>
            <div style={{ textAlign:'center', marginBottom:'24px' }}>
              <p style={{ fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.5em', color:'#e6c76e', textTransform:'uppercase', marginBottom:'5px' }}>Choose Your Ink</p>
              <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'13px', color:'rgba(255,255,255,0.8)' }}>The colour your words are written in</p>
            </div>
            <motion.div whileTap={{scale:0.98}} onClick={()=>setSelectedColor(null)}
              style={{ marginBottom:'12px', padding:'12px 18px', background:selectedColor===null?'rgba(230,199,110,0.12)':'rgba(255,255,255,0.03)', border:selectedColor===null?'1px solid rgba(230,199,110,0.45)':'1px solid rgba(255,255,255,0.08)', borderRadius:'4px', cursor:'pointer', display:'flex', alignItems:'center', gap:'14px' }}>
              <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:'linear-gradient(135deg, #1a0e04, #0c2040, #0c2410)', flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <p style={{ fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.2em', color:selectedColor===null?'#e6c76e':'rgba(255,255,255,0.84)', textTransform:'uppercase' }}>Paper Default</p>
                <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'11px', color:'rgba(255,255,255,0.56)', marginTop:'2px' }}>Ink chosen to match your paper</p>
              </div>
              {selectedColor===null&&<span style={{ color:'#e6c76e', fontSize:'13px' }}>✓</span>}
            </motion.div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:'10px', marginBottom:'24px' }}>
              {FONT_COLORS.map(c => {
                const isSelected = selectedColor === c.id
                return (
                  <motion.div key={c.id} whileTap={{scale:0.96}} onClick={()=>setSelectedColor(c.id)}
                    style={{ cursor:'pointer', padding:'12px', background:isSelected?'rgba(230,199,110,0.12)':'rgba(255,255,255,0.03)', border:isSelected?'1px solid rgba(230,199,110,0.5)':'1px solid rgba(255,255,255,0.1)', borderRadius:'4px' }}>
                    <div style={{ height:'44px', background:'#f8f0dc', borderRadius:'3px', marginBottom:'8px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'13px', color:c.color, userSelect:'none' }}>A letter</p>
                    </div>
                    <p style={{ fontFamily:"'Cinzel', serif", fontSize:'8px', letterSpacing:'0.18em', color:isSelected?'#e6c76e':'rgba(255,255,255,0.8)', textTransform:'uppercase', textAlign:'center' }}>{c.label}</p>
                    <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'10px', color:'rgba(255,255,255,0.5)', textAlign:'center', marginTop:'2px' }}>{c.desc}</p>
                  </motion.div>
                )
              })}
            </div>
            <div style={{ textAlign:'center' }}>
              <button onClick={()=>setView('write')} style={{ padding:'12px 32px', background:'transparent', border:'1px solid rgba(230,199,110,0.45)', color:'#e6c76e', fontFamily:"'Cinzel', serif", fontSize:'10px', letterSpacing:'0.3em', textTransform:'uppercase', cursor:'pointer', borderRadius:'2px' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(230,199,110,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                {selectedColor ? `Write in ${FONT_COLORS.find(c=>c.id===selectedColor)?.label} ✦` : 'Write with paper ink ✦'}
              </button>
            </div>
          </motion.div>
        )}

        {view==='paper-color' && (
          <motion.div key="paper-color" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} style={{ width:'min(560px, 95vw)', zIndex:2 }}>
            <div style={{ textAlign:'center', marginBottom:'24px' }}>
              <p style={{ fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.5em', color:'#e6c76e', textTransform:'uppercase', marginBottom:'5px' }}>Choose Your Paper Tone</p>
              <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'13px', color:'rgba(255,255,255,0.8)' }}>The colour of the paper you write on</p>
            </div>
            <motion.div whileTap={{scale:0.98}} onClick={()=>setSelectedPaperColor(null)}
              style={{ marginBottom:'12px', padding:'12px 18px', background:selectedPaperColor===null?'rgba(230,199,110,0.12)':'rgba(255,255,255,0.03)', border:selectedPaperColor===null?'1px solid rgba(230,199,110,0.45)':'1px solid rgba(255,255,255,0.08)', borderRadius:'4px', cursor:'pointer', display:'flex', alignItems:'center', gap:'14px' }}>
              <div style={{ width:'24px', height:'24px', borderRadius:'3px', background:'linear-gradient(135deg, #fdf6e0, #fef0f3, #f8fbff)', flexShrink:0, border:'1px solid rgba(0,0,0,0.08)' }}/>
              <div style={{ flex:1 }}>
                <p style={{ fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.2em', color:selectedPaperColor===null?'#e6c76e':'rgba(255,255,255,0.84)', textTransform:'uppercase' }}>Paper Default</p>
                <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'11px', color:'rgba(255,255,255,0.56)', marginTop:'2px' }}>Natural tone of the chosen paper style</p>
              </div>
              {selectedPaperColor===null&&<span style={{ color:'#e6c76e', fontSize:'13px' }}>✓</span>}
            </motion.div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:'10px', marginBottom:'24px' }}>
              {PAPER_TONES.map(t => {
                const isSelected = selectedPaperColor === t.id
                return (
                  <motion.div key={t.id} whileTap={{scale:0.96}} onClick={()=>setSelectedPaperColor(t.id)}
                    style={{ cursor:'pointer', padding:'10px', background:isSelected?'rgba(230,199,110,0.12)':'rgba(255,255,255,0.03)', border:isSelected?'1px solid rgba(230,199,110,0.5)':'1px solid rgba(255,255,255,0.1)', borderRadius:'4px' }}>
                    <div style={{ height:'52px', background:t.bg, borderRadius:'3px', marginBottom:'8px', border:'1px solid rgba(0,0,0,0.07)', boxShadow:'inset 0 1px 4px rgba(255,255,255,0.7)' }}/>
                    <p style={{ fontFamily:"'Cinzel', serif", fontSize:'8px', letterSpacing:'0.18em', color:isSelected?'#e6c76e':'rgba(255,255,255,0.8)', textTransform:'uppercase', textAlign:'center' }}>{t.label}</p>
                    <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'10px', color:'rgba(255,255,255,0.5)', textAlign:'center', marginTop:'2px' }}>{t.desc}</p>
                  </motion.div>
                )
              })}
            </div>
            <div style={{ textAlign:'center' }}>
              <button onClick={()=>setView('write')} style={{ padding:'12px 32px', background:'transparent', border:'1px solid rgba(230,199,110,0.45)', color:'#e6c76e', fontFamily:"'Cinzel', serif", fontSize:'10px', letterSpacing:'0.3em', textTransform:'uppercase', cursor:'pointer', borderRadius:'2px' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(230,199,110,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                {selectedPaperColor ? `Write on ${PAPER_TONES.find(t=>t.id===selectedPaperColor)?.label} paper ✦` : 'Write on default paper ✦'}
              </button>
            </div>
          </motion.div>
        )}

        {view==='write' && !sent && (
          <motion.div key="write" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} style={{ width:'min(580px, 95vw)', zIndex:2 }}>
            <div style={{ textAlign:'center', marginBottom:'14px' }}>
              <p style={{ fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.5em', color:'#e6c76e', textTransform:'uppercase', marginBottom:'4px' }}>The Scribe</p>
              <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'14px', color:'rgba(255,255,255,0.84)' }}>
                {recipientName ? `a letter to · ${recipientName}` : 'a letter into the universe'}
              </p>
            </div>

            {/* Subject — REQUIRED */}
            <div style={{ marginBottom:'10px' }}>
              <input value={subject}
                onChange={e => { setSubject(e.target.value); if (e.target.value.trim()) setSubjectError(false) }}
                placeholder="Subject — required"
                style={{ width:'100%', background: subjectError ? 'rgba(220,60,60,0.06)' : 'rgba(255,255,255,0.06)', border:`1px solid ${subjectError ? 'rgba(220,80,80,0.75)' : 'rgba(255,255,255,0.16)'}`, borderRadius:'4px', color:'rgba(255,255,255,0.92)', fontFamily:"'Cinzel', serif", fontSize:'11px', letterSpacing:'0.15em', padding:'10px 14px', outline:'none', caretColor:'#e6c76e', transition:'border-color 0.2s, background 0.2s' }}
                onFocus={e => { if (!subjectError) e.target.style.borderColor = 'rgba(230,199,110,0.4)' }}
                onBlur={e => { if (!subjectError) e.target.style.borderColor = 'rgba(255,255,255,0.16)' }}/>
              {subjectError && (
                <p style={{ fontFamily:"'Cinzel', serif", fontSize:'8px', letterSpacing:'0.2em', color:'rgba(220,80,80,0.85)', textTransform:'uppercase', marginTop:'5px' }}>
                  A letter needs a subject before it can travel ✦
                </p>
              )}
            </div>

            {renderPaper()}

            {selectedStamp && (
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'-8px', marginBottom:'4px' }}>
                <div style={{ opacity:0.85 }}><StampSVG id={selectedStamp} size={48}/></div>
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'12px', flexWrap:'wrap', gap:'8px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
                {[
                  { label:selectedPaper.label, action:()=>setView('papers'), icon:'📄' },
                  { label:selectedFont.label, action:()=>setView('fonts'), icon:'✒' },
                  { label:selectedStamp?STAMPS.find(s=>s.id===selectedStamp)?.label||'Stamp':'Stamp', action:()=>setView('stamps'), icon:'🔖' },
                  { label:selectedColor?FONT_COLORS.find(c=>c.id===selectedColor)?.label||'Ink':'Ink Color', action:()=>setView('colors'), icon:'🎨' },
                  { label:selectedPaperColor?PAPER_TONES.find(t=>t.id===selectedPaperColor)?.label||'Paper Tone':'Paper Tone', action:()=>setView('paper-color'), icon:'🗒' },
                ].map((btn,i)=>(
                  <button key={i} onClick={btn.action}
                    style={{ background:'none', border:'1px solid rgba(255,255,255,0.18)', color:'rgba(255,255,255,0.8)', fontFamily:"'Cinzel', serif", fontSize:'8px', letterSpacing:'0.15em', textTransform:'uppercase', padding:'5px 9px', cursor:'pointer', borderRadius:'2px', whiteSpace:'nowrap' }}
                    onMouseEnter={e=>{e.currentTarget.style.color='rgba(255,255,255,0.98)';e.currentTarget.style.borderColor='rgba(255,255,255,0.32)';e.currentTarget.style.background='rgba(255,255,255,0.04)'}}
                    onMouseLeave={e=>{e.currentTarget.style.color='rgba(255,255,255,0.8)';e.currentTarget.style.borderColor='rgba(255,255,255,0.18)';e.currentTarget.style.background='none'}}>
                    {btn.icon} {btn.label}
                  </button>
                ))}
              </div>
              <motion.button onClick={handleRelease} disabled={!body.trim()||releasing} whileTap={body.trim()?{scale:0.97}:{}}
                style={{ padding:'11px 22px', background:'transparent', border:`1px solid ${body.trim()?'rgba(230,199,110,0.55)':'rgba(255,255,255,0.12)'}`, color:body.trim()?'#e6c76e':'rgba(255,255,255,0.42)', fontFamily:"'Cinzel', serif", fontSize:'10px', letterSpacing:'0.22em', textTransform:'uppercase', cursor:body.trim()?'pointer':'default', borderRadius:'2px', opacity:releasing?0.6:1 }}
                onMouseEnter={e=>{if(!body.trim())return;e.currentTarget.style.background='rgba(230,199,110,0.08)';e.currentTarget.style.borderColor='#e6c76e'}}
                onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor=body.trim()?'rgba(230,199,110,0.55)':'rgba(255,255,255,0.12)'}}>
                {releasing ? 'Sealing ✦' : recipientName ? `Send to ${recipientName} ✦` : 'Release into the Universe ✦'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {view==='envelope' && !sent && (
          <motion.div key="envelope" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ textAlign:'center', zIndex:2 }}>
            <motion.div initial={{ y:0, rotate:0 }} animate={{ y:[0,-20,80], rotate:[0,-3,2], opacity:[1,1,0] }} transition={{ duration:2, ease:'easeInOut' }}
              style={{ display:'inline-block', marginBottom:'24px', position:'relative' }}>
              <EnvelopeSVG color={envelopeColor}/>
              {selectedStamp&&<div style={{ position:'absolute', top:'8px', right:'8px', transform:'rotate(3deg)' }}><StampSVG id={selectedStamp} size={32}/></div>}
            </motion.div>
            <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }}
              style={{ fontFamily:"'Cinzel', serif", fontSize:'10px', letterSpacing:'0.4em', color:'#e6c76e', textTransform:'uppercase' }}>
              Sealing your letter...
            </motion.p>
          </motion.div>
        )}

        {sent && (
          <motion.div key="sent" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }} transition={{ duration:0.6 }} style={{ textAlign:'center', zIndex:2 }}>
            <motion.div initial={{ scale:0, opacity:0.8 }} animate={{ scale:5, opacity:0 }} transition={{ duration:2.2, ease:'easeOut' }}
              style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'60px', height:'60px', borderRadius:'50%', border:'1px solid #e6c76e', pointerEvents:'none' }}/>
            <motion.p initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }} style={{ fontSize:'36px', marginBottom:'20px', color:'#e6c76e' }}>✦</motion.p>
            <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}
              style={{ fontFamily:"'Cinzel', serif", fontSize:'clamp(12px,2vw,16px)', letterSpacing:'0.3em', color:'#e6c76e', textTransform:'uppercase', marginBottom:'10px' }}>
              {recipientName ? `Sent to ${recipientName}` : 'Released into the universe'}
            </motion.p>
            <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.8 }}
              style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'14px', color:'rgba(255,255,255,0.82)' }}>
              {recipientName ? `traveling toward ${recipientName}...` : 'finding its way to a stranger...'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}