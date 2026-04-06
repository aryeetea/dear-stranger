let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

// ── Ambient ──────────────────────────────────────────────────────────────────

interface AmbientNodes {
  masterGain: GainNode
  stop: () => void
}

let ambientNodes: AmbientNodes | null = null

/**
 * Playful cosmic ambient soundscape:
 *  - Warm floating chord pad (C major, mid-range, slow tremolo)
 *  - Airy high-pass sparkle noise (very faint, like stardust)
 *  - Frequent music-box pentatonic twinkles (every 2-5s)
 *  - Occasional long resonant bell pings
 * Fun, whimsical, not ominous. Total output ≈ 0.08 amplitude.
 */
export function startAmbient(muted = false): void {
  if (ambientNodes) return // already running
  const ctx = getCtx()
  if (!ctx) return

  const master = ctx.createGain()
  master.gain.setValueAtTime(0, ctx.currentTime)
  if (!muted) {
    master.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 3) // fade in over 3s
  }
  master.connect(ctx.destination)

  const stopFns: (() => void)[] = []

  // 1. Warm floating chord pad — C major (C4, E4, G4, C5) with slow tremolo
  const chordNotes = [
    { freq: 261.63, gVal: 0.28 },  // C4
    { freq: 329.63, gVal: 0.20 },  // E4
    { freq: 392.00, gVal: 0.16 },  // G4
    { freq: 523.25, gVal: 0.12 },  // C5
  ]
  chordNotes.forEach(({ freq, gVal }, i) => {
    // Two slightly detuned oscillators per note for warmth
    ;[-3, 3].forEach((detuneCents) => {
      const osc = ctx.createOscillator()
      const oscGain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.detune.value = detuneCents
      oscGain.gain.value = gVal * 0.5

      // Gentle tremolo LFO per note
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.type = 'sine'
      lfo.frequency.value = 0.18 + i * 0.04
      lfoGain.gain.value = gVal * 0.1
      lfo.connect(lfoGain)
      lfoGain.connect(oscGain.gain)

      osc.connect(oscGain)
      oscGain.connect(master)
      osc.start()
      lfo.start()
      stopFns.push(() => { try { osc.stop(); lfo.stop() } catch { /* already stopped */ } })
    })
  })

  // 2. Airy sparkle noise — high-pass filtered, sounds like stardust
  const noiseBufferSize = ctx.sampleRate * 4
  const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < noiseBufferSize; i++) noiseData[i] = Math.random() * 2 - 1
  const noiseSrc = ctx.createBufferSource()
  noiseSrc.buffer = noiseBuffer
  noiseSrc.loop = true
  const noiseHp = ctx.createBiquadFilter()
  noiseHp.type = 'highpass'
  noiseHp.frequency.value = 5000
  const noiseGain = ctx.createGain()
  noiseGain.gain.value = 0.05
  noiseSrc.connect(noiseHp)
  noiseHp.connect(noiseGain)
  noiseGain.connect(master)
  noiseSrc.start()
  stopFns.push(() => { try { noiseSrc.stop() } catch { /* already stopped */ } })

  // 3. Playful music-box twinkles — pentatonic notes, quick attack, bell-like decay
  // C5 D5 E5 G5 A5 C6 D6 E6 G6 A6
  const pentatonic = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1567.98, 1760]
  const ambCtx = ctx
  let twinkleTimer: ReturnType<typeof setTimeout>
  let pingTimer: ReturnType<typeof setTimeout>

  function playTwinkle() {
    if (!ambientNodes) return
    const now = ambCtx.currentTime
    const noteCount = Math.floor(Math.random() * 3) + 1  // 1–3 notes
    const startIdx = Math.floor(Math.random() * (pentatonic.length - noteCount - 1))
    const ascending = Math.random() > 0.4

    for (let n = 0; n < noteCount; n++) {
      const idx = ascending ? startIdx + n : startIdx + noteCount - 1 - n
      const freq = pentatonic[idx]
      const t = now + n * 0.11 + Math.random() * 0.04

      // Fundamental
      const osc = ambCtx.createOscillator()
      const g = ambCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.13, t + 0.018)
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
      osc.connect(g); g.connect(master)
      osc.start(t); osc.stop(t + 1.6)

      // Bright overtone (×2) for music-box sparkle
      const osc2 = ambCtx.createOscillator()
      const g2 = ambCtx.createGain()
      osc2.type = 'sine'
      osc2.frequency.value = freq * 2
      g2.gain.setValueAtTime(0, t)
      g2.gain.linearRampToValueAtTime(0.05, t + 0.015)
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
      osc2.connect(g2); g2.connect(master)
      osc2.start(t); osc2.stop(t + 0.7)
    }

    const nextDelay = 1600 + Math.random() * 3200  // every 1.6–4.8s
    twinkleTimer = setTimeout(playTwinkle, nextDelay)
  }

  // 4. Occasional resonant bell ping — single low pentatonic note, long ring
  function schedulePing() {
    if (!ambientNodes) return
    const now = ambCtx.currentTime
    const freq = pentatonic[Math.floor(Math.random() * 5)]  // lower half
    const osc = ambCtx.createOscillator()
    const g = ambCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(0.07, now + 0.025)
    g.gain.exponentialRampToValueAtTime(0.001, now + 4.5)
    osc.connect(g); g.connect(master)
    osc.start(now); osc.stop(now + 5)
    pingTimer = setTimeout(schedulePing, 5000 + Math.random() * 9000)
  }

  setTimeout(() => playTwinkle(), 1500)
  setTimeout(() => schedulePing(), 3500)

  ambientNodes = {
    masterGain: master,
    stop: () => {
      clearTimeout(twinkleTimer)
      clearTimeout(pingTimer)
      stopFns.forEach(fn => { try { fn() } catch { /* already stopped */ } })
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 2)
      setTimeout(() => { try { master.disconnect() } catch { /* already stopped */ } }, 2200)
      ambientNodes = null
    },
  }
}

