'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playLetterSend } from '../../lib/sounds'

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
  // Wax Seals
  { id: 'moon-seal',     category: 'Wax Seal',    label: 'Moon Seal'      },
  { id: 'sun-seal',      category: 'Wax Seal',    label: 'Sun Seal'       },
  { id: 'star-seal',     category: 'Wax Seal',    label: 'Star Seal'      },
  { id: 'rose-seal',     category: 'Wax Seal',    label: 'Rose Seal'      },
  { id: 'emerald-seal',  category: 'Wax Seal',    label: 'Emerald Seal'   },
  { id: 'sapphire-seal', category: 'Wax Seal',    label: 'Sapphire Seal'  },
  { id: 'obsidian-seal', category: 'Wax Seal',    label: 'Obsidian Seal'  },
  { id: 'ivory-seal',    category: 'Wax Seal',    label: 'Ivory Seal'     },
  // Postmarks
  { id: 'veilmore',      category: 'Postmark',    label: 'Veilmore'       },
  { id: 'ashpoint',      category: 'Postmark',    label: 'Ashpoint'       },
  { id: 'duskhollow',    category: 'Postmark',    label: 'Duskhollow'     },
  { id: 'evermore',      category: 'Postmark',    label: 'Evermore'       },
  { id: 'gloomhaven',    category: 'Postmark',    label: 'Gloomhaven'     },
  { id: 'stardrift',     category: 'Postmark',    label: 'Stardrift'      },
  // Illustrated
  { id: 'compass',       category: 'Illustrated', label: 'Compass'        },
  { id: 'feather',       category: 'Illustrated', label: 'Feather'        },
  { id: 'key',           category: 'Illustrated', label: 'Key'            },
  { id: 'eye',           category: 'Illustrated', label: 'Eye'            },
  { id: 'butterfly',     category: 'Illustrated', label: 'Butterfly'      },
  { id: 'hourglass',     category: 'Illustrated', label: 'Hourglass'      },
  { id: 'anchor',        category: 'Illustrated', label: 'Anchor'         },
  { id: 'rose',          category: 'Illustrated', label: 'Rose'           },
  // Constellations
  { id: 'orion',         category: 'Constellation', label: 'Orion'        },
  { id: 'cassiopeia',    category: 'Constellation', label: 'Cassiopeia'   },
  { id: 'lyra',          category: 'Constellation', label: 'Lyra'         },
  { id: 'pleiades',      category: 'Constellation', label: 'Pleiades'     },
  { id: 'southern-cross',category: 'Constellation', label: 'Southern Cross'},
  // Abstract
  { id: 'spiral',        category: 'Abstract',    label: 'Spiral'         },
  { id: 'diamond',       category: 'Abstract',    label: 'Diamond'        },
  { id: 'wave',          category: 'Abstract',    label: 'Wave'           },
  { id: 'infinity',      category: 'Abstract',    label: 'Infinity'       },
  { id: 'hexagon',       category: 'Abstract',    label: 'Hexagon'        },
  // Cute
  { id: 'cat',           category: 'Cute',        label: 'Cat'            },
  { id: 'heart',         category: 'Cute',        label: 'Heart'          },
  { id: 'mushroom',      category: 'Cute',        label: 'Mushroom'       },
  { id: 'rainbow',       category: 'Cute',        label: 'Rainbow'        },
  { id: 'cloud',         category: 'Cute',        label: 'Cloud'          },
  { id: 'shooting-star', category: 'Cute',        label: 'Shooting Star'  },
  { id: 'bow',           category: 'Cute',        label: 'Bow'            },
  { id: 'paw',           category: 'Cute',        label: 'Paw'            },
  { id: 'cherry',        category: 'Cute',        label: 'Cherry'         },
  { id: 'tulip',         category: 'Cute',        label: 'Tulip'          },
]

