'use client'

export type VoiceEffect = 'raw' | 'anonymous' | 'echo' | 'void'

function addEchoChain(ctx: AudioContext, input: AudioNode) {
  const delay = ctx.createDelay(2.0)
  delay.delayTime.value = 0.38
  const feedback = ctx.createGain()
  feedback.gain.value = 0.36
  const wetGain = ctx.createGain()
  wetGain.gain.value = 0.42
  input.connect(delay)
  delay.connect(feedback)
  feedback.connect(delay)
  feedback.connect(wetGain)
  wetGain.connect(ctx.destination)
}

export async function playAudioWithEffect(
  source: Blob | string,
  effect: VoiceEffect = 'raw',
  onEnded?: () => void,
): Promise<() => void> {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioCtx()
  let arrayBuffer: ArrayBuffer
  if (typeof source === 'string') {
    const res = await fetch(source)
    arrayBuffer = await res.arrayBuffer()
  } else {
    arrayBuffer = await source.arrayBuffer()
  }
  const audioBuf = await ctx.decodeAudioData(arrayBuffer)
  const srcNode = ctx.createBufferSource()
  srcNode.buffer = audioBuf
  srcNode.onended = () => { onEnded?.(); try { ctx.close() } catch {} }

  if (effect === 'anonymous' || effect === 'void') {
    srcNode.playbackRate.value = 0.88
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1600
    filter.Q.value = 0.65
    srcNode.connect(filter)
    filter.connect(ctx.destination)
    if (effect === 'void') addEchoChain(ctx, filter)
  } else if (effect === 'echo') {
    const dry = ctx.createGain()
    dry.gain.value = 0.8
    srcNode.connect(dry)
    dry.connect(ctx.destination)
    addEchoChain(ctx, dry)
  } else {
    srcNode.connect(ctx.destination)
  }

  srcNode.start()
  return () => { try { srcNode.stop(); ctx.close() } catch {} }
}