export function stopAmbient(): void {
  ambientNodes?.stop()
}

export function setAmbientMuted(muted: boolean): void {
  if (!ambientNodes) return
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime
  ambientNodes.masterGain.gain.cancelScheduledValues(now)
  ambientNodes.masterGain.gain.setValueAtTime(ambientNodes.masterGain.gain.value, now)
  ambientNodes.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.08, now + 0.8)
}

export function isAmbientRunning(): boolean {
  return ambientNodes !== null
}

/** Whoosh + paper rustle — played when a letter is released */
export function playLetterSend(): void {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime

  const bufferSize = Math.floor(ctx.sampleRate * 1.4)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.5)
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(600, now)
  filter.frequency.exponentialRampToValueAtTime(2800, now + 0.35)
  filter.Q.value = 0.7

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.45, now + 0.06)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start(now)
  source.stop(now + 1.4)
}

/** Two-tone bell chime — played on arriving notifications */
export function playChime(): void {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime

  const freqs = [523.25, 783.99] // C5, G5
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = now + i * 0.18
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.25, t + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.2)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 2.2)
  })
}

/** Soft percussive click — for subtle UI feedback */
export function playClick(): void {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1000, now)
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.06)
  gain.gain.setValueAtTime(0.2, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.06)
}

/** Sparkle arpeggio — played when a shooting star is caught */
export function playShootingStarCatch(): void {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime

  // Ascending shimmer: C6 E6 G6 B6 C7
  const freqs = [1046.5, 1318.5, 1568, 1975.5, 2093]
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = now + i * 0.07
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.18, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.7)
  })

  // Soft shimmer noise burst underneath
  const bufferSize = Math.floor(ctx.sampleRate * 0.3)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5)
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'highpass'
  noiseFilter.frequency.value = 4000
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.06, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(now)
}

/** Soft quill-scratch tick — played while typing a letter (throttle externally) */
export function playTypingSound(): void {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime

  // Very short bandpass noise burst — like a quill scratch on parchment
  const bufSize = Math.floor(ctx.sampleRate * 0.045)
  const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2)
  }
  const src = ctx.createBufferSource()
  src.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1200 + Math.random() * 400
  filter.Q.value = 1.4

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.038, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

  src.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  src.start(now)
}

/** Wax seal ceremony — sizzle drip then a firm thud stamp */
export function playWaxSeal(): void {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime

  // Phase 1: hot wax sizzle (0 – 0.7s) — filtered noise
  const sizzleSize = Math.floor(ctx.sampleRate * 0.7)
  const sizzleBuf = ctx.createBuffer(1, sizzleSize, ctx.sampleRate)
  const sizzleData = sizzleBuf.getChannelData(0)
  for (let i = 0; i < sizzleSize; i++) {
    sizzleData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / sizzleSize, 0.4)
  }
  const sizzle = ctx.createBufferSource()
  sizzle.buffer = sizzleBuf
  const sizzleFilt = ctx.createBiquadFilter()
  sizzleFilt.type = 'bandpass'
  sizzleFilt.frequency.setValueAtTime(2200, now)
  sizzleFilt.frequency.exponentialRampToValueAtTime(700, now + 0.7)
  sizzleFilt.Q.value = 0.5
  const sizzleGain = ctx.createGain()
  sizzleGain.gain.setValueAtTime(0, now)
  sizzleGain.gain.linearRampToValueAtTime(0.28, now + 0.06)
  sizzleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7)
  sizzle.connect(sizzleFilt)
  sizzleFilt.connect(sizzleGain)
  sizzleGain.connect(ctx.destination)
  sizzle.start(now)
  sizzle.stop(now + 0.7)

  // Phase 2: stamp thud (0.55s) — low sine thump
  const thumpT = now + 0.55
  const thump = ctx.createOscillator()
  const thumpGain = ctx.createGain()
  thump.type = 'sine'
  thump.frequency.setValueAtTime(80, thumpT)
  thump.frequency.exponentialRampToValueAtTime(28, thumpT + 0.18)
  thumpGain.gain.setValueAtTime(0, thumpT)
  thumpGain.gain.linearRampToValueAtTime(0.55, thumpT + 0.012)
  thumpGain.gain.exponentialRampToValueAtTime(0.001, thumpT + 0.28)
  thump.connect(thumpGain)
  thumpGain.connect(ctx.destination)
  thump.start(thumpT)
  thump.stop(thumpT + 0.3)

  // Phase 3: short high crack on stamp impact
  const crackSize = Math.floor(ctx.sampleRate * 0.08)
  const crackBuf = ctx.createBuffer(1, crackSize, ctx.sampleRate)
  const crackData = crackBuf.getChannelData(0)
  for (let i = 0; i < crackSize; i++) {
    crackData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crackSize, 3)
  }
  const crack = ctx.createBufferSource()
  crack.buffer = crackBuf
  const crackFilt = ctx.createBiquadFilter()
  crackFilt.type = 'highpass'
  crackFilt.frequency.value = 3500
  const crackGain = ctx.createGain()
  crackGain.gain.setValueAtTime(0, thumpT)
  crackGain.gain.linearRampToValueAtTime(0.22, thumpT + 0.008)
  crackGain.gain.exponentialRampToValueAtTime(0.001, thumpT + 0.07)
  crack.connect(crackFilt)
  crackFilt.connect(crackGain)
  crackGain.connect(ctx.destination)
  crack.start(thumpT)
  crack.stop(thumpT + 0.09)
}