const ENVELOPES = [
  { id: 'classic',   label: 'Classic',    desc: 'Clean & timeless'      },
  { id: 'vintage',   label: 'Vintage',    desc: 'Ornate flourishes'     },
  { id: 'airmail',   label: 'Airmail',    desc: 'Par avion'             },
  { id: 'sakura',    label: 'Sakura',     desc: 'Cherry blossom petals' },
  { id: 'starfield', label: 'Starfield',  desc: 'Starlit night'         },
  { id: 'kraft',     label: 'Kraft',      desc: 'Rustic brown paper'    },
  { id: 'romantic',  label: 'Romantic',   desc: 'Sealed with a heart'   },
  { id: 'wax',       label: 'Wax Sealed', desc: 'Sealed in crimson wax' },
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
  { id: 'source-sans', label: 'Source Sans', family: "'Source Sans 3', sans-serif", preview: 'A letter across the stars' },
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
  if (id === 'rose-seal') return <svg width={s} height={s} viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#8b1a4a"/><circle cx="30" cy="30" r="24" fill="#9a2060"/><path d="M22 20 Q30 14 38 20 Q32 22 30 30 Q24 22 22 20Z" fill="rgba(255,200,220,0.7)"/><text x="30" y="45" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(255,180,210,0.7)" letterSpacing="1">SEALED</text></svg>
  if (id === 'emerald-seal') return <svg width={s} height={s} viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#1a6b30"/><circle cx="30" cy="30" r="24" fill="#207840"/><path d="M22 20 Q30 14 38 20 Q32 22 30 30 Q24 22 22 20Z" fill="rgba(180,255,200,0.7)"/><text x="30" y="45" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(160,240,180,0.7)" letterSpacing="1">SEALED</text></svg>
  if (id === 'sapphire-seal') return <svg width={s} height={s} viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#1a3a8b"/><circle cx="30" cy="30" r="24" fill="#2040a0"/><path d="M22 20 Q30 14 38 20 Q32 22 30 30 Q24 22 22 20Z" fill="rgba(180,200,255,0.7)"/><text x="30" y="45" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(160,180,255,0.7)" letterSpacing="1">SEALED</text></svg>
  if (id === 'obsidian-seal') return <svg width={s} height={s} viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#111118"/><circle cx="30" cy="30" r="24" fill="#1a1a28"/><path d="M22 20 Q30 14 38 20 Q32 22 30 30 Q24 22 22 20Z" fill="rgba(180,180,220,0.5)"/><text x="30" y="45" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(160,160,200,0.6)" letterSpacing="1">SEALED</text></svg>
  if (id === 'ivory-seal') return <svg width={s} height={s} viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#9a8a60"/><circle cx="30" cy="30" r="24" fill="#b09a70"/><path d="M22 20 Q30 14 38 20 Q32 22 30 30 Q24 22 22 20Z" fill="rgba(255,245,220,0.7)"/><text x="30" y="45" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(240,225,180,0.7)" letterSpacing="1">SEALED</text></svg>
  if (id === 'veilmore') return <svg width={s} height={s} viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="none" stroke="rgba(80,60,100,0.7)" strokeWidth="2"/><circle cx="40" cy="40" r="28" fill="none" stroke="rgba(80,60,100,0.3)" strokeWidth="0.8"/><text x="40" y="36" textAnchor="middle" fontSize="9" fontFamily="serif" fill="rgba(80,60,100,0.85)" letterSpacing="2" fontWeight="bold">VEILMORE</text><text x="40" y="52" textAnchor="middle" fontSize="6" fontFamily="serif" fill="rgba(80,60,100,0.5)">BEYOND THE VEIL</text></svg>
  if (id === 'evermore') return <svg width={s} height={s} viewBox="0 0 80 80"><rect x="2" y="2" width="76" height="76" fill="none" stroke="rgba(60,40,20,0.7)" strokeWidth="2" rx="4"/><text x="40" y="28" textAnchor="middle" fontSize="9" fontFamily="serif" fill="rgba(50,30,10,0.8)" letterSpacing="2" fontWeight="bold">EVERMORE</text><line x1="12" y1="34" x2="68" y2="34" stroke="rgba(80,40,20,0.4)" strokeWidth="1"/><text x="40" y="48" textAnchor="middle" fontSize="7" fontFamily="serif" fill="rgba(60,30,10,0.6)">COSMIC POST</text></svg>
  if (id === 'gloomhaven') return <svg width={s} height={s} viewBox="0 0 80 80"><circle cx="40" cy="40" r="36" fill="none" stroke="rgba(30,20,50,0.7)" strokeWidth="2"/><text x="40" y="36" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(30,20,60,0.85)" letterSpacing="2" fontWeight="bold">GLOOMHAVEN</text><text x="40" y="52" textAnchor="middle" fontSize="7" fontFamily="serif" fill="rgba(40,20,60,0.5)">BETWEEN WORLDS</text></svg>
  if (id === 'stardrift') return <svg width={s} height={s} viewBox="0 0 80 80"><ellipse cx="40" cy="40" rx="36" ry="28" fill="none" stroke="rgba(20,30,70,0.7)" strokeWidth="2"/><text x="40" y="36" textAnchor="middle" fontSize="8" fontFamily="serif" fill="rgba(20,30,80,0.85)" letterSpacing="2" fontWeight="bold">STARDRIFT</text><text x="40" y="54" textAnchor="middle" fontSize="6" fontFamily="serif" fill="rgba(20,30,70,0.5)">CARRIED BY LIGHT</text></svg>
  if (id === 'butterfly') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(220,200,240,0.12)" stroke="rgba(120,80,160,0.5)" strokeWidth="1.5" rx="2"/><path d="M30 30 Q20 18 12 22 Q8 30 20 34 Q28 36 30 30Z" fill="rgba(160,100,200,0.3)" stroke="rgba(120,80,160,0.6)" strokeWidth="1"/><path d="M30 30 Q40 18 48 22 Q52 30 40 34 Q32 36 30 30Z" fill="rgba(160,100,200,0.3)" stroke="rgba(120,80,160,0.6)" strokeWidth="1"/><path d="M30 30 Q20 38 16 46 Q22 50 28 42 Q30 36 30 30Z" fill="rgba(140,80,180,0.25)" stroke="rgba(100,60,140,0.5)" strokeWidth="1"/><path d="M30 30 Q40 38 44 46 Q38 50 32 42 Q30 36 30 30Z" fill="rgba(140,80,180,0.25)" stroke="rgba(100,60,140,0.5)" strokeWidth="1"/><line x1="30" y1="26" x2="26" y2="20" stroke="rgba(80,40,100,0.5)" strokeWidth="1" strokeLinecap="round"/><line x1="30" y1="26" x2="34" y2="20" stroke="rgba(80,40,100,0.5)" strokeWidth="1" strokeLinecap="round"/></svg>
  if (id === 'hourglass') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(220,200,160,0.1)" stroke="rgba(120,90,40,0.5)" strokeWidth="1.5" rx="2"/><line x1="18" y1="12" x2="42" y2="12" stroke="rgba(100,70,20,0.7)" strokeWidth="2" strokeLinecap="round"/><line x1="18" y1="48" x2="42" y2="48" stroke="rgba(100,70,20,0.7)" strokeWidth="2" strokeLinecap="round"/><path d="M18 12 L42 12 L30 30 L42 48 L18 48 L30 30 Z" fill="rgba(180,140,80,0.2)" stroke="rgba(100,70,20,0.5)" strokeWidth="1"/><path d="M20 14 L30 28" fill="none" stroke="rgba(200,160,80,0.4)" strokeWidth="1"/></svg>
  if (id === 'anchor') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(180,210,230,0.1)" stroke="rgba(40,80,120,0.5)" strokeWidth="1.5" rx="2"/><circle cx="30" cy="18" r="5" fill="none" stroke="rgba(30,70,120,0.7)" strokeWidth="1.8"/><line x1="30" y1="23" x2="30" y2="46" stroke="rgba(30,70,120,0.7)" strokeWidth="1.8" strokeLinecap="round"/><line x1="20" y1="34" x2="40" y2="34" stroke="rgba(30,70,120,0.6)" strokeWidth="1.5" strokeLinecap="round"/><path d="M20 46 Q22 52 30 50 Q38 52 40 46" fill="none" stroke="rgba(30,70,120,0.6)" strokeWidth="1.5" strokeLinecap="round"/></svg>
  if (id === 'rose') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(240,200,210,0.1)" stroke="rgba(160,60,80,0.5)" strokeWidth="1.5" rx="2"/><circle cx="30" cy="28" r="8" fill="rgba(200,80,100,0.25)" stroke="rgba(160,60,80,0.6)" strokeWidth="1"/><circle cx="30" cy="28" r="5" fill="rgba(220,100,120,0.3)"/>{[[22,22],[38,22],[20,32],[40,32],[24,40],[36,40]].map(([x,y],i)=><path key={i} d={`M${x} ${y} Q${(x+30)/2} ${(y+28)/2+2} 30 28`} fill="none" stroke="rgba(160,60,80,0.35)" strokeWidth="1"/>)}<line x1="28" y1="36" x2="26" y2="50" stroke="rgba(60,120,60,0.5)" strokeWidth="1.5" strokeLinecap="round"/><path d="M26 44 Q20 40 22 36" fill="none" stroke="rgba(60,120,60,0.45)" strokeWidth="1.2" strokeLinecap="round"/></svg>
  if (id === 'pleiades') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(10,10,30,0.6)" stroke="rgba(150,160,220,0.4)" strokeWidth="1.5" rx="2"/>{[[22,20],[30,18],[38,22],[26,28],[34,26],[28,34]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i<3?2.5:1.8} fill="rgba(200,210,255,0.85)"/>)}</svg>
  if (id === 'southern-cross') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(10,10,30,0.6)" stroke="rgba(150,160,220,0.4)" strokeWidth="1.5" rx="2"/>{[[30,14],[30,46],[14,30],[44,30],[40,20]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===4?1.5:2.5} fill="rgba(200,210,255,0.85)"/>)}<polygon points="30,14 30,46" fill="none" stroke="rgba(150,160,220,0.2)" strokeWidth="0.6"/><polygon points="14,30 44,30" fill="none" stroke="rgba(150,160,220,0.2)" strokeWidth="0.6"/></svg>
  if (id === 'infinity') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(200,180,240,0.1)" stroke="rgba(100,80,160,0.5)" strokeWidth="1.5" rx="2"/><path d="M20 30 Q20 20 30 20 Q40 20 40 30 Q40 40 30 40 Q20 40 20 30 M40 30 Q40 20 50 20 Q60 20 60 30 M20 30 Q20 40 10 40" fill="none" stroke="rgba(100,80,160,0.7)" strokeWidth="2" strokeLinecap="round"/><path d="M12 24 Q20 18 28 24 Q36 30 44 24 Q52 18 58 28 Q52 38 44 34 Q36 30 28 36 Q20 42 12 36 Q6 30 12 24Z" fill="rgba(100,80,160,0.15)" stroke="rgba(100,80,160,0.6)" strokeWidth="1.5"/></svg>
  if (id === 'hexagon') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(180,220,200,0.1)" stroke="rgba(40,120,100,0.5)" strokeWidth="1.5" rx="2"/><polygon points="30,10 48,20 48,40 30,50 12,40 12,20" fill="rgba(40,120,100,0.12)" stroke="rgba(40,120,100,0.65)" strokeWidth="1.5"/><polygon points="30,18 40,24 40,36 30,42 20,36 20,24" fill="rgba(40,120,100,0.1)" stroke="rgba(40,120,100,0.4)" strokeWidth="1"/></svg>
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
  // Cute stamps
  if (id === 'cat') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(255,220,240,0.2)" stroke="rgba(220,120,160,0.5)" strokeWidth="1.5" rx="2"/><circle cx="30" cy="32" r="16" fill="rgba(255,200,220,0.35)" stroke="rgba(220,120,160,0.5)" strokeWidth="1.5"/><polygon points="16,20 22,10 28,20" fill="rgba(255,200,220,0.6)" stroke="rgba(220,120,160,0.5)" strokeWidth="1"/><polygon points="32,20 38,10 44,20" fill="rgba(255,200,220,0.6)" stroke="rgba(220,120,160,0.5)" strokeWidth="1"/><polygon points="18,19 22,12 26,19" fill="rgba(255,150,185,0.5)"/><polygon points="34,19 38,12 42,19" fill="rgba(255,150,185,0.5)"/><ellipse cx="24" cy="30" rx="3" ry="3.5" fill="rgba(70,30,90,0.7)"/><ellipse cx="36" cy="30" rx="3" ry="3.5" fill="rgba(70,30,90,0.7)"/><circle cx="25" cy="29" r="1" fill="rgba(255,255,255,0.8)"/><circle cx="37" cy="29" r="1" fill="rgba(255,255,255,0.8)"/><polygon points="30,34 28,37 32,37" fill="rgba(255,100,140,0.7)"/><line x1="14" y1="36" x2="26" y2="37" stroke="rgba(160,80,100,0.4)" strokeWidth="0.8"/><line x1="14" y1="38" x2="26" y2="38.5" stroke="rgba(160,80,100,0.4)" strokeWidth="0.8"/><line x1="34" y1="37" x2="46" y2="36" stroke="rgba(160,80,100,0.4)" strokeWidth="0.8"/><line x1="34" y1="38.5" x2="46" y2="38" stroke="rgba(160,80,100,0.4)" strokeWidth="0.8"/></svg>
  if (id === 'heart') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(255,200,220,0.15)" stroke="rgba(220,100,140,0.5)" strokeWidth="1.5" rx="2"/><path d="M30 44 C10 30 12 14 22 14 C26 14 30 18 30 18 C30 18 34 14 38 14 C48 14 50 30 30 44Z" fill="rgba(220,80,120,0.5)" stroke="rgba(200,60,100,0.65)" strokeWidth="1.5"/><path d="M22 20 C20 22 20 27 25 31" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
  if (id === 'mushroom') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(255,220,200,0.15)" stroke="rgba(200,100,60,0.5)" strokeWidth="1.5" rx="2"/><path d="M10 34 Q14 16 30 15 Q46 16 50 34Z" fill="rgba(210,70,50,0.55)" stroke="rgba(170,50,30,0.65)" strokeWidth="1.5"/><path d="M22 34 Q21 47 26 49 L34 49 Q39 47 38 34Z" fill="rgba(255,230,200,0.5)" stroke="rgba(180,140,100,0.5)" strokeWidth="1"/><circle cx="22" cy="26" r="3" fill="rgba(255,245,235,0.75)"/><circle cx="30" cy="21" r="3.5" fill="rgba(255,245,235,0.75)"/><circle cx="38" cy="26" r="3" fill="rgba(255,245,235,0.75)"/><circle cx="26" cy="39" r="2" fill="rgba(80,40,20,0.4)"/><circle cx="34" cy="39" r="2" fill="rgba(80,40,20,0.4)"/><path d="M26 43 Q30 46 34 43" stroke="rgba(80,40,20,0.4)" strokeWidth="1" fill="none" strokeLinecap="round"/></svg>
  if (id === 'rainbow') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(200,230,255,0.15)" stroke="rgba(100,160,220,0.5)" strokeWidth="1.5" rx="2"/><path d="M8 46 Q30 8 52 46" fill="none" stroke="rgba(220,50,50,0.7)" strokeWidth="3.5" strokeLinecap="round"/><path d="M11 46 Q30 14 49 46" fill="none" stroke="rgba(230,150,20,0.7)" strokeWidth="3" strokeLinecap="round"/><path d="M14 46 Q30 19 46 46" fill="none" stroke="rgba(210,210,20,0.7)" strokeWidth="3" strokeLinecap="round"/><path d="M17 46 Q30 24 43 46" fill="none" stroke="rgba(40,180,60,0.7)" strokeWidth="3" strokeLinecap="round"/><path d="M20 46 Q30 29 40 46" fill="none" stroke="rgba(40,100,220,0.7)" strokeWidth="3" strokeLinecap="round"/><path d="M23 46 Q30 33 37 46" fill="none" stroke="rgba(140,40,210,0.65)" strokeWidth="2.5" strokeLinecap="round"/><ellipse cx="12" cy="44" rx="7" ry="5" fill="rgba(255,255,255,0.55)"/><ellipse cx="48" cy="44" rx="7" ry="5" fill="rgba(255,255,255,0.55)"/></svg>
  if (id === 'cloud') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(210,230,255,0.15)" stroke="rgba(100,150,220,0.5)" strokeWidth="1.5" rx="2"/><ellipse cx="30" cy="34" rx="20" ry="11" fill="rgba(220,235,255,0.5)" stroke="rgba(150,180,230,0.5)" strokeWidth="1.5"/><ellipse cx="21" cy="27" rx="11" ry="10" fill="rgba(220,235,255,0.6)" stroke="rgba(150,180,230,0.4)" strokeWidth="1"/><ellipse cx="37" cy="25" rx="12" ry="10" fill="rgba(220,235,255,0.6)" stroke="rgba(150,180,230,0.4)" strokeWidth="1"/><circle cx="25" cy="33" r="2" fill="rgba(80,100,160,0.5)"/><circle cx="35" cy="33" r="2" fill="rgba(80,100,160,0.5)"/><path d="M25 37 Q30 40 35 37" stroke="rgba(80,100,160,0.5)" strokeWidth="1.2" fill="none" strokeLinecap="round"/></svg>
  if (id === 'shooting-star') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(15,8,35,0.5)" stroke="rgba(200,180,240,0.5)" strokeWidth="1.5" rx="2"/><line x1="6" y1="52" x2="38" y2="20" stroke="rgba(255,240,180,0.12)" strokeWidth="7" strokeLinecap="round"/><line x1="6" y1="52" x2="38" y2="20" stroke="rgba(255,240,180,0.28)" strokeWidth="3.5" strokeLinecap="round"/><line x1="6" y1="52" x2="38" y2="20" stroke="rgba(255,250,220,0.55)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="18" cy="41" r="1.5" fill="rgba(255,240,180,0.5)"/><circle cx="12" cy="47" r="1" fill="rgba(255,240,180,0.4)"/><polygon points="40,18 42,24 48,24 43,28 45,34 40,30 35,34 37,28 32,24 38,24" fill="rgba(255,240,180,0.9)" stroke="rgba(255,220,80,0.5)" strokeWidth="0.5"/></svg>
  if (id === 'bow') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(255,210,230,0.15)" stroke="rgba(220,120,160,0.5)" strokeWidth="1.5" rx="2"/><path d="M30 30 C24 24 10 22 12 32 C14 42 26 34 30 30Z" fill="rgba(220,100,140,0.5)" stroke="rgba(200,80,120,0.6)" strokeWidth="1.5"/><path d="M30 30 C36 24 50 22 48 32 C46 42 34 34 30 30Z" fill="rgba(220,100,140,0.5)" stroke="rgba(200,80,120,0.6)" strokeWidth="1.5"/><path d="M28 30 C22 37 18 44 22 47" fill="none" stroke="rgba(200,80,120,0.5)" strokeWidth="2" strokeLinecap="round"/><path d="M32 30 C38 37 42 44 38 47" fill="none" stroke="rgba(200,80,120,0.5)" strokeWidth="2" strokeLinecap="round"/><circle cx="30" cy="30" r="4" fill="rgba(240,120,160,0.75)" stroke="rgba(200,80,120,0.6)" strokeWidth="1"/></svg>
  if (id === 'paw') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(255,220,200,0.15)" stroke="rgba(200,140,100,0.5)" strokeWidth="1.5" rx="2"/><ellipse cx="30" cy="37" rx="13" ry="10" fill="rgba(220,140,100,0.5)" stroke="rgba(180,100,70,0.5)" strokeWidth="1.5"/><circle cx="19" cy="24" r="5.5" fill="rgba(220,140,100,0.5)" stroke="rgba(180,100,70,0.5)" strokeWidth="1"/><circle cx="30" cy="21" r="5.5" fill="rgba(220,140,100,0.5)" stroke="rgba(180,100,70,0.5)" strokeWidth="1"/><circle cx="41" cy="24" r="5.5" fill="rgba(220,140,100,0.5)" stroke="rgba(180,100,70,0.5)" strokeWidth="1"/></svg>
  if (id === 'cherry') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(255,210,220,0.15)" stroke="rgba(180,60,80,0.5)" strokeWidth="1.5" rx="2"/><path d="M22 38 C24 28 32 22 38 18" fill="none" stroke="rgba(80,120,40,0.7)" strokeWidth="1.5" strokeLinecap="round"/><path d="M38 38 C38 30 38 24 38 18" fill="none" stroke="rgba(80,120,40,0.7)" strokeWidth="1.5" strokeLinecap="round"/><path d="M28 24 Q30 18 36 22 Q30 26 28 24Z" fill="rgba(80,160,60,0.6)" stroke="rgba(60,120,40,0.5)" strokeWidth="0.8"/><circle cx="20" cy="40" r="8" fill="rgba(195,38,55,0.6)" stroke="rgba(150,18,38,0.6)" strokeWidth="1.5"/><circle cx="38" cy="41" r="8" fill="rgba(195,38,55,0.6)" stroke="rgba(150,18,38,0.6)" strokeWidth="1.5"/><circle cx="17" cy="37" r="2.5" fill="rgba(255,180,180,0.45)"/><circle cx="35" cy="38" r="2.5" fill="rgba(255,180,180,0.45)"/></svg>
  if (id === 'tulip') return <svg width={s} height={s} viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" fill="rgba(255,210,235,0.15)" stroke="rgba(200,100,140,0.5)" strokeWidth="1.5" rx="2"/><line x1="30" y1="52" x2="30" y2="34" stroke="rgba(60,130,50,0.7)" strokeWidth="2" strokeLinecap="round"/><path d="M30 44 C26 38 17 38 21 44 C23 48 30 46 30 44Z" fill="rgba(80,160,60,0.5)" stroke="rgba(60,120,40,0.4)" strokeWidth="1"/><path d="M30 44 C34 38 43 38 39 44 C37 48 30 46 30 44Z" fill="rgba(80,160,60,0.5)" stroke="rgba(60,120,40,0.4)" strokeWidth="1"/><path d="M30 34 C24 30 22 18 30 16 C38 18 36 30 30 34Z" fill="rgba(220,75,115,0.6)" stroke="rgba(180,55,95,0.55)" strokeWidth="1.2"/><path d="M28 33 C20 31 16 19 24 17 C28 17 28 29 28 33Z" fill="rgba(220,75,115,0.5)" stroke="rgba(180,55,95,0.5)" strokeWidth="1"/><path d="M32 33 C40 31 44 19 36 17 C32 17 32 29 32 33Z" fill="rgba(220,75,115,0.5)" stroke="rgba(180,55,95,0.5)" strokeWidth="1"/></svg>
  return <svg width={s} height={s} viewBox="0 0 60 60"><circle cx="30" cy="30" r="25" fill="none" stroke="rgba(200,168,76,0.4)" strokeWidth="1.5"/><text x="30" y="34" textAnchor="middle" fontSize="14" fill="rgba(200,168,76,0.6)">✦</text></svg>
}

