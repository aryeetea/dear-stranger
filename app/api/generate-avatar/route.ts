import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

// --- THE "STYLIZED 3D" CONFIGURATION ---
// These constants are designed to stop the AI from making real "photos" 
// and instead focus on that clean, glowy, game-character look.
const BASE_RENDER =
  'High-end stylized 3D digital art — NOT a real person, NOT a photo. ' +
  'Style: Clean 3D character design with smooth, porcelain-like skin and sculpted features. ' +
  'Texture: Hand-painted textures, vibrant colors, and soft-focus backgrounds. ' +
  'Lighting: Dreamy volumetric lighting, glowing rim highlights, and soft-box studio shadows. ' +
  'Think high-budget 3D animated cinematic (Arcane/League of Legends style) — polished, smooth, and artistic.'

const RENDERING_INSTRUCTION =
  'Composition: Full body visible head to toe, vertical portrait orientation. ' +
  'Background: A rich, atmospheric environment with a soft bokeh effect. ' +
  'IMPORTANT: Depict exactly ONE single character. No text, no watermarks, no skin pores, no grainy textures, no realistic wrinkles.'

const STYLE_DESCRIPTORS: Record<string, string> = {
  fantasy: 'Fantasy theme: Magical glowing environment, ethereal aura, otherworldly elements.',
  modern: 'Modern theme: Stylish contemporary setting, clean urban backdrop, soft studio lighting.',
  celestial: 'Celestial theme: Cosmic moonlit atmosphere, radiant starfield, glowing divine energy.',
  futuristic: 'Futuristic theme: Sleek sci-fi tech, neon accents, holographic glow.',
  nature: 'Nature-inspired theme: Enchanted forest, soft golden-hour sunlight through leaves.',
}

function normalizeDetail(value: string) {
  return value.replace(/\s+/g, ' ').replace(/^[,.;:\s]+|[,.;:\s]+$/g, '').trim()
}

function buildAvatarPrompt(answers: string[], styleKey?: string) {
  const details = answers.map((a) => normalizeDetail(a)).filter(Boolean).join(', ')
  const styleTheme = STYLE_DESCRIPTORS[styleKey?.toLowerCase() || 'fantasy']

  return [
    `Stylized 3D character portrait of: ${details || 'a mysterious figure'}.`,
    BASE_RENDER,
    styleTheme,
    RENDERING_INSTRUCTION,
  ].join('\n\n')
}

export async function POST(req: Request) {
  try {
    // 1. Auth & Validation
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { answers, style, userId } = body

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 })

    const openai = new OpenAI({ apiKey: openaiKey })

    // 2. Parse User Input
    const orderedAnswers = Object.entries(answers || {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, val]) => String(val))

    if (orderedAnswers.length === 0) {
      return NextResponse.json({ error: 'No descriptions provided.' }, { status: 400 })
    }

    // 3. Construct the "Stylized" Prompt
    const finalPrompt = buildAvatarPrompt(orderedAnswers, style)

    // 4. Generate Image (DALL-E 3)
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: finalPrompt,
      size: '1024x1792', // Keeps the full-body portrait aspect ratio
      quality: 'hd',
      response_format: 'b64_json',
      user: userId,
    })

    const image = response.data?.[0]
    return NextResponse.json({
      imageUrl: `data:image/png;base64,${image?.b64_json}`,
      revisedPrompt: image?.revised_prompt,
    })

  } catch (error: any) {
    console.error('Generation Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate.' }, { status: 500 })
  }
}