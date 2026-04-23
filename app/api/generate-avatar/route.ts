import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

// ---------------------------------------------------------------------------
// STYLE DESCRIPTORS — background/mood only, never override clothing or hair
// ---------------------------------------------------------------------------
const STYLE_DESCRIPTORS: Record<string, string> = {
  realistic:
    'Background mood: natural lighting, believable environment, grounded atmosphere, subtle depth.',
  '3d-digital':
    'Background mood: cinematic digital environment, sculpted lighting, vivid depth, polished fantasy-game ambience.',
  fantasy:
    'Background mood: magical glowing environment, ethereal aura, soft mist, otherworldly light.',
  modern:
    'Background mood: stylish contemporary setting, clean urban backdrop, soft ambient light.',
  'fantasy-modern':
    'Background mood: grounded cinematic setting with subtle magical ambience — city streets with faint enchanted glow.',
  celestial:
    'Background mood: cosmic moonlit atmosphere, radiant starfield, divine energy in the sky.',
  royal:
    'Background mood: elegant palace corridor, throne room, or noble garden with refined architectural details.',
  streetwear:
    'Background mood: vivid urban street environment, bold graffiti walls, dynamic city energy.',
  futuristic:
    'Background mood: sleek sci-fi city, neon-lit streets, holographic signage.',
  nature:
    'Background mood: enchanted forest, golden-hour sunlight filtering through ancient trees.',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normalizeDetail(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/^[,.;:\s]+|[,.;:\s]+$/g, '').trim()
}

function normalizeStyleKey(styleKey?: string): string {
  return normalizeDetail(styleKey || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s+/g, '-')
}

function buildIdentityInstruction(details: string): string {
  const lower = details.toLowerCase()
  const feminineTerms =
    /\b(princess|queen|duchess|empress|goddess|girl|woman|lady|female|feminine|she\/her|she|her)\b/
  const masculineTerms =
    /\b(prince|king|duke|emperor|god\b|boy|man|male|masculine|he\/him|he|him)\b/
  const nonbinaryTerms =
    /\b(nonbinary|non-binary|genderfluid|androgynous|they\/them|they|them)\b/

  if (feminineTerms.test(lower) && !masculineTerms.test(lower)) {
    return 'GENDER: Render a feminine/female-presenting character. Never change to male, boy, prince, or king.'
  }
  if (masculineTerms.test(lower) && !feminineTerms.test(lower)) {
    return 'GENDER: Render a masculine/male-presenting character. Never change to female, woman, or princess.'
  }
  if (nonbinaryTerms.test(lower)) {
    return 'GENDER: Render as nonbinary/androgynous. Do not force a strictly male or female look.'
  }
  return 'GENDER: Preserve the gender, role, and identity words the user provided. Never swap roles (e.g. princess → prince).'
}

function buildArtStyleInstruction(styleKey?: string) {
  const normalizedStyle = normalizeStyleKey(styleKey)
  const rawStyle = normalizeDetail(styleKey || '').toLowerCase()

  if (
    normalizedStyle === 'realistic' ||
    /\b(realistic|photoreal|photorealistic|lifelike|naturalistic)\b/.test(rawStyle)
  ) {
    return `
ART STYLE:
High-end realistic digital portrait art. Natural human proportions, believable lighting, grounded textures, lifelike rendering.
Not cartoon, not anime, not exaggerated 3D stylization, not doll-like.
No watermarks, no text, no labels.
`.trim()
  }

  if (
    normalizedStyle === '3d-digital' ||
    /\b(3d|three[- ]d|stylized|cinematic|game art|digital art|arcane)\b/.test(rawStyle)
  ) {
    return `
ART STYLE:
High-end stylized 3D digital art. Cinematic game-art quality, smooth sculpted features, hand-painted textures, vibrant colors, dramatic lighting.
Not a photograph, not photorealistic, no skin pores, no grain.
No watermarks, no text, no labels.
`.trim()
  }

  return `
ART STYLE:
Match the visual medium the user requested. If they asked for realism, render it realistically. If they asked for stylized 3D digital art, render it as stylized 3D.
If the user did not specify, use polished digital portrait art with clear, intentional lighting.
No watermarks, no text, no labels.
`.trim()
}