function EnvelopeSVG({ id = 'classic', color = '#c8a050', width: w = 120, height: h = 80 }: { id?: string; color?: string; width?: number; height?: number }) {
  if (id === 'vintage') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="2" fill="#f2e8c8" stroke="rgba(120,80,20,0.55)" strokeWidth="1.2"/><rect x="6" y="24" width="108" height="50" rx="1" fill="none" stroke="rgba(120,80,20,0.22)" strokeWidth="0.7" strokeDasharray="2 2"/><path d="M2 20 L60 56 L118 20 Z" fill="#ede0b8" stroke="rgba(120,80,20,0.45)" strokeWidth="1"/><path d="M2 78 L60 46 L118 78" fill="none" stroke="rgba(120,80,20,0.28)" strokeWidth="0.8"/><line x1="2" y1="20" x2="60" y2="46" stroke="rgba(120,80,20,0.18)" strokeWidth="0.7"/><line x1="118" y1="20" x2="60" y2="46" stroke="rgba(120,80,20,0.18)" strokeWidth="0.7"/><circle cx="10" cy="70" r="2.5" fill="rgba(120,80,20,0.35)"/><circle cx="110" cy="70" r="2.5" fill="rgba(120,80,20,0.35)"/><circle cx="10" cy="27" r="2.5" fill="rgba(120,80,20,0.35)"/><circle cx="110" cy="27" r="2.5" fill="rgba(120,80,20,0.35)"/><line x1="14" y1="27" x2="22" y2="27" stroke="rgba(120,80,20,0.28)" strokeWidth="0.7"/><line x1="98" y1="27" x2="106" y2="27" stroke="rgba(120,80,20,0.28)" strokeWidth="0.7"/></svg>
  if (id === 'airmail') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="2" width="116" height="76" rx="2" fill="#f8f5ee" stroke="#cc3333" strokeWidth="3"/><rect x="8" y="8" width="104" height="64" rx="1" fill="none" stroke="#1144aa" strokeWidth="1.2" strokeDasharray="4 3"/><path d="M2 20 L60 54 L118 20 Z" fill="#f5f1e8" stroke="#bb3322" strokeWidth="0.8"/><path d="M2 78 L60 48 L118 78" fill="none" stroke="rgba(30,60,160,0.35)" strokeWidth="0.7"/><line x1="2" y1="20" x2="60" y2="46" stroke="rgba(0,0,0,0.09)" strokeWidth="0.6"/><line x1="118" y1="20" x2="60" y2="46" stroke="rgba(0,0,0,0.09)" strokeWidth="0.6"/><text x="60" y="68" textAnchor="middle" fontSize="7" fontFamily="sans-serif" fill="#1144aa" letterSpacing="2" fontStyle="italic">PAR AVION</text></svg>
  if (id === 'sakura') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="2" fill="#fde8f0" stroke="rgba(200,100,140,0.45)" strokeWidth="1"/><path d="M2 20 L60 56 L118 20 Z" fill="#fde0ec" stroke="rgba(200,100,140,0.35)" strokeWidth="0.8"/><path d="M2 78 L60 46 L118 78" fill="none" stroke="rgba(200,100,140,0.28)" strokeWidth="0.7"/><line x1="2" y1="20" x2="60" y2="46" stroke="rgba(200,100,140,0.18)" strokeWidth="0.6"/><line x1="118" y1="20" x2="60" y2="46" stroke="rgba(200,100,140,0.18)" strokeWidth="0.6"/>{[{cx:14,cy:66},{cx:20,cy:70},{cx:8,cy:70},{cx:10,cy:63},{cx:22,cy:63}].map((p,i)=><circle key={i} cx={p.cx} cy={p.cy} r="3.5" fill="rgba(230,100,140,0.5)"/>)}{[{cx:106,cy:66},{cx:100,cy:70},{cx:112,cy:70},{cx:110,cy:63},{cx:98,cy:63}].map((p,i)=><circle key={i} cx={p.cx} cy={p.cy} r="3.5" fill="rgba(230,100,140,0.5)"/>)}<circle cx="14" cy="66" r="1.5" fill="rgba(255,180,220,0.7)"/><circle cx="106" cy="66" r="1.5" fill="rgba(255,180,220,0.7)"/></svg>
  if (id === 'starfield') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="2" fill="#1a1830" stroke="rgba(150,140,220,0.4)" strokeWidth="1"/><path d="M2 20 L60 56 L118 20 Z" fill="#1c1a38" stroke="rgba(150,140,220,0.32)" strokeWidth="0.8"/><path d="M2 78 L60 46 L118 78" fill="none" stroke="rgba(150,140,220,0.22)" strokeWidth="0.7"/><line x1="2" y1="20" x2="60" y2="46" stroke="rgba(150,140,220,0.14)" strokeWidth="0.6"/><line x1="118" y1="20" x2="60" y2="46" stroke="rgba(150,140,220,0.14)" strokeWidth="0.6"/>{[[14,34],[28,28],[44,42],[68,30],[84,38],[100,26],[56,60],[26,62],[96,60],[110,48],[40,30],[80,52]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r={i%3===0?1.4:0.9} fill="rgba(220,210,255,0.85)"/>)}</svg>
  if (id === 'kraft') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="2" fill="#c8924a" stroke="rgba(80,40,10,0.5)" strokeWidth="1.2"/>{[24,28,32,36,40,44,48,52,56,60,64,68,72].map((y,i)=><line key={i} x1="4" y1={y} x2="116" y2={y} stroke="rgba(80,40,10,0.07)" strokeWidth="0.5"/>)}<path d="M2 20 L60 56 L118 20 Z" fill="#be8840" stroke="rgba(80,40,10,0.4)" strokeWidth="1"/><path d="M2 78 L60 46 L118 78" fill="none" stroke="rgba(60,30,8,0.3)" strokeWidth="0.8"/><line x1="2" y1="20" x2="60" y2="46" stroke="rgba(60,30,8,0.18)" strokeWidth="0.6"/><line x1="118" y1="20" x2="60" y2="46" stroke="rgba(60,30,8,0.18)" strokeWidth="0.6"/><line x1="60" y1="22" x2="60" y2="76" stroke="rgba(80,40,10,0.22)" strokeWidth="0.9" strokeDasharray="3 2"/><line x1="4" y1="49" x2="116" y2="49" stroke="rgba(80,40,10,0.15)" strokeWidth="0.7"/><circle cx="60" cy="49" r="3" fill="rgba(80,40,10,0.28)"/></svg>
  if (id === 'romantic') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="2" fill="#fce8ee" stroke="rgba(200,80,120,0.4)" strokeWidth="1"/><path d="M2 20 L60 56 L118 20 Z" fill="#fce0ea" stroke="rgba(180,60,100,0.32)" strokeWidth="0.8"/><path d="M2 78 L60 46 L118 78" fill="none" stroke="rgba(180,60,100,0.22)" strokeWidth="0.7"/><line x1="2" y1="20" x2="60" y2="46" stroke="rgba(180,60,100,0.14)" strokeWidth="0.6"/><line x1="118" y1="20" x2="60" y2="46" stroke="rgba(180,60,100,0.14)" strokeWidth="0.6"/><path d="M60 46 C56 42 51 40 51 43.5 C51 47 55 50 60 54 C65 50 69 47 69 43.5 C69 40 64 42 60 46Z" fill="rgba(200,70,110,0.58)" stroke="rgba(180,50,90,0.35)" strokeWidth="0.7"/><path d="M20 66 C18.5 64.2 17 63 17 64.5 C17 66 18.5 67.2 20 68.5 C21.5 67.2 23 66 23 64.5 C23 63 21.5 64.2 20 66Z" fill="rgba(200,80,120,0.42)"/><path d="M100 66 C98.5 64.2 97 63 97 64.5 C97 66 98.5 67.2 100 68.5 C101.5 67.2 103 66 103 64.5 C103 63 101.5 64.2 100 66Z" fill="rgba(200,80,120,0.42)"/></svg>
  if (id === 'wax') return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="2" width="116" height="76" rx="2" fill="#f4eedd" stroke="rgba(100,80,40,0.4)" strokeWidth="1.2"/><path d="M2 2 L60 42 L118 2 Z" fill="#eee0c8" stroke="rgba(100,80,40,0.32)" strokeWidth="0.8"/><path d="M2 78 L60 38 L118 78" fill="none" stroke="rgba(100,80,40,0.2)" strokeWidth="0.7"/><line x1="2" y1="2" x2="60" y2="38" stroke="rgba(100,80,40,0.14)" strokeWidth="0.6"/><line x1="118" y1="2" x2="60" y2="38" stroke="rgba(100,80,40,0.14)" strokeWidth="0.6"/><circle cx="60" cy="42" r="11" fill="#8b1a1a"/><circle cx="60" cy="42" r="9" fill="#9a2020"/><text x="60" y="46" textAnchor="middle" fontSize="9" fill="rgba(255,200,180,0.8)" fontFamily="serif">✦</text></svg>
  return <svg width={w} height={h} viewBox="0 0 120 80"><rect x="2" y="20" width="116" height="58" rx="3" fill={color} stroke="rgba(0,0,0,0.2)" strokeWidth="1"/><path d="M2 20 L60 56 L118 20 Z" fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth="1"/><path d="M2 78 L60 46 L118 78" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1"/><line x1="2" y1="20" x2="60" y2="46" stroke="rgba(0,0,0,0.1)" strokeWidth="0.8"/><line x1="118" y1="20" x2="60" y2="46" stroke="rgba(0,0,0,0.1)" strokeWidth="0.8"/></svg>
}

