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
Polished semi realistic character illustration.
Painterly cinematic finish.
Detailed face, skin, hair, and clothing.
Believable anatomy and natural proportions.
Elegant, immersive, high quality character art.

Hard rules:
- not cartoon
- not anime
- not chibi
- not photorealistic
- not flat illustration
- not 3D render
- not childish
- not exaggerated caricature

Keep the same rendering quality and artistic finish across all avatars.
`.trim()

const STYLE_DIRECTIONS: Record<string, string> = {
  fantasy: `Magical, storybook, and glowing. Fantasy inspired clothing, mystical details, rich jewel tones, enchanted atmosphere. Painterly and cinematic.`,

  modern: `Clean, stylish, current, and realistic. Contemporary fashion, polished styling, grounded elegance, subtle editorial atmosphere.`,

  'fantasy-modern': `A blend of magical and modern style. Contemporary fashion mixed with subtle fantasy details, symbolic accents, cinematic atmosphere.`,

  celestial: `Stars, moonlight, cosmic beauty, and divine energy. Luminous silvers, indigo glow, celestial details, ethereal atmosphere.`,

  royal: `Elegant, luxurious, noble, and powerful. Rich fabrics, refined structure, regal details, dramatic and commanding presence.`,

  streetwear: `Bold, cool, trendy, and expressive. Stylish streetwear, layered urban fashion, modern attitude, atmospheric city energy.`,

  futuristic: `Sleek, sci fi, advanced, and glowing. Futuristic silhouettes, luminous accents, polished technology inspired styling.`,

  nature: `Earthy, floral, organic, and peaceful. Botanical details, soft greens and warm earth tones, natural textures, serene atmosphere.`,
}

function getThemeDirection(style?: string) {
  const styleKey = (style || '').toLowerCase().replace(/\s+/g, '-')
  return (
    STYLE_DIRECTIONS[styleKey] ||
    `${normalizeDetail(style || 'Expressive cinematic styling')}. Keep it elegant, atmospheric, and cohesive.`
  )
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

  const themeDirection = getThemeDirection(style)

  const modeDirection =
    mode === 'reimagine'
      ? `
This is a reimagined version of an existing avatar.
Keep the same core person and identity recognizable.
Clearly apply the requested changes.
Do not return a near duplicate.
If needed, change outfit details, pose, lighting, composition, accessories, or atmosphere so the edit is visibly noticeable.
`
      : `
Create this avatar from scratch.
`

  const feedbackLine = feedback?.trim()
    ? `Required visible changes: ${normalizeDetail(feedback)}.`
    : ''

  return [
    `Create a single full body character portrait.`,
    `Base render style: ${BASE_RENDER_STYLE}`,
    `Theme direction: ${themeDirection}`,
    `Important: keep the rendering style consistent across all avatars. Only the outfit, atmosphere, setting, palette, and theme details should change based on the selected style.`,
    modeDirection,
    `The character must be clearly visible from head to toe with a clean readable silhouette.`,
    `Use a vertical portrait composition. Dramatic lighting. Rich detail. Cinematic quality.`,
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

async function generateWithDalle(
  openai: OpenAI,
  prompt: string,
  userId?: string,
) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1792',
    quality: 'standard',
    style: 'natural',
    response_format: 'b64_json',
    user: userId || undefined,
  })

  const image = response.data?.[0]
  if (image?.b64_json) {
    return {
      imageUrl: `data:image/png;base64,${image.b64_json}`,
      revisedPrompt: image.revised_prompt || prompt,
    }
  }

  throw new Error('dall-e-3 returned no image data.')
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
      console.warn('gpt-image-1 failed, falling back to dall-e-3:', primaryError)
      const fallback = await generateWithDalle(openai, imagePrompt, userId)
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