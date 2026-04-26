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
 * Soft ambient bed:
 *  - Low, warm suspended pad
 *  - Very faint air texture
 *  - Rare, delicate shimmer accents
 * Calm and unobtrusive. Total output ≈ 0.02 amplitude.
 */
export function startAmbient(muted = false): void {
  if (ambientNodes) return // already running
  const ctx = getCtx()
  if (!ctx) return

  const master = ctx.createGain()
  master.gain.setValueAtTime(0, ctx.currentTime)
  if (!muted) {
    master.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 3) // fade in over 3s
  }
  master.connect(ctx.destination)

  const stopFns: (() => void)[] = []

  // 1. Warm floating suspended pad — lower register, gentle motion only
  const chordNotes = [
    { freq: 196.0, gVal: 0.2 },   // G3
    { freq: 261.63, gVal: 0.13 }, // C4
    { freq: 293.66, gVal: 0.09 }, // D4
    { freq: 392.0, gVal: 0.05 },  // G4
  ]
  chordNotes.forEach(({ freq, gVal }, i) => {
    ;[-2, 2].forEach((detuneCents) => {
      const osc = ctx.createOscillator()
      const oscGain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.detune.value = detuneCents
      oscGain.gain.value = gVal * 0.5

      // Extra-slow shimmer rather than audible tremolo
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.type = 'sine'
      lfo.frequency.value = 0.06 + i * 0.015
      lfoGain.gain.value = gVal * 0.045
      lfo.connect(lfoGain)
      lfoGain.connect(oscGain.gain)

      osc.connect(oscGain)
      oscGain.connect(master)
      osc.start()
      lfo.start()
      stopFns.push(() => { try { osc.stop(); lfo.stop() } catch { /* already stopped */ } })
    })
  })

  // 2. Very faint air texture
  const noiseBufferSize = ctx.sampleRate * 4
  const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < noiseBufferSize; i++) noiseData[i] = Math.random() * 2 - 1
  const noiseSrc = ctx.createBufferSource()
  noiseSrc.buffer = noiseBuffer
  noiseSrc.loop = true
  const noiseHp = ctx.createBiquadFilter()
  noiseHp.type = 'highpass'
  noiseHp.frequency.value = 6800
  const noiseGain = ctx.createGain()
  noiseGain.gain.value = 0.011
  noiseSrc.connect(noiseHp)
  noiseHp.connect(noiseGain)
  noiseGain.connect(master)
  noiseSrc.start()
  stopFns.push(() => { try { noiseSrc.stop() } catch { /* already stopped */ } })

  // 3. Sparse shimmer accents
  const pentatonic = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99]
  const ambCtx = ctx
  let twinkleTimer: ReturnType<typeof setTimeout>

  function playTwinkle() {
    if (!ambientNodes) return
    const now = ambCtx.currentTime
    const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)]
    const t = now + Math.random() * 0.08

    const osc = ambCtx.createOscillator()
    const g = ambCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.03, t + 0.04)
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.2)
    osc.connect(g); g.connect(master)
    osc.start(t); osc.stop(t + 2.4)

    const osc2 = ambCtx.createOscillator()
    const g2 = ambCtx.createGain()
    osc2.type = 'triangle'
    osc2.frequency.value = freq * 2
    g2.gain.setValueAtTime(0, t)
    g2.gain.linearRampToValueAtTime(0.009, t + 0.03)
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
    osc2.connect(g2); g2.connect(master)
    osc2.start(t); osc2.stop(t + 1)

    const nextDelay = 12000 + Math.random() * 14000  // every 12–26s
    twinkleTimer = setTimeout(playTwinkle, nextDelay)
  }

  setTimeout(() => playTwinkle(), 9000)

  ambientNodes = {
    masterGain: master,
    stop: () => {
      clearTimeout(twinkleTimer)
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
  ambientNodes.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.02, now + 0.8)
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