function PlainWhite({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || '#ffffff', boxShadow:'0 20px 80px rgba(0,0,0,0.55)', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, borderLeft:'4px solid rgba(220,60,60,0.25)', pointerEvents:'none', zIndex:1 }}/>
      {[...Array(22)].map((_,i)=><div key={i} style={{ position:'absolute', left:'52px', right:'20px', top:`${48+i*28}px`, height:'1px', background:'rgba(100,160,220,0.18)' }}/>)}
      <div style={{ padding:'32px 28px 40px 60px', position:'relative', zIndex:2 }}>{children}</div>
    </div>
  )
}

function Starfield({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || 'linear-gradient(160deg, #181c2a 0%, #232946 100%)', boxShadow:'0 20px 80px rgba(0,0,0,0.85)', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1 }}>
        {[...Array(60)].map((_,i)=>{
          const x=((i*73+17)%100); const y=((i*53+11)%100); const sz=(i%4)*0.4+0.3; const op=(i%5)*0.04+0.08
          return <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, width:`${sz}px`, height:`${sz}px`, borderRadius:'50%', background:`rgba(255,255,255,${op})` }}/>
        })}
      </div>
      <div style={{ position:'absolute', inset:'14px', border:'1px solid rgba(180,160,255,0.12)', pointerEvents:'none', zIndex:2 }}/>
      <div style={{ padding:'40px', position:'relative', zIndex:3 }}>{children}</div>
    </div>
  )
}

