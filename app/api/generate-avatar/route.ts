import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

// --- THE "STYLIZED 3D" CONFIGURATION ---
// These constants are designed to stop the AI from making real "photos" 
// and instead focus on that clean, glowy, game-character look.
const BASE_RENDER =
  'High-end stylized 3D digital art — NOT a real person, NOT a photo. ' +
  'Style: Clean 3D character design with smooth, sculpted features. ' +
  'CRITICAL SKIN RULE: Render the character\'s skin tone EXACTLY as described by the user — do not lighten, alter, or approximate any described skin color. ' +
  'If no skin color is described, default to a warm neutral tone. ' +
  'Texture: Hand-painted textures, vibrant colors, and a clear illustrated environment. ' +
  'Lighting: Cinematic natural lighting that fits the scene, with controlled rim light only when appropriate. ' +
  'Think high-budget 3D animated cinematic (Arcane/League of Legends style) — polished, smooth, and artistic.'

const RENDERING_INSTRUCTION =
  'COMPOSITION: The image MUST be a vertical portrait (taller than wide). Full body visible head to toe. ' +
  'The character must be upright, facing the viewer or turned naturally, and fills most of the frame. NEVER rotate the character sideways or upside down. ' +
  'NEVER produce a landscape, square composition, split layout, design board, character sheet, reference sheet, UI mockup, collage, labels, side notes, color swatches, or multiple panels. ' +
  'BACKGROUND: Generate a complete, meaningful background environment that matches the character description, clothing, mood, and chosen style. ' +
  'The background should feel like the character belongs there: include setting details such as architecture, nature, room design, weather, era, objects, landscape, or cosmic elements only when they fit the user description. ' +
  'Avoid generic shiny blobs, random glitter, abstract bokeh dots, lens flare clutter, empty gradients, and unrelated glowing particles. ' +
  'COMPANIONS: If the user mentions a pet, animal, or creature companion, include it alongside the character — ' +
  'this applies especially to otherworldly themes (e.g. a spirit fox, cosmic dragon, shadow cat, magical beast). ' +
  'IMPORTANT: No text, no labels, no UI, no watermarks, no skin pores, no grainy textures, no realistic wrinkles.'

const STYLE_DESCRIPTORS: Record<string, string> = {
  fantasy: 'Fantasy theme: Magical glowing environment, ethereal aura, otherworldly elements.',
  modern: 'Modern theme: Stylish contemporary setting, clean urban backdrop, soft studio lighting.',
  'fantasy-modern': 'Fantasy-modern theme: Contemporary fashion and silhouettes blended with magical materials, subtle enchantment, and a grounded cinematic setting.',
  celestial: 'Celestial theme: Cosmic moonlit atmosphere, radiant starfield, glowing divine energy.',
  royal: 'Royal theme: Elegant palace, throne room, garden court, ceremonial hall, or noble fantasy setting with refined regal styling.',
  streetwear: 'Streetwear theme: Bold contemporary street-fashion portrait in a vivid urban environment that matches the outfit and attitude.',
  futuristic: 'Futuristic theme: Sleek sci-fi tech, neon accents, holographic glow.',
  nature: 'Nature-inspired theme: Enchanted forest, soft golden-hour sunlight through leaves.',
}

function normalizeStyleKey(styleKey?: string) {
  return normalizeDetail(styleKey || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s+/g, '-')
}

function buildIdentityInstruction(details: string) {
  const lower = details.toLowerCase()
  const feminineTerms = /\b(princess|queen|duchess|empress|goddess|girl|woman|lady|female|feminine|she\/her|she|her)\b/
  const masculineTerms = /\b(prince|king|duke|emperor|god\b|boy|man|male|masculine|he\/him|he|him)\b/
  const nonbinaryTerms = /\b(nonbinary|non-binary|genderfluid|androgynous|they\/them|they|them)\b/

  if (feminineTerms.test(lower) && !masculineTerms.test(lower)) {
    return 'IDENTITY PRESERVATION: The user describes themself with feminine terms. Render a feminine/female-presenting character. If the user says "princess", this MUST be a princess, not a prince, king, man, or boy.'
  }
  if (masculineTerms.test(lower) && !feminineTerms.test(lower)) {
    return 'IDENTITY PRESERVATION: The user describes themself with masculine terms. Render a masculine/male-presenting character. Do not change the character into a woman or princess.'
  }
  if (nonbinaryTerms.test(lower)) {
    return 'IDENTITY PRESERVATION: The user describes a nonbinary, genderfluid, or androgynous identity. Preserve that presentation and do not force the character into a strictly male or female look.'
  }
  return 'IDENTITY PRESERVATION: Preserve any gender, age, role, body, culture, and identity words the user provides exactly. Do not swap roles such as princess to prince, queen to king, woman to man, or girl to boy.'
}

function normalizeDetail(value: string) {
  return value.replace(/\s+/g, ' ').replace(/^[,.;:\s]+|[,.;:\s]+$/g, '').trim()
}

function buildAvatarPrompt(answers: string[], styleKey?: string) {
  const details = answers.map((a) => normalizeDetail(a)).filter(Boolean).join(', ')
  const normalizedStyle = normalizeStyleKey(styleKey)
  const customStyle = normalizeDetail(styleKey || '')
  const styleTheme = STYLE_DESCRIPTORS[normalizedStyle] ||
    (customStyle
      ? `Custom style chosen by the user: ${customStyle}. Use this style to shape the character design, clothing, lighting, and background environment.`
      : STYLE_DESCRIPTORS.fantasy)
  const identityInstruction = buildIdentityInstruction(details)

  return [
    `PORTRAIT — Stylized 3D character portrait of: ${details || 'a mysterious figure'}.`,
    `Create both the character and their matching world/background from these details: ${details || 'a mysterious figure in a fitting atmospheric setting'}.`,
    identityInstruction,
    BASE_RENDER,
    styleTheme,
    RENDERING_INSTRUCTION,
    'FINAL REMINDER: Output must be one upright full-body character in one coherent vertical portrait. No sideways rotation, no labels, no reference sheet, no color palette, no text. The background must be specific, coherent, and relevant to the avatar, not random shiny decoration.',
  ].join('\n\n')
}

export async function POST(req: Request) {
  try {
    // 1. Auth & Validation
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json() as { answers?: Record<string, unknown>; style?: string; userId?: string }
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

  } catch (error: unknown) {
    console.error('Generation Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate.' }, { status: 500 })
  }
}