// ---------------------------------------------------------------------------
// Prompt builder — user description is ALWAYS first and most specific
// ---------------------------------------------------------------------------
function buildAvatarPrompt(answers: string[], styleKey?: string): string {
  const details = answers.map((a) => normalizeDetail(a)).filter(Boolean).join(', ')
  const identityInstruction = buildIdentityInstruction(details)
  const normalizedStyle = normalizeStyleKey(styleKey)
  const customStyle = normalizeDetail(styleKey || '')
  const backgroundMood =
    STYLE_DESCRIPTORS[normalizedStyle] ||
    (customStyle
      ? `Background mood: ${customStyle} — use this only to shape the background environment and lighting.`
      : STYLE_DESCRIPTORS.fantasy)

  return `
SUBJECT — render this character EXACTLY as described:
${details || 'a mysterious figure'}

${identityInstruction}

CLOTHING & HAIR — CRITICAL:
Render every clothing item, hairstyle, hair color, and accessory EXACTLY as the user described them.
Do not substitute, reimagine, upgrade, or replace any described item with a thematic alternative.
Do not let the chosen background style or mood override what the user is wearing or how their hair looks.
Preserve every specific detail — fabric, fit, color, cut, and style — precisely as described.

SKIN TONE — CRITICAL:
Render the character's skin tone EXACTLY as described. Never lighten, darken, or approximate it.
If no skin tone is described, use a warm neutral tone. Do not let the background style or mood influence the skin tone — it must remain true to the user's description.

${buildArtStyleInstruction(styleKey)}

COMPOSITION:
Vertical portrait (taller than wide). Full body visible from head to toe. Character upright, facing viewer.
Never rotate sideways. Never produce a landscape, reference sheet, collage, or split layout.

BACKGROUND:
${backgroundMood}
The background must be coherent, specific, and match the character's vibe.
No random glitter, abstract bokeh, empty gradients, or unrelated particles.

COMPANIONS:
If the user mentioned a pet, animal, or creature companion, include it beside the character.

FINAL CHECK:
One upright full-body character. Exact clothing and hair as described. No text, no labels, no UI chrome.
`.trim()
}

// ---------------------------------------------------------------------------
// Validate and sanitize answers to prevent prompt injection and oversized input
// ---------------------------------------------------------------------------
function sanitizeAnswers(raw: Record<string, unknown>): string[] {
  return Object.entries(raw)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, val]) => String(val).slice(0, 300)) // cap each answer at 300 chars
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    // 1. Auth
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse & validate body
    const body = (await req.json()) as {
      answers?: Record<string, unknown>
      style?: string
    }

    const { answers, style } = body

    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return NextResponse.json({ error: 'Invalid answers payload.' }, { status: 400 })
    }

    const orderedAnswers = sanitizeAnswers(answers)

    if (orderedAnswers.length === 0) {
      return NextResponse.json({ error: 'No descriptions provided.' }, { status: 400 })
    }

    // Sanitize style input
    const sanitizedStyle = typeof style === 'string' ? style.slice(0, 100) : undefined

    // 3. Build prompt
    const finalPrompt = buildAvatarPrompt(orderedAnswers, sanitizedStyle)

    // 4. Generate image
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 })

    const openai = new OpenAI({ apiKey: openaiKey })

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: finalPrompt,
      size: '1024x1792',
      quality: 'hd',
      response_format: 'b64_json',
      user: user.id, // ✅ use verified server-side user ID, never trust client
    })

    const image = response.data?.[0]

    // 5. Guard against empty response
    if (!image?.b64_json) {
      return NextResponse.json({ error: 'Image generation returned no data.' }, { status: 502 })
    }

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${image.b64_json}`,
      revisedPrompt: image.revised_prompt,
    })
  } catch (error: unknown) {
    console.error('Generation Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate.' },
      { status: 500 },
    )
  }
}