function VellumPaper({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || 'linear-gradient(160deg, #f9f7f3 0%, #ece9e6 100%)', boxShadow:'0 20px 80px rgba(0,0,0,0.45)', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 150 150' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`, backgroundSize:'150px', zIndex:1 }}/>
      <div style={{ position:'absolute', inset:'16px', border:'1px solid rgba(160,140,120,0.2)', pointerEvents:'none', zIndex:2 }}/>
      <div style={{ padding:'40px', position:'relative', zIndex:3 }}>{children}</div>
    </div>
  )
}

function BlueRuled({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || 'linear-gradient(180deg, #eaf6ff 0%, #dbefff 100%)', boxShadow:'0 20px 80px rgba(0,0,0,0.5)', overflow:'hidden' }}>
      {[...Array(22)].map((_,i)=><div key={i} style={{ position:'absolute', left:'20px', right:'20px', top:`${48+i*28}px`, height:'1px', background:'rgba(80,140,220,0.22)' }}/>)}
      <div style={{ position:'absolute', left:'48px', top:0, bottom:0, width:'2px', background:'rgba(210,80,80,0.28)', pointerEvents:'none', zIndex:2 }}/>
      <div style={{ padding:'32px 28px 40px 60px', position:'relative', zIndex:3 }}>{children}</div>
    </div>
  )
}

