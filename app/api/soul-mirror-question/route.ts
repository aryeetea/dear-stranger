import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

function normalizeDetail(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[,.;:\s]+|[,.;:\s]+$/g, '')
    .trim()
}

const BASE_RENDER_STYLE = `
Highly stylized fantasy digital illustration.
Game concept art quality. Rich painterly detail with dramatic cinematic lighting.
Expressive, otherworldly character design with elaborate costume and magical effects.
Detailed face with fantasy features: glowing or luminous eyes, sharp elven or arcane aesthetics.
Intricate armor, robes, or fantasy clothing with jeweled and arcane detailing.
Dynamic pose with flowing fabric, hair, and magical energy trails.
Atmospheric background with environmental storytelling: castles, ruins, dragons, crystals, cosmic sky.
Swirling particle effects, arcane light trails, glowing magical orbs or weapons.
Deep rich color palette: midnight blues, indigos, gold accents, glowing teals and purples.
Dramatic volumetric lighting, god rays, rim lighting, and magical glow sources.

Hard rules:
- not photorealistic
- not plain portrait
- not minimal background
- not flat illustration
- not 3D render
- not childish or cute chibi
- not grounded or mundane setting
- backgrounds must be rich and atmospheric, never plain or blurred out
- always include magical effects, energy, or fantastical atmosphere
- character must feel legendary, powerful, and otherworldly

Keep the same high-fantasy rendering quality and artistic intensity across all avatars.
`.trim()

const STYLE_DIRECTIONS: Record<string, string> = {
  fantasy: `
Dark high fantasy sorceress or warrior aesthetic.
Otherworldly skin tone options (deep violet, midnight blue, obsidian, silver).
Elaborate fantasy armor or arcane robes with gold and gemstone detailing.
Glowing arcane staff, sword, or magical weapon.
Crescent moon, dragon silhouette, enchanted castle in atmospheric background.
Blue arcane crystal formations at ground level.
Swirling magical energy and particle trails surrounding the character.
Starfield or cosmic night sky with dramatic cloud formations.
`.trim(),

  modern: `
Stylized urban fantasy aesthetic: contemporary fashion merged with subtle magical elements.
Glowing tattoos, enchanted accessories, neon-lit city or mystical urban backdrop.
Sharp editorial lighting with magical color grading.
Supernatural calm and power in expression and pose.
`.trim(),

  'fantasy-modern': `
Fusion of street style and arcane power.
Modern silhouette with fantasy armor pieces, glowing runes, or enchanted accessories.
Dramatic city skyline at dusk merged with fantasy atmospheric elements.
Magical energy woven through contemporary outfit details.
`.trim(),

  celestial: `
Cosmic deity or star-born sorceress aesthetic.
Skin that shimmers with starlight or galaxy patterns.
Crown or headdress of constellation points or lunar crescents.
Flowing robes made of solidified starlight and cosmic energy.
Background of nebulae, star clusters, celestial bodies, and divine light columns.
Radiant silver, indigo, and gold magical auras.
`.trim(),

  royal: `
Dark fantasy queen or emperor aesthetic.
Towering dramatic crown with gemstones and arcane runes.
Sweeping royal robes with intricate embroidery and supernatural shimmer.
Throne room, fortress, or war-torn kingdom in background.
Commanding regal pose radiating immense power.
Deep crimson, midnight gold, and obsidian color palette.
`.trim(),

  streetwear: `
Urban arcane warrior aesthetic.
High-end streetwear layered with glowing magical armor pieces and enchanted accessories.
Graffiti murals with living runes in the background.
Energy aura in neon colors surrounding the character.
Confident and powerful street-level pose with supernatural presence.
`.trim(),

  futuristic: `
Sci-fi mage or cyberpunk sorcerer aesthetic.
Sleek bioluminescent bodysuit fused with holographic arcane patterns.
Glowing implants, energy conduits, or futuristic staff/weapon.
Megacity ruins or space station interior as atmospheric backdrop.
Electric blue, violet, and chrome color palette with neon magical effects.
`.trim(),

  nature: `
Ancient forest guardian or druid queen aesthetic.
Armor crafted from living wood, stone, and blooming flora.
Bioluminescent plants, glowing spirit creatures, and ancient tree spirits in background.
Warm earth tones layered with magical bioluminescent greens and golds.
Vines, roots, and petals swirling with magical wind energy.
`.trim(),
}

function getThemeDirection(style?: string) {
  const styleKey = (style || '').toLowerCase().replace(/\s+/g, '-')
  if (STYLE_DIRECTIONS[styleKey]) {
    return `Suggested style: ${STYLE_DIRECTIONS[styleKey]}\n\nNote: This style is a suggestion only. Please allow for full creative freedom and do not treat these directions as restrictions.`
  }
  return `${normalizeDetail(style || 'Dark high fantasy cinematic styling')}. Otherworldly, dramatic, atmospheric, and visually spectacular.\n\nNote: The style is a suggestion only—feel free to interpret creatively.`
}

