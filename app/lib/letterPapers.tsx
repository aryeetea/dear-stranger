'use client'
import React from 'react'

export const PAPER_TONES = [
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

export const PAPER_INK: Record<string, { main: string; secondary: string; accent: string }> = {
  ornate:           { main: '#140c04', secondary: 'rgba(35,20,6,0.72)',   accent: '#8b6010' },
  floral:           { main: '#140810', secondary: 'rgba(35,12,22,0.72)',  accent: '#8b2050' },
  notepad:          { main: '#0a0c18', secondary: 'rgba(20,25,50,0.72)',  accent: '#3060a0' },
  scrapbook:        { main: '#160c04', secondary: 'rgba(30,14,4,0.72)',   accent: '#6a3a0e' },
  ribbon:           { main: '#140408', secondary: 'rgba(35,8,12,0.72)',   accent: '#8b1020' },
  postage:          { main: '#100c18', secondary: 'rgba(25,18,40,0.72)',  accent: '#6040a0' },
  sakura:           { main: '#18080e', secondary: 'rgba(40,15,20,0.72)',  accent: '#8b2050' },
  aged:             { main: '#160c04', secondary: 'rgba(30,14,4,0.74)',   accent: '#7a4010' },
  plain:            { main: '#181818', secondary: 'rgba(30,30,30,0.72)',  accent: '#2060c0' },
  starfield:        { main: '#e8e4f8', secondary: 'rgba(220,215,245,0.78)', accent: '#a090e0' },
  vellum:           { main: '#1c1008', secondary: 'rgba(38,22,10,0.72)',  accent: '#6a4820' },
  'blue-ruled':     { main: '#0a0c1a', secondary: 'rgba(18,22,40,0.72)', accent: '#2860b0' },
  kraft:            { main: '#1e0e04', secondary: 'rgba(40,18,6,0.74)',   accent: '#7a4010' },
  watercolor:       { main: '#1a1030', secondary: 'rgba(35,20,50,0.72)', accent: '#7060a8' },
  graph:            { main: '#0a1028', secondary: 'rgba(18,24,50,0.72)', accent: '#3060b0' },
  blueprint:        { main: '#c8e4ff', secondary: 'rgba(180,220,255,0.78)', accent: '#80c0ff' },
  'midnight-scroll':{ main: '#e8deff', secondary: 'rgba(220,210,255,0.78)', accent: '#c0a0ff' },
  'rice-paper':     { main: '#1c1408', secondary: 'rgba(38,26,10,0.72)', accent: '#7a5820' },
}

export function OrnateStationery({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || 'linear-gradient(160deg, #fdf6e0 0%, #f8efcc 100%)', boxShadow:'0 20px 80px rgba(0,0,0,0.7)', overflow:'hidden' }}>
      {([['0','0','0deg'],['100%','0','90deg'],['0','100%','-90deg'],['100%','100%','180deg']] as const).map(([l,t,rot],i)=>(
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

export function FloralLetter({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
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

export function SpiralNotepad({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
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

export function ScrapbookLetter({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
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

export function RibbonLetter({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
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

export function PostageLetter({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
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

export function CherryBlossom({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
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

export function AgedDistressed({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
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

export function PlainWhite({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || '#ffffff', boxShadow:'0 20px 80px rgba(0,0,0,0.55)', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, borderLeft:'4px solid rgba(220,60,60,0.25)', pointerEvents:'none', zIndex:1 }}/>
      {[...Array(22)].map((_,i)=><div key={i} style={{ position:'absolute', left:'52px', right:'20px', top:`${48+i*28}px`, height:'1px', background:'rgba(100,160,220,0.18)' }}/>)}
      <div style={{ padding:'32px 28px 40px 60px', position:'relative', zIndex:2 }}>{children}</div>
    </div>
  )
}

export function Starfield({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
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

export function VellumPaper({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || 'linear-gradient(160deg, #f9f7f3 0%, #ece9e6 100%)', boxShadow:'0 20px 80px rgba(0,0,0,0.45)', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 150 150' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`, backgroundSize:'150px', zIndex:1 }}/>
      <div style={{ position:'absolute', inset:'16px', border:'1px solid rgba(160,140,120,0.2)', pointerEvents:'none', zIndex:2 }}/>
      <div style={{ padding:'40px', position:'relative', zIndex:3 }}>{children}</div>
    </div>
  )
}

export function BlueRuled({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || 'linear-gradient(180deg, #eaf6ff 0%, #dbefff 100%)', boxShadow:'0 20px 80px rgba(0,0,0,0.5)', overflow:'hidden' }}>
      {[...Array(22)].map((_,i)=><div key={i} style={{ position:'absolute', left:'20px', right:'20px', top:`${48+i*28}px`, height:'1px', background:'rgba(80,140,220,0.22)' }}/>)}
      <div style={{ position:'absolute', left:'48px', top:0, bottom:0, width:'2px', background:'rgba(210,80,80,0.28)', pointerEvents:'none', zIndex:2 }}/>
      <div style={{ padding:'32px 28px 40px 60px', position:'relative', zIndex:3 }}>{children}</div>
    </div>
  )
}

export function KraftPaper({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || 'linear-gradient(155deg, #e2c9a0 0%, #cbb484 100%)', boxShadow:'0 20px 80px rgba(0,0,0,0.65)', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0.4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.1'/%3E%3C/svg%3E")`, backgroundSize:'120px', zIndex:1 }}/>
      {[...Array(20)].map((_,i)=><div key={i} style={{ position:'absolute', left:'32px', right:'32px', top:`${56+i*28}px`, height:'1px', background:'rgba(100,60,10,0.13)' }}/>)}
      <div style={{ padding:'40px', position:'relative', zIndex:2 }}>{children}</div>
    </div>
  )
}

export function WatercolorPaper({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || 'linear-gradient(160deg, #f0f6fb 0%, #faeef5 50%, #f5f8e8 100%)', boxShadow:'0 20px 80px rgba(0,0,0,0.55)', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1 }}>
        <svg width="100%" height="100%" style={{ position:'absolute', inset:0 }} preserveAspectRatio="xMidYMid slice">
          <defs>
            <filter id="wc-blur"><feGaussianBlur stdDeviation="18"/></filter>
          </defs>
          <ellipse cx="15%" cy="20%" rx="120" ry="80" fill="rgba(160,200,240,0.22)" filter="url(#wc-blur)"/>
          <ellipse cx="80%" cy="15%" rx="100" ry="70" fill="rgba(230,160,200,0.2)" filter="url(#wc-blur)"/>
          <ellipse cx="60%" cy="75%" rx="130" ry="90" fill="rgba(180,230,190,0.18)" filter="url(#wc-blur)"/>
          <ellipse cx="25%" cy="80%" rx="90" ry="60" fill="rgba(250,200,150,0.18)" filter="url(#wc-blur)"/>
          <ellipse cx="90%" cy="60%" rx="80" ry="100" fill="rgba(200,180,240,0.16)" filter="url(#wc-blur)"/>
        </svg>
      </div>
      <div style={{ position:'absolute', inset:'14px', border:'1px solid rgba(160,140,200,0.18)', pointerEvents:'none', zIndex:2 }}/>
      {[...Array(20)].map((_,i)=><div key={i} style={{ position:'absolute', left:'40px', right:'40px', top:`${60+i*30}px`, height:'1px', background:'rgba(140,120,180,0.1)' }}/>)}
      <div style={{ padding:'40px', position:'relative', zIndex:3 }}>{children}</div>
    </div>
  )
}

export function GraphPaper({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || '#f8fbff', boxShadow:'0 20px 80px rgba(0,0,0,0.5)', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1 }}>
        {[...Array(40)].map((_,i)=><div key={`h${i}`} style={{ position:'absolute', left:0, right:0, top:`${i*20}px`, height:'1px', background: i%5===0 ? 'rgba(80,130,200,0.25)' : 'rgba(80,130,200,0.1)' }}/>)}
        {[...Array(30)].map((_,i)=><div key={`v${i}`} style={{ position:'absolute', top:0, bottom:0, left:`${i*20}px`, width:'1px', background: i%5===0 ? 'rgba(80,130,200,0.25)' : 'rgba(80,130,200,0.1)' }}/>)}
      </div>
      <div style={{ padding:'40px', position:'relative', zIndex:2 }}>{children}</div>
    </div>
  )
}

export function BlueprintPaper({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || 'linear-gradient(160deg, #0d2d56 0%, #0a2248 100%)', boxShadow:'0 20px 80px rgba(0,0,0,0.85)', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1 }}>
        {[...Array(35)].map((_,i)=><div key={`h${i}`} style={{ position:'absolute', left:0, right:0, top:`${i*22}px`, height:'1px', background: i%5===0 ? 'rgba(160,210,255,0.3)' : 'rgba(160,210,255,0.12)' }}/>)}
        {[...Array(28)].map((_,i)=><div key={`v${i}`} style={{ position:'absolute', top:0, bottom:0, left:`${i*22}px`, width:'1px', background: i%5===0 ? 'rgba(160,210,255,0.3)' : 'rgba(160,210,255,0.12)' }}/>)}
        <div style={{ position:'absolute', inset:'16px', border:'1px solid rgba(160,210,255,0.35)' }}/>
        <div style={{ position:'absolute', inset:'22px', border:'0.5px solid rgba(160,210,255,0.15)' }}/>
      </div>
      <div style={{ position:'absolute', top:'24px', left:'50%', transform:'translateX(-50%)', pointerEvents:'none', zIndex:3, whiteSpace:'nowrap' }}>
        <p style={{ fontFamily:"'Cinzel', serif", fontSize:'8px', letterSpacing:'0.6em', color:'rgba(160,210,255,0.6)', textTransform:'uppercase' }}>✦ Dear Stranger ✦</p>
      </div>
      {[...Array(18)].map((_,i)=><div key={i} style={{ position:'absolute', left:'36px', right:'36px', top:`${70+i*28}px`, height:'1px', background:'rgba(160,210,255,0.08)' }}/>)}
      <div style={{ padding:'56px 44px 44px', position:'relative', zIndex:2 }}>{children}</div>
    </div>
  )
}

export function MidnightScroll({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || 'linear-gradient(175deg, #08060e 0%, #120820 50%, #0c0618 100%)', boxShadow:'0 20px 80px rgba(0,0,0,0.95)', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1 }}>
        {[...Array(50)].map((_,i)=>{
          const x=((i*61+23)%100); const y=((i*47+17)%100); const sz=(i%3)*0.3+0.3; const op=(i%5)*0.03+0.05
          return <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, width:`${sz}px`, height:`${sz}px`, borderRadius:'50%', background:`rgba(220,200,255,${op})` }}/>
        })}
        <svg width="100%" height="100%" style={{ position:'absolute', inset:0 }}>
          <defs><filter id="glow-ms"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <path d="M0 0 L24 0 L24 24 Q0 24 0 0Z" fill="none" stroke="rgba(160,120,220,0.5)" strokeWidth="1.5"/>
          <circle cx="12" cy="12" r="3" fill="rgba(180,140,240,0.4)" filter="url(#glow-ms)"/>
        </svg>
      </div>
      <div style={{ position:'absolute', inset:'14px', border:'1px solid rgba(160,120,220,0.3)', pointerEvents:'none', zIndex:2 }}/>
      <div style={{ position:'absolute', inset:'20px', border:'0.5px solid rgba(160,120,220,0.12)', pointerEvents:'none', zIndex:2 }}/>
      <div style={{ textAlign:'center', paddingTop:'40px', paddingBottom:'4px', position:'relative', zIndex:3 }}>
        <p style={{ fontFamily:"'Cinzel', serif", fontSize:'9px', letterSpacing:'0.5em', color:'rgba(180,140,240,0.65)', textTransform:'uppercase' }}>✦ Dear Stranger ✦</p>
        <div style={{ height:'1px', background:'linear-gradient(90deg, transparent, rgba(160,120,220,0.4), transparent)', margin:'8px 60px 0' }}/>
      </div>
      {[...Array(18)].map((_,i)=><div key={i} style={{ position:'absolute', left:'44px', right:'44px', top:`${90+i*30}px`, height:'1px', background:'rgba(160,120,220,0.08)' }}/>)}
      <div style={{ padding:'8px 52px 52px', position:'relative', zIndex:3 }}>{children}</div>
    </div>
  )
}

export function RicePaper({ children, paperBg }: { children: React.ReactNode; paperBg?: string }) {
  return (
    <div style={{ position:'relative', background: paperBg || 'linear-gradient(160deg, #fdfbf7 0%, #f8f4ec 100%)', boxShadow:'0 20px 80px rgba(0,0,0,0.4)', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0.1'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.055'/%3E%3C/svg%3E")`, backgroundSize:'200px', zIndex:1 }}/>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:2 }}>
        {[...Array(12)].map((_,i)=>{
          const x1=((i*73)%90)+5; const y1=((i*53)%80)+5; const x2=x1+((i*31)%15)-7
          return <div key={i} style={{ position:'absolute', left:`${x1}%`, top:`${y1}%`, width:`${Math.abs(x2-x1)+1}%`, height:'1px', background:'rgba(180,160,120,0.06)', transform:`rotate(${((i*17)%30)-15}deg)` }}/>
        })}
      </div>
      <div style={{ position:'absolute', inset:'16px', border:'1px solid rgba(160,140,100,0.2)', pointerEvents:'none', zIndex:3 }}/>
      {[...Array(20)].map((_,i)=><div key={i} style={{ position:'absolute', left:'36px', right:'36px', top:`${56+i*28}px`, height:'1px', background:'rgba(140,120,80,0.1)' }}/>)}
      <div style={{ padding:'40px', position:'relative', zIndex:4 }}>{children}</div>
    </div>
  )
}

export function renderLetterPaper(
  paperId: string,
  paperBg: string | undefined,
  children: React.ReactNode,
): React.ReactNode {
  switch (paperId) {
    case 'ornate':          return <OrnateStationery paperBg={paperBg}>{children}</OrnateStationery>
    case 'floral':          return <FloralLetter paperBg={paperBg}>{children}</FloralLetter>
    case 'notepad':         return <SpiralNotepad paperBg={paperBg}>{children}</SpiralNotepad>
    case 'scrapbook':       return <ScrapbookLetter paperBg={paperBg}>{children}</ScrapbookLetter>
    case 'ribbon':          return <RibbonLetter paperBg={paperBg}>{children}</RibbonLetter>
    case 'postage':         return <PostageLetter paperBg={paperBg}>{children}</PostageLetter>
    case 'sakura':          return <CherryBlossom paperBg={paperBg}>{children}</CherryBlossom>
    case 'aged':            return <AgedDistressed paperBg={paperBg}>{children}</AgedDistressed>
    case 'plain':           return <PlainWhite paperBg={paperBg}>{children}</PlainWhite>
    case 'starfield':       return <Starfield paperBg={paperBg}>{children}</Starfield>
    case 'vellum':          return <VellumPaper paperBg={paperBg}>{children}</VellumPaper>
    case 'blue-ruled':      return <BlueRuled paperBg={paperBg}>{children}</BlueRuled>
    case 'kraft':           return <KraftPaper paperBg={paperBg}>{children}</KraftPaper>
    case 'watercolor':      return <WatercolorPaper paperBg={paperBg}>{children}</WatercolorPaper>
    case 'graph':           return <GraphPaper paperBg={paperBg}>{children}</GraphPaper>
    case 'blueprint':       return <BlueprintPaper paperBg={paperBg}>{children}</BlueprintPaper>
    case 'midnight-scroll': return <MidnightScroll paperBg={paperBg}>{children}</MidnightScroll>
    case 'rice-paper':      return <RicePaper paperBg={paperBg}>{children}</RicePaper>
    default:                return <OrnateStationery paperBg={paperBg}>{children}</OrnateStationery>
  }
}
