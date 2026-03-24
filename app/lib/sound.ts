'use client'

type UiSound = 'open' | 'close' | 'select' | 'focus' | 'send'

let audioContext: AudioContext | null = null

function getAudioContext() {
  if (typeof window === 'undefined') return null

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextCtor) return null

  if (!audioContext) {
    audioContext = new AudioContextCtor()
  }

  return audioContext
}

function scheduleTone(
  ctx: AudioContext,
  now: number,
  {
    frequency,
    duration,
    volume,
    type = 'sine',
    detune = 0,
  }: {
    frequency: number
    duration: number
    volume: number
    type?: OscillatorType
    detune?: number
  },
) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, now)
  oscillator.detune.setValueAtTime(detune, now)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  oscillator.connect(gain)
  gain.connect(ctx.destination)

  oscillator.start(now)
  oscillator.stop(now + duration + 0.02)
}

export function playUiSound(kind: UiSound) {
  const ctx = getAudioContext()
  if (!ctx) return

  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined)
  }

  const now = ctx.currentTime + 0.01

  switch (kind) {
    case 'open':
      scheduleTone(ctx, now, { frequency: 392, duration: 0.18, volume: 0.022, type: 'sine' })
      scheduleTone(ctx, now + 0.07, { frequency: 523.25, duration: 0.26, volume: 0.016, type: 'triangle' })
      break
    case 'close':
      scheduleTone(ctx, now, { frequency: 440, duration: 0.14, volume: 0.014, type: 'sine' })
      scheduleTone(ctx, now + 0.04, { frequency: 329.63, duration: 0.18, volume: 0.012, type: 'triangle' })
      break
    case 'focus':
      scheduleTone(ctx, now, { frequency: 523.25, duration: 0.16, volume: 0.02, type: 'triangle' })
      scheduleTone(ctx, now + 0.05, { frequency: 659.25, duration: 0.24, volume: 0.014, type: 'sine' })
      break
    case 'send':
      scheduleTone(ctx, now, { frequency: 392, duration: 0.15, volume: 0.018, type: 'sine' })
      scheduleTone(ctx, now + 0.07, { frequency: 587.33, duration: 0.22, volume: 0.016, type: 'triangle' })
      scheduleTone(ctx, now + 0.14, { frequency: 783.99, duration: 0.3, volume: 0.012, type: 'sine' })
      break
    case 'select':
    default:
      scheduleTone(ctx, now, { frequency: 493.88, duration: 0.12, volume: 0.014, type: 'triangle' })
      scheduleTone(ctx, now + 0.03, { frequency: 587.33, duration: 0.16, volume: 0.01, type: 'sine' })
      break
  }
}