function buildAvatarPrompt(
  answers: string[],
  style?: string,
  feedback?: string,
  mode: 'create' | 'reimagine' = 'create',
) {
  const trimmedAnswers = answers
    .map((a) => normalizeDetail(a))
    .filter(Boolean)
    .slice(0, 8)

  const details = trimmedAnswers
    .map((a, i) => `${i + 1}. ${a}`)
    .join('\n')

  // If style is 'none' or 'skip', skip style suggestion
  let themeDirection = ''
  if (style && style.toLowerCase() !== 'none' && style.toLowerCase() !== 'skip') {
    themeDirection = getThemeDirection(style)
  } else {
    themeDirection = 'No specific style or theme is required. Please use your full creative freedom.'
  }

  const modeDirection =
    mode === 'reimagine'
      ? `
This is a reimagined version of an existing avatar.
Keep the same core person and identity recognizable.
Clearly apply the requested changes.
Do not return a near duplicate.
Change outfit details, pose, lighting, composition, accessories, magical effects, or atmosphere so the edit is visibly dramatic and noticeable.
`
      : `
Create this avatar from scratch with maximum visual impact and fantasy world-building.
`

  const feedbackLine = feedback?.trim()
    ? `Required visible changes: ${normalizeDetail(feedback)}.`
    : ''

  return [
    `Create a single full body character portrait in the style of premium high fantasy digital game art.`,
    `Base render style: ${BASE_RENDER_STYLE}`,
    `Theme direction: ${themeDirection}`,
    `Important: Styles and directions are suggestions only—please allow for full creative freedom and do not treat any style or theme as a restriction. The goal is to inspire, not to limit. If you do not want to choose a style, you may skip this part and the model will have full creative freedom.`,
    `Your answers must be as detailed and descriptive as possible. The more detail you provide, the better and more personalized the result will be.`,
    modeDirection,
    `The character must be fully visible from head to toe with a powerful, dynamic silhouette.`,
    `Use a vertical portrait composition. Explosive dramatic lighting. Swirling magical particle effects. Rich layered background with environmental detail. Cinematic game art quality.`,
    `Do not add text, watermarks, or logos.`,
    details ? `Character details based on their self-description:\n${details}` : '',
    feedbackLine,
  ]
    .filter(Boolean)
    .join('\n\n')
}

async function generateWithGptImage(
  openai: OpenAI,
  prompt: string,
  userId?: string,
) {
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1024x1536',
    quality: 'low',
    output_format: 'jpeg',
    user: userId || undefined,
  } as any)

  const image = response.data?.[0]
  if (!image?.b64_json) throw new Error('gpt-image-1 returned no image data.')

  return {
    imageUrl: `data:image/jpeg;base64,${image.b64_json}`,
    revisedPrompt: (image as any).revised_prompt || prompt,
  }
}

async function generateWithShortApiKey(
  prompt: string,
  userId?: string,
) {
  const shortApiKey = process.env.SHORTAPI_KEY
  if (!shortApiKey) throw new Error('Missing SHORTAPI_KEY')
  const openai = new OpenAI({ apiKey: shortApiKey })
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1024x1536',
    quality: 'low',
    output_format: 'jpeg',
    user: userId || undefined,
  })
  const image = response.data?.[0]
  if (!image?.b64_json) throw new Error('gpt-image-1 (fallback) returned no image data.')
  return {
    imageUrl: `data:image/jpeg;base64,${image.b64_json}`,
    revisedPrompt: (image as any).revised_prompt || prompt,
  }
}

export async function POST(req: Request) {
  try {
    const { answers, feedback, userId, style, mode } = await req.json()

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const orderedAnswers = Object.entries(answers || {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, answer]) => normalizeDetail(String(answer)))
      .filter(Boolean)

    if (orderedAnswers.length === 0) {
      return NextResponse.json({ error: 'No answers provided.' }, { status: 400 })
    }

    const generationMode: 'create' | 'reimagine' =
      mode === 'reimagine' ? 'reimagine' : 'create'

    const imagePrompt = buildAvatarPrompt(
      orderedAnswers,
      style,
      feedback,
      generationMode,
    )

    const openai = new OpenAI({ apiKey: openaiKey })

    try {
      const result = await generateWithGptImage(openai, imagePrompt, userId)
      return NextResponse.json({
        imageUrl: result.imageUrl,
        prompt: result.revisedPrompt,
      })
    } catch (primaryError) {
      console.warn('gpt-image-1 failed, falling back to SHORTAPI_KEY:', primaryError)
      const fallback = await generateWithShortApiKey(imagePrompt, userId)
      return NextResponse.json({
        imageUrl: fallback.imageUrl,
        prompt: fallback.revisedPrompt,
      })
    }
  } catch (error) {
    console.error('generate-avatar error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate avatar.' },
      { status: 500 },
    )
  }
}