function KraftPaper({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || 'linear-gradient(155deg, #e2c9a0 0%, #cbb484 100%)', boxShadow:'0 20px 80px rgba(0,0,0,0.65)', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0.4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.1'/%3E%3C/svg%3E")`, backgroundSize:'120px', zIndex:1 }}/>
      {[...Array(20)].map((_,i)=><div key={i} style={{ position:'absolute', left:'32px', right:'32px', top:`${56+i*28}px`, height:'1px', background:'rgba(100,60,10,0.13)' }}/>)}
      <div style={{ padding:'40px', position:'relative', zIndex:2 }}>{children}</div>
    </div>
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
  plain: { main: '#181818', secondary: 'rgba(30,30,30,0.72)', accent: '#2060c0' },
  starfield: { main: '#e8e4f8', secondary: 'rgba(220,215,245,0.78)', accent: '#a090e0' },
  vellum: { main: '#1c1008', secondary: 'rgba(38,22,10,0.72)', accent: '#6a4820' },
  'blue-ruled': { main: '#0a0c1a', secondary: 'rgba(18,22,40,0.72)', accent: '#2860b0' },
  kraft: { main: '#1e0e04', secondary: 'rgba(40,18,6,0.74)', accent: '#7a4010' },
}

const PAPER_ENVELOPE_COLOR: Record<string, string> = {
  ornate: '#e0c870', floral: '#f0b8cc', notepad: '#b0c8e0',
  scrapbook: '#c0a868', ribbon: '#e8a0a0', postage: '#c8c0b0',
  sakura: '#f0b8cc', aged: '#b89050',
  plain: '#c8c8c8', starfield: '#4a4870', vellum: '#d8d0c0',
  'blue-ruled': '#a0c4e0', kraft: '#c0924a',
}

function LetterContent({ fontFamily, ink, recipient, senderName, date, body, setBody, textareaRef, onPageFull, pageLimit }: {
  fontFamily: string; ink: { main: string; secondary: string; accent: string }
  recipient?: string; senderName?: string; date: string
  body: string; setBody: (v: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onPageFull?: () => void
  pageLimit: number
}) {
  const isFull = body.length >= pageLimit
  const charsLeft = pageLimit - body.length
  return (
    <div>
      <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'12px', color:ink.secondary, marginBottom:'16px', textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}>{date}</p>
      <p style={{ fontFamily, fontSize:'18px', fontStyle:'italic', color:ink.secondary, marginBottom:'18px', lineHeight:1.8, textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}>
        {recipient ? `Dear ${recipient},` : 'Dear Stranger,'}
      </p>
      <textarea ref={textareaRef} value={body} onChange={e=>setBody(e.target.value)}
        placeholder="Begin your letter here..." maxLength={pageLimit}
        style={{ width:'100%', height:'252px', background:'transparent', border:'none', outline:'none', color:ink.main, caretColor:ink.accent, fontFamily, fontSize:'16px', lineHeight:2, resize:'none', overflow:'hidden', letterSpacing:'0.01em', textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}/>
      {isFull ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'6px' }}>
          <span style={{ fontFamily:"'Cinzel', serif", fontSize:'8px', letterSpacing:'0.2em', color:'rgba(230,199,110,0.65)', textTransform:'uppercase' }}>Page full</span>
          <motion.button whileTap={{ scale:0.96 }} onClick={onPageFull}
            style={{ background:'rgba(230,199,110,0.08)', border:'1px solid rgba(230,199,110,0.55)', color:'#e6c76e', fontFamily:"'Cinzel', serif", fontSize:'8px', letterSpacing:'0.2em', textTransform:'uppercase', padding:'4px 12px', cursor:'pointer', borderRadius:'2px' }}
            animate={{ opacity:[1,0.65,1] }} transition={{ duration:1.4, repeat:Infinity }}>
            Continue on next page →
          </motion.button>
        </div>
      ) : charsLeft <= 80 ? (
        <p style={{ textAlign:'right', fontFamily:"'Cinzel', serif", fontSize:'7px', letterSpacing:'0.2em', color:'rgba(255,255,255,0.35)', marginTop:'4px' }}>{charsLeft} chars remaining</p>
      ) : null}
      <p style={{ fontFamily, fontStyle:'italic', fontSize:'15px', color:ink.secondary, marginTop:'10px', lineHeight:1.9, textShadow: '0 1px 6px #fff8, 0 0px 1px #fff4' }}>
        Yours across the distance,<br/>
        <span style={{ color:ink.accent }}>{senderName || 'A Stranger'}</span>
      </p>
    </div>
  )
}

