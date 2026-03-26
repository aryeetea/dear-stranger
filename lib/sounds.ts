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
 * Start a subtle cosmic ambient soundscape:
 *  - Deep sine drone (~55 Hz) slowly breathing via LFO
 *  - Mid-range filtered noise pad (space wind)
 *  - Soft harmonic overtones
 * All very quiet; total output ≈ 0.08 amplitude.
 */
export function startAmbient(): void {
  if (ambientNodes) return // already running
  const ctx = getCtx()
  if (!ctx) return

  const master = ctx.createGain()
  master.gain.setValueAtTime(0, ctx.currentTime)
  master.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 4) // fade in over 4s
  master.connect(ctx.destination)

  const stopFns: (() => void)[] = []

  // 1. Deep drone — fundamental at 55 Hz + octave at 110 Hz
  const droneFreqs = [55, 110, 165]
  droneFreqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const oscGain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    oscGain.gain.value = 0.35 / (i + 1)

    // Slow breathing LFO on each drone
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.type = 'sine'
    lfo.frequency.value = 0.04 + i * 0.017  // very slow: ~1 cycle per 25s
    lfoGain.gain.value = 0.12
    lfo.connect(lfoGain)
    lfoGain.connect(oscGain.gain)

    osc.connect(oscGain)
    oscGain.connect(master)
    osc.start()
    lfo.start()
    stopFns.push(() => { osc.stop(); lfo.stop() })
  })

  // 2. Space wind — filtered white noise
  ;(function spawnWindNode() {
    const bufferSize = ctx.sampleRate * 4
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true

    const lo = ctx.createBiquadFilter()
    lo.type = 'lowpass'
    lo.frequency.value = 320
    lo.Q.value = 0.5

    const hi = ctx.createBiquadFilter()
    hi.type = 'highpass'
    hi.frequency.value = 60

    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.18

    // Slow LFO on wind volume for breathing texture
    const windLfo = ctx.createOscillator()
    const windLfoGain = ctx.createGain()
    windLfo.type = 'sine'
    windLfo.frequency.value = 0.06
    windLfoGain.gain.value = 0.08
    windLfo.connect(windLfoGain)
    windLfoGain.connect(noiseGain.gain)

    noise.connect(lo)
    lo.connect(hi)
    hi.connect(noiseGain)
    noiseGain.connect(master)
    noise.start()
    windLfo.start()
    stopFns.push(() => { noise.stop(); windLfo.stop() })
  })()

  // 3. Occasional distant shimmer — very faint high harmonic pulses
  const shimCtx = ctx  // non-null within this closure
  let shimmerTimer: ReturnType<typeof setTimeout>
  function scheduleShimmer() {
    const delay = 6000 + Math.random() * 12000 // every 6-18s
    shimmerTimer = setTimeout(() => {
      if (!ambientNodes) return
      const freq = [880, 1046, 1318, 1568][Math.floor(Math.random() * 4)]
      const osc = shimCtx.createOscillator()
      const g = shimCtx.createGain()
      const now = shimCtx.currentTime
      osc.type = 'sine'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, now)
      g.gain.linearRampToValueAtTime(0.04, now + 0.8)
      g.gain.exponentialRampToValueAtTime(0.001, now + 4)
      osc.connect(g)
      g.connect(master)
      osc.start(now)
      osc.stop(now + 4)
      scheduleShimmer()
    }, delay)
  }
  scheduleShimmer()

  ambientNodes = {
    masterGain: master,
    stop: () => {
      clearTimeout(shimmerTimer)
      stopFns.forEach(fn => { try { fn() } catch { /* already stopped */ } })
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 2)
      setTimeout(() => { master.disconnect() }, 2200)
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
