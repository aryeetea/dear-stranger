import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 30

const OPENAI_IMAGE_TIMEOUT_MS = 25000

type GenerationMode = 'create' | 'reimagine'

function normalizeDetail(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[,.;:\s]+|[,.;:\s]+$/g, '')
    .trim()
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms = OPENAI_IMAGE_TIMEOUT_MS,
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), ms),
  )
  return Promise.race([promise, timeout])
}

const BASE_STYLE = `
Polished semi realistic character concept art.
Painterly cinematic finish.
Detailed face, skin, hair, and clothing.
Believable anatomy and natural proportions.
Stylized, elegant, and immersive.
Consistent high quality rendering style across all avatars.

Hard rules:
- not cartoon
- not anime
- not chibi
- not photorealistic
- not flat illustration
- not 3D render
- not childish
- not exaggerated caricature
`.trim()

const STYLE_DIRECTIONS: Record<string, string> = {
  fantasy: 'Fantasy inspired clothing, magical details, mythic atmosphere, rich visual storytelling.',
  modern: 'Modern fashion, contemporary clothing, present day styling, grounded but polished atmosphere.',
  streetwear: 'Streetwear inspired outfit design, layered urban fashion, expressive modern styling.',
  futuristic: 'Futuristic clothing, sleek materials, subtle glow accents, sci fi mood.',
  celestial: 'Celestial mood, moonlit glow, cosmic elegance, luminous details.',
  royal: 'Regal styling, luxurious fabrics, elegant structure, noble atmosphere.',
  nature: 'Nature inspired palette, organic textures, floral or earth based motifs, atmospheric softness.',
  gothic: 'Dark elegant styling, moody atmosphere, dramatic textures, refined gothic design.',
  dreamy: 'Dreamlike atmosphere, soft glow, delicate color harmony, ethereal mood.',
  angelic: 'Graceful light, airy fabrics, luminous softness, serene elevated mood.',
  cyber: 'Cyber inspired styling, digital accents, futuristic edge, sleek visual structure.',
  'dark-academia': 'Dark academia styling, layered scholarly fashion, muted palette, poetic atmosphere.',
}

function getThemeDirection(style?: string) {
  const normalizedStyle = normalizeDetail(style || '')
  const styleKey = normalizedStyle.toLowerCase().replace(/\s+/g, '-')
  const presetDirection = STYLE_DIRECTIONS[styleKey]

  if (presetDirection) return presetDirection

  if (normalizedStyle) {
    return `${normalizedStyle} theme expressed through outfit, mood, setting, color language, and design details.`
  }

  return 'Expressive character styling with a cohesive visual identity.'
}

function buildAvatarPrompt(
  answers: string[],
  style?: string,
  feedback?: string,
  mode: GenerationMode = 'create',
) {
  const details = answers
    .map((a, i) => `${i + 1}. ${normalizeDetail(a)}`)
    .join('\n')

  const themeDirection = getThemeDirection(style)

  const modeInstructions =
    mode === 'reimagine'
      ? `
Reimagine mode:
- This is an updated version of an existing avatar.
- Keep the same core person and identity recognizable.
- Clearly apply the requested changes.
- Make the edits visibly noticeable.
- Do not return a near duplicate.
- You may change outfit, hair details, atmosphere, pose, lighting, accessories, or composition if needed.
- Preserve the same overall rendering style while making the requested edits obvious.
`
      : `
Create mode:
- Create the avatar from scratch based on the description.
- Keep the rendering style consistent with the rest of the app.
`

  return `
Create a vertical full body avatar portrait.

Core rendering style:
${BASE_STYLE}

Theme direction:
${themeDirection}

${modeInstructions}

Important guidance:
- Keep the same rendering style for every avatar.
- Only the theme, outfit language, mood, palette, and world details should change based on the chosen style.
- The result should feel like polished character concept art from one cohesive visual universe.

Requirements:
- one character only
- full body visible from head to toe
- vertical composition
- cinematic lighting
- expressive face
- realistic skin rendering
- natural hair texture and detail
- detailed outfit and accessories
- atmospheric background that matches the chosen theme
- elegant composition
- strong silhouette
- polished semi realistic finish

Character details:
${details}

${feedback ? `Required visible changes: ${normalizeDetail(feedback)}` : ''}

Final rule:
The avatar must look like polished semi realistic character illustration with a painterly cinematic finish.
`.trim()
}

async function generateWithImageModel(
  openai: OpenAI,
  prompt: string,
  userId: string | undefined,
) {
  console.log('[generate-avatar] Starting image generation', {
    model: 'gpt-image-1',
    userId: userId || null,
    timeoutMs: OPENAI_IMAGE_TIMEOUT_MS,
  })

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1024x1536',
    user: userId || undefined,
  })

  const image = response.data?.[0]

  if (!image?.b64_json) {
    console.error('[generate-avatar] Bad image response:', response)
    throw new Error('Image model returned no image')
  }

  console.log('[generate-avatar] Image generation succeeded', {
    model: 'gpt-image-1',
    imageBytesBase64Length: image.b64_json.length,
  })

  return {
    imageUrl: `data:image/png;base64,${image.b64_json}`,
    revisedPrompt: prompt,
  }
}

export async function POST(req: Request) {
  try {
    const { answers, feedback, style, mode, userId } = await req.json()

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

    const generationMode: GenerationMode = mode === 'reimagine' ? 'reimagine' : 'create'
    const prompt = buildAvatarPrompt(orderedAnswers, style, feedback, generationMode)
    const openai = new OpenAI({ apiKey: openaiKey })

    console.log('[generate-avatar] Prepared avatar generation request', {
      answerCount: orderedAnswers.length,
      style: style || null,
      mode: generationMode,
      hasFeedback: Boolean(feedback),
      userId: userId || null,
    })

    const result = await withTimeout(
      generateWithImageModel(openai, prompt, userId),
      OPENAI_IMAGE_TIMEOUT_MS,
    )

    return NextResponse.json({
      imageUrl: result.imageUrl,
      prompt: result.revisedPrompt,
    })
  } catch (error) {
    console.error('[generate-avatar] Avatar generation failed', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate avatar.' },
      { status: 500 },
    )
  }
}