const DAILY_PROMPTS = [
  'Write to the version of yourself from three years ago',
  'Write to someone who will never read this',
  'Write to a stranger who is exactly like you, in a different life',
  'Write to the night you couldn’t sleep',
  'Write to a city you left behind',
  'Write to the feeling you keep returning to',
  'Write to someone you forgave without telling them',
  'Write to the year that changed everything',
  'Write to a fear you’ve been carrying in silence',
  'Write to the version of tomorrow you’re afraid of',
  'Write to the person you almost became',
  'Write to a memory that still visits you',
  'Write to someone who taught you something without knowing it',
  'Write to the quietest moment of your life',
  'Write to the part of you that hasn’t given up',
  'Write to a future stranger who needs these exact words',
  'Write to the last goodbye you weren’t ready for',
  'Write to everything you’re holding at once',
  'Write to the sound of a place that no longer exists',
  'Write to the truth you’ve been circling around',
]

export default function Scribe({ recipientName, senderName, lettersSent = 0, onClose, onSend }: {
  recipientName?: string; senderName?: string; lettersSent?: number
  onClose?: () => void
  onSend?: (letter: { to?: string; body: string; paperId: string; subject: string; fontId: string; colorId?: string; paperColorId?: string; stampId?: string; envelopeId?: string }) => void
}) {
  const unlockedPapers = PAPERS.filter(p => p.unlocksAt <= lettersSent)
  const [selectedPaper, setSelectedPaper] = useState(unlockedPapers[0])
  const [selectedFont, setSelectedFont] = useState(FONTS[0])
  const [selectedEnvelope, setSelectedEnvelope] = useState('classic')
  const [selectedStamp, setSelectedStamp] = useState<string | undefined>()
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedPaperColor, setSelectedPaperColor] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [subjectError, setSubjectError] = useState(false)
  const [pages, setPages] = useState<string[]>([''])
  const [currentPage, setCurrentPage] = useState(0)
  const body = pages.join('\n\n— ✦ —\n\n')
  const [sent, setSent] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [view, setView] = useState<'write'|'papers'|'fonts'|'stamps'|'colors'|'paper-color'|'envelopes'|'envelope'>('write')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showPrompt, setShowPrompt] = useState(true)
  const promptPool = useRef<string[]>((() => {
    const seed = Math.floor(Date.now() / 86400000)
    const shuffled = [...DAILY_PROMPTS]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = (seed * 9301 + i * 49297 + 233280) % (i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled.slice(0, 5)
  })()).current
  const [promptIdx, setPromptIdx] = useState(0)
  const [promptVisible, setPromptVisible] = useState(true)
  const todayPrompt = promptPool[promptIdx]

  // Auto-advance prompt every 5s
  useEffect(() => {
    if (!showPrompt) return
    const t = setInterval(() => {
      setPromptVisible(false)
      setTimeout(() => {
        setPromptIdx(i => (i + 1) % promptPool.length)
        setPromptVisible(true)
      }, 400)
    }, 5000)
    return () => clearInterval(t)
  }, [showPrompt, promptPool.length])

  function cyclePrompt(dir: 1 | -1) {
    setPromptVisible(false)
    setTimeout(() => {
      setPromptIdx(i => (i + dir + promptPool.length) % promptPool.length)
      setPromptVisible(true)
    }, 300)
  }

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
    playLetterSend()
    await new Promise(r => setTimeout(r, 2200))
    setSent(true)
    setTimeout(() => {
      onSend?.({ to: recipientName, body, paperId: selectedPaper.id, subject, fontId: selectedFont.id, colorId: selectedColor ?? undefined, paperColorId: selectedPaperColor ?? undefined, stampId: selectedStamp, envelopeId: selectedEnvelope })
      onClose?.()
    }, 2400)
  }

  const renderPaper = () => {
  const setPageBody = (v: string) => setPages(prev => prev.map((p, i) => i === currentPage ? v : p))
    const PAGE_CHAR_LIMIT = 480
    function handlePageFull() {
      setPages(prev => [...prev, ''])
      setCurrentPage(pages.length)
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
    const content = <LetterContent fontFamily={fontFamily} ink={effectiveInk} recipient={recipientName} senderName={senderName} date={today} body={pages[currentPage]} setBody={setPageBody} textareaRef={textareaRef} onPageFull={handlePageFull} pageLimit={PAGE_CHAR_LIMIT}/>
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
      case 'plain': return <PlainWhite paperBg={pbg}>{content}</PlainWhite>
      case 'starfield': return <Starfield paperBg={pbg}>{content}</Starfield>
      case 'vellum': return <VellumPaper paperBg={pbg}>{content}</VellumPaper>
      case 'blue-ruled': return <BlueRuled paperBg={pbg}>{content}</BlueRuled>
      case 'kraft': return <KraftPaper paperBg={pbg}>{content}</KraftPaper>
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
        className="fixed-close-btn-top"
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

        {view==='envelopes' && !sent && (
          <motion.div key="envelopes" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} style={{ width:'min(680px, 95vw)', zIndex:2 }}>
            <div style={{ textAlign:'center', marginBottom:'24px' }}>
              <p style={{ fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.5em', color:'#e6c76e', textTransform:'uppercase', marginBottom:'5px' }}>Choose Your Envelope</p>
              <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'13px', color:'rgba(255,255,255,0.8)' }}>The vessel that carries your words</p>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'16px', justifyContent:'center', marginBottom:'28px' }}>
              {ENVELOPES.map(env => {
                const isSelected = selectedEnvelope === env.id
                return (
                  <motion.div key={env.id} whileTap={{ scale:0.95 }} onClick={()=>setSelectedEnvelope(isSelected ? 'classic' : env.id)}
                    style={{ cursor:'pointer', padding:'12px', background:isSelected?'rgba(230,199,110,0.12)':'rgba(255,255,255,0.03)', border:isSelected?'1px solid rgba(230,199,110,0.5)':'1px solid rgba(255,255,255,0.12)', borderRadius:'6px', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', boxShadow:isSelected?'0 0 16px rgba(230,199,110,0.2)':'none', width:'140px' }}>
                    <EnvelopeSVG id={env.id} color={envelopeColor}/>
                    <p style={{ fontFamily:"'Cinzel', serif", fontSize:'8px', letterSpacing:'0.15em', color:isSelected?'#e6c76e':'rgba(255,255,255,0.76)', textTransform:'uppercase' }}>{env.label}</p>
                    <p style={{ fontFamily:"'IM Fell English', serif", fontStyle:'italic', fontSize:'10px', color:'rgba(255,255,255,0.5)', textAlign:'center' }}>{env.desc}</p>
                  </motion.div>
                )
              })}
            </div>
            <div style={{ textAlign:'center' }}>
              <button onClick={()=>setView('write')}
                style={{ padding:'12px 32px', background:'transparent', border:'1px solid rgba(230,199,110,0.45)', color:'#e6c76e', fontFamily:"'Cinzel', serif", fontSize:'10px', letterSpacing:'0.3em', textTransform:'uppercase', cursor:'pointer', borderRadius:'2px' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(230,199,110,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                {`Seal in ${ENVELOPES.find(e=>e.id===selectedEnvelope)?.label ?? 'Classic'} envelope ✦`}
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

            {showPrompt && (
              <div style={{ marginBottom: '14px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <button
                    onClick={() => cyclePrompt(-1)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', fontSize: '16px', cursor: 'pointer', padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(230,199,110,0.65)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.28)' }}
                  >&#8249;</button>
                  <p
                    title="Click to use as subject"
                    onClick={() => { setSubject(todayPrompt); setSubjectError(false); setShowPrompt(false) }}
                    style={{
                      fontFamily: "'IM Fell English', serif", fontStyle: 'italic',
                      fontSize: '13px', color: 'rgba(255,255,255,0.45)',
                      lineHeight: 1.5, cursor: 'pointer', margin: 0,
                      opacity: promptVisible ? 1 : 0,
                      transition: 'opacity 0.35s ease',
                      userSelect: 'none',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.82)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)' }}
                  >
                    {todayPrompt}
                  </p>
                  <button
                    onClick={() => cyclePrompt(1)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', fontSize: '16px', cursor: 'pointer', padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(230,199,110,0.65)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.28)' }}
                  >&#8250;</button>
                </div>
              </div>
            )}

            {renderPaper()}

            {/* Page navigation */}
            {pages.length > 1 && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'10px', padding:'8px 4px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <button onClick={()=>{ setCurrentPage(p=>Math.max(0,p-1)); setTimeout(()=>textareaRef.current?.focus(),100) }}
                    disabled={currentPage===0}
                    style={{ background:'none', border:'1px solid rgba(255,255,255,0.14)', color:currentPage===0?'rgba(255,255,255,0.22)':'rgba(255,255,255,0.7)', fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.15em', padding:'4px 9px', cursor:currentPage===0?'default':'pointer', borderRadius:'2px' }}>
                    ← Prev
                  </button>
                  <span style={{ fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.2em', color:'rgba(255,255,255,0.55)', whiteSpace:'nowrap' }}>
                    Page {currentPage+1} / {pages.length}
                  </span>
                  <button onClick={()=>{ setCurrentPage(p=>Math.min(pages.length-1,p+1)); setTimeout(()=>textareaRef.current?.focus(),100) }}
                    disabled={currentPage===pages.length-1}
                    style={{ background:'none', border:'1px solid rgba(255,255,255,0.14)', color:currentPage===pages.length-1?'rgba(255,255,255,0.22)':'rgba(255,255,255,0.7)', fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.15em', padding:'4px 9px', cursor:currentPage===pages.length-1?'default':'pointer', borderRadius:'2px' }}>
                    Next →
                  </button>
                </div>
                {pages.length > 1 && pages[currentPage].trim() === '' && (
                  <button onClick={()=>{ setPages(prev=>prev.filter((_,i)=>i!==currentPage)); setCurrentPage(p=>Math.max(0,p-1)) }}
                    style={{ background:'none', border:'1px solid rgba(220,80,80,0.35)', color:'rgba(220,80,80,0.65)', fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.15em', padding:'4px 9px', cursor:'pointer', borderRadius:'2px' }}>
                    Remove Page
                  </button>
                )}
              </div>
            )}

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
                  { label:ENVELOPES.find(e=>e.id===selectedEnvelope)?.label||'Envelope', action:()=>setView('envelopes'), icon:'✉' },
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
              <EnvelopeSVG id={selectedEnvelope} color={envelopeColor}/>
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